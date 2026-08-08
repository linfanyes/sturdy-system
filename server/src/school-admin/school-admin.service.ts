import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import crypto from 'node:crypto'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, In, Not } from 'typeorm'
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
import { ClassMember } from '../class-members/class-member.entity'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { ClassMemberService } from '../class-members/class-members.module'
import { AuditService } from '../audit/audit.service'
import { hashPassword, verifyAndUpgrade } from '../common/utils/password.util'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import { pinyin } from 'pinyin-pro'
import * as ExcelJS from 'exceljs'
import { AiService } from '../ai/ai.service'

import { TEACHER_ID_TABLES, CLASS_ID_TABLES } from '../common/constants/tenant-tables'

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
    @InjectRepository(ClassMember) private readonly classMemberRepo: Repository<ClassMember>,
    private readonly classMemberSvc: ClassMemberService,
    private readonly audit: AuditService,
    private readonly ai: AiService,
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

  /** 学校管理员看板：统计本校教师/班级/学生数据 */
  async dashboard(schoolId: string) {
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
    // 今日真实学生出勤率：出勤学生数 / 应到学生数（仅统计今天有考勤记录的班级）
    const today = new Date().toISOString().slice(0, 10)
    const todayAtts = classIds.length
      ? await this.attRepo.find({ where: classIds.flatMap(id => ({ classId: id, date: today })) })
      : []
    let expectedStudents = 0
    let presentStudents = 0
    for (const att of todayAtts) {
      const stuCount = await this.studentRepo.count({ where: { classId: att.classId } })
      expectedStudents += stuCount
      presentStudents += (att.records || []).filter(r => r.status === '出勤' || r.status === 'present').length
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
    return {
      totalTeachers, activeTeachers, inactiveTeachers,
      totalClasses, totalStudents,
      attendanceRate, pendingHomework, parentEnabled,
      todayDate: today,
      schoolId,
      // 学科分布：聚合全校教师任教学科（subjects 数组优先，subject 单值兜底）
      subjectDistribution: this.buildSubjectDistribution(allTeachers),
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

  /** 本校教师列表 */
  async listTeachers(schoolId: string, skip = 0, take = 200) {
    const [users, total] = await this.userRepo.findAndCount({
      where: { schoolId }, order: { createdAt: 'DESC' }, skip, take,
    })
    const items = users.map(u => ({
      id: u.id, name: u.name, username: u.username, subject: u.subject,
      phone: u.phone, gender: u.gender, school: u.school, features: u.features || [],
      enabled: u.enabled !== false, createdAt: u.createdAt,
      teacherNo: u.teacherNo || '', position: u.position || '',
      positions: u.positions || [], grade: u.grade || '',
    }))
    return { items, total }
  }

  /** 生成教师编号：JS + 学校编号 + 5位流水号（从 00001 开始递增），使用悲观锁防止并发重复 */
  private async genTeacherNo(schoolId: string, em?: EntityManager): Promise<string> {
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
    if (!school) throw new BadRequestException('学校不存在')
    const prefix = 'JS' + (school.code || '')
    const repo = em ? em.getRepository(User) : this.userRepo
    // 使用 SELECT ... FOR UPDATE 锁定行防止并发（仅 MySQL 支持；SQLite 等测试驱动跳过）
    const qb = repo
      .createQueryBuilder('u')
      .where('u.teacherNo LIKE :prefix', { prefix: prefix + '%' })
      .orderBy('u.teacherNo', 'DESC')
    if (repo.manager.connection.options.type === 'mysql') qb.setLock('pessimistic_write')
    const last = await qb.getOne()
    let seq = 1
    if (last && last.teacherNo) {
      const lastSeq = parseInt(last.teacherNo.slice(prefix.length), 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    return prefix + String(seq).padStart(5, '0')
  }

  /**
   * 根据中文姓名生成拼音登录名（不含声调，仅保留字母，小写）。
   * 用于批量导入时自动生成教师登录账号。多音字等按 pinyin-pro 默认音处理，
   * 若拼音为空则回退到教师编号。
   */
  private genPinyinLogin(name: string): string {
    const clean = (name || '').trim()
    if (!clean) return ''
    try {
      const arr = pinyin(clean, { toneType: 'none', type: 'array' }) as string[]
      return arr.join('').toLowerCase().replace(/[^a-z]/g, '')
    } catch {
      return ''
    }
  }

  /** 创建教师账号（自动生成教师编号 teacherNo；username 默认=teacherNo，autoPinyin 时改用中文名拼音；事务保护） */
  async createTeacher(schoolId: string, dto: { username?: string; password?: string; name: string; phone?: string; gender?: string; subject?: string; position?: string; positions?: string[]; grade?: string; enabled?: boolean; autoPinyin?: boolean }) {
    if (!dto.name) throw new BadRequestException('姓名必填')
    return await this.entityManager.transaction(async (em) => {
      const userRepo = em.getRepository(User)
      const teacherNo = await this.genTeacherNo(schoolId, em)
      // username 生成策略：显式传入 > 自动拼音（autoPinyin）> 教师编号
      const baseUsername = dto.username?.trim()
        || (dto.autoPinyin ? this.genPinyinLogin(dto.name) : '')
        || teacherNo
      // 唯一性：拼音冲突时追加数字后缀（如 zhangsan -> zhangsan1）
      let username = baseUsername
      let attempt = 0
      while (true) {
        const exist = await userRepo.findOne({ where: { username } })
        if (!exist) break
        attempt++
        if (!dto.autoPinyin) throw new BadRequestException('用户名已存在')
        username = `${baseUsername}${attempt}`
        if (attempt > 200) throw new BadRequestException('无法生成唯一登录名，请为「' + dto.name + '」手动指定用户名')
      }
      const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
      // password 可选：未传则统一使用默认口令 1314521（与重置密码保持一致）
      const initialPassword = dto.password && dto.password.length >= 6
        ? dto.password
        : '1314521'
      const hash = hashPassword(initialPassword)
      const user = userRepo.create({
        username, passwordHash: hash, name: dto.name,
        schoolId, school: school?.name || '', phone: dto.phone || '',
        gender: dto.gender || '', subject: dto.subject || '语文',
        position: dto.position || (dto.positions && dto.positions.length ? dto.positions[0] : ''),
        positions: dto.positions || [],
        grade: dto.grade || '',
        enabled: dto.enabled !== false, teacherNo,
      })
      const saved = await userRepo.save(user)
      this.audit.log(schoolId, 'create_teacher', '系统', saved.name + '(' + saved.username + ')', '创建教师').catch(() => {})
      return { id: saved.id, name: saved.name, username: saved.username, teacherNo, ok: true, initialPassword }
    })
  }

  /** 批量创建教师（逐条创建，返回成功/失败明细；username/password 可选，自动生成） */
  async batchCreateTeachers(schoolId: string, teachers: { name: string; phone?: string; gender?: string; subject?: string; password?: string; username?: string }[]) {
    if (!teachers?.length) throw new BadRequestException('请提供至少一位教师信息')
    const results: { name: string; username: string; teacherNo?: string; initialPassword?: string; status: string; error?: string }[] = []
    for (const t of teachers) {
      try {
        const r = await this.createTeacher(schoolId, {
          name: t.name, phone: t.phone, gender: t.gender, subject: t.subject,
          password: t.password, username: t.username, autoPinyin: true,
        })
        results.push({ name: t.name, username: r.username, teacherNo: r.teacherNo, initialPassword: r.initialPassword, status: '成功' })
      } catch (e: any) {
        results.push({ name: t.name, username: t.username || '', status: '失败', error: e.message })
      }
    }
    return { total: teachers.length, success: results.filter(r => r.status === '成功').length, failed: results.filter(r => r.status === '失败').length, results }
  }

  /** 更新教师基本信息（用户名唯一性校验，支持密码修改） */
  async updateTeacher(schoolId: string, teacherId: string, dto: { username?: string; name?: string; phone?: string; gender?: string; subject?: string; position?: string; positions?: string[]; grade?: string; enabled?: boolean; password?: string }) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    if (dto.username && dto.username !== user.username) {
      const exist = await this.userRepo.findOne({ where: { username: dto.username } })
      if (exist) throw new BadRequestException('用户名已存在')
      user.username = dto.username
    }
    if (dto.name && dto.name.trim()) user.name = dto.name.trim()
    if (dto.phone !== undefined) user.phone = dto.phone
    if (dto.gender !== undefined) user.gender = dto.gender
    if (dto.subject !== undefined) user.subject = dto.subject
    if (dto.position !== undefined) user.position = dto.position
    if (dto.positions !== undefined) user.positions = dto.positions || []
    if (dto.grade !== undefined) user.grade = dto.grade || ''
    if (dto.enabled !== undefined) user.enabled = dto.enabled
    // 密码修改：长度 6-20 位
    if (dto.password) {
      if (dto.password.length < 6 || dto.password.length > 20) {
        throw new BadRequestException('密码长度须为 6-20 位')
      }
      user.passwordHash = hashPassword(dto.password)
    }
    await this.userRepo.save(user)
    return { ok: true }
  }

  /** 重置教师密码
   * 未提供合规密码（6-20 位）时，统一重置为默认口令 1314521。
   */
  async resetPassword(schoolId: string, teacherId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    // 提供密码时强制校验 6-20 位，避免静默回退到隐藏默认口令导致重置后无法登录
    const raw = (newPassword || '').trim()
    let pwd: string
    if (raw) {
      if (raw.length < 6 || raw.length > 20) throw new BadRequestException('密码长度须为 6-20 位')
      pwd = raw
    } else {
      pwd = '1314521' // 未提供则使用默认口令，并随响应返回以便告知
    }
    user.passwordHash = hashPassword(pwd)
    // 重置密码同时重新启用账号：若教师此前被禁用（学校停用级联或手动禁用），
    // 仅重置密码而不恢复 enabled 会导致登录时被 enabled 检查拦截
    user.enabled = true
    await this.userRepo.save(user)
    return { ok: true, defaultPassword: pwd }
  }

  /** 删除教师账号及所有关联数据，保留学生但禁用家长登录（事务保护） */
  async deleteTeacher(schoolId: string, teacherId: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    await this.entityManager.transaction(async (em) => {
      // 获取该教师管理的所有班级
      const classes = await em.getRepository(ClassItem).find({ where: { teacherId } })
      const classIds = classes.map(c => c.id)
      // 先将学生 classId 置空（避免孤儿记录），再禁用家长登录
      // 注意：classId 列 NOT NULL，置 null 会触发 ER_BAD_NULL_ERROR，用空串代替
      if (classIds.length) {
        await em.getRepository(Student).update(
          { classId: In(classIds) },
          { classId: '', parentLoginEnabled: false, parentNickName: '', parentPasswordHash: null }
        )
      }
      // 删除班级
      await em.getRepository(ClassItem).delete({ teacherId })
      // 清除该教师的所有业务数据
      for (const table of TEACHER_ID_TABLES) {
        try {
          await em.query(`DELETE FROM \`${table}\` WHERE teacherId = ?`, [teacherId])
        } catch { /* 表不存在或无该字段则跳过 */ }
      }
      // 删除教师账号
      await em.getRepository(User).remove(user)
    })
    this.audit.log(schoolId, 'delete_teacher', '系统', user.name + '(' + user.username + ')', '删除教师（保留学生，班级解散，学生 classId 置空）').catch(() => {})
    return { ok: true }
  }

  /** 管理教师功能权限 */
  async updateTeacherFeatures(schoolId: string, teacherId: string, features: string[]) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    user.features = features
    await this.userRepo.save(user)
    return { id: teacherId, features }
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

  /** 批量停用本校所有教师 */
  async deactivateAllTeachers(schoolId: string) {
    const result = await this.userRepo.update({ schoolId, enabled: true }, { enabled: false })
    this.audit.log(schoolId, 'deactivate_all_teachers', '系统', '全部教师', `批量停用 ${result.affected || 0} 名教师`).catch(() => {})
    return { ok: true, affected: result.affected || 0 }
  }

  /** 查看本校家长登录情况 */
  async listParentLogins(schoolId: string) {
    // 先获取本校班级 ID 列表，避免跨校数据泄露
    const teachers = await this.userRepo.find({ where: { schoolId }, select: ['id'] })
    const teacherIds = teachers.map(t => t.id)
    if (!teacherIds.length) return []
    const classes = await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) })
    const classIds = classes.map(c => c.id)
    if (!classIds.length) return []
    const students = await this.studentRepo.find({
      where: { parentLoginEnabled: true, classId: In(classIds) },
      order: { name: 'ASC' }, take: 200,
    })
    const items = students.map(s => ({
      studentId: s.id, name: s.name, studentNo: s.studentNo, classId: s.classId,
      parentName: s.parentName, parentPhone: s.parentPhone, parentLoginEnabled: s.parentLoginEnabled,
    }))
    return { items, total: items.length }
  }

  // ===== 班级管理 =====

  /** 本校班级列表（通过教师所属学校查询） */
  async listClasses(schoolId: string) {
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const ids = allTeachers.map(t => t.id)
    if (!ids.length) return { items: [], total: 0 }
    const [items, total] = await this.classRepo.findAndCount({
      where: ids.map(id => ({ teacherId: id })),
      order: { createdAt: 'DESC' },
    })
    if (items.length) {
      const classIds = items.map(i => i.id)
      // 回填每个班级的学生人数（按 classId 分组统计）
      const counts: Array<{ classId: string; cnt: string }> = await this.studentRepo
        .createQueryBuilder('s')
        .select('s.classId', 'classId')
        .addSelect('COUNT(*)', 'cnt')
        .where('s.classId IN (:...ids)', { ids: classIds })
        .groupBy('s.classId')
        .getRawMany()
      const cntByClass = new Map(counts.map(r => [r.classId, Number(r.cnt) || 0]))
      // 从 class_members 回填科任老师（role='subject'），保证前端编辑下拉能显示已选科任；
      // 实体 subjectTeachers 列可能为历史遗留的 Record 或空值，此处以 class_member 为准
      const members = await this.classMemberRepo.find({
        where: classIds.map(cid => ({ classId: cid, role: 'subject' })),
      })
      const byClass = new Map<string, { teacherId: string; subjects: string[] }[]>()
      for (const m of members) {
        if (!byClass.has(m.classId)) byClass.set(m.classId, [])
        byClass.get(m.classId)!.push({ teacherId: m.teacherId, subjects: m.subjects || [] })
      }
      for (const item of items) {
        ;(item as any).studentCount = cntByClass.get(item.id) || 0
        ;(item as any).subjectTeachers = byClass.get(item.id) || []
      }
    }
    return { items, total }
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
    const grades = await this.gradeRepo.find({ where: this.buildClassWhere(classIds, extra), take: 2000 })
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

  /** 单个班级详情（校验班级属于本校） */
  async getClass(schoolId: string, id: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    // 验证班级属于本校
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权查看此班级')
    // 学生人数
    const studentCount = await this.studentRepo.count({ where: { classId: id } })
    ;(cls as any).studentCount = studentCount
    // 科任老师（含班主任）
    const allMembers = await this.classMemberRepo.find({ where: { classId: id } })
    ;(cls as any).members = allMembers
    const subjectMembers = allMembers.filter(m => m.role === 'subject')
    ;(cls as any).subjectTeachers = subjectMembers.map(m => ({ teacherId: m.teacherId, subjects: m.subjects || [] }))
    return cls
  }

  /** 创建班级（班主任必须是本校教师，由校管指定班主任身份；支持指定班主任任教学科 + 一次性加入科任老师） */
  async createClass(schoolId: string, dto: {
    name: string; grade: string; classNo: string; headTeacher: string; headTeacherId: string;
    term?: string; subjects?: string[];
    subjectTeachers?: { teacherId: string; subjects?: string[] }[];
  }) {
    if (!dto.name || !dto.grade || !dto.headTeacherId) throw new BadRequestException('班级名称/年级/班主任必填')
    const teacher = await this.userRepo.findOne({ where: { id: dto.headTeacherId, schoolId } })
    if (!teacher) throw new BadRequestException('指定的班主任不在本校')
    const term = dto.term || ''
    // 前置校验：该老师是否已在本学期其他班级担任班主任（业务规则：一师一班 head，按学期隔离）
    await this.classMemberSvc.assertTeacherNotHeadElsewhere(teacher.id, '', term)
    const c = this.classRepo.create({
      teacherId: teacher.id, name: dto.name, grade: dto.grade, classNo: dto.classNo || '1',
      headTeacher: dto.headTeacher || teacher.name, term,
      subjects: dto.subjects || [],
    })
    const saved = await this.classRepo.save(c)
    // 写入 class_members 的 head 记录（addHeadTeacher 内部会再次 assertCanBecomeHead 兜底；
    // 数据库部分唯一索引 0014 迁移最终兜底并发场景；subjects 支持班主任兼任本班科任）
    await this.classMemberSvc.addHeadTeacher(teacher.id, saved.id, saved.name, term, dto.subjects || [])
    // 一次性加入科任老师（校验同校，按学期写入 class_members）
    if (dto.subjectTeachers?.length) {
      for (const st of dto.subjectTeachers) {
        if (!st.teacherId || st.teacherId === teacher.id) continue // 跳过空值和班主任自身（已是 head）
        const stUser = await this.userRepo.findOne({ where: { id: st.teacherId, schoolId } })
        if (!stUser) throw new BadRequestException(`科任老师 ${st.teacherId} 不在本校`)
        await this.classMemberSvc.addSubjectTeacher(st.teacherId, saved.id, saved.name, st.subjects || [], term)
      }
    }
    this.audit.log(schoolId, 'create_class', '系统', saved.name, `班主任：${teacher.name}`).catch(() => {})
    return saved
  }

  /** 更新班级信息（支持转交班主任） */
  async updateClass(schoolId: string, id: string, dto: Partial<{ name: string; grade: string; classNo: string; headTeacher: string; term: string; headTeacherId: string; subjects?: string[]; subjectTeachers?: { teacherId: string; subjects?: string[] }[] }>) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    // 验证班级属于本校
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    // 转交班主任：修改 classes.teacherId 并更新 class_members（按班级当前学期 term 隔离）
    if (dto.headTeacherId && dto.headTeacherId !== cls.teacherId) {
      const newHead = await this.userRepo.findOne({ where: { id: dto.headTeacherId, schoolId } })
      if (!newHead) throw new BadRequestException('指定的新班主任不在本校')
      const term = cls.term || ''
      // 前置校验：新班主任是否已在本学期其他班级担任班主任（业务规则：一师一班 head，按学期隔离）
      // 必须在降级旧 head 之前做，避免误触"该班级已有班主任"规则
      await this.classMemberSvc.assertTeacherNotHeadElsewhere(newHead.id, id, term)
      // 降级旧班主任为科任老师（同 term 内，保留协作关系可在本班继续任教）
      await this.classMemberRepo
        .createQueryBuilder()
        .update()
        .set({ role: 'subject' })
        .where('classId = :cid AND teacherId = :tid AND term = :term', { cid: id, tid: teacher.id, term })
        .execute()
        .catch(() => {})
      // 写入新班主任 head 记录（addHeadTeacher 内部 assertCanBecomeHead 兜底：
      // 规则1再次校验，规则2因旧 head 已降级而通过）
      await this.classMemberSvc.addHeadTeacher(newHead.id, id, cls.name, term)
      cls.teacherId = newHead.id
      cls.headTeacher = dto.headTeacher || newHead.name
      // 同步更新该班所有学生的 teacherId，避免转交后原班主任仍能看到学生、新班主任看不到
      await this.studentRepo.update({ classId: id }, { teacherId: newHead.id }).catch(() => {})
    } else {
      Object.assign(cls, dto)
    }
    // 同步「班主任任教学科」到班级主表（列表展示依赖 ClassItem.subjects）
    if (dto.subjects !== undefined) cls.subjects = dto.subjects
    // 同步科任老师（按科目下拉设置）：清除现有 role='subject' 成员后按 dto 重新写入（排除班主任本人）
    if (dto.subjectTeachers !== undefined) {
      const term = cls.term || ''
      await this.classMemberRepo
        .createQueryBuilder()
        .delete()
        .where('classId = :cid AND role = :role', { cid: id, role: 'subject' })
        .execute()
        .catch(() => {})
      for (const st of dto.subjectTeachers) {
        if (!st.teacherId || st.teacherId === cls.teacherId) continue
        await this.classMemberSvc.addSubjectTeacher(st.teacherId, id, cls.name, st.subjects || [], term)
      }
    }
    return this.classRepo.save(cls)
  }

  /** 删除班级（级联清理：class_members + 学生家长登录 + 班级业务数据 + 学生 classId 置空） */
  async deleteClass(schoolId: string, id: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    await this.entityManager.transaction(async (em) => {
      // 1. 清理班级成员关系
      await em.getRepository(ClassMember).delete({ classId: id })
      // 2. 学生 classId 置空并禁用家长登录（classId 列 NOT NULL，用空串代替 null）
      await em.getRepository(Student).update(
        { classId: id },
        { classId: '', parentLoginEnabled: false, parentNickName: '', parentPasswordHash: null }
      )
      // 3. 清理班级关联的业务数据（按 classId，使用共享常量）
      for (const t of CLASS_ID_TABLES) {
        try {
          await em.query(`DELETE FROM \`${t}\` WHERE classId = ?`, [id])
        } catch { /* 表不存在或无该字段则跳过 */ }
      }
      // 4. 最后删除班级
      await em.getRepository(ClassItem).remove(cls)
    })
    this.audit.log(schoolId, 'delete_class', '系统', cls.name, '删除班级（学生 classId 置空，禁用家长登录，清理业务数据）').catch(() => {})
    return { ok: true }
  }

  /** 班级升级：三年级一班 → 四年级一班（年级+1，名称自动更新，学生和班主任保留） */
  async promoteClass(schoolId: string, id: string, targetGrade?: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')

    // 年级升级映射
    const gradeMap: Record<string, string> = {
      '一年级': '二年级', '二年级': '三年级', '三年级': '四年级',
      '四年级': '五年级', '五年级': '六年级', '六年级': '初一',
      '初一': '初二', '初二': '初三', '初三': '高一',
      '高一': '高二', '高二': '高三',
    }

    const currentGrade = cls.grade || ''
    const nextGrade = targetGrade || gradeMap[currentGrade]
    if (!nextGrade) throw new BadRequestException(`无法识别「${currentGrade}」的下一个年级，请指定目标年级`)

    // 更新年级和班级名称
    cls.grade = nextGrade
    // 自动更新班级名称中的年级部分（如 "三年级1班" → "四年级1班"）
    if (cls.name) {
      cls.name = cls.name.replace(currentGrade, nextGrade)
    }

    await this.classRepo.save(cls)
    this.audit.log(schoolId, 'promote_class', '系统', cls.name, `班级升级：${currentGrade} → ${nextGrade}`).catch(() => {})
    return { ok: true, message: `已升级至「${nextGrade}」，班级名称：${cls.name}` }
  }


  /**
   * 解析班级文件（Excel/CSV/TXT/JSON），返回校验后的明细。
   * 列顺序：班级名称, 年级, 班级序号(可选), 班主任(姓名), 学期(可选)。
   * 班主任以姓名匹配本校教师，导入时再解析为 teacherId。
   */
  async parseClassFile(filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    let rawRows: string[][] = []

    if (ext === 'json') {
      let arr: any[]
      try {
        arr = JSON.parse(buf.toString('utf-8'))
      } catch {
        throw new BadRequestException('JSON 文件格式错误')
      }
      if (!Array.isArray(arr)) throw new BadRequestException('JSON 文件应为数组结构')
      rawRows = arr.map((o) => [
        String(o?.name ?? ''), String(o?.grade ?? ''), String(o?.classNo ?? '1'),
        String(o?.headTeacher ?? o?.headTeacherName ?? ''), String(o?.term ?? ''),
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

    if (rawRows.length && /班级名称|名称|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      const grade = String(r[1] || '').trim()
      const classNo = String(r[2] || '1').trim() || '1'
      const headTeacher = String(r[3] || '').trim()
      const term = String(r[4] || '').trim()
      let error = ''
      if (!name) error = '缺少班级名称'
      else if (!grade) error = '缺少年级'
      else if (!headTeacher) error = '缺少班主任姓名'
      if (error) errorCount++
      else validCount++
      rows.push({ name, grade, classNo, headTeacher, term, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  /** 批量创建班级（逐条创建，自动按班主任姓名解析为本校教师；返回成功/失败明细） */
  async batchCreateClasses(schoolId: string, classes: any[]) {
    if (!classes?.length) throw new BadRequestException('请提供至少一个班级信息')
    const results: any[] = []
    let success = 0
    let failed = 0
    for (const c of classes) {
      const name = String(c.name || '').trim()
      const grade = String(c.grade || '').trim()
      const classNo = String(c.classNo || '1').trim() || '1'
      const headTeacherName = String(c.headTeacher || c.headTeacherName || '').trim()
      const term = String(c.term || '').trim()
      try {
        if (!name) throw new Error('缺少班级名称')
        if (!grade) throw new Error('缺少年级')
        if (!headTeacherName) throw new Error('缺少班主任姓名')
        const teacher = await this.userRepo.findOne({ where: { name: headTeacherName, schoolId } })
        if (!teacher) throw new Error(`本校无名为「${headTeacherName}」的教师`)
        await this.createClass(schoolId, {
          name, grade, classNo, headTeacher: teacher.name, headTeacherId: teacher.id, term,
        })
        results.push({ name, grade, classNo, headTeacherName, status: '成功' })
        success++
      } catch (e: any) {
        results.push({ name, grade, classNo, headTeacherName, status: '失败', error: e.message })
        failed++
      }
    }
    this.audit.log(schoolId, 'batch_create_classes', '系统', `批量创建班级 ${success} 成功 / ${failed} 失败`, '校管批量导入班级').catch(() => {})
    return { total: classes.length, success, failed, results }
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
      teacherId: adminId, classId: '__school__', title: dto.title,
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

  /** 全校学生列表 */
  async listSchoolStudents(schoolId: string) {
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const ids = allTeachers.map(t => t.id)
    if (!ids.length) return { items: [], total: 0 }
    const classes = await this.classRepo.find({ where: ids.map(id => ({ teacherId: id })) })
    const classIds = classes.map(c => c.id)
    if (!classIds.length) return { items: [], total: 0 }
    // 构建班级名映射
    const classMap: Record<string, string> = {}
    for (const c of classes) classMap[c.id] = c.name
    const [items, total] = await this.studentRepo.findAndCount({
      where: classIds.map(id => ({ classId: id })),
      order: { name: 'ASC' },
    })
    return {
      items: items.map(s => ({
        ...s, className: classMap[s.classId] || '',
      })),
      total,
    }
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
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'
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
        // 记录已写入学号，供后续批次控重
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
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'

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

  /**
   * 解析教师文件（Excel/CSV/TXT/JSON），返回校验后的明细。
   * 列顺序：姓名, 性别(可选), 学科(可选), 手机号(可选)。
   * JSON 则直接解析为数组对象。供校管批量导入与 AI 识别预览复用。
   */
  async parseTeacherFile(filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    let rawRows: string[][] = []

    if (ext === 'json') {
      let arr: any[]
      try {
        arr = JSON.parse(buf.toString('utf-8'))
      } catch {
        throw new BadRequestException('JSON 文件格式错误')
      }
      if (!Array.isArray(arr)) throw new BadRequestException('JSON 文件应为数组结构')
      rawRows = arr.map((o) => [String(o?.name ?? ''), String(o?.gender ?? ''), String(o?.subject ?? ''), String(o?.phone ?? '')])
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

    if (rawRows.length && /姓名|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      let gender = String(r[1] || '').trim()
      const subject = String(r[2] || '').trim()
      const phone = String(r[3] || '').trim()
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'
      let error = ''
      if (!name) error = '缺少姓名'
      else if (phone && !/^\d{6,15}$/.test(phone)) error = '手机号格式不正确'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, subject, phone, line: i + 1, valid: !error, error })
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
   * AI 识别教师文件：先把文件转为文本（图片走 OCR、Excel 转 CSV），再交给大模型结构化解析。
   * 返回与 parseTeacherFile 同构的预览行（含校验状态）。
   */
  async aiRecognizeTeachers(teacherId: string, filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const { text } = await this.ai.parseFile('teacher', teacherId, { fileName: filename, fileData: dataBase64 })
    const instruction =
      '从下列文本中提取教师名单，每行/每位教师一行。只返回 JSON 数组，不要解释或前后缀。' +
      '元素字段：name(姓名,必填字符串), gender(性别,仅"男"或"女",可空), subject(任教学科,可空), phone(手机号,可空)。'
    const res = await this.ai.parse('teacher', teacherId, { text, instruction })
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    this.normalizeAiRows(res).forEach((o: any, i: number) => {
      const name = String(o?.name ?? '').trim()
      let gender = String(o?.gender ?? '').trim()
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'
      const subject = String(o?.subject ?? '').trim()
      const phone = String(o?.phone ?? '').trim()
      let error = ''
      if (!name) error = '缺少姓名'
      else if (phone && !/^\d{6,15}$/.test(phone)) error = '手机号格式不正确'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, subject, phone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
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
      if (gender === 'M' || gender === 'm' || gender === '男') gender = '男'
      else if (gender === 'F' || gender === 'f' || gender === '女') gender = '女'
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

  /**
   * AI 识别班级文件：文本解析后交给大模型结构化，返回与 parseClassFile 同构的预览行。
   */
  async aiRecognizeClasses(teacherId: string, filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const { text } = await this.ai.parseFile('teacher', teacherId, { fileName: filename, fileData: dataBase64 })
    const instruction =
      '从下列文本中提取班级名单，每行/每个班级一行。只返回 JSON 数组，不要解释或前后缀。' +
      '元素字段：name(班级名称,必填), grade(年级,必填), classNo(班级序号,可空), ' +
      'headTeacher(班主任姓名,必填), term(学期,可空)。'
    const res = await this.ai.parse('teacher', teacherId, { text, instruction })
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    this.normalizeAiRows(res).forEach((o: any, i: number) => {
      const name = String(o?.name ?? '').trim()
      const grade = String(o?.grade ?? '').trim()
      const classNo = String(o?.classNo ?? '1').trim() || '1'
      const headTeacher = String(o?.headTeacher ?? '').trim()
      const term = String(o?.term ?? '').trim()
      let error = ''
      if (!name) error = '缺少班级名称'
      else if (!grade) error = '缺少年级'
      else if (!headTeacher) error = '缺少班主任姓名'
      if (error) errorCount++
      else validCount++
      rows.push({ name, grade, classNo, headTeacher, term, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  /** 全局搜索：按关键词搜索本校学生/教师/班级 */
  async search(schoolId: string, q: string, skip = 0, take = 20) {
    if (!q || q.length < 1) return { students: [], teachers: [], classes: [] }
    const keyword = `%${q}%`
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

  async exportTeachers(schoolId: string): Promise<string> {
    const r = await this.listTeachers(schoolId)
    const rows = [['姓名', '用户名', '学科', '性别', '手机号', '教师编号', '状态']]
    for (const t of r.items) {
      rows.push([t.name, t.username || '', t.subject || '', t.gender || '', t.phone || '', t.teacherNo || '', t.enabled ? '启用' : '禁用'])
    }
    return this.toCsv(rows)
  }

  async exportStudents(schoolId: string): Promise<string> {
    const r = await this.listSchoolStudents(schoolId)
    const rows = [['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']]
    for (const s of r.items) {
      rows.push([s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone || '', s.parentLoginEnabled ? '是' : '否'])
    }
    return this.toCsv(rows)
  }

  /* —— 以下为 xlsx 二进制导出，供前端下载 .xlsx —— */

  async exportTeachersXls(schoolId: string): Promise<Buffer> {
    const r = await this.listTeachers(schoolId)
    const headers = ['姓名', '用户名', '学科', '性别', '手机号', '教师编号', '状态']
    const rows = r.items.map((t) => [t.name, t.username || '', t.subject || '', t.gender || '', t.phone || '', t.teacherNo || '', t.enabled ? '启用' : '禁用'])
    return this.workbookFrom(headers, rows)
  }

  async exportStudentsXls(schoolId: string): Promise<Buffer> {
    const r = await this.listSchoolStudents(schoolId)
    const headers = ['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']
    const rows = r.items.map((s) => [s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone || '', s.parentLoginEnabled ? '是' : '否'])
    return this.workbookFrom(headers, rows)
  }

  async exportClassesXls(schoolId: string): Promise<Buffer> {
    const { items } = await this.listClasses(schoolId)
    const headers = ['班级名称', '年级', '班级序号', '学期', '班主任', '班主任任教学科']
    const rows = items.map((c) => [c.name, c.grade || '', c.classNo || '', c.term || '', c.headTeacher || '', (c.subjects || []).join('/')])
    return this.workbookFrom(headers, rows)
  }
}
