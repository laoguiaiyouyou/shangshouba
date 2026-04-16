# 上手吧小程序现状深度摸排

> 生成时间：2026-04-03  
> 适用范围：当前仓库 `shangshouba` 的“眼前版本 / 当下状态”  
> 用途：给新 GPT 账号快速建立上下文，避免误把旧文档、旧页面、mock 页面当成当前主链路

---

## 1. 项目一句话概况

这是一个微信原生小程序，核心业务是“新房深度开荒服务 + 邻里拼团 + 邀约返现/权益体系”。  
当前已经不是纯前端原型，主链路里已经接入了云开发、云函数、CloudPay、退款云函数、拼团真 groupId/短码 scene/小程序码接口，但仓库里仍然保留了一批旧页面、mock 页面和本地存储兜底逻辑。

最重要的判断是：

- **主下单链、订单详情链、退款申请链、邻里拼团主链已经有真实云端接入。**
- **权益中心、优惠券、赠送服务、部分旧拼团页、部分社区团购子页仍然是本地 storage 或 mock 驱动。**
- **仓库里存在“新主链 + 旧并存链”并行状态，不能只看页面是否存在，要看它是不是当前主链。**

---

## 2. 基础环境与工程信息

### 2.1 小程序工程

- 工程类型：微信原生小程序
- `appid`：`wx55b694f7ee29c81e`
- 云开发环境：`cloud1-8ge14816fe785add`
- 开发库版本：`3.14.3`
- `app.json` 注册页面数：28
- `tabBar`：**没有**，底部导航全部是页面内自绘

### 2.2 技术栈

- 前端：原生 `JS + WXML + WXSS`
- 后端：微信云开发 `cloudfunctions/*`
- 支付：`cloud.cloudPay.unifiedOrder` + `wx.requestPayment`
- 数据层：云数据库 + 本地 `wx.setStorageSync/getStorageSync`

### 2.3 UI / 视觉现状

从代码和全局样式看，当前统一视觉方向是：

- 主色：`#F9E12A`
- 文字主色：`#111111`
- 页面底色：`#F2F2F7`
- 字体：`-apple-system / PingFang SC / Helvetica Neue`
- 导航方式：大部分主页面用 `navigationStyle: custom`
- 首页、团购页、我的页都在做“苹果感 + 扁平 + 黑黄白灰”的统一

实际代码里的一个现实情况：

- `app.wxss` 顶部栏背景还是 `rgba(255,255,255,0.96)`，也就是**轻微透明**，这和 AGENTS 里的“不透明固定栏”要求并不完全一致。

---

## 3. 当前代码结构

### 3.1 前端页面分层

#### A. 主业务链页面

| 路由 | 作用 | 当前状态 |
|---|---|---|
| `pages/index/index` | 首页 | 主入口 |
| `pages/detail/detail` | 服务详情页 | 主入口 |
| `pages/checkout/checkout` | 下单页 | 主入口，接云端统一下单 |
| `pages/payment-success/payment-success` | 支付成功页 | 主入口，接云端订单承接 |
| `pages/mine/mine` | 我的页 | 主入口，订单/服务节点/钱包入口 |
| `pages/order-detail/order-detail` | 订单详情页 | 主入口，退款/文档/拼团承接 |
| `pages/refund-apply/refund-apply` | 退款申请页 | 主入口，接 `applyRefund` |
| `pages/group-buy/group-buy` | 社区团购主页面 | 当前拼团主入口 |
| `pages/group-landing/group-landing` | 邻里拼团落地页 | 当前扫码/分享统一落地页 |
| `pages/scheme-book/scheme-book` | 勘查结果确认页 | 订单文档链主入口 |
| `pages/final-book/final-book` | 承诺书确认/查看页 | 订单文档链主入口 |

#### B. 权益/钱包链页面

| 路由 | 作用 | 当前状态 |
|---|---|---|
| `pages/welfare-center/welfare-center` | 权益中心 | 页面可用，但数据仍偏 mock |
| `pages/coupon-list/coupon-list` | 优惠券列表 | 本地 storage 驱动 |
| `pages/gift-service/gift-service` | 赠送服务 | 本地 storage 驱动 |
| `pages/withdraw/withdraw` | 提现页 | 钱包余额接云端，退款列表读取有字段错配 |
| `pages/withdraw-form/withdraw-form` | 提现申请结果页/表单页 | 辅助页 |

#### C. 履约辅助页

| 路由 | 作用 | 当前状态 |
|---|---|---|
| `pages/contact-schedule/contact-schedule` | 联系客服排期 | 辅助页 |
| `pages/booking-result/booking-result` | 预约结果页 | 辅助页 |
| `pages/upgrade/upgrade` | 升级方案页 | 辅助页 |

#### D. 内容展示页

| 路由 | 作用 | 当前状态 |
|---|---|---|
| `pages/review-list/review-list` | 全部评价 | 内容页 |
| `pages/case-list/case-list` | 案例列表 | 内容页 |
| `pages/surprise/surprise` | 跳转页 | 极轻页面 |
| `pages/logs/logs` | 演示日志页 | 开发辅助页 |

#### E. 当前仍保留但不应被误判为主链的页面

| 路由 | 性质 | 说明 |
|---|---|---|
| `pages/group-invite/group-invite` | **旧拼团/邀约并存页** | 仍被部分页面引用；group buy 主链已尽量转向 `group-landing` |
| `pages/group-create/group-create` | **旧开团页** | 仍在仓库内，逻辑偏旧 |
| `pages/group-detail/group-detail` | **旧团详情页** | 仍在仓库内，调用不存在的 `getGroupDetail` 云函数 |
| `pages/community-group/my-group/index` | **老版“我的开团”页** | 完全基于 `mock/myGroup.js`，不是当前主链 |
| `pages/dev-refund-test/dev-refund-test` | **开发测试页** | 专门用于退款链回归 |

---

## 4. 当前真正的主链路

### 4.1 普通服务下单主链

`首页 -> 服务详情 -> 下单页 -> unifiedOrder -> 微信支付 -> 支付成功页 -> 订单详情页`

当前实现：

- `pages/detail/detail.js` 负责服务展示与跳转
- `pages/checkout/checkout.js` 负责表单、价格计算、云端统一下单
- `cloudfunctions/unifiedOrder` 负责：
  - 服务端价格校验
  - 创建 `service_orders`
  - 触发 CloudPay 统一下单
  - 如果是拼团订单，顺带同步 `groups.members`
- `pages/payment-success/payment-success.js` 负责：
  - 如果已带 `orderId`，优先拉云端 `getOrderDetail`
  - 否则用 `checkoutDraftV2` 调 `createOrderAfterPayment`
  - 保存邀约关系 `saveInviteRelation`
- `pages/order-detail/order-detail.js` 负责：
  - 云端读取订单详情 `getOrderDetail`
  - 本地 fallback
  - 文档流、退款、拼团信息、预约入口承接

### 4.2 邻里拼团主链

`首页 / 我的 / 规则页 -> group-buy -> createGroup / getReferralStats / generateGroupQR -> 小程序码 or 分享链接 -> group-landing -> checkout(带团购身份) -> payment-success -> order-detail -> 回 group-buy 我的开团`

当前实现要点：

- 拼团主页面：`pages/group-buy/group-buy`
- 开团码统一落地页：`pages/group-landing/group-landing`
- 分享路径统一为：`/pages/group-landing/group-landing?...`
- 扫码场景统一为：
  - `page = pages/group-landing/group-landing`
  - `scene = s=<shortCode>`
  - 通过 `invite_shortcuts` 反查真实 `groupId`
- 下单页承接的团购参数：
  - `groupId`
  - `groupMode=community_group`
  - `groupDiscountPerSqm`
  - `communityName`
  - `entryFrom=group_buy`
  - `productType`

### 4.3 退款主链

`订单详情 -> 退款申请页 -> applyRefund -> 返回订单详情`

当前实现：

- `pages/order-detail/order-detail.js` 会根据服务日期计算 72h 可退款窗口
- `pages/refund-apply/refund-apply.js` 调 `cloudfunctions/applyRefund`
- 云函数会校验：
  - `orderId`
  - 退款原因
  - 订单状态是否在白名单
  - 是否超过开工前 72 小时
- 成功后更新云端 `service_orders.status = 退款处理中`

### 4.4 文档确认主链

`订单详情 -> scheme-book -> final-book -> 返回订单详情`

当前实现：

- `scheme-book` 负责勘查结果确认
- `final-book` 负责承诺书确认/查看
- 主存储基线已收口到 `orderId`
- 本地仍保留 docFlow 兼容读写
- 云端通过 `saveDocFlow` 同步 `service_orders.docFlow`

### 4.5 钱包/返现主链

当前是“半真实、半本地”的混合状态：

- 钱包余额、提现记录：接云端
  - `getWalletBalance`
  - `requestWithdrawal`
- 邀约返现和团购返现：
  - 邀约返现：`paymentCallback` 里给 `wallets` 发钱
  - 团购返现：`manageGroup.settleGroup()` 给 `wallets` 发钱
- 但福利中心页本身的模式卡、邀请户演示数据仍然偏 mock

---

## 5. 页面当前职责与数据来源

### 5.1 `pages/index/index`

- 角色：首页
- 内容：品牌区、服务入口、案例、评价、社区团购 Hero、自绘底部导航
- 数据来源：页面内静态数组 + `utils/reviews-data.js`
- 现状：纯前台展示，路由分发正常

### 5.2 `pages/detail/detail`

- 角色：服务详情页
- 重点：
  - 服务说明
  - 省钱方式
  - 团购/邀约提示
  - 进入 checkout
- 数据来源：页面内静态数据 + `order-context` 的邀请上下文
- 现状：主链页面，内容很重，业务跳转稳定

### 5.3 `pages/checkout/checkout`

- 角色：下单页
- 能力：
  - 解析房号、日期、面积
  - 价格计算
  - 承接邀约和团购身份
  - 触发 `unifiedOrder`
  - 调 `wx.requestPayment`
- 数据来源：
  - URL 参数
  - `order-context` 中的 active invite context
  - 云函数 `resolveInviteToken`, `unifiedOrder`
- 现状：主下单入口，已不再是纯 mock

### 5.4 `pages/payment-success/payment-success`

- 角色：支付成功承接页
- 能力：
  - 读取真实订单
  - 必要时补建订单
  - 处理邀约关系
  - 团购订单展示“查看我的开团进度”
- 数据来源：
  - `getOrderDetail`
  - `createOrderAfterPayment`
  - `ensureInviteProfile`
  - 本地 `order-context`
- 现状：主链页面

### 5.5 `pages/order-detail/order-detail`

- 角色：订单详情页，项目里最重的业务页之一
- 能力：
  - 云端订单加载
  - 单次开荒/守护计划进度展示
  - 文档流 CTA
  - 退款 CTA / 退款状态
  - 团购身份展示
  - 返回“我的开团”
  - 预约/改期入口
- 数据来源：
  - `getOrderDetail`
  - 本地缓存 fallback
  - `order-context` 文档存储
- 现状：主链页面，逻辑最复杂

### 5.6 `pages/mine/mine`

- 角色：我的页
- 能力：
  - 用户主卡
  - 钱包入口
  - 我的订单
  - 4 个服务节点卡
  - 进入团购/团长权益
- 数据来源：
  - `listMyOrders`
  - `getWalletBalance`
  - `getReferralStats`
  - 本地 `order-context`
  - 开发态 storage：`devDemoPlanEnabled` / `mockDemoMainPlan`
- 现状：
  - 主页面
  - 页面规模很大
  - 订单列表和服务节点逻辑已经收敛，但仍留有 dev 演示入口

### 5.7 `pages/group-buy/group-buy`

- 角色：社区团购核心页
- 页签：
  - 开团规则
  - 我的开团
  - 团长权益
- 能力：
  - 读取云端 active 团 `getReferralStats`
  - 发起团 `createGroup`
  - 查看开团码 `generateGroupQR`
  - 分享路径统一到 `group-landing`
- 数据来源：
  - 云端为主
  - 少量本地兜底
- 现状：
  - 当前拼团主页面
  - 但文件里还保留一部分开发态 debug 辅助函数和旧兼容逻辑

### 5.8 `pages/group-landing/group-landing`

- 角色：邻里拼团统一落地页
- 支持入口：
  - `options.scene`
  - `options.groupId`
- 能力：
  - `scene=s=<shortCode>` 解析
  - 通过 `manageGroup(action=resolveShortCode)` 反查 `groupId`
  - 再 `manageGroup(action=query)` 拉团数据
  - 选择服务后带团购身份进入 checkout
- 现状：
  - 当前扫码/分享统一入口
  - 是主链，不是旧表单页

### 5.9 `pages/group-invite/group-invite`

- 角色：旧邀约/旧拼团并存页
- 现状判断：
  - **不是当前 group buy 主链页面**
  - 仍然被 `payment-success`、`order-detail`、`checkout` 等页面引用
  - 内部已经加了重定向逻辑，尽量把 group buy 入口导去 `group-landing`
  - 仍承担一部分“邀约返现/普通转介绍”旧逻辑

### 5.10 `pages/group-create` / `pages/group-detail` / `pages/community-group/my-group`

- 这 3 组页面都属于**老拼团实现残留**
- 不能当成当前主链
- 尤其：
  - `pages/community-group/my-group/index` 完全读 `mock/myGroup.js`
  - `pages/group-detail/group-detail.js` 调用不存在的 `getGroupDetail`

### 5.11 `pages/welfare-center` / `pages/coupon-list` / `pages/gift-service`

- `welfare-center`：
  - 福利中心页面完整
  - 返现模式卡和邀请户数据偏 mock
  - 只读引用 `myCoupons` / `giftServiceCards`
- `coupon-list`：
  - 完全本地 storage 驱动
  - 会往 `myOrders` 写 `coupon_booking`
- `gift-service`：
  - 完全本地 storage 驱动
  - 会往 `myOrders` 写 `gift_service_booking`

### 5.12 `pages/dev-refund-test`

- 开发专用测试页
- 作用：
  - 注入 3 个 mock 订单
  - 跳转订单详情验证退款三场景
  - 清理本地测试订单
- 当前已经实测可用

---

## 6. 本地存储与前端状态契约

### 6.1 订单主存储（`utils/order-context.js`）

核心 key：

- `serviceOrdersV2`
- `checkoutDraftV2`
- `currentOrderIdV2`
- `currentUserV2`
- `activeInviteContextV2`
- `inviteProfileV2`
- `paymentCreateRefV2`
- `serviceOrdersV2Migrated`

文档流 key：

- `docFlowStateV2_{orderId}`
- `docConfirmDataV2_{orderId}`
- `docFinalSnapshotV2_{orderId}`
- `docFinalPdfV2_{orderId}`

### 6.2 其他本地存储

- `myCoupons`：优惠券
- `myOrders`：优惠券预约单、赠送服务预约单
- `giftServiceCards`：赠送服务权益卡
- `welfareRebatePrefs`：福利中心返现偏好
- `logs`：基础日志
- `devDemoPlanEnabled` / `mockDemoMainPlan`：mine 页开发演示控制

### 6.3 当前前端状态分层

可以理解成三层：

1. **云端真实状态**
   - `service_orders`
   - `groups`
   - `invite_profiles`
   - `wallets`
2. **本地业务缓存**
   - `order-context` 维护的订单/当前用户/当前邀请上下文
3. **本地权益 mock**
   - `myCoupons`
   - `giftServiceCards`
   - `myOrders`
   - 福利中心偏好与演示数据

---

## 7. 云函数与后端职责

### 7.1 订单相关

| 云函数 | 作用 |
|---|---|
| `unifiedOrder` | 服务端校验价格，创建订单，发起 CloudPay，下发支付参数 |
| `paymentCallback` | 支付回调，更新订单状态，处理邀约返现 |
| `createOrderAfterPayment` | 支付成功后按 draft 补建订单 |
| `getOrderDetail` | 查询单个订单详情 |
| `listMyOrders` | 查询当前用户订单列表 |
| `saveOrderSchedule` | 保存预约节点结果 |
| `saveDocFlow` | 保存文档流状态 |
| `applyRefund` | 提交退款申请 |

### 7.2 拼团相关

| 云函数 | 作用 |
|---|---|
| `createGroup` | 创建/复用邻里团，生成真实 groupId，并尝试产出小程序码 |
| `generateGroupQR` | 已有团重新生成小程序码 |
| `getReferralStats` | 读取当前用户团长等级、返现、active 团、成员状态 |
| `manageGroup` | 老拼团管理函数，支持 `create/join/query/resolveShortCode` |

### 7.3 邀约相关

| 云函数 | 作用 |
|---|---|
| `getOpenId` | 获取真实 OPENID |
| `ensureInviteProfile` | 确保当前用户有 invite profile |
| `resolveInviteToken` | 短码或 token -> 邀约上下文 |
| `generateInviteQR` | 生成邀约二维码 |
| `saveInviteRelation` | 保存邀约关系 |

### 7.4 钱包相关

| 云函数 | 作用 |
|---|---|
| `getWalletBalance` | 查询钱包余额与提现记录 |
| `requestWithdrawal` | 提交提现申请 |

### 7.5 当前云数据库集合

- `service_orders`
- `groups`
- `invite_profiles`
- `invite_relations`
- `invite_shortcuts`
- `wallets`
- `withdrawal_records`

### 7.6 小程序码相关权限

这几个云函数目录下已存在 `config.json` 并声明 `wxacode.getUnlimited`：

- `cloudfunctions/createGroup/config.json`
- `cloudfunctions/generateGroupQR/config.json`
- `cloudfunctions/generateInviteQR/config.json`

---

## 8. 当前拼团链的真实情况

### 8.1 已经收口到新链的部分

- 主拼团入口是 `pages/group-buy/group-buy`
- 扫码/分享统一落地到 `pages/group-landing/group-landing`
- 小程序码 `page` 已固定为 `pages/group-landing/group-landing`
- `scene` 已从长 `groupId` 改为短码 `s=<shortCode>`
- `invite_shortcuts` 用于 `shortCode -> groupId`
- `group-landing -> checkout` 会带完整团购身份参数

### 8.2 仍保留的旧拼团资产

- `pages/group-invite/group-invite`
- `pages/group-create/group-create`
- `pages/group-detail/group-detail`
- `pages/community-group/my-group/index`
- `mock/myGroup.js`

### 8.3 对新 GPT 的提醒

如果你要继续拼团开发，**第一优先级应该看 `group-buy + group-landing + createGroup/generateGroupQR/getReferralStats/manageGroup`**，而不是先看 `group-detail` 或 `community-group/my-group`。

---

## 9. 当前哪些模块是真实的，哪些仍然是 mock / 混合态

### 9.1 已经接入云端/真实业务的模块

- 获取真实 `openId`
- 普通下单
- 微信支付
- 支付成功承接
- 云端订单详情
- 退款申请
- 邀约关系写入
- 邻里拼团主链
- 钱包余额与提现申请

### 9.2 仍明显依赖本地 storage / mock 的模块

- 优惠券体系
- 赠送服务体系
- 福利中心返现模式卡与邀请户演示数据
- 老版社区团购页 `community-group/my-group`
- `group-create` / `group-detail`
- 部分 `group-landing` / `group-buy` 的 mock fallback
- `dev-refund-test`

### 9.3 云端 + 本地混合模块

- `mine`：云端订单 + 本地 order-context + 开发演示开关
- `order-detail`：优先云端，失败时本地 fallback
- `payment-success`：云端为主，本地 draft 兜底
- 文档链：本地 docFlow + 云端 saveDocFlow 并行

---

## 10. 当前明确能看到的遗留问题 / 风险点

下面这些不是推测，是从当前仓库直接扫出来的现实情况：

### 10.1 旧文档已经过时

`docs/audit/phase-through-audit-summary.md`、`docs/audit/order-mainflow-audit.md` 等较早文档里写着“没有云函数 / 没有支付 / 纯前端 mock”，**这些结论现在已经过时**。  
新账号不要再以这些旧审计结论作为当前事实。

### 10.2 仍有页面在跳旧的 `group-invite`

这些地方仍然引用 `pages/group-invite/group-invite`：

- `pages/payment-success/payment-success.js`
- `pages/order-detail/order-detail.js`
- `pages/checkout/checkout.js`

它们不一定都会直接落到旧表单页，因为 `group-invite` 内部已经有重定向逻辑，但从代码资产上看，**旧入口没有被完全删除。**

### 10.3 `group-buy` 仍引用不存在的 `leader-detail`

`pages/group-buy/group-buy.js` 里有：

- `/pages/leader-detail/leader-detail?tier=...`

但当前仓库没有这个页面，也没在 `app.json` 注册。  
这意味着“团长权益详情”如果继续点深，很可能是断路。

### 10.4 `group-detail` 调用不存在的 `getGroupDetail`

`pages/group-detail/group-detail.js` 里调用了 `getGroupDetail`，但 `cloudfunctions/` 里没有这个函数。  
这说明该页属于老实现残留。

### 10.5 `withdraw` 页和 `listMyOrders` 返回字段不一致

- `withdraw.js` 里读取的是 `res.result.orders`
- `cloudfunctions/listMyOrders` 实际返回的是 `list`

这会导致提现页里的退款订单列表大概率拿不到数据。  
这是明确的字段错配。

### 10.6 顶部固定栏与 AGENTS 要求不完全一致

- AGENTS 要求：顶部/底部固定栏不要透明
- 现状：`app.wxss` 的 `global-top-bar` 是半透明白底

### 10.7 项目工作树当前不是“干净已提交”状态

`git status --short` 显示整个仓库文件都是未跟踪状态。  
这不影响你读代码，但意味着：

- 不能通过 git 历史可靠判断“最后一次谁改了什么”
- 新账号接手时最好先单独生成一版 handoff 说明或快照

---

## 11. 现有仓库里最该优先看的文件

如果另一个 GPT 要快速接手，推荐阅读顺序：

1. `app.js`
2. `app.json`
3. `utils/order-context.js`
4. `pages/index/index.js`
5. `pages/detail/detail.js`
6. `pages/checkout/checkout.js`
7. `pages/payment-success/payment-success.js`
8. `pages/order-detail/order-detail.js`
9. `pages/mine/mine.js`
10. `pages/group-buy/group-buy.js`
11. `pages/group-landing/group-landing.js`
12. `cloudfunctions/unifiedOrder/index.js`
13. `cloudfunctions/createOrderAfterPayment/index.js`
14. `cloudfunctions/getOrderDetail/index.js`
15. `cloudfunctions/createGroup/index.js`
16. `cloudfunctions/generateGroupQR/index.js`
17. `cloudfunctions/getReferralStats/index.js`
18. `cloudfunctions/manageGroup/index.js`
19. `pages/refund-apply/refund-apply.js`
20. `cloudfunctions/applyRefund/index.js`

如果要继续看权益链，再补：

21. `pages/welfare-center/welfare-center.js`
22. `pages/coupon-list/coupon-list.js`
23. `pages/gift-service/gift-service.js`
24. `pages/withdraw/withdraw.js`
25. `cloudfunctions/getWalletBalance/index.js`
26. `cloudfunctions/requestWithdrawal/index.js`

---

## 12. 给新 GPT 的一句话判断

这个项目当前已经进入“**主链真实化、边链未完全收口**”阶段。

更准确地说：

- **订单下单、支付、订单详情、退款、邻里拼团主链已经基本是真实云端链路。**
- **权益、福利、部分旧拼团页面、部分历史路由仍然混着 storage/mock/老代码。**
- **接手时不要全仓平均看待，而要先分清“当前主链”和“旧并存资产”。**

---

## 13. 本文档与旧审计文档的关系

建议把本文档当作当前版本的总入口说明。  
仓库里旧的 `docs/audit/*` 可以作为“历史问题背景”参考，但不应直接拿来代表现在。

如果需要继续向下拆，可以在本文档基础上再分别补：

- 当前主链页面矩阵
- 云函数字段契约表
- 拼团短码/scene/二维码链路图
- 订单状态与文档状态机

