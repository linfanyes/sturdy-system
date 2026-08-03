/**
 * 服务商预设 + 模型列表查询（OpenAI 兼容 /models 接口）。
 *
 * 与小程序 `pages/config/config.vue` 的 PROVIDER_PRESETS 保持一致：
 *   阿里百炼（通义千问）/ DeepSeek / 智谱GLM / 自定义。
 *
 * 模型列表优先「实时」查询各服务商接口，失败（网络错误 / 非 2xx / 空列表）
 * 则回退到下列默认预设，保证配置页始终可用。
 */

import net from 'node:net'

export type ModelKind = 'text' | 'vision' | 'image' | 'video'

export interface ProviderPreset {
  baseUrl: string
  textModels: string[]
  visionModels: string[]
  imageModels: string[]
  videoModels: string[]
}

/** 服务商预设（与小程序对齐）。切换服务商时自动填充接口地址与默认模型。 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  '阿里百炼（通义千问）': {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    imageModels: [],
    videoModels: [],
  },
  DeepSeek: {
    baseUrl: 'https://api.deepseek.com/v1',
    textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    visionModels: ['deepseek-v4-pro'],
    imageModels: [],
    videoModels: [],
  },
  '智谱GLM': {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    textModels: ['GLM-4.7-Flash'],
    visionModels: ['GLM-4.6V-Flash'],
    imageModels: ['GLM-4.6V-Flash'],
    videoModels: ['CogVideoX-Flash'],
  },
  '自定义': {
    baseUrl: '',
    textModels: [],
    visionModels: [],
    imageModels: [],
    videoModels: [],
  },
}

export const PROVIDER_NAMES = Object.keys(PROVIDER_PRESETS)

/** 根据接口地址反查服务商预设名（用于「自定义」之外的自动识别）。 */
export function detectProvider(baseUrl?: string): string {
  if (baseUrl) {
    if (baseUrl.includes('dashscope.aliyuncs.com') || baseUrl.includes('maas.aliyuncs.com'))
      return '阿里百炼（通义千问）'
    if (baseUrl.includes('api.deepseek.com')) return 'DeepSeek'
    if (baseUrl.includes('open.bigmodel.cn')) return '智谱GLM'
  }
  return '自定义'
}

/**
 * 依据模型 id 推断能力分类（OpenAI 兼容列表只给扁平 id，不保证带能力标记）。
 * 顺序：图像 > 视频 > 视觉 > 文本（默认）。
 */
export function categorizeModel(id: string): ModelKind {
  const s = (id || '').toLowerCase()
  if (/(flux|wan|imagen|dall|stable-diffusion|image|作图|绘图|生图|绘画|cogview|draw|paint)/.test(s))
    return 'image'
  if (/(video|cogvideo|sora|kling|可灵|runway|文生视频)/.test(s)) return 'video'
  if (/(vl|vision|视觉|多模态|gemini|claude|gpt-4o|gpt-4v|glm-[0-9.]*v)/.test(s)) return 'vision'
  return 'text'
}

export interface ProviderModelsResult {
  provider: string
  /** live = 实时查询成功；fallback = 接口不可达，使用预设默认 */
  source: 'live' | 'fallback'
  textModels: string[]
  visionModels: string[]
  imageModels: string[]
  videoModels: string[]
}

export interface FetchProviderModelsOptions {
  provider?: string
  baseUrl?: string
  apiKey?: string
  /** 超时毫秒，默认 8000 */
  timeoutMs?: number
}

function normalizeBaseUrl(u?: string): string {
  if (!u) return ''
  return u.replace(/\/+$/, '')
}

function dedupeSort(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function fallbackResult(provider: string): ProviderModelsResult {
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS['自定义']
  return {
    provider,
    source: 'fallback',
    textModels: preset.textModels,
    visionModels: preset.visionModels,
    imageModels: preset.imageModels,
    videoModels: preset.videoModels,
  }
}

/**
 * SSRF 防护：仅允许 https 公网地址，拒绝私网 / 回环 / 链路本地 / 云元数据 / 非法 IP。
 * 用于校验客户端或服务端传入的 baseUrl，防止服务端 fetch 探测内网与云元数据。
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // 链路本地 / 云元数据 169.254.169.254
  if (a >= 224) return true // 组播 / 保留
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

export function isSafeHttpUrl(url?: string): boolean {
  if (!url) return false
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local'))
    return false
  if (net.isIP(host) === 6) return false // 拒绝 IPv6 字面量（服务商均为 IPv4 域名）
  if (net.isIP(host) === 4 && isPrivateOrReservedIpv4(host)) return false
  return true
}

/**
 * 实时查询服务商模型列表。
 * - 优先使用传入 baseUrl/apiKey；缺失则回退预设（自定义除外）。
 * - 调用 `${baseUrl}/models`（OpenAI 兼容），Bearer 鉴权。
 * - 解析 data[].id，按能力分类；某类为空时用预设补全该类，避免下拉为空。
 * - 任何失败均回退预设，保证配置页始终可操作。
 */
export async function fetchProviderModels(
  opts: FetchProviderModelsOptions,
): Promise<ProviderModelsResult> {
  const provider =
    opts.provider && PROVIDER_PRESETS[opts.provider]
      ? opts.provider
      : detectProvider(opts.baseUrl)
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS['自定义']
  const baseUrl = normalizeBaseUrl(opts.baseUrl) || normalizeBaseUrl(preset.baseUrl)

  // SSRF 防护：仅允许 https 公网地址，否则直接回退预设（不发起服务端请求）
  if (!baseUrl || !isSafeHttpUrl(baseUrl)) return fallbackResult(provider)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 8000)
    let json: any
    try {
      const resp = await fetch(`${baseUrl}/models`, {
        headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
        signal: controller.signal,
        redirect: 'error', // 禁止跟随重定向，防止重定向到内网造成 SSRF
      })
      if (!resp.ok) return fallbackResult(provider)
      json = await resp.json()
    } finally {
      clearTimeout(timer)
    }

    const list: any[] = Array.isArray(json?.data) ? json.data : []
    if (!list.length) return fallbackResult(provider)

    const text: string[] = []
    const vision: string[] = []
    const image: string[] = []
    const video: string[] = []
    for (const m of list) {
      const id = m?.id || m?.name
      if (!id) continue
      const kind = categorizeModel(id)
      if (kind === 'vision') vision.push(id)
      else if (kind === 'image') image.push(id)
      else if (kind === 'video') video.push(id)
      else text.push(id)
    }

    return {
      provider,
      source: 'live',
      textModels: text.length ? dedupeSort(text) : preset.textModels,
      visionModels: vision.length ? dedupeSort(vision) : preset.visionModels,
      imageModels: image.length ? dedupeSort(image) : preset.imageModels,
      videoModels: video.length ? dedupeSort(video) : preset.videoModels,
    }
  } catch {
    return fallbackResult(provider)
  }
}
