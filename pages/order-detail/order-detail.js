const orderContext = require('../../utils/order-context')
const wecom = require('../../utils/wecom')

const MY_ORDERS_KEY = 'myOrders'
const MY_COUPONS_KEY = 'myCoupons'

/** 深度开荒顶部进度五节点（顺序写死，与产品一致） */
const HAOKANG_PG_LABELS = ['待服务', '待勘查', '待深处理', '深处理中', '已交付']

/**
 * 将当前 orderStatus 映射到深度开荒链路的步骤索引（0..4）
 * 兼容工程内已有状态别名；守护专属状态若误入则兜底到末步前/末步。
 */
function resolveHaokangStepIndex(orderStatus) {
  const map = {
    待服务: 0,
    待勘查: 1,
    勘察完工: 2,
    待深处理: 2,
    深处理中: 3,
    已交付: 4,
    已完成: 4,
    藏灰处理中: 1,
    待备住除尘: 4,
    待搬家清洁: 4,
  }
  if (Object.prototype.hasOwnProperty.call(map, orderStatus)) return map[orderStatus]
  const i = HAOKANG_PG_LABELS.indexOf(orderStatus)
  return i >= 0 ? i : 0
}

function buildHaokangPgNodes(orderStatus) {
  const ci = resolveHaokangStepIndex(orderStatus)
  const n = HAOKANG_PG_LABELS.length
  return HAOKANG_PG_LABELS.map((label, i) => ({
    label,
    stateClass: i < ci ? 'pg-done' : (i === ci ? 'pg-active' : ''),
    isFirst: i === 0,
    isLast: i === n - 1,
  }))
}

Page({
  data: {
    /** normal | coupon_booking | error */
    detailLayout: 'normal',
    loadErrorTitle: '订单信息加载失败',
    loadErrorDesc: '请返回我的订单重试',
    isCouponBookingPending: false,
    showCouponInfoLine: false,
    couponInfoLine: '',
    showCouponNotice: false,
    couponNoticeLine: '',
    canApplyRefund: false,
    refundCountdown: '',
    orderId: '',
    orderName: '',
    orderSub: '',
    communityName: '薇棠轩',
    roomNo: '',
    orderArea: '',
    orderStatus: '',
    serviceDate: '',
    isRefundFlow: false,
    showInviteModule: true,
    packageFlowType: 'legacy',
    progressSteps: [],
    inviteCode: '',
    totalPrice: 0,
    grossPrice: 0,
    earlyBirdDiscount: 0,
    newcomerDiscount: 0,
    groupDiscount: 0,
    groupDiscountPerSqm: 0,  // 团购每㎡优惠口径
    isGroupMode: false,       // 来自邻里拼团的订单
    currentStageDesc: '',
    currentGuide: '',
    feeExpanded: false,
    totalDiscount: 0,
    // 产品类型（控制进度路径与升级展示）
    productType: 'haokang',  // 'haokang' | 'hujin' | '360'
    isHaokang: true,         // 深度开荒：只走单次深处理路径，不展示备住/回访节点
    isUpgraded: false,       // 是否为升级订单（深度开荒 → 守护计划）
    upgradePrice: 0,         // 升级补差金额
    // 文档状态链（统一出口）
    docActionText: '',
    docActionType: 'none', // 'none' | 'scheme' | 'final_confirm' | 'final_view'
    docActionDesc: '',
    docHasPdf: false,      // final_view 时：是否已有正式 PDF（控制标签视觉）
    /** 深度开荒五节点：仅绑定 stateClass / isFirst / isLast，由 JS 统一算好 */
    haokangPgNodes: [],
    detailSource: '',
  },

  _safeDecode(v, fallback = '') {
    if (v === undefined || v === null || v === '') return fallback
    try {
      return decodeURIComponent(v)
    } catch (e) {
      return String(v)
    }
  },

  _readMyOrders() {
    try {
      const s = wx.getStorageSync(MY_ORDERS_KEY)
      return Array.isArray(s) ? s : []
    } catch (e) {
      return []
    }
  },

  _readMyCoupons() {
    try {
      const s = wx.getStorageSync(MY_COUPONS_KEY)
      return Array.isArray(s) ? s : []
    } catch (e) {
      return []
    }
  },

  /**
   * orderType 识别：① query.orderType ② 按 id 查 myOrders（及 couponId 兜底）
   * 禁止仅靠标题推断订单大类。
   */
  _findCouponBookingRecord(orderId) {
    if (!orderId) return null
    const orders = this._readMyOrders()
    let rec = orders.find(o => o && o.id === orderId)
    if (!rec) {
      rec = orders.find(o => o && o.orderType === 'coupon_booking' && o.couponId === orderId)
    }
    return rec || null
  },

  _buildCouponInfoLine(record) {
    if (!record || !record.couponId) return ''
    const coupons = this._readMyCoupons()
    const c = coupons.find(x => x && x.couponId === record.couponId)
    if (c && c.couponTitle) {
      const ben = String(c.benefitText || '')
        .replace(/^减\s*/, '')
        .trim()
      return ben ? `使用优惠券：${c.couponTitle} ${ben}` : `使用优惠券：${c.couponTitle}`
    }
    if (record.subText) {
      return String(record.subText).replace(/^已使用优惠券/, '使用优惠券')
    }
    return ''
  },

  _setLoadErrorLayout(title = '订单信息加载失败', desc = '请返回我的订单重试') {
    this.setData({
      detailLayout: 'error',
      loadErrorTitle: title,
      loadErrorDesc: desc,
      isCouponBookingPending: false,
      showCouponInfoLine: false,
      couponInfoLine: '',
      showCouponNotice: false,
      couponNoticeLine: '',
    })
  },

  _applyCouponBookingLayout(record) {
    const isPending = record.status === 'pending_contact'
    const couponInfoLine = this._buildCouponInfoLine(record)
    const showCouponInfoLine = !!couponInfoLine
    const couponNoticeLine = isPending ? '工作人员将在30分钟内联系确认时间' : ''
    const showCouponNotice = isPending && !!couponNoticeLine

    this.setData({
      detailLayout: 'coupon_booking',
      isCouponBookingPending: isPending,
      orderName: record.title || '优惠券预约',
      orderStatus: record.statusText || (isPending ? '待联系确认' : '待确认'),
      orderSub: '',
      communityName: '',
      roomNo: '',
      orderArea: '',
      serviceDate: '',
      packageFlowType: 'legacy',
      isRefundFlow: false,
      canApplyRefund: false,
      inviteCode: '',
      totalPrice: 0,
      grossPrice: 0,
      earlyBirdDiscount: 0,
      newcomerDiscount: 0,
      isUpgraded: false,
      upgradePrice: 0,
      productType: 'haokang',
      isHaokang: true,
      showInviteModule: false,
      docActionText: '',
      docActionType: 'none',
      docActionDesc: '',
      docHasPdf: false,
      currentStageDesc: '',
      currentGuide: '',
      feeExpanded: false,
      totalDiscount: 0,
      progressSteps: [],
      showCouponInfoLine,
      couponInfoLine,
      showCouponNotice,
      couponNoticeLine,
    })
  },

  onLoad(options) {
    const serviceOrderId = options.orderId ? this._safeDecode(options.orderId, '').trim() : ''
    if (serviceOrderId) {
      orderContext.setCurrentOrderId(serviceOrderId)
      this.loadServiceOrderById(serviceOrderId)
      return
    }

    const currentOrderId = orderContext.getCurrentOrderId()
    if (currentOrderId) {
      this.loadServiceOrderById(currentOrderId)
      return
    }

    let qOrderType = this._safeDecode(options.orderType, '').trim()
    if (qOrderType.toLowerCase() === 'coupon_booking') {
      qOrderType = 'coupon_booking'
    }
    const rawId = options.id || options.bookingId
    const orderId = rawId ? this._safeDecode(rawId, '').trim() : ''
    const hasNameParam = Object.prototype.hasOwnProperty.call(options, 'name') && options.name !== ''

    let resolvedType = qOrderType
    let couponRecord = null

    if (!resolvedType && orderId) {
      couponRecord = this._findCouponBookingRecord(orderId)
      if (couponRecord && couponRecord.orderType === 'coupon_booking') {
        resolvedType = 'coupon_booking'
      }
    }

    if (!resolvedType) {
      if (!hasNameParam && !orderId) {
        this._setLoadErrorLayout('暂无订单上下文', '请从支付成功页或我的订单重新进入')
        return
      }
      if (hasNameParam || !orderId) {
        resolvedType = 'service_order'
      } else {
        this._setLoadErrorLayout()
        return
      }
    }

    if (resolvedType === 'coupon_booking') {
      if (!orderId) {
        this._setLoadErrorLayout()
        return
      }
      if (!couponRecord) {
        couponRecord = this._findCouponBookingRecord(orderId)
      }
      if (!couponRecord || couponRecord.orderType !== 'coupon_booking') {
        this._setLoadErrorLayout()
        return
      }
      this._applyCouponBookingLayout(couponRecord)
      return
    }

    this._initServiceOrderDetail(options)
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

  async loadServiceOrderById(orderId) {
    if (!orderId) {
      this._setLoadErrorLayout('暂无订单上下文', '请从支付成功页或我的订单重新进入')
      return
    }
    if (this._loadingOrderId === orderId) return
    this._loadingOrderId = orderId
    orderContext.setCurrentOrderId(orderId)

    try {
      const result = await this.callCloudFunction('getOrderDetail', {
        orderId,
        currentUser: orderContext.getCurrentUser(),
      })
      if (!result || !result.ok || !result.order || !result.order.orderId) {
        throw new Error(result && result.error ? result.error : 'ORDER_NOT_FOUND')
      }
      const remoteOrder = orderContext.cacheServerOrder(result.order)
      if (!remoteOrder) {
        throw new Error('INVALID_REMOTE_ORDER')
      }
      this.setData({ detailSource: 'cloud' })
      this._initServiceOrderDetailFromOrder(remoteOrder)
      return
    } catch (error) {
      const localOrder = orderContext.getOrderById(orderId)
      if (localOrder) {
        this.setData({ detailSource: 'local_fallback' })
        this._initServiceOrderDetailFromOrder(localOrder)
        return
      }
      this._setLoadErrorLayout('订单不存在', '请返回我的订单重新进入')
    } finally {
      this._loadingOrderId = ''
    }
  },

  _initServiceOrderDetailFromOrder(order) {
    const listItem = orderContext.toOrderListItem(order)
    this._initServiceOrderDetail({
      orderId: order.orderId,
      name: listItem.name,
      sub: listItem.sub,
      status: order.status,
      packageFlowType: order.packageFlowType || '',
      community: order.communityName || '',
      inviteCode: order.inviteToken || '',
      roomNo: order.roomNo || '',
      orderArea: order.orderArea || '',
      serviceDate: order.serviceDate || '',
      totalPrice: String(order.totalPrice || 0),
      grossPrice: String(order.grossPrice || 0),
      earlyBirdDiscount: String(order.earlyBirdDiscount || 0),
      newcomerDiscount: String(order.newcomerDiscount || 0),
      groupDiscount:       String(order.groupDiscount       || 0),
      groupDiscountPerSqm: String(order.groupDiscountPerSqm || 0),
      groupId:             String(order.groupId             || ''),
      groupMode:           String(order.groupMode           || ''),
      entryFrom:           String(order.entryFrom           || ''),
      productType: order.productType || '',
      isUpgraded: order.isUpgraded ? 'true' : 'false',
      upgradePrice: String(order.upgradePrice || 0),
    })
  },

  _initServiceOrderDetail(options) {
    const orderId         = options.orderId ? decodeURIComponent(options.orderId) : ''
    const name            = decodeURIComponent(options.name || '深度开荒')
    const sub             = decodeURIComponent(options.sub  || '110㎡ · 2026-03-20')
    const rawStatus       = decodeURIComponent(options.status || '待服务')
    const packageFlowType = decodeURIComponent(options.packageFlowType || options.flowType || '')
    const communityName   = decodeURIComponent(options.community || '')
    const inviteCode      = options.inviteCode    ? decodeURIComponent(options.inviteCode)    : ''
    const passedRoomNo    = options.roomNo        ? decodeURIComponent(options.roomNo)        : ''
    const passedOrderArea = options.orderArea     ? decodeURIComponent(options.orderArea)     : ''
    const passedServiceDate = options.serviceDate ? decodeURIComponent(options.serviceDate)   : ''
    const passedTotalPrice        = options.totalPrice        ? Number(decodeURIComponent(options.totalPrice))        : 0
    const passedGrossPrice        = options.grossPrice        ? Number(decodeURIComponent(options.grossPrice))        : 0
    const passedEarlyBirdDiscount = options.earlyBirdDiscount ? Number(decodeURIComponent(options.earlyBirdDiscount)) : 0
    const passedNewcomerDiscount  = options.newcomerDiscount  ? Number(decodeURIComponent(options.newcomerDiscount))  : 0
    const passedGroupDiscount     = options.groupDiscount     ? Number(decodeURIComponent(options.groupDiscount))     : 0
    const passedGroupId           = options.groupId ? decodeURIComponent(options.groupId) : ''
    const passedGroupMode         = options.groupMode ? decodeURIComponent(options.groupMode) : ''
    // 团购每㎡口径：优先读传入值，否则从总折扣 ÷ 面积反算
    let passedGroupDiscountPerSqm = options.groupDiscountPerSqm ? Number(decodeURIComponent(options.groupDiscountPerSqm)) : 0
    if (!passedGroupDiscountPerSqm && passedGroupDiscount > 0) {
      const areaNum = parseFloat(String(options.orderArea || '').replace(/[^0-9.]/g, '')) || 0
      if (areaNum > 0) passedGroupDiscountPerSqm = parseFloat((passedGroupDiscount / areaNum).toFixed(1))
    }
    // 产品类型字段
    const passedProductType = options.productType ? decodeURIComponent(options.productType) : ''
    const isUpgraded        = options.isUpgraded === 'true'
    const upgradePrice      = options.upgradePrice ? Number(decodeURIComponent(options.upgradePrice)) : 0

    // 统一展示状态别名
    const status = this.normalizeDisplayStatus(rawStatus)

    let serviceDate = passedServiceDate
    if (!serviceDate) {
      const dateMatch = sub.match(/(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) serviceDate = dateMatch[1]
    }

    let orderArea = passedOrderArea
    if (!orderArea) {
      const areaMatch = sub.match(/^(.*?)(?:\s*·\s*\d{4}-\d{2}-\d{2})?$/)
      if (areaMatch) orderArea = areaMatch[1].trim()
    }
    if (!orderArea) orderArea = '110㎡'

    const finalCommunityName = communityName || '薇棠轩'
    const finalServiceDate   = serviceDate   || '2026-03-15'
    const isRefundFlow       = status === '退款处理中' || status === '已退款'

    // 推断产品类型（优先用传入值，缺省从订单名推断）
    const productType = this.inferProductType(name, passedProductType)
    const isHaokang   = productType === 'haokang'

    this.setData({
      detailLayout: 'normal',
      isCouponBookingPending: false,
      showCouponInfoLine: false,
      couponInfoLine: '',
      showCouponNotice: false,
      couponNoticeLine: '',
      orderId,
      orderName: name,
      orderSub: sub,
      communityName: finalCommunityName,
      orderArea,
      orderStatus: status,
      packageFlowType: packageFlowType || 'legacy',
      serviceDate: finalServiceDate,
      isRefundFlow,
      inviteCode,
      roomNo: passedRoomNo,
      totalPrice: passedTotalPrice,
      grossPrice: passedGrossPrice,
      earlyBirdDiscount: passedEarlyBirdDiscount,
      newcomerDiscount: passedNewcomerDiscount,
      groupDiscount:       passedGroupDiscount,
      groupDiscountPerSqm: passedGroupDiscountPerSqm,
      isGroupMode:         !!(passedGroupDiscount > 0 || passedGroupDiscountPerSqm > 0 || passedGroupId || passedGroupMode === 'community_group'),
      productType,
      isHaokang,
      isUpgraded,
      upgradePrice,
    })

    if (!isRefundFlow) {
      this.checkRefundEligibility()
    } else {
      this.setData({ canApplyRefund: false })
    }
    this.updateInviteModule()
    this.updateDocAction()
    this.updateProgressSteps()
    this.updateStageDesc()
  },

  onShow() {
    if (this.data.detailLayout === 'error' || this.data.detailLayout === 'coupon_booking') {
      return
    }

    if (this.data.orderId) {
      this.loadServiceOrderById(this.data.orderId)
      return
    }

    const status = this.data.orderStatus
    if (status === '退款处理中' || status === '已退款') {
      this.setData({ isRefundFlow: true, canApplyRefund: false })
    } else if (status) {
      this.checkRefundEligibility()
      this.setData({ isRefundFlow: false })
    }
    this.updateInviteModule()
    this.updateDocAction()
    this.updateProgressSteps()
    this.updateStageDesc()
  },

  // ─── 产品类型推断 ────────────────────────────────────────────
  /**
   * 推断产品类型，优先使用 mine 传入的明确值。
   * haokang  深度开荒：单次深处理，不含备住除尘/搬家清洁节点
   * hujin    守护计划（含升级订单）：完整 4 节点守护路径
   * 360      豪华全护：当前同守护计划逻辑
   */
  inferProductType(name, passedType) {
    if (passedType && passedType !== '' && passedType !== 'undefined') return passedType
    const text = String(name || '')
    const normalized = text.toLowerCase()
    if (text.includes('守护') || text.includes('升级') || normalized.includes('plus')) return 'hujin'
    if (text.includes('360') || text.includes('全护') || normalized.includes('max')) return '360'
    return 'haokang'
  },

  // ─── 展示状态别名（统一映射，不依赖 flowType） ───────────────

  /**
   * 将后端/入口传来的原始状态统一映射到页面展示状态。
   * 服务中   → 深处理中
   * 勘察完工 → 待深处理
   * 已完成   → 已交付
   */
  normalizeDisplayStatus(status) {
    if (!status) return ''
    const map = {
      '服务中':  '深处理中',
      '勘察完工': '待深处理',
      '已完成':  '已交付',
    }
    return map[status] || status
  },

  // ─── 文档状态映射（唯一入口） ────────────────────────────────

  getDocOrder() {
    if (this.data.orderId) {
      return orderContext.getOrderById(this.data.orderId)
    }
    return null
  },

  /**
   * 文档状态链路说明：
   *
   * 待服务 / 藏灰处理中
   *   → '待勘查'（灰色，不可点）
   *
   * 待勘查（唯一走确认链的阶段）
   *   docStatus = confirm_result → '确认勘查结果' → scheme-book
   *   docStatus = confirm_book   → '确认承诺书'   → final-book confirm
   *   其他                       → '待勘查'（灰色，等待 B 端整理）
   *
   *   当 docStatus = final 时，updateDocAction 会把 orderStatus 升级到 '待深处理'，
   *   随后走下面的"待深处理及之后"分支。
   *
   * 待深处理及之后（含深处理中、待备住除尘、待搬家清洁、已交付、已完成）
   *   → '查看最终承诺书'（黄色，只读进 final-book）
   *
   * 退款流
   *   → '无计划'（灰色，不可点）
   *
   * docActionType: 'none' | 'scheme' | 'final_confirm' | 'final_view'
   */
  resolveDocAction(orderStatus, docStatus) {
    // 退款流
    if (['退款处理中', '已退款'].includes(orderStatus)) {
      const desc = orderStatus === '已退款' ? '该订单已退款，无勘察计划' : '退款申请处理中，勘察计划暂停'
      return { docActionText: '无计划', docActionType: 'none', docActionDesc: desc }
    }

    // 待服务 / 藏灰处理中：勘察还未发生
    if (['待支付', '待服务', '藏灰处理中'].includes(orderStatus)) {
      return { docActionText: '待勘查', docActionType: 'none', docActionDesc: '勘察完成后将自动生成方案承诺书' }
    }

    // 待勘查阶段：根据 docStatus 走完整确认链
    if (orderStatus === '待勘查' || orderStatus === '勘察完工') {
      if (docStatus === 'confirm_result') {
        return { docActionText: '确认勘查结果', docActionType: 'scheme',        docActionDesc: '请点击查看并确认勘察方案' }
      }
      if (docStatus === 'confirm_book') {
        return { docActionText: '确认承诺书',   docActionType: 'final_confirm', docActionDesc: '请点击查看并确认最终承诺书' }
      }
      // docStatus = 'final' 在 updateDocAction 中已将 orderStatus 升级为 '待深处理'，
      // 不会到达这里；其他情况为等待 B 端整理
      return { docActionText: '待勘查', docActionType: 'none', docActionDesc: '勘察完成后将自动生成方案承诺书' }
    }

    // 待深处理及之后：统一只读查看，不再出现确认动作
    return { docActionText: '查看最终承诺书', docActionType: 'final_view', docActionDesc: '承诺书已确认，点击随时查看' }
  },

  updateDocAction() {
    let orderStatus = this.data.orderStatus
    const docOrder = this.getDocOrder()
    const cloudDocFlow = docOrder && docOrder.docFlow
    const docStatus = cloudDocFlow && cloudDocFlow.flowState
      ? cloudDocFlow.flowState
      : (docOrder ? orderContext.readDocFlowState(docOrder) : '')

    // 待勘查确认链完成（docStatus=final）→ 前端模拟订单推进到待深处理
    // 后续 updateProgressSteps / updateStageDesc 会用更新后的 orderStatus
    if ((orderStatus === '待勘查' || orderStatus === '勘察完工') && docStatus === 'final') {
      orderStatus = '待深处理'
      this.setData({ orderStatus: '待深处理' })
    }

    const result = this.resolveDocAction(orderStatus, docStatus)

    // final_view 态：检测正式 PDF，分两种状态表达
    let docHasPdf = false
    if (result.docActionType === 'final_view') {
      docHasPdf = !!(docOrder && orderContext.readDocFinalPdf(docOrder))
      result.docActionDesc = docHasPdf
        ? '正式盖章版已生成，点击直接打开'
        : '底稿已确认，正式盖章版整理中'
    }

    this.setData({
      docActionText: result.docActionText,
      docActionType: result.docActionType,
      docActionDesc: result.docActionDesc,
      docHasPdf,
    })
  },

  handleDocAction() {
    const {
      docActionType, docActionText,
      orderId, orderName, communityName, roomNo, orderArea,
      totalPrice, serviceDate, inviteCode,
    } = this.data

    if (docActionType === 'scheme') {
      wx.navigateTo({
        url: [
          '/pages/scheme-book/scheme-book',
          `?orderId=${encodeURIComponent(orderId || '')}`,
          `&mode=confirm_result`,
          `&orderName=${encodeURIComponent(orderName)}`,
          `&communityName=${encodeURIComponent(communityName)}`,
          `&roomNo=${encodeURIComponent(roomNo)}`,
          `&orderArea=${encodeURIComponent(orderArea)}`,
          `&serviceDate=${encodeURIComponent(serviceDate)}`,
          `&totalPrice=${encodeURIComponent(String(totalPrice))}`,
          `&inviteCode=${encodeURIComponent(inviteCode || '')}`,
        ].join(''),
      })
      return
    }

    if (docActionType === 'final_confirm') {
      wx.navigateTo({
        url: [
          '/pages/final-book/final-book',
          `?orderId=${encodeURIComponent(orderId || '')}`,
          `&docMode=confirm_book`,
          `&orderName=${encodeURIComponent(orderName)}`,
          `&communityName=${encodeURIComponent(communityName)}`,
          `&roomNo=${encodeURIComponent(roomNo)}`,
          `&orderArea=${encodeURIComponent(orderArea)}`,
          `&totalPrice=${encodeURIComponent(String(totalPrice))}`,
          `&serviceDate=${encodeURIComponent(serviceDate)}`,
        ].join(''),
      })
      return
    }

    if (docActionType === 'final_view') {
      // 优先打开后台上传的盖章 PDF；无 PDF 时回退到页面版
      const pdfUrl = this._getFinalBookPdfUrl()
      if (pdfUrl) {
        this._openFinalBookPdf(pdfUrl)
        return
      }
      wx.navigateTo({
        url: [
          '/pages/final-book/final-book',
          `?orderId=${encodeURIComponent(orderId || '')}`,
          `&docMode=final_view`,
          `&orderName=${encodeURIComponent(orderName)}`,
          `&communityName=${encodeURIComponent(communityName)}`,
          `&roomNo=${encodeURIComponent(roomNo)}`,
          `&orderArea=${encodeURIComponent(orderArea)}`,
          `&totalPrice=${encodeURIComponent(String(totalPrice))}`,
          `&serviceDate=${encodeURIComponent(serviceDate)}`,
        ].join(''),
      })
      return
    }

    wx.showToast({ title: docActionText || '暂不可查看', icon: 'none', duration: 1600 })
  },

  /**
   * 读取后台为该订单上传的盖章 PDF URL。
   * key 格式：docFinalPdfV2_{orderId}
   * 后台上传完成后写入此 key，前端即可自动切换为 PDF 模式。
   */
  _getFinalBookPdfUrl() {
    return this.data.orderId ? orderContext.readDocFinalPdf(this.data.orderId) || '' : ''
  },

  /**
   * 下载并打开盖章 PDF。
   * 下载失败时静默回退到页面版，不打断用户。
   */
  _openFinalBookPdf(url) {
    const { orderId, orderName, communityName, roomNo, orderArea, totalPrice, serviceDate } = this.data
    wx.showLoading({ title: '加载文件…', mask: true })
    wx.downloadFile({
      url,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            showMenu: true,
            fail: () => wx.showToast({ title: '文件打开失败', icon: 'none', duration: 2000 }),
          })
        } else {
          wx.showToast({ title: '文件加载失败', icon: 'none', duration: 2000 })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败，已切换页面查看', icon: 'none', duration: 1800 })
        wx.navigateTo({
          url: [
            '/pages/final-book/final-book',
            `?orderId=${encodeURIComponent(orderId || '')}`,
            `&docMode=final_view`,
            `&orderName=${encodeURIComponent(orderName)}`,
            `&communityName=${encodeURIComponent(communityName)}`,
            `&roomNo=${encodeURIComponent(roomNo)}`,
            `&orderArea=${encodeURIComponent(orderArea)}`,
            `&totalPrice=${encodeURIComponent(String(totalPrice))}`,
            `&serviceDate=${encodeURIComponent(serviceDate)}`,
          ].join(''),
        })
      },
    })
  },

  // ─── 其他功能方法 ────────────────────────────────────────────

  checkRefundEligibility() {
    const { orderStatus, serviceDate } = this.data

    // 只有「待服务」和「待勘查」两个状态才允许申请退款
    const REFUNDABLE_STATUSES = ['待服务', '待勘查']
    if (!REFUNDABLE_STATUSES.includes(orderStatus)) {
      this.setData({ canApplyRefund: false, refundCountdown: '' })
      return
    }

    // serviceDate 为空时无法核实 72h 窗口，保守处理为不可退
    if (!serviceDate) {
      this.setData({ canApplyRefund: false, refundCountdown: '' })
      return
    }

    const serviceTime    = new Date(serviceDate.replace(/-/g, '/') + ' 00:00:00')
    const refundDeadline = new Date(serviceTime.getTime() - 72 * 60 * 60 * 1000)
    const now = new Date()
    if (now >= refundDeadline) {
      this.setData({ canApplyRefund: false, refundCountdown: '' })
      return
    }
    const diff = refundDeadline - now
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    let text = '距退款截止还有 '
    if (days > 0) text += days + '天'
    if (hours > 0) text += hours + '小时'
    if (days === 0 && hours === 0) text += '不到1小时'
    this.setData({ canApplyRefund: true, refundCountdown: text })
  },

  goBack() {
    if (this.data.detailLayout === 'error') {
      this.goBackToMine()
      return
    }
    wx.navigateBack({
      delta: 1,
      fail() { wx.navigateTo({ url: '/pages/mine/mine' }) },
    })
  },

  goBackToMine() {
    wx.navigateTo({
      url: '/pages/mine/mine',
      fail() {
        wx.reLaunch({ url: '/pages/mine/mine' })
      },
    })
  },

  contactCustomerService() {
    wecom.openWecom({ title: '订单咨询' })
  },

  updateInviteModule() {
    const show = ['待深处理', '深处理中', '已交付'].includes(this.data.orderStatus)
    this.setData({ showInviteModule: show })
  },

  getProgressFlowLabels(flowType) {
    if (flowType === 'full')    return ['待服务', '藏灰处理中', '待勘查', '待深处理', '深处理中', '待备住除尘', '待搬家清洁', '已交付']
    if (flowType === 'no_dust') return ['待服务', '待勘查', '待深处理', '深处理中', '待备住除尘', '待搬家清洁', '已交付']
    if (flowType === 'single')  return ['待服务', '待勘查', '待深处理', '深处理中', '已交付']
    return ['待服务', '藏灰处理中', '待勘查', '待深处理', '深处理中', '待备住除尘', '待搬家清洁', '已交付']
  },

  updateProgressSteps() {
    const { isRefundFlow, packageFlowType, orderStatus, isHaokang } = this.data
    if (isRefundFlow) {
      this.setData({ progressSteps: [], haokangPgNodes: [] })
      return
    }
    let flowType = packageFlowType || 'full'
    if (flowType === 'legacy') flowType = 'full'
    if (isHaokang) flowType = 'single'
    const labels        = this.getProgressFlowLabels(flowType)
    const currentIndex  = labels.indexOf(orderStatus)
    const progressSteps = labels.map((label, index) => ({
      code:   `${flowType}_${index}`,
      label,
      active: currentIndex === index,
      done:   currentIndex > index,
    }))
    const haokangPgNodes = !isHaokang ? [] : buildHaokangPgNodes(orderStatus)
    this.setData({ progressSteps, haokangPgNodes })
  },

  getStageDesc(status) {
    const map = {
      '待服务':     '服务团队准备就绪，将提前与您确认进场时间',
      '藏灰处理中': '正在对藏灰区域进行前处理，请保持主要通道畅通',
      '待勘查':     '等待师傅上门勘察，勘察后将生成方案承诺书',
      '待深处理':   '请确认方案承诺书，确认后将安排深度处理',
      '深处理中':   '深度处理正在进行中，全程录像留档',
      '待备住除尘': '深度处理已完成，备住前除尘即将上门',
      '待搬家清洁': '即将进行搬家清洁，确保全屋交付品质',
      '已交付':     '全部服务已完成交付，感谢您的信任',
      '退款处理中': '退款申请已收到，正在处理中',
      '已退款':     '退款已处理完成',
    }
    return map[status] || ''
  },

  updateStageDesc() {
    const status = this.data.orderStatus
    const { earlyBirdDiscount, newcomerDiscount, groupDiscount, isRefundFlow } = this.data
    const totalDiscount = Number(earlyBirdDiscount || 0) + Number(newcomerDiscount || 0) + Number(groupDiscount || 0)
    const desc = this.getStageDesc(status)
    this.setData({
      currentStageDesc: isRefundFlow ? '' : desc,
      currentGuide: desc,
      totalDiscount,
    })
  },

  toggleFeeDetail() {
    this.setData({ feeExpanded: !this.data.feeExpanded })
  },

  goGroupBuyStatus() {
    wx.navigateTo({ url: '/pages/group-buy/group-buy?tab=myteam' })
  },

  goLeaderBenefits() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=leader' })
  },

  goGroupInvite() {
    const { orderId, orderName, communityName, serviceDate } = this.data
    wx.navigateTo({
      url: [
        '/pages/group-invite/group-invite',
        `?orderId=${encodeURIComponent(orderId || '')}`,
        `&orderName=${encodeURIComponent(orderName)}`,
        `&communityName=${encodeURIComponent(communityName)}`,
        `&serviceDate=${encodeURIComponent(serviceDate)}`,
      ].join(''),
    })
  },

  goRefundApply() {
    const { orderId, orderName, serviceDate, orderArea, totalPrice } = this.data
    const params = [
      `orderId=${encodeURIComponent(orderId || '')}`,
      `orderName=${encodeURIComponent(orderName || '')}`,
      `serviceDate=${encodeURIComponent(serviceDate || '')}`,
      `serviceArea=${encodeURIComponent(orderArea || '')}`,
      `totalPrice=${encodeURIComponent(totalPrice || '')}`,
    ].join('&')
    wx.navigateTo({ url: `/pages/refund-apply/refund-apply?${params}` })
  },

  goCheckout() {
    if (this.data.isHaokang) {
      wx.navigateTo({
        url: `/pages/checkout/checkout?inviteToken=${encodeURIComponent(this.data.inviteCode || '')}`,
      })
      return
    }
    this.goMineScheduleBook()
  },

  goContactRescheduleHuman() {
    wx.navigateTo({ url: '/pages/contact-schedule/contact-schedule' })
  },

  goMineScheduleBook() {
    const oid = this.data.orderId
    if (!oid) {
      wx.showToast({ title: '请从订单列表进入', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/mine/mine?scheduleFlow=book&scheduleOrderId=${encodeURIComponent(oid)}`,
    })
  },

  goMineScheduleReschedule() {
    const oid = this.data.orderId
    if (!oid) {
      wx.showToast({ title: '请从订单列表进入', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/mine/mine?scheduleFlow=reschedule&scheduleOrderId=${encodeURIComponent(oid)}`,
    })
  },

  /** 支付宝非小程序原生同级支付通道：仅说明，不切换为与微信同权入口 */
  onAlipayInfoTap() {
    wx.showToast({
      title: '小程序内请使用微信支付；支付宝请联系客服协助',
      icon: 'none',
      duration: 2600,
    })
  },
})
