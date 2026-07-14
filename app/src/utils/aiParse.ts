/**
 * AI 智能识别导入工具
 *
 * 用途: 让用户粘贴任意格式的文本 (Excel 复制粘贴、Word、聊天记录、手敲等),
 *       通过 AI 解析为符合指定 JSON Schema 的结构化数据, 供批量导入预览使用.
 *
 * 工作流程:
 *   1. 用户在弹框切换到「AI 智能识别」tab
 *   2. 粘贴文本, 点击「AI 智能识别」
 *   3. 调用用户配置好的 AI (DeepSeek 等) 解析, 流式输出 JSON
 *   4. 解析完毕, 弹框中显示预览表格 (可勾选/编辑/删除单条)
 *   5. 用户点击「确认导入」, 调用方提供的方法被回调
 *
 * 设计原则:
 *   - 强约束: 必须输出合法 JSON 数组, 单条不符 schema 时 AI 自动纠正
 *   - 健壮: 解析过程中容忍 markdown 代码块 (```json ... ```)
 *   - 复用: 调用方只需传 text + schema + onResult, 不关心具体 AI 调用细节
 *   - 复用 ai store 配置 (API Key / Model / BaseURL)
 */

import { useAIStore } from '../stores/ai'
import { AI_DASHSCOPE_BASE_URL } from './aiBase'

/** JSON Schema 简化版 (用于 system prompt 引导 AI 输出) */
export interface AISchema {
  /** 数组名 (例如 "students" / "scores" / "schedule") */
  name: string
  /** 单条字段描述: { fieldName: '中文说明' } */
  fields: Record<string, string>
  /** 示例: 一条完整的 JSON 样例, 帮 AI 理解结构 */
  example: Record<string, unknown>
  /** 补充提示, 比如 "姓名不要带学号" */
  extra?: string
}

export interface AIParseOptions {
  /** 原始文本 */
  text: string
  /** 期望输出的 JSON Schema */
  schema: AISchema
  /** 流式回调 (解析中, 每次 AI 输出新字符) */
  onProgress?: (rawText: string) => void
  /** AbortController 用于取消 */
  signal?: AbortSignal
}

export interface AIParseResult<T = Record<string, unknown>> {
  ok: boolean
  data: T[]
  raw: string
  error?: string
}

/**
 * 通用 AI 解析: 任意文本 -> 结构化数据数组
 */
export async function parseByAI<T = Record<string, unknown>>(
  opts: AIParseOptions,
): Promise<AIParseResult<T>> {
  const ai = useAIStore()
  const settings = ai.settings
  if (!settings.apiKey) {
    return { ok: false, data: [], raw: '', error: '请先在「AI 对话 → 设置」中配置 API Key' }
  }
  const baseUrl = (settings.baseUrl || AI_DASHSCOPE_BASE_URL).replace(/\/$/, '')
  const model = settings.textModel || 'qwen3.7-plus'

  const fields = Object.entries(opts.schema.fields)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')
  const exampleJson = JSON.stringify(opts.schema.example, null, 2)
  const systemPrompt = `你是一名数据整理助手, 擅长把老师提供的非结构化文本解析为 JSON 数组.

## 任务
把用户提供的「原始文本」解析为一个 JSON 数组, 数组每个元素是一条结构化记录.

## 字段说明 (${opts.schema.name})
${fields}
${opts.schema.extra ? '\n## 特别要求\n' + opts.schema.extra : ''}

## 输出格式 (严格遵守)
- 必须是合法 JSON 数组, 以 \`[\` 开头 \`]\` 结尾
- 不要包含任何解释性文字, 不要使用 markdown 代码块包裹
- 字段值尽量简短, 与原始文本保持一致, 不要编造未出现的信息
- 缺失的字段填空字符串 \`""\` 或 \`null\`
- 解析后请额外检查: 数组长度合理、每条记录的字段数量一致

## 示例
输入示例: ...(省略, 直接给结构)
输出示例:
${exampleJson}

现在请解析用户提供的「原始文本」. 只输出 JSON 数组, 不要多余的话.`

  try {
    const resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + settings.apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '原始文本:\n```\n' + opts.text + '\n```' },
        ],
      }),
      signal: opts.signal,
    })
    if (!resp.ok) {
      const errText = await resp.text()
      return {
        ok: false,
        data: [],
        raw: '',
        error: '请求失败: ' + resp.status + ' ' + errText.slice(0, 300),
      }
    }
    const reader = resp.body?.getReader()
    if (!reader) {
      return { ok: false, data: [], raw: '', error: '浏览器不支持流式响应' }
    }
    const decoder = new TextDecoder('utf-8')
    let acc = ''
    let buffer = ''
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
        const data = trimmed.slice(5).trim()
        if (!data) continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content || ''
          if (delta) {
            acc += delta
            opts.onProgress?.(acc)
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    // 解析最终 JSON
    const cleaned = stripCodeFence(acc)
    let data: T[] = []
    try {
      const parsed = JSON.parse(cleaned)
      data = Array.isArray(parsed) ? parsed : [parsed]
    } catch (e: any) {
      return {
        ok: false,
        data: [],
        raw: acc,
        error: 'JSON 解析失败: ' + (e?.message || String(e)),
      }
    }
    return { ok: true, data, raw: acc }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, data: [], raw: '', error: '已取消' }
    }
    return { ok: false, data: [], raw: '', error: '错误: ' + (e?.message || String(e)) }
  }
}

/** 去掉 AI 偶尔包在 ```json ... ``` 里的代码块 */
function stripCodeFence(s: string): string {
  let t = s.trim()
  // 去掉首尾的 ```json / ``` 包裹
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  return t
}
