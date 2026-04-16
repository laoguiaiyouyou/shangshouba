Page({
  data: {
    nodeName: '',
  },

  onLoad(options) {
    const nodeName = options.node ? decodeURIComponent(options.node) : ''
    this.setData({ nodeName })
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => { wx.reLaunch({ url: '/pages/mine/mine' }) } })
  },

  contactService() {
    wx.showToast({ title: '客服将在 30 分钟内联系您', icon: 'none', duration: 2000 })
  },
})
