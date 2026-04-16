const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

function nowIso() {
  return new Date().toISOString()
}

function makeOrderId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

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
    status: String(draft.status || '待服务'),
    roomNo: String(draft.roomNo || ''),
    scheduleResult: draft.scheduleResult || null,
    sourcePage: String(draft.sourcePage || 'payment-success'),
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
    groupId: String(draft.groupId || ''),
    groupMode: String(draft.groupMode || ''),
    entryFrom: String(draft.entryFrom || ''),
    productType: String(draft.productType || inferProductType(draft.serviceType)),
    isUpgraded: !!draft.isUpgraded,
    upgradePrice: Number(draft.upgradePrice || 0),
    packageFlowType: String(draft.packageFlowType || ''),
    docState: '',
    docRefs: null,
    idempotencyKey: String(event.idempotencyKey || ''),
    clientPaymentRef: String(event.clientPaymentRef || ''),
    inviteMeta: {
      invitedBy: String(draft.invitedBy || ''),
      inviteSource: String(draft.inviteSource || ''),
      inviteToken: String(draft.inviteToken || ''),
    },
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const idempotencyKey = String((event && event.idempotencyKey) || '')
  if (!idempotencyKey) {
    return { ok: false, error: 'MISSING_IDEMPOTENCY_KEY' }
  }

  const existingRes = await collection.where({ idempotencyKey }).limit(1).get()
  const existing = existingRes && existingRes.data && existingRes.data[0]
  if (existing) {
    // 如果旧订单没有 openId，补写一次（兼容历史数据）
    if (existing.openId !== OPENID && OPENID) {
      try {
        await collection.doc(existing._id).update({ data: { openId: OPENID } })
      } catch (e) {}
    }
    return {
      ok: true,
      orderId: existing.orderId,
      order: existing,
      created: false,
      reused: true,
    }
  }

  const order = buildOrderPayload(event)
  // 存入云端真实 OPENID，供 manageGroup 等云函数做归属校验
  if (OPENID) {
    order.openId = OPENID
    order.userId = OPENID
    order.ownerUserId = OPENID
  }
  await collection.add({ data: order })

  // 拼团加入已由 unifiedOrder.syncGroupMember 处理，此处不再重复

  return {
    ok: true,
    orderId: order.orderId,
    order,
    created: true,
    reused: false,
  }
}
