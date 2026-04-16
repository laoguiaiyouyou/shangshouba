# PHASE 1 回归清单

## 订单主链路

- [ ] 从 `detail` 进入 `checkout`，填写信息后不会提前创建订单。
- [ ] 提交后进入 `payment-success`，此时才正式创建订单。
- [ ] `payment-success -> 查看订单` 能恢复到该订单详情，而不是默认订单。
- [ ] `payment-success -> 返回` 不再回到结算页假成功状态。

## 我的订单

- [ ] “我的订单”只展示统一订单存储中的 `service_order`。
- [ ] 通过优惠券预约、赠送服务预约产生的 `myOrders` 不再混入“我的订单”主链。
- [ ] 我的订单列表点击后能恢复正确的 `orderId` 和详情上下文。
- [ ] 从支付成功返回我的订单后，`focusOrderId` 能只命中本次新建订单。

## 订单详情恢复

- [ ] 以 `orderId` 进入 `order-detail` 时，页面优先从统一订单存储恢复。
- [ ] 页面重进后不会因为缺少 query 参数而落到默认订单。
- [ ] 退款申请返回失败时，仍能回到对应订单详情。

## 预约结果持久化

- [ ] 在 `mine` 预约任一节点后，`scheduleResult` 会写入订单。
- [ ] 返回 `mine`、重进页面后，预约状态仍可恢复。
- [ ] 当前生效主计划切换后，预约结果不会只停留在当前页内存。

## 邀请二维码链路

- [ ] `group-invite` 生成稳定 `inviteToken`，不再按日期拼接。
- [ ] `group-landing` 能识别 `inviteToken` 并写入邀请上下文。
- [ ] `detail -> checkout` 会继续透传 `inviteToken`。
- [ ] 结算草稿和正式订单都能写入 `invitedBy` / `inviteSource` / `inviteToken`。
- [ ] 邀请身份标识包含稳定归属信息，不再弱碰撞。

## route param 与 storage 优先级

- [ ] 订单详情优先级：`route orderId` > 当前订单存储 > 旧 query 兼容。
- [ ] 结算邀请优先级：`route inviteToken` > `activeInviteContextV2` > 旧 `inviteCode` 兼容。
- [ ] 文档页在参数缺失时优先回退当前订单上下文，不再回退 `mockPaymentOrder`。

## 文档流与 demo 造数

- [ ] `mine` 不再固定写入 `schemeFlow_*`。
- [ ] 文档流展示只依赖真实订单上下文和已有 storage，不再硬编码造数。

## 本轮明确不验收项

- [ ] 真实支付接口
- [ ] 真实后端订单创建
- [ ] 云函数与云环境
- [ ] 退款正式回滚规则
- [ ] 多套餐完整价格引擎重构
