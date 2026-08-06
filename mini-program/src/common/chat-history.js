/**
 * AI 对话历史云端同步（mini-program 端）。
 * 提供「把当前会话内容同步到后端」的能力，使小程序与 Web 端对话历史打通（同一后端、同一教师）。
 *
 * 说明：小程序本地会保留包含图片/附件等富内容的完整会话（localStorage），
 * 这里仅把文字消息同步到后端，供 Web 端及其他设备查看/续聊。
 *
 * 【复用改造】端点路径、DTO 类型从 @gardener/shared/api/endpoints 导入，
 * 与 Web 端（web-app/src/api/chat.ts）共用同一份事实来源。
 */
import { api } from './request'
import { CHAT_SESSIONS_PATHS } from '@gardener/shared/api/endpoints'

// 本地会话 id(时间戳) → 后端会话 id 的映射（持久化在 localStorage，避免重复创建）
const BACKEND_ID_KEY = 'ai_backend_session_ids'

function loadIdMap() {
  try {
    const raw = uni.getStorageSync(BACKEND_ID_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    return {}
  }
}
function saveIdMap(map) {
  try {
    uni.setStorageSync(BACKEND_ID_KEY, map)
  } catch (e) { /* 静默 */ }
}

/**
 * 把一条文字会话同步到后端。
 * - 首次同步自动创建后端会话（create），后续用 append 追加新消息。
 * - 幂等：通过记录已同步的本地消息数，避免重复追加。
 * - 失败静默，不影响小程序本地体验。
 * @param {object} sess 本地会话 { id, title, messages: [{role, content}] }
 */
export async function syncSessionToBackend(sess) {
  if (!sess || !sess.id || !sess.messages || !sess.messages.length) return
  const map = loadIdMap()
  try {
    let backendId = map[sess.id]
    // 只同步文字消息（跳过图片/附件富内容，避免体积过大 & 后端模型限制）
    const textMsgs = sess.messages
      .filter((m) => m && m.role && m.content && typeof m.content === 'string')
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    if (!textMsgs.length) return

    if (!backendId) {
      // 创建会话并一次性写入全部文字消息
      const created = await api.post(CHAT_SESSIONS_PATHS.base, { title: sess.title || '新对话' })
      backendId = created && created.id
      if (!backendId) return
      // 把首条 user 消息作为标题由后端语义化，随后逐条追加
      let first = true
      for (const m of textMsgs) {
        // 后端 append 会把首条 user 作为标题，跳过重复创建时的 title 处理
        await api.patch(CHAT_SESSIONS_PATHS.appendMessages(backendId), m).catch(() => {})
        void first
        first = false
      }
      map[sess.id] = backendId
      saveIdMap(map)
    } else {
      // 已存在后端会话：检查是否有新增文字消息需要追加
      // 记录「已同步条数」以增量追加
      const syncCountKey = 'ai_sync_count_' + sess.id
      let synced = 0
      try { synced = uni.getStorageSync(syncCountKey) || 0 } catch (e) { synced = 0 }
      for (let i = synced; i < textMsgs.length; i++) {
        await api.patch(CHAT_SESSIONS_PATHS.appendMessages(backendId), textMsgs[i]).catch(() => {})
      }
      try { uni.setStorageSync(syncCountKey, textMsgs.length) } catch (e) { /* 静默 */ }
    }
  } catch (e) {
    /* 静默：后端不可用或未登录时不影响本地聊天 */
  }
}