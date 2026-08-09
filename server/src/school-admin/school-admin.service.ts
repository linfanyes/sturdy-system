import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, Not } from 'typeorm'
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
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { AuditService } from '../audit/audit.service'
import { AiService } from '../ai/ai.service'
import { ClassMgmtService } from './class-mgmt.service'
import { verifyAndUpgrade } from '../common/utils/password.util'
import { normalizeGender } from '@gardener/shared/utils/gender'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import * as ExcelJS from 'exceljs'
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
    private readonly ai: AiService,
    private readonly classMgmt: ClassMgmtService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
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

  /** 校管只读：本校考试列表（可选按班级过滤） */
  async listSchoolExams(schoolId: string, classId?: string) {
    const classIds = classId ? [classId] : await this.getSchoolClassIds(schoolId)
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
    const classIds = classId ? [classId] : await this.getSchoolClassIds(schoolId)
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
    const classIds = classId ? [classId] : await this.getSchoolClassIds(schoolId)
    if (!classIds.length) return { subjects: [], classes: [], totalGrades: 0 }
    const extra: Record<string, any> = {}
    if (examId) extra.examId = examId
    // P03修复：降低单次查询上限（2000→1000），避免大内存占用
    const grades = await this.gradeRepo.find({ where: this.buildClassWhere(classIds, extra), take: 1000 })
    // 班级名称映射
    const classList = classIds.length
      ? await this.classRepo.find({ where: this.buildClassWhere(classIds), select: ['id', 'name'] as any })
      : []
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
    return { subjects, classes: classList, totalGrades: grades.length }
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

  // ===== 学生管理 =====

  /** 编辑学生基本信息（含学号） */
  async updateStudent(schoolId: string, id: string, dto: { name?: string; gender?: string; parentName?: string; parentPhone?: string; studentNo?: string }) {
    const student = await this.studentRepo.findOne({ where: { id } })
    if (!student) throw new BadRequestException('学生不存在')
    const cls = await this.classRepo.findOne({ where: { id: student.classId } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此学生')
    // 学号唯一性校验：若修改学号，确保不与本校其他学生冲突
    if (dto.studentNo && dto.studentNo !== student.studentNo) {
      const clash = await this.studentRepo.findOne({ where: { studentNo: dto.studentNo, id: Not(id) } })
      if (clash) throw new BadRequestException('该学号已被其他学生使用')
    }
    Object.assign(student, dto)
    return this.studentRepo.save(student)
  }

  /** 删除学生（校验归属本校，事务清理关联家长联系记录） */
  async deleteStudent(schoolId: string, id: string) {
    const student = await this.studentRepo.findOne({ where: { id } })
    if (!student) throw new BadRequestException('学生不存在')
    const cls = await this.classRepo.findOne({ where: { id: student.classId } })
    if (cls) {
      const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
      if (!teacher) throw new BadRequestException('无权操作此学生')
    }
    await this.entityManager.transaction(async (em) => {
      // 清理家长联系记录
      try {
        await em.getRepository(ParentContact).delete({ studentId: id })
      } catch { /* 表不存在则跳过 */ }
      await em.getRepository(Student).remove(student)
    })
    this.audit.log(schoolId, 'delete_student', '系统', student.name + '(' + (student.studentNo || '') + ')', '删除学生').catch(() => {})
    return { ok: true }
  }

  /**
   * 批量创建学生：校验所有 classId 属于该 schoolId，逐条写入并返回成功/失败明细。
   * 参考 students.module.ts 的 importStudents，但以 schoolId 做归属校验、
   * 逐条 try/catch 收集结果（不因单条失败回滚全部，与 batchCreateTeachers 风格一致）。
   * 同步为带家长信息的学生生成 parent-contact 记录。
   * 根据学号控重：学号非空时，若数据库或本批次中已存在相同学号，则跳过并标记失败。
   */
  async batchCreateStudents(schoolId: string, students: any[]) {
    if (!students?.length) throw new BadRequestException('请提供至少一名学生信息')
    // 1. 校验：本校所有班级
    const allTeachers = await this.userRepo.find({ where: { schoolId }, select: ['id'] })
    const teacherIds = allTeachers.map(t => t.id)
    if (!teacherIds.length) throw new BadRequestException('本校暂无教师，无法创建学生')
    const classes = await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) })
    const classMap = new Map(classes.map(c => [c.id, c]))
    if (!classMap.size) throw new BadRequestException('本校暂无班级，无法创建学生')

    // 2. 预查本校所有已存在学号，用于控重（学号非空才查）
    const allClassIds = Array.from(classMap.keys())
    const existingStudents = allClassIds.length
      ? await this.studentRepo.find({ where: allClassIds.map(id => ({ classId: id })), select: ['studentNo'] })
      : []
    const existingNos = new Set(existingStudents.map(s => s.studentNo).filter(Boolean))
    // 本批次内已写入的学号集合（防止批内重复）
    const batchSeenNos = new Set<string>()

    // 3. 逐条校验 + 写入
    const results: any[] = []
    let success = 0
    let failed = 0
    const today = new Date().toISOString().slice(0, 10)
    for (const it of students) {
      const name = String(it.name || '').trim()
      let gender = String(it.gender || '').trim()
      const studentNo = String(it.studentNo || '').trim()
      const classId = String(it.classId || '').trim()
      const parentName = String(it.parentName || '').trim()
      const parentPhone = String(it.parentPhone || '').trim()
      // 性别归一化
      gender = normalizeGender(gender)
      try {
        if (!name) throw new Error('缺少姓名')
        if (gender !== '男' && gender !== '女') throw new Error('性别须为男/女')
        if (!classId) throw new Error('缺少班级ID')
        const cls = classMap.get(classId)
        if (!cls) throw new Error('班级不属于本校')
        if (parentPhone && !/^\d{6,15}$/.test(parentPhone)) throw new Error('家长电话格式不正确')
        // 学号控重：学号非空时检查数据库已有 + 本批次已写入
        if (studentNo) {
          if (existingNos.has(studentNo)) throw new Error(`学号「${studentNo}」已存在（数据库）`)
          if (batchSeenNos.has(studentNo)) throw new Error(`学号「${studentNo}」在本批次中重复`)
        }

        // 当前班级已有学生数 + 1 作为 seatNo
        const existCount = await this.studentRepo.count({ where: { classId } })
        const e = new Student()
        Object.assign(e, {
          name, gender, studentNo, classId, parentName, parentPhone,
          seatNo: existCount + 1, tags: [], teacherId: cls.teacherId,
        })
        const saved = await this.studentRepo.save(e)
        // 记录已写入学号，供后续控重
        if (studentNo) batchSeenNos.add(studentNo)
        // 同步生成家长联系记录
        if (parentName || parentPhone) {
          const pc = new ParentContact()
          Object.assign(pc, {
            studentId: saved.id, studentName: name, classId,
            parentName: parentName || '家长', relation: '家长',
            phone: parentPhone || '', wechat: '',
            method: parentPhone ? '电话' : '其他',
            content: '校管批量导入时自动建立', date: today, followUp: '',
            teacherId: cls.teacherId,
          })
          await this.entityManager.save(ParentContact, pc).catch(() => {})
        }
        results.push({ name, studentNo, classId, status: '成功', id: saved.id })
        success++
      } catch (err: any) {
        results.push({ name, studentNo, classId, status: '失败', error: err.message || String(err) })
        failed++
      }
    }
    this.audit.log(schoolId, 'batch_create_students', '系统',
      `批量创建学生 ${success} 成功 / ${failed} 失败`, '校管批量导入学生').catch(() => {})
    return { total: students.length, success, failed, results }
  }

  /**
   * 解析学生文件（Excel/CSV/TXT/JSON），返回校验后的明细。
   * 与 students.module.ts parseFile 一致的列顺序：姓名,性别,学号,家长姓名,家长电话。
   * JSON 文件则直接解析为数组对象。classId 由调用方（import 端点）按班级统一填充。
   */
  async parseStudentFile(filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    let rawRows: string[][] = []

    if (ext === 'json') {
      // JSON 文件：直接解析为数组对象，转为统一的 row 结构
      let arr: any[] = []
      try {
        arr = JSON.parse(buf.toString('utf-8'))
      } catch {
        throw new BadRequestException('JSON 文件格式错误')
      }
      if (!Array.isArray(arr)) throw new BadRequestException('JSON 文件应为数组结构')
      rawRows = arr.map((o) => [
        String(o?.name ?? ''), String(o?.gender ?? ''), String(o?.studentNo ?? ''),
        String(o?.parentName ?? ''), String(o?.parentPhone ?? ''),
      ])
    } else if (ext === 'xlsx' || ext === 'xls') {
      rawRows = await xlsxFirstSheetToRows(buf)
    } else {
      const text = buf.toString('utf-8')
      rawRows = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(/\t|,/).map((c) => c.trim()))
    }

    // 跳过表头（首格含「姓名」认定为表头）
    if (rawRows.length && /姓名|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      let gender = String(r[1] || '').trim()
      const studentNo = String(r[2] || '').trim()
      const parentName = String(r[3] || '').trim()
      const parentPhone = String(r[4] || '').trim()
      gender = normalizeGender(gender)

      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone))
        error = '家长电话格式不正确（应为6-15位数字）'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, studentNo, parentName, parentPhone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  /** 将 AI 返回的任意结构规整为数组（兼容 数组 / {teachers|data|list|rows:[]} 等） */
  private normalizeAiRows(res: any): any[] {
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.teachers)) return res.teachers
    if (res && Array.isArray(res.data)) return res.data
    if (res && Array.isArray(res.list)) return res.list
    if (res && Array.isArray(res.rows)) return res.rows
    return []
  }

  /**
   * AI 识别学生文件：文本解析后交给大模型结构化，返回与 parseStudentFile 同构的预览行。
   */
  async aiRecognizeStudents(teacherId: string, filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const { text } = await this.ai.parseFile('teacher', teacherId, { fileName: filename, fileData: dataBase64 })
    const instruction =
      '从下列文本中提取学生名单，每行/每位学生一行。只返回 JSON 数组，不要解释或前后缀。' +
      '元素字段：name(姓名,必填字符串), gender(性别,仅"男"或"女",必填), studentNo(学号,可空), ' +
      'parentName(家长姓名,可空), parentPhone(家长电话,可空数字)。'
    const res = await this.ai.parse('teacher', teacherId, { text, instruction })
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    this.normalizeAiRows(res).forEach((o: any, i: number) => {
      const name = String(o?.name ?? '').trim()
      let gender = String(o?.gender ?? '').trim()
      gender = normalizeGender(gender)
      const studentNo = String(o?.studentNo ?? '').trim()
      const parentName = String(o?.parentName ?? '').trim()
      const parentPhone = String(o?.parentPhone ?? '').trim()
      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone)) error = '家长电话格式不正确'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, studentNo, parentName, parentPhone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
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
    for (const s of students) { s['className'] = classMap[s.classId] || '' }

    return { students, teachers, classes }
  }

  // ===== 数据导出 =====

  toCsv(rows: string[][]): string {
    return rows.map(r => r.map(c => {
      const s = String(c).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
    }).join(',')).join('\n')
  }

  /** 用 exceljs 把二维数据写成 .xlsx 工作簿，返回 Buffer */
  private async workbookFrom(headers: string[], rows: any[][]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Sheet1')
    ws.columns = headers.map((h) => ({ header: h, key: h, width: 18 }))
    const headRow = ws.getRow(1)
    headRow.font = { bold: true }
    headRow.alignment = { vertical: 'middle' }
    for (const r of rows) ws.addRow(r)
    const buf = await wb.xlsx.writeBuffer()
    return Buffer.from(buf)
  }

  // S02修复：手机号脱敏辅助函数（导出场景使用）
  private maskPhone(phone?: string): string {
    const p = String(phone || '')
    if (p.length <= 4) return p
    return p.slice(0, 3) + '****' + p.slice(-4)
  }

  async exportStudents(schoolId: string): Promise<string> {
    const r = await this.classMgmt.listSchoolStudents(schoolId, 0, 10000)
    const rows = [['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']]
    for (const s of r.items) {
      // S02修复：导出时家长电话脱敏，防止敏感信息泄露
      rows.push([s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone ? this.maskPhone(s.parentPhone) : '', s.parentLoginEnabled ? '是' : '否'])
    }
    return this.toCsv(rows)
  }

  async exportStudentsXls(schoolId: string): Promise<Buffer> {
    const r = await this.classMgmt.listSchoolStudents(schoolId, 0, 10000)
    const headers = ['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']
    // S02修复：xlsx导出同样脱敏家长电话
    const rows = r.items.map((s) => [s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone ? this.maskPhone(s.parentPhone) : '', s.parentLoginEnabled ? '是' : '否'])
    return this.workbookFrom(headers, rows)
  }
}
