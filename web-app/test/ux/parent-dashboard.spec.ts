/**
 * 交互体验测试：家长成长看板（UX-PAR-xx）
 * 覆盖：信息架构顺序、今日需关注、概览卡、作业截止提醒、健康度卡、每周小结、
 *       联系老师拨号、成绩对比、骨架屏与空态。
 */
import { mount, flushPromises } from '@vue/test-utils'
import dayjs from 'dayjs'
import Dashboard from '@/views/parent/Dashboard.vue'

jest.mock('lucide-vue-next', () => new Proxy({}, { get: () => ({ template: '<span class="icon" />' }) }))

const today = dayjs().format('YYYY-MM-DD')
const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
const inTwoDays = dayjs().add(2, 'day').format('YYYY-MM-DD')
const thisMonth = dayjs().format('YYYY-MM')

/* ---------- 可控的 API mock ---------- */
const apiState: Record<string, any> = {}
function resetApi(over: Record<string, any> = {}) {
  apiState.me = ('me' in over ? over.me : {
    studentId: 'st1', studentName: '张小宝', className: '一年级(1)班', parentName: '张大宝',
    kids: [{ studentId: 'st1', studentName: '张小宝', studentNo: 'S01', classId: 'c1' }],
    studentInfo: { parentName: '张大宝', parentPhone: '13800000002', address: '武汉', birthDate: '2018-01-01' },
  }
  apiState.notices = ('notices' in over ? over.notices : [{ id: 'n1', title: '家长会通知', content: '请准时参加', pinned: true, createdAt: today }]
  apiState.exams = ('exams' in over ? over.exams : {
    exams: [
      {
        examId: 'e1', examName: '期中考试', term: '上学期', date: dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
        totalScore: 420, totalFullScore: 600, classRank: 8, gradeRank: 40,
        subjects: [
          { subject: '语文', score: 88, fullScore: 100, classRank: 3 },
          { subject: '数学', score: 55, fullScore: 100, classRank: 30 },
        ],
      },
      {
        examId: 'e2', examName: '期末考试', term: '上学期', date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        totalScore: 460, totalFullScore: 600, classRank: 5, gradeRank: 25,
        subjects: [
          { subject: '语文', score: 92, fullScore: 100, classRank: 2 },
          { subject: '数学', score: 62, fullScore: 100, classRank: 22 },
        ],
      },
    ],
  }
  apiState.homework = ('homework' in over ? over.homework : [
    { id: 'h1', subject: '语文', title: '背诵古诗', content: '背诵《静夜思》', startDate: yesterday, deadline: yesterday, status: '待批改' },
    { id: 'h2', subject: '数学', title: '口算练习', content: '口算天天练 P35', startDate: today, deadline: today, status: '待批改' },
    { id: 'h3', subject: '英语', title: '朗读打卡', content: '跟读 Unit 3', startDate: today, deadline: inTwoDays, status: '已批改' },
  ]
  apiState.attendance = ('attendance' in over ? over.attendance : {
    total: 12,
    summary: { reading: 5, sport: 3, behavior: 2, homework: 2 },
    recent: [
      { id: 'a1', type: 'reading', date: today, count: 1, note: '' },
      { id: 'a2', type: 'sport', date: yesterday, count: 1, note: '迟到一次' },
    ],
    byMonth: [{ month: thisMonth, count: 12 }],
  }
  apiState.behavior = ('behavior' in over ? over.behavior : {
    total: 3,
    summary: { praise: 2, violation: 1, other: 0 },
    recent: [
      { id: 'b1', behavior: '课堂发言积极', category: 'praise', date: today, note: '' },
      { id: 'b2', behavior: '课间奔跑', category: 'violation', date: yesterday, note: '已提醒' },
    ],
    byMonth: [{ month: thisMonth, count: 3 }],
  }
  const dowToday = ((new Date().getDay() + 6) % 7) + 1
  const dowTomorrow = (dowToday % 7) + 1
  apiState.schedule = ('schedule' in over ? over.schedule : {
    week: [
      { dayOfWeek: dowToday, items: [{ period: 1, section: '第一节', subject: '语文', teacher: '李老师' }, { period: 2, section: '第二节', subject: '数学', teacher: '王老师' }] },
      { dayOfWeek: dowTomorrow, items: [{ period: 1, section: '第一节', subject: '英语', teacher: '赵老师' }] },
    ],
    upcomingDuty: [{ name: '教室清洁', date: inTwoDays, type: 'weekly' }],
  }
  apiState.communications = ('communications' in over ? over.communications : {
    total: 2,
    recent: [{ id: 'cm1', method: '电话', date: yesterday, content: '沟通作业情况', followUp: '已改进', parentName: '张大宝', relation: '爸爸' }],
  }
  apiState.teachers = ('teachers' in over ? over.teachers : [
    { teacherId: 't1', name: '李老师', role: 'head', roleLabel: '班主任', subjects: ['语文'], phone: '13800000009' },
    { teacherId: 't2', name: '王老师', role: 'subject', roleLabel: '科任', subjects: ['数学'], phone: '' },
  ]
}

jest.mock('@/api/parent', () => ({
  getParentMe: jest.fn(() => Promise.resolve(apiState.me)),
  getParentNotices: jest.fn(() => Promise.resolve(apiState.notices)),
  getParentExams: jest.fn(() => Promise.resolve(apiState.exams)),
  getParentHomework: jest.fn(() => Promise.resolve(apiState.homework)),
  getParentAttendance: jest.fn(() => Promise.resolve(apiState.attendance)),
  getParentBehavior: jest.fn(() => Promise.resolve(apiState.behavior)),
  getParentSchedule: jest.fn(() => Promise.resolve(apiState.schedule)),
  getParentCommunications: jest.fn(() => Promise.resolve(apiState.communications)),
  getParentTeachers: jest.fn(() => Promise.resolve(apiState.teachers)),
  switchStudent: jest.fn(() => Promise.resolve({ token: 't' })),
  changeParentPassword: jest.fn(() => Promise.resolve({ ok: true })),
  submitStudentUpdateRequest: jest.fn(() => Promise.resolve({ ok: true })),
  listStudentUpdateRequests: jest.fn(() => Promise.resolve([])),
  subscribeParentDemo: jest.fn(() => Promise.resolve({ ok: true })),
}))

let mockAuthUser: any = { role: 'parent', name: '张大宝', studentName: '张小宝' }
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() { return mockAuthUser },
    get role() { return mockAuthUser?.role },
    setAuth: jest.fn(),
    fetchMe: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
  }),
}))
jest.mock('@/stores/roleSwitch', () => ({
  useRoleSwitchStore: () => ({ parentToken: '', setTokens: jest.fn(), switchTo: jest.fn() }),
}))
jest.mock('vue-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

async function mountDashboard(over: Record<string, any> = {}) {
  resetApi(over)
  localStorage.clear()
  const w = mount(Dashboard, { attachTo: document.body })
  await flushPromises()
  return w
}

describe('UX-PAR 家长看板交互体验', () => {
  let wrapper: ReturnType<typeof mount>
  afterEach(() => wrapper?.unmount())

  it('UX-PAR-01 信息架构：今日需关注置顶且提醒可定位', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    expect(text).toContain('今日需关注')
    // 逾期作业 + 考勤预警（迟到）+ 置顶通知均在提醒中
    expect(text).toContain('作业逾期')
    expect(text).toContain('考勤预警')
    expect(text).toContain('置顶通知')
    // 今日需关注位于欢迎横幅之后、概览卡之前
    const html = wrapper.html()
    expect(html.indexOf('今日需关注')).toBeLessThan(html.indexOf('待读通知'))
  })

  it('UX-PAR-02 概览卡语义：最近考试得分率+变化、最新排名+升降', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    // 期末 460/600 = 76.7%，较期中 70% 上升 6.7%
    expect(text).toContain('76.7%')
    expect(text).toContain('+6.7%')
    // 班级排名 第5名，较上次上升3名
    expect(text).toContain('第 5 名')
    expect(text).toContain('上升 3 名')
  })

  it('UX-PAR-03 作业截止提醒：逾期红标/今天截止/完成态不误报', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    expect(text).toContain('已逾期')
    expect(text).toContain('今天截止')
    // 已批改作业不显示倒计时 chip（逾期/今天/N天后）
    const cards = wrapper.findAll('#parent-homework-section .quick-card')
    expect(cards.length).toBe(3)
    expect(cards[2].text()).not.toContain('已逾期')
    expect(cards[2].text()).not.toContain('今天截止')
    expect(cards[2].text()).not.toContain('天后截止')
  })

  it('UX-PAR-04 健康度总览：五色卡片带状态文案且可点击', async () => {
    wrapper = await mountDashboard()
    expect(wrapper.text()).toContain('孩子在校健康度总览')
    const cards = wrapper.findAll('.quick-card button')
    expect(cards.length).toBeGreaterThanOrEqual(5)
    expect(wrapper.text()).toContain('预警') // 考勤有迟到 → 红
    // 点击成绩卡滚动定位（不抛错即通过）
    const examCard = cards.find((c) => c.text().includes('成绩'))
    await examCard!.trigger('click')
  })

  it('UX-PAR-05 每周小结卡展示本周聚合数据', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    expect(text).toContain('每周小结')
    expect(text).toContain('本周打卡')
    expect(text).toContain('本周表扬')
    expect(text).toContain('作业完成率')
  })

  it('UX-PAR-06 联系老师弹窗：班主任优先且提供拨号入口', async () => {
    wrapper = await mountDashboard()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('联系老师'))
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    await flushPromises()
    const modal = wrapper.text()
    expect(modal).toContain('李老师')
    expect(modal).toContain('班主任')
    const tel = wrapper.find('a[href="tel:13800000009"]')
    expect(tel.exists()).toBe(true)
  })

  it('UX-PAR-07 成绩详情：较上次变化与各科得分率进度条', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    expect(text).toContain('总分较上次 +40 分')
    expect(text).toContain('班级排名上升 3 名')
    // 各科得分率（语文 92%、数学 62%）
    expect(text).toContain('92%')
    expect(text).toContain('62%')
    // 优弱势学科标记
    expect(text).toContain('语文')
  })

  it('UX-PAR-08 课表：今日高亮 + 明日预览 + 值日倒计时', async () => {
    wrapper = await mountDashboard()
    const text = wrapper.text()
    expect(text).toContain('今日课表')
    expect(text).toContain('明日课程预览')
    expect(text).toContain('还有 2 天')
  })

  it('UX-PAR-09 空数据：显示空态文案不崩溃', async () => {
    wrapper = await mountDashboard({ notices: [], exams: { exams: [] }, homework: [], attendance: null, behavior: null, schedule: null, communications: null, teachers: [] })
    expect(wrapper.text()).toContain('欢迎来到家长中心')
  })

  it('UX-PAR-10 加载失败：显示可点击重试提示', async () => {
    resetApi()
    const { getParentMe } = require('@/api/parent')
    getParentMe.mockRejectedValueOnce(new Error('network'))
    wrapper = mount(Dashboard, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('数据加载失败，点击重试')
  })

  it('UX-PAR-12 作业无截止日期：显示"未设置"不崩溃', async () => {
    wrapper = await mountDashboard({ homework: [{ id: 'hx', subject: '语文', title: '无截止作业', content: '内容', startDate: today, deadline: '', status: '待批改' }] })
    expect(wrapper.text()).toContain('截止：未设置')
  })

  it('UX-PAR-13 考试无排名/分数：概览卡显示"--"不崩溃', async () => {
    wrapper = await mountDashboard({ exams: { exams: [{ examId: 'e9', examName: '无分数考试', term: '上学期', date: today, subjects: [] }] } })
    const text = wrapper.text()
    expect(text).toContain('--')
    expect(text).toContain('最近考试')
  })

  it('UX-PAR-11 消息订阅引导可关闭且本地记忆', async () => {
    wrapper = await mountDashboard()
    const closeBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '不再提示')
    expect(closeBtn).toBeTruthy()
    await closeBtn!.trigger('click')
    expect(localStorage.getItem('g_parent_subscribe_dismissed')).toBe('1')
    wrapper.unmount()
    wrapper = mount(Dashboard, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.findAll('button').find((b) => b.attributes('title') === '不再提示')).toBeUndefined()
  })
})
