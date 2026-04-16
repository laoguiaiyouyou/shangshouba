/**
 * getScheduleSlots — 查询指定月份的档期状态
 *
 * 参数：{ year, month, serviceType }
 *   year: 2026
 *   month: 5（1-12）
 *   serviceType: "window" | "pet_sanitize" | "formaldehyde" | "daily_cleaning"（可选，不传查全部）
 *
 * 返回：{ ok, slots: { "2026-05-16": "full", "2026-05-17": "am_full", ... } }
 *
 * schedule_slots 集合结构：
 *   { date: "2026-05-16", serviceType: "all"|"window"|..., status: "full"|"am_full"|"pm_full" }
 *   serviceType="all" 表示当天所有服务都满
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const year = Number(event && event.year) || new Date().getFullYear()
  const month = Number(event && event.month) || (new Date().getMonth() + 1)
  const serviceType = String((event && event.serviceType) || '').trim()

  const pad = n => String(n).padStart(2, '0')
  const prefix = `${year}-${pad(month)}`
  const startDate = `${prefix}-01`
  const endDate = `${prefix}-31`

  try {
    // 查当月所有档期标记
    const conditions = {
      date: _.gte(startDate).and(_.lte(endDate)),
    }
    // serviceType 匹配：查 "all" 或指定类型
    if (serviceType) {
      conditions.serviceType = _.in(['all', serviceType])
    }

    const res = await db.collection('schedule_slots')
      .where(conditions)
      .limit(100)
      .get()

    // 合并为 { date: status } 映射，"full" 优先级最高
    const slots = {}
    for (const row of (res.data || [])) {
      const existing = slots[row.date]
      if (row.status === 'full') {
        slots[row.date] = 'full'
      } else if (!existing || existing === 'available') {
        slots[row.date] = row.status
      }
    }

    return { ok: true, slots }
  } catch (e) {
    // schedule_slots 集合可能不存在，返回空
    return { ok: true, slots: {} }
  }
}
