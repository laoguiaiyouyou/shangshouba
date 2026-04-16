/**
 * 全部评价页：完整评论流（REVIEWS）
 * 首页：轻卡片内评分胶囊可点 + 一段两行内口碑摘要（不可点）
 */
const REVIEWS = [
  {
    id: 'rv1',
    userName: '王女士',
    tag: '深度开荒',
    stars: '★★★★★',
    content:
      '师傅很专业，开荒做得很细致，厨房油污和柜后死角都处理到位，验收时还有录像可追溯，整体省心。',
  },
  {
    id: 'rv2',
    userName: '张**',
    tag: '360°全屋',
    stars: '★★★★★',
    content: '四次上门加除甲醛比单次开荒更系统，设备专业，回访跟进及时，管家态度好。',
  },
  {
    id: 'rv3',
    userName: '李先生',
    tag: '入住守护',
    stars: '★★★★★',
    content: '分次上门节奏清楚，每次做完都会拍照说明，最后星灯验收一目了然，适合我们上班族。',
  },
  {
    id: 'rv4',
    userName: '陈*',
    tag: '深度开荒',
    stars: '★★★★☆',
    content: '窗户和卫生间处理得特别干净，有一点小瑕疵反馈后第二天就补做了，响应快。',
  },
  {
    id: 'rv5',
    userName: '赵女士',
    tag: '除甲醛',
    stars: '★★★★★',
    content: '除完味道明显轻了，报告数据也讲得很明白，和保洁一起订省事不少。',
  },
  {
    id: 'rv6',
    userName: '周**',
    tag: '360°全屋',
    stars: '★★★★★',
    content: '搬家前后都包了，地板打蜡效果明显，整体比分开找几家对接轻松。',
  },
]

/** 首页评分摘要入口文案（唯一可点击进全部评价） */
const RATING_ENTRY = {
  score: '4.6',
  label: '很好',
  count: '1.7万条',
}

/** 首页口碑摘要：只抓 2 个核心感受，口语一点，不作汇报式罗列 */
const HOME_REVIEW_SNIPPET =
  '不少邻居说师傅手里活细，边角也愿意抠；再就是跟你说明白做到哪、怎么验，心里比较踏实。'

module.exports = {
  REVIEWS,
  RATING_ENTRY,
  HOME_REVIEW_SNIPPET,
}
