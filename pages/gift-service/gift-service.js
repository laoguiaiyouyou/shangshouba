const STORAGE_KEY = 'giftServiceCards'
const ORDERS_STORAGE_KEY = 'myOrders'

const ORDER_TYPE_GIFT_BOOKING = 'gift_service_booking'

/** 实现层状态枚举（禁止用语义松散字符串分支） */
const STATUS = {
  PENDING_CLAIM: 'pending_claim',
  PENDING_BOOK: 'pending_book',
  BOOKED: 'booked',
  USED: 'used',
  EXPIRED: 'expired',
}

const BOOKING_TYPE = {
  MORNING_AFTERNOON: 'morning_afternoon',
  CONTACT_SERVICE: 'contact_service',
}

Page({
  data: {
    cards: [],
    countPendingClaim: 0,
    countPendingBook: 0,
    countBooked: 0,
    countUsed: 0,
    showClaimModal: false,
    showRulesModal: false,
    showBookPanel: false,
    showViewBookModal: false,
    minBookDate: '',
    bookDate: '',
    bookSlot: 'morning',
    bookingCardId: '',
    bookingType: BOOKING_TYPE.MORNING_AFTERNOON,
    bookPanelHint: '',
    viewBookCard: null,
    claimTargetId: '',
    claimModalCard: null,
    rulesModalCard: null,
    rulesModalEmpty: false,
    cardClickedForRulesId: '',
    lastOperatedCardId: '',
  },

  _claimSessionDismissed: false,
  _claimAutoOpened: false,

  onLoad(options) {
    this._claimSessionDismissed = false
    this._claimAutoOpened = false
    this._options = options || {}
    this._bootstrapFromLink(options || {})
    this._refreshAll()
    this._maybeAutoOpenClaimModal()
  },

  onShow() {
    this._refreshAll()
  },

  _readCards() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY)
      if (!Array.isArray(raw)) return []
      return raw.map(c => this._normalizeCard(c))
    } catch (e) {
      return []
    }
  },

  _writeCards(cards) {
    try {
      wx.setStorageSync(STORAGE_KEY, cards)
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

  _writeOrders(orders) {
    try {
      wx.setStorageSync(ORDERS_STORAGE_KEY, orders)
    } catch (e) {
      // ignore
    }
  },

  /** 同卡已存在有效赠送预约单（pending_contact / booked）则不可重复提交 */
  _hasActiveGiftBookingOrder(cardId) {
    if (!cardId) return false
    return this._readOrders().some(
      o =>
        o &&
        o.orderType === ORDER_TYPE_GIFT_BOOKING &&
        o.cardId === cardId &&
        (o.status === 'pending_contact' || o.status === 'booked')
    )
  },

  _formatCreatedAt() {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  },

  /** 兼容旧存储字段 */
  _normalizeCard(c) {
    if (!c || typeof c !== 'object') return c
    return {
      ...c,
      sourceText: c.sourceText != null ? c.sourceText : c.benefitTag || '社群赠送',
      ruleText: c.ruleText != null ? c.ruleText : c.bookRule || '详见活动说明。服务完成后自动核销。',
      minAdvanceDays: c.minAdvanceDays != null ? Number(c.minAdvanceDays) : 14,
      bookingType: c.bookingType || BOOKING_TYPE.MORNING_AFTERNOON,
      needBooking: c.needBooking !== false,
      bookingHint: c.bookingHint || '',
      bookedDate: c.bookedDate || '',
      bookedSlot: c.bookedSlot || '',
    }
  },

  /** 仅 claimId：无卡则插入一条链上权益（动态字段用通用占位，非写死单一保洁 SKU） */
  _bootstrapFromLink(options) {
    const claimId = options.claimId != null && String(options.claimId).trim()
    if (!claimId) return

    const cards = this._readCards().map(c => ({ ...c }))
    if (!cards.find(c => c.id === claimId)) {
      cards.push(this._newCardFromClaimLink(claimId))
      this._writeCards(cards)
    }
  },

  _newCardFromClaimLink(claimId) {
    return {
      id: claimId,
      status: STATUS.PENDING_CLAIM,
      serviceName: '赠送服务权益',
      sourceText: '社群活动赠送',
      ruleText:
        '本权益由社群活动发放，请在有效期内使用。\n预约需遵守活动公布的提前天数要求。\n服务完成后自动核销。',
      expireAt: '',
      needBooking: true,
      minAdvanceDays: 14,
      bookingType: BOOKING_TYPE.MORNING_AFTERNOON,
      bookingHint: '',
      bookedDate: '',
      bookedSlot: '',
    }
  },

  _setLastOperated(id) {
    if (id) this.setData({ lastOperatedCardId: id })
  },

  _openClaimModalForCard(c) {
    if (!c) return
    this.setData({
      showClaimModal: true,
      claimTargetId: c.id,
      claimModalCard: this._claimModalPayload(c),
    })
  },

  _claimModalPayload(c) {
    return {
      serviceName: c.serviceName || '赠送服务',
      ruleText: c.ruleText || '',
      expireLine: c.expireAt ? `有效期至：${c.expireAt}` : '',
    }
  },

  _refreshAll() {
    const cards = this._readCards()
    const sortedCards = cards.slice().sort((a, b) => {
      const order = {
        [STATUS.PENDING_CLAIM]: 0,
        [STATUS.PENDING_BOOK]: 1,
        [STATUS.BOOKED]: 2,
        [STATUS.USED]: 3,
        [STATUS.EXPIRED]: 4,
      }
      const oa = order[a.status] != null ? order[a.status] : 99
      const ob = order[b.status] != null ? order[b.status] : 99
      if (oa !== ob) return oa - ob

      const ea = a.expireAt ? String(a.expireAt) : ''
      const eb = b.expireAt ? String(b.expireAt) : ''
      if (ea && eb) return ea.localeCompare(eb)
      if (ea && !eb) return -1
      if (!ea && eb) return 1
      return 0
    })
    const countPendingClaim = cards.filter(c => c.status === STATUS.PENDING_CLAIM).length
    const countPendingBook = cards.filter(c => c.status === STATUS.PENDING_BOOK).length
    const countBooked = cards.filter(c => c.status === STATUS.BOOKED).length
    const countUsed = cards.filter(c => c.status === STATUS.USED).length

    const displayCards = sortedCards.map(c => ({
        ...c,
        statusText: this._statusText(c),
        actionType: this._actionType(c.status),
        btnText: this._btnText(c.status),
        btnDisabled: c.status === STATUS.USED || c.status === STATUS.EXPIRED || c.expired === true,
        showExpiredStyle: c.status === STATUS.EXPIRED || c.expired === true,
        expireLine: c.expireAt ? `有效期至 ${c.expireAt}` : '',
        bookedResultLine: this._bookedResultLine(c),
      }))

    this.setData({
      cards: displayCards,
      countPendingClaim,
      countPendingBook,
      countBooked,
      countUsed,
    })
  },

  /** contact_service 且已 booked 但未填日期：卡面主状态展示「待联系确认」（仍为 booked 枚举） */
  _statusText(c) {
    if (c.expired || c.status === STATUS.EXPIRED) return '已过期'
    switch (c.status) {
      case STATUS.PENDING_CLAIM:
        return '待领取'
      case STATUS.PENDING_BOOK:
        return '待预约'
      case STATUS.BOOKED:
        if (c.bookingType === BOOKING_TYPE.CONTACT_SERVICE && !c.bookedDate) return '待联系确认'
        return '已预约'
      case STATUS.USED:
        return '已使用'
      default:
        return ''
    }
  },

  _bookedResultLine(c) {
    if (c.status !== STATUS.BOOKED) return ''
    if (c.bookingType === BOOKING_TYPE.CONTACT_SERVICE && !c.bookedDate) return ''
    if (c.bookedDate) {
      return `已预约：${c.bookedDate} · ${c.bookedSlot === 'afternoon' ? '下午' : '上午'}`
    }
    return ''
  },

  _actionType(status) {
    switch (status) {
      case STATUS.PENDING_CLAIM:
        return 'claim'
      case STATUS.PENDING_BOOK:
        return 'book'
      case STATUS.BOOKED:
        return 'view_booking'
      case STATUS.USED:
      case STATUS.EXPIRED:
        return 'none'
      default:
        return 'none'
    }
  },

  _btnText(status) {
    switch (status) {
      case STATUS.PENDING_CLAIM:
        return '去领取'
      case STATUS.PENDING_BOOK:
        return '去预约'
      case STATUS.BOOKED:
        return '查看预约'
      case STATUS.USED:
        return '已使用'
      case STATUS.EXPIRED:
        return '已过期'
      default:
        return ''
    }
  },

  _addDays(d, n) {
    const x = new Date(d.getTime())
    x.setDate(x.getDate() + n)
    return x
  },

  _formatDate(d) {
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  /** 仅 claimId 且对应该 pending_claim 卡时自动弹一次 */
  _maybeAutoOpenClaimModal() {
    const claimId = this._options.claimId != null && String(this._options.claimId).trim()
    if (!claimId) return
    if (this._claimSessionDismissed || this._claimAutoOpened) return

    const cards = this._readCards()
    const c = cards.find(x => x.id === claimId && x.status === STATUS.PENDING_CLAIM)
    if (!c) return

    this._claimAutoOpened = true
    this._setLastOperated(claimId)
    this._openClaimModalForCard(c)
  },

  onClaimLater() {
    this._claimSessionDismissed = true
    this.setData({ showClaimModal: false })
  },

  confirmClaim() {
    const id = this.data.claimTargetId
    if (!id) {
      this.setData({ showClaimModal: false })
      return
    }
    const cards = this._readCards()
    const next = cards.map(c =>
      c.id === id && c.status === STATUS.PENDING_CLAIM ? { ...c, status: STATUS.PENDING_BOOK } : c
    )
    this._writeCards(next)
    this.setData({ showClaimModal: false, claimModalCard: null })
    this._setLastOperated(id)
    this._refreshAll()
    wx.showToast({ title: '领取成功', icon: 'success' })
  },

  /**
   * 查看使用规则：优先当前点击卡 ruleText；无则最近操作卡；绝不默认第一张
   */
  openRules() {
    const clicked = this.data.cardClickedForRulesId
    const last = this.data.lastOperatedCardId
    const cards = this._readCards()
    let c = null
    if (clicked) c = cards.find(x => x.id === clicked) || null
    if (!c && last) c = cards.find(x => x.id === last) || null

    this.setData({
      showRulesModal: true,
      rulesModalCard: c
        ? {
            serviceName: c.serviceName || '',
            ruleText: c.ruleText || '',
            expireLine: c.expireAt ? `有效期至：${c.expireAt}` : '',
          }
        : null,
      rulesModalEmpty: !c,
    })
  },

  closeRules() {
    this.setData({ showRulesModal: false, rulesModalCard: null, rulesModalEmpty: false })
  },

  /** 点击卡片主体（不含按钮）：用于规则弹层锚定当前卡 */
  onCardTapSelectForRules(e) {
    const { id } = e.currentTarget.dataset
    if (id) this.setData({ cardClickedForRulesId: id })
  },

  onCardAction(e) {
    const { id, status } = e.currentTarget.dataset
    if (!id) return
    this._setLastOperated(id)
    this.setData({ cardClickedForRulesId: id })

    if (status === STATUS.PENDING_CLAIM) {
      const cards = this._readCards()
      const c = cards.find(x => x.id === id)
      if (c) this._openClaimModalForCard(c)
      return
    }
    if (status === STATUS.PENDING_BOOK) {
      const cards = this._readCards()
      const c = cards.find(x => x.id === id)
      if (!c) return

      if (this._hasActiveGiftBookingOrder(id)) {
        wx.showToast({ title: '您已提交预约，请勿重复操作', icon: 'none' })
        return
      }

      // 每次打开新的预约面板都重置临时态，避免上一张卡残留
      this.setData({
        bookingCardId: '',
        bookingType: BOOKING_TYPE.MORNING_AFTERNOON,
        minBookDate: '',
        bookDate: '',
        bookSlot: 'morning',
        bookPanelHint: '',
      })

      if (c.bookingType === BOOKING_TYPE.CONTACT_SERVICE) {
        this.setData({
          showBookPanel: true,
          bookingCardId: id,
          bookingType: BOOKING_TYPE.CONTACT_SERVICE,
          bookPanelHint: c.bookingHint || '本服务需联系客服预约，请按活动指引操作。',
          minBookDate: '',
          bookDate: '',
        })
        return
      }

      const days = Math.max(0, Number(c.minAdvanceDays) || 0)
      const minBookDate = this._formatDate(this._addDays(new Date(), days))
      const hint =
        c.bookingHint ||
        (days > 0 ? `需至少提前 ${days} 天预约` : '请按本权益要求选择预约时间')

      this.setData({
        showBookPanel: true,
        bookingCardId: id,
        bookingType: BOOKING_TYPE.MORNING_AFTERNOON,
        bookPanelHint: hint,
        minBookDate,
        bookDate: minBookDate,
        bookSlot: 'morning',
      })
      return
    }
    if (status === STATUS.BOOKED) {
      const cards = this._readCards()
      const c = cards.find(x => x.id === id)
      if (!c) return
      const slotLabel = c.bookedSlot === 'afternoon' ? '下午' : '上午'
      const showContactPending =
        c.bookingType === BOOKING_TYPE.CONTACT_SERVICE && !c.bookedDate
      this.setData({
        showViewBookModal: true,
        viewBookCard: { ...c, slotLabel, showContactPending },
      })
    }
  },

  closeBookPanel() {
    this.setData({
      showBookPanel: false,
      bookingCardId: '',
      bookingType: BOOKING_TYPE.MORNING_AFTERNOON,
      minBookDate: '',
      bookDate: '',
      bookSlot: 'morning',
      bookPanelHint: '',
    })
  },

  onBookDateChange(e) {
    this.setData({ bookDate: e.detail.value })
  },

  onBookSlotTap(e) {
    const { slot } = e.currentTarget.dataset
    if (slot) this.setData({ bookSlot: slot })
  },

  confirmBook() {
    const { bookingCardId, bookDate, bookSlot, minBookDate, bookingType } = this.data

    if (!bookingCardId) {
      wx.showToast({ title: '请选择权益卡', icon: 'none' })
      return
    }

    if (this._hasActiveGiftBookingOrder(bookingCardId)) {
      this.setData({ showBookPanel: false })
      wx.showToast({ title: '您已提交预约，请勿重复操作', icon: 'none' })
      return
    }

    if (bookingType === BOOKING_TYPE.CONTACT_SERVICE) {
      const cards = this._readCards()
      const target = cards.find(c => c.id === bookingCardId && c.status === STATUS.PENDING_BOOK)
      if (!target) {
        this.setData({ showBookPanel: false })
        wx.showToast({ title: '您已提交预约，请勿重复操作', icon: 'none' })
        return
      }
      const next = cards.map(c =>
        c.id === bookingCardId && c.status === STATUS.PENDING_BOOK
          ? { ...c, status: STATUS.BOOKED, bookedDate: '', bookedSlot: '' }
          : c
      )
      this._writeCards(next)

      const orders = this._readOrders()
      const createdAt = this._formatCreatedAt()
      const record = {
        id: `gift_service_booking_${bookingCardId}_${Date.now()}`,
        orderType: ORDER_TYPE_GIFT_BOOKING,
        cardId: bookingCardId,
        title: `${target.serviceName || '赠送服务'}预约`,
        status: 'pending_contact',
        statusText: '待联系确认',
        date: '',
        slot: '',
        createdAt,
      }
      this._writeOrders([record, ...orders])

      this.setData({ showBookPanel: false })
      this._setLastOperated(bookingCardId)
      this._refreshAll()
      wx.showToast({ title: '已提交预约，请等待工作人员联系', icon: 'none' })
      return
    }

    if (!bookDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (bookDate < minBookDate) {
      wx.showToast({ title: '所选日期不符合提前预约要求', icon: 'none' })
      return
    }
    const cards = this._readCards()
    const target = cards.find(c => c.id === bookingCardId && c.status === STATUS.PENDING_BOOK)
    if (!target) {
      this.setData({ showBookPanel: false })
      wx.showToast({ title: '您已提交预约，请勿重复操作', icon: 'none' })
      return
    }
    const next = cards.map(c =>
      c.id === bookingCardId && c.status === STATUS.PENDING_BOOK
        ? { ...c, status: STATUS.BOOKED, bookedDate: bookDate, bookedSlot: bookSlot }
        : c
    )
    this._writeCards(next)

    const orders = this._readOrders()
    const createdAt = this._formatCreatedAt()
    const record = {
      id: `gift_service_booking_${bookingCardId}_${Date.now()}`,
      orderType: ORDER_TYPE_GIFT_BOOKING,
      cardId: bookingCardId,
      title: `${target.serviceName || '赠送服务'}预约`,
      status: 'booked',
      statusText: '已预约',
      date: bookDate,
      slot: bookSlot,
      createdAt,
    }
    this._writeOrders([record, ...orders])

    this.setData({ showBookPanel: false })
    this._setLastOperated(bookingCardId)
    this._refreshAll()
    wx.showToast({ title: '预约已提交', icon: 'success' })
  },

  closeViewBookModal() {
    this.setData({ showViewBookModal: false, viewBookCard: null })
  },

  goWelfareCenter() {
    wx.navigateBack({
      fail: () => {
        wx.navigateTo({ url: '/pages/welfare-center/welfare-center' })
      },
    })
  },
})
