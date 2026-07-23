import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, In } from 'typeorm'
import * as crypto from 'node:crypto'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { ClassItem } from '../classes/class.entity'
import { Notice } from '../school/school.entity'
import { Attendance } from '../school/school.entity'
import { Homework } from '../school/school.entity'
import { AuditService } from '../audit/audit.service'

/** 所有继承 BaseEntity 的业务表，统一按 teacherId 级联删除 */
const TEACHER_ID_TABLES = [
  'students', 'exams', 'grades', 'notes', 'todos', 'picker_history',
  'backups', 'ai_settings', 'app_config', 'awards', 'generated',
  'class_ops', 'duty_rosters', 'engagements', 'growth_records',
  'parent_contacts', 'seats', 'gallery_items',
]

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
    private readonly audit: AuditService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  /** 学校管理员登录：用户名 + 密码（已被超管绑定到学校，无需再输编号） */
  async login(username: string, password: string) {
    const admin = await this.saRepo.findOne({ where: { username } })
    if (!admin) throw new UnauthorizedException('账号或密码错误')
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== admin.passwordHash) throw new UnauthorizedException('账号或密码错误')
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
    // 今日考勤率
    const today = new Date().toISOString().slice(0, 10)
    const todayAtts = classIds.length
      ? await this.attRepo.find({ where: classIds.flatMap(id => ({ classId: id, date: today })) })
      : []
    const attPresent = todayAtts.filter(a => a.records?.some(r => r.status === '出勤' || r.status === 'present')).length
    const attendanceRate = todayAtts.length > 0 ? Math.round((attPresent / todayAtts.length) * 100) : null
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
    }
  }

  /** 本校教师列表 */
  async listTeachers(schoolId: string, skip = 0, take = 200) {
    const [users, total] = await this.userRepo.findAndCount({
      where: { schoolId }, order: { createdAt: 'DESC' }, skip, take,
    })
    const items = users.map(u => ({
      id: u.id, name: u.name, username: u.username, subject: u.subject,
      phone: u.phone, school: u.school, features: u.features || [],
      enabled: u.enabled !== false, createdAt: u.createdAt,
      teacherNo: u.teacherNo || '',
    }))
    return { items, total }
  }

  /** 生成教师编号：JS + 学校编号 + 5位流水号（从 00001 开始递增），使用悲观锁防止并发重复 */
  private async genTeacherNo(schoolId: string, em?: EntityManager): Promise<string> {
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
    if (!school) throw new BadRequestException('学校不存在')
    const prefix = 'JS' + (school.code || '')
    const repo = em ? em.getRepository(User) : this.userRepo
    // 使用 SELECT ... FOR UPDATE 锁定行防止并发
    const last = await repo
      .createQueryBuilder('u')
      .where('u.teacherNo LIKE :prefix', { prefix: prefix + '%' })
      .orderBy('u.teacherNo', 'DESC')
      .setLock('pessimistic_write')
      .getOne()
    let seq = 1
    if (last && last.teacherNo) {
      const lastSeq = parseInt(last.teacherNo.slice(prefix.length), 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    return prefix + String(seq).padStart(5, '0')
  }

  /** 创建教师账号（自动生成教师编号，事务保护） */
  async createTeacher(schoolId: string, dto: { username: string; password: string; name: string; phone?: string; enabled?: boolean }) {
    if (!dto.username || !dto.password || !dto.name) throw new BadRequestException('用户名/密码/姓名必填')
    return await this.entityManager.transaction(async (em) => {
      const userRepo = em.getRepository(User)
      const exist = await userRepo.findOne({ where: { username: dto.username } })
      if (exist) throw new BadRequestException('用户名已存在')
      const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
      const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
      const teacherNo = await this.genTeacherNo(schoolId, em)
      const user = userRepo.create({
        username: dto.username, passwordHash: hash, name: dto.name,
        schoolId, school: school?.name || '', phone: dto.phone || '',
        enabled: dto.enabled !== false, teacherNo,
      })
      const saved = await userRepo.save(user)
      this.audit.log(schoolId, 'create_teacher', '系统', saved.name + '(' + saved.username + ')', '创建教师').catch(() => {})
      return { id: saved.id, name: saved.name, username: saved.username, teacherNo, ok: true }
    })
  }

  /** 批量创建教师（逐条创建，返回成功/失败明细） */
  async batchCreateTeachers(schoolId: string, teachers: { username: string; password: string; name: string; phone?: string }[]) {
    if (!teachers?.length) throw new BadRequestException('请提供至少一位教师信息')
    const results: { name: string; username: string; status: string; error?: string }[] = []
    for (const t of teachers) {
      try {
        await this.createTeacher(schoolId, { username: t.username, password: t.password, name: t.name, phone: t.phone })
        results.push({ name: t.name, username: t.username, status: '成功' })
      } catch (e: any) {
        results.push({ name: t.name, username: t.username, status: '失败', error: e.message })
      }
    }
    return { total: teachers.length, success: results.filter(r => r.status === '成功').length, failed: results.filter(r => r.status === '失败').length, results }
  }

  /** 更新教师基本信息（用户名唯一性校验） */
  async updateTeacher(schoolId: string, teacherId: string, dto: { username?: string; name?: string; phone?: string; enabled?: boolean }) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    if (dto.username && dto.username !== user.username) {
      const exist = await this.userRepo.findOne({ where: { username: dto.username } })
      if (exist) throw new BadRequestException('用户名已存在')
      user.username = dto.username
    }
    if (dto.name && dto.name.trim()) user.name = dto.name.trim()
    if (dto.phone !== undefined) user.phone = dto.phone
    if (dto.enabled !== undefined) user.enabled = dto.enabled
    await this.userRepo.save(user)
    return { ok: true }
  }

  /** 重置教师密码 */
  async resetPassword(schoolId: string, teacherId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    user.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    return this.userRepo.save(user)
  }

  /** 删除教师账号及所有关联数据，再次添加时如同新用户（事务保护） */
  async deleteTeacher(schoolId: string, teacherId: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    await this.entityManager.transaction(async (em) => {
      await em.getRepository(ClassItem).delete({ teacherId })
      for (const table of TEACHER_ID_TABLES) {
        await em.query(`DELETE FROM \`${table}\` WHERE teacherId = ?`, [teacherId])
      }
      await em.getRepository(User).remove(user)
    })
    this.audit.log(schoolId, 'delete_teacher', '系统', user.name + '(' + user.username + ')', '删除教师').catch(() => {})
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
    return { items, total }
  }

  /** 创建班级（班主任必须是本校教师） */
  async createClass(schoolId: string, dto: { name: string; grade: string; classNo: string; headTeacher: string; headTeacherId: string; term?: string }) {
    if (!dto.name || !dto.grade || !dto.headTeacherId) throw new BadRequestException('班级名称/年级/班主任必填')
    const teacher = await this.userRepo.findOne({ where: { id: dto.headTeacherId, schoolId } })
    if (!teacher) throw new BadRequestException('指定的班主任不在本校')
    const c = this.classRepo.create({
      teacherId: teacher.id, name: dto.name, grade: dto.grade, classNo: dto.classNo || '1',
      headTeacher: dto.headTeacher || teacher.name, term: dto.term || '',
    })
    return this.classRepo.save(c)
  }

  /** 更新班级信息 */
  async updateClass(schoolId: string, id: string, dto: Partial<{ name: string; grade: string; classNo: string; headTeacher: string; term: string }>) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    // 验证班级属于本校
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    Object.assign(cls, dto)
    return this.classRepo.save(cls)
  }

  /** 删除班级 */
  async deleteClass(schoolId: string, id: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    await this.classRepo.remove(cls)
    this.audit.log(schoolId, 'delete_class', '系统', cls.name, '删除班级').catch(() => {})
  }

  // ===== 学校公告 =====

  /** 学校级公告列表 */
  async listSchoolNotices(schoolId: string) {
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const ids = allTeachers.map(t => t.id)
    if (!ids.length) return { items: [], total: 0 }
    const [items, total] = await this.noticeRepo.findAndCount({
      where: ids.map(id => ({ teacherId: id, scope: 'school' })),
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

  /** 删除学校公告 */
  async deleteSchoolNotice(schoolId: string, id: string) {
    const notice = await this.noticeRepo.findOne({ where: { id, scope: 'school' } })
    if (!notice) throw new BadRequestException('公告不存在')
    return this.noticeRepo.remove(notice)
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

  /** 编辑学生基本信息 */
  async updateStudent(schoolId: string, id: string, dto: { name?: string; gender?: string; parentName?: string; parentPhone?: string }) {
    const student = await this.studentRepo.findOne({ where: { id } })
    if (!student) throw new BadRequestException('学生不存在')
    const cls = await this.classRepo.findOne({ where: { id: student.classId } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此学生')
    Object.assign(student, dto)
    return this.studentRepo.save(student)
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

  async exportTeachers(schoolId: string): Promise<string> {
    const r = await this.listTeachers(schoolId)
    const rows = [['姓名', '用户名', '学科', '手机号', '教师编号', '状态']]
    for (const t of r.items) {
      rows.push([t.name, t.username || '', t.subject || '', t.phone || '', t.teacherNo || '', t.enabled ? '启用' : '禁用'])
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
}
