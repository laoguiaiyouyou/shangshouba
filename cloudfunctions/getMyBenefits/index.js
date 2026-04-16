/**
 * getMyBenefits — 查询当前用户的团长等级 + 可用券列表
 *
 * 返回：{ ok, tier, level, coupons[] }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  let tier = ''
  let level = '尊贵用户'

  // 查团长等级
  try {
    const res = await db.collection('leaders').where({ openId: OPENID }).limit(1).get()
    const leader = res.data && res.data[0]
    if (leader && leader.tier) {
      tier = leader.tier
      const labels = { S1: '准团长', S2: '高级团长', S3: '荣誉团长' }
      level = labels[tier] || level
    }
  } catch (e) { /* leaders 集合可能不存在 */ }

  // 查可用券
  let coupons = []
  try {
    const res = await db.collection('coupons')
      .where({ ownerOpenId: OPENID })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    coupons = res.data || []
  } catch (e) { /* coupons 集合可能不存在 */ }

  return { ok: true, tier, level, coupons }
}
