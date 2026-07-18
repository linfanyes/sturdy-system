import { CLOUDRUN_ENV, CLOUDRUN_SERVICE, API_PREFIX } from './config'
import { getToken } from './store'

/**
 * 统一请求封装：走微信云托管私有链路（wx.cloud.callContainer），不依赖公网域名。
 * 自动带 token，401 跳转登录。
 */
export function request(path, method = 'GET', data = {}) {
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
        Authorization: 'Bearer ' + (getToken() || ''),
      },
      success: (res) => {
        const status = res.statusCode || (res.data && res.data.statusCode)
        if (status === 401) {
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(res.data)
        else reject(res.data || new Error('请求失败'))
      },
      fail: (e) => reject(e),
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
}

/**
 * 流式对话（SSE）。后端 POST /ai/chat 返回 `data: {delta}\n\n` 分片，结尾 `data: [DONE]\n\n`。
 * 优先用 wx.cloud.callContainer 的 enableChunked + onChunkReceived 渐进接收；
 * 若运行环境不支持分片（缓冲到结束一次性返回），则从 success.res.data 兜底解析完整体。
 * @param {string} path 接口路径（不含前缀）
 * @param {object} data 请求体（messages / files 等）
 * @param {(delta:string, full:string)=>void} onDelta 每收到一段增量时的回调
 * @returns {Promise<string>} 完整回复文本
 */
export function streamChat(path, data, onDelta) {
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路，请用微信开发者工具/真机（基础库 ≥ 2.13）'))
    }
    let buf = ''
    let full = ''
    let finished = false

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
        // 兜底：未走分片（整体缓冲）时从 res.data 解析全部 data: 行
        if (!finished && buf === '' && res && res.data) {
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
          feed(body)
        }
        if (finished || full) resolve(full)
        else reject(new Error('AI 未返回内容'))
      },
      fail: (e) => reject(e),
    })

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

export default api


