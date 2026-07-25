import {
  fetchProviderModels,
  categorizeModel,
  detectProvider,
  PROVIDER_PRESETS,
  type ModelKind,
} from '../src/config/provider-models'

/** 用假的 fetch 实现替换 global.fetch */
function mockFetch(statusOk: boolean, body: any) {
  ;(global as any).fetch = jest.fn(async () => ({
    ok: statusOk,
    json: async () => body,
  }))
}

function mockFetchThrow() {
  ;(global as any).fetch = jest.fn(async () => {
    throw new Error('network down')
  })
}

describe('provider-models: categorizeModel', () => {
  const cases: Array<[string, ModelKind]> = [
    ['qwen-vl-plus', 'vision'],
    ['qwen-vl-max', 'vision'],
    ['qwen-plus', 'text'],
    ['GLM-4.6V-Flash', 'vision'],
    ['GLM-4.7-Flash', 'text'],
    ['CogVideoX-Flash', 'video'],
    ['deepseek-chat', 'text'],
    ['deepseek-reasoner', 'text'],
    ['deepseek-v4-pro', 'text'], // 不应误判为视觉（v4 不是 -v-）
    ['wanx-v1', 'image'],
    ['stable-diffusion-xl', 'image'],
  ]
  it.each(cases)('categorizeModel(%s) => %s', (id, expected) => {
    expect(categorizeModel(id)).toBe(expected)
  })
})

describe('provider-models: detectProvider', () => {
  it('识别阿里百炼', () => {
    expect(detectProvider('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBe('阿里百炼（通义千问）')
  })
  it('识别 DeepSeek', () => {
    expect(detectProvider('https://api.deepseek.com/v1')).toBe('DeepSeek')
  })
  it('识别智谱GLM', () => {
    expect(detectProvider('https://open.bigmodel.cn/api/paas/v4')).toBe('智谱GLM')
  })
  it('未知地址回退自定义', () => {
    expect(detectProvider('https://my-llm.example.com/v1')).toBe('自定义')
    expect(detectProvider('')).toBe('自定义')
  })
})

describe('provider-models: fetchProviderModels', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('实时查询成功：分类正确且空类回退预设', async () => {
    mockFetch(true, {
      data: [
        { id: 'GLM-4.7-Flash' },
        { id: 'GLM-4.6V-Flash' },
        { id: 'CogVideoX-Flash' },
        { id: 'glm-4-air' }, // 文本
      ],
    })
    const res = await fetchProviderModels({ provider: '智谱GLM', baseUrl: PROVIDER_PRESETS['智谱GLM'].baseUrl, apiKey: 'k' })
    expect(res.source).toBe('live')
    expect(res.provider).toBe('智谱GLM')
    expect(res.textModels).toContain('GLM-4.7-Flash')
    expect(res.textModels).toContain('glm-4-air')
    expect(res.visionModels).toEqual(['GLM-4.6V-Flash'])
    expect(res.videoModels).toEqual(['CogVideoX-Flash'])
    // 图像类实时为空 -> 回退预设（智谱预设 imageModels=[GLM-4.6V-Flash]）
    expect(res.imageModels).toEqual(['GLM-4.6V-Flash'])
  })

  it('接口非 2xx：回退预设默认', async () => {
    mockFetch(false, {})
    const res = await fetchProviderModels({ provider: 'DeepSeek', baseUrl: PROVIDER_PRESETS['DeepSeek'].baseUrl, apiKey: 'k' })
    expect(res.source).toBe('fallback')
    expect(res.textModels).toEqual(PROVIDER_PRESETS['DeepSeek'].textModels)
    expect(res.visionModels).toEqual(PROVIDER_PRESETS['DeepSeek'].visionModels)
  })

  it('网络异常：回退预设默认', async () => {
    mockFetchThrow()
    const res = await fetchProviderModels({ provider: '阿里百炼（通义千问）', baseUrl: PROVIDER_PRESETS['阿里百炼（通义千问）'].baseUrl, apiKey: 'k' })
    expect(res.source).toBe('fallback')
    expect(res.textModels).toEqual(PROVIDER_PRESETS['阿里百炼（通义千问）'].textModels)
  })

  it('空模型列表：回退预设默认', async () => {
    mockFetch(true, { data: [] })
    const res = await fetchProviderModels({ provider: '智谱GLM', baseUrl: PROVIDER_PRESETS['智谱GLM'].baseUrl, apiKey: 'k' })
    expect(res.source).toBe('fallback')
    expect(res.textModels).toEqual(PROVIDER_PRESETS['智谱GLM'].textModels)
  })

  it('自定义服务商 + baseUrl：实时返回则使用实时结果', async () => {
    mockFetch(true, { data: [{ id: 'my-model-a' }, { id: 'my-model-b' }] })
    const res = await fetchProviderModels({ provider: '自定义', baseUrl: 'https://my-llm.example.com/v1', apiKey: 'k' })
    expect(res.source).toBe('live')
    expect(res.textModels).toEqual(['my-model-a', 'my-model-b'])
  })

  it('无 baseUrl 且无预设：回退（自定义无预设）', async () => {
    const res = await fetchProviderModels({ provider: '自定义' })
    expect(res.source).toBe('fallback')
    expect(res.textModels).toEqual([])
  })
})
