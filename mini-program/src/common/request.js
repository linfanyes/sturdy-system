import { CLOUDRUN_ENV, CLOUDRUN_SERVICE, API_PREFIX } from './config'
import { getToken, logout, auth, parent } from './store'
import { getMockData } from './mock-data'

// —— 演示模式（Mock）开关 ——
let _mockMode = false
/** 开���后所有 API 返回本地模拟数据，无需后端即可全功能预览 */
export function setMockMode(enabled) {
  _mockMode = enabled
  if (enabled) {
    auth.token = 'mock-token'
    auth.user = { name: '珊珊老师', school: '阳光实验小学（演示版）' }
  }
}
export function getMockMode() { return _mockMode }

/**
 * 把任意 reject 值归一化为 Error，确保页面层 e.message 永远可用。
 * 处理后端返回 { message } / { error }、wx fail 回调 { errMsg }、字符串、undefined 等情况。
 */
function toError(e, fallback) {
  if (e instanceof Error) return e
  const msg =
    (e && (e.message || e.error || e.errMsg)) ||
    (typeof e === 'string' ? e : '') ||
    fallback
  return new Error(msg)
}

/**
 * 批量执行的容错帮手：用 allSettled 替代 Promise.all，避免单条失败导致整体 reject
 * 及已成功项不可回滚的问题。返回 { success, failed, results }。
 * - success: 成功条数
 * - failed: 失败条数
 * - results: 与 tasks 同序的数组，元素为 { status: 'fulfilled'|'rejected', value?, reason? }
 */
async function batchRun(tasks) {
  const results = await Promise.allSettled(tasks)
  let success = 0
  let failed = 0
  for (const r of results) {
    if (r.status === 'fulfilled') success++
    else failed++
  }
  return { success, failed, results }
}

/**
 * 统一请求封装：走微信云托管私有链路（wx.cloud.callContainer），不依赖公网域名。
 * 自动带 token，401 跳转登录。
 */
export function request(path, method = 'GET', data = {}, token) {
  // 演示模式：返回本地模拟数据，无需真实后端
  if (_mockMode) {
    return new Promise((resolve) => resolve(getMockData(path, method, data)))
  }
  const useToken = token !== undefined ? token : getToken()
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路，请用微信开发者工具/真机（基础库 ≥ 2.13）'))
    }
    cloud.callContainer({
      config: { env: CLOUDRUN_ENV },
      path: API_PREFIX + path,
      method,
      data,
      header: {
        'content-type': 'application/json',
        // 服务名必须放在 header 的 X-WX-SERVICE（官方要求，不是 config.service）
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + (useToken || ''),
      },
      success: (res) => {
        const status = res.statusCode || (res.data && res.data.statusCode)
        if (status === 401) {
          // 清除本地登录态，避免带着过期 token 反复触发 401 跳转
          try { logout() } catch (e) {}
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(res.data)
        else reject(toError(res.data, '请求失败(' + status + ')'))
      },
      fail: (e) => reject(toError(e, '网络异常，请检查网络或稍后重试')),
    })
  })
}

export const api = {
  get: (p) => request(p),
  post: (p, d) => request(p, 'POST', d),
  // 后端个人资料/AI配置等更新接口用 @Put，必须发 PUT（不要改发 PATCH，否则 404/405）
  put: (p, d) => request(p, 'PUT', d),
  // 通用 CRUD 基类用 @Patch(':id')，保持发 PATCH
  patch: (p, d) => request(p, 'PATCH', d),
  del: (p) => request(p, 'DELETE'),

  /**
   * 列表加载帮手：自动管理 loading 提示 + 失败 toast + 空数组兜底。
   * 用于 onShow 的 load() 场景，避免每个页面重复 try/catch/showLoading 样板代码。
   * @param {string} path 接口路径（不含前缀）
   * @param {object} opts { loading?: boolean, loadingText?: string, silent?: boolean }
   * @returns {Promise<any[]>} 永远返回数组（失败/非数组时返回 []）
   */
  async getList(p, opts = {}) {
    const { loading = false, loadingText = '加载中', silent = false } = opts
    if (loading) {
      try { uni.showLoading({ title: loadingText, mask: false }) } catch (e) {}
    }
    try {
      const data = await request(p)
      return Array.isArray(data) ? data : (data && data.list) || []
    } catch (e) {
      if (!silent) uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      return []
    } finally {
      if (loading) {
        try { uni.hideLoading() } catch (e) {}
      }
    }
  },
}

/**
 * 流式对话（SSE）。后端 POST /ai/chat 返回 `data: {delta}\n\n` 分片，结尾 `data: [DONE]\n\n`。
 * 优先用 wx.cloud.callContainer 的 enableChunked + onChunkReceived 渐进接收；
 * 若运行环境不支持分片（缓冲到结束一次性返回），则从 success.res.data 兜底解析完整体。
 * @param {string} path 接口路径（不含前缀）
 * @param {object} data 请求体（messages / files 等）
 * @param {(delta:string, full:string)=>void} onDelta 每收到一段增量时的回调
 * @param {{ onTask?: (task: { abort: () => void }) => void }} [opts] 可选；onTask 回调用于把 task 暴露给调用方，调用 task.abort() 可中断流式
 * @returns {Promise<string>} 完整回复文本
 */
export function streamChat(path, data, onDelta, opts = {}) {
  // 演示模式：返回模拟回复
  if (_mockMode) {
    const mockReply = '这是演示模式下的模拟回复。您可以在「设置 → 演示模式」中关闭此功能连接到真实后端。'
    if (opts.onTask) opts.onTask({ abort: () => {} })
    return new Promise((resolve) => {
      // 模拟流式效果：逐字输出
      if (onDelta) {
        let i = 0
        const iv = setInterval(() => {
          if (i < mockReply.length) {
            onDelta(mockReply[i], mockReply.slice(0, i + 1))
            i++
          } else {
            clearInterval(iv)
            resolve(mockReply)
          }
        }, 30)
      } else {
        resolve(mockReply)
      }
    })
  }
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路，请用微信开发者工具/真机（基础库 ≥ 2.13）'))
    }
    let buf = ''
    let full = ''
    let finished = false
    let aborted = false

    const feed = (text) => {
      if (typeof text !== 'string') return
      buf += text
      let cut
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, cut)
        buf = buf.slice(cut + 2)
        const line = raw
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.startsWith('data:'))
        if (!line) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          finished = true
          continue
        }
        try {
          const obj = JSON.parse(payload)
          if (obj.error) {
            reject(new Error(obj.error))
            return
          }
          if (obj.delta) {
            full += obj.delta
            if (onDelta) onDelta(obj.delta, full)
          }
        } catch (e) {
          /* 忽略不完整分片 */
        }
      }
    }

    const task = cloud.callContainer({
      config: { env: CLOUDRUN_ENV },
      path: API_PREFIX + path,
      method: 'POST',
      data,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + (getToken() || ''),
        Accept: 'text/event-stream',
      },
      enableChunked: true,
      success: (res) => {
        if (aborted) {
          // 用户已主动中断，按完成处理，保留已收到的部分内容
          resolve(full)
          return
        }
        // 兜底：未走分片（整体缓冲）时从 res.data 解析全部 data: 行
        if (!finished && buf === '' && res && res.data) {
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
          feed(body)
        }
        if (finished || full) resolve(full)
        else reject(new Error('AI 未返回内容'))
      },
      fail: (e) => {
        if (aborted) resolve(full) // 中断导致的 fail 也视为完成
        else reject(toError(e, 'AI 流式请求失败'))
      },
    })

    // 把 task 暴露给调用方，调用 task.abort() 可中断
    if (opts.onTask && typeof opts.onTask === 'function') {
      opts.onTask({
        abort: () => {
          aborted = true
          try { task && task.abort && task.abort() } catch (e) {}
        },
      })
    }

    if (task && typeof task.onChunkReceived === 'function') {
      task.onChunkReceived((res) => {
        feed(ab2str(res.data))
      })
    }
  })
}

/** ArrayBuffer / Uint8Array → UTF-8 字符串（mini-program 无全局 TextDecoder 兼容保证） */
function ab2str(buf) {
  if (typeof buf === 'string') return buf
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  const len = bytes.length
  let out = ''
  let i = 0
  while (i < len) {
    const c = bytes[i++]
    if (c < 0x80) {
      out += String.fromCharCode(c)
    } else if (c >= 0xc0 && c < 0xe0) {
      const c2 = bytes[i++]
      out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f))
    } else if (c >= 0xe0 && c < 0xf0) {
      const c2 = bytes[i++]
      const c3 = bytes[i++]
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f))
    } else {
      const c2 = bytes[i++]
      const c3 = bytes[i++]
      const c4 = bytes[i++]
      let u = ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f)
      u -= 0x10000
      out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff))
    }
  }
  return out
}

export { batchRun }

/** 家长端专用请求封装：使用家长令牌（parent.token），其余与 api 一致 */
export const parentApi = {
  get: (p) => request(p, 'GET', {}, parent.token),
  post: (p, d) => request(p, 'POST', d || {}, parent.token),
  put: (p, d) => request(p, 'PUT', d || {}, parent.token),
  del: (p) => request(p, 'DELETE', {}, parent.token),
}

export default api


