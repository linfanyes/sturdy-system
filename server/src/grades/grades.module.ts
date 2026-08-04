import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Grade, GradeScore } from './grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Exam } from '../exams/exam.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import { AiModule } from '../ai/ai.module'
import { AiService } from '../ai/ai.service'

const GRADE_INSTRUCTION = `这是一份成绩单（图片 OCR 或文件提取后的文本），请识别其中每个学生及其分数并输出 JSON 数组。每个元素结构：
{ "name": "学生姓名", "studentNo": "学号(可选)", "score": "分数(数字或空字符串表示缺考)" }
规则：
- 只识别真实学生成绩行，跳过表头/标题/合计/平均分/排名行；
- 分数统一为数字（不含小数则整数，含小数保留一位）；
- 缺考/空值用空字符串表示；
- 只返回 JSON 数组，不要任何解释或前后缀文字。`

/** 一次考试一门学科的统计 */
interface SubjectStat {
  subject: string
  count: number
  total: number
  avg: number
  max: number
  min: number
  passRate: number
  excellentRate: number
  failCount: number
  scoreRange: number
  stdDev?: number
  distribution: { label: string; count: number }[]
}

interface GradeWithExam extends Grade {
  exam?: Exam
}

class GradesService extends CrudService<Grade> {
  constructor(
    @InjectRepository(Grade) repo: Repository<Grade>,
    @InjectRepository(Student) private stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ai: AiService,
    classMemberSvc: ClassMemberService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc)
  }

  async findAll(teacherId: string, classId?: string, skip = 0, take = 500, _term?: string, _date?: string, subject?: string, examName?: string) {
    const where: any = {}
    if (classId) {
      // 班主任或同班科任老师均可访问该班级成绩
      const canAccess = await this.classMemberSvc.canAccess(teacherId, classId)
      if (!canAccess) return { items: [], total: 0 }
      where.classId = classId
    } else {
      where.teacherId = teacherId
    }
    // 按科目 / 考试名精确过滤
    if (subject) where.subject = subject
    if (examName) where.examName = examName
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  async mergeGrade(teacherId: string, dto: any) {
    const existing = await this.repo.findOne({
      where: {
        classId: dto.classId,
        examName: dto.examName,
        subject: dto.subject,
        teacherId,
      } as any,
    })
    if (existing) {
      existing.scores = dto.scores
      existing.date = dto.date
      existing.examId = dto.examId ?? existing.examId
      await this.repo.save(existing)
      return { created: false, id: existing.id }
    }
    const g = await this.create(teacherId, dto)
    return { created: true, id: g.id }
  }

  private async parseFile(filename: string, dataBase64: string): Promise<string[][]> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    if (ext === 'xlsx' || ext === 'xls') {
      return xlsxFirstSheetToRows(buf)
    }
    const text = buf.toString('utf-8')
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\t|,/).map((c) => c.trim()))
  }

  async importPreview(
    teacherId: string,
    classId: string,
    filename: string,
    dataBase64: string,
  ) {
    const rawRows = await this.parseFile(filename, dataBase64)
    if (rawRows.length && /学号|姓名|name|student/i.test(String(rawRows[0][0]))) {
      rawRows.shift()
    }
    const students = await this.stuRepo.find({
      where: { classId } as any,
      take: 500,
    })
    const byNo = new Map(students.map((s) => [s.studentNo, s]))
    const byName = new Map(students.map((s) => [s.name, s]))

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const key = String(r[0] || '').trim()
      const scoreRaw = String(r[1] ?? '').trim()
      const stu =
        (key && byNo.get(key)) || (key && byName.get(key)) || undefined
      let error = ''
      let score: number | null = null
      if (!stu) error = '找不到对应学生（按学号/姓名）'
      else if (scoreRaw === '') {
        /* 缺考视为空，允许 */
      } else if (!/^\d+(\.\d+)?$/.test(scoreRaw))
        error = '分数须为数字'
      else {
        score = Number(scoreRaw)
        if (score < 0 || score > 1000) error = '分数超出合理范围(0-1000)'
      }
      if (error) errorCount++
      else validCount++
      rows.push({
        studentId: stu ? stu.id : null,
        name: stu ? stu.name : key,
        studentNo: stu ? stu.studentNo : '',
        score,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount, total: rawRows.length }
  }

  async importGrades(teacherId: string, dto: any) {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Grade)
      const scores: GradeScore[] = (dto.rows || [])
        .filter((r: any) => r.valid && r.studentId)
        .map((r: any) => ({ studentId: r.studentId, score: r.score }))
      if (!scores.length) throw new BadRequestException('没有可导入的有效成绩')
      const existing = await repo.findOne({
        where: {
          classId: dto.classId,
          examName: dto.examName,
          subject: dto.subject,
          teacherId,
        } as any,
      })
      if (existing) {
        existing.scores = scores
        existing.date = dto.date
        existing.examId = dto.examId ?? existing.examId
        await repo.save(existing)
        return { created: false, id: existing.id, count: scores.length }
      }
      const g = new Grade()
      Object.assign(g, {
        classId: dto.classId,
        subject: dto.subject,
        examName: dto.examName,
        examId: dto.examId || null,
        date: dto.date,
        scores,
        teacherId,
      })
      const saved = await repo.save(g)
      return { created: true, id: saved.id, count: scores.length }
    })
  }

  async importAi(
    teacherId: string,
    classId: string,
    mode: string,
    data: string,
    filename: string,
  ) {
    if (!data) throw new BadRequestException('缺少文件数据')
    const ext = (filename || '').split('.').pop() || ''
    let text = ''

    if (mode === 'image') {
      const mime = /png/i.test(ext)
        ? 'image/png'
        : /jpe?g/i.test(ext)
          ? 'image/jpeg'
          : 'image/png'
      text = await this.ai.recognizeImage('teacher', teacherId, `data:${mime};base64,${data}`)
    } else {
      const buf = Buffer.from(data, 'base64')
      if (/xlsx?/i.test(ext)) {
        text = await this.ai.parseExcel(buf)
      } else {
        text = buf.toString('utf-8')
      }
    }

    let parsed: any[] = []
    try {
      parsed = await this.ai.parse('teacher', teacherId, { text, instruction: GRADE_INSTRUCTION })
    } catch (e: any) {
      throw new BadRequestException('AI 解析失败：' + (e?.message || e))
    }
    if (!Array.isArray(parsed)) parsed = []

    const students = await this.stuRepo.find({ where: { classId } as any, take: 500 })
    const byNo = new Map(students.map((s) => [s.studentNo, s]))
    const byName = new Map(students.map((s) => [s.name, s]))

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    parsed.forEach((raw, i) => {
      const name = String(raw?.name || '').trim()
      const studentNo = String(raw?.studentNo || '').trim()
      const scoreRaw = String(raw?.score ?? '').trim()
      const stu =
        (studentNo && byNo.get(studentNo)) ||
        (name && byName.get(name)) ||
        undefined
      let error = ''
      let score: number | null = null
      if (!stu) error = '找不到对应学生（按学号/姓名）'
      else if (scoreRaw === '') {
        /* 缺考视为空，允许 */
      } else if (!/^\d+(\.\d+)?$/.test(scoreRaw)) {
        error = '分数须为数字'
      } else {
        score = Number(scoreRaw)
        if (score < 0 || score > 1000) error = '分数超出合理范围(0-1000)'
      }
      if (error) errorCount++
      else validCount++
      rows.push({
        studentId: stu ? stu.id : null,
        name: stu ? stu.name : (name || studentNo),
        studentNo: stu ? stu.studentNo : studentNo,
        score,
        line: i + 1,
        valid: !error,
        error,
      })
    })
    return { rows, validCount, errorCount, total: parsed.length }
  }

  // ====== 成绩分析增强 ======

  /** 计算一门学科的统计数据 */
  private computeSubjectStat(grades: GradeScore[], fullScore = 100): SubjectStat {
    const scores = grades.filter((s) => s.score != null).map((s) => Number(s.score!))
    const count = scores.length
    if (!count) {
      return {
        subject: '',
        count: 0,
        total: 0,
        avg: 0,
        max: 0,
        min: 0,
        passRate: 0,
        excellentRate: 0,
        failCount: 0,
        scoreRange: 0,
        distribution: [],
      }
    }
    const total = scores.reduce((a, b) => a + b, 0)
    const avg = total / count
    const max = Math.max(...scores)
    const min = Math.min(...scores)
    const passLine = fullScore * 0.6
    const excellentLine = fullScore * 0.85
    const passCount = scores.filter((s) => s >= passLine).length
    const excellentCount = scores.filter((s) => s >= excellentLine).length
    const failCount = scores.filter((s) => s < passLine).length

    // 分布 5 段：<60, 60-69, 70-79, 80-89, 90-100
    const bins = [0, 0, 0, 0, 0]
    for (const s of scores) {
      if (s < 60) bins[0]++
      else if (s < 70) bins[1]++
      else if (s < 80) bins[2]++
      else if (s < 90) bins[3]++
      else bins[4]++
    }
    const distribution = [
      { label: '不及格(<60)', count: bins[0] },
      { label: '及格(60-69)', count: bins[1] },
      { label: '中等(70-79)', count: bins[2] },
      { label: '良好(80-89)', count: bins[3] },
      { label: '优秀(90+)', count: bins[4] },
    ]

    // 标准差
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / count
    const stdDev = Math.sqrt(variance)

    return {
      subject: '',
      count,
      total,
      avg: Math.round(avg * 10) / 10,
      max,
      min,
      passRate: Math.round((passCount / count) * 1000) / 10,
      excellentRate: Math.round((excellentCount / count) * 1000) / 10,
      failCount,
      scoreRange: max - min,
      stdDev: Math.round(stdDev * 10) / 10,
      distribution,
    }
  }

  /** 校验班级访问权限（班主任或同班科任老师均可） */
  private async assertClassAccess(teacherId: string, classId: string): Promise<void> {
    const canAccess = await this.classMemberSvc.canAccess(teacherId, classId)
    if (!canAccess) throw new BadRequestException('无权访问该班级成绩')
  }

  /**
   * 单场考试统计：按班级+考试id聚合各学科指标
   * - 支持 fullScoreMap（每科满分）
   * - 返回各学科统计 + 班级总均分 + 薄弱学科 TopN + 优秀学科 TopN
   */
  async examStats(
    teacherId: string,
    classId: string,
    examId: string,
    fullScoreMap: Record<string, number> = {},
  ) {
    await this.assertClassAccess(teacherId, classId)
    const grades = await this.repo.find({
      where: { classId, teacherId } as any,
      take: 500,
    })
    const byExam = grades.filter((g) => g.examId === examId)
    const subjectsStats: SubjectStat[] = []
    for (const g of byExam) {
      const stat = this.computeSubjectStat(g.scores || [], fullScoreMap[g.subject] || 100)
      stat.subject = g.subject
      subjectsStats.push(stat)
    }
    const classAvg = subjectsStats.length
      ? Math.round(
          (subjectsStats.reduce((s, x) => s + x.avg * x.count, 0) /
            subjectsStats.reduce((s, x) => s + x.count, 0)) *
            10,
        ) / 10
      : 0
    const weak = [...subjectsStats].sort((a, b) => a.avg - b.avg).slice(0, 3)
    const strong = [...subjectsStats].sort((a, b) => b.avg - a.avg).slice(0, 3)
    return {
      classId,
      examId,
      classAvg,
      totalStudents: subjectsStats.reduce((s, x) => s + x.count, 0),
      subjects: subjectsStats,
      weakSubjects: weak,
      strongSubjects: strong,
    }
  }

  /**
   * 多场考试趋势：按班级+科目聚合多次考试的均分轨迹
   */
  async examTrend(teacherId: string, classId: string, subject?: string) {
    await this.assertClassAccess(teacherId, classId)
    const grades = await this.repo.find({
      where: { classId, teacherId } as any,
      order: { date: 'ASC' } as any,
      take: 1000,
    })
    const filtered = subject ? grades.filter((g) => g.subject === subject) : grades
    const trendBySubject: Record<string, { date: string; examName: string; avg: number; count: number }[]> = {}
    for (const g of filtered) {
      const scores = (g.scores || []).filter((s) => s.score != null).map((s) => Number(s.score!))
      if (!scores.length) continue
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (!trendBySubject[g.subject]) trendBySubject[g.subject] = []
      trendBySubject[g.subject].push({
        date: g.date,
        examName: g.examName,
        avg: Math.round(avg * 10) / 10,
        count: scores.length,
      })
    }
    return { classId, trend: trendBySubject }
  }

  /**
   * 学生班级排名：按考试+科目，返回每个学生的分数、班级排名、百分位
   */
  async classRank(
    teacherId: string,
    classId: string,
    examId: string,
    subject?: string,
  ) {
    await this.assertClassAccess(teacherId, classId)
    const grades = await this.repo.find({
      where: { classId, teacherId } as any,
      take: 500,
    })
    const byExam = grades.filter((g) => g.examId === examId)
    const students = await this.stuRepo.find({ where: { classId } as any, take: 500 })
    const studentMap = new Map(students.map((s) => [s.id, s]))
    const result: any[] = []

    for (const g of byExam) {
      if (subject && g.subject !== subject) continue
      const sorted = (g.scores || [])
        .filter((s) => s.score != null)
        .sort((a, b) => Number(b.score) - Number(a.score))
      const total = sorted.length
      sorted.forEach((entry, idx) => {
        const stu = studentMap.get(entry.studentId)
        result.push({
          examId,
          subject: g.subject,
          studentId: entry.studentId,
          studentName: stu?.name || '',
          studentNo: stu?.studentNo || '',
          score: entry.score,
          rank: idx + 1,
          total,
          percentile: Math.round(((total - idx - 1) / total) * 1000) / 10,
        })
      })
    }
    return { examId, classId, ranks: result }
  }

  /**
   * 学生个人历次考试成绩与趋势
   * - 班主任：可看该学生全科目成绩
   * - 科任老师：仅可看自己教授科目的成绩
   */
  async studentHistory(teacherId: string, studentId: string) {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    // 班主任或同班科任老师均可访问
    const canAccess = await this.classMemberSvc.canAccess(teacherId, stu.classId)
    if (!canAccess) throw new BadRequestException('无权访问该学生成绩')
    // 获取教师在该班级的角色和学科（用于科任老师过滤）
    const role = await this.classMemberSvc.getRole(teacherId, stu.classId)
    const allowedSubjects = role === 'head' ? null : await this.classMemberSvc.getAllSubjects(teacherId, stu.classId)
    const grades = await this.repo.find({
      where: { classId: stu.classId } as any,
      order: { date: 'DESC' } as any,
      take: 1000,
    })
    const history: any[] = []
    const subjectLatest: Record<string, number[]> = {}
    for (const g of grades) {
      // 科任老师只能看自己教的科目
      if (allowedSubjects && !allowedSubjects.includes(g.subject)) continue
      const entry = (g.scores || []).find((s) => s.studentId === studentId)
      if (!entry || entry.score == null) continue
      history.push({
        date: g.date,
        examName: g.examName,
        subject: g.subject,
        score: entry.score,
        examId: g.examId,
      })
      if (!subjectLatest[g.subject]) subjectLatest[g.subject] = []
      subjectLatest[g.subject].push(entry.score)
    }
    const subjects: Record<string, { avg: number; trend: 'up' | 'down' | 'flat' }> = {}
    for (const [sub, arr] of Object.entries(subjectLatest)) {
      arr.sort((a, b) => a - b)
      const avg = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      const first = arr[0]
      const last = arr[arr.length - 1]
      const trend: 'up' | 'down' | 'flat' = last > first + 3 ? 'up' : last < first - 3 ? 'down' : 'flat'
      subjects[sub] = { avg, trend }
    }
    return { studentId, studentName: stu.name, history, subjects }
  }

  /**
   * 薄弱知识点分析：按班级返回每门学科低于班级均分的学生
   */
  async weakStudents(teacherId: string, classId: string, examId?: string) {
    await this.assertClassAccess(teacherId, classId)
    const where: any = { classId, teacherId }
    if (examId) where.examId = examId
    const grades = await this.repo.find({ where, take: 500 })
    const students = await this.stuRepo.find({ where: { classId } as any, take: 500 })
    const studentMap = new Map(students.map((s) => [s.id, s]))
    const result: any[] = []
    for (const g of grades) {
      const scores = (g.scores || []).filter((s) => s.score != null).map((s) => Number(s.score!))
      if (!scores.length) continue
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const weakList = (g.scores || [])
        .filter((s) => s.score != null && Number(s.score!) < avg)
        .map((s) => {
          const stu = studentMap.get(s.studentId)
          return {
            studentId: s.studentId,
            studentName: stu?.name || '',
            studentNo: stu?.studentNo || '',
            score: s.score,
            gap: Math.round((avg - Number(s.score!)) * 10) / 10,
          }
        })
        .sort((a, b) => a.gap - b.gap)
      result.push({
        examId: g.examId,
        examName: g.examName,
        subject: g.subject,
        classAvg: Math.round(avg * 10) / 10,
        weakCount: weakList.length,
        weakList: weakList.slice(0, 10),
      })
    }
    return { classId, weakSubjects: result }
  }
}

@Roles('teacher')
@Feature('grades')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('grades')
class GradesController extends CrudController<Grade> {
  constructor(s: GradesService) {
    super(s)
  }

  /** 覆写 findAll：支持 subject/examName 精确过滤（成绩矩阵按考试/科目筛选） */
  @Get()
  findAll(
    @CurrentTeacher() t: any,
    @Query('classId') classId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('term') term?: string,
    @Query('date') date?: string,
    @Query('subject') subject?: string,
    @Query('examName') examName?: string,
  ) {
    const n = Number(take) || 0
    return (this.service as GradesService).findAll(
      t.sub,
      classId,
      Number(skip) || 0,
      n > 0 ? Math.min(n, 500) : 500,
      term,
      date,
      subject,
      examName,
    )
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  merge(@Body() dto: any, @CurrentTeacher() t: any) {
    return (this.service as GradesService).mergeGrade(t.sub, dto)
  }

  @Post('import-preview')
  @UseGuards(JwtAuthGuard)
  importPreview(
    @Body() body: { classId: string; filename: string; data: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.filename || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importPreview(
      t.sub,
      body.classId,
      body.filename,
      body.data,
    )
  }

  @Post('import-commit')
  @UseGuards(JwtAuthGuard)
  importCommit(@Body() body: any, @CurrentTeacher() t: any) {
    if (!body?.classId || !body?.examName || !body?.subject)
      throw new BadRequestException('缺少班级/考试/科目')
    if (!Array.isArray(body.rows) || !body.rows.length)
      throw new BadRequestException('没有可导入的数据')
    return (this.service as GradesService).importGrades(t.sub, body)
  }

  @Post('import-ai')
  @UseGuards(JwtAuthGuard)
  importAi(
    @Body() body: { classId: string; mode: string; data: string; filename?: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.mode || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importAi(
      t.sub,
      body.classId,
      body.mode,
      body.data,
      body.filename || '',
    )
  }

  // ===== 成绩分析新端点 =====

  @Get('analysis/exam')
  @UseGuards(JwtAuthGuard)
  examStats(
    @Query('classId') classId: string,
    @Query('examId') examId: string,
    @Query('fullScoreMap') fullScoreMap: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId || !examId) throw new BadRequestException('缺少 classId 或 examId')
    let map: Record<string, number> = {}
    try {
      if (fullScoreMap) map = JSON.parse(fullScoreMap)
    } catch { /* ignore */ }
    return (this.service as GradesService).examStats(t.sub, classId, examId, map)
  }

  @Get('analysis/trend')
  @UseGuards(JwtAuthGuard)
  examTrend(
    @Query('classId') classId: string,
    @Query('subject') subject: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId) throw new BadRequestException('缺少 classId')
    return (this.service as GradesService).examTrend(t.sub, classId, subject || undefined)
  }

  @Get('analysis/rank')
  @UseGuards(JwtAuthGuard)
  classRank(
    @Query('classId') classId: string,
    @Query('examId') examId: string,
    @Query('subject') subject: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId || !examId) throw new BadRequestException('缺少 classId 或 examId')
    return (this.service as GradesService).classRank(t.sub, classId, examId, subject || undefined)
  }

  @Get('analysis/student/:studentId')
  @UseGuards(JwtAuthGuard)
  studentHistory(
    @Param('studentId') studentId: string,
    @CurrentTeacher() t: any,
  ) {
    return (this.service as GradesService).studentHistory(t.sub, studentId)
  }

  @Get('analysis/weak')
  @UseGuards(JwtAuthGuard)
  weakStudents(
    @Query('classId') classId: string,
    @Query('examId') examId: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId) throw new BadRequestException('缺少 classId')
    return (this.service as GradesService).weakStudents(t.sub, classId, examId || undefined)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Grade, Student, ClassItem, Exam]), ClassMembersModule, AiModule],
  providers: [GradesService],
  controllers: [GradesController],
})
export class GradesModule {}
