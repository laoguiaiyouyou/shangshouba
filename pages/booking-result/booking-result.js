Page({
  data: {
    nodeName: '',
    dateLabel: '',
    slot: '',
  },

  onLoad(options) {
    const nodeName = options.node ? decodeURIComponent(options.node) : ''
    const dateLabel = options.date ? decodeURIComponent(options.date) : ''
    const slot = options.slot ? decodeURIComponent(options.slot) : ''
    this.setData({ nodeName, dateLabel, slot })
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => { wx.reLaunch({ url: '/pages/mine/mine' }) } })
  },

  goMine() {
    wx.reLaunch({ url: '/pages/mine/mine' })
  },
})
