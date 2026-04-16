/**
 * dev-benefit-test — 权益功能测试面板（上线前删除）
 * 所有数据操作走 devSetupTest 云函数，确保 OPENID 正确
 */
Page({
  data: {
    log: [],
  },

  onLoad() {
    this._log('测试面板就绪')
    this._log('请先上传 devSetupTest 云函数')
    this._log('然后按顺序操作：1→2→跳转测试')
  },

  _log(msg) {
    const log = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...this.data.log].slice(0, 50)
    this.setData({ log })
  },

  async _callTest(action) {
    try {
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'devSetupTest',
          data: { action },
          success: r => resolve(r && r.result ? r.result : {}),
          fail: reject,
        })
      )
      return res
    } catch (e) {
      this._log('云函数调用失败: ' + (e.message || e.errMsg || JSON.stringify(e)))
      return { ok: false, error: e.message || '' }
    }
  },

  // ── 1. 创建团长 ──
  async setupLeader() {
    this._log('正在创建团长...')
    const res = await this._callTest('setupLeader')
    if (res.ok) {
      this._log(`团长${res.action === 'created' ? '创建' : '更新'}成功: S2 高级团长, openId=${res.openId}`)
    } else {
      this._log('失败: ' + (res.error || JSON.stringify(res)))
    }
  },

  // ── 2. 领取 4 种券 ──
  async claimAllCoupons() {
    const types = ['daily_cleaning', 'window', 'pet_sanitize', 'formaldehyde']
    for (const couponType of types) {
      this._log(`领取 ${couponType}...`)
      try {
        const res = await new Promise((resolve, reject) =>
          wx.cloud.callFunction({
            name: 'claimCoupon',
            data: { couponType },
            success: r => resolve(r && r.result ? r.result : {}),
            fail: reject,
          })
        )
        if (res.ok) {
          this._log(`✓ ${couponType} 领取成功, ¥${res.coupon.amount}`)
        } else {
          this._log(`✗ ${couponType}: ${res.error}`)
        }
      } catch (e) {
        this._log(`✗ ${couponType} 调用失败: ${e.message || ''}`)
      }
    }
    this._log('领取完成，可以跳转页面测试了')
  },

  // ── 查看数据 ──
  async listCoupons() {
    this._log('查询券...')
    const res = await this._callTest('listCoupons')
    if (res.ok) {
      const coupons = res.coupons || []
      this._log(`共 ${coupons.length} 张券:`)
      coupons.forEach(c => {
        this._log(`  [${c.couponType}] ¥${c.amount} status=${c.status} expires=${(c.expiresAt || '').slice(0, 10)}`)
      })
    }
  },

  async listBookings() {
    this._log('查询预约...')
    const res = await this._callTest('listBookings')
    if (res.ok) {
      const bookings = res.bookings || []
      this._log(`共 ${bookings.length} 条预约:`)
      bookings.forEach(b => {
        this._log(`  [${b.serviceType}] ${b.serviceDate} ${b.timePeriod || ''} status=${b.status}`)
      })
    }
  },

  // ── 重置 ──
  async clearAll() {
    this._log('清除券...')
    const r1 = await this._callTest('clearCoupons')
    this._log(`券清除 ${r1.cleared || 0} 张`)
    this._log('清除预约...')
    const r2 = await this._callTest('clearBookings')
    this._log(`预约清除 ${r2.cleared || 0} 条`)
    this._log('清除完成，可以重新测试')
  },

  // ── 跳转 ──
  goMonthlyCoupons() { wx.navigateTo({ url: '/pages/monthly-coupons/monthly-coupons' }) },
  goBenefitWindow() { wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=window' }) },
  goBenefitPet() { wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=pet_sanitize' }) },
  goBenefitFormaldehyde() { wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=formaldehyde' }) },
  goBenefitDaily() { wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=daily_cleaning' }) },
  goBenefitMonthly() { wx.navigateTo({ url: '/pages/benefit-detail/benefit-detail?id=monthly_coupon' }) },
  goMine() { wx.switchTab({ url: '/pages/mine/mine' }) },
  goGroupBuy() { wx.reLaunch({ url: '/pages/group-buy/group-buy?tab=leader' }) },
})
