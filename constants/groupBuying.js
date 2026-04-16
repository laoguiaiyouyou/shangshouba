/**
 * groupBuying.js
 * 社区团购相关常量——所有门槛值和枚举统一在此定义，组件内禁止硬编码。
 */

// ── 成团人数门槛 ──
const GROUP_THRESHOLD = 3

// ── 团长升级门槛 ──
const JUNIOR_THRESHOLD = 3    // S1 准团长
const SENIOR_THRESHOLD = 10   // S2 高级团长
const HONOR_THRESHOLD  = 30   // S3 荣誉团长

// ── 团状态枚举 ──
const GROUP_STATUS = {
  RECRUITING: '招募中',
  FORMED:     '已成团',
  INVALID:    '已失效',
}

// ── 成员状态枚举 ──
const MEMBER_STATUS = {
  JOINED:    '已加入',
  ORDERED:   '已下单',
  PAID:      '已支付',
  COMPLETED: '已完工',
  INVALID:   '已失效',
}

// ── 角色枚举 ──
const ROLE = {
  NORMAL:    '尊贵用户',
  INITIATOR: '发起人',
  JUNIOR:    '准团长',
  SENIOR:    '高级团长',
  HONOR:     '荣誉团长',
}

module.exports = {
  GROUP_THRESHOLD,
  JUNIOR_THRESHOLD,
  SENIOR_THRESHOLD,
  HONOR_THRESHOLD,
  GROUP_STATUS,
  MEMBER_STATUS,
  ROLE,
}
