const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('invite_relations')

function nowIso() {
  return new Date().toISOString()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const orderId = String((event && event.orderId) || '').trim()
  const inviteToken = String((event && event.inviteToken) || '').trim()
  const invitedBy = String((event && event.invitedBy) || '').trim()
  const inviteSource = String((event && event.inviteSource) || 'qr').trim()
  const inviterUserId = String((event && event.inviterUserId) || invitedBy || '').trim()
  const invitedUserId = OPENID  // 强制使用服务端 OPENID，不信任客户端传入

  if (!orderId || !inviteToken || !inviterUserId || !invitedUserId) {
    return { ok: false, error: 'MISSING_REQUIRED_FIELDS' }
  }
  if (inviterUserId === invitedUserId) {
    return { ok: true, saved: false, reused: false, skipped: 'SELF_INVITE' }
  }

  const res = await collection.where({ orderId }).limit(1).get()
  const existing = res && res.data && res.data[0]
  if (existing) {
    return {
      ok: true,
      saved: false,
      reused: true,
      relation: existing,
    }
  }

  const createdAt = nowIso()
  const relation = {
    orderId,
    inviteToken,
    invitedBy,
    inviteSource,
    inviterUserId,
    invitedUserId,
    createdAt,
    updatedAt: createdAt,
  }
  await collection.add({ data: relation })

  return {
    ok: true,
    saved: true,
    reused: false,
    relation,
  }
}
