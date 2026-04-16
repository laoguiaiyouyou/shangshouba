const orderContext = require('../../utils/order-context')

/**
 * 退款链路测试页：注入 3 个 mock 订单，分别验证可退款 / 不可退款 / 退款中
 */

function futureDate(daysFromNow) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const MOCK_ORDERS = {
  refund_ok: {
    orderId: 'dev_refund_ok_001',
    orderName: '深度开荒',
    status: '待服务',
    communityName: '测试小区·退款可用',
    roomNo: '1栋101',
    orderArea: '95㎡',
    serviceDate: futureDate(10),
    totalPrice: 1425,
    grossPrice: 1425,
    newcomerDiscount: 95,
    earlyBirdDiscount: 0,
    groupDiscount: 0,
    productType: 'haokang',
    packageFlowType: 'legacy',
    ownerUserId: '',
    createdAt: new Date().toISOString(),
  },
  refund_no: {
    orderId: 'dev_refund_no_001',
    orderName: '深度开荒',
    status: '待服务',
    communityName: '测试小区·退款已关闭',
    roomNo: '2栋202',
    orderArea: '80㎡',
    serviceDate: futureDate(1),
    totalPrice: 1200,
    grossPrice: 1200,
    newcomerDiscount: 80,
    earlyBirdDiscount: 0,
    groupDiscount: 0,
    productType: 'haokang',
    packageFlowType: 'legacy',
    ownerUserId: '',
    createdAt: new Date().toISOString(),
  },
  refund_ing: {
    orderId: 'dev_refund_ing_001',
    orderName: '深度开荒',
    status: '退款处理中',
    communityName: '测试小区·退款中',
    roomNo: '3栋303',
    orderArea: '110㎡',
    serviceDate: futureDate(15),
    totalPrice: 1650,
    grossPrice: 1650,
    newcomerDiscount: 110,
    earlyBirdDiscount: 0,
    groupDiscount: 0,
    productType: 'haokang',
    packageFlowType: 'legacy',
    ownerUserId: '',
    createdAt: new Date().toISOString(),
  },
  refund_done: {
    orderId: 'dev_refund_done_001',
    orderName: '深度开荒',
    status: '已退款',
    communityName: '测试小区·已退款',
    roomNo: '4栋404',
    orderArea: '100㎡',
    serviceDate: futureDate(20),
    totalPrice: 1500,
    grossPrice: 1500,
    newcomerDiscount: 100,
    earlyBirdDiscount: 0,
    groupDiscount: 0,
    productType: 'haokang',
    packageFlowType: 'legacy',
    ownerUserId: '',
    createdAt: new Date().toISOString(),
  },
}

Page({
  data: {
    scenarioA_date: '',
    scenarioB_date: '',
    scenarioC_status: '退款处理中',
  },

  onLoad() {
    const userId = orderContext.getCurrentUserId()
    Object.keys(MOCK_ORDERS).forEach(key => {
      MOCK_ORDERS[key].ownerUserId = userId
    })

    this.setData({
      scenarioA_date: MOCK_ORDERS.refund_ok.serviceDate,
      scenarioB_date: MOCK_ORDERS.refund_no.serviceDate,
    })
  },

  goScenarioA() {
    orderContext.upsertOrder(MOCK_ORDERS.refund_ok)
    orderContext.setCurrentOrderId(MOCK_ORDERS.refund_ok.orderId)
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${MOCK_ORDERS.refund_ok.orderId}`,
    })
  },

  goScenarioB() {
    orderContext.upsertOrder(MOCK_ORDERS.refund_no)
    orderContext.setCurrentOrderId(MOCK_ORDERS.refund_no.orderId)
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${MOCK_ORDERS.refund_no.orderId}`,
    })
  },

  goScenarioC() {
    orderContext.upsertOrder(MOCK_ORDERS.refund_ing)
    orderContext.setCurrentOrderId(MOCK_ORDERS.refund_ing.orderId)
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${MOCK_ORDERS.refund_ing.orderId}`,
    })
  },

  goScenarioD() {
    orderContext.upsertOrder(MOCK_ORDERS.refund_done)
    orderContext.setCurrentOrderId(MOCK_ORDERS.refund_done.orderId)
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${MOCK_ORDERS.refund_done.orderId}`,
    })
  },

  cleanUp() {
    const devIds = Object.keys(MOCK_ORDERS).map(k => MOCK_ORDERS[k].orderId)
    const all = wx.getStorageSync('serviceOrdersV2') || []
    const filtered = all.filter(o => o && !devIds.includes(o.orderId))
    wx.setStorageSync('serviceOrdersV2', filtered)
    wx.showToast({ title: '测试订单已清除', icon: 'success' })
  },

  goBack() {
    wx.navigateBack({ fail() { wx.reLaunch({ url: '/pages/index/index' }) } })
  },
})
