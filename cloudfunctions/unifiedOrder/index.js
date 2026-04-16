const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')
const groupsCollection = db.collection('groups')
const inviteProfilesCol = db.collection('invite_profiles')
const couponsCol = db.collection('coupons')

function nowIso() {
  return new Date().toISOString()
}

function makeOrderId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ── 价格服务端校验 ──────────────────────────────────────────────
const GROSS_UNIT_PRICE      = 15   // 元/㎡
const NEWCOMER_DISCOUNT_PSM = 1    // 元/㎡
const NEWCOMER_DISCOUNT_CAP = 200  // 元（新人券封顶）
const PRICE_FLOOR_PSM       = 12   // 元/㎡（最低成交价）

function parseArea(orderArea) {
  // "90㎡" / "90m²" / "90" → 90
  const n = parseFloat(String(orderArea || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function calcEarlyBirdPerSqm(serviceDate) {
  if (!serviceDate) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const svc = new Date(serviceDate + 'T00:00:00+08:00')
  const days = Math.round((svc - now) / (1000 * 60 * 60 * 24))
  if (days >= 60) return 2
  return 0
}

function resolveGroupMode(draft) {
  const groupMode = String((draft && draft.groupMode) || '').trim()
  if (groupMode) return groupMode
  return draft && draft.groupId ? 'community_group' : ''
}

function resolveGroupDiscountPerSqm(draft) {
  if (resolveGroupMode(draft) !== 'community_group') return 0
  const discount = Number((draft && draft.groupDiscountPerSqm) || 0)
  return discount > 0 ? discount : 2
}

function serverCalcPrice(draft) {
  const area             = parseArea(draft.orderArea)
  if (area <= 0) return null
  const toFixed2         = n => parseFloat(n.toFixed(2))
  const earlyBirdPsm     = calcEarlyBirdPerSqm(draft.serviceDate)
  const groupDiscountPerSqm = resolveGroupDiscountPerSqm(draft)
  const grossPrice       = toFixed2(area * GROSS_UNIT_PRICE)
  const earlyBirdDiscount= toFixed2(area * earlyBirdPsm)
  const newcomerDiscount = toFixed2(Math.min(area * NEWCOMER_DISCOUNT_PSM, NEWCOMER_DISCOUNT_CAP))
  const groupDiscount    = toFixed2(area * groupDiscountPerSqm)
  let   totalPrice       = toFixed2(grossPrice - earlyBirdDiscount - newcomerDiscount)
  const floorPrice       = toFixed2(area * PRICE_FLOOR_PSM)
  if (totalPrice < floorPrice) totalPrice = floorPrice
  return { grossPrice, earlyBirdDiscount, newcomerDiscount, groupDiscount, groupDiscountPerSqm, totalPrice }
}

function validatePrice(draft) {
  const server = serverCalcPrice(draft)
  if (!server) return { ok: false, error: 'INVALID_AREA' }
  const clientTotal = parseFloat(draft.totalPrice || 0)
  // 允许 ±0.01 元误差（浮点精度兜底）
  if (Math.abs(clientTotal - server.totalPrice) > 0.01) {
    return { ok: false, error: 'PRICE_MISMATCH', serverTotal: server.totalPrice, clientTotal }
  }
  return { ok: true, serverPrice: server }
}
// ── 邀约同小区校验 ─────────────────────────────────────────────
async function validateInviteCommunity(draft) {
  const inviteToken = String(draft.inviteToken || '').trim()
  if (!inviteToken) return { ok: true }

  const communityName = String(draft.communityName || '').trim()
  if (!communityName) return { ok: true } // 新客户未填小区时跳过（结算页会拦截）

  // 查邀请人 userId
  const profileRes = await inviteProfilesCol.where({ inviteToken }).limit(1).get()
  const profile = profileRes && profileRes.data && profileRes.data[0]
  if (!profile) return { ok: false, error: 'INVITE_TOKEN_NOT_FOUND' }

  const inviterUserId = String(profile.ownerUserId || '').trim()
  if (!inviterUserId) return { ok: false, error: 'INVALID_INVITE_OWNER' }

  // 查邀请人最近一单的小区
  const orderRes = await collection
    .where({ ownerUserId: inviterUserId })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .field({ communityName: true })
    .get()
  const inviterOrder = orderRes && orderRes.data && orderRes.data[0]
  const inviterCommunity = String((inviterOrder && inviterOrder.communityName) || '').trim()

  if (!inviterCommunity) return { ok: false, error: 'INVITER_NO_ORDER' }
  if (inviterCommunity !== communityName) {
    return { ok: false, error: 'COMMUNITY_MISMATCH', inviterCommunity, yourCommunity: communityName }
  }
  return { ok: true }
}
// ── 券验证 ─────────────────────────────────────────────────────
async function validateCoupon(couponId, openId) {
  if (!couponId) return { ok: true, couponAmount: 0 }
  try {
    const res = await couponsCol.doc(couponId).get()
    const coupon = res && res.data
    if (!coupon) return { ok: false, error: 'COUPON_NOT_FOUND' }
    if (coupon.ownerOpenId !== openId) return { ok: false, error: 'COUPON_NOT_YOURS' }
    if (coupon.status !== 'active') return { ok: false, error: 'COUPON_ALREADY_USED' }
    if (new Date(coupon.expiresAt) < new Date()) return { ok: false, error: 'COUPON_EXPIRED' }
    return { ok: true, couponAmount: Number(coupon.amount || 0), couponId }
  } catch (e) {
    return { ok: false, error: 'COUPON_NOT_FOUND' }
  }
}

async function redeemCoupon(couponId, orderId) {
  if (!couponId) return
  const ts = nowIso()
  await couponsCol.doc(couponId).update({
    data: { status: 'used', usedAt: ts, usedOrderId: orderId, updatedAt: ts },
  })
}
// ────────────────────────────────────────────────────────────────

function inferProductType(serviceType) {
  const text = String(serviceType || '')
  const normalized = text.toLowerCase()
  if (text.includes('守护') || text.includes('升级') || normalized.includes('plus')) return 'hujin'
  if (text.includes('360') || text.includes('全护') || normalized.includes('max')) return '360'
  return 'haokang'
}

function buildOrderPayload(event) {
  const draft = event && event.draft ? event.draft : {}
  const currentUser = event && event.currentUser ? event.currentUser : {}
  const createdAt = nowIso()
  return {
    orderId: makeOrderId(),
    ownerUserId: String(currentUser.userId || ''),
    userId: String(currentUser.userId || ''),
    orderType: 'service_order',
    serviceType: String(draft.serviceType || '深度开荒'),
    status: '待支付',
    roomNo: String(draft.roomNo || ''),
    scheduleResult: draft.scheduleResult || null,
    sourcePage: 'checkout',
    createdAt,
    updatedAt: createdAt,
    invitedBy: String(draft.invitedBy || ''),
    inviteSource: String(draft.inviteSource || ''),
    inviteToken: String(draft.inviteToken || ''),
    communityName: String(draft.communityName || ''),
    orderArea: String(draft.orderArea || ''),
    serviceDate: String(draft.serviceDate || ''),
    totalPrice: Number(draft.totalPrice || 0),
    grossPrice: Number(draft.grossPrice || 0),
    earlyBirdDiscount: Number(draft.earlyBirdDiscount || 0),
    newcomerDiscount: Number(draft.newcomerDiscount || 0),
    groupDiscount: Number(draft.groupDiscount || 0),
    groupDiscountPerSqm: Number(draft.groupDiscountPerSqm || 0),
    productType: String(draft.productType || inferProductType(draft.serviceType)),
    isUpgraded: !!draft.isUpgraded,
    upgradePrice: Number(draft.upgradePrice || 0),
    packageFlowType: String(draft.packageFlowType || ''),
    docState: '',
    docRefs: null,
    idempotencyKey: String(event.idempotencyKey || ''),
    clientPaymentRef: String(event.clientPaymentRef || ''),
    couponId: String(draft.couponId || ''),
    couponAmount: Number(draft.couponAmount || 0),
    groupId: String(draft.groupId || ''),
    groupMode: resolveGroupMode(draft),
    entryFrom: String(draft.entryFrom || ''),
    inviteMeta: {
      invitedBy: String(draft.invitedBy || ''),
      inviteSource: String(draft.inviteSource || ''),
      inviteToken: String(draft.inviteToken || ''),
    },
  }
}

async function syncGroupMember(order, openId) {
  const groupId = String(order.groupId || '').trim()
  if (!groupId || !openId) return

  const groupRes = await groupsCollection.doc(groupId).get()
  const group = groupRes && groupRes.data
  if (!group) return

  const members = Array.isArray(group.members) ? group.members.slice() : []
  const memberIdx = members.findIndex(member => String(member.openId || '') === openId)
  const orderRoomNo = String(order.roomNo || '').trim()
  const orderCommunity = String(order.communityName || '').trim()
  const groupCommunity = String(group.communityName || '').trim()

  // 同小区校验：成员小区必须与团的小区一致
  if (orderCommunity && groupCommunity && orderCommunity !== groupCommunity) {
    return { error: 'GROUP_COMMUNITY_MISMATCH' }
  }

  // 不同房号校验：同团内不允许相同房号（更新自己除外）
  if (orderRoomNo && memberIdx < 0) {
    const duplicateRoom = members.some(m => String(m.roomNo || '').trim() === orderRoomNo)
    if (duplicateRoom) return { error: 'GROUP_DUPLICATE_ROOM' }
  }

  const now = nowIso()
  const nextMember = {
    openId,
    orderId: order.orderId,
    joinedAt: memberIdx >= 0 && members[memberIdx].joinedAt ? members[memberIdx].joinedAt : now,
    roomNo: orderRoomNo,
    communityName: orderCommunity,
    updatedAt: now,
  }

  if (memberIdx >= 0) {
    members[memberIdx] = { ...members[memberIdx], ...nextMember }
  } else {
    members.push(nextMember)
  }

  // 仅同步成员信息，不在此处触发成团结算。
  // 成团判断由 paymentCallback 在付款成功后以"付款成员数"为准触发。
  await groupsCollection.doc(groupId).update({
    data: {
      members,
      updatedAt: now,
    },
  })
  return { ok: true }
}

exports.main = async (event) => {
  // 从云端 context 取真实 OpenID（用于订单归属校验）
  const { OPENID } = cloud.getWXContext()

  const idempotencyKey = String((event && event.idempotencyKey) || '')
  if (!idempotencyKey) {
    return { ok: false, error: 'MISSING_IDEMPOTENCY_KEY' }
  }

  // 幂等检查：同一笔订单不重复创建
  const existingRes = await collection.where({ idempotencyKey }).limit(1).get()
  const existing = existingRes && existingRes.data && existingRes.data[0]

  // ── 价格校验（仅新订单时校验；已有订单复用原价）──
  const draft = event && event.draft ? event.draft : {}
  if (!existing) {
    const priceCheck = validatePrice(draft)
    if (!priceCheck.ok) {
      return { ok: false, error: priceCheck.error, detail: priceCheck }
    }
    // 用服务端计算的价格覆盖客户端提交的价格
    Object.assign(draft, priceCheck.serverPrice)

    // ── 重复下单拦截：同小区 + 同房号（仅新订单）──
    const draftRoom = String(draft.roomNo || '').trim()
    const draftCommunity = String(draft.communityName || '').trim()
    if (draftRoom && draftCommunity) {
      const dupRes = await collection
        .where({ communityName: draftCommunity, roomNo: draftRoom })
        .limit(1)
        .get()
      const dupOrder = dupRes.data && dupRes.data[0]
      if (dupOrder && dupOrder.status !== '已退款') {
        return { ok: false, error: 'DUPLICATE_ORDER', existingOrderId: dupOrder.orderId }
      }
    }

    // ── 邀约同小区硬校验（仅新订单 + 有邀约时）──
    if (draft.inviteToken) {
      const communityCheck = await validateInviteCommunity(draft)
      if (!communityCheck.ok) {
        // 小区不匹配：剥离邀约信息，按无邀约重新计算价格
        draft.inviteToken = ''
        draft.invitedBy = ''
        draft.inviteSource = ''
        const repriced = validatePrice(draft)
        if (repriced.ok) Object.assign(draft, repriced.serverPrice)
        return {
          ok: false,
          error: communityCheck.error,
          detail: communityCheck,
        }
      }
    }
  }

  let order
  if (existing) {
    order = existing
  } else {
    order = buildOrderPayload({ ...event, draft })
    // 用云端真实 OpenID 覆盖客户端传来的 userId（防 mock ID 不一致）
    if (OPENID) {
      order.openId  = OPENID
      order.userId  = OPENID
      order.ownerUserId = OPENID
    }
    await collection.add({ data: order })
    try {
      const groupResult = await syncGroupMember(order, OPENID)
      if (groupResult && groupResult.error) {
        // 拼团校验失败（小区不匹配或房号重复）不阻断下单，但记录警告
        order.groupWarning = groupResult.error
      }
    } catch (e) {}
  }

  // 金额：元 → 分（CloudPay 要求整数分）
  const totalFee = Math.round(Number(order.totalPrice || 0) * 100)
  if (totalFee <= 0) {
    return { ok: false, error: 'INVALID_AMOUNT', totalPrice: order.totalPrice }
  }

  // 调用 CloudPay 统一下单
  const payResult = await cloud.cloudPay.unifiedOrder({
    body: `上手吧-${order.serviceType || '清洁服务'}`,
    outTradeNo: order.orderId,
    spbillCreateIp: '127.0.0.1',
    subMchId: '1661331933',
    totalFee,
    envId: 'cloud1-8ge14816fe785add',
    functionName: 'paymentCallback',
  })

  if (payResult.payment) {
    return {
      ok: true,
      orderId: order.orderId,
      payment: payResult.payment,
      reused: !!existing,
    }
  }

  return {
    ok: false,
    error: 'CLOUDPAY_FAILED',
    detail: payResult,
  }
}
