// index.js — 首页
const { RATING_ENTRY, HOME_REVIEW_SNIPPET } = require('../../utils/reviews-data.js')

Page({
  data: {
    // 服务列表
    services: [
      {
        id: 'fine_clean',
        title: '深度开荒 Plus',
        tagline: '全屋无死角 360° 除尘去污',
        url: '/pages/detail/detail',
      },
      {
        id: 'move_in_guard',
        title: '开荒保洁',
        tagline: '四次上门跟踪补做，星灯验收，真正拎包住进去放心',
        shortDesc: '新房入住/装修后清扫',
        url: '/pages/detail-basic/detail-basic',
      },
      {
        id: 'care_360',
        title: '深度开荒 Max',
        tagline: '搬家前后全程守护，深度清洁、打蜡与除甲醛一站搞定',
        shortDesc: '全程守护，一站搞定',
        url: '/pages/detail/detail?productType=360',
      },
    ],

    // Hero 信任数字行
    statsStrip: [
      { value: '4600+', label: '服务家庭' },
      { value: '97%',   label: '好评率'   },
      { value: '84%',   label: '转介绍率' },
    ],

    // 案例分类
    caseCategories: [
      { id: 'before_after', category: 'before_after', label: '开荒前后对比' },
      { id: 'glass',        category: 'glass',        label: '玻璃清洁'     },
      { id: 'kitchen',      category: 'kitchen',      label: '厨房深洁'     },
      { id: 'disinfect',    category: 'disinfect',    label: '消杀除味'     },
    ],

    // 为什么选我们
    whyPoints: [
      { title: '验收录像',   desc: '全程拍摄，完工即发，服务过程可查可回看。'         },
      { title: '星灯复检',   desc: '强光照射，边角缝隙也能看清，细节不过线不交付。' },
      { title: '不满返工',   desc: '24 小时内反馈，免费补做，无上限扯皮。'           },
      { title: '透明计价',   desc: '按面积明码标价，不加项，不隐形收费。'           },
    ],

    // 评价
    ratingEntry:   RATING_ENTRY,
    reviewSnippet: HOME_REVIEW_SNIPPET,
  },

  /** 主CTA：进入服务详情/下单 */
  goBooking() {
    wx.navigateTo({ url: '/pages/detail/detail' })
  },

  /** 服务卡点击 */
  onServiceTap(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  /** 全部服务 */
  goDetail() {
    wx.navigateTo({ url: '/pages/detail/detail' })
  },

  /** 团购 Hero CTA */
  goGroupBuy() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy' })
  },

  /** 社区团购 tab */
  goGroupBuyTab() {
    wx.reLaunch({ url: '/pages/group-buy/group-buy' })
  },

  /** 案例实拍点击 */
  onCaseShowcaseTap(e) {
    const { action, category } = e.currentTarget.dataset
    if (action === 'more' || category) {
      wx.navigateTo({ url: '/pages/case-list/case-list' })
    }
  },

  /** 我的 tab */
  goMine() {
    wx.reLaunch({ url: '/pages/mine/mine' })
  },

  /** 评价列表 */
  goReviewList() {
    wx.navigateTo({ url: '/pages/review-list/review-list' })
  },
})
