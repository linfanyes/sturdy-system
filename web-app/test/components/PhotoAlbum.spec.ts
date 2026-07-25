import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import PhotoAlbum from '@/components/PhotoAlbum.vue'
import { classes as mockClasses, listResponse } from '../data/fixtures'

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
jest.mock('@/composables/usePhotoUpload', () => ({
  compressImages: jest.fn(() => Promise.resolve([])),
  readFileAsDataURL: jest.fn(),
}))

const ModalStub = {
  props: ['modelValue', 'title'],
  template: `<div class="modal-stub"><div class="modal-title">{{ title }}</div><slot /><slot name="footer" /></div>`,
}

const albums = [
  { id: 'a1', title: '春游', date: '2026-07-01', description: '快乐的一天', classId: 'c1', photos: ['data:image/png;base64,xxx'] },
]

function mountAlbum(props: Record<string, any> = {}) {
  return mount(PhotoAlbum, {
    props: { apiPath: 'class-galleries', title: '班级风采', classFilterable: true, ...props },
    global: { stubs: { Modal: ModalStub } },
    attachTo: document.body,
  })
}

describe('PhotoAlbum 通用相册组件（覆盖班级活动/风采/我的相册）', () => {
  beforeEach(() => {
    ;[mockGet, mockPost, mockPatch, mockDelete].forEach((m) => m.mockReset())
    mockGet.mockResolvedValue(listResponse(albums))
  })

  it('挂载后渲染相册网格与照片计数', async () => {
    const wrapper = mountAlbum()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledWith('class-galleries', expect.objectContaining({ params: expect.any(Object) }))
    expect(wrapper.text()).toContain('春游')
    expect(wrapper.text()).toContain('1 张')
  })

  it('无数据时显示空态', async () => {
    mockGet.mockResolvedValue(listResponse([]))
    const wrapper = mountAlbum()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无照片')
  })

  it('新增：标题+班级必填，保存调用 POST', async () => {
    const wrapper = mountAlbum()
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text().includes('新增'))!.trigger('click')
    await nextTick()
    const modal = wrapper.find('.modal-stub')
    expect(modal.exists()).toBe(true)
    // 未填标题直接保存 -> alert 且不 POST
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPost).not.toHaveBeenCalled()
    expect(global.alert).toHaveBeenCalledWith('请填写标题')

    // 填标题，选择班级（modal 内第一个 select 为班级）
    const titleInput = modal.findAll('input')[0]
    await titleInput.setValue('班级合影')
    const classSelect = modal.findAll('select')[0]
    await classSelect.setValue('c1')
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPost).toHaveBeenCalledWith(
      'class-galleries',
      expect.objectContaining({ title: '班级合影', classId: 'c1' }),
    )
  })

  it('编辑已有相册并保存调用 PATCH', async () => {
    const wrapper = mountAlbum()
    await flushPromises()
    const editBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '编辑')!
    await editBtn.trigger('click')
    await nextTick()
    const modal = wrapper.find('.modal-stub')
    const titleInput = modal.findAll('input')[0]
    await titleInput.setValue('改后标题')
    await modal.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()
    expect(mockPatch).toHaveBeenCalledWith('class-galleries/a1', expect.objectContaining({ title: '改后标题' }))
  })

  it('删除调用 DELETE', async () => {
    const wrapper = mountAlbum()
    await flushPromises()
    const delBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '删除')!
    await delBtn.trigger('click')
    await flushPromises()
    expect(mockDelete).toHaveBeenCalledWith('class-galleries/a1')
  })
})
