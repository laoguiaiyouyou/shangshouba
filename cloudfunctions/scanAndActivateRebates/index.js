/**
 * scanAndActivateRebates — 定时扫描已完工订单，激活推荐人返佣
 *
 * 部署后在云开发控制台设置定时触发器（建议每小时执行一次）：
 *   config.json: { "triggers": [{ "name": "hourly", "type": "timer", "config": "0 0 * * * * *" }] }
 *
 * 逻辑：
 *   1. 查 referralRebateStatus='pending' 且 status 在 ['深处理中','已交付'] 的订单
 *   2. 对每条订单：pendingAmount → withdrawableBalance，标记 activated
 *   3. 同时触发 checkTierUpgrade 更新推荐人等级
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const ACTIVATED_STATUSES = ['深处理中', '已交付']

function nowIso() { return new Date().toISOString() }

exports.main = async () => {
  const ts = nowIso()
  const ordersCol = db.collection('service_orders')
  const walletsCol = db.collection('wallets')

  // 查所有待激活的返佣订单
  const res = await ordersCol
    .where({
      referralRebateStatus: 'pending',
      status: _.in(ACTIVATED_STATUSES),
    })
    .limit(100)
    .get()

  const orders = res.data || []
  let activated = 0
  const upgradedUsers = new Set()

  for (const order of orders) {
    const inviterUserId = String(order.invitedBy || '').trim()
    const amount = Number(order.referralRebateAmount || 0)
    if (!inviterUserId || amount <= 0) continue

    // pendingAmount → withdrawableBalance
    try {
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

      // 标记已激活
      await ordersCol.doc(order._id).update({
        data: {
          referralRebateStatus: 'activated',
          referralRebateActivatedAt: ts,
          updatedAt: ts,
        },
      })

      activated++
      upgradedUsers.add(inviterUserId)
    } catch (e) {
      // 单条失败不影响其他
    }
  }

  // 对所有涉及的推荐人检查升级
  for (const userId of upgradedUsers) {
    try {
      await cloud.callFunction({ name: 'checkTierUpgrade', data: { targetOpenId: userId } })
    } catch (e) { /* 升级失败不阻断 */ }
  }

  return { ok: true, scanned: orders.length, activated }
}
