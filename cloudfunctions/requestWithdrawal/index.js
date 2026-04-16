const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db    = cloud.database()
const _     = db.command

function nowIso() { return new Date().toISOString() }

/**
 * 提交提现申请
 * event: { amount: number, idempotencyKey: string }
 *   idempotencyKey 由前端生成（建议用时间戳+随机数），同一个 key 只处理一次。
 * 逻辑：
 *   1. 幂等检查：30 秒内同一用户已有"处理中"记录则直接返回
 *   2. 读取 wallets 余额
 *   3. 扣除余额，写 withdrawal_records 记录
 *   4. 后台人工审核后手动改 status → '已到账'
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  // 幂等保护：检查最近 30 秒内是否已有该用户的处理中记录
  const IDEMPOTENCY_WINDOW_MS = 30 * 1000
  const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString()
  const recentRes = await db.collection('withdrawal_records')
    .where({
      ownerUserId: OPENID,
      status: '处理中',
      appliedAt: db.command.gte(windowStart),
    })
    .limit(1)
    .get()
  if (recentRes.data && recentRes.data[0]) {
    return { ok: true, idempotent: true, existing: recentRes.data[0] }
  }

  const walletRes = await db.collection('wallets')
    .where({ ownerUserId: OPENID }).limit(1).get()
  const wallet = walletRes.data && walletRes.data[0]

  if (!wallet || !wallet._id) {
    return { ok: false, error: 'NO_WALLET' }
  }

  const available = Number(wallet.withdrawableBalance || 0)
  const amount    = event && event.amount ? Number(event.amount) : available

  if (amount <= 0 || amount > available) {
    return { ok: false, error: 'INVALID_AMOUNT', available, requested: amount }
  }

  const appliedAt = nowIso()

  await db.collection('wallets').doc(wallet._id).update({
    data: {
      withdrawableBalance: _.increment(-amount),
      pendingAmount:       _.increment(amount),
      updatedAt:           appliedAt,
    },
  })

  await db.collection('withdrawal_records').add({
    data: {
      ownerUserId: OPENID,
      amount,
      status:    '处理中',
      appliedAt,
    },
  })

  return { ok: true, amount, appliedAt }
}
