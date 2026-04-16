# 关键业务链路审计

## 1. 开荒详情 -> 下单 -> 支付成功 -> 订单详情

### 现状

- `detail.goCheckout()` 可以进入 `checkout`
- `checkout.submitOrder()` 会构造新订单并写 `mockPaymentOrder`
- 页面随后直接 `navigateTo('/pages/payment-success/payment-success')`

### 断点

- 未调用 `wx.requestPayment`
- 未调用任何下单接口
- 未生成稳定 `orderId`
- `payment-success.goOrder()` 不带参数进入 `order-detail`

### 结论

此链路只有 UI 层贯通，没有真实业务贯通。

## 2. 订单详情 -> 勘察确认 -> 承诺书确认

### 现状

- `order-detail` 能根据 `schemeFlow_*` 决定跳 `scheme-book` 还是 `final-book`
- `scheme-book` 提交后写 `schemeConfirmData_*` 与 `schemeFlow_* = confirm_book`
- `final-book` 提交后写 `finalBookSnapshot_*` 与 `schemeFlow_* = final`

### 断点

- 整条链依赖 `flowKey = orderName_communityName_roomNo_serviceDate`
- `mine.ensureSchemeFlowState()` 会硬塞一条演示数据
- `finalBookPdf_*` 在项目内无写入方

### 结论

文档链可以演示页面推进，但不是稳定、可联调、可追溯的真实状态机。

## 3. 订单详情 -> 退款申请

### 现状

- `order-detail.goRefundApply()` 会带 `orderName/serviceDate` 跳到 `refund-apply`
- `refund-apply.submitRefund()` 只写 `mockRefund*`
- `order-detail.onShow()` 和 `mine.syncOrderList()` 再据此回显退款中

### 断点

- 无接口
- 无订单 ID
- 兜底返回会跳无参数的 `order-detail`

### 结论

退款链是页面态模拟，不是可联调流程。

## 4. 我的订单 -> 预约档期 -> 预约结果

### 现状

- `mine.confirmBooking()` 修改 `bookingNodes` 后进入 `booking-result`

### 断点

- 不写 storage
- 不写订单
- `onShow -> syncOrderList()` 会重新覆盖节点状态

### 结论

预约成功只在当前页面态成立，返回后不稳定。

## 5. 支付成功 -> 邀请拼团 -> 落地页 -> 下单

### 现状

- `group-invite` 生成邀请码并写 `mockInviteMap_*`
- `group-landing` 可以带码进入 `detail`
- `checkout` 把 `inviteCode` 继续带到新订单
- `payment-success` 读取 `inviteCode` 并给邀请人配额 +1

### 断点

- `payment-success -> group-invite` 没带订单参数
- 邀请码按日期固定生成，容易碰撞
- 整条链没有真实分享、验码、服务端配额

### 结论

拼团链是前端模拟闭环，不具备真实联调能力。

## 6. 券预约 / 赠送服务预约

### 现状

- `coupon-list` 和 `gift-service` 都会往 `myOrders` 写预约记录
- `mine` 会把它们合并到“我的订单”

### 断点

- 点击被拦截，不能进详情
- 仅 `coupon_booking` 在 `order-detail` 有部分支持，`gift_service_booking` 没有对应详情分流

### 结论

权益单当前只“展示进了订单列表”，但没有进入统一订单业务体系。
