const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const orderId = String((event && event.orderId) || '')
  if (!orderId) {
    return { ok: false, error: 'MISSING_ORDER_ID' }
  }

  const res = await collection.where({ orderId }).limit(1).get()
  const order = res && res.data && res.data[0]
  if (!order) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  // OPENID 归属校验
  const ownerMatch = order.openId === OPENID || order.userId === OPENID || order.ownerUserId === OPENID
  if (!ownerMatch) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  return {
    ok: true,
    orderId,
    order,
  }
}
