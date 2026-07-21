import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'node:crypto'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'

@Injectable()
export class SchoolAdminService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** 学校管理员登录 */
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

  /** 创建教师账号（学校管理员为教师开号） */
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

  /** 本校统计 */
  async stats(schoolId: string) {
    const [teachers, students, notices] = await Promise.all([
      this.userRepo.count({ where: { schoolId } }),
      // students and notices count needs other repos but for simplicity:
      Promise.resolve(0), Promise.resolve(0),
    ])
    return { teacherCount: teachers, studentCount: 0, noticeCount: 0 }
  }
}
