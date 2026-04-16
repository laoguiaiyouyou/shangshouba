Page({
  data: {
    showWithdrawModal: false,
    withdrawableAmount: 0,
    pendingAmount: 0,
    withdrawRecords: [],
    refundList: [],
    loading: true,
  },

  onShow() {
    this.loadWallet()
    this.loadRefundList()
  },

  loadWallet() {
    wx.cloud.callFunction({
      name: 'getWalletBalance',
      success: (res) => {
        const r = res && res.result
        if (r && r.ok) {
          this.setData({
            withdrawableAmount: r.withdrawableBalance || 0,
            pendingAmount:      r.pendingAmount || 0,
            withdrawRecords:    r.records || [],
            loading: false,
          })
        } else {
          this.setData({ loading: false })
        }
      },
      fail: () => {
        this.setData({ loading: false })
      },
    })
  },

  loadRefundList() {
    wx.cloud.callFunction({
      name: 'listMyOrders',
      success: (res) => {
        const orders = (res && res.result && res.result.list) || []
        const refundList = orders
          .filter(o => o.status === '退款处理中' || o.status === '已退款')
          .map(o => ({
            name:   o.serviceType || '深度开荒',
            date:   o.serviceDate || '',
            amount: o.totalPrice  ? `¥${Number(o.totalPrice).toFixed(2)}` : '',
            status: o.status,
          }))
        this.setData({ refundList })
      },
    })
  },

  openWithdrawModal() {
    if (this.data.withdrawableAmount <= 0) {
      wx.showToast({ title: '暂无可提现金额', icon: 'none' })
      return
    }
    this.setData({ showWithdrawModal: true })
  },

  closeWithdrawModal() {
    this.setData({ showWithdrawModal: false })
  },

  confirmWithdraw() {
    this.setData({ showWithdrawModal: false })
    wx.showLoading({ title: '提交中' })
    wx.cloud.callFunction({
      name: 'requestWithdrawal',
      success: (res) => {
        wx.hideLoading()
        const r = res && res.result
        if (r && r.ok) {
          wx.showToast({ title: '提现申请已提交', icon: 'success' })
          this.loadWallet()
        } else {
          const msg = (r && r.error) === 'INVALID_AMOUNT' ? '余额不足' : '申请失败，请重试'
          wx.showToast({ title: msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
      },
    })
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail() { wx.redirectTo({ url: '/pages/mine/mine' }) },
    })
  },
})
