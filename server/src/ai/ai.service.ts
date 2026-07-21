import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import https from 'node:https'
import * as path from 'path'
import XLSX from 'xlsx'
import mammoth from 'mammoth'
import { createCanvas } from '@napi-rs/canvas'
import pdfParse = require('pdf-parse/lib/pdf-parse.js')
import { ConfigService } from '../config/config.service'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { Teacher } from '../teacher/teacher.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { AwardRecord } from '../award/award.entity'
import { NoteItem } from '../notes/notes.entity'

// pdfjs 用 legacy 构建（Node 友好），用于把扫描版 PDF 光栅化为图片再送多模态模型 OCR
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
try {
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(
    path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.js')),
    'pdf.worker.js',
  )
} catch {
  /* 某些环境无 worker 文件也能用 fake worker 兜底 */
}

// 与微信登录同理：AI 接口(baseUrl 多为内网/自签证书地址)在 TLS 拦截环境下也会报
// "self-signed certificate"，这里仅为 AI 调用单独放宽证书校验。
const tlsAgent = new https.Agent({ rejectUnauthorized: false })

@Injectable()
export class AiService {
  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(AwardRecord) private readonly awardRepo: Repository<AwardRecord>,
    @InjectRepository(NoteItem) private readonly noteRepo: Repository<NoteItem>,
  ) {}

  private async buildSettings(teacherId: string) {
    const s = await this.cfg.getAiSettings(teacherId)
    if (!s.apiKey) {
      throw new BadRequestException('未配置 AI 密钥，请到「后端配置」中填写')
    }
    if (!s.baseUrl) {
      throw new BadRequestException('未配置 AI 接口地址')
    }
    return s
  }

  /**
   * 按场景自动选择模型：
   * 1) 前端显式指定 modelType='vision' → 多模态模型；
   * 2) 否则检测消息体是否含图片（OpenAI 视觉格式 content[].type==='image_url'）→ 含则用多模态模型；
   * 3) 其余一律文本模型。
   * 这样前端无需关心模型名，系统根据内容自动切换。
   */
  private resolveModel(body: any, s: any): string {
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
   * 把多类型文件（Excel/Word/PDF/Markdown/文本）解析为纯文本，拼成可注入 AI 的提示块。
   * 单个文件文本上限 30000 字，超出截断，避免请求体过大。
   */
  private async extractFilesText(
    files: Array<{ name: string; data: string }>,
    s?: any,
  ): Promise<string> {
    const blocks: string[] = []
    for (const f of files) {
      const buf = Buffer.from(f.data || '', 'base64')
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      let text = ''
      let note = ''
      try {
        if (['md', 'txt', 'text', 'csv', 'json', 'log', 'yml', 'yaml'].includes(ext)) {
          text = buf.toString('utf-8')
        } else if (['xlsx', 'xls'].includes(ext)) {
          text = this.parseExcel(buf)
        } else if (ext === 'docx') {
          const r = await mammoth.extractRawText({ buffer: buf })
          text = r.value
          if (!text.trim())
            note = '（Word 未提取到文字，若为图片型扫描件请导出 PDF 或截图发送）'
        } else if (ext === 'pdf') {
          const r = await pdfParse(buf)
          text = r.text
          // 文本极少 → 疑似扫描件，尝试用多模态模型 OCR 识别
          if (text.trim().length < 30 && s?.visionModel && s?.apiKey) {
            try {
              text = await this.ocrPdf(buf, s)
            } catch (e: any) {
              note = `（PDF 疑似扫描件，OCR 失败：${e?.message || e}）`
            }
          }
        } else {
          // 未知类型，尽力按文本读取
          text = buf.toString('utf-8')
        }
      } catch (e: any) {
        text = `[文件「${f.name}」解析失败：${e?.message || e}]`
      }
      if (note) text = (text ? text + '\n' : '') + note
      const MAX = 30000
      if (text.length > MAX) {
        text = text.slice(0, MAX) + `\n…（内容过长已截断，原文约 ${text.length} 字）`
      }
      blocks.push(`【文件：${f.name}】\n${text}`)
    }
    return blocks.join('\n\n')
  }

  /** 把扫描版 PDF 逐页光栅化为 PNG，送多模态模型做 OCR 文字识别 */
  private async ocrPdf(buf: Buffer, s: any): Promise<string> {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
    const maxPages = Math.min(doc.numPages, 3) // 最多识别前 3 页，控制耗时
    let out = ''
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const png = canvas.toBuffer('image/png')
      const dataUrl = 'data:image/png;base64,' + png.toString('base64')
      const pageText = await this.ocrImage(s, dataUrl)
      out += (i > 1 ? '\n' : '') + `[第${i}页]\n` + pageText
    }
    return out || '（OCR 未识别到文字）'
  }

  /** 对外封装：传入图片 data URL，自动鉴权后调用多模态模型做 OCR 文字识别 */
  async recognizeImage(teacherId: string, dataUrl: string): Promise<string> {
    const s = await this.buildSettings(teacherId)
    return this.ocrImage(s, dataUrl)
  }

  /**
   * 调用多模态模型识别单张图片中的文字（公开方法，供课程表等导入场景复用）
   * @param imageBase64 图片 base64（不含 data: 前缀），由调用方拼好 data URL
   */
  async ocrImage(s: any, dataUrl: string): Promise<string> {
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model: s.visionModel,
        temperature: 0,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              '你是 OCR 文字识别助手。请识别图片中的所有文字，保持原有段落与排版顺序，直接输出识别到的纯文本，不要添加任何解释或前缀。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请识别这张图片里的所有文字：' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
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
    return resp.data?.choices?.[0]?.message?.content || ''
  }

  /** Excel 工作簿转为「每个工作表一段 CSV」的文本（公开方法，供导入场景复用） */
  parseExcel(buf: Buffer): string {
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      const csv = XLSX.utils.sheet_to_csv(ws)
      return `—— 工作表「${name}」——\n${csv}`
    })
    return sheets.join('\n\n')
  }

  /**
   * 组装发给模型的消息：
   * 1) 系统提示 + 自动注入的本地上下文（教师/班级/学生/成绩等）+ 历史消息；
   * 2) 若本次携带 files，把解析后的文本作为一条 text 部分追加到最后一条用户消息（没有则新建一条）。
   * 图片以 OpenAI 视觉格式（image_url）原样保留，模型选择逻辑不变。
   */
  private async buildMessages(body: any, s: any, teacherId?: string): Promise<any[]> {
    const sysParts: string[] = []
    if (s.systemPrompt) sysParts.push(s.systemPrompt)
    // 自动注入本地上下文（对齐 web buildContext，由后端构造）
    if (teacherId) {
      try {
        const ctx = await this.buildLocalContext(teacherId)
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
      const fileText = await this.extractFilesText(body.files, s)
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
   */
  private async buildLocalContext(teacherId: string): Promise<string> {
    const lines: string[] = ['—— 已注入教师本地数据（仅供 AI 参考，回答时基于此数据，不要编造） ——']
    // 教师本人
    const u = await this.userRepo.findOne({ where: { id: teacherId } as any }).catch(() => null)
    if (u) {
      lines.push(
        `# 当前教师\n姓名: ${u.name || '-'} | 学校: ${u.school || '-'} | 任教学科: ${u.subject || '-'} | 任教学期: ${u.term || '-'}`,
      )
    }
    // 班级（限 20 个）
    const classes = (await this.classRepo.find({ take: 20 }).catch(() => [])) as any[]
    if (classes.length) {
      lines.push('# 班级列表')
      lines.push(classes.map((c, i) => `${i + 1}. ${c.name || '-'}（${c.studentCount || '?'}人，班主任：${c.headTeacher || '-'}）`).join('\n'))
    }
    // 学生（限 50 个，按班级聚合）
    const students = (await this.studentRepo.find({ take: 50 }).catch(() => [])) as any[]
    if (students.length) {
      lines.push('# 学生名单（最多 50 条）')
      lines.push(students.map((s) => `- ${s.name || '-'} | 学号: ${s.studentNo || '-'} | 性别: ${s.gender || '-'} | 班级ID: ${s.classId || '-'}`).join('\n'))
    }
    // 教师通讯录（限 20 条）
    const teachers = (await this.teacherRepo.find({ take: 20 }).catch(() => [])) as any[]
    if (teachers.length) {
      lines.push('# 教师通讯录（最多 20 条）')
      lines.push(teachers.map((t) => `- ${t.name || '-'} | 学科: ${t.subject || '-'} | 电话: ${t.phone || '-'}`).join('\n'))
    }
    // 最近成绩（限 30 条）
    const grades = (await this.gradeRepo.find({ take: 30, order: { createdAt: 'DESC' } as any }).catch(() => [])) as any[]
    if (grades.length) {
      lines.push('# 最近成绩记录（最多 30 条）')
      lines.push(grades.map((g) => `- 学生ID: ${g.studentId || '-'} | 科目: ${g.subject || '-'} | 分数: ${g.score ?? '-'} | 考试: ${g.examName || '-'}`).join('\n'))
    }
    // 考试（限 10 条）
    const exams = (await this.examRepo.find({ take: 10, order: { createdAt: 'DESC' } as any }).catch(() => [])) as any[]
    if (exams.length) {
      lines.push('# 最近考试（最多 10 条）')
      lines.push(exams.map((e) => `- ${e.name || '-'} | 班级ID: ${e.classId || '-'} | 科目: ${(e.subjects || []).join('/')}`).join('\n'))
    }
    // 奖惩记录（限 20 条）
    const awards = (await this.awardRepo.find({ take: 20, order: { createdAt: 'DESC' } as any }).catch(() => [])) as any[]
    if (awards.length) {
      lines.push('# 最近奖惩记录（最多 20 条）')
      lines.push(awards.map((a) => `- ${a.studentName || a.name || '-'} | 类型: ${a.type || '-'} | 等级: ${a.level || '-'} | 时间: ${a.date || '-'}`).join('\n'))
    }
    // 笔记（限 10 条）
    const notes = (await this.noteRepo.find({ take: 10, order: { createdAt: 'DESC' } as any }).catch(() => [])) as any[]
    if (notes.length) {
      lines.push('# 最近笔记（最多 10 条标题）')
      lines.push(notes.map((n) => `- ${n.title || '-'}`).join('\n'))
    }
    return lines.length > 1 ? lines.join('\n\n') : ''
  }

  /**
   * 流式对话：密钥与服务端配置均在后端，小程序只传消息。
   * onDelta 每收到一段文本回调一次（用于 SSE 推送给前端）。
   */
  async chatStream(
    teacherId: string,
    body: any,
    onDelta: (text: string) => void,
  ): Promise<void> {
    const s = await this.buildSettings(teacherId)
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s, teacherId)
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

  /** 解析 OpenAI 流式响应（SSE） */
  private pipeSse(stream: any, onDelta: (t: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      let buf = ''
      stream.on('data', (chunk: Buffer) => {
        buf += chunk.toString('utf8')
        let idx: number
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) onDelta(delta as string)
          } catch {
            /* 忽略非 JSON 行 */
          }
        }
      })
      stream.on('end', () => resolve())
      stream.on('error', (e: Error) => reject(e))
    })
  }

  /**
   * 同步对话：一次性返回完整文本。
   * 微信小程序 wx.request 不支持 SSE 流式，前端用此接口。
   */
  async chatSync(teacherId: string, body: any): Promise<string> {
    const s = await this.buildSettings(teacherId)
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s, teacherId)
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
    return resp.data?.choices?.[0]?.message?.content || ''
  }

  /** 非流式结构化解析：把非结构化文本交给 AI 解析为 JSON 数组 */
  async parse(
    teacherId: string,
    body: { text: string; instruction?: string },
  ): Promise<any> {
    const s = await this.buildSettings(teacherId)
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

  /** AI 文生图：调用服务商图片生成接口，返回图片 URL 数组 */
  async genImage(teacherId: string, body: any): Promise<{ urls: string[] }> {
    const s = await this.buildSettings(teacherId)
    const model = body.imageModel || s.imageModel || s.textModel
    const prompt = body.prompt
    if (!prompt) throw new BadRequestException('请输入图片描述')
    
    // 多数 OpenAI 兼容服务商支持 images/generations
    try {
      const resp = await axios.post(
        `${s.baseUrl}/images/generations`,
        { model, prompt, n: body.n || 1, size: body.size || '1024x1024' },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 120000,
        },
      )
      const urls: string[] = (resp.data?.data || []).map((d: any) => d.url || d.b64_json).filter(Boolean)
      return { urls }
    } catch (e: any) {
      // 如果 images/generations 不支持, 回退用 chat/completions 描述生成 base64
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [{ role: 'user', content: `请根据以下描述生成一张图片的详细视觉说明：${prompt}\n请返回JSON: {"description":"图片描述"}` }],
          stream: false,
        },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 60000,
        },
      )
      const content = resp.data?.choices?.[0]?.message?.content || ''
      return { urls: [] }
    }
  }

  /** AI 文生视频：调用服务商视频生成接口，返回任务ID或文件URL */
  async genVideo(teacherId: string, body: any): Promise<{ taskId?: string; url?: string }> {
    const s = await this.buildSettings(teacherId)
    const model = body.videoModel || s.videoModel || ''
    const prompt = body.prompt
    if (!prompt) throw new BadRequestException('请输入视频描述')
    if (!model) throw new BadRequestException('当前服务商不支持视频生成，请在设置中配置视频模型')

    try {
      const resp = await axios.post(
        `${s.baseUrl}/videos/generations`,
        { model, prompt, resolution: body.resolution || '720p', duration: body.duration || 5 },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 300000,
        },
      )
      return { taskId: resp.data?.task_id, url: resp.data?.video_url || resp.data?.url }
    } catch (e: any) {
      return { url: '' }
    }
  }

  /** 语音识别 ASR：用多模态模型处理音频数据 */
  async asr(teacherId: string, body: { audio: string; format?: string }): Promise<{ text: string }> {
    if (!body.audio) return { text: '' }
    try {
      const s = await this.buildSettings(teacherId)
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [
            { role: 'user', content: [{ type: 'text', text: '请将这段音频内容转写为文字，只输出转写结果。' }, { type: 'audio_url', audio_url: { url: `data:audio/${body.format || 'wav'};base64,${body.audio}` } }] },
          ],
          stream: false,
        },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 60000,
        },
      )
      const text = resp.data?.choices?.[0]?.message?.content || ''
      return { text }
    } catch {
      return { text: '' }
    }
  }

  /** 图片 OCR：用多模态模型识别图片中的文字 */
  async ocr(teacherId: string, body: { image: string }): Promise<{ text: string }> {
    if (!body.image) return { text: '' }
    try {
      const s = await this.buildSettings(teacherId)
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [
            { role: 'user', content: [{ type: 'text', text: '请识别这张图片中的所有文字，按原文顺序输出，不要解释。如果图片中没有清晰文字，请返回「未识别到文字」。' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.image}` } }] },
          ],
          stream: false,
        },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 60000,
        },
      )
      const text = resp.data?.choices?.[0]?.message?.content || ''
      return { text }
    } catch {
      return { text: '' }
    }
  }
}
