const orderContext = require('../../utils/order-context')

function safeDecode(value) {
  if (typeof value !== 'string') return value || ''
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

function formatDisplayDate(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return text
  return `${match[1].slice(2)}-${match[2]}-${match[3]}`
}

Page({
  data: {
    basicInfo: {
      customerName: '张女士',
      serviceType: '家庭保洁',
      serviceDate: '26-03-28',
      communityName: '薇棠轩',
      roomNo: '28-2-602',
      area: '110㎡',
      totalPrice: '¥1210',
    },
    confirmItems: [
      { label: '服务当天是否有安装项目', selected: '', detailLabel: '安装项目', detailText: '' },
      { label: '家中是否有补过漆的地方',  selected: '', detailLabel: '位置',    detailText: '' },
      { label: '家中是否有贴过膜的地方',  selected: '', detailLabel: '位置',    detailText: '' },
    ],
    specialChoice: '',
    canSubmit: false,
    confirmDoneCount: 0,
    confirmTotalCount: 4,
    specialNotes: [
      '如存在补漆区域，清洁将以保护为先，部分位置可能无法处理到特别清晰，需客户理解。',
      '如存在贴膜区域，服务当天处理前需再次确认边界与操作方式。',
    ],
    extraNotes: [
      { prefix: '一．', text: '厨房重油污区域，重点处理' },
      { prefix: '二．', text: '阳台地面与窗槽，深度清洁' },
      { prefix: '三．', text: '儿童房家具表面，以保护为先' },
      { prefix: '四．', text: '补漆区域重点避让，部分位置不承诺特别清晰' },
      { prefix: '五．', text: '贴膜区域处理前需再次确认' },
    ],
    // mode: 'confirm_result' | 'confirm' | 'view'
    // confirm_result = 客户确认勘查结果，确认后推进到 confirm_book
    // confirm        = 旧版兼容
    // view           = 只读
    mode: 'confirm_result',
    inviteCode: '',
    orderId: '',
    _orderName: '',
    _serviceDate: '',
    _communityName: '',
    _roomNo: '',
  },

  onLoad(options) {
    const routeOrderId = options.orderId ? safeDecode(options.orderId).trim() : ''
    const currentOrder = routeOrderId
      ? (orderContext.getOrderById(routeOrderId) || {})
      : (orderContext.getCurrentOrder() || {})
    const effectiveOrderId = routeOrderId || String(currentOrder.orderId || '')
    if (effectiveOrderId) {
      orderContext.setCurrentOrderId(effectiveOrderId)
    }
    const nextBasicInfo = { ...this.data.basicInfo }
    let shouldUpdate = false

    if (options.orderName || currentOrder.serviceType) {
      nextBasicInfo.serviceType = safeDecode(options.orderName || currentOrder.serviceType)
      shouldUpdate = true
    }
    if (options.serviceDate || currentOrder.serviceDate) {
      nextBasicInfo.serviceDate = formatDisplayDate(safeDecode(options.serviceDate || currentOrder.serviceDate))
      shouldUpdate = true
    }
    if (options.communityName || currentOrder.communityName) {
      nextBasicInfo.communityName = safeDecode(options.communityName || currentOrder.communityName)
      shouldUpdate = true
    }
    if (options.roomNo || currentOrder.roomNo) {
      nextBasicInfo.roomNo = safeDecode(options.roomNo || currentOrder.roomNo)
      shouldUpdate = true
    }
    if (options.orderArea || currentOrder.orderArea) {
      nextBasicInfo.area = safeDecode(options.orderArea || currentOrder.orderArea)
      shouldUpdate = true
    }
    if (options.totalPrice || currentOrder.totalPrice) {
      const rawPrice = safeDecode(options.totalPrice || String(currentOrder.totalPrice || ''))
      nextBasicInfo.totalPrice = String(rawPrice).startsWith('¥') ? rawPrice : `¥${rawPrice}`
      shouldUpdate = true
    }

    const nextData = {}
    if (shouldUpdate) nextData.basicInfo = nextBasicInfo

    // mode 优先用 options.mode，不传则默认 confirm_result
    nextData.mode = options.mode ? safeDecode(options.mode) : 'confirm_result'
    if (options.inviteCode) nextData.inviteCode = safeDecode(options.inviteCode)
    nextData.orderId = effectiveOrderId

    // 保留原始字段用于展示与兼容，但文档流主键已收口到 orderId
    nextData._orderName = options.orderName ? safeDecode(options.orderName) : String(currentOrder.serviceType || '')
    nextData._serviceDate = options.serviceDate ? safeDecode(options.serviceDate) : String(currentOrder.serviceDate || '')
    nextData._communityName = options.communityName ? safeDecode(options.communityName) : String(currentOrder.communityName || '')
    nextData._roomNo = options.roomNo ? safeDecode(options.roomNo) : String(currentOrder.roomNo || '')

    if (Object.keys(nextData).length) this.setData(nextData)

    const n = (this.data.confirmItems && this.data.confirmItems.length) || 0
    this.setData({ confirmTotalCount: n + 1 }, () => this._checkCanSubmit())
  },

  _itemIsReady(item) {
    if (!item.selected) return false
    if (item.selected === 'yes' && !String(item.detailText || '').trim()) return false
    return true
  },

  _checkCanSubmit() {
    const items = this.data.confirmItems
    const allItemsReady = items.every(item => this._itemIsReady(item))
    const specialReady = this.data.specialChoice !== ''

    let done = 0
    items.forEach(item => {
      if (this._itemIsReady(item)) done += 1
    })
    if (specialReady) done += 1

    this.setData({
      canSubmit: allItemsReady && specialReady,
      confirmDoneCount: done,
    })
  },

  setConfirmItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = e.currentTarget.dataset.value
    const items = this.data.confirmItems.map((item, i) => {
      if (i !== index) return item
      return { ...item, selected: value, detailText: value === 'no' ? '' : item.detailText }
    })
    this.setData({ confirmItems: items }, () => this._checkCanSubmit())
  },

  onDetailInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const text  = e.detail.value || ''
    const items = this.data.confirmItems.map((item, i) => {
      if (i !== index) return item
      return { ...item, detailText: text }
    })
    this.setData({ confirmItems: items }, () => this._checkCanSubmit())
  },

  setSpecialChoice(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ specialChoice: value }, () => this._checkCanSubmit())
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1, fail: () => wx.navigateTo({ url: '/pages/mine/mine' }) })
      return
    }
    wx.navigateTo({ url: '/pages/mine/mine' })
  },

  /**
   * 客户点击"确认无异议"。
   *
   * mode = 'confirm_result'：客户确认勘查结果 → 写 confirm_book，下次进 order-detail 显示"确认承诺书"
   * mode = 'confirm'（旧版兼容）：同 confirm_result 行为
   * mode = 'view'：按钮不应出现，防御性返回
   */
  confirmNoObjection() {
    if (!this.data.canSubmit) return
    if (this.data.mode === 'view') return

    const orderId = this.data.orderId || orderContext.getCurrentOrderId()
    if (!orderId) return

    // 保存本次确认的现场情况，供 final-book 读取展示
    orderContext.writeDocConfirmData(orderId, JSON.stringify({
      items: this.data.confirmItems.map(item => ({
        label:       item.label,
        detailLabel: item.detailLabel,
        selected:    item.selected,
        detailText:  item.detailText || '',
      })),
      specialChoice: this.data.specialChoice,
    }))

    // confirm_result / confirm → 推进到 confirm_book
    orderContext.writeDocFlowState(orderId, 'confirm_book')

    // 同步到云端（失败不阻塞）
    const confirmPayload = {
      items: this.data.confirmItems.map(item => ({
        label:       item.label,
        detailLabel: item.detailLabel,
        selected:    item.selected,
        detailText:  item.detailText || '',
      })),
      specialChoice: this.data.specialChoice,
    }
    wx.cloud.callFunction({
      name: 'saveDocFlow',
      data: {
        orderId,
        flowState: 'confirm_book',
        confirmData: confirmPayload,
      },
    }).catch(() => {})

    wx.showToast({ title: '勘察方案已确认', icon: 'success', duration: 2000 })
    setTimeout(() => {
      wx.navigateBack({ delta: 1, fail: () => wx.navigateTo({ url: '/pages/mine/mine' }) })
    }, 2000)
  },

  /**
   * 沟通分支：始终可点；不校验 canSubmit；不写 storage、不推进 flowKey、不走确认提交流程。
   */
  needCommunication() {
    wx.showToast({ title: '已收到，30分钟内联系您', icon: 'none', duration: 2000 })
  },
})
