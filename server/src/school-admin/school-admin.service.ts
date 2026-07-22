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
    return { totalTeachers, activeTeachers, inactiveTeachers, totalClasses, totalStudents, schoolId }
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
      return { id: saved.id, name: saved.name, username: saved.username, teacherNo, ok: true }
    })
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
}
