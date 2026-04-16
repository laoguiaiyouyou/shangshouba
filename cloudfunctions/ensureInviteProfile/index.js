const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const collection = db.collection('invite_profiles')

function nowIso() {
  return new Date().toISOString()
}

function buildInviteToken(userId) {
  return userId ? `qr_${userId}_stable` : ''
}

exports.main = async (event) => {
  // 优先用云端真实 OPENID，不依赖客户端传入的 userId
  const { OPENID } = cloud.getWXContext()
  const currentUser = event && event.currentUser ? event.currentUser : {}
  const userId = OPENID || String(currentUser.userId || event.userId || '').trim()
  if (!userId) {
    return { ok: false, error: 'MISSING_USER_ID' }
  }

  const res = await collection.where({ ownerUserId: userId }).limit(1).get()
  const existing = res && res.data && res.data[0]
  if (existing) {
    const nextToken = String(existing.inviteToken || buildInviteToken(userId))
    if (nextToken !== existing.inviteToken) {
      await collection.doc(existing._id).update({
        data: {
          inviteToken: nextToken,
          inviteSource: 'qr',
          updatedAt: nowIso(),
        },
      })
    }
    return {
      ok: true,
      created: false,
      profile: {
        ownerUserId: userId,
        inviteToken: nextToken,
        inviteSource: 'qr',
        createdAt: String(existing.createdAt || nowIso()),
        updatedAt: nowIso(),
      },
    }
  }

  const createdAt = nowIso()
  const profile = {
    ownerUserId: userId,
    inviteToken: buildInviteToken(userId),
    inviteSource: 'qr',
    createdAt,
    updatedAt: createdAt,
  }
  await collection.add({ data: profile })

  return {
    ok: true,
    created: true,
    profile,
  }
}
