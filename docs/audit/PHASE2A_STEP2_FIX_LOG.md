# PHASE2A_STEP2_FIX_LOG

## 本轮范围

- 只切 `mine` 列表真源
- 不改 UI
- 不碰 `checkout`
- 不碰 `payment-success`
- 不碰 `order-detail`
- 不碰预约结果与邀请关系

## 改了哪些文件

- `pages/mine/mine.js`
- `utils/order-context.js`
- `cloudfunctions/listMyOrders/index.js`
- `cloudfunctions/listMyOrders/package.json`
- `docs/audit/PHASE2A_STEP2_FIX_LOG.md`

## `listMyOrders` 云函数

### 入参

- `currentUser`
  - `userId`

### 出参

- `ok`
- `userId`
- `total`
- `list`
  - `orderId`
  - `ownerUserId`
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
  - `totalPrice`
  - `grossPrice`
  - `earlyBirdDiscount`
  - `newcomerDiscount`
  - `groupDiscount`
  - `productType`
  - `isUpgraded`
  - `upgradePrice`
  - `packageFlowType`

### 查询规则

- 只按 `currentUser.userId`
- 只查 `service_orders`
- 按 `createdAt desc` 返回

## `mine` 真源如何切换

### 旧逻辑

- `syncOrderList()` 直接读本地 `serviceOrdersV2`
- 本地订单就是 `mine` 真源

### 新逻辑

- `onLoad / onShow / syncOrderList()` 优先调用云函数 `listMyOrders`
- 云函数成功时：
  - 直接生成 `orderList`
  - 直接生成 `orderDisplayList`
  - 继续复用现有 `orderId -> order-detail` 跳转
- 云函数失败时：
  - 才回退到本地 `serviceOrdersV2`

## 本地缓存如何兜底

- 保留 `serviceOrdersV2`
- 云函数成功后，用返回订单覆盖当前用户本地订单缓存
- 云函数失败时，`mine` 从本地缓存恢复
- 保留 `currentUserV2` 作为 `listMyOrders` 的最小身份来源
- 不改 `currentOrderIdV2`

## 下一步验收看什么

- `mine` 打开后能从云端看到新支付成功创建的订单
- 重新进入小程序后，`mine` 仍以后端列表为准
- 云函数可用时，本地新增/删除不会反向主导 `mine` 展示
- 云函数不可用时，`mine` 仍能回退到 `serviceOrdersV2`
- `mine` 点击订单后仍能进入正确的 `order-detail`
