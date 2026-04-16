/**
 * checkTierUpgrade — 检查并发放团长升级奖金
 *
 * 调用时机：每次推荐成功后（如 paymentCallback 或 getReferralStats 后端触发）
 * 也可前端在推荐数变化时主动调用。
 *
 * 逻辑：
 *   1. 查当前用户有效推荐数
 *   2. 对比已发放的升级奖金记录
 *   3. 如果达到新门槛且未发放，发放奖金到钱包
 *
 * 升级奖金：S1(3户)=¥100, S2(10户)=¥300, S3(30户)=¥900
 * 防重复：leaders 集合记录已发放的等级
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const TIERS = [
  { tier: 'S1', threshold: 3,  bonus: 100, label: '准团长' },
  { tier: 'S2', threshold: 10, bonus: 300, label: '高级团长' },
  { tier: 'S3', threshold: 30, bonus: 900, label: '荣誉团长' },
]

function nowIso() { return new Date().toISOString() }

async function creditWallet(openId, amount, ts) {
  const col = db.collection('wallets')
  const res = await col.where({ ownerUserId: openId }).limit(1).get()
  if (res.data && res.data[0]) {
    await col.doc(res.data[0]._id).update({
      data: { withdrawableBalance: _.increment(amount), updatedAt: ts },
    })
  } else {
    await col.add({
      data: { ownerUserId: openId, withdrawableBalance: amount, pendingAmount: 0, createdAt: ts, updatedAt: ts },
    })
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  // targetOpenId 仅供内部云函数（paymentCallback）代被推荐人发起调用，
  // 但客户端也能传入，因此永远从数据库重新统计，不信任任何客户端传入的 validCount
  const openId = String((event && event.targetOpenId) || OPENID || '').trim()
  if (!openId) return { ok: false, error: 'NOT_LOGGED_IN' }

  // 始终从数据库实时计算有效推荐数，禁止使用客户端传入值
  let validCount = 0
  try {
    const inviteRes = await db.collection('service_orders')
      .where({ invitedBy: openId, status: db.command.in(['深处理中', '已交付']) })
      .count()
    validCount = inviteRes.total || 0
  } catch (e) {
    return { ok: false, error: 'STATS_FAILED' }
  }

  const ts = nowIso()
  const leadersCol = db.collection('leaders')

  // 查当前 leader 记录
  const leaderRes = await leadersCol.where({ openId }).limit(1).get()
  let leader = leaderRes.data && leaderRes.data[0]

  // 已发放过的等级列表
  const paidTiers = (leader && leader.paidTiers) || []

  // 检查每个门槛
  const newUpgrades = []
  for (const t of TIERS) {
    if (validCount >= t.threshold && !paidTiers.includes(t.tier)) {
      // 发放奖金
      await creditWallet(openId, t.bonus, ts)
      newUpgrades.push({ tier: t.tier, bonus: t.bonus, label: t.label })
    }
  }

  if (newUpgrades.length === 0) {
    return { ok: true, upgraded: false, currentTier: leader ? leader.tier : '', validCount }
  }

  // 更新 leader 记录
  const highestNew = newUpgrades[newUpgrades.length - 1]
  const allPaidTiers = [...paidTiers, ...newUpgrades.map(u => u.tier)]

  if (leader) {
    await leadersCol.doc(leader._id).update({
      data: {
        tier: highestNew.tier,
        label: highestNew.label,
        paidTiers: allPaidTiers,
        validCount,
        updatedAt: ts,
      },
    })
  } else {
    await leadersCol.add({
      data: {
        openId,
        tier: highestNew.tier,
        label: highestNew.label,
        paidTiers: allPaidTiers,
        validCount,
        createdAt: ts,
        updatedAt: ts,
      },
    })
  }

  return {
    ok: true,
    upgraded: true,
    newUpgrades,
    currentTier: highestNew.tier,
    validCount,
  }
}
