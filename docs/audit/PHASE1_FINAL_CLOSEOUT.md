# PHASE1_FINAL_CLOSEOUT

## 本轮修了哪 3 个问题

### 1. 订单详情页无参恢复

- 修复目标：`pages/order-detail/order-detail.js` 无 query 进入时，不再落默认订单。
- 修复结果：恢复顺序已收口为 `route orderId -> currentOrderIdV2 -> 明确错误态`。
- 当前口径：
  - 进入时若 URL 带 `orderId`，优先按该 `orderId` 从统一订单存储恢复。
  - 若 URL 不带 `orderId`，则按 `currentOrderIdV2` 恢复当前订单。
  - 若两者都不存在或无效，则进入明确错误态，不再静默展示默认订单。

### 2. 收口邀请身份来源

- 修复目标：邀请身份归属不能再绑定固定 `mock_user_self`。
- 修复结果：当前用户身份已改为本地可扩展 `currentUserV2` 结构。
- 当前口径：
  - 当前用户统一通过 `ensureCurrentUser/getCurrentUser/getCurrentUserId` 读取。
  - 邀请身份 `inviteProfileV2` 与订单归属 `ownerUserId` 均绑定当前用户的 `userId`。
  - 当前仍为本地身份模拟，但已不再依赖固定单一常量，后续可替换为真实登录态。

### 3. 文档流状态主键切到 `orderId`

- 修复目标：文档流状态主键不再使用 `orderName + communityName + roomNo + serviceDate` 弱拼接。
- 修复结果：文档状态、确认数据、最终快照、PDF 标记都已统一改为 `orderId` 主键。
- 当前口径：
  - 文档状态：`docFlowStateV2_{orderId}`
  - 方案确认数据：`docConfirmDataV2_{orderId}`
  - 最终确认书快照：`docFinalSnapshotV2_{orderId}`
  - 正式 PDF 标记：`docFinalPdfV2_{orderId}`
  - 页面层只走 `orderId` 主键读写，不再长期双读双写 `schemeFlow_* / schemeStatus_*`

## 每个问题改了哪些文件

### 问题 1：订单详情页无参恢复

- `pages/order-detail/order-detail.js`
- `pages/order-detail/order-detail.wxml`

### 问题 2：收口邀请身份来源

- `utils/order-context.js`
- `app.js`

### 问题 3：文档流状态主键切到 `orderId`

- `utils/order-context.js`
- `pages/order-detail/order-detail.js`
- `pages/scheme-book/scheme-book.js`
- `pages/final-book/final-book.js`

## 每个问题修复后的恢复/读取/写入口径

### 订单详情

- 读入口径：`route orderId` 优先，其次 `currentOrderIdV2`
- 写入口径：支付成功、我的订单点击、订单详情进入文档页时都写/透传 `orderId`
- 失败口径：进入明确错误态，不再默认兜底到“精细开荒”

### 当前用户 / 邀请身份

- 读入口径：`currentUserV2`
- 写入口径：`app.onLaunch()` 初始化本地当前用户；邀请页与下单页统一从当前用户读取归属
- 兼容口径：若本地已有旧邀请资料或旧订单 owner，则启动时优先复用，避免升级后丢历史归属

### 文档流

- 读入口径：`orderId -> docFlowStateV2_* / docConfirmDataV2_* / docFinalSnapshotV2_* / docFinalPdfV2_*`
- 写入口径：
  - `scheme-book` 写 `docConfirmDataV2_{orderId}` 与 `docFlowStateV2_{orderId}=confirm_book`
  - `final-book` 写 `docFinalSnapshotV2_{orderId}` 与 `docFlowStateV2_{orderId}=final`
  - `order-detail` 只按 `orderId` 读取文档态与 PDF 标记
- 迁移说明：保留了一次性兼容迁移；若命中旧 `schemeFlow_* / schemeStatus_* / schemeConfirmData_* / finalBookSnapshot_* / finalBookPdf_*`，会迁到新的 `orderId` 主键并清理旧键，不作为长期双真相保留

## 还有哪些明确留到 Phase 2

- 真实登录系统与多用户真实联动
- 真实 `wx.request / wx.requestPayment / wx.cloud / 云函数`
- 邀请返现正式结算逻辑
- 退款正式回滚规则
- `coupon_booking / gift_service_booking` 是否进入统一订单体系
- 多套餐完整价格引擎重构

## 修完后是否已可再次发起 Phase 1 Accepted 验收

- 结论：可以。
- 原因：上轮验收未通过/有风险的 3 个问题已完成代码收口，当前已具备再次执行 Phase 1 Accepted 验收的条件。
