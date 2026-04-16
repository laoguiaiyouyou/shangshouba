# PHASE2A_PLAN

## A. Phase 2A 边界

### 这轮只做什么

- 把“订单真源”从前端本地 storage 逐步切到后端/云函数，不做一次性总迁移。
- 覆盖 5 条最小链路：
  - 支付成功后创建正式订单
  - 我的订单列表改为后端真源
  - 订单详情改为后端真源
  - 预约结果持久化到后端
  - 邀请关系最小落库
- 保留前端 Phase 1 已收口的 `orderId/currentOrderIdV2/currentUserV2` 口径，作为切换期缓存与兜底。
- 以后端生成 `orderId` 为准，前端不再自己产生命名空间内的正式订单主键。

### 这轮明确不做什么

- 不接真实退款回滚
- 不做拼单返差价结算
- 不重写完整价格引擎
- 不做真实多用户账号体系总改造
- 不改 UI、页面样式、交互视觉
- 不把所有历史本地 storage 一次性迁到后端
- 不把文档流、PDF 上传、券预约/赠送服务全部并入后端统一模型

### 尚未冻结、因此本轮不能擅自实现的业务

- 退款成功后的订单状态回滚和邀请关系回滚
- 拼单成功后的返差价结算时点与结算口径
- `coupon_booking` / `gift_service_booking` 是否进入统一订单模型
- 多套餐完整价格规则统一
- 正式多账号身份、unionId/openId 合并规则

## B. 推荐后端形态

### 结论

- 推荐：**云函数优先**

### 理由

- 当前仓库是微信小程序单仓，没有现成后端服务、HTTP API 网关、鉴权中间层或独立运维面。
- 本轮目标是“最小后端接入”，不是建设完整平台；云函数 + 云数据库最贴合小程序的渐进式切换。
- 小程序后续接真实用户体系时，云函数天然更容易拿到 `openid`，比先搭一层外部 HTTP API 更省接入成本。
- 当前需要的能力是“少量读写真源”，不是复杂聚合查询；云函数足够。
- Phase 2B 若后续需要开放给 H5/运营后台/外部系统，再补 HTTP API 层更稳。

### 建议形态

- 云数据库作为最小事实源
- 云函数作为写入口与读聚合入口
- 前端通过统一 `cloud service wrapper` 调用，不直接把业务散写在页面中

## C. 最小接口 / 云函数清单

### 1. `createOrderAfterPayment`

- 名称：支付成功后创建正式订单
- 类型：云函数
- 前端调用页：`pages/payment-success/payment-success.js`
- 入参：
  - `clientPaymentRef`
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
  - `currentUser`
    - `userId`
    - `authSource`
- 出参：
  - `order`
    - `orderId`
    - `userId`
    - `orderType`
    - `serviceType`
    - `status`
    - `communityName`
    - `roomNo`
    - `orderArea`
    - `serviceDate`
    - `totalPrice`
    - `createdAt`
    - `updatedAt`
    - `inviteToken`
    - `invitedBy`
    - `inviteSource`
  - `created`
  - `idempotentHit`
- 读写字段：
  - 写 `order`
  - 需要时联动写 `inviteRelation`
- 关键要求：
  - `orderId` 由后端生成
  - 必须按 `clientPaymentRef` 幂等，避免 `payment-success` 重进重复建单

### 2. `listMyOrders`

- 名称：查询我的订单列表
- 类型：云函数
- 前端调用页：`pages/mine/mine.js`
- 入参：
  - `userId`
  - `pageNo`
  - `pageSize`
- 出参：
  - `list`
    - `orderId`
    - `orderType`
    - `serviceType`
    - `status`
    - `communityName`
    - `roomNo`
    - `orderArea`
    - `serviceDate`
    - `totalPrice`
    - `productType`
    - `isUpgraded`
    - `upgradePrice`
    - `scheduleResult`
    - `inviteToken`
    - `createdAt`
    - `updatedAt`
  - `total`
- 读写字段：
  - 读 `order`
- 前端过渡策略：
  - `mine` 先以后端列表为真源
  - `serviceOrdersV2` 仅作为临时缓存与历史兜底，不再作为主展示真源

### 3. `getOrderDetail`

- 名称：查询订单详情
- 类型：云函数
- 前端调用页：`pages/order-detail/order-detail.js`
- 入参：
  - `orderId`
  - `userId`
- 出参：
  - `order`
    - `orderId`
    - `orderType`
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
    - `productType`
    - `isUpgraded`
    - `upgradePrice`
    - `scheduleResult`
    - `inviteToken`
    - `invitedBy`
    - `inviteSource`
    - `docState`
    - `docRefs`
    - `createdAt`
    - `updatedAt`
- 读写字段：
  - 读 `order`
- 关键要求：
  - `order-detail` 按 `orderId` 拉详情
  - `currentOrderIdV2` 只负责“恢复访问目标 orderId”，不再提供事实数据

### 4. `saveOrderSchedule`

- 名称：保存预约结果
- 类型：云函数
- 前端调用页：`pages/mine/mine.js`
- 入参：
  - `orderId`
  - `userId`
  - `scheduleResult`
    - `lastNode`
    - `lastDate`
    - `lastSlot`
    - `updatedAt`
    - `nodeBookings`
      - `{ nodeName, dateLabel, slot, status, updatedAt }`
- 出参：
  - `orderId`
  - `scheduleResult`
  - `updatedAt`
- 读写字段：
  - 写 `order.scheduleResult`
- 关键要求：
  - `mine`、`order-detail`、`payment-success` 后续都从同一 `order.scheduleResult` 读取

### 5. `resolveInviteToken`

- 名称：解析邀请来源
- 类型：云函数
- 前端调用页：`pages/group-landing/group-landing.js`，必要时 `pages/detail/detail.js`
- 入参：
  - `inviteToken`
- 出参：
  - `valid`
  - `inviteContext`
    - `inviteToken`
    - `invitedBy`
    - `inviteSource`
    - `inviterUserId`
    - `validUntil`
- 读写字段：
  - 读 `inviteRelation` 或 `inviteProfile`
- 关键要求：
  - 前端扫码后先拿到规范化邀请上下文
  - `activeInviteContextV2` 仍可暂存，但来源以云函数解析结果为准

### 6. `saveInviteRelation`

- 名称：保存邀请关系
- 类型：云函数
- 前端调用页：原则上不直接被页面调用，优先由 `createOrderAfterPayment` 内部调用；如需拆开，可由 `payment-success` 在建单成功后补调
- 入参：
  - `orderId`
  - `inviteToken`
  - `invitedUserId`
  - `inviterUserId`
  - `inviteSource`
  - `triggerAt`
- 出参：
  - `relationId`
  - `orderId`
  - `saved`
- 读写字段：
  - 写 `inviteRelation`
- 关键要求：
  - 关系落库以“被邀请人完成支付并创建订单”为触发点
  - 不把“别人通过我邀请创建的订单”混入“我的订单”列表

## D. 数据模型建议

### 1. `order`

- 主键：`orderId`
- 最小字段：
  - `orderId`
  - `userId`
  - `orderType`
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
  - `productType`
  - `isUpgraded`
  - `upgradePrice`
  - `scheduleResult`
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`
  - `docState`
  - `docRefs`
  - `sourcePage`
  - `createdAt`
  - `updatedAt`
  - `clientPaymentRef`
- 建议：
  - `scheduleResult` 暂时内嵌到 `order`
  - `docState/docRefs` 先预留，文档流后续再迁后端

### 2. `scheduleResult`

- 先内嵌到 `order`
- 结构：
  - `lastNode`
  - `lastDate`
  - `lastSlot`
  - `updatedAt`
  - `nodeBookings`
    - key 为节点名
    - value 为 `{ nodeName, dateLabel, slot, status, updatedAt }`

### 3. `inviteRelation`

- 最小字段：
  - `relationId`
  - `inviteToken`
  - `inviterUserId`
  - `invitedUserId`
  - `inviteSource`
  - `orderId`
  - `status`
  - `createdAt`
  - `updatedAt`
  - `validUntil`
- 用途：
  - 解析扫码来源
  - 记录“哪笔订单通过哪个邀请关系创建”
  - 为 Phase 2B 的返差价/拼单结算预留

### 4. `currentUser / userId` 映射预留

- 前端仍保留 `currentUserV2`
- 后端新增最小映射概念：
  - `userId`
  - `openid` 或云侧身份
  - `authSource`
  - `createdAt`
- Phase 2A 不做真实账号改造，但所有订单、邀请关系都统一落到 `userId`

### 5. 文档流与 `orderId` 的关系

- 不再独立依赖 `flowKey = orderName_communityName_roomNo_serviceDate`
- 统一挂在 `orderId` 下：
  - `order.docState`
  - `order.docRefs.confirmDataRef`
  - `order.docRefs.finalSnapshotRef`
  - `order.docRefs.finalPdfRef`
- Phase 2A 可以先只保留字段预留，不强行把文档页整体后端化

## E. 前端改动范围

### 必改

- `app.js`
  - 初始化云环境
  - 初始化当前用户与后端身份映射入口

- `utils/order-context.js`
  - 从“本地事实源”调整为“后端真源 + 本地缓存/兜底”
  - 保留 `checkoutDraftV2/currentOrderIdV2/activeInviteContextV2/currentUserV2`
  - 逐步下线 `serviceOrdersV2` 的真源职责

- `pages/payment-success/payment-success.js`
  - 从本地 `createOrderFromCheckoutDraft` 切到 `createOrderAfterPayment`
  - 成功后只缓存结果，不再本地正式建单

- `pages/mine/mine.js`
  - 列表改调 `listMyOrders`
  - 本地 order list 仅做 fallback/cache

- `pages/order-detail/order-detail.js`
  - 详情改调 `getOrderDetail`
  - `currentOrderIdV2` 只负责恢复目标 orderId，不再作为详情事实源

### 预计还必须改

- `pages/checkout/checkout.js`
  - 增加 `clientPaymentRef`
  - 草稿字段为后端建单准备齐最小入参

- `pages/group-landing/group-landing.js`
  - 扫码后调用 `resolveInviteToken`

- `pages/detail/detail.js`
  - 进入结算前携带服务端解析后的邀请上下文

- `pages/group-invite/group-invite.js`
  - 邀请链接生成逻辑逐步改为后端 token/关系真源

- `pages/scheme-book/scheme-book.js`
- `pages/final-book/final-book.js`
  - 本轮可不切真源，但要避免继续把本地 doc 状态当唯一事实源

- 建议新增：
  - `utils/cloud-service.js` 或 `utils/api-service.js`
  - `cloudfunctions/createOrderAfterPayment`
  - `cloudfunctions/listMyOrders`
  - `cloudfunctions/getOrderDetail`
  - `cloudfunctions/saveOrderSchedule`
  - `cloudfunctions/resolveInviteToken`
  - `cloudfunctions/saveInviteRelation`

## F. Phase 2A 开发顺序

### 第一步：搭最小云函数底座与只读真源

- 内容：
  - 建云环境与云数据库最小表结构
  - 建 `listMyOrders`、`getOrderDetail`
  - 前端加统一云函数调用封装
  - `mine/order-detail` 先支持“后端优先 + 本地 fallback”
- 验收标准：
  - 给定 `userId` 能从后端读到订单列表
  - `order-detail` 能按 `orderId` 从后端拿详情
  - 后端为空时，前端仍能用本地缓存兜底，不白屏

### 第二步：支付成功后改为服务端建单

- 内容：
  - 建 `createOrderAfterPayment`
  - `payment-success` 从本地建单切到服务端建单
  - 增加 `clientPaymentRef` 幂等控制
  - 建单成功后只更新 `currentOrderIdV2` 和必要缓存
- 验收标准：
  - 同一笔支付成功重复进入 `payment-success` 不会重复建单
  - `payment-success -> mine -> order-detail` 仍能稳定恢复刚创建的订单
  - 新创建订单能出现在后端“我的订单”列表里

### 第三步：预约写回与邀请关系最小落库

- 内容：
  - 建 `saveOrderSchedule`
  - 建 `resolveInviteToken`
  - 建 `saveInviteRelation` 或在 `createOrderAfterPayment` 中内聚保存
  - `mine` 预约结果改写后端
  - 邀请扫码解析改由后端返回规范化上下文
- 验收标准：
  - 预约后刷新 `mine` 和重进 `order-detail` 看到同一份 `scheduleResult`
  - 扫码进入后前端能拿到后端解析的 `inviteToken/invitedBy/inviteSource`
  - 通过邀请完成支付的新订单，后端能落一条邀请关系记录

## G. 风险点

### 1. 本地 storage 退场时最容易断的地方

- `payment-success` 现在会直接建本地正式订单；切后端后若建单失败，页面会失去“刚支付就能看到订单”的即时反馈
- `mine` 和 `order-detail` 现在对本地缓存极度友好；改真源后若接口空或慢，容易出现列表空、详情空、上下文找不到
- `currentOrderIdV2` 过去兼任“目标定位 + 数据恢复”；切后端后必须只保留“目标定位”，不能再偷当真源

### 2. `invitedBy / inviteToken` 切到后端时的风险

- 前端当前 `activeInviteContextV2` 可能与后端解析结果不一致，需要以后端 `resolveInviteToken` 为准
- 如果 `inviteToken` 不做幂等和有效期约束，重复扫码、反复进入、旧 token 过期都可能产生脏关系
- 当前 `currentUserV2` 仍是本地模拟；后端接入时必须避免把本地 `userId` 直接当成最终正式账号体系的永久主键

### 3. 订单真源切换后，需要逐步下线的“假恢复”逻辑

- `serviceOrdersV2` 不再作为正式订单真源，只能做本地缓存/过渡兜底
- `payment-success` 不再本地 `createOrderFromCheckoutDraft`
- `mine.syncOrderList()` 不再依赖本地“最新支付成功单”拼列表
- `order-detail` 不再从散落 query 拼出完整事实详情，只保留兼容入口与失败兜底
- 文档流本地 `docFlowStateV2_*` 未来也要逐步退到缓存地位，但 Phase 2A 暂不强制迁移

## 推荐结论

- Phase 2A 最稳的目标是：**新订单先服务端建单，订单列表/详情先切后端读取，预约结果与邀请关系做最小落库，本地 storage 退到缓存与兜底层。**
- 这轮更适合 **云函数优先**，不建议先做完整 HTTP API 层。
