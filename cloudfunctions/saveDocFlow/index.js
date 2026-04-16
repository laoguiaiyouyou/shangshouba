const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

function nowIso() {
  return new Date().toISOString()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const orderId = String((event && event.orderId) || '')
  const flowState = String((event && event.flowState) || '')

  if (!orderId) {
    return { ok: false, error: 'MISSING_ORDER_ID' }
  }
  if (!flowState) {
    return { ok: false, error: 'MISSING_FLOW_STATE' }
  }

  const res = await collection.where({ orderId }).limit(1).get()
  const order = res && res.data && res.data[0]
  if (!order || !order._id) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  const ownerMatch = order.openId === OPENID || order.userId === OPENID || order.ownerUserId === OPENID
  if (!ownerMatch) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  const existing = (order && order.docFlow) || {}
  const updatedAt = nowIso()

  const docFlow = {
    ...existing,
    flowState,
    updatedAt,
  }

  if (event.confirmData != null) {
    docFlow.confirmData = event.confirmData
  }

  if (event.finalSnapshot != null) {
    docFlow.finalSnapshot = event.finalSnapshot
  }

  await collection.doc(order._id).update({
    data: {
      docFlow,
      updatedAt,
    },
  })

  return {
    ok: true,
    orderId,
    flowState,
    updatedAt,
  }
}
