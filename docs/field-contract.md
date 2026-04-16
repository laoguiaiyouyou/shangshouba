# 字段契约与状态口径总表

> **用途**：前后端联调、页面继续开发、状态统一的参考基线。  
> **性质**：当前前端契约基线，**不是**最终后端接口文档、**不是**数据库设计文档。  
> **范围**：字段名与状态口径以**现有小程序实现**为准；后续变更应同步修订本文档。

---

## 1. 核心实体

### 1.1 普通服务订单（ServiceOrder）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | `App.globalData.orderList`（`app.js` 种子数据 + `pages/mine/mine.js` 内 `syncOrderList` 维护） |
| **与其他实体关系** | 通过 URL 参数进入 `order-detail`；与 **DocFlowState** 通过 `flowKey`（订单维度）关联；与 **返现** 中「本人有效订单」判断预留关联 |
| **已实现程度** | 列表展示、详情、退款态、主计划选取、四节点预约区、跳转 scheme-book / final-book 的入口均在 order-detail 侧串联 |
| **预留口径** | 稳定 `orderId`、房屋维度 `houseId`/`projectId` 仍以注释形式为长期方案；`gift_service_booking` 未并入本列表 |

### 1.2 优惠券预约单（CouponBookingOrder）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | `wx.getStorageSync('myOrders')` 数组内 `orderType === 'coupon_booking'` 的记录 |
| **与其他实体关系** | 强依赖 **Coupon**（`couponId`）；在 **mine** 与 `orderList` **拼接展示**，不覆盖普通订单流 |
| **已实现程度** | 写入（coupon-list 下单）、列表合并、独立 `status`（如 `pending_contact`）；order-detail 支持带参进入简版详情（若路由已接） |
| **预留口径** | 与后端的预约单 ID、客服回拨状态机、与券状态回写的一致性 |

### 1.3 优惠券（Coupon）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | `wx.getStorageSync('myCoupons')`（`coupon-list` 读写） |
| **与其他实体关系** | 提交预约后写 **CouponBookingOrder** 至 `myOrders`，并将券置为 `locked` |
| **已实现程度** | 五态枚举、列表 Tab 计数、下单预约与 myOrders 联动 |
| **预留口径** | 与 welfare-center 展示数字的**真实对齐**（见第 6、8 章及文末约束） |

### 1.4 赠送服务权益卡（GiftServiceCard）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | `wx.getStorageSync('giftServiceCards')`（`gift-service` 页） |
| **与其他实体关系** | **当前未**作为 `orderType` 并入 mine 订单列表；与 welfare 入口数字可能不一致（mock） |
| **已实现程度** | 五态、预约配置、预约结果字段、链上 claimId 引导建卡 |
| **预留口径** | **`gift_service_booking` 进订单体系统一展示**（见文末约束 4） |

### 1.5 返现偏好与邀请记录（Rebate / Referral）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | 偏好：`wx.getStorageSync('welfareRebatePrefs')`；邀请列表与金额试算当前主要在 `welfare-center.js` **内存 mock** |
| **与其他实体关系** | 与 **ServiceOrder** 的「有效单 / 实付」判断预留；与 mine **可提现展示**（`mockWithdrawAmount` 等）可能分离 |
| **已实现程度** | 1户/3户/10户选择写入 prefs、模式互斥与并行规则、可提现/待激活试算结构 |
| **预留口径** | 邀请记录、激活条件、提现流水全部接后端 |

### 1.6 确认链文档态（DocFlowState）

| 项 | 说明 |
|----|------|
| **主要来源 / 存储** | 主：`schemeFlow_${flowKey}`；兼容读：`schemeStatus_${flowKey}`；确认数据：`schemeConfirmData_${...}`；快照：`finalBookSnapshot_${...}`；PDF：`finalBookPdf_${flowKey}` |
| **与其他实体关系** | **flowKey** 由订单维度字段拼接：`orderName_communityName_roomNo_serviceDate`（与 order-detail / scheme-book / final-book 一致） |
| **已实现程度** | scheme-book 写 `confirm_book` 与 confirm 数据；final-book 写 `final` 与快照；order-detail 读 doc 驱动 CTA |
| **预留口径** | 仅兼容键逐步废弃策略（见文末约束 2） |

---

## 2. 最小字段集合

字段名为**建议统一使用的逻辑名**；括号内为代码中常见别名。

### 2.1 订单（ServiceOrder + 列表展示行）

| 字段 | 说明 |
|------|------|
| `orderId` | 稳定订单 ID（可选；现状多靠组合键） |
| `orderType` | 订单类型：`service`（默认）/ `coupon_booking` /（预留）`gift_service_booking` |
| `name` | 服务名称 / 券预约标题 |
| `sub` | 列表副文案（面积·日期等） |
| `status` | **原始业务状态**（rawStatus） |
| `displayStatus` | **列表/详情展示状态**（由映射表得到） |
| `communityName` | 小区 |
| `roomNo` | 房号 |
| `serviceDate` | 服务日，建议统一 `YYYY-MM-DD` |
| `productType` | `haokang` / `hujin` / `360` |
| `packageFlowType` | `full` / `no_dust` / `single` / `legacy`（legacy 在 order-detail 中等同 full 处理） |
| `totalPrice` / `grossPrice` / 优惠字段 | 金额展示与计算 |
| `inviteCode` / `isUpgraded` / `upgradePrice` | 邀请与升级单 |

**CouponBookingOrder（myOrders 内）最小补充：**

| 字段 | 说明 |
|------|------|
| `id` | 预约单记录 ID |
| `orderType` | 固定 `coupon_booking` |
| `couponId` | 关联券 |
| `title` | 展示标题 |
| `status` | 如 `pending_contact` |
| `statusText` | 右侧状态文案 |
| `subText` | 副文案（券说明等） |
| `createdAt` | 创建时间 |

**CouponBookingOrder.status 当前最小值域**

| 状态值 | 含义 |
|--------|------|
| `pending_contact` | 待联系确认 |
| `confirmed` | 已确认（预留） |
| `scheduled` | 已预约（预留） |
| `done` | 已完成（预留） |
| `cancelled` | 已取消（预留） |

### 2.2 优惠券（Coupon）

| 字段 | 说明 |
|------|------|
| `couponId` | 唯一标识 |
| `couponTitle` | 券名称 |
| `benefitText` | 权益摘要（如面额） |
| `thresholdText` | 门槛 |
| `scopeText` | 适用范围 |
| `sourceText` | 来源 |
| `expireAt` | 过期日期展示 |
| `status` | 见 §3.2（五态） |
| `actionText` / `actionType` | 列表按钮展示（派生） |

### 2.3 赠送服务（GiftServiceCard）

| 字段 | 说明 |
|------|------|
| `id` | 卡 ID |
| `title` / 名称类字段 | 权益名称 |
| `status` | 见 §3.3 |
| `sourceText` / `ruleText` | 来源与规则说明 |
| `needBooking` | 是否需要预约 |
| `minAdvanceDays` | 最少提前天数 |
| `bookingType` | `morning_afternoon` / `contact_service` |
| `bookingHint` | 预约提示 |
| `bookedDate` / `bookedSlot` | 预约结果（上午/下午） |
| `expired` | 布尔，与 `status===expired` 可能并存（兼容） |

### 2.4 返现（偏好 + 邀请行）

| 字段 | 说明 |
|------|------|
| `cashModeSelected` | `'1'` \| `'3'` \| `null`（现金线二选一） |
| `tenModeSelected` | boolean（10 户线，可与现金线并行） |
| `cashModeSettled` / `tenModeSettled` | 预留：是否已核销/落定 |
| `voucherUsed` | 迁移用旧结构，逐步归并到上述字段 |
| **邀请行（Referral，当前 mock）** | `id`, `name`, `orderStatus`, `amount`, `activated`, `withdrawn` 等 |

### 2.5 文档链（存储维度）

| 字段/键 | 说明 |
|---------|------|
| `flowKey` | `orderName_communityName_roomNo_serviceDate` 拼接 |
| `schemeFlow_${flowKey}` | 文档流主状态（见 §3.5） |
| `schemeConfirmData_${...}` | scheme-book 提交的确认项 JSON |
| `finalBookSnapshot_${...}` | final-book 冻结快照（含 `schemaVersion`） |
| `finalBookPdf_${flowKey}` | 正式 PDF URL 或标记 |

**flowKey 组成**（与现实现一致）：`orderName_communityName_roomNo_serviceDate`（与 order-detail / scheme-book / final-book 一致）

**说明**：当前 `flowKey` 仅为前端阶段性的拼接方案；后续应由更稳定的主键（如 `orderId + houseId/projectId`）替代，避免因名称、地址、日期格式变化导致键不稳定。

---

## 3. 状态枚举

### 3.1 订单状态

**原始业务状态（raw / `status`）**  
示例（非穷举，以代码与种子数据为准）：  
`待服务`、`藏灰处理中`、`待勘查`、`勘察完工`、`待深处理`、`深处理中`、`待备住除尘`、`待回访清洁`、`已交付`、`已完成`、`服务中`、`退款处理中`、`已退款` 等。

**页面展示状态（`displayStatus`）**  
与 `mine.normalizeListStatus` / `order-detail.normalizeDisplayStatus` **一致**：

| raw | display |
|-----|---------|
| 服务中 | 深处理中 |
| 勘察完工 | 待深处理 |
| 已完成 | 已交付 |
| 其他 | 原样 |

**说明**：列表 chip、详情 chip 应以 **`displayStatus`** 为主展示；**退款流**单独用 `isRefundFlow` 等分支。

**说明**：`displayStatus` 仅作为页面展示口径，由 `status/rawStatus` 派生得到；**不作为长期存储真值**，避免与原始业务状态形成双真相。

**coupon_booking**：`status` 如 `pending_contact`；列表另有 `displayStatus`/`statusText`（如「待联系确认」），**不完全走**上表 service 映射。

### 3.2 优惠券状态（Coupon）

逻辑值（与 `coupon-list` 常量一致）：

| 值 | 含义 |
|----|------|
| `available` | 可用 |
| `expiring_soon` | 即将过期 |
| `locked` | 已提交预约（占用中） |
| `used` | 已使用 |
| `expired` | 已失效 |

列表上的中文 `statusText`、按钮 `btnText` 为**展示派生**，不替代存储枚举值。

### 3.3 赠送服务状态（GiftServiceCard）

| 值 | 含义 |
|----|------|
| `pending_claim` | 待领取 |
| `pending_book` | 待预约 |
| `booked` | 已预约 |
| `used` | 已使用 |
| `expired` | 已过期 |

### 3.4 返现模式与返现资金态

**模式（偏好层，非订单状态）**

- 现金返现：`cashModeSelected === '1'` 与 `'3'` **互斥**。
- 10 户线：`tenModeSelected === true`，可与现金线**同时选定**。

**资金态（展示计算结果）**

- `withdrawableBalance`：当前规则下可提现金额。
- `pendingActivateAmount`：待激活返现金额。
- `availableActivatedCount`：已达激活条件的邀请户数等（随 mock/真实数据变化）。

**模式卡 UI 态**（welfare 内部）：如 `selected` / `mutex` / `unselected` / `settled`，属**界面状态**，与后端枚举需单独映射表。

### 3.5 文档链状态（docStatus，存 `schemeFlow_*`）

| 值 | 含义（前端约定） |
|----|------------------|
| 空 | 未进入或默认 |
| `confirm_result` | 待确认勘查结果（可进 scheme-book） |
| `confirm_book` | 勘查已确认，待确认承诺书（可进 final-book） |
| `final` | 承诺书已定稿，order-detail 走最终承诺书只读链 |

### 3.6 进度条状态口径

**order-detail**

- **精细开荒（`productType===haokang`）**：节点固定为  
  `待服务 → 待勘查 → 待深处理 → 深处理中 → 已交付`；由 **`orderStatus`（及别名映射）→ 当前步骤索引** 驱动高亮。
- **入住守护 / 360（非 haokang）**：**5+4 蛇形**节点；仍由 **`orderStatus`** 与各节点规则决定 done/active。

**mine**

- **四节点预约区**：来自主计划 `computeBookingNodes`，语义为**履约预约节点**，**不是** order-detail 蛇形进度条的同一套映射表。

**区分**：**订单服务进度** 以 order-detail 为准；**mine 预约节点** 以主计划 + bookingNodes 为准——**分层，禁止混为一张状态机**。

---

## 4. 状态流转关系

### 4.1 普通订单（业务态 + 文档流）

- 业务 `status` 按履约推进（待服务 → … → 已交付等），与 **docStatus** 并行。
- **待勘查阶段**：用户可在 order-detail 引导下进入 **scheme-book**；确认后 `schemeFlow` → `confirm_book`。
- **confirm_book 阶段**：进入 **final-book**；确认后 `schemeFlow` → `final`，并写入 **finalBookSnapshot**。
- 部分前端逻辑在 `docStatus===final` 时会把展示态从待勘查链**升级到** `待深处理`（以 order-detail 实现为准）。

### 4.2 coupon_booking

- 用户在 coupon-list 提交预约 → **新增** `myOrders` 记录 + 券 `status` → `locked`。
- 预约单 `status` 如保持 `pending_contact`，直至业务侧推进（后续接后端）。

### 4.3 优惠券

- `available` / `expiring_soon` →（提交预约）→ `locked` →（履约完成后业务定义）→ `used` 或超时 → `expired`。

### 4.4 赠送服务

- `pending_claim` →（领取）→ `pending_book` →（预约成功）→ `booked` →（服务完成）→ `used`；任一路径可因规则 → `expired`（及 `expired:true` 兼容）。

### 4.5 返现：模式 / 激活 / 可提现

- 用户选定 **1户或3户**（写 prefs）→ 邀请记录满足 **`activated` 等条件** → 金额计入 **可提现**；未满足前计入 **待激活**。
- **10户线** 独立计数与条件；可与现金线并行。

### 4.6 scheme-book / final-book 文档流

- scheme-book 确认无异议：写 **schemeConfirmData**；**schemeFlow** → `confirm_book`。
- final-book 最终确认：写 **finalBookSnapshot**；**schemeFlow** → `final`。
- **需要沟通**：仅弹窗，**不写**上述 storage、**不推进** docStatus。

---

## 5. 页面消费关系

### 5.1 mine

| 依赖 | 说明 |
|------|------|
| **ServiceOrder** | `orderList`、`displayStatus` 映射、`goOrderDetail` 传参 |
| **CouponBookingOrder** | `myOrders` 合并进 `orderDisplayList`；`orderType`、`status`、`displayStatus`/`statusText` |
| **主计划 / 预约四节点** | `getCurrentEffectivePlan`、`computeBookingNodes`；**进度语义独立于 order-detail 蛇形** |
| **提现展示** | `mockWithdrawAmount` 等（**与 welfare 试算可能未打通**） |

**已统一**：普通单 `displayStatus` 与 order-detail 映射一致。  
**临时 mock**：演示主计划、部分提现、welfare 数字若未读真实 storage。

### 5.2 welfare-center

| 依赖 | 说明 |
|------|------|
| **Rebate prefs** | `welfareRebatePrefs` |
| **试算** | `referrals`、`withdrawableBalance`、`pendingActivateAmount`（**当前多为内存 mock**） |
| **入口数字** | `giftServiceCount`、`couponAvailable` 等（**常为写死 mock，未读 giftServiceCards / myCoupons**） |

**已统一**： prefs 读写与模式互斥/并行规则。  
**临时 mock**：邀请列表与福利区计数与真实券/赠送卡**未强制一致**。

### 5.3 coupon-list

| 依赖 | 说明 |
|------|------|
| **Coupon** | `myCoupons`、五态枚举 |
| **CouponBookingOrder** | 写 `myOrders`、券变 `locked` |

**已统一**：券状态枚举与展示文案在同一页内闭环。

### 5.4 gift-service

| 依赖 | 说明 |
|------|------|
| **GiftServiceCard** | `giftServiceCards`、五态、预约配置 |

**已统一**：卡状态与 `_normalizeCard` 默认字段。

### 5.5 order-detail

| 依赖 | 说明 |
|------|------|
| **ServiceOrder** | query + 展示字段；`productType`→`isHaokang`；蛇形进度 |
| **DocFlowState** | `schemeFlow_${getDocFlowKey()}`，兼容 `schemeStatus_*` |
| **CouponBookingOrder** | `detailLayout` 简版（若已接路由） |
| **PDF** | `finalBookPdf_*` |

**已统一**：精细/守护进度拆分；展示态映射与 mine 一致。

### 5.6 scheme-book

| 依赖 | 说明 |
|------|------|
| **确认项** | 本地 state + 提交写 **schemeConfirmData**、推进 **schemeFlow** |

**已统一**：与 order-detail 使用同一 flowKey 维度字段。

### 5.7 final-book

| 依赖 | 说明 |
|------|------|
| **schemeConfirmData** | 确认态读入生成现场摘要 |
| **finalBookSnapshot** | 确认后写入 |
| **schemeFlow** | 确认后 `final` |

**已统一**：快照 `schemaVersion` 与字段分区约定。

---

## 6. 当前冲突与风险

### 6.1 welfare-center 的 mock 口径问题

- **问题**：邀请列表、可提现/待激活试算外的 **gift/coupon 数量** 等仍为 mock，与 `gift-service`、`coupon-list`、`myOrders` **未绑定同一数据源**。  
- **建议收口**：福利区所有对外数字统一从 **myCoupons / giftServiceCards / myOrders / 后端接口** 计算，禁止长期各算各的。

### 6.2 schemeFlow_* 与 schemeStatus_* 双键问题

- **问题**：order-detail 读文档态时 **优先 `schemeFlow_`，兜底 `schemeStatus_`**，存在**双真相**风险。  
- **建议收口**：**以 `schemeFlow_*` 为唯一写入主键**；`schemeStatus_*` **仅兼容旧数据读取**，不再新增写入（见文末约束 2）。

### 6.3 coupon_booking 复用 refunding 样式类

- **问题**：mine 列表为券预约行使用 `statusClass: 'refunding'`，**语义上与退款混淆**。  
- **建议收口**：新增独立样式类名（如 `pending-contact`），**不再复用 refunding 语义类**（见文末约束 3）。

### 6.4 gift_service_booking 仍未接入订单体系

- **问题**：文档与产品上可预留 **gift_service_booking**，但 **mine 订单列表当前仅合并 coupon_booking**，赠送卡只在 gift-service 管理。  
- **建议收口**：**下一阶段**将赠送履约单纳入 `orderDisplayList` 与统一 `orderType`（见文末约束 4）。

### 6.5 progress 在 mine 与 order-detail 分层

- **问题**：同名「进度」在用户心智易混：**mine 四节点** vs **order-detail 蛇形**。  
- **建议收口**：产品文案与文档统一称「预约节点」vs「服务进度」；**不合并为单一状态机表**。

---

## 7. 建议优先冻结的字段

联后端前建议优先冻结（契约稳定后再改成本高）：

| 类别 | 字段 / 状态 |
|------|-------------|
| 订单 | `orderId`、`orderType`、`status`（raw）、`displayStatus`（映射表由一处维护） |
| 产品 / 套餐 | `productType`、`packageFlowType` |
| 房屋 / 时间 | `communityName`、`roomNo`、`serviceDate`（格式） |
| 优惠券 | `couponId`、`status`（五态） |
| 赠送服务 | `cardId`/`id`、`status`（五态）、`needBooking`、`bookingType`、`minAdvanceDays`、`bookedDate`、`bookedSlot` |
| 返现 | `cashModeSelected`、`tenModeSelected`、邀请记录达标字段、提现流水 id |
| 文档链 | `docStatus`（`schemeFlow` 值域）、`schemeConfirmData` 结构、`finalBookSnapshot.schemaVersion` 与分区字段 |
| 预约单 | `coupon_booking.id`、`couponId`、`status` |

---

## 8. 当前实现边界说明

1. **已进入订单体系统一展示（mine）的**：**`coupon_booking`**（来自 `myOrders`，与 `orderList` 拼接）。  
2. **`gift_service_booking`**：**仅为预留口径**，**尚未**接入 mine 订单列表；赠送服务以 **`giftServiceCards`** 为准。  
3. **部分页面仍有 mock**：尤其 **welfare-center** 的邀请与部分计数；**不应视为与真实 storage 一致**。  
4. **本文档**：描述的是 **当前前端契约基线**；后端接口命名、分页、鉴权以联调时 **对接说明** 为准，**不替代** OpenAPI/接口文档。

---

## 9. 文档级约束（后续开发必须遵守）

1. **welfare-center** 中仍由 mock 计算的数字，后续必须**统一切到真实数据源**，不允许长期与 **coupon-list / gift-service / myOrders** 各算各的。  
2. **`schemeFlow_*` 作为文档流主键**；**`schemeStatus_*` 只做兼容读取**，**不再新增写入**。  
3. **`coupon_booking` 列表展示**后续**不得再复用 `refunding` 语义样式类**；应使用独立语义类名。  
4. **`gift_service_booking` 明确为「下一阶段接入订单体系」**；**当前未实现**，不得与已实现行为混写为「已上线」。

---

## 文档结构自检

本文档包含章节：**标题总表、1 核心实体、2 最小字段集合、3 状态枚举、4 状态流转、5 页面消费、6 冲突与风险、7 冻结字段、8 实现边界、9 文档级约束**，满足「字段契约与状态口径」唯一参考用途；**未包含**数据库表结构、SQL、后端错误码等与前端契约无关内容。
