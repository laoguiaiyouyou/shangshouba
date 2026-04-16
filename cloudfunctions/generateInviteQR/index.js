const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 生成 6 位大写字母数字短码（约 20 亿种组合，足够用）
function genShortCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

exports.main = async (event) => {
  const { inviteToken, envVersion } = event || {}
  if (!inviteToken) return { ok: false, error: 'MISSING_INVITE_TOKEN' }

  // 供复制分享的完整链接（保持不变）
  const inviteLink = `/pages/checkout/checkout?inviteToken=${encodeURIComponent(inviteToken)}`

  // 生成短码并写库（shortCode → inviteToken 的映射）
  const shortCode = genShortCode()
  const scene = 'i=' + shortCode   // 如 "i=ABC123"，仅 8 字符，全为合法字符

  try {
    await db.collection('invite_shortcuts').add({
      data: { shortCode, inviteToken, createdAt: new Date().toISOString() },
    })
  } catch (e) {
    // 写库失败不阻断，仍尝试生成二维码
  }

  // 生成小程序码
  try {
    const qrResult = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page: 'pages/checkout/checkout',  // 不带前导 /，不带参数
      check_path: false,
      width: 280,
      is_hyaline: false,
      // 先固定走体验版，避免命中正式版页面校验
      env_version: envVersion || 'trial',
    })

    const fileName = 'qr/invite_' + shortCode + '_' + Date.now() + '.jpg'
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: qrResult.buffer,
    })
    const { fileList } = await cloud.getTempFileURL({ fileList: [uploadResult.fileID] })
    return { ok: true, url: fileList[0].tempFileURL, inviteLink, shortCode }
  } catch (e) {
    // 权限未开通或参数错误：降级到链接分享
    return {
      ok: true,
      url: '',
      inviteLink,
      shortCode,
      qrNotReady: true,
      qrError: String(e.errCode || e.message || e),
    }
  }
}
