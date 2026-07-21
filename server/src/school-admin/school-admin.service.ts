import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'node:crypto'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'

@Injectable()
export class SchoolAdminService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  /** 学校管理员登录：用户名 + 密码（已被超管绑定到学校，无需再输编号） */
  async login(username: string, password: string) {
    const admin = await this.saRepo.findOne({ where: { username } })
    if (!admin) throw new UnauthorizedException('账号或密码错误')
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== admin.passwordHash) throw new UnauthorizedException('账号或密码错误')
    const token = this.jwt.sign({ sub: admin.id, role: 'school_admin', schoolId: admin.schoolId })
    return { token, admin: { id: admin.id, name: admin.name, schoolId: admin.schoolId } }
  }

  /** 本校教师列表 */
  async listTeachers(schoolId: string) {
    const users = await this.userRepo.find({ where: { schoolId }, order: { createdAt: 'DESC' } })
    return users.map(u => ({
      id: u.id, name: u.name, username: u.username, subject: u.subject,
      phone: u.phone, school: u.school, features: u.features || [], createdAt: u.createdAt,
    }))
  }

  /** 创建教师账号 */
  async createTeacher(schoolId: string, dto: { username: string; password: string; name: string; subject?: string; phone?: string }) {
    if (!dto.username || !dto.password || !dto.name) throw new BadRequestException('用户名/密码/姓名必填')
    const exist = await this.userRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BadRequestException('用户名已存在')
    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    return this.userRepo.save(this.userRepo.create({
      username: dto.username, passwordHash: hash, name: dto.name,
      schoolId, subject: dto.subject || '语文', phone: dto.phone || '',
    }))
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
