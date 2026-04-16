// app.js
const orderContext = require('./utils/order-context')

App({
  onLaunch() {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    if (!wx.cloud) {
      console.error('当前基础库不支持云开发')
      return
    }

    wx.cloud.init({
      env: 'cloud1-8ge14816fe785add',
      traceUser: true,
    })

    // 先用本地身份兜底（确保页面能立即渲染）
    const localUser = orderContext.ensureCurrentUser()
    this.globalData.currentUser = localUser
    orderContext.ensureOrderStore(this.globalData.orderList || [])
    orderContext.getOrCreateInviteProfile()

    // 异步获取真实 openId，获取后覆盖本地 mock userId
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: (res) => {
        const openId = res && res.result && res.result.openId
        if (openId && openId !== localUser.userId) {
          const updatedUser = orderContext.setCurrentUser({
            userId: openId,
            authSource: 'wx_openid',
          })
          this.globalData.currentUser = updatedUser
        }
      },
      fail: () => {
        // 网络失败时继续用本地身份，不阻断页面
      },
    })
  },
  globalData: {
    userInfo: null,
    currentUser: null,
    orderList: [],
  },
})
