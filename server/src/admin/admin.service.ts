import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
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
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  /** 超管登录 → JWT */
  login(username: string, password: string) {
    const cfgUser = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const cfgPass = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (username !== cfgUser || password !== cfgPass) throw new UnauthorizedException('账号或密码错误')
    return { token: this.jwt.sign({ sub: 'super', role: 'super' }) }
  }

  /** 生成学校编号：前缀(最多 6 位) + 中横线(-) + 6 位随机字符，保证唯一；无前缀则仅 6 位随机字符 */
  private async genSchoolCode(prefix: string): Promise<string> {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const digits = '23456789'
    const all = letters + digits
    const p = (prefix || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
    for (let attempt = 0; attempt < 20; attempt++) {
      const bytes = crypto.randomBytes(6)
      let rand = ''
      for (let i = 0; i < 6; i++) rand += all[bytes[i] % all.length]
      const code = p ? `${p}-${rand}` : rand
      const dup = await this.schoolRepo.findOne({ where: { code } })
      if (!dup) return code
    }
    // 兜底：时间戳随机
    const tail = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7)
    return p ? `${p}-${tail}` : tail
  }

  /* ===== 学校管理（超管维护） ===== */

  /** 学校列表 */
  async listSchools(skip = 0, take = 100) {
    const [items, total] = await this.schoolRepo.findAndCount({
      order: { createdAt: 'DESC' }, skip, take,
    })
    return { items, total }
  }

  /** 新增学校：编号 = 前缀 + 中横线 + 6 位随机字符（无前缀则仅 6 位随机字符） */
  async createSchool(dto: { name: string; prefix?: string; address?: string; contact?: string; phone?: string; status?: string }) {
    if (!dto.name || !dto.name.trim()) throw new BadRequestException('学校名称必填')
    const code = await this.genSchoolCode(dto.prefix || '')
    const school = await this.schoolRepo.save(this.schoolRepo.create({
      code,
      name: dto.name.trim(),
      address: dto.address || '',
      contact: dto.contact || '',
      phone: dto.phone || '',
      status: dto.status || 'active',
    }))
    return school
  }

  /** 更新学校（编号不可改）；停用学校时级联禁用其管理员和所有教师 */
  async updateSchool(id: string, dto: { name?: string; address?: string; contact?: string; phone?: string; status?: string }) {
    const s = await this.schoolRepo.findOne({ where: { id } })
    if (!s) throw new BadRequestException('学校不存在')
    if (dto.name !== undefined && dto.name.trim()) s.name = dto.name.trim()
    if (dto.address !== undefined) s.address = dto.address
    if (dto.contact !== undefined) s.contact = dto.contact
    if (dto.phone !== undefined) s.phone = dto.phone
    if (dto.status !== undefined) s.status = dto.status
    await this.schoolRepo.save(s)
    // 级联禁用：学校停用 → 该学校的所有管理员和教师同步禁用
    if (dto.status === 'inactive') {
      await this.saRepo.update({ schoolId: id }, { enabled: false })
      await this.userRepo.update({ schoolId: id }, { enabled: false })
    }
    return s
  }

  /** 删除学校（若仍有学校管理员则拒绝，避免产生孤儿管理员） */
  async deleteSchool(id: string) {
    const admins = await this.saRepo.find({ where: { schoolId: id } })
    if (admins.length) throw new BadRequestException('该校仍有学校管理员，请先删除或转移管理员后再删除学校')
    const r = await this.schoolRepo.delete(id)
    if (!r.affected) throw new BadRequestException('删除失败：学校不存在或已被删除')
    return { ok: true }
  }

  /* ===== 学校管理员管理（绑定已存在的学校） ===== */

  /** 列表：关联学校信息（名称+编号） */
  async listAdmins(skip = 0, take = 100) {
    const [admins, total] = await this.saRepo.findAndCount({
      order: { createdAt: 'DESC' }, skip, take,
    })
    if (!admins.length) return { items: [], total }
    const schoolIds = [...new Set(admins.map(a => a.schoolId).filter(Boolean))]
    const schools = schoolIds.length ? await this.schoolRepo.find({ where: schoolIds.map(id => ({ id })) }) : []
    const schoolMap = new Map(schools.map(s => [s.id, s]))
    const items = admins.map(a => {
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
    return { items, total }
  }

  /** 新增学校管理员：绑定已存在的学校（通过 schoolId 下拉选择） */
  async createAdmin(dto: { username: string; password: string; name: string; schoolId: string; enabled?: boolean }) {
    if (!dto.username || !dto.password || !dto.name || !dto.schoolId) {
      throw new BadRequestException('学校/用户名/密码/姓名必填')
    }
    const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } })
    if (!school) throw new BadRequestException('所选学校不存在')
    // 用户名唯一性校验
    const exist = await this.saRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BadRequestException('用户名已存在')

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

  /** 更新管理员信息（学校绑定/姓名/用户名/enabled） */
  async updateAdmin(id: string, dto: { schoolId?: string; name?: string; username?: string; enabled?: boolean }) {
    const a = await this.saRepo.findOne({ where: { id } })
    if (!a) throw new BadRequestException('管理员不存在')

    // 重新绑定学校（下拉选择）
    if (dto.schoolId && dto.schoolId !== a.schoolId) {
      const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } })
      if (!school) throw new BadRequestException('所选学校不存在')
      a.schoolId = dto.schoolId
    }

    // 用户名唯一性校验
    if (dto.username && dto.username !== a.username) {
      const exist = await this.saRepo.findOne({ where: { username: dto.username } })
      if (exist) throw new BadRequestException('用户名已存在')
      a.username = dto.username
    }

    if (dto.name && dto.name.trim()) a.name = dto.name.trim()
    if (dto.enabled !== undefined) a.enabled = dto.enabled

    await this.saRepo.save(a)
    return { ok: true }
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
    const result = await this.saRepo.delete(id)
    if (!result.affected) throw new BadRequestException('删除失败：管理员不存在或已被删除')
    return { ok: true }
  }

  /** 一键重置：清除所有学校管理员/教师/家长/业务数据，保留学校结构和超管账号 */
  async resetAll() {
    const tables = [
      'students', 'classes', 'exams', 'grades', 'notes', 'todos', 'picker_history',
      'backups', 'ai_settings', 'app_config', 'awards', 'generated',
      'class_ops', 'duty_rosters', 'engagements', 'growth_records',
      'parent_contacts', 'seats', 'gallery_items',
    ]
    await this.entityManager.transaction(async (em) => {
      // 删除所有学校管理员和教师（raw query 避免 TypeORM delete({}) 空条件限制）
      await em.query('DELETE FROM school_admins')
      await em.query('DELETE FROM users')
      // 删除所有业务数据表
      for (const t of tables) {
        try { await em.query(`DELETE FROM \`${t}\``) } catch (e) { /* 表不存在则跳过 */ }
      }
    })
    return { ok: true, message: '已清除所有管理员、教师、家长及业务数据，学校结构和超管账号保留' }
  }
}
