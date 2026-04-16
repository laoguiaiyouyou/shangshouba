const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

function toListItem(order) {
  return {
    orderId: String(order.orderId || ''),
    ownerUserId: String(order.ownerUserId || order.userId || ''),
    orderType: String(order.orderType || 'service_order'),
    serviceType: String(order.serviceType || '深度开荒'),
    status: String(order.status || '待服务'),
    roomNo: String(order.roomNo || ''),
    scheduleResult: order.scheduleResult || null,
    sourcePage: String(order.sourcePage || 'cloud'),
    createdAt: String(order.createdAt || ''),
    updatedAt: String(order.updatedAt || order.createdAt || ''),
    invitedBy: String(order.invitedBy || ''),
    inviteSource: String(order.inviteSource || ''),
    inviteToken: String(order.inviteToken || ''),
    communityName: String(order.communityName || ''),
    orderArea: String(order.orderArea || ''),
    serviceDate: String(order.serviceDate || ''),
    totalPrice: Number(order.totalPrice || 0),
    grossPrice: Number(order.grossPrice || 0),
    earlyBirdDiscount: Number(order.earlyBirdDiscount || 0),
    newcomerDiscount: Number(order.newcomerDiscount || 0),
    groupDiscount: Number(order.groupDiscount || 0),
    groupDiscountPerSqm: Number(order.groupDiscountPerSqm || 0),
    groupId: String(order.groupId || ''),
    groupMode: String(order.groupMode || ''),
    entryFrom: String(order.entryFrom || ''),
    productType: String(order.productType || ''),
    isUpgraded: !!order.isUpgraded,
    upgradePrice: Number(order.upgradePrice || 0),
    packageFlowType: String(order.packageFlowType || ''),
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN', list: [] }
  const userId = OPENID

  const res = await collection.where({ ownerUserId: userId }).orderBy('createdAt', 'desc').get()
  const list = ((res && res.data) || []).map(toListItem)

  return {
    ok: true,
    userId,
    total: list.length,
    list,
  }
}
