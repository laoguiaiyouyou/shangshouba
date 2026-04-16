const STORAGE_KEYS = {
  ORDERS: 'serviceOrdersV2',
  CHECKOUT_DRAFT: 'checkoutDraftV2',
  CURRENT_ORDER_ID: 'currentOrderIdV2',
  CURRENT_USER: 'currentUserV2',
  ACTIVE_INVITE: 'activeInviteContextV2',
  INVITE_PROFILE: 'inviteProfileV2',
  LEGACY_MIGRATED: 'serviceOrdersV2Migrated',
  PAYMENT_CREATE_REF: 'paymentCreateRefV2',
}

const DOC_STORAGE_PREFIXES = {
  FLOW_STATE: 'docFlowStateV2_',
  CONFIRM_DATA: 'docConfirmDataV2_',
  FINAL_SNAPSHOT: 'docFinalSnapshotV2_',
  FINAL_PDF: 'docFinalPdfV2_',
}

function nowIso() {
  return new Date().toISOString()
}

// 服务名称统一映射（兼容数据库历史数据 → 最新前台名称）
const SERVICE_NAME_MAP = {
  '精细开荒':    '深度开荒',
  '入住守护套餐': '深度开荒plus',
  '入住守护':    '深度开荒plus',
  '360全护套餐': '深度开荒MAX',
  '360 全护套餐': '深度开荒MAX',
  '360全护':    '深度开荒MAX',
}
function normalizeServiceName(raw) {
  const s = String(raw || '').trim()
  return SERVICE_NAME_MAP[s] || s
}

function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' || value === undefined || value === null ? fallback : value
  } catch (error) {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (error) {
    // ignore
  }
}

function safeRemove(key) {
  try {
    wx.removeStorageSync(key)
  } catch (error) {
    // ignore
  }
}

function makeOrderId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function makeLocalUserId() {
  return `mock_user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeDisplayStatus(status) {
  const map = {
    服务中: '深处理中',
    勘察完工: '待深处理',
    已完成: '已交付',
  }
  return map[status] || status || ''
}

function normalizeStatusClass(status) {
  if (status === '退款处理中') return 'refunding'
  if (status === '已退款' || status === '已完成' || status === '已交付') return 'done'
  if (status === '服务中' || status === '深处理中') return 'working'
  return 'pending'
}

function inferProductType(serviceType) {
  const text = String(serviceType || '')
  const normalized = text.toLowerCase()
  if (
    text.includes('守护') ||
    text.includes('升级') ||
    normalized.includes('plus')
  ) return 'hujin'
  if (
    text.includes('360') ||
    text.includes('全护') ||
    normalized.includes('max')
  ) return '360'
  return 'haokang'
}

function listOrders() {
  const raw = safeGet(STORAGE_KEYS.ORDERS, [])
  return Array.isArray(raw) ? raw : []
}

function saveOrders(orders) {
  safeSet(STORAGE_KEYS.ORDERS, Array.isArray(orders) ? orders : [])
}

function normalizeCurrentUser(user) {
  const createdAt = user && user.createdAt ? String(user.createdAt) : nowIso()
  const updatedAt = nowIso()
  return {
    userId: String((user && (user.userId || user.ownerUserId)) || makeLocalUserId()),
    displayName: String((user && user.displayName) || '本地体验用户'),
    authSource: String((user && user.authSource) || 'local_mock'),
    createdAt,
    updatedAt,
  }
}

function guessLegacyCurrentUserSeed() {
  const inviteProfile = safeGet(STORAGE_KEYS.INVITE_PROFILE, null)
  if (inviteProfile && typeof inviteProfile === 'object' && inviteProfile.ownerUserId) {
    return {
      userId: String(inviteProfile.ownerUserId),
      displayName: '本地体验用户',
      authSource: 'local_mock',
    }
  }
  const orders = listOrders()
  const firstOwnedOrder = orders.find(order => order && order.ownerUserId)
  if (firstOwnedOrder) {
    return {
      userId: String(firstOwnedOrder.ownerUserId),
      displayName: '本地体验用户',
      authSource: 'local_mock',
    }
  }
  return null
}

function ensureCurrentUser(seedUser) {
  const raw = safeGet(STORAGE_KEYS.CURRENT_USER, null)
  if (raw && typeof raw === 'object' && raw.userId) {
    const next = normalizeCurrentUser(raw)
    if (
      next.userId !== raw.userId ||
      next.displayName !== raw.displayName ||
      next.authSource !== raw.authSource
    ) {
      safeSet(STORAGE_KEYS.CURRENT_USER, next)
    }
    return next
  }
  const next = normalizeCurrentUser(seedUser || guessLegacyCurrentUserSeed())
  safeSet(STORAGE_KEYS.CURRENT_USER, next)
  return next
}

function setCurrentUser(user) {
  const next = normalizeCurrentUser(user)
  safeSet(STORAGE_KEYS.CURRENT_USER, next)
  return next
}

function getCurrentUser() {
  return ensureCurrentUser()
}

function getCurrentUserId() {
  return getCurrentUser().userId
}

function mapLegacyOrder(item, index) {
  const createdAt = item.serviceDate
    ? `${item.serviceDate}T00:00:00.000Z`
    : nowIso()
  return {
    orderId: item.orderId || `legacy_${index}_${String(item.serviceDate || '').replace(/-/g, '')}`,
    ownerUserId: getCurrentUserId(),
    orderType: 'service_order',
    serviceType: item.name || '深度开荒',
    status: item.status || '待服务',
    roomNo: item.roomNo || '',
    scheduleResult: item.scheduleResult || null,
    sourcePage: 'legacy_seed',
    createdAt,
    updatedAt: createdAt,
    invitedBy: item.invitedBy || '',
    inviteSource: item.inviteSource || '',
    inviteToken: item.inviteToken || item.inviteCode || '',
    communityName: item.communityName || '',
    orderArea: item.orderArea || '',
    serviceDate: item.serviceDate || '',
    totalPrice: Number(item.totalPrice || 0),
    grossPrice: Number(item.grossPrice || 0),
    earlyBirdDiscount: Number(item.earlyBirdDiscount || 0),
    newcomerDiscount: Number(item.newcomerDiscount || 0),
    groupDiscount: Number(item.groupDiscount || 0),
    groupDiscountPerSqm: Number(item.groupDiscountPerSqm || 0),
    groupId: String(item.groupId || ''),
    groupMode: String(item.groupMode || ''),
    entryFrom: String(item.entryFrom || ''),
    productType: item.productType || inferProductType(item.name),
    isUpgraded: !!item.isUpgraded,
    upgradePrice: Number(item.upgradePrice || 0),
  }
}

function ensureOrderStore(seedOrders) {
  const migrated = safeGet(STORAGE_KEYS.LEGACY_MIGRATED, false) === true
  if (migrated) return listOrders()
  const next = Array.isArray(seedOrders) ? seedOrders.map(mapLegacyOrder) : []
  saveOrders(next)
  safeSet(STORAGE_KEYS.LEGACY_MIGRATED, true)
  return next
}

function getOrdersForCurrentUser() {
  return listOrders()
    .filter(order => order && order.ownerUserId === getCurrentUserId())
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

function getOrderById(orderId) {
  if (!orderId) return null
  return listOrders().find(order => order && order.orderId === orderId) || null
}

function upsertOrder(order) {
  if (!order || !order.orderId) return null
  const all = listOrders()
  const idx = all.findIndex(item => item && item.orderId === order.orderId)
  const next = { ...order, updatedAt: nowIso() }
  if (idx >= 0) {
    all[idx] = next
  } else {
    all.unshift(next)
  }
  saveOrders(all)
  return next
}

function setCurrentOrderId(orderId) {
  if (!orderId) return
  safeSet(STORAGE_KEYS.CURRENT_ORDER_ID, orderId)
}

function getCurrentOrderId() {
  return String(safeGet(STORAGE_KEYS.CURRENT_ORDER_ID, '') || '')
}

function getCurrentOrder() {
  const orderId = getCurrentOrderId()
  return orderId ? getOrderById(orderId) : null
}

function buildOrderSub(order) {
  const area = order.orderArea || ''
  const date = order.serviceDate || ''
  if (!area && !date) return ''
  if (!area) return date
  if (!date) return area
  return `${area} · ${date}`
}

function buildOrderDate(order) {
  const text = String(order.serviceDate || '').trim()
  return text ? text.slice(2) : ''
}

function toOrderListItem(order) {
  const displayStatus = normalizeDisplayStatus(order.status)
  return {
    ...order,
    name: normalizeServiceName(order.serviceType),
    sub: buildOrderSub(order),
    date: buildOrderDate(order),
    displayStatus,
    statusClass: normalizeStatusClass(displayStatus),
    inviteCode: order.inviteToken || '',
  }
}

function saveCheckoutDraft(draft) {
  safeSet(STORAGE_KEYS.CHECKOUT_DRAFT, {
    ...draft,
    updatedAt: nowIso(),
  })
}

function getCheckoutDraft() {
  const draft = safeGet(STORAGE_KEYS.CHECKOUT_DRAFT, null)
  return draft && typeof draft === 'object' ? draft : null
}

function clearCheckoutDraft() {
  safeRemove(STORAGE_KEYS.CHECKOUT_DRAFT)
}

function buildClientPaymentRef(draft, currentUser) {
  const userId = String((currentUser && currentUser.userId) || getCurrentUserId() || '').trim()
  const serviceType = String((draft && draft.serviceType) || '').trim()
  const communityName = String((draft && draft.communityName) || '').trim()
  const roomNo = String((draft && draft.roomNo) || '').trim()
  const serviceDate = String((draft && draft.serviceDate) || '').trim()
  const totalPrice = String((draft && draft.totalPrice) || '').trim()
  const sourcePage = String((draft && draft.sourcePage) || '').trim()
  const base = [userId, serviceType, communityName, roomNo, serviceDate, totalPrice, sourcePage].join('|')
  const fallback = `payref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  if (!base.replace(/\|/g, '')) return fallback
  return `payref_${base}`
}

function savePaymentCreateRef(ref) {
  if (!ref) return
  safeSet(STORAGE_KEYS.PAYMENT_CREATE_REF, String(ref))
}

function getPaymentCreateRef() {
  return String(safeGet(STORAGE_KEYS.PAYMENT_CREATE_REF, '') || '')
}

function clearPaymentCreateRef() {
  safeRemove(STORAGE_KEYS.PAYMENT_CREATE_REF)
}

function createOrderFromCheckoutDraft(draft) {
  if (!draft || typeof draft !== 'object') return null
  const createdAt = nowIso()
  const order = {
    orderId: makeOrderId(),
    ownerUserId: getCurrentUserId(),
    orderType: 'service_order',
    serviceType: draft.serviceType || '深度开荒',
    status: draft.status || '待服务',
    roomNo: draft.roomNo || '',
    scheduleResult: draft.scheduleResult || null,
    sourcePage: draft.sourcePage || 'checkout',
    createdAt,
    updatedAt: createdAt,
    invitedBy: draft.invitedBy || '',
    inviteSource: draft.inviteSource || '',
    inviteToken: draft.inviteToken || '',
    communityName: draft.communityName || '',
    orderArea: draft.orderArea || '',
    serviceDate: draft.serviceDate || '',
    totalPrice: Number(draft.totalPrice || 0),
    grossPrice: Number(draft.grossPrice || 0),
    earlyBirdDiscount: Number(draft.earlyBirdDiscount || 0),
    newcomerDiscount: Number(draft.newcomerDiscount || 0),
    groupDiscount: Number(draft.groupDiscount || 0),
    groupDiscountPerSqm: Number(draft.groupDiscountPerSqm || 0),
    groupId: String(draft.groupId || ''),
    groupMode: String(draft.groupMode || ''),
    entryFrom: String(draft.entryFrom || ''),
    productType: draft.productType || inferProductType(draft.serviceType),
    isUpgraded: !!draft.isUpgraded,
    upgradePrice: Number(draft.upgradePrice || 0),
  }
  upsertOrder(order)
  setCurrentOrderId(order.orderId)
  clearCheckoutDraft()
  clearPaymentCreateRef()
  clearActiveInviteContext()
  return order
}

function normalizeServerOrder(order) {
  if (!order || typeof order !== 'object') return null
  return {
    orderId: String(order.orderId || ''),
    ownerUserId: String(order.ownerUserId || order.userId || ''),
    orderType: String(order.orderType || 'service_order'),
    serviceType: String(order.serviceType || '深度开荒'),
    status: String(order.status || '待服务'),
    roomNo: String(order.roomNo || ''),
    scheduleResult: order.scheduleResult || null,
    sourcePage: String(order.sourcePage || 'cloud'),
    createdAt: String(order.createdAt || nowIso()),
    updatedAt: String(order.updatedAt || order.createdAt || nowIso()),
    invitedBy: String(order.invitedBy || ''),
    inviteSource: String(order.inviteSource || ''),
    inviteToken: String(order.inviteToken || ''),
    communityName: String(order.communityName || ''),
    orderArea: String(order.orderArea || ''),
    serviceDate: String(order.serviceDate || ''),
    totalPrice: Number(order.totalPrice || 0),
    grossPrice: Number(order.grossPrice || 0),
    earlyBirdDiscount: Number(order.earlyBirdDiscount || 0),
    newcomerDiscount: Number(order.newcomerDiscount || 0),
    groupDiscount: Number(order.groupDiscount || 0),
    groupDiscountPerSqm: Number(order.groupDiscountPerSqm || 0),
    groupId: String(order.groupId || ''),
    groupMode: String(order.groupMode || ''),
    entryFrom: String(order.entryFrom || ''),
    productType: String(order.productType || inferProductType(order.serviceType)),
    isUpgraded: !!order.isUpgraded,
    upgradePrice: Number(order.upgradePrice || 0),
    packageFlowType: String(order.packageFlowType || ''),
    docState: String(order.docState || ''),
    docRefs: order.docRefs || null,
    idempotencyKey: String(order.idempotencyKey || ''),
    clientPaymentRef: String(order.clientPaymentRef || ''),
  }
}

function cacheServerOrder(order) {
  const normalized = normalizeServerOrder(order)
  if (!normalized || !normalized.orderId) return null
  const next = upsertOrder(normalized)
  setCurrentOrderId(normalized.orderId)
  return next
}

function cacheOrderScheduleResult(orderId, scheduleResult, updatedAt) {
  const order = getOrderById(orderId)
  if (!order) return null
  return upsertOrder({
    ...order,
    scheduleResult: scheduleResult || null,
    updatedAt: String(updatedAt || nowIso()),
  })
}

function replaceOrdersForCurrentUserFromServer(orders) {
  const normalizedList = (Array.isArray(orders) ? orders : [])
    .map(normalizeServerOrder)
    .filter(order => order && order.orderId)

  const currentUserId = getCurrentUserId()
  const preserved = listOrders().filter(order => order && order.ownerUserId !== currentUserId)
  const next = preserved.concat(normalizedList)
  next.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  saveOrders(next)
  return normalizedList
}

function updateOrderSchedule(orderId, payload) {
  const order = getOrderById(orderId)
  if (!order) return null
  const nextNodeBookings = {
    ...((order.scheduleResult && order.scheduleResult.nodeBookings) || {}),
    [payload.nodeName]: {
      nodeName: payload.nodeName,
      dateLabel: payload.dateLabel,
      slot: payload.slot,
      status: 'booked',
      updatedAt: nowIso(),
    },
  }
  return upsertOrder({
    ...order,
    scheduleResult: {
      lastNode: payload.nodeName,
      lastDate: payload.dateLabel,
      lastSlot: payload.slot,
      updatedAt: nowIso(),
      nodeBookings: nextNodeBookings,
    },
  })
}

function updateOrderStatus(orderId, status) {
  const order = getOrderById(orderId)
  if (!order) return null
  return upsertOrder({ ...order, status })
}

function buildOrderDetailUrl(orderId) {
  return `/pages/order-detail/order-detail?orderId=${encodeURIComponent(orderId || '')}`
}

function resolveOrder(orderOrId) {
  if (!orderOrId) return null
  if (typeof orderOrId === 'string') return getOrderById(orderOrId)
  if (orderOrId.orderId) return orderOrId
  return null
}

function buildLegacyDocSuffix(order) {
  if (!order) return ''
  const serviceType = String(order.serviceType || order.name || '').trim()
  const communityName = String(order.communityName || '').trim()
  const roomNo = String(order.roomNo || '').trim()
  const serviceDate = String(order.serviceDate || '').trim()
  if (!serviceType || !communityName || !roomNo || !serviceDate) return ''
  return `${serviceType}_${communityName}_${roomNo}_${serviceDate}`
}

function buildDocStorageKeys(orderOrId) {
  const order = resolveOrder(orderOrId)
  if (!order || !order.orderId) return null
  return {
    flowState: `${DOC_STORAGE_PREFIXES.FLOW_STATE}${order.orderId}`,
    confirmData: `${DOC_STORAGE_PREFIXES.CONFIRM_DATA}${order.orderId}`,
    finalSnapshot: `${DOC_STORAGE_PREFIXES.FINAL_SNAPSHOT}${order.orderId}`,
    finalPdf: `${DOC_STORAGE_PREFIXES.FINAL_PDF}${order.orderId}`,
  }
}

function migrateLegacyDocStorage(orderOrId) {
  const order = resolveOrder(orderOrId)
  const keys = buildDocStorageKeys(order)
  if (!order || !keys) return null
  const suffix = buildLegacyDocSuffix(order)
  if (!suffix) return keys

  const legacyKeys = {
    flowState: `schemeFlow_${suffix}`,
    compatStatus: `schemeStatus_${suffix}`,
    confirmData: `schemeConfirmData_${suffix}`,
    finalSnapshot: `finalBookSnapshot_${suffix}`,
    finalPdf: `finalBookPdf_${suffix}`,
  }

  const legacyFlowState = safeGet(legacyKeys.flowState, '') || safeGet(legacyKeys.compatStatus, '')
  if (legacyFlowState && !safeGet(keys.flowState, '')) {
    safeSet(keys.flowState, legacyFlowState)
  }
  const legacyConfirmData = safeGet(legacyKeys.confirmData, '')
  if (legacyConfirmData && !safeGet(keys.confirmData, '')) {
    safeSet(keys.confirmData, legacyConfirmData)
  }
  const legacyFinalSnapshot = safeGet(legacyKeys.finalSnapshot, '')
  if (legacyFinalSnapshot && !safeGet(keys.finalSnapshot, '')) {
    safeSet(keys.finalSnapshot, legacyFinalSnapshot)
  }
  const legacyFinalPdf = safeGet(legacyKeys.finalPdf, '')
  if (legacyFinalPdf && !safeGet(keys.finalPdf, '')) {
    safeSet(keys.finalPdf, legacyFinalPdf)
  }

  safeRemove(legacyKeys.flowState)
  safeRemove(legacyKeys.compatStatus)
  safeRemove(legacyKeys.confirmData)
  safeRemove(legacyKeys.finalSnapshot)
  safeRemove(legacyKeys.finalPdf)

  return keys
}

function readDocFlowState(orderOrId) {
  const keys = migrateLegacyDocStorage(orderOrId)
  return keys ? String(safeGet(keys.flowState, '') || '') : ''
}

function writeDocFlowState(orderOrId, state) {
  const keys = migrateLegacyDocStorage(orderOrId)
  if (!keys) return
  safeSet(keys.flowState, String(state || ''))
}

function readDocConfirmData(orderOrId) {
  const keys = migrateLegacyDocStorage(orderOrId)
  return keys ? safeGet(keys.confirmData, '') : ''
}

function writeDocConfirmData(orderOrId, value) {
  const keys = migrateLegacyDocStorage(orderOrId)
  if (!keys) return
  safeSet(keys.confirmData, value)
}

function readDocFinalSnapshot(orderOrId) {
  const keys = migrateLegacyDocStorage(orderOrId)
  return keys ? safeGet(keys.finalSnapshot, '') : ''
}

function writeDocFinalSnapshot(orderOrId, value) {
  const keys = migrateLegacyDocStorage(orderOrId)
  if (!keys) return
  safeSet(keys.finalSnapshot, value)
}

function readDocFinalPdf(orderOrId) {
  const keys = migrateLegacyDocStorage(orderOrId)
  return keys ? safeGet(keys.finalPdf, '') : ''
}

function buildInviteToken(profile) {
  const ownerUserId = String((profile && profile.ownerUserId) || getCurrentUserId() || '').trim()
  return ownerUserId ? `qr_${ownerUserId}_stable` : ''
}

function normalizeInviteProfile(profile) {
  const ownerUserId = String((profile && profile.ownerUserId) || getCurrentUserId() || '').trim()
  const createdAt = profile && profile.createdAt ? String(profile.createdAt) : nowIso()
  return {
    ownerUserId,
    inviteToken: String((profile && profile.inviteToken) || buildInviteToken({ ownerUserId }) || ''),
    inviteSource: String((profile && profile.inviteSource) || 'qr'),
    createdAt,
    updatedAt: nowIso(),
  }
}

function cacheInviteProfile(profile) {
  const next = normalizeInviteProfile(profile)
  if (!next.ownerUserId || !next.inviteToken) return null
  safeSet(STORAGE_KEYS.INVITE_PROFILE, next)
  return next
}

function getOrCreateInviteProfile() {
  const raw = safeGet(STORAGE_KEYS.INVITE_PROFILE, null)
  if (raw && raw.ownerUserId === getCurrentUserId() && raw.inviteToken) {
    return cacheInviteProfile(raw) || raw
  }
  return cacheInviteProfile({ ownerUserId: getCurrentUserId() })
}

function parseInviteToken(inviteToken) {
  const text = String(inviteToken || '').trim()
  const match = text.match(/^qr_(.+)_([A-Za-z0-9]+)$/)
  if (!match) return null
  return {
    invitedBy: match[1],
    inviteSource: 'qr',
    inviteToken: text,
  }
}

function setActiveInviteContext(context) {
  if (!context || !context.inviteToken) return
  if (context.invitedBy && String(context.invitedBy) === getCurrentUserId()) return
  safeSet(STORAGE_KEYS.ACTIVE_INVITE, {
    ...context,
    updatedAt: nowIso(),
  })
}

function getActiveInviteContext() {
  const raw = safeGet(STORAGE_KEYS.ACTIVE_INVITE, null)
  return raw && typeof raw === 'object' ? raw : null
}

function clearActiveInviteContext() {
  safeRemove(STORAGE_KEYS.ACTIVE_INVITE)
}

module.exports = {
  STORAGE_KEYS,
  DOC_STORAGE_PREFIXES,
  normalizeDisplayStatus,
  normalizeStatusClass,
  inferProductType,
  ensureCurrentUser,
  setCurrentUser,
  getCurrentUser,
  ensureOrderStore,
  getCurrentUserId,
  getOrdersForCurrentUser,
  getOrderById,
  upsertOrder,
  getCurrentOrderId,
  setCurrentOrderId,
  getCurrentOrder,
  toOrderListItem,
  saveCheckoutDraft,
  getCheckoutDraft,
  clearCheckoutDraft,
  buildClientPaymentRef,
  savePaymentCreateRef,
  getPaymentCreateRef,
  clearPaymentCreateRef,
  createOrderFromCheckoutDraft,
  normalizeServerOrder,
  cacheServerOrder,
  cacheOrderScheduleResult,
  replaceOrdersForCurrentUserFromServer,
  updateOrderSchedule,
  updateOrderStatus,
  buildOrderDetailUrl,
  buildDocStorageKeys,
  migrateLegacyDocStorage,
  readDocFlowState,
  writeDocFlowState,
  readDocConfirmData,
  writeDocConfirmData,
  readDocFinalSnapshot,
  writeDocFinalSnapshot,
  readDocFinalPdf,
  cacheInviteProfile,
  getOrCreateInviteProfile,
  parseInviteToken,
  setActiveInviteContext,
  getActiveInviteContext,
  clearActiveInviteContext,
}
