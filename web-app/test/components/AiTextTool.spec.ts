import { mount, flushPromises } from '@vue/test-utils'
import AiTextTool from '@/components/AiTextTool.vue'

const mockAiChatSync = jest.fn()
const mockPost = jest.fn()
jest.mock('@/api/teacher', () => ({
  __esModule: true,
  aiChatSync: (...a: any[]) => mockAiChatSync(...a),
}))
jest.mock('@/api/request', () => ({
  __esModule: true,
  default: { post: (...a: any[]) => mockPost(...a), get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

// AiTextTool 用 toast 替代原生 alert 做空输入提示
const mockToastWarning = jest.fn()
jest.mock('@/utils/feedback', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warning: (...a: any[]) => mockToastWarning(...a),
  },
  confirm: jest.fn().mockResolvedValue(true),
}))

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
})

const fields = [
  { key: 'topic', label: '主题' },
  { key: 'grade', label: '年级', options: ['一年级', '二年级'] },
]
const buildPrompt = (f: Record<string, string>) => (f.topic ? `请生成关于${f.topic}的内容` : '')

describe('AiTextTool 通用 AI 文本工具（覆盖全部 AI 工具页）', () => {
  beforeEach(() => {
    mockAiChatSync.mockReset()
    mockPost.mockReset()
    mockToastWarning.mockReset()
    mockAiChatSync.mockResolvedValue({ content: 'AI 生成内容' })
    ;(navigator.clipboard.writeText as jest.Mock).mockClear()
  })

  it('渲染标题与表单字段', () => {
    const wrapper = mount(AiTextTool, {
      props: { title: '翻译', fields, buildPrompt },
    })
    expect(wrapper.text()).toContain('翻译')
    expect(wrapper.text()).toContain('主题')
    expect(wrapper.text()).toContain('年级')
  })

  it('点击生成调用 aiChatSync 并展示结果', async () => {
    const wrapper = mount(AiTextTool, { props: { title: '翻译', fields, buildPrompt } })
    await wrapper.find('textarea, input').setValue('春天') // 第一个字段
    await wrapper.findAll('button').find((b) => b.text() === '生成')!.trigger('click')
    await flushPromises()
    expect(mockAiChatSync).toHaveBeenCalledWith([{ role: 'user', content: expect.stringContaining('春天') }])
    expect(wrapper.text()).toContain('AI 生成内容')
  })

  it('空内容生成时弹窗提示且不调用 AI', async () => {
    const wrapper = mount(AiTextTool, { props: { title: '翻译', fields, buildPrompt } })
    await wrapper.findAll('button').find((b) => b.text() === '生成')!.trigger('click')
    await flushPromises()
    expect(mockAiChatSync).not.toHaveBeenCalled()
    expect(mockToastWarning).toHaveBeenCalledWith('请填写必要内容')
  })

  it('有 savePath 时显示保存按钮，点击调用 POST', async () => {
    const wrapper = mount(AiTextTool, {
      props: {
        title: '教育论文',
        fields,
        buildPrompt,
        savePath: 'notes',
        buildSavePayload: (f: Record<string, string>, r: string) => ({ title: f.topic, content: r }),
      },
    })
    await wrapper.find('textarea, input').setValue('春天')
    await wrapper.findAll('button').find((b) => b.text() === '生成')!.trigger('click')
    await flushPromises()
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === '保存')
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')
    await flushPromises()
    expect(mockPost).toHaveBeenCalledWith('notes', { title: '春天', content: 'AI 生成内容' })
  })

  it('无 savePath 时不显示保存按钮', () => {
    const wrapper = mount(AiTextTool, { props: { title: '翻译', fields, buildPrompt } })
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === '保存')
    expect(saveBtn).toBeFalsy()
  })

  it('点击复制调用 clipboard.writeText', async () => {
    const wrapper = mount(AiTextTool, { props: { title: '翻译', fields, buildPrompt, savePath: 'notes' } })
    await wrapper.find('textarea, input').setValue('春天')
    await wrapper.findAll('button').find((b) => b.text() === '生成')!.trigger('click')
    await flushPromises()
    const copyBtn = wrapper.findAll('button').find((b) => b.text() === '复制')
    await copyBtn!.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AI 生成内容')
  })
})
