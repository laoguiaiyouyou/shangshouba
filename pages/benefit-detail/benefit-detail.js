/**
 * benefit-detail — 权益详情页（参考滴滴 V3 会员权益）
 *
 * URL 参数：id = window | pet_sanitize | formaldehyde | daily_cleaning | monthly_coupon
 * 顶部 tabs 可切换权益，也可从黑卡图标直接跳入对应 tab
 */

const TABS = [
  { id: 'monthly_coupon', name: '月月领券' },
  { id: 'window',         name: '擦窗权益' },
  { id: 'pet_sanitize',   name: '宠物消杀权益' },
  { id: 'formaldehyde',   name: '除甲醛权益' },
  { id: 'daily_cleaning', name: '日常保洁权益' },
  { id: 'rebate',         name: '返佣权益' },
]

// 返佣数据
const REBATE_DATA = {
  title: '推荐返佣',
  desc: '推荐同小区邻居完工后，返佣到账钱包',
  tiers: [
    { level: '准团长',   rebate: '¥15/户', sameBuilding: '同栋 ¥30/户', bonus: '升级奖 ¥100' },
    { level: '高级团长', rebate: '¥20/户', sameBuilding: '同栋 ¥40/户', bonus: '升级奖 ¥300' },
    { level: '荣誉团长', rebate: '¥25/户', sameBuilding: '同栋 ¥50/户', bonus: '升级奖 ¥900' },
  ],
  rules: [
    '推荐的邻居完成深处理后，返佣自动到账',
    '同栋楼邻居额外加返佣',
    '必须是同小区邻居',
  ],
}

// 各权益的完整信息
const BENEFIT_DATA = {
  window: {
    title: '擦窗权益',
    desc: '专业擦窗，按面积计价',
    originalNote: '原价：80-120m² ¥299 / 121-160m² ¥399 / 161-200m² ¥539',
    tiers: [
      { level: '准团长',   price: '¥229 / ¥329 / ¥469', freq: '2次/年', highlight: false },
      { level: '高级团长', price: '¥209 / ¥309 / ¥449', freq: '4次/年', highlight: false },
      { level: '荣誉团长', price: '¥179 / ¥289 / ¥419', freq: '6次/年', highlight: true },
    ],
    rules: [
      '达到对应等级后，在"月月领券"里领取',
      '领了就用，过期自动作废，用完还能再领',
      '年度次数有上限，用完即止',
    ],
    couponType: 'window',
  },
  pet_sanitize: {
    title: '宠物消杀权益',
    desc: '宠物家庭专项消杀',
    originalNote: '原价 ¥69/小时',
    tiers: [
      { level: '准团长',   price: '¥49/小时', freq: '3次/年', highlight: false },
      { level: '高级团长', price: '¥39/小时', freq: '6次/年', highlight: false },
      { level: '荣誉团长', price: '¥29/小时', freq: '12次/年', highlight: true },
    ],
    rules: [
      '达到对应等级后，在"月月领券"里领取',
      '领了就用，过期自动作废，用完还能再领',
      '年度次数有上限，用完即止',
    ],
    couponType: 'pet_sanitize',
  },
  formaldehyde: {
    title: '除甲醛权益',
    desc: '全屋除甲醛，还你清新空气',
    originalNote: '原价：≤140m² ¥2166 / >140m² 每多1m² 加¥10',
    tiers: [
      { level: '准团长',   price: '≤140m² ¥1966', freq: '1次', highlight: false },
      { level: '高级团长', price: '≤140m² ¥1866', freq: '1次', highlight: false },
      { level: '荣誉团长', price: '≤140m² ¥1666', freq: '1次', highlight: true },
    ],
    rules: [
      '达到对应等级即可领取，3 个月内有效',
      '不用自动作废',
      '不可叠加、不可转赠、不可提现',
    ],
    couponType: 'formaldehyde',
  },
  daily_cleaning: {
    title: '日常保洁权益',
    desc: '日常保洁专属优惠价',
    originalNote: '原价 ¥30/次',
    tiers: [
      { level: '准团长',   price: '¥20/次', freq: '3次/年', highlight: false },
      { level: '高级团长', price: '¥15/次', freq: '6次/年', highlight: false },
      { level: '荣誉团长', price: '¥10/次', freq: '24次/年', highlight: true },
    ],
    rules: [
      '在"月月领券"里领取保洁券，下单时自动抵扣',
      '领了就用，过期作废，用完还能再领',
      '年度次数有上限，用完即止',
    ],
    couponType: 'daily_cleaning',
  },
}

// 月月领券的券列表
const MONTHLY_COUPONS = [
  { id: 'window',         name: '擦窗权益' },
  { id: 'pet_sanitize',   name: '宠物消杀权益' },
  { id: 'formaldehyde',   name: '除甲醛权益' },
  { id: 'daily_cleaning', name: '日常保洁权益' },
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'monthly_coupon',
    swiperIndex: 0,
    currentLevel: '尊贵用户',
    tier: '',

    // 权益详情数据（切 tab 时更新）
    benefitTitle: '',
    benefitDesc: '',
    benefitOriginal: '',
    benefitTiers: [],
    benefitRules: [],
    benefitCouponType: '',
    claimStatus: '',     // '可领取' | '已领取' | '推荐 3 户邻居后解锁'
    claimLoading: false,
    activeCouponId: '',  // 当前持有的券 _id（用于"使用"）

    // 预约弹窗
    showBooking: false,
    bookingDate: '',
    bookingTimePeriod: '',
    bookingNeedTime: true,
    bookingLoading: false,
    calYear: 0, calMonth: 0, calMonthLabel: '', calDays: [], calCanPrev: false, calCanNext: true, calSlots: {}, amDisabled: false, pmDisabled: false,

    // 月月领券
    couponList: [],
  },

  onLoad(options) {
    const id = options.id || 'monthly_coupon'
    const idx = TABS.findIndex(t => t.id === id)
    const now = new Date()
    this._calMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    this._calMax = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
    this.setData({ activeTab: id, swiperIndex: idx >= 0 ? idx : 0 })
    this._loadLevel()
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
        this._cachedCoupons = res.coupons || []
      }
    } catch (e) { /* fallback */ }
    this.setData({ currentLevel: level, tier })
    this._refreshTab()
  },

  onSwiperChange(e) {
    const idx = e.detail.current
    const tab = TABS[idx]
    if (tab && tab.id !== this.data.activeTab) {
      this.setData({ activeTab: tab.id, swiperIndex: idx })
      this._refreshTab()
    }
  },

  _refreshTab() {
    const id = this.data.activeTab
    if (id === 'monthly_coupon') {
      this._loadMonthlyCoupons()
      return
    }
    if (id === 'rebate') {
      this.setData({
        benefitTitle: REBATE_DATA.title,
        benefitDesc: REBATE_DATA.desc,
        benefitTiers: REBATE_DATA.tiers,
        benefitRules: REBATE_DATA.rules,
        benefitOriginal: '',
        benefitCouponType: '',
        claimStatus: '',
      })
      return
    }
    const data = BENEFIT_DATA[id]
    if (!data) return

    // 高亮当前等级
    const levelMap = { S1: '准团长', S2: '高级团长', S3: '荣誉团长' }
    const currentLevelLabel = levelMap[this.data.tier] || ''
    const tiers = data.tiers.map(t => ({
      ...t,
      isCurrent: t.level === currentLevelLabel,
    }))

    this.setData({
      benefitTitle: data.title,
      benefitDesc: data.desc,
      benefitOriginal: data.originalNote,
      benefitTiers: tiers,
      benefitRules: data.rules,
      benefitCouponType: data.couponType,
      claimStatus: this.data.tier ? '可领取' : '推荐 3 户邻居后解锁',
    })
    this._loadClaimStatus(data.couponType)
  },

  async _loadClaimStatus(couponType) {
    if (!this.data.tier || !couponType) return
    const needTime = couponType !== 'formaldehyde'
    const now = new Date().toISOString()

    // 优先用缓存的券数据
    let coupons = this._cachedCoupons || []
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

    const coupon = coupons.find(c => c.couponType === couponType && c.status === 'active' && c.expiresAt > now)
    if (coupon) {
      this.setData({ claimStatus: '已领取', activeCouponId: coupon._id, bookingNeedTime: needTime })
    } else {
      this.setData({ claimStatus: '可领取', activeCouponId: '', bookingNeedTime: needTime })
    }
  },

  async claimBenefit() {
    if (this.data.claimLoading || !this.data.tier) return
    const couponType = this.data.benefitCouponType
    if (!couponType) return

    this.setData({ claimLoading: true })
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
        this.setData({ claimStatus: '已领取，使用中', claimLoading: false })
        wx.showToast({ title: '领取成功', icon: 'success' })
      } else {
        const msgMap = {
          HAS_ACTIVE_COUPON: '当前已有未使用的券',
          YEARLY_LIMIT_REACHED: '今年领取次数已用完',
          COOLDOWN_ACTIVE: '领取冷却中',
          NOT_A_LEADER: '需要团长身份',
        }
        this.setData({ claimLoading: false })
        wx.showToast({ title: msgMap[res.error] || '领取失败', icon: 'none' })
      }
    } catch (e) {
      this.setData({ claimLoading: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    }
  },

  // ── 月月领券 ──
  async _loadMonthlyCoupons() {
    const { tier } = this.data
    let coupons = this._cachedCoupons || []
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
    this._cachedCoupons = null

    const now = new Date().toISOString()
    const couponList = MONTHLY_COUPONS.map(def => {
      const active = coupons.find(c => c.couponType === def.id && c.expiresAt > now)
      let status = 'claimable'
      if (!tier) status = 'locked'
      else if (active) status = 'claimed'
      return { ...def, status }
    })
    this.setData({ couponList })
  },

  async claimMonthlyCoupon(e) {
    const couponType = e.currentTarget.dataset.id
    if (!couponType || !this.data.tier) return
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
        this._loadMonthlyCoupons()
      } else {
        const msgMap = {
          HAS_ACTIVE_COUPON: '已有未使用的券',
          YEARLY_LIMIT_REACHED: '今年已领完',
          COOLDOWN_ACTIVE: '冷却中',
        }
        wx.showToast({ title: msgMap[res.error] || '领取失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络异常', icon: 'none' })
    }
  },

  // ── 使用券（预约弹窗）──
  openBooking() {
    if (!this.data.activeCouponId) return
    this.setData({ showBooking: true, bookingDate: '', bookingTimePeriod: '', amDisabled: false, pmDisabled: false })
    const now = new Date()
    this._loadSlotsAndBuildCal(now.getFullYear(), now.getMonth())
  },
  closeBooking() { this.setData({ showBooking: false }) },

  async _loadSlotsAndBuildCal(year, month) {
    let slots = {}
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'getScheduleSlots',
          data: { year, month: month + 1, serviceType: this.data.benefitCouponType || '' },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      if (res && res.ok) slots = res.slots || {}
    } catch (e) { /* fallback */ }
    this.setData({ calSlots: slots })
    this._buildCal(year, month)
  },

  _buildCal(year, month) {
    const pad = n => String(n).padStart(2, '0')
    const minD = this._calMin, maxD = this._calMax
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
    const pm = month === 0 ? 11 : month - 1, py = month === 0 ? year - 1 : year
    const nm = month === 11 ? 0 : month + 1, ny = month === 11 ? year + 1 : year
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
    const { activeCouponId, bookingDate, bookingTimePeriod, bookingNeedTime, bookingLoading } = this.data
    if (bookingLoading) return
    if (!bookingDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }
    if (bookingNeedTime && !bookingTimePeriod) { wx.showToast({ title: '请选择上午或下午', icon: 'none' }); return }

    this.setData({ bookingLoading: true })
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'useServiceCoupon',
          data: {
            couponId: activeCouponId,
            serviceDate: bookingDate,
            timePeriod: bookingNeedTime ? bookingTimePeriod : '',
          },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      this.setData({ bookingLoading: false })
      if (res.ok) {
        this.setData({ showBooking: false, claimStatus: '可领取', activeCouponId: '' })
        wx.showToast({ title: '预约成功', icon: 'success' })
      } else {
        wx.showToast({ title: '预约失败，请重试', icon: 'none' })
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
      wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=leader' })
    }
  },
})
