const TABS = [
  { category: 'living',  label: '客厅' },
  { category: 'kitchen', label: '厨房' },
  { category: 'bath',    label: '卫浴' },
  { category: 'bedroom', label: '卧室' },
]

/** 本轮 mock 数据：cover 留空，占位渲染；小区/面积可用实际数据替换 */
const CASE_ITEMS = {
  living: [
    { id: 'l1', category: 'living', cover: '', community: '燕棠轩', area: '132㎡' },
    { id: 'l2', category: 'living', cover: '', community: '翡翠城', area: '98㎡' },
    { id: 'l3', category: 'living', cover: '', community: '锦江花园', area: '110㎡' },
    { id: 'l4', category: 'living', cover: '', community: '阳光100', area: '88㎡' },
    { id: 'l5', category: 'living', cover: '', community: '碧桂园', area: '145㎡' },
    { id: 'l6', category: 'living', cover: '', community: '绿城玫瑰', area: '120㎡' },
  ],
  kitchen: [
    { id: 'k1', category: 'kitchen', cover: '', community: '燕棠轩', area: '132㎡' },
    { id: 'k2', category: 'kitchen', cover: '', community: '中央公馆', area: '180㎡' },
    { id: 'k3', category: 'kitchen', cover: '', community: '翡翠城', area: '98㎡' },
    { id: 'k4', category: 'kitchen', cover: '', community: '金色港湾', area: '115㎡' },
    { id: 'k5', category: 'kitchen', cover: '', community: '海棠苑', area: '102㎡' },
    { id: 'k6', category: 'kitchen', cover: '', community: '城市之光', area: '136㎡' },
  ],
  bath: [
    { id: 'b1', category: 'bath', cover: '', community: '锦江花园', area: '110㎡' },
    { id: 'b2', category: 'bath', cover: '', community: '燕棠轩', area: '132㎡' },
    { id: 'b3', category: 'bath', cover: '', community: '碧桂园', area: '145㎡' },
    { id: 'b4', category: 'bath', cover: '', community: '龙湖春江', area: '92㎡' },
    { id: 'b5', category: 'bath', cover: '', community: '招商雍景', area: '128㎡' },
    { id: 'b6', category: 'bath', cover: '', community: '华润橡树湾', area: '156㎡' },
  ],
  bedroom: [
    { id: 'd1', category: 'bedroom', cover: '', community: '翡翠城', area: '98㎡' },
    { id: 'd2', category: 'bedroom', cover: '', community: '绿城玫瑰', area: '120㎡' },
    { id: 'd3', category: 'bedroom', cover: '', community: '阳光100', area: '88㎡' },
    { id: 'd4', category: 'bedroom', cover: '', community: '万科城', area: '168㎡' },
    { id: 'd5', category: 'bedroom', cover: '', community: '燕棠轩', area: '132㎡' },
    { id: 'd6', category: 'bedroom', cover: '', community: '金科廊桥', area: '108㎡' },
  ],
}

/** category=all 时合并全部，用于「查看更多」入口 */
function getAllItems() {
  return [
    ...CASE_ITEMS.living,
    ...CASE_ITEMS.kitchen,
    ...CASE_ITEMS.bath,
    ...CASE_ITEMS.bedroom,
  ]
}

Page({
  data: {
    statusBarHeight: 0,
    tabs: TABS,
    currentCategory: 'living',
    currentLabel: '客厅',
    currentItems: CASE_ITEMS.living,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const category = options.category || 'living'
    const label = options.label ? decodeURIComponent(options.label) : '客厅'

    const items = category === 'all'
      ? getAllItems()
      : (CASE_ITEMS[category] || CASE_ITEMS.living)

    const currentCategory = category === 'all' ? 'living' : category
    const currentLabel = category === 'all' ? '全部' : label

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 44,
      currentCategory,
      currentLabel,
      currentItems: items,
    })
  },

  onTabTap(e) {
    const { category, label } = e.currentTarget.dataset
    if (category === this.data.currentCategory) return
    const items = CASE_ITEMS[category] || []
    this.setData({
      currentCategory: category,
      currentLabel: label,
      currentItems: items,
    })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },
})
