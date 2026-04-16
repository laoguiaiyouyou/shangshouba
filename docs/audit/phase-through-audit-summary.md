# 阶段性贯通审计总报告

## 1. 审计结论

本仓库当前属于“前端原型可演示、真实业务未贯通”的状态。

- 页面注册、基础路由、模板事件绑定整体可运行，未扫出页面缺失、未注册页面、模板绑定到不存在函数这类硬错误。
- 订单、预约、退款、拼团、券预约、赠送服务、勘察确认、承诺书确认等链路已经有前端页面骨架，但大部分关键状态推进依赖 `App.globalData` 和 `wx.setStorageSync/getStorageSync`。
- 仓库未发现 `package.json`、`wx.request`、`wx.requestPayment`、`wx.cloud`、`cloudfunctions/`。这意味着“支付链路”“联调链路”“云函数链路”目前没有真实接入面，只有本地模拟。
- 最大风险不是“页面打不开”，而是“页面能打开，但上下文丢失、状态不持久、入口不可达、靠本地 storage 假装跑通”。

## 2. 扫描范围

- 页面与配置：`app.json`、`project.config.json`、`pages/*`
- 业务主链路：详情 -> 下单 -> 支付成功 -> 订单详情
- 文档链：订单详情 -> `scheme-book` -> `final-book`
- 退款链：订单详情 -> 退款申请 -> 退款状态回显
- 预约链：`mine` 四节点预约 -> `booking-result`
- 拼团链：邀请页 -> 落地页 -> 详情 -> 下单 -> 支付成功
- 权益链：优惠券预约、赠送服务预约、我的订单合并展示
- 状态与存储：`myOrders`、`myCoupons`、`giftServiceCards`、`schemeFlow_*`、`finalBookSnapshot_*`、`mock*`

## 3. 自动化检查结果

已完成的自动化检查：

- 页面四件套齐全性检查
- `app.json.pages` 与实际页面目录对照
- `navigateTo/redirectTo/reLaunch/switchTab/navigateBack` 跳转路径检查
- WXML 事件绑定与 JS 函数存在性检查
- `wx:for` / 资源路径基础扫描
- `onLoad` 参数接收入口扫描
- `wx.getStorageSync/setStorageSync` 契约扫描
- `wx.request` / `wx.requestPayment` / `wx.cloud` / `cloudfunctions` 缺失性检查

未发现：

- 缺失页面注册
- 页面文件缺失
- 静态资源路径失效
- 模板事件函数缺失
- `tabBar` 残留 `switchTab` 调用

## 4. 关键结论

### 高优先级

1. 支付成功页返回订单详情和邀请页时不透传订单上下文，能打开页面但会落到默认/错误订单。
2. 券预约单、赠送服务预约单已经合并到“我的订单”，但点击入口被截断，用户看得到订单，进不去业务详情。
3. 预约链结果只保存在 `mine` 页内存态，不持久化，返回后会丢失，属于典型假贯通。
4. 支付、请求、云函数、微信支付均未接入，所谓“支付成功”“联调”目前完全是本地 storage 模拟。

### 中优先级

1. 文档流被 `mine.ensureSchemeFlowState()` 强制注入一个固定订单的 `schemeFlow_*`，会制造“某单天然可确认勘察结果”的假象。
2. 邀请码按 `serviceDate` 固定生成，多个同日订单会发生碰撞并覆盖 mapping。
3. `detail/group-landing` 传 `roomNo`，`checkout` 却只会自动拆 `X栋Y单元Z` 格式，导致带参进入时经常无法自动填完整房号。
4. 多个回退兜底直接跳到无参数的 `order-detail`，会进入默认订单。

### 低优先级

1. 仓库没有 lint/test/build/type-check 入口，后续回归质量缺少自动护栏。
2. 存在开发态残留和兼容口径并存，如 `schemeFlow_*` / `schemeStatus_*` 双读。

## 5. 报告索引

- `findings-high-medium-low.md`
- `route-and-page-matrix.md`
- `navigation-param-matrix.md`
- `storage-contract-audit.md`
- `order-mainflow-audit.md`
- `event-binding-audit.md`
