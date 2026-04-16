# CLAUDE.md

本文件为 Claude Code 在此仓库的永久工作指南。仅保留长期有效规则，临时决策见 memory。

# 上手吧（shangshouba）微信小程序

## 一、项目概况

**产品定位：** 社区到家深度保洁服务平台，集成邻里拼团与裂变邀约体系。
**技术栈：** 微信小程序原生开发（WXML + WXSS + JS），云开发后端（wx-server-sdk + Cloud DB）。
**项目根目录路径含尾部空格：** `/Users/xiaogui/Desktop/shangshouba ` — 所有工具调用注意此空格。

> **新会话必读：** 开发前先阅读 `docs/DECISIONS.md`（产品决策基线），了解所有已确认的业务规则、冻结模块和待确认项。

---

## 二、工作流约定（强制）

### 开发节奏
1. **先出 Plan，不直接执行。** 收到需求后，先输出实现方案（涉及文件、改动点、影响范围），等确认后再写代码。
2. **不擅自扩展范围。** 只改被要求的内容，不附带重构、加注释、加类型标注。
3. **业务规则变更需确认。** 涉及定价公式、成团阈值、退款窗口等硬编码规则，必须先列当前值与拟改值。
4. **每轮只处理一个页面或一个模块，不要顺手扩散改别的页面。**

### 自测要求
改完代码后必须自测：
- JS 文件：`node -c <file>` 语法检查
- WXML 文件：检查 `{{}}` 绑定与 data 字段匹配
- 云函数：`node -c cloudfunctions/<name>/index.js`
- 如有多文件联动，列出数据流验证（A 传什么给 B，B 期望什么）

### 回报格式（每次任务结束必须输出）
```
## 本次改动
- [文件列表 + 改了什么]

## 自测结果
- [跑了什么检查 + 结果]

## 未完成 / 已知风险
- [遗留项]
```

### 弹窗与对话框
- **禁止使用 `wx.showModal` 等微信原生弹窗**，必须用自定义组件匹配品牌风格。
- 弹窗遵循 DESIGN.md：遮罩 `rgba(0,0,0,0.4)`，白底圆角 24rpx，主按钮 `#F9E12A`。

---

## 三、设计标准（强制约束）

**DESIGN.md 是唯一 UI 设计标准，写任何 WXSS 前必须先检查。**
- 颜色只允许 `#F9E12A` + 黑白灰。严禁红、蓝、绿、紫、橙及非标黄。
- 成功态用黄色，错误态用黑色+下划线。严禁绿色/红色语义色。
- 优惠金额用黑色加粗或黄底黑字标签。严禁橙色/红色。
- 分区用色调过渡，禁止 1px solid 实线分隔。
- 按钮文字 ≤ 6 字，卡片 ≤ 3 层逻辑堆叠。

---

## 四、核心业务规则

### 定价（`cloudfunctions/unifiedOrder/index.js` 服务端计算）
```
毛价     = 面积 × ¥15/m²
新客立减 = min(面积 × ¥1/m², ¥200)
早鸟折扣 = 面积 × (¥2 if ≥60天 | ¥0 if <60天)
拼团折扣 = 面积 × ¥2/m²（成团后返钱包）
应付     = 毛价 - 新客 - 早鸟
价格底线 = ¥12/m²
```

### 订单状态机（haokang 主链 5 节点）
```
待支付 → 待服务 → 待勘查 → 待深处理 → 深处理中 → 已交付
                  └→ 退款处理中 → 已退款（72h 窗口）
```

### 拼团规则
- 成团门槛：3 户**付款成功** = 正式成团（扫码只占位）
- 有效期：7 天 TTL
- 折扣：成团后全员 ¥2/m² 返到钱包（不是下单时减价）
- 校验：同小区 + 不同房号

### 邀约规则
- 邀请人必须已下单，且与被邀请人在**同小区**（后端硬校验）
- 扫码后享 -¥2/m² 优惠
- `resolveInviteToken` 返回 `inviterCommunity`，checkout 前端即时比对 + unifiedOrder 终极校验

### 退款规则
- 可退状态：仅"待服务"和"待勘查"
- 时间窗口：服务日期前 72 小时（服务端强校验）

---

## 五、代码约定

### 数据传递
- 页面间传参优先 URL query（`encodeURIComponent`），复杂对象走 localStorage 中转。
- localStorage 键名统一带 `V2` 后缀，见 `utils/order-context.js`。

### 房号标准化
所有涉及房号的地方使用统一函数：
```js
buildNormalizedRoomNo(buildingNo, unitNo, flatNo, houseType)
// villa_single → "X栋"
// villa_row    → "X栋Y"
// apartment    → "X栋Y单元Z"
```
目前此函数在 checkout.js、group-buy.js 各有一份副本（未抽公共模块）。

### 云函数
- 19 个，全部在 `cloudfunctions/` 目录。
- 使用 `wx-server-sdk`，数据库为云开发 Cloud DB。
- `OPENID` 从 `cloud.getWXContext()` 获取，覆盖客户端传入的 userId。

---

## 六、关键文件索引

| 模块 | 路径 |
|------|------|
| 首页 | `pages/index/index` |
| 服务详情 | `pages/detail/detail` |
| 结算 | `pages/checkout/checkout` |
| 支付成功 | `pages/payment-success/payment-success` |
| 订单详情 | `pages/order-detail/order-detail`（最重页 ~900行） |
| 拼团首页 | `pages/group-buy/group-buy` |
| 发起拼团 | 已合并到 `pages/group-buy/group-buy` |
| 团详情 | `pages/group-detail/group-detail` |
| 扫码落地 | `pages/group-landing/group-landing` |
| 我的 | `pages/mine/mine` |
| 订单上下文 | `utils/order-context.js` |
| 统一下单 | `cloudfunctions/unifiedOrder` |
| 拼团管理 | `cloudfunctions/manageGroup` |
| 邀约解析 | `cloudfunctions/resolveInviteToken` |
| 设计标准 | `DESIGN.md` |
