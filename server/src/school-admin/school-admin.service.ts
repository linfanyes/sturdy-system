import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { ClassItem } from '../classes/class.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Notice } from '../school/school.entity'
import { Attendance } from '../school/school.entity'
import { Homework } from '../school/school.entity'
import { AuditService } from '../audit/audit.service'
import { verifyAndUpgrade } from '../common/utils/password.util'
import { SCHOOL_NOTICE_CLASS_ID } from './school-admin.constants'

// 注意：TEACHER_ID_TABLES / CLASS_ID_TABLES 已随 TeacherMgmtService 和 ClassMgmtService 移出

@Injectable()
export class SchoolAdminService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Notice) private readonly noticeRepo: Repository<Notice>,
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(Homework) private readonly hwRepo: Repository<Homework>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    private readonly audit: AuditService,
  ) {}

  /** 学校管理员登录：用户名 + 密码（已被超管绑定到学校，无需再输编号） */
  async login(username: string, password: string) {
    const admin = await this.saRepo.findOne({ where: { username } })
    if (!admin) throw new UnauthorizedException('账号或密码错误')
    const { valid, newHash } = verifyAndUpgrade(password, admin.passwordHash)
    if (!valid) throw new UnauthorizedException('账号或密码错误')
    if (newHash) { admin.passwordHash = newHash; await this.saRepo.save(admin) }
    if (admin.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系超级管理员')
    const school = await this.schoolRepo.findOne({ where: { id: admin.schoolId } })
    const token = this.jwt.sign({ sub: admin.id, role: 'school_admin', schoolId: admin.schoolId })
    return { token, admin: { id: admin.id, name: admin.name, schoolId: admin.schoolId, schoolName: school?.name || '', schoolCode: school?.code || '' } }
  }

  // P06修复：dashboard 缓存，5 分钟过期，避免每次请求都全量查询
  private _dashboardCache = new Map<string, { ts: number; data: any }>()
  private readonly DASHBOARD_CACHE_TTL = 5 * 60 * 1000

  /** 学校管理员看板：统计本校教师/班级/学生数据 */
  async dashboard(schoolId: string) {
    // 检查缓存
    const cached = this._dashboardCache.get(schoolId)
    if (cached && Date.now() - cached.ts < this.DASHBOARD_CACHE_TTL) {
      return cached.data
    }
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const totalTeachers = allTeachers.length
    const activeTeachers = allTeachers.filter(t => t.enabled !== false).length
    const inactiveTeachers = totalTeachers - activeTeachers
    const teacherIds = allTeachers.map(t => t.id)
    // 统计班级（这些教师的班级）
    const classes = teacherIds.length
      ? await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) })
      : []
    const totalClasses = classes.length
    const classIds = classes.map(c => c.id)
    // 统计学生（这些班级的学生）
    const totalStudents = classIds.length
      ? await this.studentRepo.count({ where: classIds.map(id => ({ classId: id })) })
      : 0
    // P01修复：今日出勤率统计 - 使用批量查询+N+1循环带来的性能问题
    const today = new Date().toISOString().slice(0, 10)
    let expectedStudents = 0
    let presentStudents = 0
    if (classIds.length) {
      // 一次批量查询所有班级的学生数，避免逐个查询
      const counts: Array<{ classId: string; cnt: string }> = await this.studentRepo
        .createQueryBuilder('s')
        .select('s.classId', 'classId')
        .addSelect('COUNT(*)', 'cnt')
        .where('s.classId IN (:...ids)', { ids: classIds })
        .groupBy('s.classId')
        .getRawMany()
      const cntByClass = new Map(counts.map(r => [r.classId, Number(r.cnt) || 0]))
      const todayAtts = await this.attRepo.find({ where: classIds.flatMap(id => ({ classId: id, date: today })) })
      for (const att of todayAtts) {
        expectedStudents += cntByClass.get(att.classId) || 0
        presentStudents += (att.records || []).filter(r => r.status === '出勤' || r.status === 'present').length
      }
    }
    const attendanceRate = expectedStudents > 0 ? Math.round((presentStudents / expectedStudents) * 100) : null
    // 待批改作业
    const pendingHomework = classIds.length
      ? await this.hwRepo.count({ where: classIds.flatMap(id => ({ classId: id, status: '待批改' })) })
      : 0
    // 已开通家长登录的学生数
    const parentEnabled = classIds.length
      ? await this.studentRepo.count({ where: classIds.flatMap(id => ({ classId: id, parentLoginEnabled: true })) })
      : 0
    const result = {
      totalTeachers, activeTeachers, inactiveTeachers,
      totalClasses, totalStudents,
      attendanceRate, pendingHomework, parentEnabled,
      todayDate: today,
      schoolId,
      // 学科分布：聚合全校教师任教学科（subjects 数组优先，subject 单值兜底）
      subjectDistribution: this.buildSubjectDistribution(allTeachers),
    }
    // P06修复：写入缓存
    this._dashboardCache.set(schoolId, { ts: Date.now(), data: result })
    // 清理过期缓存（避免内存泄漏）
    this.cleanExpiredDashboardCache()
    return result
  }

  /** 清理过期的 dashboard 缓存 */
  private cleanExpiredDashboardCache(): void {
    const now = Date.now()
    for (const [key, value] of this._dashboardCache) {
      if (now - value.ts >= this.DASHBOARD_CACHE_TTL) {
        this._dashboardCache.delete(key)
      }
    }
  }

  /** 聚合教师任教学科分布 [{ name, count }]，按人数降序 */
  private buildSubjectDistribution(teachers: User[]): { name: string; count: number }[] {
    const map = new Map<string, number>()
    for (const t of teachers) {
      const subs = Array.isArray(t.subjects) && t.subjects.length
        ? t.subjects
        : t.subject ? [t.subject] : []
      for (const s of subs) {
        const key = String(s || '').trim()
        if (key) map.set(key, (map.get(key) || 0) + 1)
      }
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  /** 校管查看本校学校级功能包开关（school ∩ teacher 预览用） */
  async getSchoolFeatures(schoolId: string): Promise<{ schoolId: string; featureFlags: string[] | null }> {
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
    return { schoolId, featureFlags: school?.featureFlags ?? null }
  }

  /** 校管更新本校学校级功能包开关 */
  async updateSchoolFeatures(schoolId: string, featureFlags: string[] | null): Promise<{ schoolId: string; featureFlags: string[] | null }> {
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
    if (!school) throw new BadRequestException('学校不存在')
    school.featureFlags = featureFlags
    await this.schoolRepo.save(school)
    return { schoolId, featureFlags: school.featureFlags }
  }

  // ===== 校管只读：成绩 / 考试 / 汇总分析（P2）=====

  /** 获取本校全部班级 id（通过本校教师绑定班级） */
  private async getSchoolClassIds(schoolId: string): Promise<string[]> {
    const teachers = await this.userRepo.find({ where: { schoolId }, select: ['id'] as any })
    const ids = teachers.map(t => t.id)
    if (!ids.length) return []
    const classes = await this.classRepo.find({ where: ids.map(id => ({ teacherId: id })), select: ['id'] as any })
    return classes.map(c => c.id)
  }

  /** 按 classIds 构造可叠加过滤条件的 where（OR 语义：任一班级满足即可） */
  private buildClassWhere(classIds: string[], extra: Record<string, any> = {}): any {
    const base = classIds.map(cid => ({ classId: cid }))
    if (!Object.keys(extra).length) return base
    return base.map(w => ({ ...w, ...extra }))
  }

  /**
   * 越权修复：校管传入 classId 时必须校验其属于本校，否则返回空数组（视为无权查看）。
   * 防止通过拼接他校 classId 越权读取/聚合他校数据（跨校数据隔离）。
   */
  private async resolveSchoolClassIds(schoolId: string, classId?: string): Promise<string[]> {
    if (!classId) return this.getSchoolClassIds(schoolId)
    const classIds = await this.getSchoolClassIds(schoolId)
    if (!classIds.includes(classId)) return []
    return [classId]
  }

  /** 校管只读：本校考试列表（可选按班级过滤） */
  async listSchoolExams(schoolId: string, classId?: string) {
    const classIds = await this.resolveSchoolClassIds(schoolId, classId)
    if (!classIds.length) return { items: [], total: 0 }
    const [items, total] = await this.examRepo.findAndCount({
      where: this.buildClassWhere(classIds),
      order: { date: 'DESC' } as any,
      take: 500,
    })
    return { items, total }
  }

  /** 校管只读：本校成绩列表（可选按班级 / 科目 / 考试名过滤） */
  async listSchoolGrades(schoolId: string, classId?: string, subject?: string, examName?: string) {
    const classIds = await this.resolveSchoolClassIds(schoolId, classId)
    if (!classIds.length) return { items: [], total: 0 }
    const extra: Record<string, any> = {}
    if (subject) extra.subject = subject
    if (examName) extra.examName = examName
    const [items, total] = await this.gradeRepo.findAndCount({
      where: this.buildClassWhere(classIds, extra),
      order: { date: 'DESC' } as any,
      take: 500,
    })
    return { items, total }
  }

  /** 校管只读：成绩汇总分析（按学科聚合均分/及格率/高低分；可按班级/考试过滤） */
  async schoolGradeSummary(schoolId: string, classId?: string, examId?: string) {
    const classIds = await this.resolveSchoolClassIds(schoolId, classId)
    if (!classIds.length) return { subjects: [], classes: [], totalGrades: 0, totalExams: 0, totalStudents: 0 }
    const extra: Record<string, any> = {}
    if (examId) extra.examId = examId
    // P03修复：降低单次查询上限（2000→1000），避免大内存占用
    const grades = await this.gradeRepo.find({ where: this.buildClassWhere(classIds, extra), take: 1000 })
    // 班级名称映射（缺陷修复：此处误用 buildClassWhere 生成 {classId} 条件，
    // ClassItem 实体无 classId 字段导致 academic/summary 恒 500；应按主键 id 查询）
    const classList = classIds.length
      ? await this.classRepo.find({ where: classIds.map(id => ({ id })), select: ['id', 'name'] as any })
      : []

    // 统计考试数与学生数
    let totalExams = 0
    let totalStudents = 0
    try {
      totalExams = await this.examRepo.count({ where: classIds.map(id => ({ classId: id })) })
    } catch { totalExams = 0 }
    try {
      totalStudents = await this.studentRepo.count({ where: classIds.map(id => ({ classId: id })) })
    } catch { totalStudents = 0 }

    // 按学科聚合
    const subjectMap = new Map<string, number[]>()
    for (const g of grades) {
      const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
      if (!scores.length) continue
      if (!subjectMap.has(g.subject)) subjectMap.set(g.subject, [])
      subjectMap.get(g.subject)!.push(...scores)
    }
    const subjects = [...subjectMap.entries()]
      .map(([subject, scores]) => {
        const total = scores.reduce((a, b) => a + b, 0)
        const avg = total / scores.length
        const passCount = scores.filter(v => v >= 60).length
        return {
          subject,
          count: scores.length,
          avg: Math.round(avg * 10) / 10,
          max: Math.max(...scores),
          min: Math.min(...scores),
          passRate: Math.round((passCount / scores.length) * 1000) / 10,
        }
      })
      .sort((a, b) => b.avg - a.avg)
    return { subjects, classes: classList, totalGrades: grades.length, totalExams, totalStudents }
  }

  // ===== 学校公告 =====

  /** 学校级公告列表（公告 teacherId 是校管 id，需查本校校管） */
  async listSchoolNotices(schoolId: string) {
    const admins = await this.saRepo.find({ where: { schoolId }, select: ['id'] })
    const adminIds = admins.map(a => a.id)
    if (!adminIds.length) return { items: [], total: 0 }
    const [items, total] = await this.noticeRepo.findAndCount({
      where: adminIds.map(id => ({ teacherId: id, scope: 'school' })),
      order: { createdAt: 'DESC' },
    })
    return { items, total }
  }

  /** 创建学校公告（用学校管理员自己的 userId 作为占位 teacherId） */
  async createSchoolNotice(schoolId: string, adminId: string, dto: { title: string; content?: string }) {
    if (!dto.title) throw new BadRequestException('公告标题必填')
    const n = this.noticeRepo.create({
      teacherId: adminId, classId: SCHOOL_NOTICE_CLASS_ID, title: dto.title,
      content: dto.content || '', pinned: true, scope: 'school',
    })
    return this.noticeRepo.save(n)
  }

  /** 删除学校公告（校验 schoolId 防止跨校删除） */
  async deleteSchoolNotice(schoolId: string, id: string) {
    const notice = await this.noticeRepo.findOne({ where: { id, scope: 'school' } })
    if (!notice) throw new BadRequestException('公告不存在')
    // 校验公告属于本校（teacherId 是本校校管 id）
    const admin = await this.saRepo.findOne({ where: { id: notice.teacherId, schoolId } })
    if (!admin) throw new BadRequestException('无权操作此公告')
    return this.noticeRepo.remove(notice)
  }

  /** 更新学校公告（沿用跨校校验，仅覆盖传入字段） */
  async updateSchoolNotice(
    schoolId: string,
    id: string,
    dto: { title?: string; content?: string; pinned?: boolean },
  ) {
    const notice = await this.noticeRepo.findOne({ where: { id, scope: 'school' } })
    if (!notice) throw new BadRequestException('公告不存在')
    const admin = await this.saRepo.findOne({ where: { id: notice.teacherId, schoolId } })
    if (!admin) throw new BadRequestException('无权操作此公告')
    if (dto.title !== undefined) notice.title = dto.title
    if (dto.content !== undefined) notice.content = dto.content
    if (dto.pinned !== undefined) notice.pinned = dto.pinned
    return this.noticeRepo.save(notice)
  }

  /** 全局搜索：按关键词搜索本校学生/教师/班级 */
  async search(schoolId: string, q: string, skip = 0, take = 20) {
    if (!q || q.length < 1) return { students: [], teachers: [], classes: [] }
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const teacherIds = allTeachers.map(t => t.id)

    // 搜索教师
    const teachers = allTeachers.filter(t =>
      t.name?.includes(q) || t.username?.includes(q) || t.teacherNo?.includes(q)
    ).slice(skip, skip + take).map(t => ({
      id: t.id, name: t.name, username: t.username, teacherNo: t.teacherNo, subject: t.subject,
    }))

    // 搜索班级
    const classes = teacherIds.length
      ? (await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) }))
        .filter(c => c.name?.includes(q) || c.grade?.includes(q))
        .slice(skip, skip + take)
      : []

    // 搜索学生
    const classIds = classes.length ? classes.map(c => c.id) : (teacherIds.length
      ? (await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) })).map(c => c.id)
      : [])
    const students = classIds.length
      ? (await this.studentRepo.find({ where: classIds.map(id => ({ classId: id })), order: { name: 'ASC' } }))
        .filter(s => s.name?.includes(q) || s.studentNo?.includes(q))
        .slice(skip, skip + take)
      : []

    const classMap: Record<string, string> = {}
    for (const c of classes) classMap[c.id] = c.name
    for (const s of students) { (s as any).className = classMap[s.classId] || '' }

    return { students, teachers, classes }
  }

  // ===== 校管只读：全校作业聚合 =====

  /**
   * 校管查看本校全部班级作业的聚合列表。
   * 支持按 classId / grade / subject / status 过滤，返回每条作业的科目、班级、教师、截止时间、状态等信息。
   */
  async listSchoolHomework(
    schoolId: string,
    opts: { skip?: number; take?: number; classId?: string; grade?: string; subject?: string; status?: string } = {},
  ) {
    const skip = Math.max(0, opts.skip || 0)
    const take = Math.min(500, opts.take || 50)
    const classIds = await this.resolveSchoolClassIds(schoolId, opts.classId)
    if (!classIds.length) return { items: [], total: 0 }

    // 先确定要展示的班级（支持 grade 过滤：仅保留指定年级的班级）
    let classFilter = classIds
    if (opts.grade) {
      const filtered = await this.classRepo.find({
        where: classIds.map(id => ({ id })),
        select: ['id', 'name', 'grade', 'teacherId'] as any,
      })
      classFilter = filtered.filter(c => c.grade === opts.grade).map(c => c.id)
    }
    if (!classFilter.length) return { items: [], total: 0 }

    const extra: Record<string, any> = {}
    if (opts.subject) extra.subject = opts.subject
    if (opts.status) extra.status = opts.status

    const where = this.buildClassWhere(classFilter, extra)
    const [items, total] = await this.hwRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })

    // 回填班级名称、教师姓名
    const classList = await this.classRepo.find({
      where: classFilter.map(id => ({ id })),
      select: ['id', 'name', 'grade', 'teacherId'] as any,
    })
    const classMap = new Map(classList.map(c => [c.id, c]))
    const teacherIds = Array.from(new Set(items.map(i => i.teacherId).filter(Boolean)))
    const teachers = teacherIds.length
      ? await this.userRepo.find({ where: teacherIds.map(id => ({ id })), select: ['id', 'name'] as any })
      : []
    const teacherMap = new Map(teachers.map(t => [t.id, t]))

    const enriched = items.map(h => {
      const cls = classMap.get(h.classId)
      const tch = teacherMap.get(h.teacherId)
      return {
        ...h,
        className: cls?.name || '',
        grade: cls?.grade || '',
        teacherName: tch?.name || '',
      }
    })
    return { items: enriched, total }
  }

  // ===== 校管只读：按年级横向对比成绩 =====

  /**
   * 指定年级下，各班某学科（或全学科）在给定考试下的均分对比。
   * 用于校管查看"某一学年"各班之间的成绩汇总对比。
   */
  async gradeClassComparison(
    schoolId: string,
    opts: { grade?: string; subject?: string; examName?: string; term?: string } = {},
  ) {
    const classIds = await this.getSchoolClassIds(schoolId)
    if (!classIds.length) return { grade: opts.grade || '', classes: [], subjectStats: [] }

    let targetClassIds = classIds
    if (opts.grade) {
      const filtered = await this.classRepo.find({
        where: classIds.map(id => ({ id })),
        select: ['id', 'name', 'grade'] as any,
      })
      targetClassIds = filtered.filter(c => c.grade === opts.grade).map(c => c.id)
      if (!targetClassIds.length) return { grade: opts.grade, classes: [], subjectStats: [] }
    }

    const extra: Record<string, any> = {}
    if (opts.subject) extra.subject = opts.subject
    if (opts.examName) extra.examName = opts.examName
    const where = this.buildClassWhere(targetClassIds, extra)

    let grades = await this.gradeRepo.find({ where, take: 2000 })
    if (opts.term) {
      const matchedExams = await this.examRepo.find({ where: targetClassIds.map(cid => ({ classId: cid, term: opts.term })), select: ['id'] as any })
      const examIds = new Set(matchedExams.map((e) => e.id))
      grades = grades.filter((g) => g.examId && examIds.has(g.examId))
    }
    // 班级映射
    const cls = await this.classRepo.find({
      where: classIds.map(id => ({ id })),
      select: ['id', 'name', 'grade'] as any,
    })
    const classMap = new Map(cls.map(c => [c.id, c]))

    // 按班级 + 学科聚合
    const classStats = new Map<string, Map<string, { total: number; count: number }>>()
    for (const g of grades) {
      if (!classStats.has(g.classId)) classStats.set(g.classId, new Map())
      const subjMap = classStats.get(g.classId)!
      const valid = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
      if (!valid.length) continue
      const total = valid.reduce((a, b) => a + b, 0)
      const existing = subjMap.get(g.subject) || { total: 0, count: 0 }
      existing.total += total
      existing.count += valid.length
      subjMap.set(g.subject, existing)
    }

    const result = [...classStats.entries()].map(([classId, subjMap]) => {
      const classInfo = classMap.get(classId)
      const subjects = [...subjMap.entries()].map(([subject, v]) => ({
        subject,
        count: v.count,
        avg: Math.round((v.total / v.count) * 10) / 10,
      }))
      return {
        classId,
        className: classInfo?.name || classId,
        grade: classInfo?.grade || '',
        subjects,
        overallAvg: Math.round(
          (subjects.reduce((a, s) => a + s.avg * s.count, 0) /
            Math.max(1, subjects.reduce((a, s) => a + s.count, 0))) *
            10,
        ) / 10,
      }
    })

    return { grade: opts.grade || '', classes: result }
  }

  // ===== 校管只读：班级本学期成绩汇总与趋势 =====

  /**
   * 某班级本学期所有考试的成绩汇总（均分/及格率/优秀率）与按考试时间的趋势。
   * term 可选；传值时用 Exam 实体的 term 过滤。
   */
  async classTermTrend(
    schoolId: string,
    classId: string,
    opts: { subject?: string; term?: string } = {},
  ) {
    const classIds = await this.getSchoolClassIds(schoolId)
    if (!classIds.includes(classId)) throw new NotFoundException('无权查看该班级成绩')

    const classInfo = await this.classRepo.findOne({ where: { id: classId } })
    if (!classInfo) throw new NotFoundException('班级不存在')
    const term = opts.term || classInfo.term || ''

    const extra: Record<string, any> = {}
    if (opts.subject) extra.subject = opts.subject
    let grades = await this.gradeRepo.find({
      where: this.buildClassWhere([classId], extra),
      order: { date: 'ASC' } as any,
      take: 500,
    })
    // term 过滤：Grade 本身无 term 字段，通过 Exam.join 过滤
    if (term) {
      const matchedExams = await this.examRepo.find({ where: { classId, term }, select: ['id'] as any })
      const examIds = new Set(matchedExams.map((e) => e.id))
      grades = grades.filter((g) => g.examId && examIds.has(g.examId))
    }

    // 按考试聚合
    const byExam = new Map<string, { examName: string; date: string; subject: string; total: number; count: number; pass: number; excellent: number; max: number; min: number }>()
    const subjectSet = new Set<string>()
    for (const g of grades) {
      const valid = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
      if (!valid.length) continue
      const key = `${g.examName}|${g.subject}`
      const existing = byExam.get(key) || {
        examName: g.examName,
        date: g.date,
        subject: g.subject,
        total: 0,
        count: 0,
        pass: 0,
        excellent: 0,
        max: -Infinity,
        min: Infinity,
      }
      existing.total += valid.reduce((a, b) => a + b, 0)
      existing.count += valid.length
      existing.pass += valid.filter(v => v >= 60).length
      existing.excellent += valid.filter(v => v >= 85).length
      existing.max = Math.max(existing.max, ...valid)
      existing.min = Math.min(existing.min, ...valid)
      byExam.set(key, existing)
      subjectSet.add(g.subject)
    }

    const exams = [...byExam.values()].map(v => ({
      examName: v.examName,
      date: v.date,
      subject: v.subject,
      avg: v.count ? Math.round((v.total / v.count) * 10) / 10 : 0,
      passRate: v.count ? Math.round((v.pass / v.count) * 1000) / 10 : 0,
      excellentRate: v.count ? Math.round((v.excellent / v.count) * 1000) / 10 : 0,
      max: v.max === -Infinity ? 0 : v.max,
      min: v.min === Infinity ? 0 : v.min,
      count: v.count,
    }))

    // 按考试均分聚合（同一考试跨多科目加权平均），用于趋势折线
    const examMap = new Map<string, { date: string; total: number; count: number }>()
    for (const e of exams) {
      const cur = examMap.get(e.examName) || { date: e.date, total: 0, count: 0 }
      cur.total += e.avg * e.count
      cur.count += e.count
      examMap.set(e.examName, cur)
    }
    const trend = [...examMap.entries()]
      .map(([examName, v]) => ({
        examName,
        date: v.date,
        avg: v.count ? Math.round((v.total / v.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      classId,
      className: classInfo.name,
      grade: classInfo.grade,
      term,
      subjects: Array.from(subjectSet),
      exams,
      trend,
    }
  }

  }
