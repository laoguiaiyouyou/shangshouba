const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const profilesCol    = db.collection('invite_profiles')
const shortcutsCol   = db.collection('invite_shortcuts')
const ordersCol      = db.collection('service_orders')

// 查询邀请人最近一单的小区名（已下单老客户才有资格邀请）
async function getInviterCommunity(inviterUserId) {
  if (!inviterUserId) return ''
  const orderRes = await ordersCol
    .where({ ownerUserId: inviterUserId })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .field({ communityName: true })
    .get()
  const order = orderRes && orderRes.data && orderRes.data[0]
  return String((order && order.communityName) || '').trim()
}

exports.main = async (event) => {
  // 从服务端获取真实 OPENID，用于防止自邀，不信任客户端传入的 userId
  const { OPENID } = cloud.getWXContext()

  let inviteToken = String((event && event.inviteToken) || '').trim()
  const shortCode = String((event && event.shortCode) || '').trim()

  // 如果传来的是短码（扫码入口），先换成完整 inviteToken
  if (!inviteToken && shortCode) {
    const scRes = await shortcutsCol.where({ shortCode }).limit(1).get()
    const sc    = scRes && scRes.data && scRes.data[0]
    if (!sc) return { ok: true, valid: false, skipped: 'SHORT_CODE_NOT_FOUND' }
    inviteToken = sc.inviteToken
  }

  if (!inviteToken) {
    return { ok: true, valid: false, skipped: 'EMPTY_INVITE_TOKEN' }
  }

  const res     = await profilesCol.where({ inviteToken }).limit(1).get()
  const profile = res && res.data && res.data[0]
  if (!profile) {
    return { ok: true, valid: false, skipped: 'INVITE_TOKEN_NOT_FOUND' }
  }

  const invitedBy = String(profile.ownerUserId || '').trim()
  if (!invitedBy) {
    return { ok: true, valid: false, skipped: 'INVALID_INVITE_OWNER' }
  }
  // 使用服务端 OPENID 进行自邀检测，防止客户端伪造 userId 绕过限制
  if (OPENID && OPENID === invitedBy) {
    return { ok: true, valid: false, skipped: 'SELF_INVITE' }
  }

  // 查询邀请人的小区
  const inviterCommunity = await getInviterCommunity(invitedBy)

  return {
    ok: true,
    valid: true,
    inviteContext: {
      inviteToken,
      invitedBy,
      inviteSource: 'qr',
      inviterCommunity,
    },
  }
}
