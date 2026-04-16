const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

function nowIso() {
  return new Date().toISOString()
}

function buildScheduleResult(order, input) {
  const existing = (order && order.scheduleResult) || {}
  const existingBookings = existing.nodeBookings || {}
  const updatedAt = nowIso()
  return {
    lastNode: String(input.nodeName || ''),
    lastDate: String(input.dateLabel || ''),
    lastSlot: String(input.slot || ''),
    updatedAt,
    nodeBookings: {
      ...existingBookings,
      [String(input.nodeName || '')]: {
        nodeName: String(input.nodeName || ''),
        dateLabel: String(input.dateLabel || ''),
        slot: String(input.slot || ''),
        status: 'booked',
        updatedAt,
      },
    },
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const orderId = String((event && event.orderId) || '')
  const input = event && event.scheduleInput ? event.scheduleInput : {}

  if (!orderId) {
    return { ok: false, error: 'MISSING_ORDER_ID' }
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

  const scheduleResult = buildScheduleResult(order, input)
  const updatedAt = scheduleResult.updatedAt || nowIso()

  await collection.doc(order._id).update({
    data: {
      scheduleResult,
      updatedAt,
    },
  })

  return {
    ok: true,
    orderId,
    scheduleResult,
    updatedAt,
  }
}
