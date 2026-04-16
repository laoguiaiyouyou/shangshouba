# 页面与路由矩阵

## 页面注册检查

静态检查结果：

- `app.json.pages` 中注册的页面均存在对应目录与 `.js/.json/.wxml/.wxss`
- `pages/*` 实际目录未发现未注册页面
- 未发现跳转到未注册页面的硬错误
- `app.json` 未配置 `tabBar`

## 页面清单

- 首页链：`index`, `detail`, `checkout`, `payment-success`
- 订单链：`mine`, `order-detail`, `refund-apply`, `scheme-book`, `final-book`, `booking-result`
- 拼团链：`group-invite`, `group-landing`
- 权益链：`welfare-center`, `coupon-list`, `gift-service`, `withdraw`, `withdraw-form`
- 内容链：`review-list`, `case-list`

## 关键跳转关系

### 已跑通到页面层

- `index -> detail`
- `detail -> checkout`
- `checkout -> payment-success`
- `mine -> order-detail`
- `order-detail -> scheme-book`
- `order-detail -> final-book`
- `order-detail -> refund-apply`
- `order-detail -> group-invite`
- `group-invite -> group-landing`
- `group-landing -> detail`
- `mine -> welfare-center`
- `welfare-center -> coupon-list`
- `welfare-center -> gift-service`

### 已发现的路由层断点

- `payment-success -> order-detail` 缺少订单参数
- `payment-success -> group-invite` 缺少订单参数
- `refund-apply` 多处兜底返回 `order-detail` 时缺少订单参数
- `mine` 中 `coupon_booking` / `gift_service_booking` 不允许进入详情

## 结论

路由“能跳”不代表链路“能通”。当前项目的主要问题不是页面路径失效，而是跳转后缺少业务参数和状态承接。
