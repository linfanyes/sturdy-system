import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import SuperDashboard from '@/views/super/Dashboard.vue'
import SchoolAdminDashboard from '@/views/school-admin/Dashboard.vue'
import TeacherDashboard from '@/views/teacher/Dashboard.vue'
import ParentDashboard from '@/views/parent/Dashboard.vue'
import * as teacherApi from '@/api/teacher'
import * as parentApi from '@/api/parent'
import * as notificationApi from '@/api/notification'
import {
  schools, schoolAdmins, auditLogs, schoolAdminDashboard, classes,
  notifications, parentMe, parentNotices, parentExams, parentHomework,
} from '../data/fixtures'

let mockAuthUser: any = {}
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() { return mockAuthUser },
    get role() { return mockAuthUser?.role },
    get isLoggedIn() { return true },
    logout: jest.fn(),
    loginByUsername: jest.fn(),
  }),
}))

// 各角色依赖的 API 模块
jest.mock('@/api/admin', () => ({
  __esModule: true,
  listSchools: jest.fn(() => Promise.resolve({ total: schools.length, items: schools })),
  listSchoolAdmins: jest.fn(() => Promise.resolve({ total: schoolAdmins.length, items: schoolAdmins })),
  listAuditLogs: jest.fn(() => Promise.resolve({ items: auditLogs, total: auditLogs.length })),
}))
jest.mock('@/api/school-admin', () => ({
  __esModule: true,
  getDashboard: jest.fn(() =>
    Promise.resolve({
      totalTeachers: schoolAdminDashboard.teacherCount,
      totalClasses: schoolAdminDashboard.classCount,
      totalStudents: schoolAdminDashboard.studentCount,
      parentEnabled: 1,
      attendanceRate: 100,
      pendingHomework: 0,
      todayDate: '2026-07-25',
    }),
  ),
}))
jest.mock('@/api/teacher', () => ({
  __esModule: true,
  listMyClasses: jest.fn(() => Promise.resolve(classes)),
}))
jest.mock('@/api/notification', () => ({
  __esModule: true,
  getUnreadCount: jest.fn(() => Promise.resolve({ count: 3 })),
  listNotifications: jest.fn(() => Promise.resolve(notifications)),
}))
jest.mock('@/api/parent', () => ({
  __esModule: true,
  getParentMe: jest.fn(() => Promise.resolve(parentMe)),
  getParentNotices: jest.fn(() => Promise.resolve(parentNotices)),
  getParentExams: jest.fn(() => Promise.resolve(parentExams)),
  getParentHomework: jest.fn(() => Promise.resolve(parentHomework)),
}))

function withRole(role: string, user: any = {}) {
  mockAuthUser = { role, name: '测试', ...user }
}

describe('四角色 Dashboard 渲染（SUP-01 / SA-01 / TCH-01 / PAR-01）', () => {
  it('超管工作台：统计学校/管理员数与审计日志', async () => {
    withRole('super')
    const wrapper = mount(SuperDashboard)
    await flushPromises()
    expect(wrapper.text()).toContain('学校')
    expect(wrapper.text()).toContain('管理员')
    // 统计数字应来自 fixtures
    expect(wrapper.text()).toContain(String(schools.length))
  })

  it('校管工作台：渲染四项统计', async () => {
    withRole('school_admin')
    const wrapper = mount(SchoolAdminDashboard)
    await flushPromises()
    expect(wrapper.text()).toContain(String(schoolAdminDashboard.teacherCount))
    expect(wrapper.text()).toContain(String(schoolAdminDashboard.studentCount))
  })

  it('教师工作台：渲染未读计数与班级', async () => {
    withRole('teacher')
    const wrapper = mount(TeacherDashboard)
    await flushPromises()
    expect(wrapper.text()).toContain('当前教师')
    // 未读计数 3（来自 getUnreadCount）
    expect(wrapper.text()).toContain('3')
    // 我的班级渲染
    expect(wrapper.text()).toContain('一年级(1)班')
  })

  it('家长工作台：渲染孩子动态、公告与成绩分布柱状图', async () => {
    withRole('parent', { studentName: '张小宝' })
    const wrapper = mount(ParentDashboard)
    await flushPromises()
    expect(wrapper.text()).toContain('张小宝')
    // 班级公告渲染
    expect(wrapper.text()).toContain(parentNotices[0].title)
    // 成绩分布柱状图（v-html 生成的内联样式宽度）
    expect(wrapper.html()).toContain('width')
  })
})

describe('Dashboard 状态覆盖：加载 / 空 / 错误（PAR-STATE / TCH-STATE）', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    ;(teacherApi.listMyClasses as jest.Mock).mockResolvedValue(classes)
    ;(notificationApi.listNotifications as jest.Mock).mockResolvedValue(notifications)
    ;(parentApi.getParentNotices as jest.Mock).mockResolvedValue(parentNotices)
    ;(parentApi.getParentHomework as jest.Mock).mockResolvedValue(parentHomework)
    ;(parentApi.getParentExams as jest.Mock).mockResolvedValue(parentExams)
    ;(parentApi.getParentMe as jest.Mock).mockResolvedValue(parentMe)
  })

  describe('教师工作台', () => {
    it('加载中显示 spinner 与「加载中…」', () => {
      withRole('teacher')
      wrapper = mount(TeacherDashboard)
      // 尚未 flush：loading=true
      expect(wrapper.text()).toContain('加载中')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    it('班级为空显示空态「暂无班级」', async () => {
      withRole('teacher')
      ;(teacherApi.listMyClasses as jest.Mock).mockResolvedValue([])
      wrapper = mount(TeacherDashboard)
      await flushPromises()
      expect(wrapper.text()).toContain('暂无班级')
      expect(wrapper.text()).not.toContain('一年级')
    })

    it('班级接口异常时降级为空态且不崩溃', async () => {
      withRole('teacher')
      ;(teacherApi.listMyClasses as jest.Mock).mockRejectedValue(new Error('network'))
      wrapper = mount(TeacherDashboard)
      await flushPromises()
      expect(wrapper.text()).toContain('暂无班级')
    })

    it('通知为空时面板显示「暂无通知」', async () => {
      withRole('teacher')
      ;(notificationApi.listNotifications as jest.Mock).mockResolvedValue([])
      wrapper = mount(TeacherDashboard)
      await flushPromises()
      // 点击铃铛打开面板
      await wrapper.find('button[title="通知"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('暂无通知')
    })
  })

  describe('家长工作台', () => {
    it('加载中显示「加载中…」', () => {
      withRole('parent', { studentName: '张小宝' })
      wrapper = mount(ParentDashboard)
      expect(wrapper.text()).toContain('加载中')
    })

    it('公告/作业/成绩均为空时显示各自空态', async () => {
      withRole('parent', { studentName: '张小宝' })
      ;(parentApi.getParentNotices as jest.Mock).mockResolvedValue([])
      ;(parentApi.getParentHomework as jest.Mock).mockResolvedValue([])
      ;(parentApi.getParentExams as jest.Mock).mockResolvedValue([])
      wrapper = mount(ParentDashboard)
      await flushPromises()
      // 默认在「待办公告」页签
      expect(wrapper.text()).toContain('暂无班级公告')
      expect(wrapper.text()).toContain('暂无待完成作业')
      // 切换到「成绩查询」页签才显示成绩空态
      ;(wrapper.vm as any).tab = 'scores'
      await flushPromises()
      expect(wrapper.text()).toContain('暂无成绩数据')
    })

    it('加载失败时弹出 alert 提示且 loading 结束', async () => {
      withRole('parent', { studentName: '张小宝' })
      ;(parentApi.getParentMe as jest.Mock).mockRejectedValue(new Error('加载失败'))
      wrapper = mount(ParentDashboard)
      await flushPromises()
      expect(global.alert).toHaveBeenCalled()
      // loading 结束，不再显示加载中
      expect(wrapper.text()).not.toContain('加载中')
    })
  })
})
