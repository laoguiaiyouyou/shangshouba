const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('service_orders')

function nowIso() {
  return new Date().toISOString()
}

/** 允许退款的订单状态白名单 */
const REFUNDABLE_STATUSES = ['待服务', '待勘查']

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const orderId = String((event && event.orderId) || '')
  const reason = String((event && event.reason) || '')
  const images = Array.isArray(event && event.images) ? event.images : []

  if (!orderId) {
    return { ok: false, error: 'MISSING_ORDER_ID' }
  }
  if (!reason) {
    return { ok: false, error: 'MISSING_REASON' }
  }

  const res = await collection.where({ orderId }).limit(1).get()
  const order = res && res.data && res.data[0]
  if (!order || !order._id) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  // OPENID 归属校验
  const ownerMatch = order.openId === OPENID || order.userId === OPENID || order.ownerUserId === OPENID
  if (!ownerMatch) {
    return { ok: false, error: 'ORDER_NOT_FOUND', orderId }
  }

  // 状态校验
  if (!REFUNDABLE_STATUSES.includes(order.status)) {
    return { ok: false, error: 'STATUS_NOT_REFUNDABLE', currentStatus: order.status }
  }

  // 72h 服务端校验：serviceDate 前精确 72 小时之前才可退
  // serviceDate 为空时无法核实时间窗口，一律拒绝退款
  const serviceDate = String(order.serviceDate || '')
  if (!serviceDate) {
    return { ok: false, error: 'REFUND_WINDOW_CLOSED', reason: 'SERVICE_DATE_MISSING' }
  }
  const serviceTime = new Date(serviceDate + 'T00:00:00+08:00')
  const refundDeadline = new Date(serviceTime.getTime() - 72 * 60 * 60 * 1000)
  if (Date.now() >= refundDeadline.getTime()) {
    return { ok: false, error: 'REFUND_WINDOW_CLOSED', serviceDate, refundDeadline: refundDeadline.toISOString() }
  }

  const appliedAt = nowIso()
  const refundRequest = {
    reason,
    images,
    appliedAt,
    serviceDate,
  }

  await collection.doc(order._id).update({
    data: {
      status: '退款处理中',
      refundRequest,
      updatedAt: appliedAt,
    },
  })

  return {
    ok: true,
    orderId,
    appliedAt,
  }
}
