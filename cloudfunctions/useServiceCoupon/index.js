/**
 * useServiceCoupon — 使用权益券预约服务
 *
 * 参数：{ couponId, serviceDate, timePeriod }
 *   couponId:    coupons 集合 _id
 *   serviceDate: "2026-05-15"
 *   timePeriod:  "上午" | "下午" | ""（除甲醛不传）
 *
 * 流程：
 *   1. 验证券归属、状态、有效期
 *   2. 从用户最近开荒订单取地址
 *   3. 创建 service_bookings 预约记录
 *   4. 券 status → used
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function nowIso() { return new Date().toISOString() }

function makeBookingId() {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const COUPON_TYPE_LABEL = {
  window: '擦窗',
  pet_sanitize: '宠物消杀',
  formaldehyde: '除甲醛',
  daily_cleaning: '日常保洁',
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const couponId    = String((event && event.couponId) || '').trim()
  const serviceDate = String((event && event.serviceDate) || '').trim()
  const timePeriod  = String((event && event.timePeriod) || '').trim()

  if (!couponId) return { ok: false, error: 'MISSING_COUPON_ID' }
  if (!serviceDate) return { ok: false, error: 'MISSING_DATE' }

  const ts = nowIso()
  const couponsCol = db.collection('coupons')
  const ordersCol  = db.collection('service_orders')
  const bookingsCol = db.collection('service_bookings')

  // 1. 验证券
  let coupon
  try {
    const res = await couponsCol.doc(couponId).get()
    coupon = res && res.data
  } catch (e) {
    return { ok: false, error: 'COUPON_NOT_FOUND' }
  }
  if (!coupon) return { ok: false, error: 'COUPON_NOT_FOUND' }
  if (coupon.ownerOpenId !== OPENID) return { ok: false, error: 'COUPON_NOT_YOURS' }
  if (coupon.status !== 'active') return { ok: false, error: 'COUPON_NOT_ACTIVE' }
  if (new Date(coupon.expiresAt) < new Date()) return { ok: false, error: 'COUPON_EXPIRED' }

  // 2. 取用户最近开荒订单的地址
  const orderRes = await ordersCol
    .where({ openId: OPENID })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .field({ communityName: true, roomNo: true })
    .get()
  const latestOrder = orderRes.data && orderRes.data[0]
  const communityName = (latestOrder && latestOrder.communityName) || ''
  const roomNo = (latestOrder && latestOrder.roomNo) || ''

  // 3. 创建预约记录
  const booking = {
    bookingId: makeBookingId(),
    openId: OPENID,
    couponId,
    couponType: coupon.couponType,
    serviceType: COUPON_TYPE_LABEL[coupon.couponType] || coupon.couponType,
    communityName,
    roomNo,
    serviceDate,
    timePeriod,
    status: 'pending_confirm',
    createdAt: ts,
    updatedAt: ts,
  }
  await bookingsCol.add({ data: booking })

  // 4. 券标记已使用
  await couponsCol.doc(couponId).update({
    data: {
      status: 'used',
      usedAt: ts,
      usedBookingId: booking.bookingId,
      updatedAt: ts,
    },
  })

  return { ok: true, booking }
}
