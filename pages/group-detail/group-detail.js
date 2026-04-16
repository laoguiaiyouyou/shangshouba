const TEAM_STATUS_LABEL = { recruiting: '招募中', formed: '已成团', expired: '已失效' }

// Mock 成员数据
const MOCK_MEMBERS = [
  { id: '1', name: '你（发起人）', date: '2026-03-20', statusKey: 'leader',  statusLabel: '团长' },
  { id: '2', name: '邻居A（302室）', date: '2026-03-26', statusKey: 'joined',  statusLabel: '已加入' },
]

function getMiniProgramEnvVersion() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync()
    const envVersion = info && info.miniProgram && info.miniProgram.envVersion
    if (['develop', 'trial', 'release'].includes(envVersion)) return envVersion
  } catch (e) {}
  return 'trial'
}

function buildGroupLandingPath(groupId, communityName) {
  const params = [
    `groupId=${encodeURIComponent(groupId)}`,
    'groupMode=community_group',
    'entry=share',
  ]
  const finalCommunityName = String(communityName || '').trim()
  if (finalCommunityName) params.push(`communityName=${encodeURIComponent(finalCommunityName)}`)
  return `/pages/group-landing/group-landing?${params.join('&')}`
}

Page({
  data: {
    // ── 从 URL 传入 ──
    groupId: '',
    serviceType: '',
    communityName: '',
    area: '',
    houseType: '',
    buildingNo: '',
    unitNo: '',
    flatNo: '',

    // ── 团状态 ──
    teamName: '',
    teamStatus: 'recruiting',
    teamStatusLabel: '招募中',
    teamFormed: false,
    teamCount: 1,
    teamTarget: 3,
    teamGap: 2,
    teamPct: 33,
    serviceName: '',

    // ── 成员列表 ──
    memberList: [],

    // ── 团长激励提示 ──
    leaderProgressHint: '',

    // ── QR ──
    inviteLink: '',
    qrCodeUrl: '',
    qrLoading: false,
    showQRModal: false,
  },

  onLoad(options) {
    const groupId       = (options && options.groupId)       || ''
    const serviceType   = (options && options.serviceType)   || 'haokang'
    const communityName = options && options.communityName
      ? decodeURIComponent(options.communityName) : ''
    const area          = options && options.area ? decodeURIComponent(options.area) : ''
    const houseType     = (options && options.houseType)     || ''
    const buildingNo    = options && options.buildingNo ? decodeURIComponent(options.buildingNo) : ''
    const unitNo        = options && options.unitNo ? decodeURIComponent(options.unitNo) : ''
    const flatNo        = options && options.flatNo ? decodeURIComponent(options.flatNo) : ''

    const SERVICE_NAMES = { haokang: '深度开荒', plus: '深度开荒 Plus', max: '深度开荒 Max' }
    const serviceName   = SERVICE_NAMES[serviceType] || serviceType || ''

    this.setData({ groupId, serviceType, communityName, area, houseType, buildingNo, unitNo, flatNo, serviceName })
    this._loadTeamDetail(groupId)
  },

  onShow() {
    const { groupId } = this.data
    if (groupId) this._loadTeamDetail(groupId)
  },

  async _loadTeamDetail(groupId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'manageGroup',
        data: { action: 'query', groupId },
      })
      const r = res && res.result
      if (r && r.ok) {
        this._applyDetail(r)
        return
      }
    } catch (e) {}
    // 云函数不可用时 Mock
    this._applyDetail({
      teamName:   this.data.communityName
        ? `${this.data.communityName} · ${this.data.serviceName}`
        : `我的邻里团 · ${this.data.serviceName}`,
      teamStatus:  'recruiting',
      teamCount:   1,
      teamTarget:  3,
      memberList:  MOCK_MEMBERS,
      inviteToken: groupId || 'mock_token',
      leaderTotalCount: 0,
    })
  },

  _applyDetail(r) {
    const teamStatus     = r.teamStatus || 'recruiting'
    const teamCount      = r.teamCount  !== undefined ? r.teamCount  : 1
    const teamTarget     = r.teamTarget !== undefined ? r.teamTarget : 3
    const teamFormed     = teamStatus === 'formed'
    const teamGap        = Math.max(0, teamTarget - teamCount)
    const teamPct        = Math.min(100, Math.round((teamCount / teamTarget) * 100))
    const teamStatusLabel = TEAM_STATUS_LABEL[teamStatus] || '招募中'

    const total = r.leaderTotalCount || 0
    let leaderProgressHint = ''
    if (total < 3)       leaderProgressHint = `再推荐且完工 ${3 - total} 户，解锁准团长`
    else if (total < 10) leaderProgressHint = `S1 ✓　再推荐且完工 ${10 - total} 户，解锁高级团长`
    else if (total < 30) leaderProgressHint = `S2 ✓　再推荐且完工 ${30 - total} 户，解锁荣誉团长`
    else                 leaderProgressHint = '全部等级已解锁'

    const inviteLink = this.data.groupId
      ? buildGroupLandingPath(this.data.groupId, this.data.communityName)
      : ''

    const teamName = r.teamName || (
      this.data.communityName
        ? `${this.data.communityName} · ${this.data.serviceName}`
        : `我的邻里团 · ${this.data.serviceName}`
    )

    this.setData({
      teamName,
      teamStatus,
      teamStatusLabel,
      teamFormed,
      teamCount,
      teamTarget,
      teamGap,
      teamPct,
      memberList:        r.memberList   || MOCK_MEMBERS,
      leaderProgressHint,
      inviteLink,
    })
  },

  // ── 生成 / 刷新二维码 ──
  async showShareQR() {
    const { groupId } = this.data
    this.setData({ showQRModal: true, qrLoading: true, qrCodeUrl: '' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'generateGroupQR',
        data: { groupId, envVersion: getMiniProgramEnvVersion() },
      })
      const r = res && res.result
      this.setData({
        qrCodeUrl:  (r && r.url)  || '',
        inviteLink: (r && r.inviteLink) || buildGroupLandingPath(groupId, this.data.communityName),
        qrLoading:  false,
      })
    } catch (e) {
      this.setData({ qrLoading: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  },

  closeQRModal() { this.setData({ showQRModal: false }) },

  copyInviteLink() {
    const { inviteLink, groupId } = this.data
    const link = inviteLink || buildGroupLandingPath(groupId, this.data.communityName)
    wx.setClipboardData({
      data: `我在上手吧发起了邻里开荒团，一起参团立享 ¥2/㎡ 优惠：${link}`,
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

  // ── 成团后去下单 ──
  goCheckout() {
    const { groupId, serviceType, communityName, area, houseType, buildingNo, unitNo, flatNo, teamFormed } = this.data
    if (!teamFormed) {
      wx.showToast({ title: '还未成团，继续邀请邻居吧', icon: 'none' })
      return
    }
    const params = [
      `groupId=${groupId}`,
      `groupMode=community_group`,
      `serviceType=${serviceType}`,
      `communityName=${encodeURIComponent(communityName)}`,
      `entryFrom=group_buy`,
    ]
    if (area)       params.push(`area=${encodeURIComponent(area)}`)
    if (houseType)  params.push(`houseType=${houseType}`)
    if (buildingNo) params.push(`buildingNo=${encodeURIComponent(buildingNo)}`)
    if (unitNo)     params.push(`unitNo=${encodeURIComponent(unitNo)}`)
    if (flatNo)     params.push(`flatNo=${encodeURIComponent(flatNo)}`)
    wx.navigateTo({ url: `/pages/checkout/checkout?${params.join('&')}` })
  },

  goLeaderBenefits() {
    wx.navigateTo({ url: '/pages/group-buy/group-buy?tab=leader' })
  },

  goBack() { wx.navigateBack() },
})
