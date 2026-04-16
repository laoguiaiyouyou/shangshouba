/**
 * manageGroup — 拼团管理云函数
 *
 * action: 'create' | 'join' | 'query' | 'resolveShortCode'
 *
 * 拼团规则：
 *  - 团长发起，7天内集满3户付款成功 = 正式成团
 *  - 成团后所有成员获得 ¥2/㎡ × 本单面积 返现到钱包
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db   = cloud.database()
const _    = db.command
const GROUP_TTL_MS    = 7 * 24 * 60 * 60 * 1000  // 7天（DECISIONS.md 第二节）
const GROUP_NEED_SIZE = 3                      // 含团长共3人成团
const shortcutsCol    = db.collection('invite_shortcuts')

function nowIso() { return new Date().toISOString() }
function parseArea(orderArea) {
  const n = parseFloat(String(orderArea || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function isCollectionMissing(error, collectionName) {
  const message = String(
    (error && (error.errMsg || error.message || error.stack || error)) || ''
  )
  return (
    message.includes('-502005') ||
    message.includes('ResourceNotFound') ||
    message.includes('database collection not exists') ||
    message.includes(`Db or Table not exist: ${collectionName}`)
  )
}

// 向用户钱包发放返现
async function creditWallet(ownerUserId, amount, ts) {
  if (!ownerUserId || amount <= 0) return
  const col = db.collection('wallets')
  const res = await col.where({ ownerUserId }).limit(1).get()
  if (res.data && res.data[0]) {
    await col.doc(res.data[0]._id).update({
      data: { withdrawableBalance: _.increment(amount), updatedAt: ts },
    })
  } else {
    await col.add({
      data: { ownerUserId, withdrawableBalance: amount, pendingAmount: 0, createdAt: ts, updatedAt: ts },
    })
  }
}

// 成团：给所有成员发返现
// 通过先原子更新 status=open → formed 来防止并发双重结算
async function settleGroup(group, ts) {
  const groupsCol  = db.collection('groups')
  const ordersCol  = db.collection('service_orders')

  // 原子抢占：只有当前 status 仍为 'open' 时才允许变更，防止并发竞态
  const claimRes = await groupsCol
    .where({ _id: group._id, status: 'open' })
    .update({ data: { status: 'formed', formedAt: ts, updatedAt: ts } })
  if (!claimRes.stats || claimRes.stats.updated === 0) {
    // 已被另一次并发调用抢先结算，直接退出
    return []
  }

  const rebates = []
  for (const member of group.members) {
    const orderRes = await ordersCol.where({ orderId: member.orderId }).limit(1).get()
    const order    = orderRes.data && orderRes.data[0]
    if (!order) continue
    const area        = parseArea(order.orderArea)
    const rebateAmt   = parseFloat((area * 2).toFixed(2))
    if (rebateAmt <= 0) continue
    await creditWallet(member.openId, rebateAmt, ts)
    // 在订单上打标
    await ordersCol.doc(order._id).update({
      data: { groupRebatePaid: true, groupRebateAmount: rebateAmt, updatedAt: ts },
    })
    rebates.push({ openId: member.openId, rebateAmt })
  }

  return rebates
}

exports.main = async (event) => {
  const action  = String((event && event.action) || '')
  const orderId = String((event && event.orderId) || '').trim()
  const groupId = String((event && event.groupId) || '').trim()
  const shortCode = String((event && event.shortCode) || '').trim()
  const communityName = String((event && event.communityName) || '').trim()
  const ts      = nowIso()

  if (action === 'resolveShortCode') {
    if (!shortCode) return { ok: false, error: 'MISSING_SHORT_CODE' }
    try {
      const shortcutRes = await shortcutsCol
        .where({ type: 'group', shortCode })
        .limit(1).get()
      const shortcut = shortcutRes.data && shortcutRes.data[0]
      if (!shortcut || !shortcut.groupId) return { ok: false, error: 'SHORT_CODE_NOT_FOUND' }
      return {
        ok: true,
        shortCode,
        groupId: String(shortcut.groupId || '').trim(),
        communityName: String(shortcut.communityName || '').trim(),
      }
    } catch (e) {
      if (isCollectionMissing(e, 'invite_shortcuts')) {
        return { ok: false, error: 'SHORT_CODE_NOT_FOUND' }
      }
      throw e
    }
  }

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  // ── 创建团 ────────────────────────────────────────────────────
  if (action === 'create') {
    if (!orderId) return { ok: false, error: 'MISSING_ORDER_ID' }

    // 按 orderId 查，再宽松校验归属（兼容 openId/userId/ownerUserId 三种字段名）
    const orderRes = await db.collection('service_orders')
      .where({ orderId }).limit(1).get()
    const order = orderRes.data && orderRes.data[0]
    if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }
    const ownerMatch = order.openId === OPENID || order.userId === OPENID || order.ownerUserId === OPENID
    if (!ownerMatch) return { ok: false, error: 'ORDER_NOT_FOUND' }
    if (order.status === '待支付') return { ok: false, error: 'ORDER_NOT_PAID' }

    // 幂等：该订单已有团则复用
    const existRes = await db.collection('groups')
      .where({ leaderOpenId: OPENID, leaderOrderId: orderId })
      .limit(1).get()
    if (existRes.data && existRes.data[0]) {
      return { ok: true, reused: true, group: existRes.data[0] }
    }

    const expiresAt = new Date(Date.now() + GROUP_TTL_MS).toISOString()
    const groupCommunity = communityName || String(order.communityName || '').trim()
    const group = {
      leaderOpenId:  OPENID,
      leaderOrderId: orderId,
      communityName: groupCommunity,
      members: [{ openId: OPENID, orderId, joinedAt: ts }],
      status:    'open',
      createdAt: ts,
      expiresAt,
      updatedAt: ts,
    }
    const addRes = await db.collection('groups').add({ data: group })
    group._id = addRes._id

    return { ok: true, reused: false, group }
  }

  // ── 加入团 ────────────────────────────────────────────────────
  if (action === 'join') {
    if (!groupId || !orderId) return { ok: false, error: 'MISSING_PARAMS' }

    // 验证订单（兼容 openId/userId/ownerUserId 三种字段名）
    const orderRes = await db.collection('service_orders')
      .where({ orderId }).limit(1).get()
    const order = orderRes.data && orderRes.data[0]
    if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }
    const ownerOk = order.openId === OPENID || order.userId === OPENID || order.ownerUserId === OPENID
    if (!ownerOk) return { ok: false, error: 'ORDER_NOT_FOUND' }
    if (order.status === '待支付') return { ok: false, error: 'ORDER_NOT_PAID' }

    const groupRes = await db.collection('groups').doc(groupId).get()
    const group    = groupRes.data
    if (!group) return { ok: false, error: 'GROUP_NOT_FOUND' }
    if (group.status !== 'open') return { ok: false, error: 'GROUP_CLOSED', status: group.status }
    if (new Date(group.expiresAt) < new Date()) {
      await db.collection('groups').doc(groupId).update({
        data: { status: 'expired', updatedAt: ts },
      })
      return { ok: false, error: 'GROUP_EXPIRED' }
    }

    // 防重复加入
    const alreadyIn = group.members.some(m => m.openId === OPENID)
    if (alreadyIn) return { ok: true, reused: true, group, formed: group.status === 'formed' }

    // 同小区校验：订单小区必须与团小区一致
    const orderCommunity = String(order.communityName || '').trim()
    const groupCommunity = String(group.communityName || '').trim()
    if (orderCommunity && groupCommunity && orderCommunity !== groupCommunity) {
      return { ok: false, error: 'GROUP_COMMUNITY_MISMATCH' }
    }

    // 不同房号校验：同团内不允许出现相同房号
    const orderRoomNo = String(order.roomNo || '').trim()
    if (orderRoomNo) {
      const dupRoom = group.members.some(m => String(m.roomNo || '').trim() === orderRoomNo)
      if (dupRoom) return { ok: false, error: 'GROUP_DUPLICATE_ROOM' }
    }

    // 加入
    const newMember = { openId: OPENID, orderId, roomNo: orderRoomNo, communityName: orderCommunity, joinedAt: ts }
    await db.collection('groups').doc(groupId).update({
      data: {
        members:   _.push(newMember),
        updatedAt: ts,
      },
    })

    // 重新拉取最新 group
    const freshRes = await db.collection('groups').doc(groupId).get()
    const fresh    = freshRes.data

    // 统计已付款成员数（join action 要求调用者订单已非"待支付"，但旧成员订单也需验证）
    const ordersColForJoin = db.collection('service_orders')
    let paidCountForJoin = 0
    for (const member of (fresh.members || [])) {
      if (!member.orderId) continue
      const oRes = await ordersColForJoin.where({ orderId: member.orderId }).limit(1).get()
      const mo = oRes.data && oRes.data[0]
      if (mo && mo.status !== '待支付') paidCountForJoin++
    }

    // 只有付款成员数达到门槛才成团
    if (paidCountForJoin >= GROUP_NEED_SIZE) {
      const rebates = await settleGroup(fresh, ts)
      return { ok: true, reused: false, formed: true, group: fresh, rebates }
    }

    return { ok: true, reused: false, formed: false, group: fresh, paidCount: paidCountForJoin }
  }

  // ── 付款后成团检查（由 paymentCallback 触发）────────────────────
  // 统计团内"已付款"成员数（订单状态 !== '待支付'），达到门槛才成团
  if (action === 'checkPaidAndSettle') {
    if (!groupId) return { ok: false, error: 'MISSING_GROUP_ID' }
    const groupRes = await db.collection('groups').doc(groupId).get()
    const group    = groupRes.data
    if (!group) return { ok: false, error: 'GROUP_NOT_FOUND' }
    if (group.status !== 'open') return { ok: true, alreadySettled: true, status: group.status }

    // 逐成员查询其订单状态，统计已付款数
    const ordersCol = db.collection('service_orders')
    let paidCount = 0
    for (const member of (group.members || [])) {
      if (!member.orderId) continue
      const orderRes = await ordersCol.where({ orderId: member.orderId }).limit(1).get()
      const memberOrder = orderRes.data && orderRes.data[0]
      if (memberOrder && memberOrder.status !== '待支付') paidCount++
    }

    if (paidCount >= GROUP_NEED_SIZE) {
      const rebates = await settleGroup(group, ts)
      return { ok: true, formed: true, paidCount, rebates }
    }

    return { ok: true, formed: false, paidCount }
  }

  // ── 查询团状态 ─────────────────────────────────────────────────
  if (action === 'query') {
    if (!groupId) return { ok: false, error: 'MISSING_GROUP_ID' }
    const groupRes = await db.collection('groups').doc(groupId).get()
    const group    = groupRes.data
    if (!group) return { ok: false, error: 'GROUP_NOT_FOUND' }

    // 检查是否已过期
    if (group.status === 'open' && new Date(group.expiresAt) < new Date()) {
      await db.collection('groups').doc(groupId).update({
        data: { status: 'expired', updatedAt: ts },
      })
      group.status = 'expired'
    }

    const remainMs = Math.max(0, new Date(group.expiresAt) - Date.now())
    return {
      ok: true,
      group,
      memberCount:   group.members.length,
      remainMs,
      remainHours:   Math.floor(remainMs / 3600000),
      remainMinutes: Math.floor((remainMs % 3600000) / 60000),
    }
  }

  return { ok: false, error: 'UNKNOWN_ACTION' }
}
