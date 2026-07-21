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

  /** 生成 6 位字母+数字学校编号（保证至少含 1 字母和 1 数字，排除易混淆字符） */
  private async genSchoolCode(): Promise<string> {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const digits = '23456789'
    const all = letters + digits
    for (let attempt = 0; attempt < 10; attempt++) {
      const bytes = crypto.randomBytes(6)
      let code = ''
      for (let i = 0; i < 6; i++) code += all[bytes[i] % all.length]
      // 必须同时包含字母和数字
      if (!/[A-Z]/.test(code)) code = letters[bytes[0] % letters.length] + code.slice(1)
      if (!/[2-9]/.test(code)) code = code.slice(0, 5) + digits[bytes[5] % digits.length]
      // 唯一性检查
      const dup = await this.schoolRepo.findOne({ where: { code } })
      if (!dup) return code
    }
    // 兜底：用时间戳后 6 位
    return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6)
  }

  /* ===== 学校管理员管理（同时创建对应学校） ===== */

  /** 列表：关联学校信息（名称+编号） */
  async listAdmins() {
    const admins = await this.saRepo.find({ order: { createdAt: 'DESC' } })
    if (!admins.length) return []
    const schoolIds = [...new Set(admins.map(a => a.schoolId).filter(Boolean))]
    const schools = schoolIds.length ? await this.schoolRepo.find({ where: schoolIds.map(id => ({ id })) }) : []
    const schoolMap = new Map(schools.map(s => [s.id, s]))
    return admins.map(a => {
      const s = schoolMap.get(a.schoolId)
      return {
        id: a.id,
        username: a.username,
        name: a.name,
        schoolId: a.schoolId,
        schoolName: s?.name || '',
        schoolCode: s?.code || '',
        enabled: a.enabled,
        permissions: a.permissions || [],
        createdAt: a.createdAt,
      }
    })
  }

  /** 新增学校管理员：自动创建学校（含 6 位编号）+ 管理员账号 + enabled 标志 */
  async createAdmin(dto: { username: string; password: string; name: string; schoolName: string; enabled?: boolean }) {
    if (!dto.username || !dto.password || !dto.name || !dto.schoolName) {
      throw new BadRequestException('学校名称/用户名/密码/姓名必填')
    }
    // 用户名唯一性校验
    const exist = await this.saRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BadRequestException('用户名已存在')

    // 创建学校（自动生成 6 位字母+数字编号）
    const code = await this.genSchoolCode()
    const school = await this.schoolRepo.save(this.schoolRepo.create({
      code, name: dto.schoolName, status: 'active',
    }))

    // 创建学校管理员
    const hash = crypto.createHash('sha256').update(dto.password).digest('hex')
    const admin = await this.saRepo.save(this.saRepo.create({
      username: dto.username,
      passwordHash: hash,
      name: dto.name,
      schoolId: school.id,
      permissions: ['teachers', 'classes', 'students', 'exams', 'grades', 'attendance', 'schedule', 'homework', 'notices', 'ai', 'tools', 'games', 'finance', 'activities', 'rewards', 'parents'],
      enabled: dto.enabled !== false,
    }))

    return {
      id: admin.id, username: admin.username, name: admin.name,
      schoolId: school.id, schoolName: school.name, schoolCode: school.code,
      enabled: admin.enabled,
    }
  }

  /** 切换管理员开启状态 */
  async toggleAdminEnabled(id: string, enabled: boolean) {
    const a = await this.saRepo.findOne({ where: { id } })
    if (!a) throw new BadRequestException('管理员不存在')
    a.enabled = enabled
    await this.saRepo.save(a)
    return { id, enabled: a.enabled }
  }

  /** 重置管理员密码 */
  async resetAdminPassword(id: string, newPassword: string) {
    if (!newPassword) throw new BadRequestException('新密码必填')
    const a = await this.saRepo.findOne({ where: { id } })
    if (!a) throw new BadRequestException('管理员不存在')
    a.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    await this.saRepo.save(a)
    return { ok: true }
  }

  /** 删除管理员（不删学校，保留学校数据） */
  async deleteAdmin(id: string) {
    await this.saRepo.delete(id)
    return { ok: true }
  }
}
