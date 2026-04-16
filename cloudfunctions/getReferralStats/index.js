/**
 * getReferralStats — 查询发起人的转介绍数据
 * 返回：有效贡献户数、在途订单数、累计返现、小区参与总数
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function isGroupsCollectionMissing(error) {
  const message = String(
    (error && (error.errMsg || error.message || error.stack || error)) || ''
  )
  return (
    message.includes('-502005') ||
    message.includes('ResourceNotFound') ||
    message.includes('database collection not exists') ||
    message.includes('Db or Table not exist: groups')
  )
}

function resolveTeamStatus(rawStatus, expiresAt) {
  if (rawStatus === 'formed') return 'formed'
  if (expiresAt && new Date(expiresAt) <= new Date()) return 'expired'
  return 'recruiting'
}

function resolveMemberOrderStatus(order) {
  if (!order) return { statusKey: 'joined', statusLabel: '已加入' }
  if (['已完工', '已完成', '已交付'].includes(order.status)) {
    return { statusKey: 'completed', statusLabel: '已完工' }
  }
  if (order.status === '待支付') {
    return { statusKey: 'ordered', statusLabel: '已下单' }
  }
  if (['待服务', '服务中', '深处理中', '待勘查', '待深处理', '待备住除尘', '待搬家清洁'].includes(order.status)) {
    return { statusKey: 'paid', statusLabel: '已支付' }
  }
  return { statusKey: 'joined', statusLabel: '已加入' }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  // 1. 找当前用户的 invite_profile（兼容 ownerUserId 字段和 OPENID 两种写法）
  const profileRes = await db.collection('invite_profiles')
    .where(_.or([{ ownerUserId: OPENID }, { openId: OPENID }]))
    .limit(1).get()
  const profile = profileRes.data && profileRes.data[0]

  const inviteToken = profile ? profile.inviteToken : ''

  let validCount = 0
  let pendingCount = 0
  let totalCommission = 0

  // 有效贡献 = 被推荐人订单已进入深处理或已交付（与 checkTierUpgrade 口径一致）
  const validRes = await db.collection('service_orders')
    .where({ invitedBy: OPENID, status: _.in(['深处理中', '已交付']) })
    .count()
  validCount = validRes.total || 0

  // 在途 = 已下单但未完工
  const pendingRes = await db.collection('service_orders')
    .where({ invitedBy: OPENID, status: _.in(['待服务', '待勘查', '待深处理']) })
    .count()
  pendingCount = pendingRes.total || 0

  // 已推荐户数（含所有非退款订单）
  const referralPaidRes = await db.collection('service_orders')
    .where({ invitedBy: OPENID, status: _.nin(['已退款', '待支付']) })
    .count()
  const referralPaidCount = referralPaidRes.total || 0

  // 返佣累计：查已激活的返佣订单金额
  const rebateOrders = await db.collection('service_orders')
    .where({ invitedBy: OPENID, referralRebateStatus: 'activated' })
    .field({ referralRebateAmount: true })
    .limit(100)
    .get()
  totalCommission = (rebateOrders.data || []).reduce((sum, o) => sum + Number(o.referralRebateAmount || 0), 0)

  // 当前用户是否自己有完工订单（决定是否展示第二层）
  const myOrderRes = await db.collection('service_orders')
    .where({
      openId: OPENID,
      status: _.nin(['已退款', '待支付']),
    })
    .count()
  const hasOrder = (myOrderRes.total || 0) > 0

  // 小区参与总户数（全局，简单统计已成单的订单数）
  const communityRes = await db.collection('service_orders')
    .where({ status: _.nin(['已退款', '待支付']) })
    .count()
  const communityCount = communityRes.total || 0

  // ── 当前用户的拼团信息 ──────────────────────────────────────────
  let groupId         = ''
  let communityName   = ''
  let hasTeam         = false
  let teamCount       = 0
  let teamStatus      = 'recruiting'
  let teamTarget      = 3
  let teamMemberList  = []
  let paidCount       = 0

  try {
    let groupRes = { data: [] }
    try {
      groupRes = await db.collection('groups')
        .where({ leaderOpenId: OPENID })
        .orderBy('createdAt', 'desc')
        .limit(1).get()
    } catch (e) {
      if (!isGroupsCollectionMissing(e)) throw e
    }
    const group = groupRes.data && groupRes.data[0]

    if (group) {
      groupId    = group._id
      communityName = String(group.communityName || '')
      hasTeam    = true
      teamStatus = resolveTeamStatus(group.status, group.expiresAt)
      teamTarget = group.targetCount || 3
      const members = group.members || []
      teamCount  = members.length

      const groupOrderRes = await db.collection('service_orders')
        .where({ groupId: groupId })
        .get()
      const groupOrders = (groupOrderRes.data || [])
      const latestOrderByOpenId = {}
      groupOrders.forEach(order => {
        const ownerOpenId = String(order.openId || order.ownerUserId || order.userId || '')
        if (!ownerOpenId) return
        const prev = latestOrderByOpenId[ownerOpenId]
        if (!prev || String(order.updatedAt || order.createdAt || '') > String(prev.updatedAt || prev.createdAt || '')) {
          latestOrderByOpenId[ownerOpenId] = order
        }
      })

      const memberList = []
      for (const m of members) {
        const isLeader = m.openId === OPENID
        let statusKey   = isLeader ? 'leader' : 'joined'
        let statusLabel = isLeader ? '团长'   : '已加入'

        if (!isLeader) {
          const order = latestOrderByOpenId[String(m.openId || '')]
          if (order) {
            const statusInfo = resolveMemberOrderStatus(order)
            statusKey = statusInfo.statusKey
            statusLabel = statusInfo.statusLabel
          }
        }

        if (statusKey === 'paid' || statusKey === 'completed') paidCount++

        memberList.push({
          id:          String(m.openId || ''),
          name:        isLeader ? '你（发起人）' : (m.roomNo || `成员${memberList.length + 1}`),
          date:        (m.joinedAt || '').slice(0, 10),
          statusKey,
          statusLabel,
        })
      }
      teamMemberList = memberList
    }
  } catch (e) {
    // 团查询失败不影响主流程
  }

  return {
    ok: true,
    inviteToken,
    validCount,
    pendingCount,
    paidCount,
    referralPaidCount,
    totalCommission,
    communityCount,
    hasOrder,
    // 拼团
    groupId,
    communityName,
    hasTeam,
    teamCount,
    teamStatus,
    teamTarget,
    teamMemberList,
    // 升级状态
    upgradeStatus: validCount >= 30 ? 'leader_gold'
      : validCount >= 10 ? 'leader_silver'
      : validCount >= 3 ? 'leader_trial'
      : 'referrer',
  }
}
