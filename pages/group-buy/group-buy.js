// ── Mock 数据（邻里拼团 3户成团模型）
//
// ── 流程口径 V1 ──────────────────────────────────────────
//   1. 发起人开团 → 填小区/房号/面积 → 占第1个团位（不付款）
//   2. 邻居扫码加入 → 同小区 + 不同房号校验通过 → 状态「已加入」（占位，不付款）
//   3. 满3户（含发起人）→ teamStatus 变 'formed'，团价资格解锁
//   4. 成团后各自下单、各自付款（不要求同时）
//   5. 付款完成 + 开荒完工 = 1户有效累计（影响团长升级）
//
// ── 状态定义 ─────────────────────────────────────────────
//   已加入  = 扫码入团 + 同小区房号校验通过 + 占位成功（≠ 付款）
//   已下单  = 成团后已选服务提交订单（未付款）
//   已支付  = 订单付款成功
//   已完工  = 服务完成验收
//   已失效  = 加入后24h内未下单，团位失效
//
// ── 成团回退规则 ─────────────────────────────────────────
//   V1 轻量口径：3户已加入 = 已成团；成团后不因单户未付款回退整团
//
const MOCK = {
  hasTeam: true,
  teamCount: 2,
  teamStatus: 'recruiting',
  teamTarget: 3,
  inviteStats: {
    totalEffectiveCount: 3,
    paidCount: 5,
    pendingCount: 2,
    settledCommission: 12,
    pendingCommission: 8,
  },
  // statusKey 枚举：leader | joined | ordered | paid | completed | expired
  teamMemberList: [
    { id:'1', name:'你（发起人）',   date:'2026-03-20', statusKey:'leader',  statusLabel:'团长'   },
    { id:'2', name:'邻居A（302室）', date:'2026-03-26', statusKey:'joined',  statusLabel:'已加入' },
  ],
}

// 黑卡 swiper 数据（A 版图标网格）
// 黑卡 swiper 数据
// 图标文件：/images/icons/daily_cleaning.png, window.png, pet_sanitize.png, formaldehyde.png
// 待 UI 设计师出图后替换
const TIER_CARDS = [
  {
    tier: 'S1', label: '准团长', threshold: '推荐 3 户',
    upgradeBonus: 100,
    rebate: '¥15/户', rebateSameBuilding: '同栋 ¥30/户',
    summary: '推荐 3 户邻居，到手现金 + 家里清洁服务专属优惠',
    benefits: [
      { key: 'daily_cleaning', name: '日常保洁', price: '¥20/次' },
      { key: 'window',         name: '擦窗',     price: '¥229起' },
      { key: 'pet_sanitize',   name: '宠物消杀', price: '¥49/时' },
      { key: 'formaldehyde',   name: '除甲醛',   price: '¥1966' },
    ],
  },
  {
    tier: 'S2', label: '高级团长', threshold: '推荐 10 户',
    upgradeBonus: 300,
    rebate: '¥20/户', rebateSameBuilding: '同栋 ¥40/户',
    summary: '推荐 10 户邻居，到手 770 现金，家里清洁半价起',
    benefits: [
      { key: 'daily_cleaning', name: '日常保洁', price: '¥15/次' },
      { key: 'window',         name: '擦窗',     price: '¥209起' },
      { key: 'pet_sanitize',   name: '宠物消杀', price: '¥39/时' },
      { key: 'formaldehyde',   name: '除甲醛',   price: '¥1866' },
    ],
  },
  {
    tier: 'S3', label: '荣誉团长', threshold: '推荐 30 户',
    upgradeBonus: 900,
    rebate: '¥25/户', rebateSameBuilding: '同栋 ¥50/户',
    summary: '推荐 30 户邻居，到手 2670 现金，保洁几乎免费',
    benefits: [
      { key: 'daily_cleaning', name: '日常保洁', price: '¥10/次' },
      { key: 'window',         name: '擦窗',     price: '¥179起' },
      { key: 'pet_sanitize',   name: '宠物消杀', price: '¥29/时' },
      { key: 'formaldehyde',   name: '除甲醛',   price: '¥1666' },
    ],
  },
]

const BENEFITS = [
  { id: 'monthly_coupon', name: '月月领券',         type: 'monthly_coupon' },
  { id: 'window',         name: '擦窗权益',         type: 'coupon_rule' },
  { id: 'pet_sanitize',   name: '宠物家庭消杀权益', type: 'coupon_rule' },
  { id: 'formaldehyde',   name: '除甲醛权益',       type: 'coupon_rule' },
  { id: 'daily_clean',    name: '日常保洁权益',     type: 'daily_cleaning' },
]

function computeLeader(count) {
  if (count >= 30) return { level: 'honor',    label: '荣誉团长' }
  if (count >= 10) return { level: 'senior',   label: '高级团长' }
  if (count >= 3)  return { level: 'trial',    label: '准团长'   }
  return                  { level: 'normal',   label: '尊贵用户' }
}

// 券型权益当前身份额度映射
// 券型权益 C 端三档描述
const COUPON_TIERS_MAP = {
  window: {
    originalNote: '擦窗原价：80-120m² ¥299 / 121-160m² ¥399 / 161-200m² ¥539',
    tiers: [
      { level: '准团长',   price: '¥229 / ¥329 / ¥469', freq: '一年 2 次', tag: '' },
      { level: '高级团长', price: '¥209 / ¥309 / ¥449', freq: '一年 4 次', tag: '' },
      { level: '荣誉团长', price: '¥179 / ¥289 / ¥419', freq: '一年 6 次', tag: '推荐' },
    ],
  },
  pet_sanitize: {
    originalNote: '宠物消杀原价 ¥69/小时',
    tiers: [
      { level: '准团长',   price: '¥49/小时', freq: '一年 3 次', tag: '' },
      { level: '高级团长', price: '¥39/小时', freq: '一年 6 次', tag: '' },
      { level: '荣誉团长', price: '¥29/小时', freq: '一年 12 次', tag: '推荐' },
    ],
  },
  formaldehyde: {
    originalNote: '除甲醛原价：≤140m² ¥2166 / >140m² 每多1m²加¥10',
    tiers: [
      { level: '准团长',   price: '≤140m² ¥1966', freq: '可用 1 次', tag: '' },
      { level: '高级团长', price: '≤140m² ¥1866', freq: '可用 1 次', tag: '' },
      { level: '荣誉团长', price: '≤140m² ¥1666', freq: '可用 1 次', tag: '最优' },
    ],
  },
}

// 日常保洁 C 端三档描述
const DAILY_TIERS = [
  { level: '准团长',   price: '¥20/次', freq: '一年 3 次', original: '原价 ¥30/次' },
  { level: '高级团长', price: '¥15/次', freq: '一年 6 次，每两月一次', original: '原价 ¥30/次' },
  { level: '荣誉团长', price: '¥10/次', freq: '一年 24 次，每两周一次', original: '原价 ¥30/次' },
]

// 日常保洁当前身份映射（switchBenefit 用）
const DAILY_BY_LEVEL = {
  normal: { val: '推荐 3 户邻居后解锁', unlocked: false },
  trial:  { val: '¥20/次（原价¥30），一年 3 次', unlocked: true },
  senior: { val: '¥15/次（原价¥30），一年 6 次', unlocked: true },
  honor:  { val: '¥10/次（原价¥30），一年 24 次', unlocked: true },
}

const TEAM_STATUS_LABEL = { recruiting: '招募中', formed: '已成团', expired: '已失效' }

function getMiniProgramEnvVersion() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync()
    const envVersion = info && info.miniProgram && info.miniProgram.envVersion
    if (['develop', 'trial', 'release'].includes(envVersion)) return envVersion
  } catch (e) {}
  return 'trial'
}

function buildGroupLandingPath({ groupId = '', communityName = '', entry = 'share' }) {
  const params = [
    `groupId=${encodeURIComponent(groupId)}`,
    'groupMode=community_group',
  ]
  const finalCommunityName = String(communityName || '').trim()
  if (finalCommunityName) params.push(`communityName=${encodeURIComponent(finalCommunityName)}`)
  if (entry) params.push(`entry=${encodeURIComponent(entry)}`)
  return `/pages/group-landing/group-landing?${params.join('&')}`
}

// ── 房号标准化（与 checkout 保持一致）──────────────────────────
function _normalizeBuildingPart(s) {
  const v = String(s || '').replace(/\s+/g, '').replace(/栋/g, '')
  return v ? `${v}栋` : ''
}
function _normalizeUnitPart(s) {
  const v = String(s || '').replace(/\s+/g, '').replace(/单元/g, '')
  return v ? `${v}单元` : ''
}
function _normalizeFlatPart(s) {
  return String(s || '').trim().replace(/\s+/g, '')
}
function _buildNormalizedRoomNo(buildingNo, unitNo, flatNo, houseType) {
  const b = _normalizeBuildingPart(buildingNo)
  const u = _normalizeUnitPart(unitNo)
  const f = _normalizeFlatPart(flatNo)
  if (!b) return ''
  if (houseType === 'villa_single') return b
  if (houseType === 'villa_row') return f ? `${b}${f}` : ''
  if (!u || !f) return ''
  return `${b}${u}${f}`
}
// ──────────────────────────────────────────────────────────────

function isRealMiniProgramCodeUrl(url) {
  const value = String(url || '').trim()
  if (!/^https?:\/\//.test(value)) return false
  if (value.includes('api.qrserver.com')) return false
  if (value.includes('/pages/group-landing/group-landing')) return false
  return true
}

function isDevRuntime() {
  return getMiniProgramEnvVersion() !== 'release'
}

function isRealGroupId(groupId) {
  const value = String(groupId || '').trim()
  return !!(value && value !== '-' && !value.startsWith('mock_'))
}

function toDebugDisplay(value) {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

function buildQrDebugInfo({ source = '', groupId = '', payload = null } = {}) {
  const data = payload && typeof payload === 'object' ? payload : {}
  const errorCode = data.errorCode !== undefined ? data.errorCode : data.errCode
  const errorMessage = data.errorMessage || data.errMsg || data.error || data.message
  return {
    visible: isDevRuntime() && !!source,
    source: toDebugDisplay(source),
    groupId: toDebugDisplay(groupId || data.groupId),
    ok: data.ok === undefined ? '-' : String(data.ok),
    qrNotReady: data.qrNotReady === undefined ? '-' : String(data.qrNotReady),
    qrError: toDebugDisplay(data.qrError),
    errorCode: toDebugDisplay(errorCode),
    errorMessage: toDebugDisplay(errorMessage),
    stackTrace: toDebugDisplay(data.stackTrace || data.stack || data.details),
  }
}

Page({
  data: {
    activeTab: 'rules',   // 'rules' | 'myteam' | 'leader'

    // ── 我的团 ──
    hasTeam: false,
    teamCount: 0,
    teamTarget: 3,
    teamStatus: 'recruiting',
    teamStatusLabel: '招募中',
    teamFormed: false,
    teamGap: 3,
    teamPct: 0,           // 进度百分比（0-100）

    // ── 累计 & 返佣 ──
    inviteStats: {
      totalEffectiveCount: 0,  // 已完工户（团长成长进度依据）
      paidCount: 0,            // 已支付户（含服务进行中）
      pendingCount: 0,
      settledCommission: 0,
      pendingCommission: 0,
    },
    inviteRecordList: [],

    // ── 团长 ──
    swiperCurrent: 0,        // 权益卡当前索引：0=S1 1=S2 2=S3
    tierCards: TIER_CARDS,
    leaderLevel: 'normal',
    leaderLevelLabel: '尊贵用户',
    gapToPreLeader: 3,
    gapToSenior: 10,
    gapToLeader: 30,
    progressPct: 0,
    leaderProgressHint: '再推荐且完工 3 户，解锁准团长',

    // ── 团成员列表 ──
    teamMemberList: [],

    // ── QR（我的开团 tab）──
    inviteToken: '',
    currentGroupId: '',     // 当前用户发起的团 ID（从云端加载）
    currentCommunityName: '',
    showQRModal: false,
    qrCodeUrl: '',
    qrState: 'idle',        // 'idle' | 'loading' | 'success' | 'error'
    qrInviteLink: '',
    qrDebugInfo: buildQrDebugInfo(),
    teamDataSource: 'init',  // 'cloud' | 'local-real-create' | 'empty'

    // ── 权益切换 ──
    benefitCards: [],
    activeBenefit: 'monthly_coupon',
    // 月月领券
    couponList: [],
    claimedCount: 0,
    // 券型权益
    currentCouponQuota: '--',
    currentCouponStatus: '未领取',
    currentCouponTiers: [],
    currentCouponOriginal: '',
    // 日常保洁
    dailyVal: '--',
    dailyUnlocked: false,
    dailyTiers: DAILY_TIERS,
    dailyUsed: '--',
    dailyRemain: '--',
    dailyExpiry: '--',

    // ── 开团弹窗 ──
    showCreateModal: false,
    createStep: 'form',      // 'form' | 'qr'
    formCommunity: '',
    formHouseType: '',       // 'villa_single' | 'villa_row' | 'apartment'
    formBuilding: '',        // 栋号
    formUnit: '',            // 单元
    formRoom: '',            // 房号
    formArea: '',
    createCanSubmit: false,
    createLoading: false,
    newGroupId: '',
    newGroupQrUrl: '',
    newGroupInviteLink: '',
  },

  onLoad(options) {
    if (options && options.tab) this.setData({ activeTab: options.tab })
    this._loadData()
  },

  onShow() { this._loadData(); this._buildBenefitCards(); this._syncBenefitContent() },

  _hasActiveGroup() {
    const { hasTeam, currentGroupId, teamStatus } = this.data
    return !!(hasTeam && isRealGroupId(currentGroupId) && teamStatus !== 'expired')
  },

  _setQrDebugInfo({ source = '', groupId = '', payload = null } = {}) {
    this.setData({ qrDebugInfo: buildQrDebugInfo({ source, groupId, payload }) })
  },

  _clearQrDebugInfo() {
    this.setData({ qrDebugInfo: buildQrDebugInfo() })
  },

  _hasQrDebugInfo() {
    const info = this.data.qrDebugInfo || {}
    return !!(
      info.visible &&
      (info.qrError !== '-' || info.errorCode !== '-' || info.errorMessage !== '-')
    )
  },

  _applyRealCreatedGroupState({ groupId = '', communityName = '', qrUrl = '', inviteLink = '' } = {}) {
    if (!isRealGroupId(groupId)) return

    const finalCommunityName = String(communityName || this.data.currentCommunityName || '').trim()
    const sameRealGroup = this.data.currentGroupId === groupId && isRealGroupId(this.data.currentGroupId)
    const teamCount = sameRealGroup && this.data.teamCount > 0 ? this.data.teamCount : 1
    const teamTarget = this.data.teamTarget || 3
    const teamGap = Math.max(0, teamTarget - teamCount)
    const teamPct = Math.min(100, Math.round((teamCount / teamTarget) * 100))
    const teamMemberList = (sameRealGroup && this.data.teamMemberList.length)
      ? this.data.teamMemberList
      : [{
          id: 'leader',
          name: '你（发起人）',
          date: new Date().toISOString().slice(0, 10),
          statusKey: 'leader',
          statusLabel: '团长',
        }]

    this.setData({
      hasTeam: true,
      teamCount,
      teamTarget,
      teamStatus: 'recruiting',
      teamStatusLabel: TEAM_STATUS_LABEL.recruiting,
      teamFormed: false,
      teamGap,
      teamPct,
      teamMemberList,
      currentGroupId: groupId,
      currentCommunityName: finalCommunityName,
      qrCodeUrl: isRealMiniProgramCodeUrl(qrUrl) ? qrUrl : '',
      qrInviteLink: inviteLink || buildGroupLandingPath({
        groupId,
        communityName: finalCommunityName,
        entry: 'share',
      }),
      teamDataSource: 'local-real-create',
    })
  },

  _openGroupQRCodeResult({ groupId = '', communityName = '', qrUrl = '', inviteLink = '', flow = '' }) {
    const finalGroupId = groupId || this.data.currentGroupId || this.data.newGroupId || ''
    const finalCommunityName = String(communityName || this.data.currentCommunityName || '').trim()
    const finalInviteLink = inviteLink || buildGroupLandingPath({
      groupId: finalGroupId,
      communityName: finalCommunityName,
      entry: 'share',
    })
    const realQrUrl = isRealMiniProgramCodeUrl(qrUrl) ? qrUrl : ''

    const openQRCodeModal = () => {
      if (realQrUrl) {
        this.setData({
          qrCodeUrl: realQrUrl,
          qrInviteLink: finalInviteLink,
          qrState: 'success',
          showQRModal: true,
        })
        this._clearQrDebugInfo()
        return
      }

      this.showShareQR()
    }

    this.setData({
      activeTab: 'myteam',
      showCreateModal: false,
      createLoading: false,
      createStep: 'form',
      currentGroupId: finalGroupId,
      currentCommunityName: finalCommunityName,
      qrCodeUrl: '',
      qrInviteLink: finalInviteLink,
      qrState: 'idle',
      showQRModal: false,
    }, () => {
      if (wx.nextTick) {
        wx.nextTick(openQRCodeModal)
      } else {
        setTimeout(openQRCodeModal, 0)
      }
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab !== this.data.activeTab) this.setData({ activeTab: tab })
  },

  async _loadData() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getReferralStats' })
      const r = res && res.result
      if (r && r.ok) { this._applyStats(r, { source: 'cloud' }); return }
    } catch (e) {}

    // 云端失败时不再自动展示假团；已有真实团则保留当前真实态
    if (this.data.hasTeam && isRealGroupId(this.data.currentGroupId)) return

    this._applyStats({
      hasTeam: false,
      teamCount: 0,
      teamStatus: 'recruiting',
      teamTarget: 3,
      teamMemberList: [],
      validCount: 0,
      pendingCount: 0,
      totalCommission: 0,
      paidCount: 0,
      inviteToken: '',
      groupId: '',
      communityName: '',
    }, { source: 'empty' })
  },

  _applyStats(r, { source = 'cloud' } = {}) {
    const isMockSource = source === 'mock-fallback' || source === 'dev-mock'
    const total = r.validCount !== undefined
      ? r.validCount
      : (isMockSource ? (r.inviteStats?.totalEffectiveCount || MOCK.inviteStats.totalEffectiveCount) : 0)
    const pending = r.pendingCount !== undefined
      ? r.pendingCount
      : (isMockSource ? (r.inviteStats?.pendingCount || MOCK.inviteStats.pendingCount) : 0)
    const commission = r.totalCommission !== undefined
      ? r.totalCommission
      : (isMockSource ? (r.inviteStats?.settledCommission || MOCK.inviteStats.settledCommission) : 0)

    const { level, label } = computeLeader(total)
    const gapToPreLeader = Math.max(0, 3 - total)
    const gapToSenior    = Math.max(0, 10 - total)
    const gapToLeader    = Math.max(0, 30 - total)
    const progressPct    = Math.min(100, Math.round((total / 30) * 100))

    // ── 团状态 ──
    const rawGroupId = String(r.groupId || '').trim()
    const hasRealGroup = isRealGroupId(rawGroupId)
    const hasTeam = isMockSource
      ? (r.hasTeam !== undefined ? !!r.hasTeam : MOCK.hasTeam)
      : !!(r.hasTeam && hasRealGroup)
    const teamCount = hasTeam
      ? (r.teamCount !== undefined ? r.teamCount : (isMockSource ? MOCK.teamCount : 0))
      : 0
    const teamStatus = hasTeam
      ? (r.teamStatus || (isMockSource ? MOCK.teamStatus : 'recruiting'))
      : 'recruiting'
    const teamTarget = hasTeam
      ? (r.teamTarget || (isMockSource ? MOCK.teamTarget : 3))
      : 3
    const teamFormed     = teamStatus === 'formed'
    const teamGap        = Math.max(0, teamTarget - teamCount)
    const teamPct        = Math.min(100, Math.round((teamCount / teamTarget) * 100))
    const teamStatusLabel = TEAM_STATUS_LABEL[teamStatus] || '招募中'
    const keepSameGroupCache = hasRealGroup && rawGroupId === this.data.currentGroupId

    // ── 团长升级提示（打出权益锚点：全年12次免费日常保洁）──
    let leaderProgressHint = ''
    if (total < 3)
      leaderProgressHint = `再推荐且完工 ${3 - total} 户，解锁准团长`
    else if (total < 10)
      leaderProgressHint = `再推荐且完工 ${10 - total} 户，解锁高级团长`
    else if (total < 30)
      leaderProgressHint = `再推荐且完工 ${30 - total} 户，解锁荣誉团长`
    else
      leaderProgressHint = '全部等级已解锁'

    const paidCount = r.paidCount !== undefined ? r.paidCount : (isMockSource ? MOCK.inviteStats.paidCount : 0)

    // 权益卡默认落位：S3(honor)→2，S2(senior)→1，其余→0
    const swiperCurrent = level === 'honor' ? 2 : level === 'senior' ? 1 : 0

    this.setData({
      swiperCurrent,
      hasTeam, teamCount, teamTarget, teamStatus, teamStatusLabel, teamFormed, teamGap, teamPct,
      inviteStats: {
        totalEffectiveCount: total,
        paidCount,
        pendingCount:        pending,
        settledCommission:   commission,
        pendingCommission:   r.pendingCommission !== undefined ? r.pendingCommission : (isMockSource ? MOCK.inviteStats.pendingCommission : 0),
      },
      teamMemberList: hasTeam ? (r.teamMemberList || (isMockSource ? MOCK.teamMemberList : [])) : [],
      leaderLevel: level,
      leaderLevelLabel: label,
      gapToPreLeader,
      gapToSenior,
      gapToLeader,
      progressPct,
      leaderProgressHint,
      inviteToken:    r.inviteToken    || '',
      currentGroupId: hasRealGroup ? rawGroupId : '',
      currentCommunityName: hasRealGroup ? String(r.communityName || '').trim() : '',
      qrCodeUrl: keepSameGroupCache ? this.data.qrCodeUrl : '',
      qrInviteLink: keepSameGroupCache ? this.data.qrInviteLink : '',
      teamDataSource: source,
    })
  },

  // ── 开团弹窗 ──
  showGroupCreateModal() {
    if (this._hasActiveGroup()) {
      this._openGroupQRCodeResult({
        groupId: this.data.currentGroupId,
        communityName: this.data.currentCommunityName,
        qrUrl: this.data.qrCodeUrl,
        inviteLink: this.data.qrInviteLink,
        flow: 'reuseActiveGroup -> openQRCodeModal',
      })
      return
    }

    this.setData({
      showCreateModal: true,
      createStep: 'form',
      formCommunity: '',
      formBuilding: '',
      formUnit: '',
      formRoom: '',
      formArea: '',
      createCanSubmit: false,
      createLoading: false,
      newGroupQrUrl: '',
      newGroupInviteLink: '',
    })
  },

  closeCreateModal() {
    this.setData({ showCreateModal: false })
    // 如果刚建完团，刷新数据
    if (this.data.newGroupId) this._loadData()
  },

  _roomSegmentsFilled() {
    const { formHouseType, formBuilding, formUnit, formRoom } = this.data
    if (!formHouseType) return false
    if (!String(formBuilding || '').trim()) return false
    if (formHouseType === 'villa_single') return true
    if (formHouseType === 'villa_row') return !!String(formRoom || '').trim()
    return !!(String(formUnit || '').trim() && String(formRoom || '').trim())
  },

  _checkCreateSubmittable() {
    const { formCommunity, formArea } = this.data
    this.setData({
      createCanSubmit: !!(
        formCommunity.trim() &&
        this._roomSegmentsFilled() &&
        formArea.trim()
      ),
    })
  },

  onCommunityInput(e) {
    this.setData({ formCommunity: e.detail.value })
    this._checkCreateSubmittable()
  },

  onHouseTypeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.formHouseType) return
    const clearData = { formHouseType: type }
    if (type === 'villa_single') { clearData.formUnit = ''; clearData.formRoom = '' }
    else if (type === 'villa_row') { clearData.formUnit = '' }
    this.setData(clearData)
    this._checkCreateSubmittable()
  },

  onBuildingInput(e) {
    this.setData({ formBuilding: e.detail.value })
    this._checkCreateSubmittable()
  },

  onUnitInput(e) {
    this.setData({ formUnit: e.detail.value })
    this._checkCreateSubmittable()
  },

  onRoomInput(e) {
    this.setData({ formRoom: e.detail.value })
    this._checkCreateSubmittable()
  },

  onAreaInput(e) {
    this.setData({ formArea: e.detail.value })
    this._checkCreateSubmittable()
  },

  async submitCreateGroup() {
    const { createCanSubmit, createLoading, formCommunity, formHouseType, formBuilding, formUnit, formRoom, formArea } = this.data
    if (!createCanSubmit || createLoading) return
    this._clearQrDebugInfo()
    this.setData({ createLoading: true })
    // 标准化房号（与 checkout 一致）
    const buildingInfo = _buildNormalizedRoomNo(formBuilding, formUnit, formRoom, formHouseType)
    if (!buildingInfo) {
      this.setData({ createLoading: false })
      wx.showToast({ title: '请完善房号信息', icon: 'none' }); return
    }
    let groupId = ''
    let qrUrl   = ''
    let inviteLink = ''
    let resolvedCommunityName = formCommunity.trim()
    let createResult = null
    try {
      // 从本地缓存或云端取最近订单
      let orders = orderContext.getOrdersForCurrentUser() || []
      if (!orders.length) {
        try {
          const orderRes = await wx.cloud.callFunction({ name: 'listMyOrders' })
          orders = (orderRes && orderRes.result && orderRes.result.list) || []
        } catch (e) { /* fallback */ }
      }
      const latestOrder = orders.find(o => o.status && o.status !== '已退款' && o.status !== '待支付')
      const orderId = (latestOrder && latestOrder.orderId) || ''
      if (!orderId) {
        this.setData({ createLoading: false })
        wx.showToast({ title: '请先完成下单后再开团', icon: 'none' })
        return
      }
      const res = await wx.cloud.callFunction({
        name: 'manageGroup',
        data: {
          action: 'create',
          orderId,
          communityName: formCommunity,
        },
      })
      const r = res && res.result
      createResult = r && typeof r === 'object' ? r : null
      if (r && r.ok && r.group) {
        groupId    = r.group._id || ''
        resolvedCommunityName = String(r.group.communityName || resolvedCommunityName).trim()
      }
    } catch (e) {
      createResult = {
        ok: false,
        errorCode: e && (e.errCode || e.code),
        errorMessage: e && (e.errMsg || e.message || String(e)),
      }
    }
    if (!isRealGroupId(groupId)) {
      this._setQrDebugInfo({
        source: 'manageGroup',
        groupId,
        payload: createResult || {
          ok: false,
          qrNotReady: true,
          errorCode: 'EMPTY_CREATE_GROUP_RESULT',
          errorMessage: 'manageGroup create returned empty result',
        },
      })
      this.setData({ createLoading: false })
      wx.showToast({ title: '当前没有可用的真实团，请重新开团', icon: 'none' })
      return
    }
    const finalCommunityName = resolvedCommunityName
    this.setData({
      newGroupId: groupId,
      newGroupQrUrl: qrUrl,
      newGroupInviteLink: inviteLink || buildGroupLandingPath({
        groupId,
        communityName: finalCommunityName,
        entry: 'share',
      }),
    })
    this._applyRealCreatedGroupState({
      groupId,
      communityName: finalCommunityName,
      qrUrl,
      inviteLink: inviteLink || buildGroupLandingPath({
        groupId,
        communityName: finalCommunityName,
        entry: 'share',
      }),
    })
    this._openGroupQRCodeResult({
      groupId,
      communityName: finalCommunityName,
      qrUrl,
      inviteLink: inviteLink || buildGroupLandingPath({
        groupId,
        communityName: finalCommunityName,
        entry: 'share',
      }),
      flow: 'manageGroup.create -> openQRCodeModal',
    })
    this._loadData()
  },

  copyNewInviteLink() {
    const { newGroupInviteLink, newGroupId, currentCommunityName } = this.data
    const link = newGroupInviteLink || buildGroupLandingPath({
      groupId: newGroupId,
      communityName: currentCommunityName,
      entry: 'share',
    })
    wx.setClipboardData({
      data: `我在上手吧发起了邻里团，一起参团 3 户成团享 ¥2/㎡：${link}`,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  saveNewQR() {
    const { newGroupQrUrl } = this.data
    if (!newGroupQrUrl) { wx.showToast({ title: '二维码生成中，请稍后', icon: 'none' }); return }
    wx.downloadFile({
      url: newGroupQrUrl,
      success: res => wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success:  () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail:     () => wx.showToast({ title: '请先授权相册权限', icon: 'none' }),
      }),
    })
  },

  // 查看团码：四状态机驱动（idle / loading / success / error）
  // 优先使用 currentGroupId（云端返回）或 newGroupId（刚开团），生成真实小程序码
  async showShareQR() {
    const { currentGroupId, newGroupId, qrCodeUrl, currentCommunityName, teamDataSource } = this.data
    const groupId = currentGroupId || (teamDataSource === 'local-real-create' ? newGroupId : '') || ''
    const hasRealCurrentGroupId = isRealGroupId(groupId)

    if (!hasRealCurrentGroupId) {
      this.setData({
        showQRModal: false,
        qrCodeUrl: '',
        qrState: 'idle',
        qrInviteLink: '',
      })
      wx.showToast({ title: '当前没有可用的真实团，请重新开团', icon: 'none' })
      return
    }

    // ① 有缓存，直接进入成功态
    if (qrCodeUrl) {
      this.setData({ showQRModal: true, qrState: 'success' })
      this._clearQrDebugInfo()
      return
    }

    // ② 打开弹窗，进入加载态
    this.setData({ showQRModal: true, qrState: 'loading', qrInviteLink: '' })

    // ④ 真实云函数 generateGroupQR，加 8 秒超时保护
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        this._setQrDebugInfo({
          source: 'generateGroupQR',
          groupId,
          payload: {
            ok: false,
            qrNotReady: true,
            qrError: 'QR_TIMEOUT',
            errorCode: 'QR_TIMEOUT',
            errorMessage: 'generateGroupQR timed out after 8 seconds',
          },
        })
        this.setData({
          qrState: 'error',
          qrInviteLink: buildGroupLandingPath({
            groupId,
            communityName: currentCommunityName,
            entry: 'share',
          }),
        })
      }
    }, 8000)

    try {
      const res = await wx.cloud.callFunction({
        name: 'generateGroupQR',
        data: { groupId, envVersion: getMiniProgramEnvVersion() },
      })
      if (settled) return
      settled = true
      clearTimeout(timer)
      const r    = res && res.result
      const url  = isRealMiniProgramCodeUrl(r && r.url) ? r.url : ''
      const link = (r && r.inviteLink) || buildGroupLandingPath({
        groupId,
        communityName: (r && r.communityName) || currentCommunityName,
        entry: 'share',
      })
      if (url) {
        this.setData({
          qrState: 'success',
          qrCodeUrl: url,
          qrInviteLink: link,
          currentCommunityName: (r && r.communityName) || currentCommunityName || '',
        })
        this._clearQrDebugInfo()
      } else {
        // openapi 未开通：显示错误态，仍保留 inviteLink 供复制
        this._setQrDebugInfo({
          source: 'generateGroupQR',
          groupId,
          payload: {
            ok: r && r.ok,
            groupId,
            qrNotReady: r && r.qrNotReady,
            qrError: r && r.qrError,
            errorCode: r && r.errorCode,
            errorMessage: r && r.errorMessage,
          },
        })
        this.setData({
          qrState: 'error',
          qrInviteLink: link,
          currentCommunityName: (r && r.communityName) || currentCommunityName || '',
        })
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      this._setQrDebugInfo({
        source: 'generateGroupQR',
        groupId,
        payload: {
          ok: false,
          errorCode: e && (e.errCode || e.code),
          errorMessage: e && (e.errMsg || e.message || String(e)),
        },
      })
      this.setData({
        qrState: 'error',
        qrInviteLink: buildGroupLandingPath({
          groupId,
          communityName: currentCommunityName,
          entry: 'share',
        }),
      })
    }
  },

  // 失败/未生成时重新触发：清缓存后走完整流程
  retryGenerateQR() {
    this.setData({ qrCodeUrl: '', qrState: 'idle' })
    this.showShareQR()
  },

  closeQRModal() { this.setData({ showQRModal: false }) },

  copyInviteLink() {
    const { qrInviteLink, currentGroupId, newGroupId, currentCommunityName } = this.data
    const groupId = currentGroupId || newGroupId || ''
    const fallback = groupId
      ? buildGroupLandingPath({ groupId, communityName: currentCommunityName, entry: 'share' })
      : ''
    const link = qrInviteLink || fallback
    if (!link) { wx.showToast({ title: '链接暂不可用', icon: 'none' }); return }
    wx.setClipboardData({
      data: `我在上手吧发起了邻里拼团，3户成团享 ¥2/㎡ 优惠，快来一起团：${link}`,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  saveQRCode() {
    const { qrCodeUrl } = this.data
    if (!qrCodeUrl) return
    wx.downloadFile({
      url: qrCodeUrl,
      success: res => wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success:  () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail:     () => wx.showToast({ title: '请先授权相册权限', icon: 'none' }),
      }),
    })
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  noop() {},   // 防止事件穿透用

  // 团码弹窗中 <button open-type="share"> 触发的分享内容
  onShareAppMessage() {
    const { currentGroupId, qrInviteLink, newGroupId, currentCommunityName } = this.data
    const groupId = currentGroupId || newGroupId || 'demo'
    const path = qrInviteLink || buildGroupLandingPath({
      groupId,
      communityName: currentCommunityName,
      entry: 'share',
    })
    return {
      title: '邻里团开好了，一起参团 3 户立享 ¥2/㎡ 开荒优惠',
      path,
    }
  },

  // ── 权益卡片 ──
  _claimStorageKey() {
    const d = new Date()
    return `monthlyClaimV1_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  },

  _buildBenefitCards() {
    const key = this._claimStorageKey()
    const state = wx.getStorageSync(key) || {}
    const claimed = Object.values(state).filter(v => v === 'claimed').length
    const benefitCards = BENEFITS.map(b => {
      let sub = '--'
      if (b.type === 'monthly_coupon') sub = '已领 ' + claimed + ' / 可领 4'
      else if (b.type === 'daily_cleaning') sub = '升级高级团长后解锁'
      return { ...b, sub }
    })
    this.setData({ benefitCards })
  },

  // ── 权益标题切换 ──
  switchTierTab(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    this.setData({ swiperCurrent: idx })
  },

  goBenefitDetail(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/benefit-detail/benefit-detail?id=${id}` })
  },

  goMonthlyCoupons() {
    wx.navigateTo({ url: '/pages/monthly-coupons/monthly-coupons' })
  },

  goRebateDetail() {
    wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=rebate' })
  },

  switchBenefit(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.activeBenefit) return
    this.setData({ activeBenefit: id })
    this._syncBenefitContent()
  },

  _syncBenefitContent() {
    const id = this.data.activeBenefit
    const level = this.data.leaderLevel || 'normal'
    const key = this._claimStorageKey()
    const state = wx.getStorageSync(key) || {}

    if (id === 'monthly_coupon') {
      // 月月领券
      const CDEFS = [
        { id: 'window', name: '擦窗权益' },
        { id: 'pet_sanitize', name: '宠物家庭消杀权益' },
        { id: 'formaldehyde', name: '除甲醛权益' },
      ]
      let claimedCount = 0
      const couponList = CDEFS.map(def => {
        let status = 'unclaimed'
        if (level === 'normal') {
          status = 'locked'
        } else if (state[def.id] === 'claimed') {
          status = 'claimed'
          claimedCount++
        }
        return { ...def, status }
      })
      this.setData({ couponList, claimedCount })
    } else if (id === 'daily_clean') {
      // 日常保洁
      const info = DAILY_BY_LEVEL[level] || DAILY_BY_LEVEL.normal
      this.setData({
        dailyVal: info.val,
        dailyUnlocked: info.unlocked,
      })
    } else {
      // 券型权益
      const couponData = COUPON_TIERS_MAP[id] || {}
      const currentCouponTiers = couponData.tiers || []
      const currentCouponOriginal = couponData.originalNote || ''
      let couponStatus = '未领取'
      if (level === 'normal') {
        couponStatus = '推荐 3 户邻居后解锁'
      } else if (state[id] === 'claimed') {
        couponStatus = '本月已领取'
      } else {
        couponStatus = '可领取'
      }
      this.setData({ currentCouponStatus: couponStatus, currentCouponTiers, currentCouponOriginal })
    }
  },

  claimCouponInline(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const key = this._claimStorageKey()
    const state = wx.getStorageSync(key) || {}
    if (state[id] === 'claimed') return
    state[id] = 'claimed'
    wx.setStorageSync(key, state)
    wx.showToast({ title: '领取成功', icon: 'success', duration: 1500 })
    this._syncBenefitContent()
    this._buildBenefitCards()
  },

  goIndex() { wx.reLaunch({ url: '/pages/index/index' }) },
  goMine()  { wx.reLaunch({ url: '/pages/mine/mine'   }) },
})
