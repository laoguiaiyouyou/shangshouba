/**
 * monthly-coupons — 我的券 / 领券页
 *
 * 4 类券（日常保洁/擦窗/宠物消杀/除甲醛）
 * 已领券可点"使用"弹出预约面板
 */

const COUPON_TYPES = [
  { type: 'daily_cleaning', name: '日常保洁抵扣券', needTimePeriod: true },
  { type: 'window',         name: '擦窗抵扣券',     needTimePeriod: true },
  { type: 'pet_sanitize',   name: '宠物消杀抵扣券', needTimePeriod: true },
  { type: 'formaldehyde',   name: '除甲醛抵扣券',   needTimePeriod: false },
]

Page({
  data: {
    currentLevel: '尊贵用户',
    tier: '',
    isLeader: false,
    couponList: [],
    claimingType: '',

    // 预约弹窗
    showBooking: false,
    bookingCoupon: null,
    bookingDate: '',
    bookingTimePeriod: '',
    bookingNeedTime: true,
    bookingLoading: false,
    // 日历
    calYear: 0,
    calMonth: 0,
    calMonthLabel: '',
    calDays: [],
    calCanPrev: false,
    calCanNext: true,
    calSlots: {},         // { "2026-05-16": "full" | "am_full" | "pm_full" }
    amDisabled: false,
    pmDisabled: false,
  },

  onLoad() {
    const now = new Date()
    this._calMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    this._calMax = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
    this._loadAll()
  },

  onShow() {
    if (this.data.tier) this._loadCouponStates()
  },

  async _loadAll() {
    await this._loadLevel()
    await this._loadCouponStates()
  },

  async _loadLevel() {
    let level = '尊贵用户'
    let tier = ''
    try {
      if (!wx.cloud || !wx.cloud.callFunction) throw new Error('NO_CLOUD')
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'getMyBenefits',
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      if (res && res.ok) {
        tier = res.tier || ''
        level = res.level || level
        // 顺便缓存券数据，_loadCouponStates 会用到
        this._cachedCoupons = res.coupons || []
      }
    } catch (e) { /* fallback */ }
    this.setData({ currentLevel: level, tier, isLeader: !!tier })
  },

  async _loadCouponStates() {
    const { tier, isLeader } = this.data
    if (!isLeader) {
      const couponList = COUPON_TYPES.map(ct => ({
        type: ct.type, name: ct.name, needTimePeriod: ct.needTimePeriod,
        status: 'not_leader', activeCoupon: null,
      }))
      this.setData({ couponList })
      return
    }

    const now = new Date().toISOString()
    let coupons = this._cachedCoupons || []
    // 如果没有缓存（onShow 触发时），重新从云端拿
    if (!coupons.length) {
      try {
        const res = await new Promise((resolve, reject) =>
          wx.cloud.callFunction({
            name: 'getMyBenefits',
            success: r => resolve(r && r.result ? r.result : {}),
            fail: reject,
          })
        )
        coupons = (res && res.ok) ? (res.coupons || []) : []
      } catch (e) { /* fallback */ }
    }
    this._cachedCoupons = null  // 用完清掉

    const couponList = COUPON_TYPES.map(ct => {
      const activeCoupon = coupons.find(c =>
        c.couponType === ct.type && c.status === 'active' && c.expiresAt > now
      )
      return {
        type: ct.type, name: ct.name, needTimePeriod: ct.needTimePeriod,
        status: activeCoupon ? 'holding' : 'claimable',
        activeCoupon: activeCoupon || null,
      }
    })
    this.setData({ couponList })
  },

  // ── 领取 ──
  async claimCoupon(e) {
    const couponType = e.currentTarget.dataset.type
    if (!couponType || this.data.claimingType) return
    const item = this.data.couponList.find(c => c.type === couponType)
    if (!item || item.status !== 'claimable') return

    this.setData({ claimingType: couponType })
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'claimCoupon',
          data: { couponType },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      if (res.ok) {
        wx.showToast({ title: '领取成功', icon: 'success' })
        await this._loadCouponStates()
      } else {
        const msgMap = {
          HAS_ACTIVE_COUPON: '当前已有未使用的券',
          YEARLY_LIMIT_REACHED: '今年领取次数已用完',
          COOLDOWN_ACTIVE: '领取冷却中',
        }
        wx.showToast({ title: msgMap[res.error] || '领取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络异常', icon: 'none' })
    }
    this.setData({ claimingType: '' })
  },

  // ── 使用（弹出预约面板）──
  openBooking(e) {
    const type = e.currentTarget.dataset.type
    const item = this.data.couponList.find(c => c.type === type)
    if (!item || !item.activeCoupon) return
    this._bookingServiceType = type
    this.setData({
      showBooking: true,
      bookingCoupon: item.activeCoupon,
      bookingNeedTime: item.needTimePeriod,
      bookingDate: '',
      bookingTimePeriod: '',
      amDisabled: false,
      pmDisabled: false,
    })
    const now = new Date()
    this._loadSlotsAndBuildCal(now.getFullYear(), now.getMonth())
  },

  closeBooking() {
    this.setData({ showBooking: false, bookingCoupon: null })
  },

  async _loadSlotsAndBuildCal(year, month) {
    let slots = {}
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'getScheduleSlots',
          data: { year, month: month + 1, serviceType: this._bookingServiceType || '' },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      if (res && res.ok) slots = res.slots || {}
    } catch (e) { /* fallback: 全部可约 */ }
    this.setData({ calSlots: slots })
    this._buildCal(year, month)
  },

  _buildCal(year, month) {
    const pad = n => String(n).padStart(2, '0')
    const minD = this._calMin
    const maxD = this._calMax
    const minStr = `${minD.getFullYear()}-${pad(minD.getMonth()+1)}-${pad(minD.getDate())}`
    const maxStr = `${maxD.getFullYear()}-${pad(maxD.getMonth()+1)}-${pad(maxD.getDate())}`
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow = new Date(year, month, 1).getDay()
    const days = []
    for (let i = 0; i < firstDow; i++) days.push({ empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`
      const disabled = dateStr < minStr || dateStr > maxStr
      const dow = new Date(year, month, d).getDay()
      const slotStatus = (this.data.calSlots || {})[dateStr] || ''
      const availability = disabled ? 'disabled' : (slotStatus === 'full' ? 'full' : 'available')
      days.push({ day: d, dateStr, disabled, empty: false, availability })
    }
    const label = `${year}年${month + 1}月`
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    const canPrev = py > minD.getFullYear() || (py === minD.getFullYear() && pm >= minD.getMonth())
    const canNext = ny < maxD.getFullYear() || (ny === maxD.getFullYear() && nm <= maxD.getMonth())
    this.setData({ calYear: year, calMonth: month, calMonthLabel: label, calDays: days, calCanPrev: canPrev, calCanNext: canNext })
  },

  calPrev() {
    if (!this.data.calCanPrev) return
    const { calYear: y, calMonth: m } = this.data
    this._loadSlotsAndBuildCal(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1)
  },
  calNext() {
    if (!this.data.calCanNext) return
    const { calYear: y, calMonth: m } = this.data
    this._loadSlotsAndBuildCal(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1)
  },
  calSelectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    const slotStatus = (this.data.calSlots || {})[date] || ''
    this.setData({
      bookingDate: date,
      bookingTimePeriod: '',
      amDisabled: slotStatus === 'am_full',
      pmDisabled: slotStatus === 'pm_full',
    })
  },

  selectTimePeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period === '上午' && this.data.amDisabled) return
    if (period === '下午' && this.data.pmDisabled) return
    this.setData({ bookingTimePeriod: period })
  },

  async confirmBooking() {
    const { bookingCoupon, bookingDate, bookingTimePeriod, bookingNeedTime, bookingLoading } = this.data
    if (bookingLoading) return
    if (!bookingDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }
    if (bookingNeedTime && !bookingTimePeriod) { wx.showToast({ title: '请选择上午或下午', icon: 'none' }); return }

    this.setData({ bookingLoading: true })
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'useServiceCoupon',
          data: {
            couponId: bookingCoupon._id,
            serviceDate: bookingDate,
            timePeriod: bookingNeedTime ? bookingTimePeriod : '',
          },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      this.setData({ bookingLoading: false })
      if (res.ok) {
        this.setData({ showBooking: false, bookingCoupon: null })
        wx.showToast({ title: '预约成功', icon: 'success' })
        this._loadCouponStates()
      } else {
        const msgMap = {
          COUPON_NOT_ACTIVE: '该券已使用或已过期',
          COUPON_EXPIRED: '该券已过期',
        }
        wx.showToast({ title: msgMap[res.error] || '预约失败', icon: 'none' })
      }
    } catch (e) {
      this.setData({ bookingLoading: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },
})
