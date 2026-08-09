import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiChatService } from './ai-chat.service'
import { AiFileParserService } from './ai-file-parser.service'
import { AiVisionService } from './ai-vision.service'
import { AiMediaService } from './ai-media.service'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Student } from '../students/student.entity'
import { User } from '../users/user.entity'
import { BusinessException } from '../common/exceptions/business.exception'
import { getSubjectTool } from '@gardener/shared/schemas/subject-schema'

/**
 * AI 服务 Facade：对外保留原有公开方法名和签名（AiController 及其他模块直接依赖），
 * 内部委托给各子服务（对话/文件解析/视觉/媒体）完成具体逻辑，保证兼容性无需修改调用方。
 * A01修复：Controller 中的业务逻辑已移至此处，符合分层架构。
 */
@Injectable()
export class AiService {
  constructor(
    private readonly chat: AiChatService,
    private readonly fileParser: AiFileParserService,
    private readonly vision: AiVisionService,
    private readonly media: AiMediaService,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 学科工具访问校验（P1，A01：自 Controller 下沉）：
   * - body.subjectKey 命中 shared/schemas/subject-schema 的学科工具时，
   *   校验其所属学科是否在当前教师任教学科（subject/subjects）内。
   * - 非学科工具（通用 quicktool 等）或 school_admin 不拦截。
   */
  async assertSubjectToolAccess(role: string, teacherId: string, subjectKey?: string): Promise<void> {
    if (!subjectKey || role === 'school_admin') return
    const tool = getSubjectTool(subjectKey)
    if (!tool) return // 非学科工具，不拦截
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } as any }).catch(() => null)
    if (!teacher) return
    const allowed = Array.isArray(teacher.subjects) && teacher.subjects.length
      ? teacher.subjects
      : teacher.subject ? [teacher.subject] : []
    if (!allowed.includes(tool.subject)) {
      throw new BusinessException('SUBJECT_FORBIDDEN', `您无权使用「${tool.subject}」学科工具`)
    }
  }

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

  // ── 业务分析（A01修复：从 AiController 迁移至此）────────────────

  /** 非流式 AI 调用超时包装 */
  private withAiTimeout<T>(promise: Promise<T>): Promise<T> {
    const NON_STREAMING_TIMEOUT = 60000
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI 响应超时，请稍后重试或简化输入内容')), NON_STREAMING_TIMEOUT),
      ),
    ]) as Promise<T>
  }

  /** 全班考试成绩 AI 分析：取考试数据 → 按科目统计 → 大模型生成结构化分析报告 */
  async analyzeExam(examId: string, teacherId: string): Promise<{ content: string; structured?: any }> {
    const exam = await this.examRepo.findOne({ where: { id: examId } })
    if (!exam || exam.teacherId !== teacherId) return { content: '考试不存在或无权限' }
    // P02修复：使用更精确的查询条件，避免全班级扫描
    const grades = await this.gradeRepo.find({ where: { classId: exam.classId, examId: exam.id } })
    // 本次考试各科统计
    const currentStats = this.computeSubjectStats(grades)
    const fullScoreOf = (s: string) => (exam.subjectFullScores && exam.subjectFullScores[s]) || 100

    // 对比基线：上次同科考试（按班级考试日期排序，取本次之前最近一次）
    const allExams = await this.examRepo.find({ where: { classId: exam.classId } as any, order: { date: 'ASC' } as any })
    const prevExam = this.findPreviousExam(allExams, exam)
    let prevStats: Record<string, any> = {}
    if (prevExam) {
      const prevGrades = await this.gradeRepo.find({ where: { classId: exam.classId, examId: prevExam.id } })
      prevStats = this.computeSubjectStats(prevGrades)
    }

    // 全校同年级该科均分（近似为所有班级该科均分均值）
    const schoolStats = await this.computeSchoolSubjectStats()

    const lines: string[] = [
      `考试：${exam.name}（${exam.date}，${exam.term}）`,
      `科目：${(exam.subjects || []).join('、')}`,
      `班级人数：用于分析的学生来自该班考试记录`,
    ]
    for (const [subject, st] of Object.entries(currentStats)) {
      const full = fullScoreOf(subject)
      const passRate = (st.passCount / st.scores.length) * 100
      const excellentRate = (st.excellentCount / st.scores.length) * 100
      lines.push(
        `${subject}：均分${st.avg.toFixed(1)} / 最高${st.max} / 最低${st.min} / 及格${st.passCount}/${st.scores.length}人（${passRate.toFixed(1)}%） / 优秀${st.excellentCount}/${st.scores.length}人（${excellentRate.toFixed(1)}%） / 满分${full}`,
      )
    }

    // 对比基线描述
    const baselineLines: string[] = []
    for (const [subject, st] of Object.entries(currentStats)) {
      const passRate = (st.passCount / st.scores.length) * 100
      const excellentRate = (st.excellentCount / st.scores.length) * 100
      const prev = prevStats[subject]
      const school = schoolStats[subject]
      if (prev) {
        const delta = st.avg - prev.avg
        const passDelta = passRate - (prev.passCount / prev.scores.length) * 100
        const excelDelta = excellentRate - (prev.excellentCount / prev.scores.length) * 100
        baselineLines.push(
          `${subject} vs 上次（${prevExam?.name || '上次考试'}）：班均分${delta >= 0 ? '+' : ''}${delta.toFixed(1)}（本次${st.avg.toFixed(1)} / 上次${prev.avg.toFixed(1)}），及格率${passDelta >= 0 ? '+' : ''}${passDelta.toFixed(1)}%，优秀率${excelDelta >= 0 ? '+' : ''}${excelDelta.toFixed(1)}%`,
        )
      } else {
        baselineLines.push(`${subject}：暂无上次同科数据可比`)
      }
      if (school) {
        const schoolDelta = st.avg - school.avg
        baselineLines.push(
          `${subject} vs 全校同年级：班均分${schoolDelta >= 0 ? '+' : ''}${schoolDelta.toFixed(1)}（全校${school.avg.toFixed(1)}）`,
        )
      }
    }

    const prompt = `你是资深教务分析师。请根据以下班级考试成绩数据，生成一份分析报告，并严格以 JSON 对象输出（不要输出其他文本）。JSON 结构如下：
{
  "summary": "总体评价（一句话）",
  "strengths": ["亮点1", "亮点2"],
  "weaknesses": ["薄弱点1", "薄弱点2"],
  "suggestions": ["改进建议1（具体、可操作）", "改进建议2"],
  "focusStudents": ["需重点关注的学生姓名，若无可留空数组"]
}

本次考试数据：\n${lines.join('\n')}

对比基线：\n${baselineLines.join('\n')}`
    const content = await this.withAiTimeout(this.chatSync('teacher', teacherId, { messages: [{ role: 'user', content: prompt }] }))
    // 尝试从 AI 响应中解析结构化 JSON；失败则保留 content 兜底
    const structured = this.parseStructured(content)
    return { content, ...(structured ? { structured } : {}) }
  }

  /** 计算一组成绩按科目的统计信息 */
  private computeSubjectStats(grades: Grade[]): Record<string, { avg: number; max: number; min: number; passCount: number; excellentCount: number; scores: number[] }> {
    const stats: Record<string, any> = {}
    for (const g of grades) {
      const subject = g.subject
      const arr = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score!))
      if (!arr.length) continue
      if (!stats[subject]) stats[subject] = { avg: 0, max: 0, min: 0, passCount: 0, excellentCount: 0, scores: [] }
      stats[subject].scores.push(...arr)
    }
    for (const [subject, st] of Object.entries(stats)) {
      const arr = st.scores
      st.avg = arr.reduce((a: number, b: number) => a + b, 0) / arr.length
      st.max = Math.max(...arr)
      st.min = Math.min(...arr)
      st.passCount = arr.filter(v => v >= 60).length
      st.excellentCount = arr.filter(v => v >= 85).length
    }
    return stats
  }

  /** 找到本次考试之前最近的一次考试（按日期排序） */
  private findPreviousExam(allExams: Exam[], exam: Exam): Exam | null {
    const sorted = allExams
      .filter(e => e.id !== exam.id && (e.date < exam.date || (e.date === exam.date && e.createdAt < exam.createdAt)))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    return sorted[0] || null
  }

  /** 全校各科均分（近似：所有班级该科均分均值） */
  private async computeSchoolSubjectStats(): Promise<Record<string, { avg: number }>> {
    const allGrades = await this.gradeRepo.find({ take: 2000 })
    const bySubject: Record<string, number[]> = {}
    for (const g of allGrades) {
      const arr = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score!))
      if (!arr.length) continue
      if (!bySubject[g.subject]) bySubject[g.subject] = []
      bySubject[g.subject].push(...arr)
    }
    const out: Record<string, { avg: number }> = {}
    for (const [subject, arr] of Object.entries(bySubject)) {
      out[subject] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length }
    }
    return out
  }

  /** 从 AI 响应文本中解析 JSON 对象；失败返回 null */
  private parseStructured(content: string): any {
    if (!content) return null
    const trimmed = content.trim()
    // 尝试直接解析
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* 忽略 */ }
    // 尝试从 ```json ... ``` 代码块提取
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      try {
        const parsed = JSON.parse(fenceMatch[1].trim())
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      } catch { /* 忽略 */ }
    }
    // 尝试提取第一个 { ... } 片段
    const braceMatch = trimmed.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try {
        const parsed = JSON.parse(braceMatch[0])
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      } catch { /* 忽略 */ }
    }
    return null
  }

  /** 学生个体学情 AI 诊断：取该生历次成绩 → 趋势 → 诊断建议 */
  async diagnose(studentId: string, teacherId: string): Promise<{ content: string }> {
    const stu = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!stu || stu.teacherId !== teacherId) return { content: '学生不存在或无权限' }
    // 通过 scores 数组中的 studentId 过滤（Grade 实体无 studentId 顶层字段）
    const grades = await this.gradeRepo.find({ where: { classId: stu.classId } })
    const lines: string[] = [`学生：${stu.name}（${stu.gender}）`, `班级：${stu.classId}`]
    for (const g of grades) {
      const entry = (g.scores || []).find(s => s.studentId === studentId)
      if (!entry || entry.score == null) continue
      lines.push(`${g.examName || '测验'} ${g.subject}：${entry.score}分（${g.date}）`)
    }
    if (lines.length <= 2) return { content: '该生暂无成绩数据，无法生成诊断报告。' }
    const prompt = `你是资深教育诊断师。请根据以下学生成绩记录，生成一份学情诊断报告：
1) 学业趋势（上升/稳定/下滑）
2) 优势学科与薄弱学科
3) 针对性提升建议（具体、可操练）
\n${lines.join('\n')}`
    const content = await this.withAiTimeout(this.chatSync('teacher', teacherId, { messages: [{ role: 'user', content: prompt }] }))
    return { content }
  }
}
