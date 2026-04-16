/**
 * group-landing — 邻里拼团落地页
 *
 * 场景：邻居扫二维码或点邀请链接后进入此页
 *
 * URL 参数：
 *   groupId  — 真实或 mock 团 ID
 *   scene    — 微信扫码注入，当前使用 s=<shortCode> 反查真实 groupId
 *
 * pageState：
 *   'loading'  — 读取团信息中
 *   'ready'    — 正常展示（open / formed / expired 通过 status 区分）
 *   'error'    — 团不存在 / 链接失效
 *
 * 用户路径：
 *   扫码进来 → 看团规则 + 看 3 种服务 → 点某个服务 → 带团身份进入下单页
 */

// ── Mock 数据（本地调试，无需云函数）─────────────────────────────
const MOCK_GROUPS = {
  mock_group_001: {
    groupId:        'mock_group_001',
    communityName:  '金地格林小镇',
    orgRoom:        '3 栋 2 单元 101 室',
    orgNickname:    '业主小王',
    targetCount:    3,
    memberCount:    2,        // 已有 2 人，差 1 人成团
    status:         'open',   // open | formed | expired
    discountPerSqm: 2,
    remainHours:    23,
    remainMinutes:  47,
    members: [
      { nickname: '业主小王', isOrg: true  },
      { nickname: '张邻居',   isOrg: false },
    ],
  },
}

// ── 三种服务定义（固定，不走后端）────────────────────────────────
const SERVICES = [
  {
    key:      'basic',
    name:     '深度开荒',
    productType: 'haokang',
    scene:    '柜子进场前',
    tagline:  '把装修灰彻底清干净，后续装修环节不返工',
    badge:    '',
  },
  {
    key:      'plus',
    name:     '深度开荒 Plus',
    productType: 'hujin',
    scene:    '大件家电家具进场前',
    tagline:  '开荒基础 + 后续补强全覆盖，入住更省心',
    badge:    '更受欢迎',
  },
  {
    key:      'max',
    name:     '深度开荒 Max',
    productType: '360',
    scene:    '高标准全程保护',
    tagline:  '更好的材料和家居保护方案，适合更讲究的家',
    badge:    '',
  },
]

Page({
  data: {
    // 团数据
    groupId:        '',
    communityName:  '',
    groupMode:      'community_group',
    orgRoom:        '',
    orgNickname:    '',
    targetCount:    3,
    memberCount:    0,
    status:         'open',
    discountPerSqm: 2,
    remainHours:    0,
    remainMinutes:  0,
    members:        [],

    // 计算值
    progressPct:  0,
    gapCount:     0,

    // 页面状态
    pageState: 'loading',  // loading | ready | error
    isMock:    false,

    // 服务列表（从常量注入）
    services: [],
  },

  onLoad(options) {
    // 路径1：小程序码扫码进入 → options.scene = URL编码的 "s=<shortCode>"
    // 路径2：wx.navigateTo 直接导航 → options.groupId
    let groupId = ''
    let shortCode = ''
    let entry = options.entry ? decodeURIComponent(options.entry) : ''
    const communityName = options.communityName ? decodeURIComponent(options.communityName) : ''
    const groupMode = options.groupMode ? decodeURIComponent(options.groupMode) : 'community_group'

    if (options.scene) {
      // 微信扫码时 scene 会被整体 URL 编码一次
      const scene = decodeURIComponent(options.scene)
      const shortCodeMatch = scene.match(/(?:^|[?&])s=([^&]+)/)
      if (shortCodeMatch) shortCode = shortCodeMatch[1]
      if (!shortCode) {
        const legacyMatch = scene.match(/(?:^|[?&])g=([^&]+)/)
        if (legacyMatch) groupId = legacyMatch[1]
      }
      entry = 'scan'
    }

    if (!groupId && options.groupId) {
      groupId = decodeURIComponent(options.groupId)
    }

    this.setData({
      groupId,
      communityName,
      groupMode: groupMode || 'community_group',
      services: SERVICES,
    })

    if (shortCode) {
      this._resolveShortCodeAndLoad(shortCode)
      return
    }

    if (!groupId) {
      this.setData({ pageState: 'error' })
      return
    }

    if (MOCK_GROUPS[groupId]) {
      this._applyGroupData(MOCK_GROUPS[groupId], true)
      return
    }

    this._loadFromCloud(groupId)
  },

  async _resolveShortCodeAndLoad(shortCode) {
    try {
      if (!wx.cloud || !wx.cloud.callFunction) throw new Error('NO_CLOUD')
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'manageGroup',
          data: { action: 'resolveShortCode', shortCode },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      const resolvedGroupId = String(res && res.groupId || '').trim()
      if (!resolvedGroupId) {
        this.setData({ pageState: 'error' })
        return
      }

      this.setData({
        groupId: resolvedGroupId,
        communityName: String((res && res.communityName) || this.data.communityName || '').trim(),
      })

      if (MOCK_GROUPS[resolvedGroupId]) {
        this._applyGroupData(MOCK_GROUPS[resolvedGroupId], true)
        return
      }

      this._loadFromCloud(resolvedGroupId)
    } catch (e) {
      this.setData({ pageState: 'error' })
    }
  },

  // ── 应用团数据 ──────────────────────────────────────────────────
  _applyGroupData(g, isMock) {
    const memberCount = g.memberCount  || 0
    const targetCount = g.targetCount  || 3
    const progressPct = Math.min(100, Math.round(memberCount / targetCount * 100))
    const gapCount    = Math.max(0, targetCount - memberCount)

    this.setData({
      communityName:  g.communityName  || this.data.communityName || '',
      orgRoom:        g.orgRoom        || '',
      orgNickname:    g.orgNickname    || '',
      targetCount,
      memberCount,
      status:         g.status         || 'open',
      discountPerSqm: g.discountPerSqm || 2,
      remainHours:    g.remainHours    || 0,
      remainMinutes:  g.remainMinutes  || 0,
      members:        g.members        || [],
      progressPct,
      gapCount,
      isMock,
      pageState: 'ready',
    })
  },

  // ── 云函数加载 ──────────────────────────────────────────────────
  async _loadFromCloud(groupId) {
    try {
      if (!wx.cloud || !wx.cloud.callFunction) throw new Error('NO_CLOUD')
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'manageGroup',
          data: { action: 'query', groupId },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      if (res && res.ok && res.group) {
        const g = res.group
        this._applyGroupData({
          groupId,
          communityName:  g.communityName  || '',
          orgRoom:        g.orgRoom        || '',
          orgNickname:    g.orgNickname    || '',
          targetCount:    g.targetCount    || 3,
          memberCount:    (g.members || []).length,
          status:         g.status         || 'open',
          discountPerSqm: g.discountPerSqm || 2,
          remainHours:    res.remainHours   || 0,
          remainMinutes:  res.remainMinutes || 0,
          members:        g.members        || [],
        }, false)
      } else {
        this.setData({ pageState: 'error' })
      }
    } catch (e) {
      this.setData({ pageState: 'error' })
    }
  },

  // ── 点击某个服务：带团身份跳转下单页 ───────────────────────────
  selectService(e) {
    const { status, groupId, communityName, discountPerSqm, groupMode } = this.data
    const serviceKey  = e.currentTarget.dataset.serviceKey
    const serviceName = e.currentTarget.dataset.serviceName
    const productType = e.currentTarget.dataset.productType

    if (status === 'expired') {
      wx.showToast({ title: '此团已过期，无法参与', icon: 'none' })
      return
    }

    // 带团购身份跳转到 checkout 下单页，传入团的真实 status 用于正确展示折扣态
    const params = [
      `groupId=${encodeURIComponent(groupId)}`,
      `communityName=${encodeURIComponent(communityName)}`,
      `serviceType=${encodeURIComponent(serviceName)}`,
      `serviceKey=${encodeURIComponent(serviceKey)}`,
      `productType=${encodeURIComponent(productType || '')}`,
      `groupMode=${encodeURIComponent(groupMode || 'community_group')}`,
      `groupStatus=${encodeURIComponent(status || 'open')}`,
      `groupDiscountPerSqm=${discountPerSqm}`,
      `entryFrom=group_buy`,
      `fromGroup=1`,
    ].join('&')

    wx.navigateTo({ url: `/pages/checkout/checkout?${params}` })
  },

  // ── 返回 ────────────────────────────────────────────────────────
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },
})
