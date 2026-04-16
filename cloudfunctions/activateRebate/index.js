/**
 * activateRebate — 返佣激活
 *
 * 调用时机：被推荐人的订单完成深处理（状态变为"深处理中"或"已交付"）时触发。
 * 可由后台运营手动调用，也可在订单状态变更的云函数中自动调用。
 *
 * 参数：{ orderId } — 被推荐人的订单 ID
 *
 * 逻辑：
 *   1. 查订单，确认有 referralRebateStatus === 'pending'
 *   2. 确认订单已进入深处理或更后阶段
 *   3. 将推荐人钱包的 pendingAmount 减少、withdrawableBalance 增加
 *   4. 订单标记 referralRebateStatus = 'activated'
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const ordersCol = db.collection('service_orders')
const walletsCol = db.collection('wallets')

// 深处理完成后的状态（含当前及之后的所有状态）
const ACTIVATED_STATUSES = ['深处理中', '已交付']

function nowIso() { return new Date().toISOString() }

exports.main = async (event) => {
  const orderId = String((event && event.orderId) || '').trim()
  if (!orderId) return { ok: false, error: 'MISSING_ORDER_ID' }

  const ts = nowIso()

  // 1. 查订单
  const orderRes = await ordersCol.where({ orderId }).limit(1).get()
  const order = orderRes.data && orderRes.data[0]
  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  // 2. 检查是否有待激活的返佣
  if (order.referralRebateStatus !== 'pending') {
    return { ok: true, skipped: true, reason: 'NOT_PENDING' }
  }

  // 3. 检查订单是否已到深处理阶段
  if (!ACTIVATED_STATUSES.includes(order.status)) {
    return { ok: true, skipped: true, reason: 'NOT_YET_DEEP_CLEAN' }
  }

  const inviterUserId = String(order.invitedBy || '').trim()
  const amount = Number(order.referralRebateAmount || 0)
  if (!inviterUserId || amount <= 0) {
    return { ok: true, skipped: true, reason: 'NO_REBATE_DATA' }
  }

  // 4. 钱包：pendingAmount 减少，withdrawableBalance 增加
  const walletRes = await walletsCol.where({ ownerUserId: inviterUserId }).limit(1).get()
  const wallet = walletRes.data && walletRes.data[0]
  if (wallet) {
    await walletsCol.doc(wallet._id).update({
      data: {
        pendingAmount: _.increment(-amount),
        withdrawableBalance: _.increment(amount),
        updatedAt: ts,
      },
    })
  }

  // 5. 订单标记已激活
  await ordersCol.doc(order._id).update({
    data: {
      referralRebateStatus: 'activated',
      referralRebateActivatedAt: ts,
      updatedAt: ts,
    },
  })

  return { ok: true, activated: true, amount, inviterUserId }
}
