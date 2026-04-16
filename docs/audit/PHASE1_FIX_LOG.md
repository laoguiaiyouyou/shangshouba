# PHASE 1 修复记录

## 本轮目标

本轮只修“前端本地态闭环”和“假贯通”问题，不接真实后端、不接真实支付、不改 UI 风格。

## 改动文件与原因

### `utils/order-context.js`

- 新增统一订单上下文与本地存储合同。
- 统一字段：`orderId`、`orderType`、`serviceType`、`status`、`roomNo`、`scheduleResult`、`sourcePage`、`createdAt`、`updatedAt`、`invitedBy`、`inviteSource`、`inviteToken`。
- 提供订单列表、当前订单、结算草稿、邀请身份、预约结果持久化等公共逻辑。
- 对应修复审计结论：H1、H2、H4、H5、M2。

### `app.js`

- 启动时将历史种子订单迁移到统一订单存储。
- 启动时创建稳定邀请身份资料。
- 对应修复审计结论：H5、M2。

### `pages/checkout/checkout.js`

- 下单页不再提前创建订单，只保存 `checkoutDraftV2` 草稿。
- 收口邀请参数读取优先级：`route param inviteToken` -> `activeInviteContextV2`。
- 兼容 `19-2-102` 这类房号透传格式，减少进入结算页后二次填写。
- 新增拼单优惠字段写入草稿，价格计算遵守“早鸟 + 拼单最高 2 元/㎡”口径。
- 对应修复审计结论：H1、H5、M3。

### `pages/checkout/checkout.wxml`

- 费用明细增加最小必要的“拼单优惠”展示行，便于核对邀请识别是否生效。
- 对应修复审计结论：H2、M3。

### `pages/payment-success/payment-success.js`

- 支付成功页进入时根据结算草稿正式创建订单。
- 订单创建时点改为“支付成功后”。
- “查看订单”改为携带 `focusOrderId` 回到我的订单并恢复正确详情。
- 邀请入口改为基于 `orderId` 进入，不再依赖默认订单。
- 对应修复审计结论：H1、H2、H5。

### `pages/mine/mine.js`

- 我的订单改为只读统一订单存储，不再拼接 `myOrders` 中的 `coupon_booking/gift_service_booking`。
- 点击订单按 `orderId` 恢复上下文进入详情。
- 预约结果写入订单 `scheduleResult`，从页面内存改为可持久恢复。
- 去掉固定注入 `schemeFlow_*` 的造数逻辑。
- 支持 `focusOrderId` 自动恢复到刚支付成功的订单详情。
- 对应修复审计结论：H3、H4、M1、M6。

### `pages/mine/mine.wxml`

- 为订单项补充 `data-orderid`，让点击详情不再依赖散落字段。
- 对应修复审计结论：H1、H3。

### `pages/order-detail/order-detail.js`

- 支持 `orderId` 作为主入口恢复订单上下文。
- `onShow` 优先从统一订单存储刷新，避免默认值串单。
- 邀请入口、退款入口、再次下单入口统一透传稳定上下文。
- 去掉基于 `mockGroupQuota_*` 的弱主键拼团判断。
- 对应修复审计结论：H1、H2、M4、M5。

### `pages/group-invite/group-invite.js`

- 邀请身份改为稳定 `inviteToken`，不再按日期拼接弱邀请码。
- 优先基于 `orderId` 或当前订单恢复邀请页上下文。
- 对应修复审计结论：H2、M2。

### `pages/group-landing/group-landing.js`

- 扫码/链接进入时识别 `inviteToken`，写入当前有效邀请上下文。
- 进入详情页时透传 `inviteToken`，不再使用弱邀请码主逻辑。
- 对应修复审计结论：H2、M2。

### `pages/detail/detail.js`

- 详情页支持接收 `inviteToken`，并在进入结算页时继续透传。
- 对应修复审计结论：H2、M3。

### `pages/refund-apply/refund-apply.js`

- 增加 `orderId` 参数支持。
- 提交退款时同步回写统一订单状态，详情页可正确恢复。
- 兜底返回优先回到对应订单详情，而不是无参数默认详情。
- 对应修复审计结论：M4。

### `pages/final-book/final-book.js`

- 去掉对 `mockPaymentOrder` 的主兜底依赖，改为优先读当前订单上下文。
- 对应修复审计结论：M5。

### `pages/scheme-book/scheme-book.js`

- 方案确认页在参数缺失时优先回落到当前订单上下文，不再完全依赖散落 query。
- 对应修复审计结论：M5。

## 本轮已完成的审计问题

- H1 支付成功页进入订单详情丢上下文
- H2 支付成功页进入邀请页丢上下文
- H3 我的订单展示了但点击无效的假贯通
- H4 预约结果只存在页面内存
- H5 支付成功前提前造订单、靠散乱 mock 键闭环
- M1 文档流固定注入造数
- M2 按日期拼邀请标识导致碰撞
- M3 房号透传格式不一致导致结算页恢复不完整
- M4 多处无参数默认详情页回退
- M5 文档页串单风险

## 明确保留到 PHASE 2 的问题

- 仍未接真实 `wx.request`、`wx.requestPayment`、`wx.cloud`、云函数。
- `coupon_booking` / `gift_service_booking` 仍保留在权益体系与兼容代码中，但不再混入“我的订单”主链；后续是否接入统一订单体系留到 Phase 2。
- 文档流已切到本地 `orderId` 主键，但尚未接入后端主键与正式接口同步。
- 不同套餐的完整价格引擎未统一重构；本轮仅补齐邀请优惠字段与结算链口径。
- 开发态 `mockDemoMainPlan` 长按逻辑仍保留，但默认不开启，不再冒充主链路数据来源。

## Phase 1 收尾修复

### `utils/order-context.js`

- 新增 `currentUserV2` 本地身份结构，统一当前用户读取口径为 `ensureCurrentUser/getCurrentUser/getCurrentUserId`，去掉固定 `mock_user_self` 常量。
- 增加历史本地身份兜底：若设备上已有旧 `inviteProfileV2` 或旧订单 owner，则优先复用，避免升级后把历史订单“切丢”。
- 新增文档流 V2 主键：`docFlowStateV2_{orderId}`、`docConfirmDataV2_{orderId}`、`docFinalSnapshotV2_{orderId}`、`docFinalPdfV2_{orderId}`。
- 增加旧 `schemeFlow_* / schemeStatus_* / schemeConfirmData_* / finalBookSnapshot_* / finalBookPdf_*` 到 `orderId` 主键的一次性迁移与清理。
- 对应收尾问题：A10、A19、A24。

### `app.js`

- 启动时先初始化 `currentUserV2`，再迁移订单与初始化邀请身份，确保订单归属与邀请身份基于同一当前用户口径。
- 对应收尾问题：A19。

### `pages/order-detail/order-detail.js`

- 无参进入恢复顺序改为：`route orderId` -> `currentOrderIdV2` -> 明确错误态。
- 去掉空上下文时的默认订单静默兜底；恢复失败时进入“暂无订单上下文/订单不存在”的错误态。
- 文档流状态读取改为只读 `orderId` 主键文档状态；进入 `scheme-book/final-book` 时显式透传 `orderId`。
- 对应收尾问题：A10、A24。

### `pages/order-detail/order-detail.wxml`

- 错误态文案改为绑定数据字段，支持区分“订单不存在”和“暂无订单上下文”两类失败状态。
- 对应收尾问题：A10。

### `pages/scheme-book/scheme-book.js`

- 增加 `orderId` 恢复；文档确认写入改为 `orderId` 主键，不再写 `schemeFlow_${flowKey}`。
- 对应收尾问题：A24。

### `pages/final-book/final-book.js`

- 增加 `orderId` 恢复；确认书快照与状态写入改为 `orderId` 主键，不再写 `schemeFlow_${flowKey}` / `finalBookSnapshot_${flowKey}`。
- 查看态读取也改为从 `orderId` 主键文档存储恢复。
- 对应收尾问题：A24。

## 本轮收尾后状态

- A10 已修：订单详情页无参进入不再落默认订单。
- A19 已修：邀请身份归属已收口到本地可扩展 `currentUserV2`。
- A24 已修：文档流状态主键已切换到 `orderId`，并做了一次性旧数据迁移清理。

## 收尾后仍留到 PHASE 2 的问题

- 真实登录体系尚未接入；当前 `currentUserV2` 仍是本地身份模拟，但已具备替换为真实登录态的结构入口。
- `coupon_booking` / `gift_service_booking` 的统一订单建模仍未处理。
- 多用户真实联动、邀请返现正式结算、退款回滚规则、真实后端与真实支付仍留到 Phase 2。
