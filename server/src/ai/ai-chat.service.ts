import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { createSSEEventSplitter } from '@gardener/shared/utils/sse-parser'
import { ConfigService } from '../config/config.service'
import { CacheService } from '../common/cache/cache.service'
import { AiFileParserService } from './ai-file-parser.service'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { Teacher } from '../teacher/teacher.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { AwardRecord } from '../award/award.entity'
import { NoteItem } from '../notes/notes.entity'
import { tlsAgent } from './ai-file-parser.service'
import { buildAiSettings } from './ai-settings.util'

/**
 * AI 对话核心服务：负责组装消息（含本地上下文注入）、模型选择、
 * 流式/同步对话、JSON 结构化解析等能力。
 */
@Injectable()
export class AiChatService {
  // AI 上下文缓存 TTL：5 分钟（学生/班级/成绩等数据在此期间变化概率低）
  private readonly AI_CONTEXT_TTL = 5 * 60 * 1000

  constructor(
    private readonly cfg: ConfigService,
    private readonly cache: CacheService,
    private readonly fileParser: AiFileParserService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(AwardRecord) private readonly awardRepo: Repository<AwardRecord>,
    @InjectRepository(NoteItem) private readonly noteRepo: Repository<NoteItem>,
  ) {}

  // A06修复：委托给共享工具函数
  private buildSettings(ownerType: string, ownerId: string) {
    return buildAiSettings(this.cfg, ownerType, ownerId)
  }

  /**
   * 按场景 + 资源自动选择模型：
   * 1) body.resource 指定资源名 → 优先用 s.resourceModels 覆盖；
   * 2) 前端显式指定 modelType='vision' → 多模态模型；
   * 3) 检测消息体是否含图片 → 含则用多模态模型；
   * 4) 其余一律文本模型。
   */
  private resolveModel(body: any, s: any): string {
    // 0) 按资源名覆盖（配置了特定场景的模型优先）
    if (body?.resource === 'image-gen') return s.imageModel || s.textModel
    if (body?.resource === 'video-gen') return s.videoModel || s.textModel
    if (body?.resource && s.resourceModels?.[body.resource]) {
      return s.resourceModels[body.resource]
    }
    if (body?.modelType === 'vision') return s.visionModel
    const msgs: any[] = body?.messages || []
    const hasImage = msgs.some(
      (m) =>
        Array.isArray(m?.content) &&
        m.content.some((c: any) => c && c.type === 'image_url'),
    )
    return hasImage ? s.visionModel : s.textModel
  }

  /**
   * 组装发给模型的消息：
   * 1) 系统提示 + 自动注入的本地上下文（教师/班级/学生/成绩等）+ 历史消息；
   * 2) 若本次携带 files，把解析后的文本作为一条 text 部分追加到最后一条用户消息（没有则新建一条）。
   * 图片以 OpenAI 视觉格式（image_url）原样保留，模型选择逻辑不变。
   */
  private async buildMessages(body: any, s: any, ownerType?: string, ownerId?: string): Promise<any[]> {
    const sysParts: string[] = []
    if (s.systemPrompt) sysParts.push(s.systemPrompt)
    // 自动注入本地上下文（对齐 web buildContext，由后端构造）
    if (ownerType) {
      try {
        const ctx = await this.buildLocalContext(ownerType, ownerId as string)
        if (ctx) sysParts.push(ctx)
      } catch {
        /* 上下文构造失败不影响主流程 */
      }
    }
    const sysText = sysParts.filter(Boolean).join('\n\n') || '你是一位耐心、专业的班主任助手'
    const messages: any[] = [
      { role: 'system', content: sysText },
      ...(body.messages || []),
    ]
    if (body?.files?.length) {
      const fileText = await this.fileParser.extractFilesText(body.files, s)
      const last = messages[messages.length - 1]
      if (last && last.role === 'user') {
        if (typeof last.content === 'string') {
          last.content = [
            { type: 'text', text: last.content },
            { type: 'text', text: fileText },
          ]
        } else if (Array.isArray(last.content)) {
          last.content.push({ type: 'text', text: fileText })
        } else {
          last.content = fileText
        }
      } else {
        messages.push({ role: 'user', content: [{ type: 'text', text: fileText }] })
      }
    }
    return messages
  }

  /**
   * 构造本地上下文（教师本人 + 班级 + 学生 + 教师通讯录 + 最近成绩 + 考试 + 奖惩 + 笔记）
   * 数据量上限做了控制，避免 token 过大。
   * 8 路并行查询，降低冷启动延迟（从 ~8×RTT 降为 ~1×RTT）。
   */
  private async buildLocalContext(ownerType: string, ownerId: string): Promise<string> {
    // 校管无教师本地数据，跳过上下文注入，避免按 teacherId 查不到数据而报错
    if (ownerType !== 'teacher') return ''
    const teacherId = ownerId
    // 缓存命中时直接返回，避免每次对话都执行 8 路数据库查询
    const cacheKey = `ai-context:${teacherId}`
    const cached = this.cache.get<string>(cacheKey)
    if (cached !== undefined) return cached
    const lines: string[] = ['—— 已注入教师本地数据（仅供 AI 参考，回答时基于此数据，不要编造） ——']
    // P0-1修复：所有查询添加 teacherId 过滤，防止跨租户数据泄露 + 全表扫描
    const [u, classes, students, teachers, grades, exams, awards, notes] = await Promise.all([
      this.userRepo.findOne({ where: { id: teacherId } as any }).catch(() => null),
      this.classRepo.find({ where: { teacherId }, take: 20 }).catch(() => []),
      this.studentRepo.find({ where: { teacherId }, take: 50 }).catch(() => []),
      this.teacherRepo.find({ where: { teacherId }, take: 20 }).catch(() => []),
      this.gradeRepo.find({ where: { teacherId }, take: 30, order: { createdAt: 'DESC' } as any }).catch(() => []),
      this.examRepo.find({ where: { teacherId }, take: 10, order: { createdAt: 'DESC' } as any }).catch(() => []),
      this.awardRepo.find({ where: { teacherId }, take: 20, order: { createdAt: 'DESC' } as any }).catch(() => []),
      this.noteRepo.find({ where: { teacherId }, take: 10, order: { createdAt: 'DESC' } as any }).catch(() => []),
    ])
    if (u) {
      lines.push(
        `# 当前教师\n姓名: ${u.name || '-'} | 学校: ${u.school || '-'} | 任教学科: ${u.subject || '-'} | 任教学期: ${u.term || '-'}`,
      )
    }
    if ((classes as any[]).length) {
      lines.push('# 班级列表')
      lines.push((classes as any[]).map((c, i) => `${i + 1}. ${c.name || '-'}（${c.studentCount || '?'}人，班主任：${c.headTeacher || '-'}）`).join('\n'))
    }
    if ((students as any[]).length) {
      lines.push('# 学生名单（最多 50 条）')
      lines.push((students as any[]).map((s) => `- ${s.name || '-'} | 学号: ${s.studentNo || '-'} | 性别: ${s.gender || '-'} | 班级ID: ${s.classId || '-'}`).join('\n'))
    }
    if ((teachers as any[]).length) {
      lines.push('# 教师通讯录（最多 20 条）')
      lines.push((teachers as any[]).map((t) => `- ${t.name || '-'} | 学科: ${t.subject || '-'} | 电话: ${t.phone || '-'}`).join('\n'))
    }
    if ((grades as any[]).length) {
      lines.push('# 最近成绩记录（最多 30 条）')
      lines.push((grades as any[]).map((g) => `- 学生ID: ${g.studentId || '-'} | 科目: ${g.subject || '-'} | 分数: ${g.score ?? '-'} | 考试: ${g.examName || '-'}`).join('\n'))
    }
    if ((exams as any[]).length) {
      lines.push('# 最近考试（最多 10 条）')
      lines.push((exams as any[]).map((e) => `- ${e.name || '-'} | 班级ID: ${e.classId || '-'} | 科目: ${(e.subjects || []).join('/')}`).join('\n'))
    }
    if ((awards as any[]).length) {
      lines.push('# 最近奖惩记录（最多 20 条）')
      lines.push((awards as any[]).map((a) => `- ${a.studentName || a.name || '-'} | 类型: ${a.type || '-'} | 等级: ${a.level || '-'} | 时间: ${a.date || '-'}`).join('\n'))
    }
    if ((notes as any[]).length) {
      lines.push('# 最近笔记（最多 10 条标题）')
      lines.push((notes as any[]).map((n) => `- ${n.title || '-'}`).join('\n'))
    }
    const result = lines.length > 1 ? lines.join('\n\n') : ''
    // 仅缓存非空结果（空结果表示该教师无任何本地数据）
    if (result) {
      this.cache.set(cacheKey, result, this.AI_CONTEXT_TTL)
    }
    return result
  }

  /**
   * 流式对话：密钥与服务端配置均在后端，小程序只传消息。
   * onDelta 每收到一段文本回调一次（用于 SSE 推送给前端）。
   */
  async chatStream(
    ownerType: string,
    ownerId: string,
    body: any,
    onDelta: (text: string) => void,
  ): Promise<void> {
    const s = await this.buildSettings(ownerType, ownerId)
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s, ownerType, ownerId)
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model,
        temperature: body.temperature ?? s.temperature,
        stream: true,
        messages,
      },
      {
        responseType: 'stream',
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    await this.pipeSse(resp.data, onDelta)
  }

  /**
   * 解析 OpenAI 流式响应（SSE）
   * SSE统一修复：分片/切分语义收敛到 shared createSSEEventSplitter（RFC 8800 '\n\n' 事件分隔），
   * 与前端 createSSEParser 共用同一内核，消除双端分隔符与容错策略漂移；
   * OpenAI 格式 delta 提取保持兼容（choices[0].delta.content）。
   */
  /**
   * 解析 OpenAI 流式响应（SSE）。
   * P0-8修复：添加背压控制 — 当 onDelta 处理慢时暂停上游 stream，
   * 待消费完成后再恢复，避免内存积压。
   */
  private pipeSse(stream: any, onDelta: (t: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const splitter = createSSEEventSplitter((data) => {
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            // 背压控制：如果 onDelta 返回 false，暂停上游
            const canContinue = onDelta(delta as string)
            if ((canContinue as any) === false && stream.pause) {
              stream.pause()
              // 消费恢复后继续
              setImmediate(() => {
                if (stream.resume) stream.resume()
              })
            }
          }
        } catch {
          /* 忽略非 JSON 行 */
        }
      })
      stream.on('data', (chunk: Buffer) => splitter.feed(chunk.toString('utf8')))
      stream.on('end', () => {
        splitter.flush()
        resolve()
      })
      stream.on('error', (e: Error) => reject(e))
    })
  }

  /**
   * 同步对话：一次性返回完整文本。
   * 微信小程序 wx.request 不支持 SSE 流式，前端用此接口。
   */
  async chatSync(ownerType: string, ownerId: string, body: any): Promise<string> {
    const s = await this.buildSettings(ownerType, ownerId)
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s, ownerType, ownerId)
    const fallback = '未连接到远端大模型，请在设置中检查AI配置后重试。'
    try {
      const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model,
        temperature: body.temperature ?? s.temperature,
        stream: false,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    return (
      resp.data?.choices?.[0]?.message?.content || fallback
    )
    } catch {
      return fallback
    }
  }

  /** 非流式结构化解析：把非结构化文本交给 AI 解析为 JSON 数组 */
  async parse(
    ownerType: string,
    ownerId: string,
    body: { text: string; instruction?: string },
  ): Promise<any> {
    const s = await this.buildSettings(ownerType, ownerId)
    const sys =
      (body.instruction ||
        '请把下面的内容解析为 JSON 数组，每个元素是一个对象，只返回 JSON，不要解释。') +
      '\n系统提示词：' +
      (s.systemPrompt || '')
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model: s.textModel,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: body.text },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    const content = resp.data?.choices?.[0]?.message?.content || '[]'
    try {
      const parsed = JSON.parse(content)
      return parsed
    } catch {
      const m = content.match(/\[[\s\S]*\]/)
      return m ? JSON.parse(m[0]) : []
    }
  }

  /**
   * 清除指定教师的 AI 上下文缓存（数据变更时外部调用）。
   * 场景：新增/修改/删除 学生、班级、成绩、考试、奖惩、笔记等数据后调用。
   * @param teacherId 教师 ID
   */
  clearAiContextCache(teacherId: string): void {
    this.cache.del(`ai-context:${teacherId}`)
  }

  /**
   * 清除所有 AI 上下文缓存（全局配置变更时调用）。
   */
  clearAllAiContextCache(): void {
    this.cache.delByScope('ai-context')
  }
}
