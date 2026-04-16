# PHASE1_ACCEPTANCE_RESULT

## 验收范围

本次仅按 `docs/audit/PHASE1_REGRESSION_CHECKLIST.md` 逐条验收，不扩写业务，不进入 Phase 2，不验收真实支付、真实后端、云函数与退款正式规则。

## 逐条验收结果

### 1. 从 `detail` 进入 `checkout`，填写信息后不会提前创建订单

- 结果：通过
- 验证依据：`checkout` 提交时只调用 `orderContext.saveCheckoutDraft(...)`，随后跳转到 `payment-success`，当前页没有 `createOrderFromCheckoutDraft(...)` 或直接写入 `serviceOrdersV2` 的逻辑。
- 涉及页面：`pages/detail/detail.js`，`pages/checkout/checkout.js`，`utils/order-context.js`
- 涉及字段：`checkoutDraftV2`，`orderId`，`serviceType`，`status`，`roomNo`，`communityName`，`serviceDate`
- 伪通过风险：无

### 2. 提交后进入 `payment-success`，此时才正式创建订单

- 结果：通过
- 验证依据：`payment-success` 的 `onShow` 先读取 `checkoutDraftV2`，命中后才调用 `createOrderFromCheckoutDraft(draft)` 创建正式订单，并写入 `serviceOrdersV2` 与 `currentOrderIdV2`。
- 涉及页面：`pages/payment-success/payment-success.js`，`utils/order-context.js`
- 涉及字段：`checkoutDraftV2`，`serviceOrdersV2`，`currentOrderIdV2`，`orderId`，`createdAt`，`updatedAt`
- 伪通过风险：无

### 3. `payment-success -> 查看订单` 能恢复到该订单详情，而不是默认订单

- 结果：通过
- 验证依据：`payment-success.goOrder()` 以 `focusOrderId` 传给 `mine`；`mine.openFocusedOrderIfNeeded()` 只按 `orderId` 精确命中并跳转 `order-detail?orderId=...`。
- 涉及页面：`pages/payment-success/payment-success.js`，`pages/mine/mine.js`，`pages/order-detail/order-detail.js`
- 涉及字段：`focusOrderId`，`orderId`，`currentOrderIdV2`
- 伪通过风险：无

### 4. `payment-success -> 返回` 不再回到结算页假成功状态

- 结果：通过
- 验证依据：`payment-success.goBack()` 已直接复用 `goOrder()`，返回动作不再回结算页。
- 涉及页面：`pages/payment-success/payment-success.js`
- 涉及字段：`orderId`
- 伪通过风险：无

### 5. “我的订单”只展示统一订单存储中的 `service_order`

- 结果：通过
- 验证依据：`mine.syncOrderList()` 只读取 `orderContext.getOrdersForCurrentUser().map(orderContext.toOrderListItem)`，不再拼接其他来源订单。
- 涉及页面：`pages/mine/mine.js`，`utils/order-context.js`
- 涉及字段：`serviceOrdersV2`，`ownerUserId`，`orderType`
- 伪通过风险：无

### 6. 通过优惠券预约、赠送服务预约产生的 `myOrders` 不再混入“我的订单”主链

- 结果：通过
- 验证依据：`mine.syncOrderList()` 没有再读取或 merge `myOrders`；主列表来源已经收口为统一订单存储。
- 涉及页面：`pages/mine/mine.js`
- 涉及字段：`orderDisplayList`，`myOrders`，`orderType`
- 伪通过风险：无

### 7. 我的订单列表点击后能恢复正确的 `orderId` 和详情上下文

- 结果：通过
- 验证依据：`mine.goOrderDetail()` 优先读取 `dataset.orderid`，命中后先写 `currentOrderIdV2`，再跳转 `order-detail?orderId=...`；不再依赖标题和文案拼详情。
- 涉及页面：`pages/mine/mine.js`，`pages/order-detail/order-detail.js`
- 涉及字段：`orderId`，`currentOrderIdV2`
- 伪通过风险：无

### 8. 从支付成功返回我的订单后，`focusOrderId` 能只命中本次新建订单

- 结果：通过
- 验证依据：`openFocusedOrderIfNeeded()` 只在 `orderDisplayList` 中按 `item.orderId === focusOrderId` 精确匹配；命中后立刻清空 `pendingFocusOrderId`，不会重复打开。
- 涉及页面：`pages/payment-success/payment-success.js`，`pages/mine/mine.js`
- 涉及字段：`focusOrderId`，`pendingFocusOrderId`，`orderId`
- 伪通过风险：无

### 9. 以 `orderId` 进入 `order-detail` 时，页面优先从统一订单存储恢复

- 结果：通过
- 验证依据：`order-detail.onLoad()` 首先判断 `options.orderId`，命中后直接 `orderContext.getOrderById(serviceOrderId)`，并据此初始化详情。
- 涉及页面：`pages/order-detail/order-detail.js`
- 涉及字段：`orderId`，`serviceOrdersV2`，`currentOrderIdV2`
- 伪通过风险：无

### 10. 页面重进后不会因为缺少 query 参数而落到默认订单

- 结果：通过
- 验证依据：`order-detail.onLoad()` 已收口为 `route orderId -> currentOrderIdV2 -> 明确 error layout`。无参进入时会优先 `orderContext.getCurrentOrder()` 恢复；若没有合法当前订单，则进入“暂无订单上下文”的明确错误态，不再回落到默认订单。
- 涉及页面：`pages/order-detail/order-detail.js`
- 涉及字段：`orderId`，`currentOrderIdV2`，`detailLayout`，`loadErrorTitle`，`loadErrorDesc`
- 伪通过风险：无

### 11. 退款申请返回失败时，仍能回到对应订单详情

- 结果：通过
- 验证依据：`refund-apply.checkRefundPageAccess()` 与 `goBack()` 在 `navigateBack` 失败时，都会按 `orderId` 回退到 `order-detail?orderId=...`。
- 涉及页面：`pages/refund-apply/refund-apply.js`，`pages/order-detail/order-detail.js`
- 涉及字段：`orderId`，`serviceDate`，`orderName`
- 伪通过风险：无

### 12. 在 `mine` 预约任一节点后，`scheduleResult` 会写入订单

- 结果：通过
- 验证依据：`mine.confirmBooking()` 在当前生效计划存在 `orderId` 时，会调用 `orderContext.updateOrderSchedule(plan.orderId, {...})`；该方法将结果写入订单的 `scheduleResult.nodeBookings`。
- 涉及页面：`pages/mine/mine.js`，`utils/order-context.js`
- 涉及字段：`orderId`，`scheduleResult`，`nodeBookings`，`lastNode`，`lastDate`，`lastSlot`
- 伪通过风险：无

### 13. 返回 `mine`、重进页面后，预约状态仍可恢复

- 结果：通过
- 验证依据：`mine.syncOrderList()` 会重新取订单；`computeBookingNodes(plan)` 再通过 `_applyScheduleResult(plan, nodes)` 把订单里的 `scheduleResult.nodeBookings` 回灌到节点展示。
- 涉及页面：`pages/mine/mine.js`
- 涉及字段：`orderList`，`bookingNodes`，`scheduleResult.nodeBookings`
- 伪通过风险：无

### 14. 当前生效主计划切换后，预约结果不会只停留在当前页内存

- 结果：通过
- 验证依据：预约结果已持久化到订单对象本身，不依赖当前页内存数组；即使 `syncOrderList()` 重算，节点状态仍由订单 `scheduleResult` 恢复。
- 涉及页面：`pages/mine/mine.js`，`utils/order-context.js`
- 涉及字段：`scheduleResult`，`orderId`，`bookingNodes`
- 伪通过风险：无

### 15. `group-invite` 生成稳定 `inviteToken`，不再按日期拼接

- 结果：通过
- 验证依据：`group-invite` 通过 `orderContext.getOrCreateInviteProfile()` 读取用户邀请身份，`inviteToken` 由 `buildInviteToken()` 生成，格式为 `qr_${ownerUserId}_${random}`，不再按日期拼接。
- 涉及页面：`pages/group-invite/group-invite.js`，`utils/order-context.js`
- 涉及字段：`inviteProfileV2`，`inviteToken`，`ownerUserId`
- 伪通过风险：无

### 16. `group-landing` 能识别 `inviteToken` 并写入邀请上下文

- 结果：通过
- 验证依据：`group-landing.onLoad()` 读取 `inviteToken`，调用 `parseInviteToken()`，成功后写入 `activeInviteContextV2`。
- 涉及页面：`pages/group-landing/group-landing.js`，`utils/order-context.js`
- 涉及字段：`inviteToken`，`invitedBy`，`inviteSource`，`activeInviteContextV2`
- 伪通过风险：无

### 17. `detail -> checkout` 会继续透传 `inviteToken`

- 结果：通过
- 验证依据：`group-landing.submitForm()` 以 `inviteToken` 进入 `detail`；`detail` 继续保留该 token，并在进入 `checkout` 时继续透传。
- 涉及页面：`pages/group-landing/group-landing.js`，`pages/detail/detail.js`，`pages/checkout/checkout.js`
- 涉及字段：`inviteToken`，`inviteCode`，`communityName`，`roomNo`
- 伪通过风险：无

### 18. 结算草稿和正式订单都能写入 `invitedBy` / `inviteSource` / `inviteToken`

- 结果：通过
- 验证依据：`checkout.submitOrder()` 写草稿时已带上 `inviteToken / invitedBy / inviteSource`；`createOrderFromCheckoutDraft()` 创建正式订单时把这三个字段继续写入统一订单结构。
- 涉及页面：`pages/checkout/checkout.js`，`utils/order-context.js`
- 涉及字段：`inviteToken`，`invitedBy`，`inviteSource`，`checkoutDraftV2`，`serviceOrdersV2`
- 伪通过风险：无

### 19. 邀请身份标识包含稳定归属信息，不再弱碰撞

- 结果：通过
- 验证依据：当前用户身份已从固定常量改为 `currentUserV2` 本地身份结构，读取口径统一为 `ensureCurrentUser()/getCurrentUser()/getCurrentUserId()`；邀请身份 `inviteProfileV2` 绑定当前用户对象的 `userId`，不再伪建立在固定 `mock_user_self` 上。
- 涉及页面：`utils/order-context.js`，`app.js`，`pages/group-invite/group-invite.js`
- 涉及字段：`currentUserV2`，`userId`，`ownerUserId`，`inviteToken`，`inviteProfileV2`
- 伪通过风险：无

### 20. 订单详情优先级：`route orderId` > 当前订单存储 > 旧 query 兼容

- 结果：通过
- 验证依据：已实现第一层 `route orderId` 优先；详情页 `onShow()` 在已有 `this.data.orderId` 时会再次从统一订单存储刷新；旧 query 兼容分支仍在后面。
- 涉及页面：`pages/order-detail/order-detail.js`
- 涉及字段：`orderId`，`currentOrderIdV2`
- 伪通过风险：无

### 21. 结算邀请优先级：`route inviteToken` > `activeInviteContextV2` > 旧 `inviteCode` 兼容

- 结果：通过
- 验证依据：`checkout.onLoad()` 先读 `options.inviteToken`，其次回退 `orderContext.getActiveInviteContext()`，最后才兼容旧 `inviteCode`。
- 涉及页面：`pages/checkout/checkout.js`
- 涉及字段：`inviteToken`，`activeInviteContextV2`，`inviteCode`，`invitedBy`，`inviteSource`
- 伪通过风险：无

### 22. 文档页在参数缺失时优先回退当前订单上下文，不再回退 `mockPaymentOrder`

- 结果：通过
- 验证依据：`scheme-book` 与 `final-book` 均已用 `orderContext.getCurrentOrder()` 作为参数缺失时的优先回退来源；代码中不再以 `mockPaymentOrder` 作为主回退。
- 涉及页面：`pages/scheme-book/scheme-book.js`，`pages/final-book/final-book.js`
- 涉及字段：`currentOrderIdV2`，`serviceType`，`communityName`，`roomNo`，`orderArea`，`serviceDate`，`totalPrice`
- 伪通过风险：无

### 23. `mine` 不再固定写入 `schemeFlow_*`

- 结果：通过
- 验证依据：`mine.ensureSchemeFlowState()` 已变为空实现，不再写固定 `schemeFlow_*`。
- 涉及页面：`pages/mine/mine.js`
- 涉及字段：`schemeFlow_*`
- 伪通过风险：无

### 24. 文档流展示只依赖真实订单上下文和已有 storage，不再硬编码造数

- 结果：通过
- 验证依据：文档流状态读写已统一切到 `orderId` 主键，主存储改为 `docFlowStateV2_{orderId}`、`docConfirmDataV2_{orderId}`、`docFinalSnapshotV2_{orderId}`、`docFinalPdfV2_{orderId}`。页面层不再双读 `schemeFlow_* / schemeStatus_*`；旧弱主键数据仅通过 `orderContext.migrateLegacyDocStorage()` 做一次性迁移并清理。
- 涉及页面：`pages/mine/mine.js`，`pages/order-detail/order-detail.js`，`pages/scheme-book/scheme-book.js`，`pages/final-book/final-book.js`
- 涉及字段：`orderId`，`docFlowStateV2_*`，`docConfirmDataV2_*`，`docFinalSnapshotV2_*`，`docFinalPdfV2_*`
- 伪通过风险：无

## 本轮不纳入验收

- 真实支付接口
- 真实后端订单创建
- 云函数与云环境
- 退款正式回滚规则
- 多套餐完整价格引擎重构

## 验收总结

- 结论：达到 Phase 1 Accepted。
- 本轮重点复核结果：
  - `order-detail` 无参进入已优先使用 `currentOrderIdV2`，恢复失败进入明确错误态，不再落默认订单。
  - 邀请身份已不再依赖固定 `mock_user_self`，而是统一走 `currentUserV2` 本地身份结构。
  - 文档流状态已统一按 `orderId` 读写，页面层不再主读 `schemeFlow_* / schemeStatus_*` 弱主键旧口径。
