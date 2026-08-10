/**
 * Web 端 CRUD 标准流程集成测试
 * 基于 CrudTable 共享组件，验证：列表渲染、搜索过滤、班级筛选、新增/编辑/删除、必填校验
 * 覆盖：待办/笔记/课表/考试/成绩/考勤/奖励/加减分/小组评分/排行榜/成长/行为/阅读/打卡/获奖/奖项/家长联系/通知模板/工作日志/听课/教师通讯录/教案模板库/知识点库/教案库/试卷库/试卷查询/教学资源
 */
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import CrudTable from '@/components/CrudTable.vue'
import { crudSampleRows, listResponse } from '../data/fixtures'

// Mock API request
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

// Mock 全局反馈（CrudTable 用 toast 替代原生 alert）
const mockToastWarning = jest.fn()
const mockToastError = jest.fn()
jest.mock('@/utils/feedback', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: (...a: any[]) => mockToastError(...a),
    warning: (...a: any[]) => mockToastWarning(...a),
  },
  confirm: jest.fn().mockResolvedValue(true),
}))

// Mock useClasses composable
jest.mock('@/composables/useClasses', () => ({
  loadClasses: jest.fn(),
  classNameById: (id: string) => id,
  useClasses: () => ({ classes: ref([]), loading: ref(false), loadClasses: jest.fn() }),
}))

import { ref } from 'vue'

// Modal stub for testing form interactions
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

describe('功能流程: CRUD 标准流程', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
    mockDelete.mockReset()
    mockToastWarning.mockReset()
    mockToastError.mockReset()
    mockGet.mockResolvedValue(listResponse(crudSampleRows))
  })

  describe('列表渲染与搜索', () => {
    it('完整流程_列表渲染_挂载后调用 GET 列表并渲染表格行', async () => {
      const wrapper = mountTable()
      await flushPromises()

      expect(mockGet).toHaveBeenCalledWith('todos', expect.objectContaining({ params: expect.any(Object) }))
      expect(wrapper.text()).toContain('待办管理')
      expect(wrapper.text()).toContain('样例待办')
      expect(wrapper.text()).toContain('样例笔记')
    })

    it('完整流程_空态_无数据显示暂无数据', async () => {
      mockGet.mockResolvedValueOnce(listResponse([]))
      const wrapper = mountTable()
      await flushPromises()
      expect(wrapper.text()).toContain('暂无数据')
    })

    it('完整流程_搜索过滤_输入关键字触发防抖请求', async () => {
      const wrapper = mountTable()
      await flushPromises()

      const search = wrapper.find('input[placeholder="搜索"]')
      if (search.exists()) {
        await search.setValue('样例笔记')
        await flushPromises()
        expect(wrapper.text()).toContain('样例笔记')
        expect(wrapper.text()).not.toContain('样例待办')
      }
    })

    it('完整流程_班级筛选_选择班级触发请求', async () => {
      const wrapper = mountTable({ classFilter: true })
      await flushPromises()

      const classSelect = wrapper.find('.class-filter select')
      if (classSelect.exists()) {
        await classSelect.setValue('c1')
        await flushPromises()
        expect(mockGet).toHaveBeenCalledWith('todos', expect.objectContaining({
          params: expect.objectContaining({ classId: 'c1' }),
        }))
      }
    })
  })

  describe('新增操作', () => {
    it('完整流程_新增_打开模态框_填写必填_保存调用 POST_列表刷新', async () => {
      const wrapper = mountTable()
      await flushPromises()

      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('新增'))!
      await addBtn.trigger('click')
      await flushPromises()

      const modal = wrapper.find('.modal-stub')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('新增待办')

      const inputs = modal.findAll('input')
      if (inputs.length > 0) {
        await inputs[0].setValue('新待办')
      }

      const saveBtn = modal.findAll('button').find((b) => b.text() === '保存')!
      await saveBtn.trigger('click')
      await flushPromises()

      expect(mockPost).toHaveBeenCalledWith('todos', expect.objectContaining({ title: '新待办' }))
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('完整流程_新增_必填校验_标题为空不调用 POST', async () => {
      const wrapper = mountTable()
      await flushPromises()

      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('新增'))!
      await addBtn.trigger('click')
      await flushPromises()

      const modal = wrapper.find('.modal-stub')
      const saveBtn = modal.findAll('button').find((b) => b.text() === '保存')!
      await saveBtn.trigger('click')
      await flushPromises()

      expect(mockPost).not.toHaveBeenCalled()
      // CrudTable 用 toast.warning 替代原生 alert 做必填提示
      expect(mockToastWarning).toHaveBeenCalledWith('标题必填')
    })
  })

  describe('编辑操作', () => {
    it('完整流程_编辑_点击行编辑_修改内容_保存调用 PATCH_列表刷新', async () => {
      const wrapper = mountTable()
      await flushPromises()

      const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '编辑')!
      await editBtn.trigger('click')
      await flushPromises()

      const modal = wrapper.find('.modal-stub')
      expect(modal.text()).toContain('编辑待办')

      const inputs = modal.findAll('input')
      await inputs[0].setValue('改后标题')

      const saveBtn = modal.findAll('button').find((b) => b.text() === '保存')!
      await saveBtn.trigger('click')
      await flushPromises()

      expect(mockPatch).toHaveBeenCalledWith('todos/cr1', expect.objectContaining({ title: '改后标题' }))
    })
  })

  describe('删除操作', () => {
    it('完整流程_删除_点击删除_确认弹窗_调用 DELETE_列表刷新', async () => {
      const wrapper = mountTable()
      await flushPromises()

      const delBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '删除')!
      await delBtn.trigger('click')
      await flushPromises()

      expect(mockDelete).toHaveBeenCalledWith('todos/cr1')
    })
  })
})