import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'node:crypto'
import { User } from '../users/user.entity'
import { School } from '../school/school.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'

@Injectable()
export class AdminService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
  ) {}

  /** 超管登录 → JWT */
  login(username: string, password: string) {
    const cfgUser = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const cfgPass = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (username !== cfgUser || password !== cfgPass) throw new UnauthorizedException('账号或密码错误')
    return { token: this.jwt.sign({ sub: 'super', role: 'super' }) }
  }

  /* ===== 学校管理 ===== */
  async listSchools() { return this.schoolRepo.find({ order: { createdAt: 'DESC' } }) }

  async createSchool(dto: { name: string; address?: string; contact?: string; phone?: string }) {
    if (!dto.name) throw new BadRequestException('学校名称必填')
    const code = 'S' + crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
    return this.schoolRepo.save(this.schoolRepo.create({ code, ...dto }))
  }

  async updateSchool(id: string, dto: any) {
    const s = await this.schoolRepo.findOne({ where: { id } })
    if (!s) throw new BadRequestException('学校不存在')
    Object.assign(s, dto)
    return this.schoolRepo.save(s)
  }

  async deleteSchool(id: string) {
    await this.schoolRepo.delete(id)
    return { ok: true }
  }

  /* ===== 学校管理员管理 ===== */
  async listAdmins(schoolId?: string) {
    const where: any = {}
    if (schoolId) where.schoolId = schoolId
    return this.saRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async createAdmin(dto: { username: string; password: string; name: string; schoolId: string; permissions?: string[] }) {
    if (!dto.username || !dto.password || !dto.name || !dto.schoolId) throw new BadRequestException('用户名/密码/姓名/学校必填')
    const exist = await this.saRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BadRequestException('用户名已存在')
    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    return this.saRepo.save(this.saRepo.create({ ...dto, passwordHash: hash }))
  }

  async deleteAdmin(id: string) {
    await this.saRepo.delete(id)
    return { ok: true }
  }

  /* ===== 教师总览（按学校） ===== */
  async listTeachers(schoolId?: string) {
    const where: any = {}
    if (schoolId) where.schoolId = schoolId
    const users = await this.userRepo.find({ where, order: { createdAt: 'DESC' } })
    return users.map(u => ({
      id: u.id, name: u.name, school: u.school, schoolId: u.schoolId,
      username: u.username, subject: u.subject, features: u.features || [], createdAt: u.createdAt,
    }))
  }

  /* ===== 教师功能管理 ===== */
  async deleteUser(id: string) {
    await this.userRepo.delete(id)
    return { ok: true }
  }

  async updateUserFeatures(id: string, features: string[]) {
    await this.userRepo.update(id, { features })
    return { id, features }
  }
}
