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
    onDelta?: (delta: string, full: string) => void;
    /** 后端发来的 error 字段回调 */
    onError?: (msg: string) => void;
    /** 遇到 [DONE] 或流结束 */
    onDone?: (full: string) => void;
}
export interface SSEParser {
    /** 喂入增量 chunk（多次调用，内部缓冲） */
    feed: (chunk: string) => void;
    /** 流结束时调用，_flush 等于 final feed with flush flag */
    flush: () => void;
    /** 当前累积的全文（full text） */
    readonly full: string;
    /** 当前未完成的缓冲（调试용） */
    readonly buffer: string;
}
/**
 * 创建 SSE 解析器实例。
 *
 * 纯 TS，无平台依赖。所有浏览器 / Node / 小程序 通过 feed() 喂入二进制转字符串后的即可。
 */
export declare function createSSEParser(handlers?: SSEParseHandlers): SSEParser;
/**
 * 简易一次性 SSE 行解析：针对 Web 端 ReadableStream 流式场景的简化帮助器。
 *
 * 把多行文本（按 '\n' 分隔）逐行解析，忽略空行 / 缺少 data: 前缀的行。
 * 返回 { deltaParts: string[], done: boolean }。
 *
 * 注意：此帮助器按「增量、无状态」方式处理，无法处理跨 chunk 的断行。
 * 跨 chunk 场景请直接用 createSSEParser。
 */
export declare function parseSSELn(line: string): {
    data: string | null;
    done: boolean;
};
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
    feed: (chunk: string) => void;
    /** 流结束时调用，处理残留缓冲（无结束符的尾部事件） */
    flush: () => void;
}
export declare function createSSEEventSplitter(onData: (payload: string) => void): SSEEventSplitter;
//# sourceMappingURL=sse-parser.d.ts.map