/**
 * 企业微信客服接入工具
 * corpId / kfId 在此统一维护，不散落在各页面
 */
const CORP_ID = 'ww5f537cd92f616d89'
const KF_URL  = 'https://work.weixin.qq.com/kfid/kfcc1cb3f27aba13ad2'

/**
 * 打开企业微信客服对话框
 * @param {object} [opts]
 * @param {string} [opts.title]   发送消息卡片标题（可选）
 */
function openWecom(opts) {
  const title = (opts && opts.title) || '上手吧·客服'
  wx.openCustomerServiceChat({
    extInfo:          { url: KF_URL },
    corpId:           CORP_ID,
    showMessageCard:  true,
    sendMessageTitle: title,
    fail() {
      wx.setClipboardData({
        data: KF_URL,
        success() {
          wx.showToast({ title: '客服链接已复制', icon: 'none', duration: 2000 })
        },
      })
    },
  })
}

module.exports = { openWecom }
