const wecom = require('../../utils/wecom')

Page({
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.navigateTo({ url: '/pages/checkout/checkout' })
      },
    })
  },

  goEnterpriseWechat() {
    wecom.openWecom({ title: '特殊面积咨询' })
  },
})
