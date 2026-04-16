// 返还方式：1户/3户（现金线，二选一）与 10户免单（独立线）可同时选定；选择门槛与激活门槛分离。
const STORAGE_KEY = 'welfareRebatePrefs'

/** 与 coupon-list 一致，仅用于只读统计 */
const COUPON_STATUS = {
  AVAILABLE: 'available',
  EXPIRING_SOON: 'expiring_soon',
  LOCKED: 'locked',
  USED: 'used',
  EXPIRED: 'expired',
}

/** 与 gift-service 一致，仅用于只读统计 */
const GIFT_STATUS = {
  PENDING_CLAIM: 'pending_claim',
  PENDING_BOOK: 'pending_book',
  BOOKED: 'booked',
  USED: 'used',
  EXPIRED: 'expired',
}

const MY_COUPONS_KEY = 'myCoupons'
const GIFT_SERVICE_CARDS_KEY = 'giftServiceCards'
const MY_ORDERS_KEY = 'myOrders'

Page({
  data: {
    withdrawableBalance: 0,
    pendingActivateAmount: 0,
    availableActivatedCount: 0,
    hasValidOrder: false,
    /** 本人订单实付（10户免单线用，模拟） */
    orderPaidAmount: 0,
    referrals: [],
    /** '1' | '3' | null — 仅现金返现线 */
    cashModeSelected: null,
    /** 10户免单线是否已确认选择 */
    tenModeSelected: false,
    /** 预留：现金线是否已兑现/已核销（模式卡展示用） */
    cashModeSettled: false,
    /** 预留：10户线是否已兑现/已核销 */
    tenModeSettled: false,
    rebateMode: '1',
    showInviteModeSheet: false,
    modeCardsDual: [],
    modeCardsSingle: [],
    /** 聚合文案：与 coupon-list 同源 myCoupons，只读不回写 */
    couponEquityLine: '可用 0 张 · 即将过期 0 张',
    /** 聚合文案：与 gift-service 同源 giftServiceCards，只读不回写 */
    giftEquityLine: '可用 0 次 · 已用 0 次',
  },

  onLoad() {
    this.loadWelfareData()
  },

  onShow() {
    this.loadWelfareData()
  },

  _readPrefs() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY)
      if (!raw || typeof raw !== 'object') return {}
      return raw
    } catch (e) {
      return {}
    }
  },

  _writePrefs(partial) {
    try {
      const cur = this._readPrefs()
      wx.setStorageSync(STORAGE_KEY, { ...cur, ...partial })
    } catch (e) {
      // ignore
    }
  },

  _migrateVoucherUsed(prefs) {
    const vu = prefs.voucherUsed
    if (!vu || typeof vu !== 'object') return prefs
    const next = { ...prefs }
    if (!next.cashModeSelected) {
      if (vu['1']) next.cashModeSelected = '1'
      else if (vu['3']) next.cashModeSelected = '3'
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'tenModeSelected') && vu['10']) {
      next.tenModeSelected = true
    }
    return next
  },

  /** 只读 myCoupons；缺失或非数组 → []；不回写 */
  _readCouponsOnly() {
    try {
      const raw = wx.getStorageSync(MY_COUPONS_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  /** 只读 giftServiceCards；缺失或非数组 → []；不回写 */
  _readGiftCardsOnly() {
    try {
      const raw = wx.getStorageSync(GIFT_SERVICE_CARDS_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  /** 只读 myOrders；与 mine 同源；本页仅契约层读取，不回写、本轮不写入权益文案 */
  _readMyOrdersOnly() {
    try {
      const raw = wx.getStorageSync(MY_ORDERS_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  /**
   * 优惠券聚合行：与 coupon-list 统计口径一致（available / expiring_soon）
   */
  _buildCouponEquityLine(coupons) {
    const list = Array.isArray(coupons) ? coupons : []
    const nAvail = list.filter(c => c && c.status === COUPON_STATUS.AVAILABLE).length
    const nSoon = list.filter(c => c && c.status === COUPON_STATUS.EXPIRING_SOON).length
    return `可用 ${nAvail} 张 · 即将过期 ${nSoon} 张`
  },

  /**
   * 赠送服务聚合行：与 gift-service 一致
   * - 已用：status === used
   * - 可用：待领取/待预约/已预约且未过期（非 used、非 expired、非 expired 标记）
   */
  _buildGiftEquityLine(cards) {
    const list = Array.isArray(cards) ? cards : []
    const isExpired = c =>
      !c ||
      c.status === GIFT_STATUS.EXPIRED ||
      c.expired === true
    const nUsed = list.filter(c => c && c.status === GIFT_STATUS.USED).length
    const nAvail = list.filter(
      c =>
        c &&
        !isExpired(c) &&
        c.status !== GIFT_STATUS.USED &&
        [GIFT_STATUS.PENDING_CLAIM, GIFT_STATUS.PENDING_BOOK, GIFT_STATUS.BOOKED].includes(c.status)
    ).length
    return `可用 ${nAvail} 次 · 已用 ${nUsed} 次`
  },

  loadWelfareData() {
    // 模拟数据：activated 表示该户已达成条件且深处理完成（可参与激活判断）
    const referrals = [
      { id: 'r1', name: '王女士', orderStatus: '已完成', amount: 160, activated: true, withdrawn: false },
      { id: 'r2', name: '李先生', orderStatus: '服务中', amount: 170, activated: false, withdrawn: false },
    ]

    let prefs = this._migrateVoucherUsed(this._readPrefs())
    const cashModeSelected = prefs.cashModeSelected === '1' || prefs.cashModeSelected === '3' ? prefs.cashModeSelected : null
    const tenModeSelected = !!prefs.tenModeSelected
    const cashModeSettled = !!prefs.cashModeSettled
    const tenModeSettled = !!prefs.tenModeSettled

    const hasValidOrder = false
    const orderPaidAmount = 2200

    const activatedList = referrals.filter(r => r.activated)
    const availableActivatedCount = activatedList.length

    const amounts = this._computeRebateAmounts({
      referrals,
      cashModeSelected,
      tenModeSelected,
      hasValidOrder,
      orderPaidAmount,
    })

    void this._readMyOrdersOnly()

    const couponsRaw = this._readCouponsOnly()
    const cardsRaw = this._readGiftCardsOnly()
    const couponEquityLine = this._buildCouponEquityLine(couponsRaw)
    const giftEquityLine = this._buildGiftEquityLine(cardsRaw)

    const rebateMode = cashModeSelected || '1'

    this.setData({
      referrals,
      withdrawableBalance: amounts.withdrawableBalance,
      pendingActivateAmount: amounts.pendingActivateAmount,
      availableActivatedCount,
      hasValidOrder,
      orderPaidAmount,
      cashModeSelected,
      tenModeSelected,
      cashModeSettled,
      tenModeSettled,
      rebateMode,
      couponEquityLine,
      giftEquityLine,
    })
    this._refreshModeCards()
  },

  /**
   * 现金线与10户线分别按规则计算后汇总（不因「只选了一个模式」而覆盖另一条线）
   */
  _computeRebateAmounts({ referrals, cashModeSelected, tenModeSelected, hasValidOrder, orderPaidAmount }) {
    const deepDone = referrals.filter(r => r.activated)
    const deepPending = referrals.filter(r => !r.activated)
    const n = deepDone.length

    const cap = 2500
    const orderPart = Math.max(0, Math.min(orderPaidAmount || 0, cap))

    let cashPendingFromRefs = 0
    let withdrawableFromRefs = 0

    if (cashModeSelected === '1') {
      if (n >= 1) {
        withdrawableFromRefs = deepDone.reduce(
          (s, r) => (r.withdrawn === true ? s : s + (r.amount || 0)),
          0
        )
        cashPendingFromRefs = deepPending.reduce((s, r) => s + (r.amount || 0), 0)
      } else {
        cashPendingFromRefs = referrals.reduce((s, r) => s + (r.amount || 0), 0)
      }
    } else if (cashModeSelected === '3') {
      if (n >= 3) {
        withdrawableFromRefs = deepDone.reduce(
          (s, r) => (r.withdrawn === true ? s : s + (r.amount || 0)),
          0
        )
        cashPendingFromRefs = deepPending.reduce((s, r) => s + (r.amount || 0), 0)
      } else {
        cashPendingFromRefs = referrals.reduce((s, r) => s + (r.amount || 0), 0)
      }
    }

    const tenWithdrawable = tenModeSelected && n >= 10 && hasValidOrder ? orderPart : 0
    const tenPending = tenModeSelected && !(n >= 10 && hasValidOrder) ? orderPart : 0

    return {
      withdrawableBalance: withdrawableFromRefs + tenWithdrawable,
      pendingActivateAmount: cashPendingFromRefs + tenPending,
    }
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.reLaunch({ url: '/pages/mine/mine' })
      },
    })
  },

  goWithdraw() {
    const {
      withdrawableBalance,
      pendingActivateAmount,
      cashModeSelected,
      tenModeSelected,
      availableActivatedCount,
    } = this.data

    let content = ''
    if (withdrawableBalance > 0) {
      content = `当前可提现约 ¥${withdrawableBalance}，待激活约 ¥${pendingActivateAmount}。是否前往提现？`
    } else if (pendingActivateAmount > 0) {
      content = '尚有返现待激活（未满足所选模式的激活条件或未完成绑定）。是否仍要查看提现说明？'
    } else if ((cashModeSelected || tenModeSelected) && availableActivatedCount === 0) {
      content = '已选定返还方式后，需邀请客户完成处理并满足激活条件，返现才会进入可提现余额。'
    } else {
      content = '暂无可提现金额，去邀请好友赚取返现吧。'
    }

    if (withdrawableBalance > 0) {
      wx.navigateTo({ url: '/pages/withdraw/withdraw' })
    } else {
      wx.showToast({ title: content || '暂无可提现金额', icon: 'none', duration: 2000 })
    }
  },

  goInvite() {
    const { cashModeSelected, tenModeSelected } = this.data
    const parts = []
    if (cashModeSelected === '1') parts.push('1户返现')
    else if (cashModeSelected === '3') parts.push('3户返现')
    if (tenModeSelected) parts.push('10户免单')
    const modeText = parts.length ? parts.join(' + ') : '默认邀请'
    wx.showToast({ title: `开始邀请：${modeText}`, icon: 'none' })
  },

  goGiftService() {
    wx.navigateTo({ url: '/pages/gift-service/gift-service' })
  },

  goCouponList() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' })
  },

  selectRebateMode(e) {
    const { mode } = e.currentTarget.dataset
    if (mode !== '1' && mode !== '3' && mode !== '10') return
    const state = this._getModeDisplayState(String(mode))
    if (state === 'mutex' || state === 'settled') return
    this.setData({ rebateMode: String(mode) })
  },

  openInviteModeSheet() {
    const { cashModeSelected } = this.data
    this.setData({
      rebateMode: cashModeSelected || '1',
      showInviteModeSheet: true,
    })
    this._refreshModeCards()
  },

  closeInviteModeSheet() {
    this.setData({ showInviteModeSheet: false })
  },

  confirmInviteMode() {
    const { rebateMode } = this.data
    const state = this._getModeDisplayState(rebateMode)
    if (state === 'mutex' || state === 'settled') return
    if (state === 'selected') {
      wx.showToast({ title: '该返还方式已选定', icon: 'none' })
      return
    }

    let content = ''
    if (rebateMode === '1') {
      content = '确认选择 1户返现模式后，3户返现模式将互斥不可选；10户免单模式不受影响。是否继续？'
    } else if (rebateMode === '3') {
      content = '确认选择 3户返现模式后，1户返现模式将互斥不可选；10户免单模式不受影响。是否继续？'
    } else if (rebateMode === '10') {
      content = '确认选择 10户免单模式？不影响后续在 1户 与 3户 之间的二选一。是否继续？'
    } else {
      return
    }

    if (rebateMode === '1' || rebateMode === '3') {
      this._writePrefs({ cashModeSelected: rebateMode })
    } else if (rebateMode === '10') {
      this._writePrefs({ tenModeSelected: true })
    }
    this.setData({ showInviteModeSheet: false })
    this.loadWelfareData()
    this.goInvite()
  },

  _getModeDisplayState(mode) {
    const { cashModeSelected, tenModeSelected, cashModeSettled, tenModeSettled } = this.data
    if (mode === '1') {
      if (cashModeSettled) return 'settled'
      if (cashModeSelected === '1') return 'selected'
      if (cashModeSelected === '3') return 'mutex'
      return 'unselected'
    }
    if (mode === '3') {
      if (cashModeSettled) return 'settled'
      if (cashModeSelected === '3') return 'selected'
      if (cashModeSelected === '1') return 'mutex'
      return 'unselected'
    }
    if (mode === '10') {
      if (tenModeSettled) return 'settled'
      if (tenModeSelected) return 'selected'
      return 'unselected'
    }
    return 'unselected'
  },

  _refreshModeCards() {
    const modeCards = [
      { key: '1', title: '1户返现模式', lines: ['返 ¥100/户', '同栋楼 +¥50/户'] },
      { key: '3', title: '3户返现模式', lines: ['返 ¥130/户', '同栋楼 +¥50/户'] },
      { key: '10', title: '10户免单模式', lines: ['订单实付全额返还', '封顶¥2500'] },
    ].map(card => ({ ...card, state: this._getModeDisplayState(card.key) }))

    this.setData({
      modeCardsDual: modeCards.filter(c => c.key === '1' || c.key === '3'),
      modeCardsSingle: modeCards.filter(c => c.key === '10'),
    })
  },
})
