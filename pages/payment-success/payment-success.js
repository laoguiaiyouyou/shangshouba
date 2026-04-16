const orderContext = require('../../utils/order-context')

Page({
  data: {
    orderId: '',
    inviteCode: '',
    orderName: '',
    orderArea: '',
    communityName: '',
    roomNo: '',
    serviceDate: '',
    totalPrice: 0,
    loadError: '',
    pathType: '',
    inviteBackAmount: 0,
    // 团购身份
    isGroupMode: false,
    groupDiscountPerSqm: 0,
    groupDiscount: 0,
    groupId: '',
    showQRModal: false,
    qrCodeUrl: '',
    qrInviteLink: '',   // 链接模式兜底
    qrCodeLoading: false,
  },

  onLoad(options) {
    if (options && options.orderId) {
      this._routeOrderId = decodeURIComponent(options.orderId)
    }
  },

  onShow() {
    this.ensureOrderReady()
  },

  async ensureOrderReady() {
    if (this._ensurePromise) return this._ensurePromise
    this._ensurePromise = this._doEnsureOrderReady()
    try { await this._ensurePromise } finally { this._ensurePromise = null }
  },

  async _doEnsureOrderReady() {
    const routeOrderId = this._routeOrderId || ''
    if (routeOrderId) {
      try {
        const result = await this._cloud('getOrderDetail', {
          orderId: routeOrderId,
          currentUser: orderContext.getCurrentUser(),
        })
        if (result && result.ok && result.order) {
          const order = orderContext.cacheServerOrder(result.order)
          if (order) {
            await this.saveInviteRelationIfNeeded(order, orderContext.getCurrentUser())
            orderContext.clearCheckoutDraft()
            orderContext.clearActiveInviteContext()
            this.setData({ loadError: '' })
            this.applyOrder(order)
            return
          }
        }
      } catch (e) {}
    }
    const draft = orderContext.getCheckoutDraft()
    let order = draft ? await this.createOrderViaCloud(draft) : orderContext.getCurrentOrder()
    if (!order) { this.setData({ loadError: '订单创建失败，请稍后重试' }); return }
    this.setData({ loadError: '' })
    this.applyOrder(order)
  },

  applyOrder(order) {
    const pathType = this._calcPathType(order.serviceDate)
    const areaNum  = parseFloat(String(order.orderArea || '').replace(/[^0-9.]/g, '')) || 0
    const groupDiscount     = Number(order.groupDiscount     || 0)
    const groupDiscountPerSqm = Number(order.groupDiscountPerSqm || 0)
    const groupId           = String(order.groupId           || '')
    const isGroupMode       = !!(groupId || groupDiscount > 0)
    // 团购模式下不展示邀约返现引导
    const inviteBackAmount  = (!isGroupMode && pathType === 'normal') ? parseFloat((areaNum * 2).toFixed(2)) : 0
    this.setData({
      orderId:      order.orderId      || '',
      orderName:    order.serviceType  || '深度开荒',
      orderArea:    order.orderArea    || '',
      communityName:order.communityName|| '',
      roomNo:       order.roomNo       || '',
      serviceDate:  order.serviceDate  || '',
      totalPrice:   order.totalPrice   || 0,
      pathType,
      inviteBackAmount,
      isGroupMode,
      groupDiscount,
      groupDiscountPerSqm,
      groupId,
    })
    // 加载当前用户自己的邀约码（非订单上被邀请方的 token）
    this._loadMyInviteCode()
  },

  _loadMyInviteCode() {
    const currentUser = orderContext.getCurrentUser()
    this._cloud('ensureInviteProfile', { currentUser: { userId: currentUser.userId } })
      .then(res => {
        if (res && res.ok && res.profile && res.profile.inviteToken) {
          this.setData({ inviteCode: res.profile.inviteToken })
        }
      })
      .catch(() => {})
  },

  _calcPathType(serviceDate) {
    if (!serviceDate) return 'normal'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days  = Math.round((new Date(serviceDate + 'T00:00:00') - today) / 86400000)
    return days >= 60 ? 'early_bird' : 'normal'
  },

  _cloud(name, data) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.callFunction) { reject(new Error('CLOUD_UNAVAILABLE')); return }
      wx.cloud.callFunction({ name, data, success: res => resolve(res && res.result ? res.result : {}), fail: reject })
    })
  },

  async saveInviteRelationIfNeeded(order, currentUser) {
    const inviteToken   = String(order.inviteToken  || '').trim()
    const invitedBy     = String(order.invitedBy    || '').trim()
    const invitedUserId = String((currentUser && currentUser.userId) || '').trim()
    if (!inviteToken || !invitedBy || !invitedUserId || invitedBy === invitedUserId) return
    try {
      await this._cloud('saveInviteRelation', {
        orderId: order.orderId, inviteToken, invitedBy,
        inviteSource: String(order.inviteSource || '').trim(),
        inviterUserId: invitedBy, invitedUserId,
      })
    } catch (e) { console.error('SAVE_INVITE_RELATION_FAILED', e) }
  },

  async createOrderViaCloud(draft) {
    const currentUser      = orderContext.getCurrentUser()
    const clientPaymentRef = draft.clientPaymentRef
      || orderContext.getPaymentCreateRef()
      || orderContext.buildClientPaymentRef(draft, currentUser)
    orderContext.savePaymentCreateRef(clientPaymentRef)
    try {
      const result = await this._cloud('createOrderAfterPayment', {
        clientPaymentRef, idempotencyKey: clientPaymentRef, draft, currentUser,
      })
      if (!result || !result.ok || !result.order || !result.order.orderId)
        throw new Error(result && result.error ? result.error : 'CREATE_ORDER_FAILED')
      const order = orderContext.cacheServerOrder(result.order)
      await this.saveInviteRelationIfNeeded(order, currentUser)
      orderContext.clearCheckoutDraft()
      orderContext.clearPaymentCreateRef()
      orderContext.clearActiveInviteContext()
      return order
    } catch (e) {
      wx.showToast({ title: '订单创建失败', icon: 'none', duration: 1800 })
      return null
    }
  },

  // ── 邀约二维码 ──

  async generateInviteQRCode() {
    // 先确保邀约码已就绪（按需加载，不依赖异步预加载是否完成）
    let { inviteCode } = this.data
    if (!inviteCode) {
      wx.showLoading({ title: '准备中…', mask: true })
      // 1. 云端拿（用真实 OPENID，不依赖客户端 userId）
      try {
        const cu  = orderContext.getCurrentUser()
        const res = await this._cloud('ensureInviteProfile', { currentUser: { userId: cu.userId } })
        if (res && res.ok && res.profile && res.profile.inviteToken) {
          inviteCode = res.profile.inviteToken
        }
      } catch (e) {}
      // 2. 兜底：本地生成（离线也能工作）
      if (!inviteCode) {
        const local = orderContext.getOrCreateInviteProfile()
        inviteCode = (local && local.inviteToken) || ''
      }
      if (inviteCode) this.setData({ inviteCode })
      wx.hideLoading()
    }
    if (!inviteCode) {
      wx.showToast({ title: '邀约码获取失败，请重试', icon: 'none' }); return
    }
    this.setData({ showQRModal: true, qrCodeLoading: true, qrCodeUrl: '', qrInviteLink: '' })
    this._cloud('generateInviteQR', { inviteToken: inviteCode })
      .then(result => {
        if (result && result.ok) {
          this.setData({
            qrCodeUrl: result.url || '',
            qrInviteLink: result.inviteLink || '',
            qrCodeLoading: false,
          })
        } else {
          this.setData({ qrCodeLoading: false })
          wx.showToast({ title: (result && result.error) || '生成失败，请重试', icon: 'none' })
        }
      })
      .catch(() => { this.setData({ qrCodeLoading: false }); wx.showToast({ title: '网络异常，请重试', icon: 'none' }) })
  },

  saveQRCode() {
    const { qrCodeUrl } = this.data
    if (!qrCodeUrl) return
    wx.downloadFile({
      url: qrCodeUrl,
      success: (res) => {
        if (res.statusCode !== 200) { wx.showToast({ title: '下载失败', icon: 'none' }); return }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => wx.openSetting({
            success: () => wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
            }),
          }),
        })
      },
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
    })
  },

  copyInviteLink() {
    const link = this.data.qrInviteLink
    if (!link) return
    const msg = `我在用「上手吧」做深度开荒，用这个链接进入下单可享新人优惠！${link}`
    wx.setClipboardData({ data: msg, success: () => wx.showToast({ title: '链接已复制', icon: 'success' }) })
  },

  closeQRModal() { this.setData({ showQRModal: false }) },

  // ── 导航 ──

  goBack()  { this.goOrder() },

  goOrder() {
    const { orderId } = this.data
    if (!orderId) return
    wx.reLaunch({
      url: `/pages/mine/mine?focusOrderId=${encodeURIComponent(orderId)}`,
      fail: () => wx.navigateTo({ url: orderContext.buildOrderDetailUrl(orderId) }),
    })
  },

  goHome()       { wx.redirectTo({ url: '/pages/index/index' }) },
  // 团购模式：查看开团进度（跳到我的开团 tab）
  goGroupBuyStatus() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=myteam' })
  },
  goInviteBack() {
    const { orderId } = this.data
    wx.navigateTo({ url: `/pages/group-invite/group-invite?mode=invite_back&orderId=${encodeURIComponent(orderId || '')}` })
  },
  goGroupBuy() {
    const { orderId } = this.data
    wx.navigateTo({ url: `/pages/group-invite/group-invite?mode=group_buy&orderId=${encodeURIComponent(orderId || '')}` })
  },
  goReferral() {
    const { orderId } = this.data
    wx.navigateTo({ url: `/pages/group-invite/group-invite?mode=referral&orderId=${encodeURIComponent(orderId || '')}` })
  },
})
