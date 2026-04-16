# PHASE2A_STEP3_FIX_LOG

## 本轮范围

- 只做预约结果落库
- 不改 UI
- 不碰邀请关系
- 不碰退款
- 不碰价格引擎
- 不碰 `payment-success` / `order-detail` 主链路
- 不改 `mine` 列表真源

## 改了哪些文件

- `pages/mine/mine.js`
- `utils/order-context.js`
- `cloudfunctions/saveOrderSchedule/index.js`
- `cloudfunctions/saveOrderSchedule/package.json`
- `docs/audit/PHASE2A_STEP3_FIX_LOG.md`

## `saveOrderSchedule` 云函数

### 入参

- `orderId`
- `scheduleInput`
  - `nodeName`
  - `dateLabel`
  - `slot`

### 出参

- `ok`
- `orderId`
- `scheduleResult`
- `updatedAt`

### 写入规则

- 按 `orderId` 查询 `service_orders`
- 找到订单后更新：
  - `scheduleResult`
  - `updatedAt`
- 不扩写其他业务规则

## 预约结果如何从本地写入口切到后端写入口

### 旧逻辑

- `pages/mine/mine.js` 的 `confirmBooking()`
- 直接调用本地 `orderContext.updateOrderSchedule()`
- 本地 `serviceOrdersV2` 是预约结果主写口

### 新逻辑

- `confirmBooking()` 里优先调用云函数 `saveOrderSchedule`
- 云函数成功时：
  - 保持当前页面状态
  - 用返回的 `scheduleResult` 回写本地 `serviceOrdersV2`
  - 再按现有 `syncOrderList()` 从后端真源刷新
- 云函数失败时：
  - 才回退到现有本地 `orderContext.updateOrderSchedule()`

## 本地缓存如何兜底

- 保留 `serviceOrdersV2`
- 新增最小 helper：`cacheOrderScheduleResult(orderId, scheduleResult, updatedAt)`
- 当云函数成功时，本地缓存跟随后端更新
- 当云函数失败时，继续用原有 `updateOrderSchedule()` 做本地兜底

## 下一步验收看什么

- `mine` 预约一次后，云端 `service_orders.scheduleResult` 已更新
- 重新进入 `mine` 后，预约结果能从后端恢复
- 进入 `order-detail` 后，能读取同一份预约结果
- 云函数失败时，当前页面仍能依赖本地缓存继续显示预约结果
