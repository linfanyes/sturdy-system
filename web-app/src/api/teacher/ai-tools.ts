import request, { getApiBase, handleUnauthorized } from '../request'
import { createSSEParser } from '@gardener/shared/utils/sse-parser'

/* ============ AI 工具统一入口 ============ */

/** AI 流式对话（SSE），返回可读流 */
export async function aiChatStream(
  messages: { role: string; content: string }[],
  onDelta: (delta: string) => void,
  onError?: (msg: string) => void,
) {
  const token = localStorage.getItem('trace_web_token')
  const base = getApiBase()
  const resp = await fetch(base + '/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  })
  if (resp.status === 401) {
    await handleUnauthorized()
    throw new Error('登录已失效，请重新登录')
  }
  if (!resp.body) throw new Error('当前浏览器不支持流式响应')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSSEParser({ onDelta, onError })
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.feed(decoder.decode(value, { stream: true }))
  }
  parser.flush()
}

/** AI 同步对话（非流式） */
export function aiChatSync(messages: { role: string; content: string }[], opts?: { subjectKey?: string }) {
  return request.post<any, { content: string }>('/ai/chat-sync', { messages, ...(opts?.subjectKey ? { subjectKey: opts.subjectKey } : {}) })
}

/** AI 解析（自由文本转结构化） */
export function aiParse(text: string, instruction?: string) {
  return request.post<any, any>('/ai/parse', { text, instruction })
}

/** AI 文生图 */
export function aiGenImage(data: any) {
  return request.post<any, any>('/ai/gen-image', data)
}

/** 考试 AI 分析 */
export function aiAnalyzeExam(examId: string) {
  return request.post<any, { content: string }>('/ai/analyze-exam', { examId })
}

/** 学生 AI 诊断 */
export function aiDiagnose(studentId: string) {
  return request.post<any, { content: string }>('/ai/diagnose', { studentId })
}

/** AI 文本翻译 */
export function aiTranslate(data: { text: string; targetLang?: string }) {
  return request.post<any, any>('/ai/translate', data)
}

/** AI 生成英语口语对话 */
export function aiSpeech(data: { topic?: string; role?: string }) {
  return request.post<any, any>('/ai/speech', data)
}

/** AI 生成黑板板书 */
export function aiBlackboard(data: { topic?: string }) {
  return request.post<any, any>('/ai/blackboard', data)
}
