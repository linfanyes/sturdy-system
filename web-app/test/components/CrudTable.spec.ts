import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import CrudTable from '@/components/CrudTable.vue'
import { classes as mockClasses, crudSampleRows, listResponse } from '../data/fixtures'

/** 受控的 request mock（CrudTable 内部用动态 import('@/api/request')） */
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()
const mockDelete = jest.fn()
jest.mock('@/api/request', () => ({
  __esModule: true,
  default: {
    get: (...a: any[]) => mockGet(...a),
    post: (...a: any[]) => mockPost(...a),
    patch: (...a: any[]) => mockPatch(...a),
    delete: (...a: any[]) => mockDelete(...a),
  },
}))
jest.mock('@/composables/useClasses', () => ({
  loadClasses: jest.fn(),
  classNameById: (id: string) => id,
  useClasses: () => ({ classes: ref(mockClasses), loading: ref(false), loadClasses: jest.fn() }),
}))

// Modal 改为内联 stub，便于在 wrapper 内查询表单
const ModalStub = {
  props: ['modelValue', 'title'],
  template: `<div class="modal-stub"><div class="modal-title">{{ title }}</div><slot /><slot name="footer" /></div>`,
}

const fields = [
  { key: 'title', label: '标题', required: true },
  { key: 'content', label: '内容' },
  { key: 'classId', label: '班级', type: 'select' as const },
]

function mountTable() {
  return mount(CrudTable, {
    props: { apiPath: 'todos', title: '待办', fields },
    global: { stubs: { Modal: ModalStub } },
    attachTo: document.body,
  })
}

describe('CrudTable 通用增删改查组件（覆盖全部 CRUD 页面）', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
    mockDelete.mockReset()
    // 默认 list 返回样例数据
    mockGet.mockResolvedValue(listResponse(crudSampleRows))
  })

  it('挂载后调用 GET 列表并渲染表格行', async () => {
    const wrapper = mountTable()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('todos', expect.objectContaining({ params: expect.any(Object) }))
    expect(wrapper.text()).toContain('待办管理')
    expect(wrapper.text()).toContain('样例待办')
    expect(wrapper.text()).toContain('样例笔记')
  })

  it('列表为空时显示空态', async () => {
    mockGet.mockResolvedValue(listResponse([]))
    const wrapper = mountTable()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无数据')
  })

  it('搜索框按关键词过滤行', async () => {
    const wrapper = mountTable()
    await flushPromises()
    const search = wrapper.find('input[placeholder="搜索"]')
    await search.setValue('样例笔记')
    await nextTick()
    expect(wrapper.text()).toContain('样例笔记')
    expect(wrapper.text()).not.toContain('样例待办')
  })

  it('点击新增打开模态框，保存调用 POST', async () => {
    const wrapper = mountTable()
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text().includes('新增'))!.trigger('click')
    await nextTick()
    const modal = wrapper.find('.modal-stub')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('新增待办')
    // 填标题（modal 内第一个 input）
    const inputs = modal.findAll('input')
    await inputs[0].setValue('新待办')
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPost).toHaveBeenCalledWith('todos', expect.objectContaining({ title: '新待办' }))
  })

  it('新增时必填校验：标题为空不调用 POST', async () => {
    const wrapper = mountTable()
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text().includes('新增'))!.trigger('click')
    await nextTick()
    const modal = wrapper.find('.modal-stub')
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPost).not.toHaveBeenCalled()
    expect(global.alert).toHaveBeenCalledWith('标题必填')
  })

  it('点击编辑打开模态框并预填，保存调用 PATCH', async () => {
    const wrapper = mountTable()
    await flushPromises()
    // 第一行的编辑按钮
    const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '编辑')!
    await editBtn.trigger('click')
    await nextTick()
    const modal = wrapper.find('.modal-stub')
    expect(modal.text()).toContain('编辑待办')
    const inputs = modal.findAll('input')
    await inputs[0].setValue('改后标题')
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPatch).toHaveBeenCalledWith('todos/cr1', expect.objectContaining({ title: '改后标题' }))
  })

  it('点击删除调用 DELETE（confirm 通过）', async () => {
    const wrapper = mountTable()
    await flushPromises()
    const delBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '删除')!
    await delBtn.trigger('click')
    await flushPromises()
    expect(mockDelete).toHaveBeenCalledWith('todos/cr1')
  })
})
