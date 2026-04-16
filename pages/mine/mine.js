const orderContext = require('../../utils/order-context')

// 四步链路：每步痛点/价值文案
const BOOKING_CARD_TAGLINE = {
  '藏灰处理': '柜后、柜底的地面，这里的灰尘不清扫不会消失，通风气流会让他慢慢跑出来，造成莫名返灰现象。',
  '深度处理': '12–16 小时专业作业，清除装修硬残留、死角灰尘与废料。全程佩戴记录仪，完工后可查看回放。',
  '入住除尘': '家具搬入、安装期间会将残留装修灰二次扬起，在空气中重新沉降。从开荒到入住这段时间，会又积下薄薄一层——肉眼难见，但真实存在。',
  '搬家清洁': '搬运结束后，清除一切痕迹与落灰，让新家从第一天起就干净清爽，彻底告别装修记忆。',
}
// 步骤标签
const BOOKING_CARD_STEP = {
  '藏灰处理': '第 1 步',
  '深度处理': '第 2 步',
  '入住除尘': '第 3 步',
  '搬家清洁': '第 4 步',
}
// 场景标签
const BOOKING_CARD_SCENE = {
  '藏灰处理': '柜子进场前',
  '深度处理': '家电家具进场前',
  '入住除尘': '入住乔迁前',
  '搬家清洁': '搬家后',
}
// 大标题展示名（覆盖 label 的显示用）
const BOOKING_CARD_DISPLAY_LABEL = {
  '深度处理': '深度开荒',
  '搬家清洁': '搬家收尾保洁',
}
// 未激活态下的 CTA 文案（按步骤定制）
const BOOKING_CARD_INACTIVE_CTA = {
  '藏灰处理': '立即激活 · 把握最后窗口期',
  '入住除尘': '立即激活 · 净家入住',
  '搬家清洁': '立即激活 · 搬家无忧',
}
// 注意提示文案（仅第 1 步藏灰处理未激活时展示）
const BOOKING_CARD_WARN = {
  '藏灰处理': '这是唯一的处理窗口。柜子一旦到场安装，这次机会就彻底关闭了。',
}

// 升级方案：适合场景 1 行；关键词最多 3 个
const UPGRADE_SCHEMES = {
  '藏灰处理': [
    {
      id: 'depot_only',
      title: '单独升级藏灰处理',
      scene: '柜体还没进场，现在还来得及先把柜后位置处理干净',
      benefits: ['柜后不埋灰', '后期不返灰', '装柜更安心'],
      priceType: 'fixed',
      fixedAmount: 300,
      includedServices: '仅藏灰处理',
      availability: 'when_depot_available',
    },
    {
      id: 'full_guard',
      title: '整体升级为守护计划',
      scene: '柜体还没进场，想把后面的入住除尘和搬家清洁也一起提前安排',
      benefits: ['柜后不埋灰', '后期不返灰', '装柜更安心'],
      priceType: 'per_sqm',
      pricePerSqm: 2,
      includedServices: '藏灰处理 + 入住除尘 + 搬家清洁',
      availability: 'when_depot_available',
    },
  ],
  '入住除尘': [
    {
      id: 'prep_only',
      title: '单独升级入住除尘',
      scene: '柜体已经安装完，房子还要继续散味空置，入住前想再做一次彻底除尘',
      benefits: ['散味后再除尘', '高处细灰清掉', '入住更安心'],
      priceType: 'fixed',
      fixedAmount: 300,
      includedServices: '仅入住除尘',
      availability: 'always',
    },
    {
      id: 'prep_visit',
      title: '升级入住除尘 + 搬家清洁',
      scene: '快要入住了，想把入住前后的两次关键清洁一起安排掉',
      benefits: ['散味后再除尘', '高处细灰清掉', '入住更安心'],
      priceType: 'per_sqm',
      pricePerSqm: 1,
      includedServices: '入住除尘 + 搬家清洁',
      availability: 'always',
    },
    {
      id: 'full_guard',
      title: '整体升级为守护计划',
      scene: '柜体还没进场，想从现在开始把后面所有节点一次补齐',
      benefits: ['散味后再除尘', '高处细灰清掉', '入住更安心'],
      priceType: 'per_sqm',
      pricePerSqm: 2,
      includedServices: '藏灰处理 + 入住除尘 + 搬家清洁',
      availability: 'when_depot_available',
    },
  ],
  '搬家清洁': [
    {
      id: 'visit_only',
      title: '单独升级搬家清洁',
      scene: '已经准备搬家入住，只想把搬家后的收尾清洁交给我们',
      benefits: ['搬家后有人收尾', '不用自己再擦', '更接近拎包入住'],
      priceType: 'pending',
      includedServices: '仅搬家清洁',
      availability: 'always',
    },
    {
      id: 'prep_visit',
      title: '升级入住除尘 + 搬家清洁',
      scene: '近期就要入住，想把入住前和入住后的关键清洁一次安排好',
      benefits: ['搬家后有人收尾', '不用自己再擦', '更接近拎包入住'],
      priceType: 'per_sqm',
      pricePerSqm: 1,
      includedServices: '入住除尘 + 搬家清洁',
      availability: 'always',
    },
    {
      id: 'full_guard',
      title: '整体升级为守护计划',
      scene: '柜体还没进场，想把整个入住链路一次补齐',
      benefits: ['搬家后有人收尾', '不用自己再擦', '更接近拎包入住'],
      priceType: 'per_sqm',
      pricePerSqm: 2,
      includedServices: '藏灰处理 + 入住除尘 + 搬家清洁',
      availability: 'when_depot_available',
    },
  ],
}

// 4 个服务节点的固定定义（激活前后文案 + 升级弹层：痛点短句 + 解释长文）
const NODE_DEFS = [
  {
    label: '藏灰处理',
    inactiveDesc: '柜后埋灰，一直返灰',
    activeDesc: '安心装柜，没有埋灰',
    fullDesc: '柜体安装后，背后的灰尘再也无法清洁。藏灰处理在安装前提前处理墙角、踢脚线等容易藏灰的位置，从根源避免灰尘被封在柜后，防止日后持续"返灰"。这是守护计划里最值得提前约的一步，错过安装窗口就再也补不了。',
    painShort: '柜后埋灰，一直返灰',
    explainLong: '柜体安装后，后方和侧边很多位置后期根本碰不到；若不提前处理，灰会一直封在里面，入住后还会慢慢返出来；这一步是为防止灰被埋在柜后，后期越住越烦。',
  },
  {
    label: '深度处理',
    inactiveDesc: '灰和残渍，还在家里',
    activeDesc: '全程记录，严管工具',
    fullDesc: '装修结束后，细灰和化学粉尘会附着在地面、家具和角落，肉眼难以分辨。深度处理：在深度开荒基础上的进一步强化处理。装修结束后，细灰和化学粉尘会附着在地面、家具和角落，肉眼难以分辨。深度处理采用专业工具和严格消毒流程，全程留存工具记录和操作记录，确保每一步都可追溯、可查验，让家居安全有保障。',
    painShort: '装完柜子，不做深度处理，灰和残渍还在家里',
    explainLong: '柜体安装完成后，全屋还会有大量细灰、残渍和工具带来的脏污；不做一次彻底深度处理，前面的清洁效果不算真正完成；这一步决定入住前的整体洁净感和安全感。',
  },
  {
    label: '入住除尘',
    inactiveDesc: '散味数月，积灰重来',
    activeDesc: '深度除尘，安心入住',
    fullDesc: '开荒结束后，房子通常要空置散味数月。这段时间灰尘会重新积累，梅雨季湿度高时霉菌和细菌繁殖风险显著上升。入住前的入住除尘，针对空置期的积尘和高处落灰做彻底清理，让你进门那天就是最干净的状态。',
    painShort: '散味数月，积灰重来；遇上雨季，细菌加倍',
    explainLong: '开荒完成后，房子通常还会空置散味一段时间，高处和表面会再次落灰；若赶上潮湿或雨季，灰尘和细菌问题会更明显；入住前不再除尘，前面的清洁很容易被重新覆盖。',
  },
  {
    label: '搬家清洁',
    inactiveDesc: '搬家一折腾，还得自己收尾',
    activeDesc: '拎包入住，真正兑现',
    fullDesc: '搬家过程是"二次脏乱"的高发时段：纸箱、搬运工具、家具拆装都会让刚做好的保洁效果大打折扣。搬家清洁在搬入完成后做一次收尾，把搬家带来的脏乱重新处理，真正兑现"拎包入住"的承诺，不让客户自己收尾。',
    painShort: '搬家一折腾，还得自己再收拾',
    explainLong: '搬家、进家具、拆包装之后，家里通常会再次变脏变乱；没有搬家清洁，前面的清洁成果会被搬家过程抵消一大块；这一步是为了真正接近「拎包入住」。',
  },
]

Page({
  data: {
    cashAmount: null,
    cashDisplay: '--',
    pendingAmount: 0,
    pendingDisplay: '--',
    orderList: [],
    orderDisplayList: [],
    bookingNodes: [],
    leaderLevelLabel: '尊贵用户',
    leaderProgressHint: '',
    myCouponCount: 0,
    lifecycleGuideText: '做完基础开荒，后面这些环节继续做好，住进去才更省心',

    // 升级弹层：方案选中 + 底部确认跳转
    showUpgradeModal: false,
    upgradeModalNode: null,
    upgradeOptions: [],
    selectedUpgradeOption: null,

    // 预约时间弹窗
    showBookingModal: false,
    bookingModalNode: null,
    bookingModalMode: 'book',
    selectedSlot: '上午',
    /** 藏灰 / 备住(入住除尘) / 回访(搬家保洁) 各自档期入口占位，后续接独立库存 */
    bookingInventoryKey: '',
    /** 从订单详情预约/改期进入时，提交档期用该 orderId（否则用当前生效主计划） */
    scheduleSubmitOrderId: '',
    // 月历
    calendarYear: 0,
    calendarMonth: 0,
    calendarDays: [],
    calendarMinDate: '',
    calendarMaxDate: '',
    selectedDateStr: '',
    pendingFocusOrderId: '',
    pendingScheduleFlow: '',
    pendingScheduleOrderId: '',
    showServicePickerModal: false,
    servicePickerTitle: '',
    servicePickerItems: [],
    servicePickerFlow: '',
    servicePickerOrderId: '',
  },

  onLoad(options) {
    const focusOrderId = options && options.focusOrderId ? decodeURIComponent(options.focusOrderId) : ''
    if (focusOrderId) this.setData({ pendingFocusOrderId: focusOrderId })
    const sf = options && options.scheduleFlow ? String(options.scheduleFlow) : ''
    const soid = options && options.scheduleOrderId ? decodeURIComponent(options.scheduleOrderId).trim() : ''
    if ((sf === 'book' || sf === 'reschedule') && soid) {
      this.setData({ pendingScheduleFlow: sf, pendingScheduleOrderId: soid })
    }
    this.syncOrderList()
  },

  onShow() {
    this.syncCashAmount()
    this._loadLeaderLevel()
    this._loadCouponCount()
    this.syncOrderList().then(() => {
      if (this.data.pendingScheduleFlow && this.data.pendingScheduleOrderId) {
        this._consumePendingScheduleFlowIfNeeded()
        return
      }
      this.openFocusedOrderIfNeeded()
    })
  },

  async _loadLeaderLevel() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getReferralStats' })
      const r = res && res.result
      if (r && r.ok) {
        const total = r.validCount || 0
        let label = '尊贵用户'
        if (total >= 30) label = '荣誉团长'
        else if (total >= 10) label = '高级团长'
        else if (total >= 3) label = '准团长'
        let leaderProgressHint = ''
        if (total < 3) {
          leaderProgressHint = `已推荐且完工 ${total} 户 · 距准团长还差 ${3 - total} 户`
        } else if (total < 10) {
          leaderProgressHint = `准团长 · 距高级团长还差 ${10 - total} 户`
        } else if (total < 30) {
          leaderProgressHint = `高级团长 · 距荣誉团长还差 ${30 - total} 户`
        } else {
          leaderProgressHint = '荣誉团长 · 已获得最高权益'
        }
        this.setData({ leaderLevelLabel: label, leaderProgressHint })
      }
    } catch (e) {
      this.setData({ leaderProgressHint: '推荐邻居完工后解锁团长权益' })
    }
  },

  // 与 order-detail 的 normalizeDisplayStatus 保持完全一致
  normalizeListStatus(status) {
    const map = { '服务中': '深度处理中', '勘察完工': '待深处理', '已完成': '已交付' }
    return map[status] || status
  },

  /** 从当前主计划解析面积（㎡）；无法可靠解析时不展示按㎡总价 */
  _parseOrderAreaSqm(plan) {
    if (!plan) return { parsed: false, sqm: null }
    const raw = String(plan.orderArea || plan.area || '').trim()
    if (!raw) return { parsed: false, sqm: null }
    const m = raw.match(/(\d+(?:\.\d+)?)/)
    if (!m) return { parsed: false, sqm: null }
    const n = parseFloat(m[1])
    if (!Number.isFinite(n) || n <= 0) return { parsed: false, sqm: null }
    return { parsed: true, sqm: n }
  },

  /** 是否还来得及做藏灰处理（占位，后续可接业务） */
  getCanStillDoDepot() {
    const app = getApp()
    if (app.globalData && typeof app.globalData.canStillDoDepot === 'boolean') return app.globalData.canStillDoDepot
    return true
  },

  // 产品类型推断（与 order-detail.js 口径一致）
  inferProductTypeFromName(name) {
    const text = String(name || '')
    if (text.includes('守护') || text.includes('升级')) return 'hujin'
    if (text.includes('360') || text.includes('全护')) return '360'
    return 'haokang'
  },

  /**
   * 当前房子识别键。
   * 优先级永远是：houseId / projectId / currentHouseKey（来自 app.globalData）。
   * 以下「取最新有效订单的 communityName + roomNo」仅为当前开发阶段临时兜底，没有上述字段时才使用，不作为长期正式方案；正式环境应由后端或登录态提供 houseId/projectId。
   */
  getCurrentHouseKey(orderList) {
    const app = getApp()
    const fromApp = (app.globalData && (app.globalData.houseId || app.globalData.projectId || app.globalData.currentHouseKey)) || ''
    if (fromApp) return String(fromApp)
    const excluded = ['退款处理中', '已退款']
    const effective = (orderList || []).filter(o => !excluded.includes(o.displayStatus || o.status))
    if (effective.length === 0) return null
    const sorted = effective.slice().sort((a, b) => {
      const da = a.serviceDate || a.date || a.sub || ''
      const db = b.serviceDate || b.date || b.sub || ''
      return db.localeCompare(da)
    })
    const first = sorted[0]
    const c = String(first.communityName || '').trim()
    const r = String(first.roomNo || '').trim()
    return c && r ? `${c}_${r}` : null
  },

  /** 生成订单稳定标识：优先 orderId，否则 productType + communityName + roomNo + serviceDate */
  buildStableOrderKey(order) {
    if (!order) return ''
    if (order.orderId) return String(order.orderId)
    const pt = order.productType || this.inferProductTypeFromName(order.name)
    const c = String(order.communityName || '').trim()
    const r = String(order.roomNo || '').trim()
    const d = String(order.serviceDate || order.date || order.sub || '').trim()
    return `${pt}_${c}_${r}_${d}`
  },

  /**
   * 当前生效主服务计划：当前房子下最新的、已支付生效、未退款的主套餐。
   * 优先级：精细升级守护/入住守护/360 > 深度开荒。开发测试时可临时指定一条为演示主计划（仅 devDemoPlanEnabled 时生效）。
   */
  getCurrentEffectivePlan(orderList) {
    const list = orderList || []
    const houseKey = this.getCurrentHouseKey(list)
    const inHouse = houseKey
      ? list.filter(o => `${String(o.communityName || '').trim()}_${String(o.roomNo || '').trim()}` === houseKey)
      : []
    const excluded = ['退款处理中', '已退款']
    const effective = inHouse.filter(o => !excluded.includes(o.displayStatus || o.status))

    const devEnabled = wx.getStorageSync('devDemoPlanEnabled') === true
    if (devEnabled) {
      const demoKey = wx.getStorageSync('mockDemoMainPlan')
      if (demoKey && typeof demoKey === 'string') {
        const match = list.find(o => this.buildStableOrderKey(o) === demoKey)
        if (match) return match
      }
    }

    if (effective.length === 0) return null
    const pt = o => o.productType || this.inferProductTypeFromName(o.name)
    const priority = o => (pt(o) === 'hujin' || pt(o) === '360' ? 1 : 0)
    const dateStr = o => o.serviceDate || o.date || o.sub || ''
    const sorted = effective.slice().sort((a, b) => {
      if (priority(b) !== priority(a)) return priority(b) - priority(a)
      return (dateStr(b) || '').localeCompare(dateStr(a) || '')
    })
    return sorted[0] || null
  },

  _applyDepotExpired(nodes) {
    const can = this.getCanStillDoDepot()
    if (nodes[0] && nodes[0].label === '藏灰处理' && !nodes[0].entitled && !can) {
      nodes[0].status = '已过时点'
      nodes[0].actionText = ''
    }
    return this._enrichBookingCardDisplay(nodes)
  },

  /** 卡片面：步骤/场景/短句 + 未激活仅「点击激活」/ 藏灰过时仅「已过时点」 */
  _enrichBookingCardDisplay(nodes) {
    nodes.forEach(n => {
      n.cardTagline   = BOOKING_CARD_TAGLINE[n.label] || ''
      n.cardStep      = BOOKING_CARD_STEP[n.label]    || ''
      n.cardScene     = BOOKING_CARD_SCENE[n.label]   || ''
      n.displayLabel  = BOOKING_CARD_DISPLAY_LABEL[n.label] || n.label
      const depotExpired =
        !n.entitled && n.label === '藏灰处理' && !this.getCanStillDoDepot()
      n.isDepotExpiredCard = depotExpired
      if (!n.entitled) {
        n.inactiveFooterText = depotExpired
          ? '已过时点'
          : (BOOKING_CARD_INACTIVE_CTA[n.label] || '点击激活')
        n.warnText = depotExpired ? '' : (BOOKING_CARD_WARN[n.label] || '')
      } else {
        n.inactiveFooterText = ''
        n.warnText = ''
      }
    })
    return nodes
  },

  /**
   * 计算 4 个服务节点状态，只跟「当前生效主服务计划」plan 走。
   * 藏灰处理在 canStillDoDepot 为 false 时卡片面显示「已过时点」。
   */
  computeBookingNodes(plan) {
    const actionTextMap = { book: '预约', upgrade: '点击激活', buy: '点击激活', none: '' }
    const makeNode = (defIdx, entitled, status, type, actionType) => ({
      ...NODE_DEFS[defIdx],
      desc: entitled ? NODE_DEFS[defIdx].activeDesc : NODE_DEFS[defIdx].inactiveDesc,
      entitled,
      status,
      type,
      actionType,
      actionText: actionTextMap[actionType] || '',
    })

    if (!plan) {
      return this._applyScheduleResult(null, this._applyDepotExpired([
        makeNode(0, false, '未激活', 'inactive', 'buy'),
        makeNode(1, false, '未激活', 'inactive', 'buy'),
        makeNode(2, false, '未激活', 'inactive', 'buy'),
        makeNode(3, false, '未激活', 'inactive', 'buy'),
      ]))
    }

    const rawType = plan.productType || this.inferProductTypeFromName(plan.name)
    const productType = String(rawType || '').toLowerCase()
    const nameStr = String(plan.name || '')
    const isHaokang = productType === 'haokang' || (nameStr.includes('开荒') && !nameStr.includes('升级') && !nameStr.includes('守护'))
    const isHujin = (productType === 'hujin' || productType === '360') && !isHaokang

    const deepStatus = (plan.deepProcessStatus || plan.bookingStatus || plan.nodeStatus) || '已预约'
    const deepIsBooked = deepStatus !== '可预约' && deepStatus !== '预约'
    const deepType = deepIsBooked ? 'booked' : 'available'
    const deepAction = deepIsBooked ? 'none' : 'book'

    if (isHaokang) {
      return this._applyScheduleResult(plan, this._applyDepotExpired([
        makeNode(0, false, '未激活', 'inactive', 'upgrade'),
        makeNode(1, true, deepStatus, deepType, deepAction),
        makeNode(2, false, '未激活', 'inactive', 'upgrade'),
        makeNode(3, false, '未激活', 'inactive', 'upgrade'),
      ]))
    }

    if (isHujin) {
      const node0Status = (plan.depotStatus != null && plan.depotStatus !== '') ? plan.depotStatus : '可预约'
      const node2Status = (plan.prepStatus != null && plan.prepStatus !== '') ? plan.prepStatus : '可预约'
      const node3Status = (plan.visitStatus != null && plan.visitStatus !== '') ? plan.visitStatus : '可预约'
      const toType = s => (s === '已预约' || s === '已完成' || (s !== '可预约' && s !== '预约')) ? 'booked' : 'available'
      const toAction = s => toType(s) === 'booked' ? 'none' : 'book'
      return this._applyScheduleResult(plan, this._applyDepotExpired([
        makeNode(0, true, node0Status, toType(node0Status), toAction(node0Status)),
        makeNode(1, true, deepStatus, deepType, deepAction),
        makeNode(2, true, node2Status, toType(node2Status), toAction(node2Status)),
        makeNode(3, true, node3Status, toType(node3Status), toAction(node3Status)),
      ]))
    }

    return this._applyScheduleResult(plan, this._applyDepotExpired([
      makeNode(0, false, '未激活', 'inactive', 'buy'),
      makeNode(1, false, '未激活', 'inactive', 'buy'),
      makeNode(2, false, '未激活', 'inactive', 'buy'),
      makeNode(3, false, '未激活', 'inactive', 'buy'),
    ]))
  },

  _applyScheduleResult(plan, nodes) {
    if (!plan || !plan.scheduleResult || !plan.scheduleResult.nodeBookings) return nodes
    const bookings = plan.scheduleResult.nodeBookings
    return nodes.map(node => {
      const booking = bookings[node.label]
      if (!booking) return node
      return {
        ...node,
        status: '已预约',
        type: 'booked',
        actionType: 'none',
        actionText: '',
        bookedDate: booking.dateLabel || '',
        bookedSlot: booking.slot || '',
      }
    })
  },

  async syncOrderList() {
    let orderList = []
    try {
      if (!wx.cloud || !wx.cloud.callFunction) {
        throw new Error('CLOUD_UNAVAILABLE')
      }
      const currentUser = orderContext.getCurrentUser()
      const res = await wx.cloud.callFunction({
        name: 'listMyOrders',
        data: {
          currentUser: {
            userId: currentUser.userId,
          },
        },
      })
      const result = res && res.result ? res.result : {}
      if (!result.ok || !Array.isArray(result.list)) {
        throw new Error(result.error || 'LIST_MY_ORDERS_FAILED')
      }
      const cached = orderContext.replaceOrdersForCurrentUserFromServer(result.list)
      orderList = cached.map(orderContext.toOrderListItem)
    } catch (error) {
      orderList = orderContext.getOrdersForCurrentUser().map(orderContext.toOrderListItem)
    }
    const orderDisplayList = orderList.slice()
    const plan = this.getCurrentEffectivePlan(orderList)
    const bookingNodes = this.computeBookingNodes(plan)
    const lifecycleGuideText = this._computeLifecycleGuide(plan)
    this.setData({ orderList, orderDisplayList, bookingNodes, lifecycleGuideText })
    return orderList
  },

  applyOrderListState(orderList) {
    const orderDisplayList = orderList.slice()
    const plan = this.getCurrentEffectivePlan(orderList)
    const bookingNodes = this.computeBookingNodes(plan)
    const lifecycleGuideText = this._computeLifecycleGuide(plan)
    this.setData({ orderList, orderDisplayList, bookingNodes, lifecycleGuideText })
    return orderList
  },

  /** 根据当前套餐生成「居住周期强化区」顶部引导文案 */
  _computeLifecycleGuide(plan) {
    if (!plan) return '做完基础开荒，后面这些环节继续做好，住进去才更省心'
    const rawType = String(plan.productType || this.inferProductTypeFromName(plan.name) || '').toLowerCase()
    const nameStr = String(plan.name || '')
    if (rawType === '360' || nameStr.includes('MAX') || nameStr.includes('Max')) {
      return '你已享受更高标准材料与家居保护方案'
    }
    if (rawType === 'hujin' || nameStr.includes('Plus') || nameStr.includes('plus') || nameStr.includes('守护')) {
      return '你的周期服务已开启，后续可继续安排与加强'
    }
    if (rawType === 'haokang' || nameStr.includes('开荒')) {
      return '你已完成基础开荒，后续还可继续加强这些环节'
    }
    return '从装修完到搬家入住，全阶段卫生守护'
  },

  callCloudFunction(name, data) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        reject(new Error('CLOUD_UNAVAILABLE'))
        return
      }
      wx.cloud.callFunction({
        name,
        data,
        success: res => resolve(res && res.result ? res.result : {}),
        fail: reject,
      })
    })
  },
  handleOrderItemTap(e) {
    this.goOrderDetail(e)
  },


  /** 开发测试：长按订单设为当前演示主计划。仅 devDemoPlanEnabled === true 时生效；正式模式下直接 return，不触发任何用户可感知提示。 */
  onOrderLongPress(e) {
    if (wx.getStorageSync('devDemoPlanEnabled') !== true) return
    const item = e.currentTarget.dataset
    if (!item || item.index === undefined) return
    const order = this.data.orderDisplayList && this.data.orderDisplayList[item.index]
    if (!order) return
    const key = this.buildStableOrderKey(order)
    if (!key) return
    wx.setStorageSync('mockDemoMainPlan', key)
    const plan = this.getCurrentEffectivePlan(this.data.orderList)
    const bookingNodes = this.computeBookingNodes(plan)
    this.setData({ bookingNodes })
    wx.showToast({ title: '已设为演示主计划', icon: 'none', duration: 1500 })
  },

  /** 开发测试：长按「我的订单」标题清除演示主计划。仅 devDemoPlanEnabled === true 时生效；正式模式下直接 return，不触发任何用户可感知提示。 */
  onClearDemoPlan() {
    if (wx.getStorageSync('devDemoPlanEnabled') !== true) return
    wx.removeStorageSync('mockDemoMainPlan')
    const plan = this.getCurrentEffectivePlan(this.data.orderList)
    const bookingNodes = this.computeBookingNodes(plan)
    this.setData({ bookingNodes })
    wx.showToast({ title: '已清除演示主计划', icon: 'none', duration: 1500 })
  },

  // ─── 升级弹层（方案选择前置到弹层内）────────────────────────────
  openUpgradeModal(e) {
    const { idx } = e.currentTarget.dataset
    const node = this.data.bookingNodes[idx]
    if (!node || node.entitled || node.label === '深度处理') return
    const canDepot = this.getCanStillDoDepot()
    const raw = UPGRADE_SCHEMES[node.label]
    const filtered = (raw || []).filter(opt => {
      if (opt.availability === 'always') return true
      if (opt.availability === 'when_depot_available') return canDepot
      return false
    })
    const plan = this.getCurrentEffectivePlan(this.data.orderList)
    const { parsed, sqm } = this._parseOrderAreaSqm(plan)
    const options = filtered.map(opt => {
      let priceAux = ''
      let priceMain = ''
      if (opt.priceType === 'fixed') {
        priceAux = '固定价'
        priceMain = `共 ¥${opt.fixedAmount}`
      } else if (opt.priceType === 'pending') {
        priceMain = '价格待确认'
      } else if (opt.priceType === 'per_sqm') {
        priceAux = `+${opt.pricePerSqm}元/㎡`
        priceMain = parsed ? `共 ¥${Math.round(sqm * opt.pricePerSqm)}` : '价格待确认'
      }
      const chips = (opt.benefits || []).slice(0, 3)
      return {
        id: opt.id,
        title: opt.title,
        priceAux,
        priceMain,
        valueLine: chips.join(' '),
      }
    })
    const selectedUpgradeOption = options.length === 1 ? options[0].id : null
    this.setData({
      showUpgradeModal: true,
      upgradeModalNode: node,
      upgradeOptions: options,
      selectedUpgradeOption,
    })
  },

  closeUpgradeModal() {
    this.setData({
      showUpgradeModal: false,
      upgradeModalNode: null,
      upgradeOptions: [],
      selectedUpgradeOption: null,
    })
  },

  preventBubble() { /* 阻止弹窗内容区冒泡关闭 */ },

  selectUpgradeOption(e) {
    const id = e.currentTarget.dataset.optionId
    if (!id) return
    this.setData({ selectedUpgradeOption: id })
  },

  goUpgrade() {
    const node = this.data.upgradeModalNode
    const selected = this.data.selectedUpgradeOption
    const options = this.data.upgradeOptions || []
    if (!node) {
      this.closeUpgradeModal()
      return
    }
    if (options.length > 0 && !selected) return
    this.closeUpgradeModal()
    const fromNode = encodeURIComponent(node.label)
    const query = selected
      ? `fromNode=${fromNode}&selectedUpgradeOption=${encodeURIComponent(selected)}`
      : `fromNode=${fromNode}`
    wx.navigateTo({ url: `/pages/upgrade/upgrade?${query}` })
  },

  /** 可走日历档期的服务（深处理仅人工，不进此列表） */
  _isCalendarBookingServiceLabel(label) {
    return label === '藏灰处理' || label === '入住除尘' || label === '搬家清洁'
  },

  _labelToBookingInventoryKey(label) {
    if (label === '藏灰处理') return 'depot'
    if (label === '入住除尘') return 'prep'
    if (label === '搬家清洁') return 'visit'
    return ''
  },

  _goContactScheduleCoordination() {
    wx.navigateTo({ url: '/pages/contact-schedule/contact-schedule' })
  },

  _consumePendingScheduleFlowIfNeeded() {
    const flow = this.data.pendingScheduleFlow
    const oid = this.data.pendingScheduleOrderId
    if (!flow || !oid) return
    this.setData({ pendingScheduleFlow: '', pendingScheduleOrderId: '' })
    const plan = (this.data.orderList || []).find(o => o.orderId === oid)
    if (!plan) {
      wx.showToast({ title: '未找到订单', icon: 'none' })
      return
    }
    const nodes = this.computeBookingNodes(plan)
    if (flow === 'book') {
      const items = []
      nodes.forEach(n => {
        if (this._isCalendarBookingServiceLabel(n.label) && n.entitled && n.actionType === 'book') {
          items.push({ label: n.label, kind: 'calendar' })
        }
      })
      if (items.length === 0) {
        wx.showToast({ title: '当前暂无可预约服务', icon: 'none' })
        return
      }
      this.setData({
        showServicePickerModal: true,
        servicePickerTitle: '选择要预约的服务',
        servicePickerItems: items,
        servicePickerFlow: 'book',
        servicePickerOrderId: oid,
      })
      return
    }
    if (flow === 'reschedule') {
      const items = []
      nodes.forEach(n => {
        if (n.label === '深度处理' && n.entitled && n.type === 'booked') {
          items.push({ label: n.label, kind: 'human' })
        }
        if (this._isCalendarBookingServiceLabel(n.label) && n.entitled && n.type === 'booked') {
          items.push({ label: n.label, kind: 'calendar' })
        }
      })
      if (items.length === 0) {
        wx.showToast({ title: '当前暂无可改期项', icon: 'none' })
        return
      }
      this.setData({
        showServicePickerModal: true,
        servicePickerTitle: '选择要改期的服务',
        servicePickerItems: items,
        servicePickerFlow: 'reschedule',
        servicePickerOrderId: oid,
      })
    }
  },

  closeServicePickerModal() {
    this.setData({
      showServicePickerModal: false,
      servicePickerTitle: '',
      servicePickerItems: [],
      servicePickerFlow: '',
      servicePickerOrderId: '',
    })
  },

  onServicePickerItemTap(e) {
    const { label, kind } = e.currentTarget.dataset
    const orderId = this.data.servicePickerOrderId
    const flow = this.data.servicePickerFlow
    if (!orderId || !label || !kind) return
    const plan = (this.data.orderList || []).find(o => o.orderId === orderId)
    if (!plan) {
      wx.showToast({ title: '未找到订单', icon: 'none' })
      return
    }
    const nodes = this.computeBookingNodes(plan)
    const node = nodes.find(n => n.label === label)
    if (!node) return
    if (kind === 'human') {
      this.closeServicePickerModal()
      this._goContactScheduleCoordination()
      return
    }
    this.closeServicePickerModal()
    this.initCalendar(this._labelToBookingInventoryKey(label))
    const slot = (node.bookedSlot && String(node.bookedSlot).trim()) ? String(node.bookedSlot).trim() : '上午'
    this.setData({
      showBookingModal: true,
      bookingModalNode: node,
      selectedSlot: slot === '下午' ? '下午' : '上午',
      bookingModalMode: flow === 'reschedule' ? 'reschedule' : 'book',
      scheduleSubmitOrderId: orderId,
    })
  },

  // ─── 预约弹窗 ──────────────────────────────────────────────────
  // ── 日期工具 ──────────────────────────────────────────────────
  _dateToStr(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  // 生成某年某月的日历格子（周一为首列）
  _buildCalendarDays(year, month, minDateStr, maxDateStr) {
    const days = []
    const firstDay = new Date(year, month - 1, 1)
    const totalDays = new Date(year, month, 0).getDate()
    // 周一首列偏移：JS getDay 0=周日，映射到 0=周一..6=周日
    const offset = (firstDay.getDay() + 6) % 7
    for (let i = 0; i < offset; i++) days.push({ empty: true })
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, dateStr, disabled: dateStr < minDateStr || dateStr > maxDateStr, empty: false })
    }
    return days
  },

  initCalendar(inventoryKey) {
    const today = new Date()
    const minD  = new Date(today); minD.setDate(today.getDate() + 1)   // 明天起
    const maxD  = new Date(today); maxD.setMonth(today.getMonth() + 6)  // 6 个月内
    const minDateStr = this._dateToStr(minD)
    const maxDateStr = this._dateToStr(maxD)
    const y = minD.getFullYear()
    const m = minD.getMonth() + 1
    const key = inventoryKey || ''
    this.setData({
      bookingInventoryKey: key,
      calendarYear: y,
      calendarMonth: m,
      calendarMinDate: minDateStr,
      calendarMaxDate: maxDateStr,
      calendarDays: this._buildCalendarDays(y, m, minDateStr, maxDateStr),
      selectedDateStr: '',
    })
  },

  prevCalendarMonth() {
    let { calendarYear, calendarMonth, calendarMinDate, calendarMaxDate } = this.data
    if (--calendarMonth < 1) { calendarMonth = 12; calendarYear-- }
    const minY = parseInt(calendarMinDate.slice(0, 4))
    const minM = parseInt(calendarMinDate.slice(5, 7))
    if (calendarYear < minY || (calendarYear === minY && calendarMonth < minM)) return
    this.setData({
      calendarYear, calendarMonth,
      calendarDays: this._buildCalendarDays(calendarYear, calendarMonth, calendarMinDate, calendarMaxDate),
    })
  },

  nextCalendarMonth() {
    let { calendarYear, calendarMonth, calendarMinDate, calendarMaxDate } = this.data
    if (++calendarMonth > 12) { calendarMonth = 1; calendarYear++ }
    const maxY = parseInt(calendarMaxDate.slice(0, 4))
    const maxM = parseInt(calendarMaxDate.slice(5, 7))
    if (calendarYear > maxY || (calendarYear === maxY && calendarMonth > maxM)) return
    this.setData({
      calendarYear, calendarMonth,
      calendarDays: this._buildCalendarDays(calendarYear, calendarMonth, calendarMinDate, calendarMaxDate),
    })
  },

  selectCalendarDate(e) {
    const { datestr, disabled, empty } = e.currentTarget.dataset
    if (empty || disabled || !datestr) return
    this.setData({ selectedDateStr: datestr })
  },

  openBookingModal(e) {
    const { idx } = e.currentTarget.dataset
    const node = this.data.bookingNodes[idx]
    if (!node || node.actionType !== 'book') return
    if (node.label === '深度处理') {
      this._goContactScheduleCoordination()
      return
    }
    if (!this._isCalendarBookingServiceLabel(node.label)) return
    this.initCalendar(this._labelToBookingInventoryKey(node.label))
    this.setData({
      showBookingModal: true,
      bookingModalNode: node,
      selectedSlot: '上午',
      bookingModalMode: 'book',
      scheduleSubmitOrderId: '',
    })
  },

  closeBookingModal() {
    this.setData({
      showBookingModal: false,
      bookingModalNode: null,
      bookingModalMode: 'book',
      scheduleSubmitOrderId: '',
      bookingInventoryKey: '',
    })
  },

  selectDate(e) {
    this.setData({ selectedDateIdx: e.currentTarget.dataset.idx })
  },

  selectSlot(e) {
    this.setData({ selectedSlot: e.currentTarget.dataset.slot })
  },

  // 整卡点击路由：未激活→升级弹层（深处理不进入），可预约→预约弹窗，其余无响应
  handleBookingCardTap(e) {
    const { idx } = e.currentTarget.dataset
    const node = this.data.bookingNodes[idx]
    if (!node) return
    if (!node.entitled) {
      if (node.label === '深度处理') return
      this.openUpgradeModal(e)
    } else if (node.actionType === 'book') {
      this.openBookingModal(e)
    }
  },

  async confirmBooking() {
    const { bookingModalNode, selectedDateStr, selectedSlot } = this.data
    if (!bookingModalNode) return
    if (!selectedDateStr) {
      wx.showToast({ title: '请先选择预约日期', icon: 'none', duration: 1500 })
      return
    }
    const parts = selectedDateStr.split('-')
    const dateLabel = `${parseInt(parts[1])}月${parseInt(parts[2])}日`

    const effective = this.getCurrentEffectivePlan(this.data.orderList)
    const submitOrderId = this.data.scheduleSubmitOrderId || (effective && effective.orderId)

    const bookingNodes = this.data.bookingNodes.map(n =>
      n.label === bookingModalNode.label
        ? { ...n, status: '已预约', type: 'booked', actionType: 'none', actionText: '', bookedDate: dateLabel, bookedSlot: selectedSlot }
        : n
    )
    this.setData({ bookingNodes, showBookingModal: false, bookingModalNode: null, bookingModalMode: 'book', scheduleSubmitOrderId: '', bookingInventoryKey: '' })
    if (submitOrderId) {
      const payload = {
        nodeName: bookingModalNode.label || '',
        dateLabel,
        slot: selectedSlot,
      }
      try {
        const result = await this.callCloudFunction('saveOrderSchedule', {
          orderId: submitOrderId,
          scheduleInput: payload,
        })
        if (!result || !result.ok || !result.orderId || !result.scheduleResult) {
          throw new Error(result && result.error ? result.error : 'SAVE_ORDER_SCHEDULE_FAILED')
        }
        orderContext.cacheOrderScheduleResult(result.orderId, result.scheduleResult, result.updatedAt)
        await this.syncOrderList()
      } catch (error) {
        orderContext.updateOrderSchedule(submitOrderId, payload)
        const fallbackOrderList = orderContext.getOrdersForCurrentUser().map(orderContext.toOrderListItem)
        this.applyOrderListState(fallbackOrderList)
      }
    }

    const nodeName = bookingModalNode.label || ''
    wx.navigateTo({
      url: `/pages/booking-result/booking-result?node=${encodeURIComponent(nodeName)}&date=${encodeURIComponent(dateLabel)}&slot=${encodeURIComponent(selectedSlot)}`,
    })
  },

  syncCashAmount() {
    wx.cloud.callFunction({
      name: 'getWalletBalance',
      success: (res) => {
        const r = res && res.result
        if (r && r.ok) {
          const amount = r.withdrawableBalance || 0
          const pending = r.pendingAmount || 0
          this.setData({
            cashAmount: amount,
            cashDisplay: '¥' + amount,
            pendingAmount: pending,
            pendingDisplay: '¥' + pending,
          })
        }
      },
      fail: () => {
        this.setData({ cashDisplay: '--', pendingDisplay: '--' })
      },
    })
  },

  ensureSchemeFlowState() {},

  inferPackageFlowType(name) {
    const text = String(name || '')
    if (text.includes('单次') || text.includes('一次')) return 'single'
    if (text.includes('不含藏灰') || text.includes('无藏灰')) return 'no_dust'
    return 'full'
  },

  goOrderDetail(e) {
    const {
      orderid, name, sub, status, invitecode, community, roomno,
      orderarea, servicedate, totalprice, grossprice,
      earlybirddiscount, newcomerdiscount, packageflowtype,
      producttype, isupgraded, upgradeprice,
    } = e.currentTarget.dataset
    if (orderid) {
      orderContext.setCurrentOrderId(orderid)
      wx.navigateTo({ url: orderContext.buildOrderDetailUrl(orderid) })
      return
    }

    const resolvedPackageFlowType = packageflowtype || this.inferPackageFlowType(name)

    wx.navigateTo({
      url: [
        '/pages/order-detail/order-detail',
        `?name=${encodeURIComponent(name)}`,
        `&sub=${encodeURIComponent(sub)}`,
        `&status=${encodeURIComponent(status)}`,
        `&inviteCode=${encodeURIComponent(invitecode || '')}`,
        `&community=${encodeURIComponent(community || '')}`,
        `&roomNo=${encodeURIComponent(roomno || '')}`,
        `&orderArea=${encodeURIComponent(orderarea || '')}`,
        `&serviceDate=${encodeURIComponent(servicedate || '')}`,
        `&totalPrice=${encodeURIComponent(totalprice || '')}`,
        `&grossPrice=${encodeURIComponent(grossprice || '')}`,
        `&earlyBirdDiscount=${encodeURIComponent(earlybirddiscount || '')}`,
        `&newcomerDiscount=${encodeURIComponent(newcomerdiscount || '')}`,
        `&packageFlowType=${encodeURIComponent(resolvedPackageFlowType)}`,
        `&productType=${encodeURIComponent(producttype || '')}`,
        `&isUpgraded=${encodeURIComponent(isupgraded ? 'true' : 'false')}`,
        `&upgradePrice=${encodeURIComponent(upgradeprice || 0)}`,
      ].join(''),
    })
  },

  openFocusedOrderIfNeeded() {
    const focusOrderId = this.data.pendingFocusOrderId
    if (!focusOrderId) return
    const hit = this.data.orderDisplayList.find(item => item.orderId === focusOrderId)
    if (!hit) {
      this.setData({ pendingFocusOrderId: '' })
      return
    }
    this.setData({ pendingFocusOrderId: '' })
    orderContext.setCurrentOrderId(focusOrderId)
    wx.navigateTo({ url: orderContext.buildOrderDetailUrl(focusOrderId) })
  },

  goWelfareCenter() {
    wx.navigateTo({ url: '/pages/welfare-center/welfare-center' })
  },

  goIndex() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.route === 'pages/index/index') return
    wx.reLaunch({ url: '/pages/index/index' })
  },

  goGroupBuyTab() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy' })
  },

  goInviteCenter() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=myteam' })
  },

  goMyCoupons() {
    wx.navigateTo({ url: '/pages/monthly-coupons/monthly-coupons' })
  },

  goDevBenefitTest() {
    wx.navigateTo({ url: '/pages/dev-benefit-test/dev-benefit-test' })
  },

  async _loadCouponCount() {
    try {
      if (!wx.cloud || !wx.cloud.callFunction) return
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'getMyBenefits',
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      const activeCoupons = ((res && res.coupons) || []).filter(c => c.status === 'active' && c.expiresAt > new Date().toISOString())
      this.setData({ myCouponCount: activeCoupons.length })
    } catch (e) { /* fallback */ }
  },

  goLeaderTab() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=leader' })
  },

  goWithdraw() {
    wx.navigateTo({ url: '/pages/withdraw/withdraw' })
  },
})
