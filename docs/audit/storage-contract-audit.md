# Storage 契约审计

## 1. 核心结论

当前业务大部分状态推进不依赖接口，而依赖本地 storage。storage 既承担缓存，也承担事实源，存在明显双真相和串单风险。

## 2. 关键键位

### 订单与支付模拟

- `mockPaymentOrder`
  - 写入：`pages/checkout/checkout.js`
  - 读取：`pages/payment-success/payment-success.js`, `pages/final-book/final-book.js`
  - 风险：承诺书页会回退读该键，存在串单

- `mockNewInviteOrder`
  - 写入：`checkout`, `payment-success`
  - 读取：`mine.syncOrderList()`
  - 风险：以“最近支付成功单”方式插入订单列表，不具备真实订单主键

### 退款模拟

- `mockRefundStatus`
- `mockRefundTarget`
- `mockRefundRecord`
  - 写入：`refund-apply.submitRefund()`
  - 读取：`order-detail.onShow()`, `mine.syncOrderList()`
  - 风险：退款状态通过页面进入时机触发回写，不是真实持久状态机

### 拼团与返现模拟

- `mockInviteMap_${inviteCode}`
  - 写入：`group-invite.onLoad()`
  - 读取：`payment-success.onShow()`
  - 风险：邀请码碰撞会覆盖映射

- `mockGroupQuota_${orderName}_${serviceDate}`
  - 写入：`payment-success.onShow()`
  - 读取：`order-detail.updateInviteModule()`
  - 风险：配额依赖订单名+日期，不稳定

### 权益与预约

- `myOrders`
  - 写入：`coupon-list`, `gift-service`
  - 读取：`mine`, `order-detail`
  - 风险：订单体系分叉，service order 与 booking order 不统一

- `myCoupons`
  - 写入：`coupon-list`
  - 读取：`coupon-list`, `welfare-center`, `order-detail`

- `giftServiceCards`
  - 写入：`gift-service`
  - 读取：`gift-service`, `welfare-center`

### 文档流

- `schemeFlow_${flowKey}`
  - 写入：`scheme-book`, `final-book`, `mine.ensureSchemeFlowState()`
  - 读取：`order-detail`
  - 风险：存在开发态强制注入

- `schemeStatus_${flowKey}`
  - 读取：`order-detail`
  - 风险：兼容双读，存在双真相

- `schemeConfirmData_${flowKey}`
  - 写入：`scheme-book`
  - 读取：`final-book`

- `finalBookSnapshot_${flowKey}`
  - 写入：`final-book`
  - 读取：`final-book`

- `finalBookPdf_${flowKey}`
  - 读取：`order-detail`, `final-book`
  - 风险：项目内无写入方，正式 PDF 链路当前不可在前端内闭环验证

## 3. 主要风险

- `flowKey = orderName_communityName_roomNo_serviceDate` 为弱主键
- storage 兼任事实源与缓存
- 多条链路通过“最近一次支付订单”回填上下文
- 状态推进和页面跳转强依赖页面栈与本地缓存，不具备真实联调稳定性
