const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 获取当前用户钱包余额 + 提现记录
 * wallets 集合 schema:
 *   ownerUserId, withdrawableBalance, pendingAmount, createdAt, updatedAt
 * withdrawal_records 集合 schema:
 *   ownerUserId, amount, status('处理中'|'已到账'|'已拒绝'), appliedAt, processedAt?
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  // 读钱包
  const walletRes = await db.collection('wallets')
    .where({ ownerUserId: OPENID }).limit(1).get()
  const wallet = (walletRes.data && walletRes.data[0]) || null

  // 读最近 20 条提现记录
  const recordRes = await db.collection('withdrawal_records')
    .where({ ownerUserId: OPENID })
    .orderBy('appliedAt', 'desc')
    .limit(20)
    .get()
  const records = (recordRes.data || []).map(r => ({
    date: r.appliedAt ? r.appliedAt.slice(2, 10).replace(/-/g, '-') : '',
    amount: `¥${Number(r.amount || 0).toFixed(2)}`,
    status: r.status || '处理中',
  }))

  return {
    ok: true,
    withdrawableBalance: wallet ? Number(wallet.withdrawableBalance || 0) : 0,
    pendingAmount:       wallet ? Number(wallet.pendingAmount || 0) : 0,
    records,
  }
}
