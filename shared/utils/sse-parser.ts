/**
 * SSE 流式解析器（跨端共享）—— 传输层无关的 [DONE] 协议分片解析。
 *
 * 【适用】
 *   - Web 端：ReadableStream 读取到 value → TextDecoder.decode → feed(buffer)
 *   - 小程序端：wx.cloud.callContainer enableChunked → onChunkReceived → feed(buffer)
 *
 * 【协议】
 *   - 完整 SSE event 以 '\n\n' 分隔（RFC 8800）
 *   - 单条 event 取最后一个 "data: " 行作为 payload
 *   - payload 为 '[DONE]' 表示流结束
 *   - payload 为 JSON: { delta?: string, error?: string, ... }
 *
 * 【使用模式】
 *   const parser = createSSEParser({ onDelta, onError, onDone })
 *   parser.feed(chunk)    // 多次传入增量数据，内部维护未完成分片的缓冲
 *   parser.flush()        // 流结束时调用，处理残留缓冲
 *
 * 两侧只传 transport adapter（一个 feed 函数），协议解析逻辑完全收敛到 shared。
 */

export interface SSEParseHandlers {
  /** 文本增量片段回调 */
  onDelta?: (delta: string, full: string) => void
  /** 后端发来的 error 字段回调 */
  onError?: (msg: string) => void
  /** 遇到 [DONE] 或流结束 */
  onDone?: (full: string) => void
}

export interface SSEParser {
  /** 喂入增量 chunk（多次调用，内部缓冲） */
  feed: (chunk: string) => void
  /** 流结束时调用，_flush 等于 final feed with flush flag */
  flush: () => void
  /** 当前累积的全文（full text） */
  readonly full: string
  /** 当前未完成的缓冲（调试용） */
  readonly buffer: string
}

/** Uint-8 编码标记：data: 行前缀 */
const DATA_PREFIX = 'data:'
/** 终止信号 */
const DONE_TOKEN = '[DONE]'
/** SSE 事件分隔符 */
const EVENT_DELIMITER = '\n\n'

/**
 * 创建 SSE 解析器实例。
 *
 * 纯 TS，无平台依赖。所有浏览器 / Node / 小程序 通过 feed() 喂入二进制转字符串后的即可。
 */
export function createSSEParser(handlers: SSEParseHandlers = {}): SSEParser {
  let buf = ''
  let full = ''
  let doneFired = false

  function emitDone() {
    if (doneFired) return
    doneFired = true
    handlers.onDone?.(full)
  }

  function processBuffer(flush: boolean) {
    while (true) {
      const idx = buf.indexOf(EVENT_DELIMITER)
      if (idx === -1) break
      // 抽出一个完整 event（不含分隔符）
      const raw = buf.slice(0, idx)
      buf = buf.slice(idx + EVENT_DELIMITER.length)
      handleEvent(raw)
      if (doneFired) return
    }
    // flush && 剩余未分隔的缓冲（可能是无结束符的 data 行）
    if (flush && buf.length > 0) {
      const tail = buf
      buf = ''
      // 若 tail 仅包含空白或已解析过则跳过；否则作为残留 event 处理
      if (tail.trim()) handleEvent(tail)
    }
  }

  function handleEvent(raw: string) {
    // 取最后一个 data: 行（某些实现可能带 event:/id: 等杂项前缀）
    const lines = raw.split('\n')
    let dataLine: string | null = null
    for (const ln of lines) {
      const t = ln.trim()
      if (t.startsWith(DATA_PREFIX)) {
        dataLine = t.slice(DATA_PREFIX.length).trim()
      }
    }
    if (dataLine == null) return

    if (dataLine === DONE_TOKEN) {
      emitDone()
      return
    }

    let payload: any = null
    try {
      payload = JSON.parse(dataLine)
    } catch {
      // 非 JSON 的 data 行（少见）——直接作为 delta
      payload = { delta: dataLine }
    }

    if (!payload || typeof payload !== 'object') return

    if (typeof payload.error === 'string' && payload.error) {
      handlers.onError?.(payload.error)
      return
    }

    if (typeof payload.delta === 'string') {
      full += payload.delta
      handlers.onDelta?.(payload.delta, full)
    }
  }

  return {
    feed(chunk: string) {
      if (!chunk) return
      buf += chunk
      processBuffer(false)
    },
    flush() {
      if (doneFired) return
      processBuffer(true)
      // 无论是否触发 [DONE]，flush 也视为流结束
      if (!doneFired) emitDone()
    },
    get full() {
      return full
    },
    get buffer() {
      return buf
    },
  }
}

/**
 * 简易一次性 SSE 行解析：针对 Web 端 ReadableStream 流式场景的简化帮助器。
 *
 * 把多行文本（按 '\n' 分隔）逐行解析，忽略空行 / 缺少 data: 前缀的行。
 * 返回 { deltaParts: string[], done: boolean }。
 *
 * 注意：此帮助器按「增量、无状态」方式处理，无法处理跨 chunk 的断行。
 * 跨 chunk 场景请直接用 createSSEParser。
 */
export function parseSSELn(line: string): { data: string | null; done: boolean } {
  const t = line.trim()
  if (!t.startsWith(DATA_PREFIX)) return { data: null, done: false }
  const data = t.slice(DATA_PREFIX.length).trim()
  if (data === DONE_TOKEN) return { data: null, done: true }
  return { data, done: false }
}

/**
 * 协议无关的 SSE 事件切分器（服务端/消费上游流场景复用）。
 *
 * 与 createSSEParser 共享同一套 RFC 8800 切分内核（'\n\n' 事件分隔 + data: 行提取），
 * 但不假设 payload 结构——每条 data: 行的原文（去掉 data: 前缀并 trim）通过 onData 回调抛出，
 * 由调用方自行解释（OpenAI choices[].delta.content、本系统 {delta,error} 协议等）。
 *
 * 【背景】server 端 ai-chat.service.ts 的 pipeSse（消费 OpenAI 兼容上游流）
 * 曾独立维护一套缓冲/切分逻辑，与本文件存在分隔符与容错策略漂移的风险；
 * 统一后 SSE 分片语义收敛到 shared 单一实现。
 *
 * 【使用】
 *   const splitter = createSSEEventSplitter((payload) => {
 *     if (payload === '[DONE]') return
 *     const json = JSON.parse(payload) // 调用方决定如何解释
 *   })
 *   stream.on('data', (c) => splitter.feed(c.toString('utf8')))
 *   stream.on('end', () => splitter.flush())
 */
export interface SSEEventSplitter {
  /** 喂入增量 chunk */
  feed: (chunk: string) => void
  /** 流结束时调用，处理残留缓冲（无结束符的尾部事件） */
  flush: () => void
}

export function createSSEEventSplitter(onData: (payload: string) => void): SSEEventSplitter {
  let buf = ''

  function handleEvent(raw: string) {
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t.startsWith(DATA_PREFIX)) continue
      onData(t.slice(DATA_PREFIX.length).trim())
    }
  }

  function processBuffer(flush: boolean) {
    while (true) {
      const idx = buf.indexOf(EVENT_DELIMITER)
      if (idx === -1) break
      const raw = buf.slice(0, idx)
      buf = buf.slice(idx + EVENT_DELIMITER.length)
      if (raw.trim()) handleEvent(raw)
    }
    if (flush && buf.trim()) {
      const tail = buf
      buf = ''
      handleEvent(tail)
    }
  }

  return {
    feed(chunk: string) {
      if (!chunk) return
      buf += chunk
      processBuffer(false)
    },
    flush() {
      processBuffer(true)
    },
  }
}
