const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const collection = db.collection('service_orders')
const walletsCol = db.collection('wallets')
const leadersCol = db.collection('leaders')

function nowIso() {
  return new Date().toISOString()
}

function parseArea(orderArea) {
  const n = parseFloat(String(orderArea || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

// ── 查推荐人团长等级 → 确定返佣金额 ─────────────────────────────
// 返佣规则：S1 ¥15/¥30, S2 ¥20/¥40, S3 ¥25/¥50
const REBATE_RULES = {
  S1: { base: 15, sameBuildingExtra: 15 },
  S2: { base: 20, sameBuildingExtra: 20 },
  S3: { base: 25, sameBuildingExtra: 25 },
}

async function calcRebateAmount(inviterUserId, orderCommunity, orderRoomNo) {
  // 查推荐人等级
  const leaderRes = await leadersCol.where({ openId: inviterUserId }).limit(1).get()
  const leader = leaderRes.data && leaderRes.data[0]
  const tier = leader ? String(leader.tier || '').toUpperCase() : ''
  const rule = REBATE_RULES[tier]
  if (!rule) return { amount: 0, tier: '', sameBuilding: false }

  // 判断是否同栋楼（提取栋号：roomNo 格式为 "X栋Y单元Z" 或 "X栋"）
  let sameBuilding = false
  if (orderCommunity && orderRoomNo) {
    const orderBuilding = String(orderRoomNo).match(/^(\d+)栋/)?.[1] || ''
    if (orderBuilding) {
      // 查推荐人的订单，看是否同栋
      const inviterOrderRes = await collection
        .where({ ownerUserId: inviterUserId, communityName: orderCommunity })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .field({ roomNo: true })
        .get()
      const inviterOrder = inviterOrderRes.data && inviterOrderRes.data[0]
      if (inviterOrder) {
        const inviterBuilding = String(inviterOrder.roomNo || '').match(/^(\d+)栋/)?.[1] || ''
        sameBuilding = !!(inviterBuilding && inviterBuilding === orderBuilding)
      }
    }
  }

  const amount = rule.base + (sameBuilding ? rule.sameBuildingExtra : 0)
  return { amount, tier, sameBuilding }
}

// ── 返佣写入 pendingAmount（待激活）────────────────────────────
async function creditPendingRebate(inviterUserId, amount, ts) {
  if (!inviterUserId || amount <= 0) return
  const res = await walletsCol.where({ ownerUserId: inviterUserId }).limit(1).get()
  if (res.data && res.data[0]) {
    await walletsCol.doc(res.data[0]._id).update({
      data: { pendingAmount: _.increment(amount), updatedAt: ts },
    })
  } else {
    await walletsCol.add({
      data: { ownerUserId: inviterUserId, withdrawableBalance: 0, pendingAmount: amount, createdAt: ts, updatedAt: ts },
    })
  }
}

exports.main = async (event) => {
  const ts = nowIso()

  const outTradeNo    = String((event && (event.out_trade_no   || event.outTradeNo))    || '')
  const transactionId = String((event && (event.transaction_id || event.transactionId)) || '')
  const returnCode    = String((event && (event.return_code    || event.returnCode))    || '')
  const resultCode    = String((event && (event.result_code    || event.resultCode))    || '')
  // 必须两个字段都是 SUCCESS，防止部分成功字段被误判
  const isSuccess     = returnCode === 'SUCCESS' && resultCode === 'SUCCESS'

  if (!isSuccess || !outTradeNo) {
    return { errcode: 0, errmsg: 'SUCCESS' }
  }

  const res = await collection.where({ orderId: outTradeNo }).limit(1).get()
  const order = (res && res.data && res.data[0]) || null

  // 幂等保护：只处理仍在"待支付"状态的订单，防止回调重复触发
  if (order && order.status === '待支付') {
    // 1. 更新订单状态
    await collection.doc(order._id).update({
      data: { status: '待服务', transactionId, paidAt: ts, updatedAt: ts },
    })

    // 2. 推荐返佣（写入 pendingAmount，深处理完成后才激活为可提现）
    const inviterUserId = String(order.invitedBy || '').trim()
    const alreadyPaid   = !!order.referralRebatePaid

    if (inviterUserId && !alreadyPaid) {
      try {
        const rebateInfo = await calcRebateAmount(
          inviterUserId,
          String(order.communityName || ''),
          String(order.roomNo || '')
        )
        if (rebateInfo.amount > 0) {
          await creditPendingRebate(inviterUserId, rebateInfo.amount, ts)
          await collection.doc(order._id).update({
            data: {
              referralRebatePaid: true,
              referralRebateAmount: rebateInfo.amount,
              referralRebateStatus: 'pending',
              referralRebateTier: rebateInfo.tier,
              referralSameBuilding: rebateInfo.sameBuilding,
              updatedAt: ts,
            },
          })
        }
      } catch (e) { /* 返佣失败不阻断支付回调 */ }
    }

    // 3. 检查推荐人是否达到升级门槛
    if (inviterUserId) {
      try {
        await cloud.callFunction({ name: 'checkTierUpgrade', data: { targetOpenId: inviterUserId } })
      } catch (e) { /* 升级检查失败不阻断 */ }
    }

    // 4. 拼团成团检查：付款成功后，按团内"已付款成员数"判断是否达到成团门槛
    const groupId = String(order.groupId || '').trim()
    if (groupId) {
      try {
        await cloud.callFunction({ name: 'manageGroup', data: { action: 'checkPaidAndSettle', groupId } })
      } catch (e) { /* 成团检查失败不阻断支付回调 */ }
    }
  }

  return { errcode: 0, errmsg: 'SUCCESS' }
}
