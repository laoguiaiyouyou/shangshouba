# PHASE2A_STEP1_FIX_LOG

## 本轮范围

- 只实现 2 个云函数：
  - `createOrderAfterPayment`
  - `getOrderDetail`
- 只切 2 个页面：
  - `pages/payment-success/payment-success.js`
  - `pages/order-detail/order-detail.js`
- 为了让云函数最小可运行，补了最小云环境初始化与云函数目录配置

## 新增 / 修改文件

### 新增

- `cloudfunctions/createOrderAfterPayment/index.js`
- `cloudfunctions/createOrderAfterPayment/package.json`
- `cloudfunctions/getOrderDetail/index.js`
- `cloudfunctions/getOrderDetail/package.json`
- `docs/audit/PHASE2A_STEP1_FIX_LOG.md`

### 修改

- `app.js`
- `project.config.json`
- `utils/order-context.js`
- `pages/payment-success/payment-success.js`
- `pages/order-detail/order-detail.js`

## 云函数设计

### 1. `createOrderAfterPayment`

#### 入参

- `clientPaymentRef`
- `idempotencyKey`
- `draft`
  - `serviceType`
  - `status`
  - `communityName`
  - `roomNo`
  - `orderArea`
  - `serviceDate`
  - `grossPrice`
  - `earlyBirdDiscount`
  - `newcomerDiscount`
  - `groupDiscount`
  - `totalPrice`
  - `sourcePage`
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`
  - `scheduleResult`
- `currentUser`
  - `userId`
  - `authSource`

#### 出参

- `ok`
- `orderId`
- `order`
- `created`
- `reused`

#### 说明

- `orderId` 由云函数生成。
- 幂等以 `idempotencyKey` 为唯一键。
- 若已存在相同 `idempotencyKey` 的订单，则直接返回旧订单，`created=false`、`reused=true`。
- 新单结构已经兼容当前前端 Phase 1 合同：
  - `orderId`
  - `ownerUserId`
  - `userId`
  - `orderType`
  - `serviceType`
  - `status`
  - `roomNo`
  - `scheduleResult`
  - `sourcePage`
  - `createdAt`
  - `updatedAt`
  - `invitedBy`
  - `inviteSource`
  - `inviteToken`
  - `communityName`
  - `orderArea`
  - `serviceDate`
  - `grossPrice`
  - `earlyBirdDiscount`
  - `newcomerDiscount`
  - `groupDiscount`
  - `totalPrice`
  - `productType`
  - `isUpgraded`
  - `upgradePrice`
  - `packageFlowType`
  - `docState`
  - `docRefs`
  - `clientPaymentRef`
  - `idempotencyKey`

### 2. `getOrderDetail`

#### 入参

- `orderId`
- `currentUser`（本轮未强校验，只做预留）

#### 出参

- `ok`
- `orderId`
- `order`

#### 说明

- 当前最小实现按 `orderId` 查询云数据库 `service_orders` 集合。
- 返回结构与 `order-detail` 页面当前展示所需字段对齐。
- 文档流状态本轮没有后端化；页面仍使用本地 `orderId` 口径文档状态作为兼容读取，但它不再抬回订单详情的主数据真源位置。

## 幂等键设计

### 当前方案

- `payment-success` 不再本地直接建正式订单。
- 页面从 `checkoutDraftV2` 读取草稿后，构造：
  - `clientPaymentRef`
  - `idempotencyKey`
- 本轮两者先统一使用同一值。

### 生成规则

- 优先取草稿已有 `clientPaymentRef`
- 否则取本地缓存 `paymentCreateRefV2`
- 再否则由前端按以下字段拼接生成稳定引用：
  - `currentUser.userId`
  - `serviceType`
  - `communityName`
  - `roomNo`
  - `serviceDate`
  - `totalPrice`
  - `sourcePage`

### 这样处理的原因

- 当前没有真实支付回调与支付单号，本轮只能基于现有支付成功上下文构造一个本地可跑通的幂等引用。
- 后续接真实支付后，可直接把 `clientPaymentRef` 替换为真实支付侧的交易号或支付流水号，不需要推翻页面结构。

## `payment-success` 如何切换

### 旧逻辑

- 读取 `checkoutDraftV2`
- 本地调用 `createOrderFromCheckoutDraft`
- 直接生成正式订单并写入本地 storage

### 新逻辑

- 读取 `checkoutDraftV2`
- 调用云函数 `createOrderAfterPayment`
- 由云函数生成真实 `orderId`
- 前端拿到云函数返回的 `order` 后，只做：
  - 本地缓存 `cacheServerOrder(order)`
  - 写 `currentOrderIdV2`
  - 清理 `checkoutDraftV2`
  - 清理 `paymentCreateRefV2`
- 若同一笔支付重复进入 `payment-success`：
  - 由于 `idempotencyKey` 相同，云函数返回 `reused=true`
  - 前端不会重复建单

## `order-detail` 如何切换

### 旧逻辑

- `route orderId` 或 `currentOrderIdV2`
- 直接从本地 `serviceOrdersV2` 恢复详情

### 新逻辑

- 先恢复目标 `orderId`
  - `route orderId`
  - 否则 `currentOrderIdV2`
- 只要拿到 `orderId`，就优先调用云函数 `getOrderDetail`
- 若云函数返回成功：
  - 以云函数返回的 `order` 为真源
  - 同步缓存到本地 `serviceOrdersV2`
- 若云函数失败：
  - 仅在本地存在该 `orderId` 缓存时，允许退回本地缓存
  - 若本地也没有，则进入明确错误态
- 本轮仍保留：
  - `currentOrderIdV2` 作为“恢复目标 orderId”的兜底
  - 本地缓存作为“云函数失败时的临时兜底”
- 本轮不再允许：
  - 无参落默认订单
  - 本地散落 query 作为详情真源替代 `orderId`

## 为云函数最小可运行补的配置

- `app.js`
  - 增加 `wx.cloud.init({ traceUser: true })`
- `project.config.json`
  - 增加 `cloudfunctionRoot: "cloudfunctions/"`

## 明确保留到 Phase 2A-2

- `mine.js` 切到后端真源（`listMyOrders`）
- `saveOrderSchedule`
- `resolveInviteToken / saveInviteRelation`
- 退款回滚
- 拼单返差价结算
- 完整价格引擎
- 真实支付单号 / 支付回调接入
- 文档流状态后端化
