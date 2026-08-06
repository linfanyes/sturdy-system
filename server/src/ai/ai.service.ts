import { Injectable } from '@nestjs/common'
import { AiChatService } from './ai-chat.service'
import { AiFileParserService } from './ai-file-parser.service'
import { AiVisionService } from './ai-vision.service'
import { AiMediaService } from './ai-media.service'

/**
 * AI 服务 Facade：对外保留原有公开方法名和签名（AiController 及其他模块直接依赖），
 * 内部委托给各子服务（对话/文件解析/视觉/媒体）完成具体逻辑，保证兼容性无需修改调用方。
 */
@Injectable()
export class AiService {
  constructor(
    private readonly chat: AiChatService,
    private readonly fileParser: AiFileParserService,
    private readonly vision: AiVisionService,
    private readonly media: AiMediaService,
  ) {}

  // ── 对话核心（委托 AiChatService）──────────────────────────────

  /** 流式对话 */
  async chatStream(
    ownerType: string,
    ownerId: string,
    body: any,
    onDelta: (text: string) => void,
  ): Promise<void> {
    return this.chat.chatStream(ownerType, ownerId, body, onDelta)
  }

  /** 同步对话（微信小程序用，非流式） */
  async chatSync(ownerType: string, ownerId: string, body: any): Promise<string> {
    return this.chat.chatSync(ownerType, ownerId, body)
  }

  /** 结构化解析（导入学生/成绩时把自由文本转为对象数组） */
  async parse(
    ownerType: string,
    ownerId: string,
    body: { text: string; instruction?: string },
  ): Promise<any> {
    return this.chat.parse(ownerType, ownerId, body)
  }

  /** 清除指定教师的 AI 上下文缓存 */
  clearAiContextCache(teacherId: string): void {
    return this.chat.clearAiContextCache(teacherId)
  }

  /** 清除所有 AI 上下文缓存 */
  clearAllAiContextCache(): void {
    return this.chat.clearAllAiContextCache()
  }

  // ── 文件解析（委托 AiFileParserService）────────────────────────

  /** 通用文件解析：根据文件后缀自动路由到 TXT/PDF/图片 OCR 解析 */
  async parseFile(
    ownerType: string,
    ownerId: string,
    body: { fileName: string; fileData: string },
  ): Promise<{ text: string }> {
    return this.fileParser.parseFile(ownerType, ownerId, body)
  }

  /** Excel 工作簿转为「每个工作表一段 CSV」的文本（公开方法，供导入场景复用） */
  async parseExcel(buf: Buffer): Promise<string> {
    return this.fileParser.parseExcel(buf)
  }

  // ── 视觉识别（委托 AiVisionService）────────────────────────────

  /** 图片 OCR：接收 base64 图片，调用多模态模型识别文字 */
  async ocr(ownerType: string, ownerId: string, body: { image: string }): Promise<{ text: string }> {
    return this.vision.ocr(ownerType, ownerId, body)
  }

  /** 对外封装：传入图片 data URL，自动鉴权后调用多模态模型做 OCR 文字识别 */
  async recognizeImage(ownerType: string, ownerId: string, dataUrl: string): Promise<string> {
    return this.vision.recognizeImage(ownerType, ownerId, dataUrl)
  }

  // ── 媒体生成（委托 AiMediaService）─────────────────────────────

  /** AI 文生图：调用服务商图片生成接口，返回图片 URL 数组 */
  async genImage(ownerType: string, ownerId: string, body: any): Promise<{ urls: string[] }> {
    return this.media.genImage(ownerType, ownerId, body)
  }

  /** AI 文生视频：调用服务商视频生成接口，返回任务ID或文件URL */
  async genVideo(ownerType: string, ownerId: string, body: any): Promise<{ taskId?: string; url?: string }> {
    return this.media.genVideo(ownerType, ownerId, body)
  }

  /** 语音识别 ASR：接收 base64 音频，调用配置的 AI 服务商多模态模型转文字 */
  async asr(ownerType: string, ownerId: string, body: { audio: string; format?: string }): Promise<{ text: string }> {
    return this.media.asr(ownerType, ownerId, body)
  }
}
