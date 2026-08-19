import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { BadRequestException } from '@nestjs/common'
import { Grade, GradeScore } from './grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Exam } from '../exams/exam.entity'
import { User } from '../users/user.entity'
import { CrudService } from '../common/crud/base.service'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { parseFileToRows } from '../common/file-parser.util'
import { AiModule } from '../ai/ai.module'
import { AiService } from '../ai/ai.service'
import { GRADE_INSTRUCTION, SubjectStat, WeakSubjectResult } from './grades.types'

// P1修复：scores 结构校验 - 防止恶意/畸形数据污染成绩记录
const MAX_TAKE = 500
function validateScores(scores: any): GradeScore[] {
  if (!Array.isArray(scores)) throw new BadRequestException('scores 必须是数组')
  if (scores.length > 200) throw new BadRequestException('单次成绩条数不能超过 200')
  return scores.map((s: any, i: number) => {
    if (!s || typeof s !== 'object') throw new BadRequestException(`scores[${i}] 格式错误`)
    if (typeof s.studentId !== 'string' || !s.studentId) {
      throw new BadRequestException(`scores[${i}].studentId 不能为空`)
    }
    if (s.score != null && (typeof s.score !== 'number' || s.score < 0 || s.score > 1000)) {
      throw new BadRequestException(`scores[${i}].score 必须在 0-1000 之间`)
    }
    return { studentId: s.studentId, score: s.score == null ? null : Number(s.score) }
  })
}

export class GradesService extends CrudService<Grade> {
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

  async findAll(user: any, classId?: string, skip = 0, take = 500, _term?: string, _date?: string, subject?: string, examName?: string) {
    // P1修复：take 硬限制，防止客户端请求过大导致内存溢出
    if (take > MAX_TAKE || take <= 0) take = MAX_TAKE
    const isSchoolAdmin = user?.role === 'school_admin'
    const where: any = {}
    let allowedSubjects: string[] | null = null
    if (classId) {
      const canAccess = await this.canAccessClass(user, classId)
      if (!canAccess) return { items: [], total: 0 }
      where.classId = classId
      if (!isSchoolAdmin) {
        const role = await this.classMemberSvc.getRole(user.sub, classId)
        if (role !== 'head') {
          allowedSubjects = await this.classMemberSvc.getAllSubjects(user.sub, classId)
        }
      }
    } else if (isSchoolAdmin) {
      // 校管必须指定班级，避免跨校泄露
      return { items: [], total: 0 }
    } else {
      where.teacherId = user.sub
    }
    if (subject) where.subject = subject
    if (examName) where.examName = examName
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    if (allowedSubjects && allowedSubjects.length) {
      const filtered = items.filter((g) => allowedSubjects.includes(g.subject))
      return { items: filtered, total: filtered.length }
    }
    return { items, total }
  }

  async mergeGrade(teacherId: string, dto: any) {
    await this.assertSubjectPermission(teacherId, dto.classId, dto.subject)
    const scores = validateScores(dto.scores)
    const where: any = {
        classId: dto.classId,
        subject: dto.subject,
        teacherId,
    }
    if (dto.examId) {
        where.examId = dto.examId
    } else {
        where.examName = dto.examName
    }
    const existing = await this.repo.findOne({ where })
    if (existing) {
      existing.scores = scores
      existing.date = dto.date
      existing.examId = dto.examId ?? existing.examId
      await this.repo.save(existing)
      return { created: false, id: existing.id }
    }
    const g = await this.create(teacherId, { ...dto, scores })
    return { created: true, id: g.id }
  }

  private async parseFile(filename: string, dataBase64: string): Promise<string[][]> {
    const { rows } = await parseFileToRows(filename, dataBase64)
    return rows
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
    await this.assertSubjectPermission(teacherId, dto.classId, dto.subject)
    // P2修复：使用 SERIALIZABLE 隔离级别防止并发导入覆盖
    return await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const repo = manager.getRepository(Grade)
      const classStudents = await this.stuRepo.find({ where: { classId: dto.classId }, select: ['id'] as any })
      const classStudentIds = new Set(classStudents.map((s) => s.id))
      const inRange = (v: any) => v == null || (typeof v === 'number' && v >= 0 && v <= 1000)
      const scores: GradeScore[] = (dto.rows || [])
        .filter((r: any) => r.valid && r.studentId && classStudentIds.has(r.studentId) && inRange(r.score))
        .map((r: any) => ({ studentId: r.studentId, score: r.score == null ? null : Number(r.score) }))
      if (!scores.length) throw new BadRequestException('没有可导入的有效成绩')
      const where: any = {
            classId: dto.classId,
            subject: dto.subject,
            teacherId,
          }
          if (dto.examId) {
            where.examId = dto.examId
          } else {
            where.examName = dto.examName
          }
          const existing = await repo.findOne({ where })
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

  /** 通用班级访问校验：teacher 走 class_member 表，school_admin 走学校归属 */
  private async canAccessClass(user: any, classId: string): Promise<boolean> {
    if (user?.role === 'school_admin') {
      const cls = await this.classRepo.findOne({ where: { id: classId } as any })
      if (!cls) return false
      const teacher = await this.dataSource.getRepository(User).findOne({ where: { id: cls.teacherId, schoolId: user.schoolId } as any })
      return !!teacher
    }
    return this.classMemberSvc.canAccess(user.sub, classId)
  }

  private async assertSubjectPermission(teacherId: string, classId: string, subject: string): Promise<void> {
    const role = await this.classMemberSvc.getRole(teacherId, classId)
    if (role === 'head') return
    const allowedSubjects = await this.classMemberSvc.getAllSubjects(teacherId, classId)
    if (!allowedSubjects.includes(subject)) {
      throw new BadRequestException(`无权操作学科「${subject}」的成绩`)
    }
  }

  private async loadVisibleClassGrades(user: any, classId: string): Promise<Grade[]> {
    const isSchoolAdmin = user?.role === 'school_admin'
    const canAccess = await this.canAccessClass(user, classId)
    if (!canAccess) throw new BadRequestException('无权访问该班级成绩')
    let allowedSubjects: string[] | null = null
    if (!isSchoolAdmin) {
      const role = await this.classMemberSvc.getRole(user.sub, classId)
      allowedSubjects = role === 'head' ? null : await this.classMemberSvc.getAllSubjects(user.sub, classId)
    }
    const grades = await this.repo.find({
      where: { classId } as any,
      order: { date: 'ASC' } as any,
      take: 1000,
    })
    if (!allowedSubjects) return grades
    return grades.filter((g) => allowedSubjects.includes(g.subject))
  }

  async examStats(
    user: any,
    classId: string,
    examId: string,
    fullScoreMap: Record<string, number> = {},
  ) {
    const grades = await this.loadVisibleClassGrades(user, classId)
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

  async examTrend(user: any, classId: string, subject?: string) {
    let grades = await this.loadVisibleClassGrades(user, classId)
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

  async classRank(
    user: any,
    classId: string,
    examId: string,
    subject?: string,
  ) {
    const grades = await this.loadVisibleClassGrades(user, classId)
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
      let prevScore: number | null = null
      let prevRank = 0
      sorted.forEach((entry, idx) => {
        const score = Number(entry.score)
        let rank: number
        if (prevScore === null || score !== prevScore) {
          rank = idx + 1
          prevScore = score
          prevRank = rank
        } else {
          rank = prevRank
        }
        const stu = studentMap.get(entry.studentId)
        result.push({
          examId,
          subject: g.subject,
          studentId: entry.studentId,
          studentName: stu?.name || '',
          studentNo: stu?.studentNo || '',
          score: entry.score,
          rank,
          total,
          percentile: Math.round(((total - idx - 1) / total) * 1000) / 10,
        })
      })
    }
    return { examId, classId, ranks: result }
  }

  async studentHistory(user: any, studentId: string) {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const canAccess = await this.canAccessClass(user, stu.classId)
    if (!canAccess) throw new BadRequestException('无权访问该学生成绩')
    let allowedSubjects: string[] | null = null
    if (user?.role !== 'school_admin') {
      const role = await this.classMemberSvc.getRole(user.sub, stu.classId)
      allowedSubjects = role === 'head' ? null : await this.classMemberSvc.getAllSubjects(user.sub, stu.classId)
    }
    // 兼容 SQLite（测试）与 MySQL（生产）：SQLite 不支持 JSON_CONTAINS，改为应用层过滤
    const allGrades = await this.repo
      .createQueryBuilder('g')
      .where('g.classId = :classId', { classId: stu.classId })
      .orderBy('g.date', 'DESC')
      .limit(200)
      .getMany()
    const grades = allGrades.filter((g) => (g.scores || []).some((s) => s.studentId === studentId))
    const history: any[] = []
    const subjectLatest: Record<string, number[]> = {}
    for (const g of grades) {
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

  async weakStudents(user: any, classId: string, examId?: string) {
    let grades = await this.loadVisibleClassGrades(user, classId)
    if (examId) grades = grades.filter((g) => g.examId === examId)
    const students = await this.stuRepo.find({ where: { classId } as any, take: 500 })
    const studentMap = new Map(students.map((s) => [s.id, s]))
    const result: WeakSubjectResult[] = []
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
