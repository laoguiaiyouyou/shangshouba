# 高中低优先级问题清单

## 高优先级

### H1. 支付成功页进入订单详情时丢失订单上下文

- 位置：`pages/payment-success/payment-success.js:50-52`
- 证据：`goOrder()` 直接跳 `/pages/order-detail/order-detail`，未带任何 `name/status/community/roomNo/serviceDate` 参数。
- 影响：支付成功后“查看订单”能打开详情页，但展示的是默认订单，不是刚支付的订单。
- 关联：`pages/order-detail/order-detail.js:241-309` 在缺参数时会回退到默认值。
- 结论：主链路“下单 -> 支付成功 -> 订单详情”是假贯通。

### H2. 支付成功页进入邀请页时丢失订单上下文

- 位置：`pages/payment-success/payment-success.js:58-61`
- 证据：`goGroupInvite()` 直接跳 `/pages/group-invite/group-invite`。
- 影响：邀请页会落回默认 `精细开荒 / 薇棠轩 / 2026-03-20`，而不是刚支付订单。
- 关联：`pages/group-invite/group-invite.js:10-22` 根据传入参数生成邀请码和配额 mapping。
- 结论：支付后邀请拼团/返现链路不是基于真实订单展开。

### H3. 券预约单和赠送服务预约单展示在“我的订单”里，但点击被拦截

- 位置：`pages/mine/mine.js:408-460`, `pages/mine/mine.js:463-470`
- 证据：`syncOrderList()` 已把 `coupon_booking` / `gift_service_booking` 合并进 `orderDisplayList`；`handleOrderItemTap()` 却对两类订单直接 `showToast + return`。
- 影响：用户能看到预约订单，但不能查看详情、不能继续后续业务。
- 关联：`pages/order-detail/order-detail.js:194-235` 已实现 `coupon_booking` 的详情入口识别，但当前没有调用方真正把 `id/orderType` 传进去。
- 结论：这是典型“页面能开，业务不通”的假贯通。

### H4. 预约档期结果只保存在页面内存，不会持久化

- 位置：`pages/mine/mine.js:705-725`
- 证据：`confirmBooking()` 仅 `setData({ bookingNodes })`，没有写 storage、没有回写订单、没有服务端请求。
- 影响：用户预约后跳到 `booking-result` 看似成功，但重新进入 `mine` 或触发 `onShow -> syncOrderList()` 后，预约结果会按当前主计划重新计算并丢失。
- 关联：`pages/mine/mine.js:458-460` 每次 `syncOrderList()` 都重新 `computeBookingNodes(plan)`。
- 结论：预约链路是假贯通，不具备真实状态沉淀。

### H5. 支付、请求、云函数均未接入，关键链路全靠 storage 模拟

- 位置：`pages/checkout/checkout.js:276-281`, `app.js:10`
- 证据：
  - 未发现 `wx.request`
  - 未发现 `wx.requestPayment`
  - 未发现 `wx.cloud`
  - 未发现 `cloudfunctions/`
  - `checkout.submitOrder()` 只写 `mockNewInviteOrder` / `mockPaymentOrder` 后直接跳 `payment-success`
- 影响：支付链、联调链、接口链、云函数链当前都不可真实跑通。
- 结论：这是当前项目最大的阶段性断点。

## 中优先级

### M1. 文档流被 `mine` 页面硬编码注入，制造假贯通

- 位置：`pages/mine/mine.js:735-737`
- 证据：`ensureSchemeFlowState()` 每次 `onLoad` 都写入 `schemeFlow_精细开荒_薇棠轩_19-2-102_2026-04-10 = confirm_result`。
- 影响：该订单会天然显示可进入勘察确认链，即使没有任何真实勘察结果来源。
- 结论：文档流目前掺杂开发态强行造数。

### M2. 邀请码只按日期生成，存在碰撞与覆盖

- 位置：`pages/group-invite/group-invite.js:15-22`
- 证据：`inviteCode = ANX + shortDate + 001`，没有订单主键、用户维度或随机因子。
- 影响：多个同日订单会得到同一邀请码，`mockInviteMap_${inviteCode}` 会被覆盖。
- 结论：拼团/返现 mapping 不稳定。

### M3. 房号透传格式不一致，带参进入结算页后无法自动补全

- 位置：
  - `pages/detail/detail.js:345-348`
  - `pages/group-landing/group-landing.js:22-26`
  - `pages/checkout/checkout.js:4-15`, `63-85`, `173-188`
- 证据：上游透传的是通用 `roomNo` 字符串；`checkout` 只会自动拆解 `X栋Y单元Z` 格式，否则只把整串塞进 `flatNo`，`buildingNo/unitNo` 为空，`canSubmit` 仍为 `false`。
- 影响：用户从拼团落地页或详情页进入结算时，经常需要重新补输入。
- 结论：属于参数透传不完整。

### M4. 多个兜底返回会落到“无参数默认订单详情”

- 位置：
  - `pages/refund-apply/refund-apply.js:37-44`, `84-90`
  - `pages/payment-success/payment-success.js:41-47`
- 证据：失败兜底时直接跳 `/pages/order-detail/order-detail` 或 `/pages/checkout/checkout`，不带参数。
- 影响：一旦页面栈变化，回退就不是回到原订单原上下文，而是默认页。
- 结论：回退逻辑缺乏上下文恢复。

### M5. `final-book` 会从 `mockPaymentOrder` 回填信息，可能展示错单

- 位置：`pages/final-book/final-book.js:115-167`
- 证据：`onLoad()` 在参数缺失时回退读 `mockPaymentOrder`。
- 影响：如果本地缓存里有最近支付订单，而当前打开的是别的承诺书，就可能出现展示串单。
- 结论：文档页存在跨链路污染风险。

### M6. 券预约详情能力已在 `order-detail` 实现，但没有任何页面走通该入口

- 位置：
  - `pages/order-detail/order-detail.js:194-235`
  - `pages/mine/mine.js:463-470`
  - `pages/coupon-list/coupon-list.js:290-304`
- 证据：券预约已写 `myOrders`，详情页可按 `orderType=id` 识别，但我的订单点击被拦截。
- 影响：实现与入口脱节，功能不可达。
- 结论：存在“代码已写，业务未通”的阶段性断点。

## 低优先级

### L1. 无 `package.json`，缺少 lint/test/build/type-check 入口

- 影响：无法自动跑 lint、单测、构建校验，回归主要靠手工。

### L2. 文档状态双读导致双真相风险

- 位置：`pages/order-detail/order-detail.js:445`
- 证据：同时读 `schemeFlow_*` 和 `schemeStatus_*`。
- 影响：后续接真实后端时容易出现状态源不一致。

### L3. `mine.selectDate()` 写入 `selectedDateIdx`，但核心预约逻辑实际使用 `selectedDateStr`

- 位置：`pages/mine/mine.js:684-686`
- 影响：属于残留状态字段，暂未直接阻塞业务，但增加理解成本。
