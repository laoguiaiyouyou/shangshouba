const orderContext = require('../../utils/order-context')

Page({
  data: {
    reasons: ['计划有变', '暂不需要服务', '定了其他家'],
    selectedReason: 2,
    images: [],
    orderId: '',
    serviceDate: '',
    orderName: '',
    serviceArea: '',
    totalPrice: '',
    refundDeadlineText: '',
  },

  onLoad(options) {
    if (options.orderId) this.setData({ orderId: decodeURIComponent(options.orderId) })
    if (options.serviceDate) this.setData({ serviceDate: decodeURIComponent(options.serviceDate) })
    if (options.orderName) this.setData({ orderName: decodeURIComponent(options.orderName) })
    if (options.serviceArea) this.setData({ serviceArea: decodeURIComponent(options.serviceArea) })
    if (options.totalPrice) this.setData({ totalPrice: decodeURIComponent(options.totalPrice) })
    this.checkRefundPageAccess()
  },

  checkRefundPageAccess() {
    const serviceDate = this.data.serviceDate
    if (!serviceDate) return true

    const serviceTime = new Date(serviceDate.replace(/-/g, '/') + ' 00:00:00')
    const refundDeadline = new Date(serviceTime.getTime() - 72 * 60 * 60 * 1000)
    const now = new Date()

    if (now >= refundDeadline) {
      wx.showToast({ title: '退款申请已关闭（已超过开工前72小时）', icon: 'none', duration: 2000 })
      setTimeout(() => {
        const orderId = this.data.orderId || ''
        wx.navigateBack({
          delta: 1,
          fail() {
            wx.navigateTo({ url: orderId ? orderContext.buildOrderDetailUrl(orderId) : '/pages/order-detail/order-detail' })
          },
        })
      }, 2000)
      return false
    }

    const m = refundDeadline.getMonth() + 1
    const d = refundDeadline.getDate()
    const h = refundDeadline.getHours()
    const mm = String(refundDeadline.getMinutes()).padStart(2, '0')
    this.setData({ refundDeadlineText: m + '月' + d + '日 ' + h + ':' + mm + ' 前可申请' })
    return true
  },

  selectReason(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ selectedReason: Number(index) })
  },

  chooseImage() {
    wx.showToast({ title: '上传功能待接入', icon: 'none', duration: 1500 })
  },

  submitRefund() {
    const orderId = this.data.orderId || ''
    const reason = this.data.reasons[this.data.selectedReason] || ''

    if (!orderId) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' })
      return
    }
    if (!reason) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中' })

    wx.cloud.callFunction({
      name: 'applyRefund',
      data: { orderId, reason, images: [] },
      success: (res) => {
        wx.hideLoading()
        const result = res && res.result
        if (result && result.ok) {
          orderContext.updateOrderStatus(orderId, '退款处理中')
          wx.showToast({ title: '退款申请已提交', icon: 'success', duration: 1500 })
          setTimeout(() => { wx.navigateBack({ delta: 1 }) }, 1500)
        } else if (result && result.error === 'REFUND_WINDOW_CLOSED') {
          wx.showToast({ title: '退款申请已关闭', icon: 'none', duration: 1500 })
          setTimeout(() => { wx.navigateBack({ delta: 1 }) }, 1500)
        } else if (result && result.error === 'STATUS_NOT_REFUNDABLE') {
          wx.showToast({ title: '当前订单状态不支持退款', icon: 'none', duration: 1500 })
        } else {
          wx.showToast({ title: '提交失败，请重试', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
      },
    })
  },

  goBack() {
    const orderId = this.data.orderId || ''
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.navigateTo({ url: orderId ? orderContext.buildOrderDetailUrl(orderId) : '/pages/order-detail/order-detail' })
      },
    })
  },

  giveAnotherChance() {
    wx.showToast({
      title: '感谢您的信任，我们会继续为您服务',
      icon: 'none',
      duration: 1800,
    })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/index/index' })
    }, 1800)
  },
})
