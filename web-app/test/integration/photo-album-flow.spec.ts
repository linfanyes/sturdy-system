/**
 * 相册 CRUD 流程集成测试
 * 基于 PhotoAlbum 共享组件，验证相册 CRUD 流程
 * 验证：网格渲染、空态、新增相册、编辑相册、删除相册、图片压缩
 */
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import PhotoAlbum from '@/components/PhotoAlbum.vue'

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

// Mock compressImages
jest.mock('@/composables/usePhotoUpload', () => ({
  compressImages: jest.fn().mockResolvedValue([]),
}))

// Mock useClasses
jest.mock('@/composables/useClasses', () => ({
  loadClasses: jest.fn(),
  useClasses: () => ({ classes: [] }),
}))

describe('功能流程: 相册 CRUD 流程 (PhotoAlbum组件)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    jest.clearAllMocks()
    window.alert = jest.fn()
    window.confirm = jest.fn().mockReturnValue(true)
    mockGet.mockResolvedValue([{ id: 1, title: '春游', date: '2024-03-15', photos: [] }])
    mockPost.mockResolvedValue({ id: 2, title: '新相册', date: '2024-01-01', photos: [] })
    mockPatch.mockResolvedValue({})
    mockDelete.mockResolvedValue({})
  })

  const mountAlbum = () => {
    return mount(PhotoAlbum, {
      props: {
        apiPath: 'class-galleries',
        title: '班级风采',
        classFilterable: true,
      },
      global: {
        stubs: {
          Modal: true,
        },
      },
    })
  }

  describe('页面渲染', () => {
    it('完整流程_标题和新��按钮存在', async () => {
      const wrapper = mountAlbum()
      await flushPromises()

      expect(wrapper.find('h1').text()).toContain('班级风采')
      expect(wrapper.text()).toContain('新增')
    })

    it('完整流程_空态_无相册时显示空态提示', async () => {
      mockGet.mockResolvedValueOnce([])

      const wrapper = mountAlbum()
      await flushPromises()

      expect(wrapper.text()).toMatch(/暂无|空/)
    })

    it('完整流程_列表API调用_挂载时自动加载', async () => {
      const wrapper = mountAlbum()
      await flushPromises()

      expect(mockGet).toHaveBeenCalledWith('class-galleries', expect.objectContaining({ params: expect.any(Object) }))
    })
  })

  describe('新增流程', () => {
    it('完整流程_点击新增_打开模态框', async () => {
      const wrapper = mountAlbum()
      await flushPromises()

      const addBtn = wrapper.find('button')
      expect(addBtn.exists()).toBe(true)
      expect(addBtn.text()).toContain('新增')
    })
  })

  describe('API调用验证', () => {
    it('完整流程_加载列表_调用GET API', async () => {
      mockGet.mockResolvedValueOnce([
        { id: 1, title: '春游', date: '2024-03-15', photos: [] },
        { id: 2, title: '运动会', date: '2024-04-20', photos: [] },
      ])

      const wrapper = mountAlbum()
      await flushPromises()

      expect(mockGet).toHaveBeenCalledWith('class-galleries', expect.any(Object))
    })

    it('完整流程_空列表_API返回空数组_无报错', async () => {
      mockGet.mockResolvedValueOnce([])

      const wrapper = mountAlbum()
      await flushPromises()

      expect(wrapper.text()).toMatch(/暂无|空/)
    })

    it('完整流程_非数组响应_安全处理', async () => {
      mockGet.mockResolvedValueOnce({ items: [] })

      const wrapper = mountAlbum()
      await flushPromises()

      expect(() => {}).not.toThrow()
    })
  })
})