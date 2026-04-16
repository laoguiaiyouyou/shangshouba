const orderContext = require('../../utils/order-context')

Page({
  data: {
    /* ── 页面参数 ── */
    showGroupHint: true,
    inviteCode: '',
    inviteModalStep: '',  // '' | 'ask' | 'noCode'
    communityName: '',
    roomNo: '',
    payChannel: 'wechat',
    floorWaxModalVisible: false,
    // 推荐相关
    hasActiveOrder: false,
    showRecommendQR: false,
    recommendQRUrl: '',
    recommendQRLoading: false,

    /* ── 首屏三枚营销胶囊：已从 Hero 红框内移出，数据保留供后续页内其它位置承接（本轮不在 Hero 渲染） ── */
    heroTags: [
      { key: 'hot',       text: '爆款',       show: true  },
      { key: 'earlybird', text: '早鸟价',     show: true  },
      { key: 'refund',    text: '开工前72h可退', show: true  },
    ],

    /* ── 服务流程（附件2 红框：占位图 + 4 条黄圈黑勾；防尘保护离场不保留）── */
    serviceFlowPhTitle: '',
    serviceFlowPhHint: '',
    serviceFlowSteps: [
      { title: '预约确认', desc: '1v1服务群建立，前一天发具体上门时间' },
      {
        title: '入场前全屋留痕',
        desc: '记录仪开机，拍摄原始状态，破损点标记存档',
      },
      { title: '全程直播作业', desc: '12小时以上精细作业，关键节点同步群内' },
      {
        title: '显尘灯逐间验收',
        desc: '白手套检验，不合格返工，完工拍照存档',
      },
    ],

    /* ── 我们 vs 行业传统（附件2 逐字；「高压气磅」以设计稿为准，若为笔误请改 compareVsRows）── */
    comparePlaceholderTitle: '',
    comparePlaceholderHint: '',
    compareVsRows: [
      { label: '售后', old: '3—7天', ours: '次日内就到' },
      { label: '检查', old: '肉眼看', ours: '显尘灯+强光灯' },
      { label: '消杀', old: '最多卫生间', ours: '全屋消杀' },
      { label: '除尘', old: '吸尘器+布', ours: '高压气磅吹尘枪' },
      { label: '除胶', old: '金属铲+钢丝球', ours: '塑料铲+进口除胶机' },
      { label: '工时', old: '8小时左右', ours: '不低于12小时' },
    ],

    /**
     * 服务项目一览（附件3→4→5 全文；顺序锁死 9 组）
     * 待确认句见项目 Plan：附件3 第⑤组第5条、附件4 卫浴/地面相关条、附件5 异味条等 — 上线前请对照原图核对
     * lines[].segs: { t, h } h=true 为黄字高亮；suffixTag=行末小标签；pillText=行末胶囊（打蜡说明）
     */
    serviceOverviewGroups: [
      {
        id: 'svc-g1',
        title: '深度除尘',
        subtitle: '',
        lines: [
          { segs: [{ t: '墙面 / 顶面 / 灯具静电除灰', h: false }] },
          {
            segs: [
              { t: '吊顶 / 灯带槽内', h: false },
              { t: '大功率吸尘', h: true },
              { t: '除尘', h: false },
            ],
          },
          { segs: [{ t: '空调滤网拆卸除灰', h: false }] },
          {
            segs: [
              { t: '空调进出风口', h: false },
              { t: '高压气泵吹尘枪', h: true },
              { t: '半拆吸尘', h: false },
            ],
          },
          {
            segs: [
              {
                t: '出风口进风口栅栏根部、风轮、蒸发器、翅片及接水盘深度清洁',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g2',
        title: '顽渍处理',
        subtitle: '',
        lines: [
          { segs: [{ t: '漆点 / 残胶等常见污渍处理', h: false }] },
          {
            segs: [
              { t: '美缝剂 / 玻璃胶等胶类处理（', h: false },
              { t: '进口除胶机', h: true },
              { t: '）', h: false },
            ],
          },
          { segs: [{ t: '防水涂料 / 水泥等顽渍处理', h: false }] },
          { segs: [{ t: '记号笔 / 乳胶漆 / 颜料油漆处理', h: false }] },
          {
            segs: [{ t: '柜内外撕膜标除胶除污渍及手印等', h: false }],
          },
        ],
      },
      {
        id: 'svc-g3',
        title: '窗户清洁',
        subtitle: '',
        lines: [
          { segs: [{ t: '玻璃窗户内外清洁', h: false }] },
          { segs: [{ t: '窗框 / 窗台深度清洁', h: false }] },
          {
            segs: [
              { t: '窗槽死角', h: false },
              { t: '高温蒸汽', h: true },
              { t: '高压冲洗', h: false },
            ],
          },
          { segs: [{ t: '纱窗（可拆）拆卸清洁', h: false }] },
          {
            segs: [
              { t: '框架窗槽积槽精细漏渍精细清洁 ', h: false },
              { t: '(除尘除胶率100%)', h: true },
            ],
          },
        ],
      },
      {
        id: 'svc-g4',
        title: '柜箱清洁',
        subtitle: '',
        lines: [
          { segs: [{ t: '柜保护膜 / 标签祛除', h: false }] },
          { segs: [{ t: '柜内外 / 五金件擦拭', h: false }] },
          { segs: [{ t: '柜可拆抽屉拆卸清洁', h: false }] },
          {
            segs: [
              {
                t: '专业栏板深度清洁，档板深度清洁（含垃圾桶）',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g5',
        title: '卫浴深洁',
        subtitle: '',
        lines: [
          { segs: [{ t: '卫生间墙面深度刷洗，角落边缝刷洗', h: false }] },
          { segs: [{ t: '各类柜面镜面擦拭', h: false }] },
          { segs: [{ t: '马桶、地漏 精细擦拭/高温蒸洗', h: false }] },
          {
            segs: [
              { t: '地面瓷砖吸尘/除胶/残留美缝等污渍深度清洁', h: false },
            ],
          },
          {
            segs: [
              {
                t: '排水槽、门槛锁扣除漆清洁设备，踢脚线清洁',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g6',
        title: '地面处理',
        subtitle: '',
        lines: [
          { segs: [{ t: '入户门、鞋柜除尘，除胶清洁', h: false }] },
          {
            segs: [
              { t: '复合/强化地板', h: false },
              { t: '专业深度养护清洁', h: true },
              { t: '（非纯实木不盲目打蜡，保护地板寿命）', h: false },
            ],
            pillText: '避坑随意打蜡赠送 点击看说明',
          },
          {
            segs: [
              {
                t: '踢脚线、墙角、厨房柜子底部、除尘除胶清洁',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g7',
        title: '杀菌消毒',
        subtitle: '',
        lines: [
          {
            segs: [
              {
                t: '全屋房间紫外线照射30分钟消毒杀菌（宠物/儿童/老人/敏感体质专属）',
                h: false,
              },
            ],
          },
          {
            segs: [
              { t: '全屋空调', h: false },
              { t: '高温蒸汽', h: true },
              { t: '消毒', h: false },
            ],
          },
          {
            segs: [
              {
                t: '全屋 卫生间/厨房/窗槽等高温蒸汽消杀',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g8',
        title: '专业验收及闭环体系',
        subtitle: '行业领先标准',
        lines: [
          {
            segs: [
              { t: '强光+白手套+显尘灯', h: true },
              { t: ' 三重内检，污渍/灰尘/暗渍三杀', h: false },
            ],
          },
          {
            segs: [
              { t: '队长专备开发内检系统拍照留痕全屋过检', h: false },
            ],
          },
          {
            segs: [
              {
                t: '区域督导当日随机时间突检，出具检查报告',
                h: false,
              },
            ],
          },
          {
            segs: [
              {
                t: '验收拍照留档，记录仪全天留痕，可查可看，卫生和安全全保障',
                h: false,
              },
            ],
          },
          {
            segs: [
              {
                t: '单独上门勘察 出具勘察方案书并盖章，有据可依 杜绝仅口头和宣传',
                h: false,
              },
            ],
          },
        ],
      },
      {
        id: 'svc-g9',
        title: '其他服务',
        subtitle: '',
        lines: [
          { segs: [{ t: '弱电箱 除尘清洁', h: false }] },
          {
            segs: [
              { t: '清洁前', h: false },
              { t: '软装防尘保护', h: true },
            ],
          },
          { segs: [{ t: '清洁后全屋防尘处理', h: false }] },
          { segs: [{ t: '垃圾搬运（不含建筑垃圾）', h: false }] },
          { segs: [{ t: '24小时 次日售后', h: false }] },
        ],
      },
    ],

    /* ── 首屏黑色数据带（3 列，与口碑区数据独立） ── */
    statBandStats: [
      { id: 'sb1', val: '4600+', label: '服务家庭' },
      { id: 'sb2', val: '84%', label: '转介绍占比' },
      { id: 'sb3', val: '97%', label: '满意好评' },
    ],

    /* ── 省钱方式 ── */
    expandedSaveCard: 'group',   // 当前选中：'group' | 'early'
    earlyBookState: 'pending',   // 'pending' | 'disabled' | 'available'
    earlyBookDays: 0,            // 距服务日天数

    /* ── Sticky CTA 弱化控制 ── */
    stickyWeaken: false,   // 当页尾收口区进入视口时设为 true

    /** 入口 productType：hujin / 360 时禁止进惊喜开荒 checkout，回订单流 */
    entryProductType: '',
    linkOrderId: '',

    /** 资格选择 */
    selectedQualify: '',  // 'invite' | 'group' | 'early'
  },

  onLoad(options) {
    const inviteToken = options.inviteToken
      ? decodeURIComponent(options.inviteToken)
      : (options.inviteCode ? decodeURIComponent(options.inviteCode) : '')
    if (inviteToken) {
      const parsed = orderContext.parseInviteToken(inviteToken)
      if (parsed) orderContext.setActiveInviteContext(parsed)
      this.setData({ inviteCode: inviteToken })
    }
    if (options.communityName) {
      this.setData({ communityName: decodeURIComponent(options.communityName) })
    }
    if (options.roomNo) {
      this.setData({ roomNo: decodeURIComponent(options.roomNo) })
    }
    let entryProductType = ''
    if (options.productType) {
      try {
        entryProductType = String(decodeURIComponent(options.productType)).toLowerCase()
      } catch (e) {
        entryProductType = String(options.productType).toLowerCase()
      }
    }
    let linkOrderId = ''
    if (options.orderId) {
      try {
        linkOrderId = decodeURIComponent(options.orderId).trim()
      } catch (e) {
        linkOrderId = String(options.orderId || '').trim()
      }
    }
    this.setData({ entryProductType, linkOrderId })
  },

  onReady() {
    /* 监听底部收口区是否进入视口，进入则弱化 Sticky CTA */
    const observer = wx.createIntersectionObserver(this, { thresholds: [0.1] })
    observer.relativeToViewport({ bottom: 0 }).observe('.detail-bottom-zone', (res) => {
      const entered = res.intersectionRatio > 0
      if (this.data.stickyWeaken !== entered) {
        this.setData({ stickyWeaken: entered })
      }
    })
  },

  onShow() {
    this._checkActiveOrder()
  },

  async _checkActiveOrder() {
    try {
      if (!wx.cloud || !wx.cloud.callFunction) return
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'listMyOrders',
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      const orders = (res && res.list) || []
      const hasActiveOrder = orders.some(o => o.status && o.status !== '已退款' && o.status !== '待支付')
      this.setData({ hasActiveOrder })
    } catch (e) { /* 查不到不影响页面 */ }
  },

  // ── 一键推荐 ────────────────────────────────────────────────────
  async handleRecommend() {
    this.setData({ showRecommendQR: true, recommendQRLoading: true, recommendQRUrl: '' })
    try {
      const cu = orderContext.getCurrentUser()
      // 确保推荐码存在
      const profileRes = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'ensureInviteProfile',
          data: { currentUser: { userId: cu.userId } },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      const inviteToken = (profileRes && profileRes.ok && profileRes.profile)
        ? profileRes.profile.inviteToken : ''
      if (!inviteToken) {
        this.setData({ recommendQRLoading: false })
        wx.showToast({ title: '推荐码获取失败', icon: 'none' })
        return
      }
      // 生成二维码
      const qrRes = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'generateInviteQR',
          data: { inviteToken },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      this.setData({
        recommendQRUrl: (qrRes && qrRes.ok && qrRes.url) ? qrRes.url : '',
        recommendQRLoading: false,
      })
    } catch (e) {
      this.setData({ recommendQRLoading: false })
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    }
  },

  closeRecommendQR() {
    this.setData({ showRecommendQR: false })
  },

  openFloorWaxModal() {
    this.setData({ floorWaxModalVisible: true })
  },

  closeFloorWaxModal() {
    this.setData({ floorWaxModalVisible: false })
  },

  toggleSaveCard(e) {
    const card = e.currentTarget.dataset.card
    if (card === 'early' && this.data.earlyBookState !== 'available') return
    if (this.data.expandedSaveCard !== card) {
      this.setData({ expandedSaveCard: card })
    }
  },

  onDateSelected(e) {
    const dateStr = e.detail && e.detail.date ? e.detail.date : (e.currentTarget.dataset.date || '')
    if (!dateStr) {
      this.setData({ earlyBookState: 'pending', earlyBookDays: 0 })
      return
    }
    const target = new Date(dateStr.replace(/-/g, '/'))
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
    const state = diffDays >= 60 ? 'available' : 'disabled'
    const update = { earlyBookState: state, earlyBookDays: diffDays }
    if (state === 'disabled' && this.data.expandedSaveCard === 'early') {
      update.expandedSaveCard = 'group'
    }
    this.setData(update)
  },

  noop() {},

  selectQualify(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ selectedQualify: this.data.selectedQualify === type ? '' : type })
  },

  handleQualifyCTA() {
    const q = this.data.selectedQualify

    // 1: 老客户邀请 → 打开自定义弹窗
    if (q === 'invite') {
      this.setData({ inviteModalStep: 'ask' })
      return
    }

    // 2: 发起团购 → 跳转开团页
    if (q === 'group') {
      wx.reLaunch({ url: '/pages/group-buy/group-buy' })
      return
    }

    // 3: 提前 60 天 → 直接进入选档期下定页
    if (q === 'early') {
      this.goCheckout()
      return
    }

    // 未选择或选了"不拼团不提前" → 直接进下定页
    this.goCheckout()
  },

  // ── 邀约弹窗操作 ──────────────────────────────────────────────
  closeInviteModal() {
    this.setData({ inviteModalStep: '' })
  },

  onInviteHasCode() {
    this.setData({ inviteModalStep: '' })
    this._scanInviteQR()
  },

  onInviteNoCode() {
    this.setData({ inviteModalStep: 'noCode' })
  },

  onInviteNoCodeOriginal() {
    this.setData({ inviteModalStep: '' })
    this.goCheckout()
  },

  onInviteNoCodeGroup() {
    this.setData({ inviteModalStep: '' })
    wx.reLaunch({ url: '/pages/group-buy/group-buy' })
  },

  _scanInviteQR() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (scanRes) => {
        const raw = scanRes.result || ''
        let shortCode = ''

        // 小程序码：scene=i%3DXXXXXX
        const sceneMatch = raw.match(/scene=([^&]+)/)
        if (sceneMatch) {
          const scene = decodeURIComponent(sceneMatch[1])
          if (scene.startsWith('i=')) shortCode = scene.slice(2).trim()
        }
        if (!shortCode && raw.startsWith('i=')) {
          shortCode = raw.slice(2).trim()
        }

        const tokenMatch = raw.match(/inviteToken=([^&]+)/)

        if (shortCode) {
          wx.showLoading({ title: '识别中…' })
          wx.cloud.callFunction({
            name: 'resolveInviteToken',
            data: { shortCode },
          }).then(res => {
            wx.hideLoading()
            const r = res && res.result
            if (r && r.valid && r.inviteContext) {
              orderContext.setActiveInviteContext(r.inviteContext)
              wx.showToast({ title: '邀约码已识别', icon: 'success' })
              setTimeout(() => this.goCheckout(), 800)
            } else {
              wx.showToast({ title: r && r.skipped === 'SELF_INVITE' ? '不能邀请自己' : '二维码无效', icon: 'none', duration: 2500 })
            }
          }).catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '识别失败，请重试', icon: 'none' })
          })
        } else if (tokenMatch) {
          const inviteToken = decodeURIComponent(tokenMatch[1])
          const parsed = orderContext.parseInviteToken(inviteToken)
          if (parsed) {
            orderContext.setActiveInviteContext(parsed)
            wx.showToast({ title: '邀约码已识别', icon: 'success' })
            setTimeout(() => this.goCheckout(), 800)
          } else {
            wx.showToast({ title: '二维码无效', icon: 'none' })
          }
        } else {
          wx.showToast({ title: '未识别到有效邀约码', icon: 'none', duration: 2500 })
        }
      },
    })
  },

  goCheckout() {
    const pt = this.data.entryProductType
    if (pt === 'hujin' || pt === '360') {
      const oid = this.data.linkOrderId
      if (oid) {
        orderContext.setCurrentOrderId(oid)
        wx.navigateTo({ url: orderContext.buildOrderDetailUrl(oid) })
        return
      }
      wx.showToast({
        title: '守护计划请从「我的-订单」进入，在本单预约服务档期',
        icon: 'none',
        duration: 2800,
      })
      return
    }
    const { inviteCode, communityName, roomNo } = this.data
    wx.navigateTo({
      url: `/pages/checkout/checkout?inviteToken=${encodeURIComponent(inviteCode || '')}&communityName=${encodeURIComponent(communityName || '')}&roomNo=${encodeURIComponent(roomNo || '')}`,
    })
  },

  goBack() {
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },

  onAlipayInfoTap() {
    wx.showToast({
      title: '小程序内请使用微信支付；支付宝请联系客服协助',
      icon: 'none',
      duration: 2600,
    })
  },
})
