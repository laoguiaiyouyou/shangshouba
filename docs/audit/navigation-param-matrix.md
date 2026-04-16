# 跳转参数收发矩阵

## 1. 订单主链路

### `detail -> checkout`

- 发送：`inviteCode`, `communityName`, `roomNo`
- 接收：`checkout.onLoad(options)` 接收同名字段
- 风险：`roomNo` 只有 `X栋Y单元Z` 格式才能自动拆解，否则 `buildingNo/unitNo` 不会回填完整

### `checkout -> payment-success`

- 发送方式：不走 query，写 `mockPaymentOrder`
- 接收：`payment-success.onShow()` 读取 `mockPaymentOrder`
- 结论：完全是本地缓存链，不是标准参数链

### `payment-success -> order-detail`

- 发送：无
- 接收：`order-detail` 会回退默认值
- 结论：断链

## 2. 拼团链

### `order-detail -> group-invite`

- 发送：`orderName`, `communityName`, `serviceDate`
- 接收：`group-invite.onLoad(options)` 正常接收

### `group-invite -> group-landing`

- 发送：`code`
- 接收：`group-landing.onLoad(options)` 正常接收

### `group-landing -> detail`

- 发送：`inviteCode`, `communityName`, `roomNo`
- 接收：`detail.onLoad(options)` 正常接收

### `payment-success -> group-invite`

- 发送：无
- 接收：`group-invite` 只能使用默认订单信息
- 结论：从支付成功页发起邀请时断链

## 3. 文档链

### `order-detail -> scheme-book`

- 发送：`mode`, `orderName`, `communityName`, `roomNo`, `orderArea`, `serviceDate`, `totalPrice`, `inviteCode`
- 接收：`scheme-book.onLoad(options)` 已接收对应参数
- 结果：页面参数链本身完整

### `scheme-book -> order-detail`

- 发送方式：不走 query，写 `schemeFlow_*` / `schemeConfirmData_*`
- 接收：`order-detail.updateDocAction()` 读 storage
- 风险：依赖弱主键拼接 `flowKey`

### `order-detail -> final-book`

- 发送：`docMode`, `orderName`, `communityName`, `roomNo`, `orderArea`, `totalPrice`, `serviceDate`
- 接收：`final-book.onLoad(options)` 已接收
- 风险：参数缺失时会回退 `mockPaymentOrder`

## 4. 退款链

### `order-detail -> refund-apply`

- 发送：`orderName`, `serviceDate`
- 接收：`refund-apply.onLoad(options)` 已接收

### `refund-apply -> order-detail`

- 正常返回：依赖页面栈 `navigateBack`
- 失败兜底：跳无参数 `/pages/order-detail/order-detail`
- 结论：存在上下文恢复失败风险

## 5. 权益预约链

### `coupon-list`

- 提交方式：写 `myOrders` 中的 `coupon_booking`
- 问题：没有任何页面把 `orderType/id` 传给 `order-detail`

### `gift-service`

- 提交方式：写 `myOrders` 中的 `gift_service_booking`
- 问题：我的订单入口直接拦截，不允许查看详情
