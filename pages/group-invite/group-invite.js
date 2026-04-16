/**
 * group-invite 页
 *
 * 两种入口：
 *  A. 首页拼团入口（无 orderId）→ Path 3 拼团模式
 *  B. 支付成功后入口（带 orderId）→ 根据订单日期：
 *       - 30天内  → Path 1 邀约后返模式
 *       - 30天以上 → 普通转介绍模式
 */
const orderContext = require('../../utils/order-context')

function parseArea(str) {
  const n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function calcPathType(serviceDate) {
  if (!serviceDate) return 'normal'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days  = Math.round((new Date(serviceDate + 'T00:00:00') - today) / 86400000)
  return days >= 60 ? 'early_bird' : 'normal'
}

function buildGroupLandingUrl({ scene = '', groupId = '', communityName = '', entry = '' } = {}) {
  const params = ['groupMode=community_group']
  const finalScene = String(scene || '').trim()
  const finalGroupId = String(groupId || '').trim()
  const finalCommunityName = String(communityName || '').trim()
  const finalEntry = String(entry || '').trim()

  if (finalScene) params.push(`scene=${encodeURIComponent(finalScene)}`)
  if (finalGroupId) params.push(`groupId=${encodeURIComponent(finalGroupId)}`)
  if (finalCommunityName) params.push(`communityName=${encodeURIComponent(finalCommunityName)}`)
  if (finalEntry) params.push(`entry=${encodeURIComponent(finalEntry)}`)

  return `/pages/group-landing/group-landing?${params.join('&')}`
}

Page({
  data: {
    mode: '',          // 'group_buy' | 'invite_back' | 'referral'
    // 订单信息
    orderId: '',
    orderName: '',
    communityName: '',
    serviceDate: '',
    orderArea: '',
    inviteBackAmount: 0,
    // 邀约 token（路径1/2共用）
    inviteCode: '',
    inviteLink: '',
    // Path 3：拼团
    groupId: '',
    groupStatus: '',   // 'open' | 'formed' | 'expired' | ''
    memberCount: 0,
    remainHours: 0,
    remainMinutes: 0,
    groupLink: '',
    groupLoading: false,
    // UI
    loading: true,
  },

  _countdownTimer: null,

  callCloudFunction(name, data) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        reject(new Error('CLOUD_UNAVAILABLE'))
        return
      }
      wx.cloud.callFunction({
        name, data,
        success: res => resolve(res && res.result ? res.result : {}),
        fail: reject,
      })
    })
  },

  async onLoad(options) {
    const orderId   = options.orderId ? decodeURIComponent(options.orderId) : ''
    const modeParam = options.mode   ? decodeURIComponent(options.mode)   : ''
    const redirected = await this._redirectLegacyGroupEntry(options, { orderId, modeParam })
    if (redirected) return

    if (modeParam === 'group_buy' || (!modeParam && !orderId)) {
      // Path 3 拼团模式
      if (orderId) this.setData({ orderId })
      await this._initGroupBuyMode(orderId)
    } else if (modeParam === 'invite_back' || modeParam === 'referral') {
      // payment-success 明确指定模式
      await this._initInviteMode(orderId, modeParam)
    } else if (orderId) {
      // 兼容：无 mode 但有 orderId，自动判断
      await this._initInviteMode(orderId)
    } else {
      await this._initGroupBuyMode('')
    }
    this.setData({ loading: false })
  },

  onUnload() {
    if (this._countdownTimer) clearInterval(this._countdownTimer)
  },

  _redirectToGroupLanding(url) {
    if (!url) return false
    wx.redirectTo({
      url,
      fail: () => {
        wx.reLaunch({ url })
      },
    })
    return true
  },

  async _redirectLegacyGroupEntry(options, { orderId = '', modeParam = '' } = {}) {
    if (modeParam === 'invite_back' || modeParam === 'referral') return false

    const rawScene = options && options.scene ? decodeURIComponent(options.scene) : ''
    const groupId = options && options.groupId ? decodeURIComponent(options.groupId) : ''
    const communityName = options && options.communityName ? decodeURIComponent(options.communityName) : ''
    const entry = rawScene
      ? 'scan'
      : (options && options.entry ? decodeURIComponent(options.entry) : 'share')

    if (rawScene || groupId) {
      return this._redirectToGroupLanding(buildGroupLandingUrl({
        scene: rawScene,
        groupId,
        communityName,
        entry,
      }))
    }

    const oid = orderId || (orderContext.getCurrentOrder() || {}).orderId || ''
    if (oid) {
      const current = orderContext.getCurrentOrder() || {}
      this.setData({
        orderId: oid,
        orderName: current.serviceType || '',
        communityName: current.communityName || communityName || '',
      })
      await this._loadExistingGroup(oid)
    }

    return this._redirectToGroupLanding(buildGroupLandingUrl({
      groupId: this.data.groupId || '',
      communityName: this.data.communityName || communityName,
      entry,
    }))
  },

  // ── Path 3 拼团模式 ────────────────────────────────────────────

  async _initGroupBuyMode(passedOrderId) {
    this.setData({ mode: 'group_buy' })
    // 优先用传入的 orderId，否则从缓存拿最近订单
    const oid = passedOrderId || (orderContext.getCurrentOrder() || {}).orderId || ''
    if (oid) {
      const current = orderContext.getCurrentOrder() || {}
      this.setData({ orderId: oid, orderName: current.serviceType || '', communityName: current.communityName || '' })
      await this._loadExistingGroup(oid)
    }
  },

  async _loadExistingGroup(orderId) {
    if (!orderId) return
    try {
      // 尝试创建/复用团（create 幂等）
      const res = await this.callCloudFunction('manageGroup', { action: 'create', orderId })
      if (res && res.ok && res.group) {
        this._applyGroup(res.group)
      }
    } catch (e) {
      // 无订单或未支付，不创建团
    }
  },

  _applyGroup(group) {
    const groupId   = group._id || ''
    const groupLink = `/pages/group-landing/group-landing?groupId=${encodeURIComponent(groupId)}`
    const remainMs  = Math.max(0, new Date(group.expiresAt) - Date.now())
    this.setData({
      groupId,
      groupStatus:  group.status || 'open',
      memberCount:  (group.members || []).length,
      remainHours:  Math.floor(remainMs / 3600000),
      remainMinutes: Math.floor((remainMs % 3600000) / 60000),
      groupLink,
    })
    if (group.status === 'open') this._startCountdown(new Date(group.expiresAt))
  },

  _startCountdown(expiresAt) {
    if (this._countdownTimer) clearInterval(this._countdownTimer)
    this._countdownTimer = setInterval(() => {
      const remainMs = Math.max(0, expiresAt - Date.now())
      this.setData({
        remainHours:   Math.floor(remainMs / 3600000),
        remainMinutes: Math.floor((remainMs % 3600000) / 60000),
      })
      if (remainMs <= 0) {
        clearInterval(this._countdownTimer)
        this.setData({ groupStatus: 'expired' })
      }
    }, 30000) // 每30秒刷新
  },

  async createGroup() {
    const { orderId, groupLoading } = this.data
    if (groupLoading) return
    if (!orderId) {
      wx.showToast({ title: '请先完成下单再开团', icon: 'none' })
      return
    }
    this.setData({ groupLoading: true })
    try {
      const res = await this.callCloudFunction('manageGroup', { action: 'create', orderId })
      if (res && res.ok && res.group) {
        this._applyGroup(res.group)
        wx.showToast({ title: '拼团已开启！', icon: 'success' })
      } else {
        const msg = (res && res.error === 'ORDER_NOT_PAID') ? '订单尚未支付' : '开团失败，请重试'
        wx.showToast({ title: msg, icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络异常', icon: 'none' })
    } finally {
      this.setData({ groupLoading: false })
    }
  },

  copyGroupLink() {
    const link = this.data.groupLink
    if (!link) return
    wx.setClipboardData({
      data: `我正在拼单「上手吧·深度开荒」，3人成团每人享¥2/㎡返现，24h有效！点这里加入：${link}`,
      success: () => wx.showToast({ title: '邀请链接已复制', icon: 'none' }),
    })
  },

  refreshGroupStatus() {
    const { groupId } = this.data
    if (!groupId) return
    this.callCloudFunction('manageGroup', { action: 'query', groupId })
      .then(res => {
        if (res && res.ok && res.group) this._applyGroup(res.group)
      })
      .catch(() => {})
  },

  goOrder() {
    wx.navigateTo({ url: '/pages/detail/detail' })
  },

  // ── Path 1 邀约后返 / 普通转介绍 ──────────────────────────────

  async _initInviteMode(orderId, forcedMode) {
    // 先加载订单信息
    let order = orderContext.getOrderById(orderId) || orderContext.getCurrentOrder()
    if (!order || order.orderId !== orderId) {
      try {
        const res = await this.callCloudFunction('getOrderDetail', {
          orderId,
          currentUser: orderContext.getCurrentUser(),
        })
        if (res && res.ok && res.order) order = res.order
      } catch (e) {}
    }

    const serviceDate  = (order && order.serviceDate) || ''
    const pathType     = calcPathType(serviceDate)
    const areaNum      = parseArea(order && order.orderArea)
    const inviteBackAmount = pathType === 'normal' ? parseFloat((areaNum * 2).toFixed(2)) : 0
    // forcedMode 优先，否则根据日期自动判断
    const mode = forcedMode || (pathType === 'normal' ? 'invite_back' : 'referral')

    this.setData({
      mode,
      orderId,
      orderName:    (order && order.serviceType) || '深度开荒',
      communityName: (order && order.communityName) || '',
      serviceDate,
      orderArea:    (order && order.orderArea) || '',
      inviteBackAmount,
    })

    // 生成邀约 token
    await this._loadInviteProfile()
  },

  async _loadInviteProfile() {
    let profile = null
    try {
      const currentUser = orderContext.getCurrentUser()
      const res = await this.callCloudFunction('ensureInviteProfile', {
        currentUser: { userId: currentUser.userId },
      })
      if (res && res.ok && res.profile && res.profile.inviteToken) {
        profile = orderContext.cacheInviteProfile(res.profile)
      }
    } catch (e) {}
    if (!profile) profile = orderContext.getOrCreateInviteProfile()

    const inviteCode = profile.inviteToken
    const inviteLink = `/pages/checkout/checkout?inviteToken=${encodeURIComponent(inviteCode)}`
    this.setData({ inviteCode, inviteLink })
  },

  copyInviteLink() {
    const { inviteLink, inviteBackAmount, mode } = this.data
    if (!inviteLink) return
    let msg = ''
    if (mode === 'invite_back') {
      msg = `我在用「上手吧」做深度开荒，用我的链接下单享专属优惠！${inviteLink}`
    } else {
      msg = `推荐你用「上手吧」深度开荒，专业靠谱！${inviteLink}`
    }
    wx.setClipboardData({
      data: msg,
      success: () => wx.showToast({ title: '邀约链接已复制', icon: 'none' }),
    })
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' }),
    })
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/mine/mine' })
    }
  },
})
