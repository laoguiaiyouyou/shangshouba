/**
 * claimCoupon — 团长券领取（通用）
 *
 * 调用方式：wx.cloud.callFunction({ name: 'claimCoupon', data: { couponType } })
 * couponType: 'daily_cleaning' | 'window' | 'pet_sanitize' | 'formaldehyde'
 *
 * 券规则按类型和团长等级区分，详见 docs/DECISIONS.md 第四节。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ── 券规则表 ─────────────────────────────────────────────────────
// validDays: 有效天数（0 = 当月底截止）
// cooldownType: 'month' | 'week' | 'once'（once = 一次性领取）
const RULES = {
  daily_cleaning: {
    S1: { amount: 10, validDays: 60, yearlyLimit: 3,  cooldownType: 'month' },
    S2: { amount: 15, validDays: 60, yearlyLimit: 6,  cooldownType: 'month' },
    S3: { amount: 20, validDays: 14, yearlyLimit: 24, cooldownType: 'week'  },
  },
  window: {
    S1: { amount: 70,  validDays: 0, yearlyLimit: 2, cooldownType: 'month' },
    S2: { amount: 90,  validDays: 0, yearlyLimit: 4, cooldownType: 'month' },
    S3: { amount: 120, validDays: 0, yearlyLimit: 6, cooldownType: 'month' },
  },
  pet_sanitize: {
    S1: { amount: 20, validDays: 0,  yearlyLimit: 3,  cooldownType: 'month' },
    S2: { amount: 30, validDays: 0,  yearlyLimit: 6,  cooldownType: 'month' },
    S3: { amount: 40, validDays: 0,  yearlyLimit: 12, cooldownType: 'month' },
  },
  formaldehyde: {
    S1: { amount: 200, validDays: 90, yearlyLimit: 1, cooldownType: 'once' },
    S2: { amount: 300, validDays: 90, yearlyLimit: 1, cooldownType: 'once' },
    S3: { amount: 500, validDays: 90, yearlyLimit: 1, cooldownType: 'once' },
  },
}

function nowIso() { return new Date().toISOString() }

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function endOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
}

function yearStart() {
  const d = new Date()
  return new Date(d.getFullYear(), 0, 1).toISOString()
}

function calcExpiresAt(rule) {
  if (rule.validDays > 0) return addDays(new Date(), rule.validDays)
  return endOfMonth()  // validDays=0 → 当月底
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: 'NOT_LOGGED_IN' }

  const couponType = String((event && event.couponType) || 'daily_cleaning').trim()
  const typeRules = RULES[couponType]
  if (!typeRules) return { ok: false, error: 'INVALID_COUPON_TYPE', couponType }

  // ── 1. 查询团长等级 ──────────────────────────────────────────
  const leaderRes = await db.collection('leaders')
    .where({ openId: OPENID })
    .limit(1)
    .get()
  const leader = leaderRes.data && leaderRes.data[0]
  if (!leader) return { ok: false, error: 'NOT_A_LEADER' }

  const tier = String(leader.tier || '').toUpperCase()
  const rule = typeRules[tier]
  if (!rule) return { ok: false, error: 'INVALID_TIER', tier }

  const ts = nowIso()
  const couponsCol = db.collection('coupons')

  // ── 2. 检查手上是否有未用且未过期的同类型券 ───────────────────
  const activeRes = await couponsCol
    .where({
      ownerOpenId: OPENID,
      couponType,
      status: 'active',
      expiresAt: _.gt(ts),
    })
    .limit(1)
    .get()

  if (activeRes.data && activeRes.data.length > 0) {
    return { ok: false, error: 'HAS_ACTIVE_COUPON' }
  }

  // ── 3. 检查年度上限 ──────────────────────────────────────────
  const yearlyRes = await couponsCol
    .where({
      ownerOpenId: OPENID,
      couponType,
      createdAt: _.gte(yearStart()),
    })
    .count()

  if (yearlyRes.total >= rule.yearlyLimit) {
    return { ok: false, error: 'YEARLY_LIMIT_REACHED', limit: rule.yearlyLimit }
  }

  // ── 4. 检查领取频率冷却 ──────────────────────────────────────
  if (rule.cooldownType !== 'once') {
    const lastRes = await couponsCol
      .where({ ownerOpenId: OPENID, couponType })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (lastRes.data && lastRes.data[0]) {
      const lastCreated = new Date(lastRes.data[0].createdAt)
      const now = new Date()
      if (rule.cooldownType === 'month') {
        if (lastCreated.getFullYear() === now.getFullYear() &&
            lastCreated.getMonth() === now.getMonth()) {
          return { ok: false, error: 'COOLDOWN_ACTIVE', cooldownType: 'month' }
        }
      } else if (rule.cooldownType === 'week') {
        const getWeekStart = (d) => {
          const day = d.getDay()
          const diff = d.getDate() - day + (day === 0 ? -6 : 1)
          return new Date(d.getFullYear(), d.getMonth(), diff)
        }
        if (getWeekStart(lastCreated).getTime() === getWeekStart(now).getTime()) {
          return { ok: false, error: 'COOLDOWN_ACTIVE', cooldownType: 'week' }
        }
      }
    }
  }
  // cooldownType === 'once' 只靠 yearlyLimit 拦截，无额外冷却

  // ── 5. 创建券 ────────────────────────────────────────────────
  const coupon = {
    ownerOpenId: OPENID,
    couponType,
    tier,
    amount: rule.amount,
    status: 'active',
    createdAt: ts,
    expiresAt: calcExpiresAt(rule),
    usedAt: null,
    usedOrderId: null,
  }

  const addRes = await couponsCol.add({ data: coupon })
  coupon._id = addRes._id

  return { ok: true, coupon }
}
