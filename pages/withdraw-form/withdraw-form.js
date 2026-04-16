Page({
  data: {
    showWithdrawModal: false,
    amount: '',
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
  },

  fillAll() {
    this.setData({ amount: '320.00' })
  },

  openWithdrawModal() {
    if (!this.data.amount) {
      wx.showToast({ title: '请输入提现金额', icon: 'none', duration: 1500 })
      return
    }
    this.setData({ showWithdrawModal: true })
  },

  closeWithdrawModal() {
    this.setData({ showWithdrawModal: false })
  },

  submitWithdraw() {
    this.setData({ showWithdrawModal: false })
    wx.showToast({ title: '提现申请已提交', icon: 'success', duration: 1500 })
  },

  goBack() {
    wx.navigateBack({ fail: () => { wx.redirectTo({ url: '/pages/withdraw/withdraw' }) } })
  },
})
