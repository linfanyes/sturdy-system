/**
 * 统一的 AI 调用工具
 *
 * 供「翻译 / 优选试卷 / 优质教案 / 评语生成」等所有需要调用内置 AI 的功能复用,
 * 避免每个工具都重复写 fetch + SSE 解析逻辑.
 *
 * 读取 `useAIStore().settings` 中的 baseUrl / apiKey / model / temperature.
 */

import { useAIStore } from '../stores/ai'
import { AI_DEEPSEEK_BASE_URL } from './aiBase'

export type AIChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | AIChatContentPart[]
}

/**
 * 已知不支持图片 (多模态) 的模型.
 * 注意: DeepSeek 全系 (包括 deepseek-chat / deepseek-V4-Flash / deepseek-reasoner)
 * 都没有视觉能力, 即使把图片发给它也会被直接忽略, 导致「AI 看不到图」的错觉.
 */
export const NON_VISION_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek-v3',
  'deepseek-v2',
  'deepseek-v2.5',
  'deepseek-lite',
  'deepseek-coder',
  'deepseek-V4-Flash',
]

/**
 * 已知支持图片识别 (多模态) 的模型 — 正向白名单, 优先级最高.
 * 例: longcat 系列 (longcat-2.0 等) 具备视觉能力, 但名字里不含通用视觉关键词,
 * 故在此显式列出, 避免被误判为非视觉模型而遭到上传拦截.
 */
export const VISION_MODELS = [
  'longcat',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4v',
  'qwen-vl',
  'qwen2-vl',
  'qwen2.5-vl',
  'qwen3-vl',
  'qwen3-vl-plus',
  'glm-4v',
  'glm-4v-plus',
  'claude-3',
  'claude-3.5',
  'gemini',
  'doubao-vision',
  'step',
  'moonshot',
  'kimi',
]

const VISION_HINT =
  /vision|vl\b|gpt-4o|gpt-4-turbo|gpt-4v|qwen-vl|qwen2-vl|qwen2\.5-vl|qwen3-vl|glm-4v|glm-4v-plus|step|claude|gemini|doubao|multimodal|abab|grok|moonshot|kimi|ernie.*vision|screenshot|pixtral|llava|internvl|longcat|minimax|hunyuan-vision|qwen-vision/i

/** 判断模型是否支持图片识别 (多模态) */
export function isVisionModel(model?: string): boolean {
  const m = (model || '').toLowerCase().trim()
  if (!m) return false
  // 已知非视觉模型 -> 直接否定 (即使名字里碰巧含某些关键词)
  if (NON_VISION_MODELS.some((x) => m.includes(x))) return false
  // 已知视觉模型白名单 -> 直接肯定
  if (VISION_MODELS.some((x) => m.includes(x))) return true
  return VISION_HINT.test(m)
}

/** 给用户的、支持图片识别的模型示例 (用于设置页 / 上传图片时的提示) */
export const VISION_MODEL_EXAMPLES = [
  'qwen3-vl-plus',
  'longcat-2.0',
  'gpt-4o',
  'qwen-vl-max',
  'glm-4v-plus',
  'doubao-vision',
  'claude-3-opus',
  'gemini-1.5-pro',
]

/** AI 调用相关的业务错误 (带中文提示, 便于 UI 直接 toast) */
export class AIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIError'
  }
}

/** 判断消息内容是否包含图片附件 */
function messageHasImage(content: string | AIChatContentPart[] | undefined): boolean {
  if (!content) return false
  if (typeof content === 'string') return false
  if (!Array.isArray(content)) return false
  return content.some((p) => p && ((p as any).type === 'image_url' || (p as any).type === 'image'))
}

/** 根据消息自动判断应使用文本模型还是多模态模型 */
function resolveModelType(
  messages: AIChatMessage[],
  requested?: 'auto' | 'text' | 'vision',
): 'text' | 'vision' {
  if (requested === 'text') return 'text'
  if (requested === 'vision') return 'vision'
  return messages.some((m) => messageHasImage(m.content)) ? 'vision' : 'text'
}

/**
 * 调用 AI 对话补全接口.
 *
 * @param opts.messages 消息列表
 * @param opts.temperature 温度 (默认 0.8)
 * @param opts.stream 是否流式 (默认 true). 流式时通过 onDelta 回调增量返回, 并最终返回全文.
 * @param opts.signal 取消信号
 * @param opts.onDelta 流式增量回调
 * @param opts.modelType 模型类型：auto 自动根据消息是否含图切换；text 强制文本模型；vision 强制多模态模型
 * @returns 完整回复文本
 */
export async function aiChat(opts: {
  messages: AIChatMessage[]
  temperature?: number
  stream?: boolean
  signal?: AbortSignal
  onDelta?: (text: string) => void
  modelType?: 'auto' | 'text' | 'vision'
}): Promise<string> {
  const ai = useAIStore()
  const settings = ai.settings

  if (!settings.apiKey) {
    throw new AIError('请先在「AI 对话」右上角设置中配置 API Key')
  }

  const type = resolveModelType(opts.messages, opts.modelType)
  const model =
    type === 'vision'
      ? settings.visionModel || settings.textModel || 'qwen3-vl-plus'
      : settings.textModel || settings.visionModel || 'qwen3.7-plus'

  const baseUrl = (settings.baseUrl || AI_DEEPSEEK_BASE_URL).replace(/\/$/, '')
  const useStream = opts.stream !== false

  const payload = {
    model,
    temperature: opts.temperature ?? 0.8,
    stream: useStream,
    messages: opts.messages,
  }

  let resp: Response
  try {
    resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + settings.apiKey,
      },
      body: JSON.stringify(payload),
      signal: opts.signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e
    throw new AIError('网络请求失败：' + (e?.message || '无法连接到 AI 服务'))
  }

  if (!resp.ok) {
    let detail = ''
    try {
      detail = (await resp.text()).slice(0, 500)
    } catch {
      /* noop */
    }
    throw new AIError(`AI 请求失败 (${resp.status})${detail ? '：' + detail : ''}`)
  }

  // 非流式: 直接解析 JSON
  if (!useStream) {
    try {
      const data = await resp.json()
      return data?.choices?.[0]?.message?.content || ''
    } catch {
      throw new AIError('AI 返回的响应无法解析')
    }
  }

  // 流式: 解析 SSE
  const reader = resp.body?.getReader()
  if (!reader) throw new AIError('浏览器不支持流式响应')
  const decoder = new TextDecoder('utf-8')
  let acc = ''
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data:')) continue
        const json = trimmed.slice(5).trim()
        if (!json) continue
        try {
          const obj = JSON.parse(json)
          const delta = obj?.choices?.[0]?.delta?.content || ''
          if (delta) {
            acc += delta
            opts.onDelta?.(delta)
          }
        } catch {
          /* 忽略解析错误 */
        }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e
    throw new AIError('读取 AI 响应时出错：' + (e?.message || '未知错误'))
  }
  return acc
}
