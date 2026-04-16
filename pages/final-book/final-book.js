const orderContext = require('../../utils/order-context')

function safeDecode(value) {
  if (typeof value !== 'string') return value || ''
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

function firstFilled(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

function formatDisplayDate(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return text
  return `${match[1].slice(2)}-${match[2]}-${match[3]}`
}

function formatPrice(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.startsWith('¥') ? text : `¥${text}`
}

function parseListParam(value, fallback) {
  const text = safeDecode(value)
  if (!text) return fallback
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    return fallback
  }
}

/** 关键条款：页面仅展示短摘要（3～5 条），全文入口后续可再补 */
const KEY_TERMS_BRIEF = [
  '开荒当天请勿安排安装/修补；当日作业超出 16 小时部分按时薪计费（总价÷12，不足 1 小时按 1 小时）。',
  '新房粉尘可能沉降，内审后仍可能出现 6～12 小时轻灰，属客观现象。',
  '作业全程直播，有顾虑请提前说明。',
  '2 层及以上外窗不做蜘蛛人户外清洁；部分外窗可能无法使用擦窗机。',
  '服务当天师傅会现场确认窗户可清洁范围，请提前说明特殊顾虑。',
]

Page({
  data: {
    /* ── 基础信息（展示用，已格式化） ── */
    info: {
      customerName: '刘老师',
      serviceType: '开荒保洁',
      community: '薇棠轩',
      building: '28栋2单元602',
      area: '110㎡',
      price: '¥1210',
      serviceDate: '26-03-28',
      signDate: '2026-03-20',
    },

    /* ── 原始字段（用于生成 storage key，与 order-detail 保持一致） ── */
    orderId: '',
    _orderName: '',
    _communityName: '',
    _roomNo: '',
    _serviceDate: '',

    /* ── 当天现场情况 ── */
    siteItems: [
      { label: '服务当天有安装项目', value: '厨房橱柜安装' },
      { label: '家中有补漆地方',     value: '客厅墙角' },
      { label: '家中有贴膜地方',     value: '厨房台面' },
    ],

    /* ── 定制需求（仅非空时并入「现场确认摘要」） ── */
    customNeeds: [
      { prefix: '一．', text: '厨房重油污区域，重点处理' },
      { prefix: '二．', text: '阳台地面与窗槽，深度清洁' },
      { prefix: '三．', text: '儿童房家具表面，以保护为先' },
      { prefix: '四．', text: '补漆区域重点避让，部分位置不承诺特别清晰' },
      { prefix: '五．', text: '贴膜区域处理前需再次确认边界与操作方式' },
    ],
    showCustomNeeds: true,

    /* ── 服务承诺 ── */
    promises: [
      { tag: '费用承诺', text: '绝不临时加价' },
      { tag: '风控承诺', text: '全程摄录，留痕可查' },
      { tag: '标准承诺', text: '专人内审，严控质量' },
      { tag: '安全承诺', text: '禁用金属铲刀、钢丝球、高腐蚀性清洁剂' },
    ],

    /* ── 关键条款摘要（短句列表，非全文条款） ── */
    keyTermsBrief: KEY_TERMS_BRIEF,

    docMode: 'confirm_book',
    showActionButtons: true,
    pageReadonly: false,
    primaryActionText: '确认无误并完成',
    secondaryActionText: '需要沟通',

    /* final_view 时：是否已有正式 PDF（无 PDF 时显示过渡态提示） */
    hasPdf: false,

    /** 引导语（confirm / 查看态各不同） */
    heroDesc: '请确认以下内容后完成最后一步',
    /** 查看态状态胶囊；confirm_book 下为空不展示 */
    heroStatusChip: '',
  },

  onLoad(options) {
    const routeOrderId = safeDecode(options.orderId || '').trim()
    const currentOrder = routeOrderId
      ? (orderContext.getOrderById(routeOrderId) || {})
      : (orderContext.getCurrentOrder() || {})
    const effectiveOrderId = routeOrderId || String(currentOrder.orderId || '')
    if (effectiveOrderId) {
      orderContext.setCurrentOrderId(effectiveOrderId)
    }
    const nextInfo = { ...this.data.info }

    nextInfo.customerName = String(firstFilled(
      safeDecode(options.customerName),
      currentOrder.customerName,
      nextInfo.customerName
    ))

    nextInfo.serviceType = String(firstFilled(
      safeDecode(options.serviceType),
      safeDecode(options.orderName),
      currentOrder.serviceType,
      nextInfo.serviceType
    ))

    nextInfo.community = String(firstFilled(
      safeDecode(options.communityName),
      currentOrder.communityName,
      nextInfo.community
    ))

    nextInfo.building = String(firstFilled(
      safeDecode(options.roomNo),
      currentOrder.roomNo,
      nextInfo.building
    ))

    nextInfo.area = String(firstFilled(
      safeDecode(options.orderArea),
      safeDecode(options.area),
      currentOrder.orderArea,
      nextInfo.area
    ))

    nextInfo.price = formatPrice(firstFilled(
      safeDecode(options.totalPrice),
      safeDecode(options.price),
      currentOrder.totalPrice,
      nextInfo.price
    ))

    nextInfo.signDate = String(firstFilled(
      safeDecode(options.signDate),
      nextInfo.signDate
    ))

    const rawDocMode = safeDecode(options.docMode || options.bookMode || options.mode || '')
    const isFinalView = rawDocMode === 'final' || rawDocMode === 'final_view' || rawDocMode === 'view'

    const rawOrderName    = safeDecode(options.orderName    || '')
    const rawCommunityName = safeDecode(options.communityName || '')
    const rawRoomNo       = safeDecode(options.roomNo       || '')
    const rawServiceDate  = safeDecode(options.serviceDate  || '')

    let siteItems   = parseListParam(options.siteItems,   this.data.siteItems)
    let customNeeds = parseListParam(options.customNeeds, this.data.customNeeds)
    let promises    = parseListParam(options.promises,    this.data.promises)
    // 优先从云端订单 docFlow 读取，fallback 到 localStorage
    const cachedOrder = effectiveOrderId ? orderContext.getOrderById(effectiveOrderId) : null
    const cloudDocFlow = cachedOrder && cachedOrder.docFlow
    const rawSnapshot = (cloudDocFlow && cloudDocFlow.finalSnapshot)
      ? (typeof cloudDocFlow.finalSnapshot === 'string' ? cloudDocFlow.finalSnapshot : JSON.stringify(cloudDocFlow.finalSnapshot))
      : (effectiveOrderId ? orderContext.readDocFinalSnapshot(effectiveOrderId) : '')
    const rawConfirmData = (cloudDocFlow && cloudDocFlow.confirmData)
      ? (typeof cloudDocFlow.confirmData === 'string' ? cloudDocFlow.confirmData : JSON.stringify(cloudDocFlow.confirmData))
      : (effectiveOrderId ? orderContext.readDocConfirmData(effectiveOrderId) : '')

    try {
      if (isFinalView) {
        const snapshot = rawSnapshot
        if (snapshot) {
          const parsed = JSON.parse(snapshot)
          if (parsed) {
            if (Array.isArray(parsed.siteItems)   && parsed.siteItems.length)   siteItems   = parsed.siteItems
            if (Array.isArray(parsed.customNeeds) && parsed.customNeeds.length) customNeeds = parsed.customNeeds
            if (Array.isArray(parsed.promises)    && parsed.promises.length)    promises    = parsed.promises
          }
        }
      } else {
        const saved = rawConfirmData
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
            siteItems = this._buildSiteItems(parsed.items)
          }
        }
      }
    } catch (e) { /* storage 读取失败时静默回退到默认值 */ }

    const showCustomNeeds = Array.isArray(customNeeds) && customNeeds.length > 0
    const hasPdf = !!(effectiveOrderId && orderContext.readDocFinalPdf(effectiveOrderId))

    this.setData({
      docMode: isFinalView ? 'final_view' : 'confirm_book',
      showActionButtons: !isFinalView,
      pageReadonly: isFinalView,
      primaryActionText: '确认无误并完成',
      secondaryActionText: '需要沟通',

      info: nextInfo,
      siteItems,
      customNeeds,
      showCustomNeeds,
      promises,
      keyTermsBrief: KEY_TERMS_BRIEF,

      orderId: effectiveOrderId,
      _orderName:    rawOrderName,
      _communityName: rawCommunityName,
      _roomNo:       rawRoomNo,
      _serviceDate:  rawServiceDate,

      hasPdf,

      ...this._resolveHeroContent(isFinalView, hasPdf),
    })
  },

  /**
   * Hero：confirm_book 固定引导语；查看态短说明 + 状态胶囊。
   */
  _resolveHeroContent(isFinalView, hasPdf) {
    if (!isFinalView) {
      return {
        heroDesc:       '请确认以下内容后完成最后一步',
        heroStatusChip: '',
      }
    }
    if (hasPdf) {
      return {
        heroDesc:       '正式版已生成，若未自动打开 PDF，请返回订单页重新点击查看',
        heroStatusChip: '正式盖章版',
      }
    }
    return {
      heroDesc:       '以下为确认时的内容底稿，与正式盖章版一致后可查看 PDF',
      heroStatusChip: '已确认底稿',
    }
  },

  _buildSnapshot() {
    const { _orderName, _communityName, _roomNo, _serviceDate, info } = this.data
    return {
      schemaVersion: '1.0',
      docVersion:    1,
      confirmedAt:   new Date().toISOString(),

      orderInfo: {
        orderName:    _orderName,
        communityName: _communityName,
        roomNo:       _roomNo,
        serviceDate:  _serviceDate,
        customerName: info.customerName,
        serviceType:  info.serviceType,
        community:    info.community,
        building:     info.building,
        area:         info.area,
        price:        info.price,
        signDate:     info.signDate,
      },

      siteItems:   this.data.siteItems,
      customNeeds: this.data.customNeeds,
      promises:    this.data.promises,
    }
  },

  _buildSiteItems(items) {
    const labelMap = {
      '服务当天是否有安装项目': '当天安装项目',
      '家中是否有补过漆的地方': '家中补漆情况',
      '家中是否有贴过膜的地方': '家中贴膜情况',
    }
    return items.map(item => {
      const label = labelMap[item.label] || item.detailLabel || item.label
      let value = '未确认'
      if (item.selected === 'yes') {
        value = String(item.detailText || '').trim() || '有（未填写详情）'
      } else if (item.selected === 'no') {
        value = '无'
      }
      return { label, value }
    })
  },

  onConfirmBook() {
    if (this.data.pageReadonly) return

    const orderId = this.data.orderId || orderContext.getCurrentOrderId()
    if (!orderId) return

    const snapshot = this._buildSnapshot()
    orderContext.writeDocFinalSnapshot(orderId, JSON.stringify(snapshot))
    orderContext.writeDocFlowState(orderId, 'final')

    // 同步到云端（失败不阻塞）
    wx.cloud.callFunction({
      name: 'saveDocFlow',
      data: {
        orderId,
        flowState: 'final',
        finalSnapshot: snapshot,
      },
    }).catch(() => {})

    wx.showToast({ title: '承诺书已确认', icon: 'success', duration: 2000 })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) { wx.navigateBack({ delta: 1 }) }
      else { wx.navigateTo({ url: '/pages/mine/mine' }) }
    }, 2000)
  },

  /**
   * 沟通分支：仅 confirm_book；始终可点；不写文档状态 / snapshot；不走 onConfirmBook。
   */
  onNeedTalk() {
    if (this.data.docMode !== 'confirm_book') return
    wx.showToast({ title: '已收到，30分钟内联系您', icon: 'none', duration: 2000 })
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.navigateTo({ url: '/pages/mine/mine' })
    }
  },
})
