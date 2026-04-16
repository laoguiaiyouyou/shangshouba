const wecom = require('../../utils/wecom')
const STORAGE_KEY = 'myCoupons'
const ORDERS_STORAGE_KEY = 'myOrders'

const STATUS = {
  AVAILABLE: 'available',
  EXPIRING_SOON: 'expiring_soon',
  LOCKED: 'locked',
  USED: 'used',
  EXPIRED: 'expired',
}

Page({
  data: {
    coupons: [],
    countAvailable: 0,
    countExpiringSoon: 0,
    countUsed: 0,
    countExpired: 0,
    isEmpty: false,
    highlightCouponId: '',
    showUseModal: false,
    useModalCoupon: null,
    showSubmitModal: false,
    submitCoupon: null,
  },
  _highlightTimer: null,

  onLoad(options) {
    this._seedMockIfEmpty()
    const couponId = options.couponId ? String(options.couponId) : ''
    if (couponId) {
      this._ensureFromLink(couponId)
      this.setData({ highlightCouponId: couponId })
      this._scheduleClearHighlight()
    }
    this._refreshAll()
    if (couponId) this._scrollToHighlight(couponId)
  },

  onShow() {
    this._refreshAll()
  },

  onUnload() {
    if (this._highlightTimer) {
      clearTimeout(this._highlightTimer)
      this._highlightTimer = null
    }
  },

  _readCoupons() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  _writeCoupons(list) {
    try {
      wx.setStorageSync(STORAGE_KEY, list)
    } catch (e) {
      // ignore
    }
  },

  _readOrders() {
    try {
      const raw = wx.getStorageSync(ORDERS_STORAGE_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  _writeOrders(list) {
    try {
      wx.setStorageSync(ORDERS_STORAGE_KEY, list)
    } catch (e) {
      // ignore
    }
  },

  /** 链接进入：couponId 已存在则只高亮定位，不存在才新增（禁止重复入库） */
  _ensureFromLink(couponId) {
    if (!couponId) return
    const list = this._readCoupons()
    const exists = list.find(c => c.couponId === couponId)
    if (!exists) {
      list.unshift({
        couponId,
        couponTitle: '专属优惠券',
        benefitText: '立减优惠',
        thresholdText: '',
        scopeText: '适用服务详见券内说明',
        sourceText: '活动领取',
        expireAt: '',
        status: STATUS.AVAILABLE,
        actionText: '去使用',
        actionType: 'use',
        isPromotedOnHome: false,
      })
      this._writeCoupons(list)
    }
  },

  _seedMockIfEmpty() {
    const existing = this._readCoupons()
    if (existing.length > 0) return
    const mock = [
      {
        couponId: 'coupon-formaldehyde-500',
        couponTitle: '除甲醛优惠券',
        benefitText: '减 ¥500',
        thresholdText: '满3000元可用',
        scopeText: '限除甲醛服务使用',
        sourceText: '平台发放',
        expireAt: '2026-12-31',
        status: STATUS.AVAILABLE,
        actionText: '去使用',
        actionType: 'use',
        isPromotedOnHome: true,
        promoPriority: 1,
      },
      {
        couponId: 'coupon-activity-001',
        couponTitle: '社群活动优惠券',
        benefitText: '减 ¥100',
        thresholdText: '',
        scopeText: '全服务通用',
        sourceText: '活动领取',
        expireAt: '2026-03-25',
        status: STATUS.EXPIRING_SOON,
        actionText: '去使用',
        actionType: 'use',
        isPromotedOnHome: false,
      },
      {
        couponId: 'coupon-referral-001',
        couponTitle: '转介绍奖励券',
        benefitText: '减 ¥200',
        thresholdText: '满1500元可用',
        scopeText: '全服务通用',
        sourceText: '转介绍奖励',
        expireAt: '2026-09-30',
        status: STATUS.AVAILABLE,
        actionText: '去使用',
        actionType: 'use',
        isPromotedOnHome: false,
      },
    ]
    this._writeCoupons(mock)
  },

  _refreshAll() {
    const raw = this._readCoupons()

    const sortedRaw = [...raw].sort((a, b) => {
      const order = { [STATUS.EXPIRING_SOON]: 0, [STATUS.AVAILABLE]: 1, [STATUS.USED]: 2, [STATUS.EXPIRED]: 3 }
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
    })

    const coupons = sortedRaw.map(c => ({
      ...c,
      statusText: this._statusText(c),
      btnText: this._btnText(c),
      btnDisabled: c.status === STATUS.USED || c.status === STATUS.EXPIRED || c.status === STATUS.LOCKED,
      isExpiringSoon: c.status === STATUS.EXPIRING_SOON,
      expireLine: c.expireAt ? `有效期至 ${c.expireAt}` : '长期有效',
    }))

    const countAvailable = raw.filter(c => c.status === STATUS.AVAILABLE).length
    const countExpiringSoon = raw.filter(c => c.status === STATUS.EXPIRING_SOON).length
    const countUsed = raw.filter(c => c.status === STATUS.USED).length
    const countExpired = raw.filter(c => c.status === STATUS.EXPIRED).length

    this.setData({
      coupons,
      countAvailable,
      countExpiringSoon,
      countUsed,
      countExpired,
      isEmpty: raw.length === 0,
    })
  },

  _statusText(c) {
    switch (c.status) {
      case STATUS.AVAILABLE: return '可用'
      case STATUS.EXPIRING_SOON: return '即将过期'
      case STATUS.LOCKED: return '已提交预约'
      case STATUS.USED: return '已使用'
      case STATUS.EXPIRED: return '已失效'
      default: return ''
    }
  },

  _btnText(c) {
    if (c.status === STATUS.LOCKED) return '已提交预约'
    if (c.status === STATUS.USED) return '已使用'
    if (c.status === STATUS.EXPIRED) return '已失效'
    return '下单预约'
  },

  _scrollToHighlight(couponId) {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select(`#cid-${couponId}`).boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec(res => {
        const rect = res[0]
        const scroll = res[1]
        if (rect && scroll != null) {
          wx.pageScrollTo({
            scrollTop: scroll.scrollTop + rect.top - 120,
            duration: 300,
          })
        }
      })
    }, 400)
  },

  _scheduleClearHighlight() {
    if (this._highlightTimer) clearTimeout(this._highlightTimer)
    this._highlightTimer = setTimeout(() => {
      this.setData({ highlightCouponId: '' })
      this._highlightTimer = null
    }, 2500)
  },

  onCouponAction(e) {
    const { id, status } = e.currentTarget.dataset
    if (!id || status === STATUS.USED || status === STATUS.EXPIRED || status === STATUS.LOCKED) return
    const raw = this._readCoupons()
    const c = raw.find(x => x.couponId === id)
    if (!c) return

    const orders = this._readOrders()
    const existingPending = orders.find(
      o => o.orderType === 'coupon_booking' && o.couponId === c.couponId && o.status === 'pending_contact'
    )
    if (existingPending) {
      wx.showToast({ title: '您已提交预约，请等待工作人员联系', icon: 'none' })
      return
    }

    this.setData({
      showSubmitModal: true,
      submitCoupon: {
        couponId: c.couponId,
        couponTitle: c.couponTitle,
      },
      showUseModal: false,
      useModalCoupon: null,
    })
  },

  closeSubmitModal() {
    this.setData({ showSubmitModal: false, submitCoupon: null })
  },

  confirmSubmitBooking() {
    const coupon = this.data.submitCoupon
    if (!coupon || !coupon.couponId) return

    const orders = this._readOrders()
    const existingPending = orders.find(
      o => o.orderType === 'coupon_booking' && o.couponId === coupon.couponId && o.status === 'pending_contact'
    )
    if (existingPending) {
      this.setData({ showSubmitModal: false, submitCoupon: null })
      wx.showToast({ title: '您已提交预约，请等待工作人员联系', icon: 'none' })
      return
    }

    const coupons = this._readCoupons().map(c => {
      if (c.couponId !== coupon.couponId) return c
      if (c.status === STATUS.LOCKED) return c
      return {
        ...c,
        status: STATUS.LOCKED,
      }
    })
    this._writeCoupons(coupons)

    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const record = {
      id: `coupon_booking_${coupon.couponId}_${now.getTime()}`,
      orderType: 'coupon_booking',
      couponId: coupon.couponId,
      title: `${coupon.couponTitle}预约`,
      status: 'pending_contact',
      statusText: '待联系确认',
      subText: `已使用优惠券：${coupon.couponTitle}`,
      createdAt,
    }
    this._writeOrders([record, ...orders])

    this.setData({ showSubmitModal: false, submitCoupon: null })
    this._refreshAll()
    wx.showToast({ title: '已提交预约，30分钟内会有工作人员联系您', icon: 'none' })
  },

  closeUseModal() {
    this.setData({ showUseModal: false, useModalCoupon: null })
  },

  goConsult() {
    this.setData({ showUseModal: false, useModalCoupon: null })
    wecom.openWecom({ title: '权益咨询' })
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.navigateTo({ url: '/pages/welfare-center/welfare-center' }),
    })
  },
})
