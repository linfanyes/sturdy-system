/**
 * 交互体验测试：班级成员页 · 家长功能包管理（班主任配置家长可见功能）
 * 覆盖：班主任可见管理 UI、跟随默认/自定义勾选切换、保存调用、非班主任只读。
 */
import { mount, flushPromises } from '@vue/test-utils'
import ClassMembers from '@/views/classes/ClassMembers.vue'

jest.mock('lucide-vue-next', () => new Proxy({}, { get: () => ({ template: '<span class="icon" />' }) }))

/* ---------- 可控的 API mock ---------- */
const apiState: Record<string, any> = {}
const mocks = {
  listClassMembers: jest.fn(() => Promise.resolve(apiState.members)),
  listTeachers: jest.fn(() => Promise.resolve([])),
  updateClassSubjects: jest.fn(() => Promise.resolve({ ok: true })),
  getClassParentFeatures: jest.fn(() => Promise.resolve(apiState.pf)),
  updateClassParentFeatures: jest.fn(() => Promise.resolve({ ok: true, features: apiState.pfNext })),
}

jest.mock('@/api/teacher', () => ({
  listClassMembers: (...a: any[]) => mocks.listClassMembers(...a),
  listTeachers: (...a: any[]) => mocks.listTeachers(...a),
  updateClassSubjects: (...a: any[]) => mocks.updateClassSubjects(...a),
  getClassParentFeatures: (...a: any[]) => mocks.getClassParentFeatures(...a),
  updateClassParentFeatures: (...a: any[]) => mocks.updateClassParentFeatures(...a),
}))

// 注意：ES module import 会被提升到文件顶部，因此 mock factory 内不可引用外部 const（触发 TDZ），
// 班级数据直接内联在 factory 中。
jest.mock('@/composables/useClasses', () => {
  const { ref } = require('vue')
  const classes = ref([
    { id: 'c1', teacherId: 't1', name: '一年级(1)班', grade: '一年级', classNo: '1', headTeacher: '李老师', term: '上学期', subjects: ['语文', '数学'], createdAt: '2026-01-01' },
    { id: 'c2', teacherId: 't9', name: '二年级(2)班', grade: '二年级', classNo: '2', headTeacher: '王老师', term: '上学期', subjects: [], createdAt: '2026-01-01' },
  ])
  return {
    loadClasses: jest.fn(() => Promise.resolve(classes.value)),
    useClasses: () => ({ classes, loading: ref(false), loadClasses: jest.fn(() => Promise.resolve(classes.value)) }),
  }
})

let mockAuthUser: any = { id: 't1', role: 'teacher', name: '李老师' }
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ get user() { return mockAuthUser } }),
}))
jest.mock('@/utils/feedback', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

function resetApi() {
  apiState.members = [
    { id: 'm1', teacherId: 't1', teacherName: '李老师', role: 'head', subjects: ['语文', '数学'], term: '上学期', className: '一年级(1)班' },
    { id: 'm2', teacherId: 't2', teacherName: '王老师', role: 'subject', subjects: ['数学'], term: '上学期', className: '一年级(1)班' },
  ]
  apiState.pf = { configured: false, features: null, options: [{ key: 'grades', label: '成绩管理' }, { key: 'homework', label: '作业' }, { key: 'notices', label: '公告' }] }
  apiState.pfNext = null
  mocks.getClassParentFeatures.mockClear()
  mocks.updateClassParentFeatures.mockClear()
}

/** 页面还有「本学期课程设置」的保存按钮，「家长功能包管理」的保存按钮是最后一个 */
function pfSaveBtn(w: ReturnType<typeof mount>) {
  const btns = w.findAll('button').filter((b) => b.text().includes('保存'))
  return btns[btns.length - 1]
}

describe('班级成员 · 家长功能包管理（班主任）', () => {
  let wrapper: ReturnType<typeof mount>
  afterEach(() => wrapper?.unmount())

  it('PC-PF-01 班主任可见「家长功能包管理」，未配置时默认「跟随默认」', async () => {
    resetApi()
    mockAuthUser = { id: 't1', role: 'teacher', name: '李老师' }
    wrapper = mount(ClassMembers, { attachTo: document.body })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('家长功能包管理')
    expect(text).toContain('跟随默认')
    expect(text).toContain('自定义勾选')
    expect(text).toContain('当前为「跟随默认」')
    // 保存按钮存在（班主任可保存）
    expect(wrapper.findAll('button').some((b) => b.text().includes('保存'))).toBe(true)
    // 家长功能包选项仅在自定义模式展示
    expect(text).not.toContain('成绩管理')
  })

  it('PC-PF-02 切换「自定义勾选」并保存：调用更新接口并提示已保存', async () => {
    resetApi()
    mockAuthUser = { id: 't1', role: 'teacher', name: '李老师' }
    wrapper = mount(ClassMembers, { attachTo: document.body })
    await flushPromises()

    const customBtn = wrapper.findAll('button').find((b) => b.text().includes('自定义勾选'))!
    await customBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('成绩管理')
    expect(wrapper.text()).toContain('已勾选 0 项')

    // 勾选「成绩管理」+「作业」
    const gradeOpt = wrapper.findAll('button').find((b) => b.text().includes('成绩管理'))!
    await gradeOpt.trigger('click')
    const hwOpt = wrapper.findAll('button').find((b) => b.text().includes('作业'))!
    await hwOpt.trigger('click')
    expect(wrapper.text()).toContain('已勾选 2 项')

    const saveBtn = pfSaveBtn(wrapper)
    await saveBtn.trigger('click')
    await flushPromises()
    expect(mocks.updateClassParentFeatures).toHaveBeenCalledWith('c1', ['grades', 'homework'])
    expect(wrapper.text()).toContain('已保存，家长可见 2 项功能')
  })

  it('PC-PF-03 恢复「跟随默认」：以 features=null 调用更新接口', async () => {
    resetApi()
    apiState.pf = { configured: true, features: ['grades'], options: [{ key: 'grades', label: '成绩管理' }] }
    mockAuthUser = { id: 't1', role: 'teacher', name: '李老师' }
    wrapper = mount(ClassMembers, { attachTo: document.body })
    await flushPromises()
    // 已配置 → 进入自定义模式且预勾选
    expect(wrapper.text()).toContain('成绩管理')
    expect(wrapper.text()).toContain('已勾选 1 项')

    const defaultBtn = wrapper.findAll('button').find((b) => b.text().includes('跟随默认'))!
    await defaultBtn.trigger('click')
    await flushPromises()

    const saveBtn = pfSaveBtn(wrapper)
    await saveBtn.trigger('click')
    await flushPromises()
    expect(mocks.updateClassParentFeatures).toHaveBeenCalledWith('c1', null)
    expect(wrapper.text()).toContain('已恢复跟随默认')
  })

  it('PC-PF-04 非班主任只读：显示提示且保存/切换按钮不可用', async () => {
    resetApi()
    // 当前用户是科任（非该班班主任），但属于 c1 班级成员可查看
    mockAuthUser = { id: 't2', role: 'teacher', name: '王老师' }
    wrapper = mount(ClassMembers, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('家长功能包管理')
    expect(wrapper.text()).toContain('仅班主任可配置家长功能包')
    // 切换按钮被禁用
    const customBtn = wrapper.findAll('button').find((b) => b.text().includes('自定义勾选'))!
    expect((customBtn.element as HTMLButtonElement).disabled).toBe(true)
    // 无保存按钮
    expect(wrapper.findAll('button').some((b) => b.text().includes('保存'))).toBe(false)
  })
})
