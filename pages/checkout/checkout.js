const orderContext = require('../../utils/order-context')
const wecom = require('../../utils/wecom')

function parseRoomNoFromQuery(raw) {
  const decoded = String(raw || '').trim()
  if (!decoded) return null
  const re = /^([\s\S]+?)栋([\s\S]+?)单元([\s\S]+)$/
  const m = decoded.match(re)
  if (m) {
    return {
      buildingNo: String(m[1] || '').replace(/\s+/g, '').replace(/栋/g, ''),
      unitNo: String(m[2] || '').replace(/\s+/g, '').replace(/单元/g, ''),
      flatNo: String(m[3] || '').trim().replace(/\s+/g, '')
    }
  }
  const dashed = decoded.match(/^([^-]+)-([^-]+)-(.+)$/)
  if (!dashed) return null
  return {
    buildingNo: String(dashed[1] || '').replace(/\s+/g, ''),
    unitNo: String(dashed[2] || '').replace(/\s+/g, ''),
    flatNo: String(dashed[3] || '').trim().replace(/\s+/g, '')
  }
}

function normalizeBuildingPart(s) {
  const v = String(s || '').replace(/\s+/g, '').replace(/栋/g, '')
  return v ? `${v}栋` : ''
}
function normalizeUnitPart(s) {
  const v = String(s || '').replace(/\s+/g, '').replace(/单元/g, '')
  return v ? `${v}单元` : ''
}
function normalizeFlatPart(s) {
  return String(s || '').trim().replace(/\s+/g, '')
}
function buildNormalizedRoomNo(buildingNo, unitNo, flatNo, houseType) {
  const b = normalizeBuildingPart(buildingNo)
  const u = normalizeUnitPart(unitNo)
  const f = normalizeFlatPart(flatNo)
  if (!b) return ''
  if (houseType === 'villa_single') return b
  if (houseType === 'villa_row') return f ? `${b}${f}` : ''
  // apartment
  if (!u || !f) return ''
  return `${b}${u}${f}`
}

function buildRoomId(estateName, buildingNo, unitNo, flatNo, houseType) {
  const b = String(buildingNo || '').replace(/\s+/g, '').replace(/栋/g, '')
  const u = String(unitNo || '').replace(/\s+/g, '').replace(/单元/g, '')
  const f = String(flatNo || '').trim().replace(/\s+/g, '')
  const estate = String(estateName || '').trim()
  if (!estate || !b) return ''
  if (houseType === 'villa_single') return `${estate}_${b}`
  if (houseType === 'villa_row') return f ? `${estate}_${b}_${f}` : ''
  // apartment
  if (!u || !f) return ''
  return `${estate}_${b}_${u}_${f}`
}

Page({
  data: {
    // ── 价格 ──
    area: '',
    grossUnitPrice: 15,
    grossPrice: 0,
    lockGift: 0,
    lockGiftPerSqm: 1,
    qualifyPerSqm: 0,
    qualifyTotal: 0,
    totalPrice: 0,
    perSqm: 0,
    // 优惠状态：A=invite / B=formed / C=early60 / D=none / E=recruiting
    discountState: 'D',
    discountLabel: '',
    discountSource: '',
    teamCount: 0,
    potentialDiscount: 0,
    // ── 房屋信息 ──
    houseType: '',   // 'villa_single' | 'villa_row' | 'apartment'
    estateName: '',
    buildingNo: '',
    unitNo: '',
    flatNo: '',
    // ── 表单状态 ──
    selectedDate: '',
    canSubmit: false,
    submitBtnText: '支付下订',
    showContactModal: false,
    contactDate: '',
    showDupOrderModal: false,
    dupOrderId: '',
    // 券
    couponId: '',
    couponAmount: 0,
    hasCoupon: false,
    // ── 邀约 ──
    inviteCode: '',
    inviteToken: '',
    invitedBy: '',
    inviteSource: '',
    inviterCommunity: '',  // 邀请人小区（用于同小区校验）
    groupId: '',
    // ── 团购身份 ──
    isGroupMode: false,
    groupMode: '',              // 'community_group' | ''
    groupStatus: '',            // 'open' | 'formed' | 'expired'（从落地页传入）
    groupDiscountPerSqm: 0,     // 团购每㎡折扣
    entryFrom: '',              // 'group_buy' | ''
    serviceType: '深度开荒',    // 从落地页带入的服务类型
    productType: 'haokang',
    // ── 日历 ──
    calendarExpanded: true,
    calendarYear: 0,
    calendarMonth: 0,
    calendarMonthLabel: '',
    calendarDays: [],
    calendarCanPrev: false,
    calendarCanNext: true,
    // ── 年月选择器 ──
    showDatePicker: false,
    pickerYears: [],
    pickerMonths: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    pickerValue: [0, 0],
  },

  onLoad(options) {
    const updateData = {}

    // ── 扫码入口：options.scene 由微信注入，格式为 "i=SHORTCODE" ──
    const rawScene = options.scene ? decodeURIComponent(options.scene) : ''
    if (rawScene.startsWith('i=')) {
      const shortCode = rawScene.slice(2).trim()
      if (shortCode) {
        wx.cloud.callFunction({
          name: 'resolveInviteToken',
          data: { shortCode },
        }).then(res => {
          const r = res && res.result
          if (r && r.valid && r.inviteContext) {
            const ctx = r.inviteContext
            orderContext.setActiveInviteContext(ctx)
            this.setData({
              inviteToken:       ctx.inviteToken       || '',
              inviteCode:        ctx.inviteToken       || '',
              invitedBy:         ctx.invitedBy         || '',
              inviteSource:      ctx.inviteSource      || 'qr',
              inviterCommunity:  ctx.inviterCommunity  || '',
            })
            this.updateCanSubmit()
          }
        }).catch(() => {})
      }
    }

    // ── 普通链接入口：inviteToken 在 URL query 里 ──
    const inviteToken = options.inviteToken ? decodeURIComponent(options.inviteToken) : ''
    const activeInvite = orderContext.getActiveInviteContext()
    const parsedInvite = (activeInvite && activeInvite.inviteToken)
      ? activeInvite
      : (inviteToken ? orderContext.parseInviteToken(inviteToken) : null)
    if (parsedInvite && parsedInvite.inviteToken) {
      updateData.inviteCode       = parsedInvite.inviteToken
      updateData.inviteToken      = parsedInvite.inviteToken
      updateData.invitedBy        = parsedInvite.invitedBy        || ''
      updateData.inviteSource     = parsedInvite.inviteSource     || 'qr'
      updateData.inviterCommunity = parsedInvite.inviterCommunity || ''
      orderContext.setActiveInviteContext(parsedInvite)
    } else if (options.inviteCode) {
      updateData.inviteCode = decodeURIComponent(options.inviteCode)
    }

    if (options.groupId)            updateData.groupId             = decodeURIComponent(options.groupId)
    if (options.communityName)      updateData.estateName          = decodeURIComponent(options.communityName)
    if (options.groupMode)          updateData.groupMode           = decodeURIComponent(options.groupMode)
    if (options.groupStatus)        updateData.groupStatus         = decodeURIComponent(options.groupStatus)
    if (options.groupDiscountPerSqm) updateData.groupDiscountPerSqm = Number(options.groupDiscountPerSqm) || 0
    if (options.entryFrom)          updateData.entryFrom           = decodeURIComponent(options.entryFrom)
    if (options.serviceType)        updateData.serviceType         = decodeURIComponent(options.serviceType)
    if (options.productType)        updateData.productType         = decodeURIComponent(options.productType)
    if (options.fromGroup === '1' || options.groupMode === 'community_group') {
      updateData.isGroupMode = true
    }
    if (options.houseType)  updateData.houseType  = options.houseType
    if (options.buildingNo) updateData.buildingNo = decodeURIComponent(options.buildingNo)
    if (options.unitNo)     updateData.unitNo     = decodeURIComponent(options.unitNo)
    if (options.flatNo)     updateData.flatNo     = decodeURIComponent(options.flatNo)
    if (options.area)       updateData.area        = decodeURIComponent(options.area)
    if (options.roomNo) {
      const decoded = decodeURIComponent(options.roomNo)
      const parsed  = parseRoomNoFromQuery(decoded)
      if (parsed) {
        updateData.buildingNo = parsed.buildingNo
        updateData.unitNo     = parsed.unitNo
        updateData.flatNo     = parsed.flatNo
      } else {
        updateData.flatNo = decoded
      }
    }
    if (Object.keys(updateData).length) {
      this.setData(updateData)
      this.updateCanSubmit()
    }
    this.initCalendar()

    // 若带团参数进入，异步拉取团的当前付款成员数，填充 teamCount
    const targetGroupId = updateData.groupId || this.data.groupId
    if (targetGroupId) {
      wx.cloud.callFunction({
        name: 'manageGroup',
        data: { action: 'query', groupId: targetGroupId },
      }).then(res => {
        const result = res && res.result
        if (result && result.ok && result.group) {
          this.setData({
            teamCount: result.paidCount || result.memberCount || result.group.members.length || 0,
            groupStatus: this.data.groupStatus || result.group.status || 'open',
          })
          this.recalculatePrice()
        }
      }).catch(() => {})
    }
  },

  onShow() {},

  onEstateInput(e) {
    const estateName = e.detail.value
    this.setData({ estateName })
    this._checkInviteCommunity(estateName)
    this.updateCanSubmit()
  },
  onBuildingInput(e) { this.setData({ buildingNo: e.detail.value });  this.updateCanSubmit() },
  onUnitInput(e)     { this.setData({ unitNo:     e.detail.value });  this.updateCanSubmit() },
  onFlatInput(e)     { this.setData({ flatNo:     e.detail.value });  this.updateCanSubmit() },

  onHouseTypeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.houseType) return
    // 切换类型时清空不需要的字段
    const clearData = { houseType: type }
    if (type === 'villa_single') {
      clearData.unitNo = ''
      clearData.flatNo = ''
    } else if (type === 'villa_row') {
      clearData.unitNo = ''
    }
    this.setData(clearData)
    this.updateCanSubmit()
  },

  // ── 日历 ──────────────────────────────────────────────────────

  initCalendar() {
    const now = new Date()
    this._minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4)
    this._maxDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
    this._buildCalendar(now.getFullYear(), now.getMonth())
    this._initPickerYears()
  },

  _initPickerYears() {
    const minY = this._minDate.getFullYear()
    const maxY = this._maxDate.getFullYear()
    const years = []
    for (let y = minY; y <= maxY; y++) years.push(`${y}年`)
    this.setData({ pickerYears: years })
  },

  _buildCalendar(year, month) {
    const pad = n => String(n).padStart(2, '0')
    const minD   = this._minDate
    const maxD   = this._maxDate
    const minStr = `${minD.getFullYear()}-${pad(minD.getMonth()+1)}-${pad(minD.getDate())}`
    const maxStr = `${maxD.getFullYear()}-${pad(maxD.getMonth()+1)}-${pad(maxD.getDate())}`

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow    = new Date(year, month, 1).getDay()

    const days = []
    for (let i = 0; i < firstDow; i++) days.push({ empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`
      const disabled = dateStr < minStr || dateStr > maxStr
      // 可用性：周日=满，周六=紧张，其余=有位（日历直接展示）
      const dow = new Date(year, month, d).getDay()
      const availability = disabled ? 'disabled'
        : (dow === 0)                   ? 'full'
        : (dow === 6 || (dow === 5 && d % 3 === 0)) ? 'hot'
        : 'available'
      days.push({ day: d, dateStr, disabled, empty: false, availability })
    }

    const label     = `${year}年${month + 1}月`
    const prevYear  = month === 0 ? year - 1 : year
    const prevMonth = month === 0 ? 11 : month - 1
    const canPrev   = prevYear > minD.getFullYear()
      || (prevYear === minD.getFullYear() && prevMonth >= minD.getMonth())
    const nextYear  = month === 11 ? year + 1 : year
    const nextMonth = month === 11 ? 0 : month + 1
    const canNext   = nextYear < maxD.getFullYear()
      || (nextYear === maxD.getFullYear() && nextMonth <= maxD.getMonth())

    this.setData({ calendarYear: year, calendarMonth: month, calendarMonthLabel: label, calendarDays: days, calendarCanPrev: canPrev, calendarCanNext: canNext })
  },

  prevMonth() {
    if (!this.data.calendarCanPrev) return
    const { calendarYear: y, calendarMonth: m } = this.data
    this._buildCalendar(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1)
  },
  nextMonth() {
    if (!this.data.calendarCanNext) return
    const { calendarYear: y, calendarMonth: m } = this.data
    this._buildCalendar(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1)
  },

  // 日历折叠/展开
  toggleCalendar() {
    this.setData({ calendarExpanded: !this.data.calendarExpanded })
  },

  // 左右滑动切换月份
  onCalendarTouchStart(e) {
    this._touchStartX = e.touches[0].clientX
  },
  onCalendarTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - (this._touchStartX || 0)
    if (Math.abs(dx) > 30) {
      if (dx < 0) this.nextMonth()
      else this.prevMonth()
    }
  },

  // 点击年月标签弹出选择器
  openDatePicker() {
    const { calendarYear, calendarMonth } = this.data
    const minY   = this._minDate.getFullYear()
    const yearIdx = Math.max(0, calendarYear - minY)
    this.setData({ showDatePicker: true, pickerValue: [yearIdx, calendarMonth] })
    this._pickerYear  = calendarYear
    this._pickerMonth = calendarMonth
  },
  closeDatePicker() { this.setData({ showDatePicker: false }) },
  onPickerChange(e) {
    const [yi, mi]    = e.detail.value
    const minY        = this._minDate.getFullYear()
    this._pickerYear  = minY + yi
    this._pickerMonth = mi
    this.setData({ pickerValue: [yi, mi] })
  },
  confirmDatePicker() {
    const y = this._pickerYear  !== undefined ? this._pickerYear  : this.data.calendarYear
    const m = this._pickerMonth !== undefined ? this._pickerMonth : this.data.calendarMonth
    this._buildCalendar(y, m)
    this.setData({ showDatePicker: false })
  },

  // ── 价格 ──────────────────────────────────────────────────────

  _getDiffDays(selectedDate) {
    if (!selectedDate) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.round((new Date(selectedDate + 'T00:00:00') - today) / 86400000)
  },

  /**
   * 优惠状态判定（优先级：A > B > C > E/D）
   * A=邀请专享  B=已成团  C=提前60天  E=待成团  D=原价
   */
  _resolveDiscountState() {
    const { inviteCode, isGroupMode, groupMode, groupStatus, selectedDate } = this.data

    // A：老客户邀请下单
    if (inviteCode) return { state: 'A', perSqm: 2, label: '老客户邀请下单', source: '老客户邀请 -¥2/㎡' }

    // B：已成团（groupStatus === 'formed'，拼团折扣成团后返钱包，不从实付扣）
    if (isGroupMode && groupStatus === 'formed') {
      return { state: 'B', perSqm: 0, label: '同小区成团', source: '成团后 ¥2/㎡ 返到钱包' }
    }

    // E：参团但尚未成团（招募中，groupStatus === 'open'）
    if (isGroupMode && (groupStatus === 'open' || groupMode === 'community_group')) {
      return { state: 'E', perSqm: 0, label: '已参加团购', source: '成团后 ¥2/㎡ 返到钱包' }
    }

    // C：提前 60 天预约
    if (this._getDiffDays(selectedDate) >= 60) return { state: 'C', perSqm: 2, label: '提前 60 天预约', source: '提前预约 -¥2/㎡' }

    // D：原价
    return { state: 'D', perSqm: 0, label: '', source: '' }
  },

  recalculatePrice() {
    const { area, grossUnitPrice, lockGiftPerSqm } = this.data
    const num = parseFloat(area)
    if (!area || isNaN(num) || num <= 0) {
      this.setData({ grossPrice: 0, lockGift: 0, qualifyPerSqm: 0, qualifyTotal: 0, totalPrice: 0, perSqm: 0, discountState: 'D', discountLabel: '', discountSource: '', potentialDiscount: 0 })
      return
    }
    const t2 = n => parseFloat(n.toFixed(2))
    const t1 = n => parseFloat(n.toFixed(1))

    const { state, perSqm: qps, label, source } = this._resolveDiscountState()
    const grossPrice       = t2(num * grossUnitPrice)
    const lockGift         = t2(Math.min(num * lockGiftPerSqm, 200))  // 新客立减上限 ¥200
    const qualifyTotal     = t2(num * qps)
    const totalPrice       = t2(grossPrice - lockGift - qualifyTotal)
    const perSqm           = num > 0 ? t1(totalPrice / num) : 0
    const potentialDiscount = t2(num * 2)

    this.setData({
      grossPrice,
      lockGift,
      qualifyPerSqm: qps,
      qualifyTotal,
      totalPrice,
      perSqm,
      discountState: state,
      discountLabel: label,
      discountSource: source,
      potentialDiscount,
    })
  },

  onAreaInput(e) {
    this.setData({ area: e.detail.value })
    this.recalculatePrice()
    this.updateCanSubmit()
    this.updateSubmitBtnText()
  },

  updateSubmitBtnText() {
    const n = Number(this.data.area)
    this.setData({ submitBtnText: (n && (n < 1 || n > 400)) ? '沟通档期确认' : '支付下订' })
  },

  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date
    if (!dateStr) return
    // 选完日期后自动折叠日历，让费用明细浮出
    this.setData({ selectedDate: String(dateStr), calendarExpanded: false })
    this.recalculatePrice()
    this.updateCanSubmit()
  },

  // ── 表单验证 ─────────────────────────────────────────────────

  roomSegmentsFilled() {
    const { houseType, buildingNo, unitNo, flatNo } = this.data
    if (!houseType) return false
    const b = String(buildingNo || '').trim()
    if (!b) return false
    if (houseType === 'villa_single') return true
    if (houseType === 'villa_row') return !!String(flatNo || '').trim()
    // apartment
    return !!(String(unitNo || '').trim() && String(flatNo || '').trim())
  },

  updateCanSubmit() {
    const { estateName, area, selectedDate } = this.data
    this.setData({ canSubmit: !!(estateName && this.roomSegmentsFilled() && area && selectedDate) })
  },

  firstMissingTip() {
    if (!String(this.data.estateName||'').trim())  return '请输入小区名称'
    if (!this.data.houseType)                      return '请选择房屋类型'
    if (!String(this.data.buildingNo||'').trim())   return '请输入栋号'
    if (this.data.houseType === 'apartment' && !String(this.data.unitNo||'').trim()) return '请输入单元'
    if (this.data.houseType !== 'villa_single' && !String(this.data.flatNo||'').trim()) return '请输入房号'
    if (!String(this.data.area||'').trim())         return '请输入建筑面积'
    if (!this.data.selectedDate)                    return '请选择预约日期'
    return ''
  },

  // ── 联系客服 ─────────────────────────────────────────────────

  openContactModal(e) { this.setData({ showContactModal: true, contactDate: e.currentTarget.dataset.date }) },
  closeContactModal() { this.setData({ showContactModal: false }) },
  confirmContact()    { this.setData({ showContactModal: false }); wecom.openWecom({ title: '特殊面积咨询' }) },

  // ── 邀约同小区前端校验 ──────────────────────────────────────
  _checkInviteCommunity(estateName) {
    const inviterCommunity = this.data.inviterCommunity
    if (!inviterCommunity || !estateName) return
    const name = String(estateName).trim()
    if (!name) return
    if (name !== inviterCommunity) {
      wx.showToast({
        title: '邀请人所在小区为「' + inviterCommunity + '」，与您填写的小区不一致，邀约优惠将无法使用',
        icon: 'none',
        duration: 3000,
      })
      // 清除邀约信息并重算价格
      this.setData({
        inviteCode: '', inviteToken: '', invitedBy: '',
        inviteSource: '', inviterCommunity: '',
      })
      orderContext.clearActiveInviteContext()
      this.recalculatePrice()
    }
  },

  // ── 下单 ────────────────────────────────────────────────────

  submitOrder() {
    const tip = this.firstMissingTip()
    if (tip) { wx.showToast({ title: tip, icon: 'none', duration: 1500 }); return }

    const areaNum = Number(this.data.area)
    if (areaNum < 1 || areaNum > 400) {
      this.setData({ showContactModal: true, contactDate: this.data.selectedDate || '' })
      return
    }

    const activeInvite  = orderContext.getActiveInviteContext()
    const inviteContext = (activeInvite && activeInvite.inviteToken) ? activeInvite : null
    const inviteToken   = (inviteContext && inviteContext.inviteToken) || this.data.inviteToken || ''
    const selectedDate  = String(this.data.selectedDate || '')
    if (!selectedDate) { wx.showToast({ title: '请选择预约日期', icon: 'none' }); return }

    const roomNo = buildNormalizedRoomNo(this.data.buildingNo, this.data.unitNo, this.data.flatNo, this.data.houseType)
    if (!roomNo) { wx.showToast({ title: '请完善房号信息', icon: 'none', duration: 1500 }); return }
    const roomId = buildRoomId(this.data.estateName, this.data.buildingNo, this.data.unitNo, this.data.flatNo, this.data.houseType)

    const { grossPrice, lockGift, qualifyTotal, totalPrice, discountState, discountSource } = this.data
    const draft = {
      serviceType: this.data.serviceType || '深度开荒 Plus', status: '待服务',
      communityName: this.data.estateName || '',
      roomNo,
      roomId,
      houseType: this.data.houseType || '',
      orderArea: `${this.data.area}㎡`,
      serviceDate: selectedDate,
      grossPrice, lockGift, qualifyTotal, totalPrice,
      discountState, discountSource,
      sourcePage: 'checkout',
      inviteToken,
      invitedBy:   (inviteContext && inviteContext.invitedBy)   || this.data.invitedBy   || '',
      inviteSource:(inviteContext && inviteContext.inviteSource) || this.data.inviteSource || '',
      groupId:              this.data.groupId              || '',
      groupMode:            this.data.groupMode            || '',
      groupDiscountPerSqm:  this.data.groupDiscountPerSqm  || 0,
      entryFrom:            this.data.entryFrom            || '',
      productType:          this.data.productType          || '',
      couponId:             this.data.couponId             || '',
      couponAmount:         this.data.hasCoupon ? this.data.couponAmount : 0,
    }

    orderContext.saveCheckoutDraft(draft)
    const currentUser      = orderContext.getCurrentUser()
    const clientPaymentRef = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    wx.showLoading({ title: '下单中' })
    wx.cloud.callFunction({
      name: 'unifiedOrder',
      data: { draft, currentUser, idempotencyKey: clientPaymentRef, clientPaymentRef },
      success: (res) => {
        wx.hideLoading()
        const result = res && res.result
        if (!result || !result.ok || !result.payment) {
          if (result && result.error === 'DUPLICATE_ORDER') {
            this.setData({ showDupOrderModal: true, dupOrderId: result.existingOrderId || '' })
            return
          }
          wx.showToast({ title: (result && result.error) || '下单失败', icon: 'none' }); return
        }
        wx.requestPayment({
          ...result.payment,
          success: () => wx.navigateTo({ url: `/pages/payment-success/payment-success?orderId=${encodeURIComponent(result.orderId)}` }),
          fail: (err) => wx.showToast({ title: (err && err.errMsg && err.errMsg.includes('cancel')) ? '支付已取消' : '支付未完成', icon: 'none' }),
        })
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常，请重试', icon: 'none' }) },
    })
  },

  goBack()     { wx.redirectTo({ url: '/pages/detail/detail' }) },
  goGroupBuy() { wx.reLaunch({ url: '/pages/group-buy/group-buy' }) },
  goGroupBuyMyTeam() { wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=myteam' }) },

  closeDupOrderModal() { this.setData({ showDupOrderModal: false }) },
  goToExistingOrder() {
    const orderId = this.data.dupOrderId
    this.setData({ showDupOrderModal: false })
    if (orderId) {
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderId=${encodeURIComponent(orderId)}` })
    }
  },
})
