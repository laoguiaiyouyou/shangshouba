# PHASE2A_STEP4_FIX_LOG

## 本轮范围

- 只做邀请关系落库
- 不改 UI
- 不碰 `mine`
- 不碰 `order-detail`
- 不碰退款
- 不碰价格引擎
- 不展开重构

## 改了哪些文件

- `utils/order-context.js`
- `pages/group-invite/group-invite.js`
- `pages/group-landing/group-landing.js`
- `pages/checkout/checkout.js`
- `pages/payment-success/payment-success.js`
- `cloudfunctions/ensureInviteProfile/index.js`
- `cloudfunctions/ensureInviteProfile/package.json`
- `cloudfunctions/resolveInviteToken/index.js`
- `cloudfunctions/resolveInviteToken/package.json`
- `cloudfunctions/saveInviteRelation/index.js`
- `cloudfunctions/saveInviteRelation/package.json`
- `docs/audit/PHASE2A_STEP4_FIX_LOG.md`

## 3 个云函数

### 1. `ensureInviteProfile`

#### 入参

- `currentUser.userId`

#### 出参

- `ok`
- `created`
- `profile`
  - `ownerUserId`
  - `inviteToken`
  - `inviteSource`
  - `createdAt`
  - `updatedAt`

#### 作用

- 给当前用户生成或返回稳定邀请身份
- 同一用户重复进入 `group-invite`，返回同一套稳定 `inviteToken`

### 2. `resolveInviteToken`

#### 入参

- `inviteToken`
- `currentUser.userId`

#### 出参

- `ok`
- `valid`
- `inviteContext`
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`

#### 作用

- 解析邀请来源
- 空 `inviteToken` 不写入
- 自己邀请自己不写入

### 3. `saveInviteRelation`

#### 入参

- `orderId`
- `inviteToken`
- `invitedBy`
- `inviteSource`
- `inviterUserId`
- `invitedUserId`

#### 出参

- `ok`
- `saved`
- `reused`
- `relation`

#### 作用

- 保存支付成功后的邀请关系
- 按 `orderId` 做最小幂等复用

## 邀请字段在哪几个前端写入点接通

### 1. `group-invite`

- `pages/group-invite/group-invite.js`
- 进入页面时优先调用 `ensureInviteProfile`
- 成功后把稳定 `inviteToken` 回写本地 `inviteProfileV2`

### 2. `group-landing`

- `pages/group-landing/group-landing.js`
- 进入页面时优先调用 `resolveInviteToken`
- 成功后把解析后的：
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`
  写入 `activeInviteContextV2`

### 3. `checkout`

- `pages/checkout/checkout.js`
- 下单草稿优先从 `activeInviteContextV2` 带入：
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`
- 不改 UI

### 4. `payment-success`

- `pages/payment-success/payment-success.js`
- `createOrderAfterPayment` 成功后
- 如果订单带邀请字段，再调 `saveInviteRelation`
- 关系落库失败不阻断建单成功链路

## 哪些本地缓存保留做兜底

- `activeInviteContextV2`
- `inviteProfileV2`
- `currentUserV2`
- `serviceOrdersV2`

说明：
- 这些本地结构继续保留
- 但前端读取真源仍以 `service_orders` 中的：
  - `inviteToken`
  - `invitedBy`
  - `inviteSource`
  为准

## 下一步验收看什么

- 同一用户重复进入 `group-invite`，拿到同一套稳定 `inviteToken`
- 被邀请人进入 `group-landing` 后，能解析出正确 `invitedBy / inviteSource / inviteToken`
- 被邀请人完成支付后，`saveInviteRelation` 已成功落库
- `service_orders` 中订单记录已带正确邀请字段
- 重进后续页面时，邀请字段仍以后端订单真源为准
