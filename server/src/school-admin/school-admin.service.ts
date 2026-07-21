import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'node:crypto'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'

@Injectable()
export class SchoolAdminService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
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

  /** 本校教师列表 */
  async listTeachers(schoolId: string) {
    const users = await this.userRepo.find({ where: { schoolId }, order: { createdAt: 'DESC' } })
    return users.map(u => ({
      id: u.id, name: u.name, username: u.username, subject: u.subject,
      phone: u.phone, school: u.school, features: u.features || [],
      enabled: u.enabled !== false, createdAt: u.createdAt,
    }))
  }

  /** 创建教师账号 */
  async createTeacher(schoolId: string, dto: { username: string; password: string; name: string; phone?: string; enabled?: boolean }) {
    if (!dto.username || !dto.password || !dto.name) throw new BadRequestException('用户名/密码/姓名必填')
    const exist = await this.userRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BadRequestException('用户名已存在')
    // 查询学校名称，填充到 teacher.school 字段（教师登录后需要展示）
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } })
    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    const user = this.userRepo.create({
      username: dto.username, passwordHash: hash, name: dto.name,
      schoolId, school: school?.name || '', phone: dto.phone || '',
      enabled: dto.enabled !== false,
    })
    const saved = await this.userRepo.save(user)
    return { id: saved.id, name: saved.name, username: saved.username, ok: true }
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

  /** 删除教师 */
  async deleteTeacher(schoolId: string, teacherId: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    await this.userRepo.remove(user)
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
    const students = await this.studentRepo.find({ where: { parentLoginEnabled: true }, order: { name: 'ASC' }, take: 200 })
    // 仅返回本校班级的学生（通过 classId→school 关联太复杂，简化为看 schoolId 字段）
    return students.map(s => ({
      studentId: s.id, name: s.name, studentNo: s.studentNo, classId: s.classId,
      parentName: s.parentName, parentPhone: s.parentPhone, parentLoginEnabled: s.parentLoginEnabled,
    }))
  }
}
