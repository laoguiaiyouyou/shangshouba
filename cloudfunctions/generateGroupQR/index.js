/**
 * generateGroupQR — 为已有团重新生成小程序码
 *
 * 输入：groupId, envVersion
 * 输出：{ ok, url, inviteLink }
 *
 * scene = "s=<shortCode>"，指向 pages/group-landing/group-landing
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const GROUP_SHORT_CODE_LENGTH = 6
const WXACODE_ENV_VERSION = 'trial'

function isCollectionMissing(error, collectionName) {
  const message = String(
    (error && (error.errMsg || error.message || error.stack || error)) || ''
  )
  return (
    message.includes('-502005') ||
    message.includes('ResourceNotFound') ||
    message.includes('database collection not exists') ||
    message.includes(`Db or Table not exist: ${collectionName}`)
  )
}

function genGroupShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = 'g'
  for (let i = 0; i < GROUP_SHORT_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function safeShortcutQuery(where) {
  try {
    return await db.collection('invite_shortcuts').where(where).limit(1).get()
  } catch (e) {
    if (isCollectionMissing(e, 'invite_shortcuts')) return { data: [] }
    throw e
  }
}

async function ensureGroupShortCode({ groupId, communityName, status = 'active' }) {
  const existingRes = await safeShortcutQuery({ type: 'group', groupId })
  const existing = existingRes.data && existingRes.data[0]
  if (existing && existing.shortCode) return existing.shortCode

  for (let i = 0; i < 8; i++) {
    const shortCode = genGroupShortCode()
    const conflictRes = await safeShortcutQuery({ type: 'group', shortCode })
    if (conflictRes.data && conflictRes.data[0]) continue

    await db.collection('invite_shortcuts').add({
      data: {
        type: 'group',
        shortCode,
        groupId,
        communityName,
        createdAt: new Date().toISOString(),
        status,
      },
    })
    return shortCode
  }

  throw new Error('GROUP_SHORT_CODE_CONFLICT')
}

function buildInviteLink(groupId, communityName) {
  const params = [
    `groupId=${encodeURIComponent(groupId)}`,
    `groupMode=community_group`,
    'entry=share',
  ]
  if (communityName) params.push(`communityName=${encodeURIComponent(communityName)}`)
  return `/pages/group-landing/group-landing?${params.join('&')}`
}

exports.main = async (event) => {
  const { groupId } = event || {}
  if (!groupId) return { ok: false, error: 'MISSING_GROUP_ID' }

  let communityName = ''
  let groupStatus = 'open'
  let shortCode = ''
  try {
    const groupRes = await db.collection('groups').doc(groupId).get()
    communityName = String(groupRes && groupRes.data && groupRes.data.communityName || '').trim()
    groupStatus = String(groupRes && groupRes.data && groupRes.data.status || 'open')
  } catch (e) {}

  const inviteLink = buildInviteLink(groupId, communityName)

  try {
    shortCode = await ensureGroupShortCode({ groupId, communityName, status: groupStatus })
    const scene = 's=' + shortCode
    const qrResult = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page:        'pages/group-landing/group-landing',
      check_path:  false,
      width:       280,
      is_hyaline:  false,
      env_version: WXACODE_ENV_VERSION,
    })

    const fileName     = 'group_qr/' + groupId + '_' + Date.now() + '.jpg'
    const uploadResult = await cloud.uploadFile({ cloudPath: fileName, fileContent: qrResult.buffer })
    const { fileList } = await cloud.getTempFileURL({ fileList: [uploadResult.fileID] })
    const url          = (fileList[0] && fileList[0].tempFileURL) || ''

    return { ok: true, url, inviteLink, communityName, groupMode: 'community_group', shortCode }
  } catch (e) {
    return {
      ok:         true,
      url:        '',
      inviteLink,
      communityName,
      groupMode:  'community_group',
      shortCode,
      qrError:    String(e.errCode || e.message || e),
    }
  }
}
