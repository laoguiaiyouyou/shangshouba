const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 返回调用方的真实微信 openId。
 * 云开发 getWXContext() 在服务端执行，不依赖 wx.login code，无需额外权限。
 */
exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { ok: false, error: 'NO_OPENID' }
  }
  return { ok: true, openId: OPENID }
}
