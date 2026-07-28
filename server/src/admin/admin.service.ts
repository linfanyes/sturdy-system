import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, In } from 'typeorm'
import * as crypto from 'node:crypto'
import { User } from '../users/user.entity'
import { School } from '../school/school.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { hashPassword } from '../common/utils/password.util'
import { BusinessException } from '../common/exceptions/business.exception'
import { AuditService } from '../audit/audit.service'
import { TEACHER_ID_TABLES, CLASS_ID_TABLES, ALL_BUSINESS_TABLES } from '../common/constants/tenant-tables'

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly audit: AuditService,
  ) {}

  /** 启动时自动检测种子数据，核心账号不存在时自动重建 */
  async onModuleInit() {
    try {
      const adminCount = await this.userRepo.count({ where: { username: 'admin' } } as any)
      if (adminCount === 0) {
        console.log('[Seed] 未检测到管理员账号，自动重建种子数据…')
        await this.seedDemoData()
      }
    } catch (e) {
      console.warn('[Seed] 自动重建失败（首次启动时表可能尚未就绪，可忽略）:', (e as Error).message)
    }
  }

  /** 重建演示模式种子数据（学校/校管/教师/班级/学生） */
  async seedDemoData() {
    let schools = await this.schoolRepo.find()
    if (schools.length === 0) {
      const s1 = this.schoolRepo.create({ code: 'SCH001', name: '阳光实验小学', address: '默认地址' })
      const s2 = this.schoolRepo.create({ code: 'SCH002', name: '明德小学' })
      schools = await this.schoolRepo.save([s1, s2])
      console.log('[Seed] 已创建 2 所默认学校')
    }
    const saCount = await this.saRepo.count()
    if (saCount === 0 && schools.length >= 1) {
      const pwd = hashPassword('123456')
      const sa1 = this.saRepo.create({ username: 'sa1', passwordHash: pwd, name: '赵主任', schoolId: schools[0].id, enabled: true })
      const sa2 = this.saRepo.create({ username: 'sa2', passwordHash: pwd, name: '钱主任', schoolId: schools[schools.length - 1]?.id || schools[0].id, enabled: true })
      await this.saRepo.save([sa1, sa2])
      console.log('[Seed] 已创建 2 名默认学校管理员 (sa1/sa2)')
    }
    const userCount = await this.userRepo.count()
    if (userCount === 0 && schools.length >= 1) {
      const pwd = hashPassword('123456')
      const teachers = [
        { name: '王老师', username: 'teacher1', subject: '语文', enabled: true },
        { name: '李老师', username: 'teacher2', subject: '数学', enabled: true },
        { name: '张老师', username: 'teacher3', subject: '英语', enabled: true },
        { name: '陈老师', username: 'teacher4', subject: '音乐', enabled: true },
      ]
      for (const t of teachers) {
        const u = this.userRepo.create({
          ...t, schoolId: schools[0].id, school: schools[0].name,
          passwordHash: pwd, phone: '', teacherNo: '',
        } as any)
        await this.userRepo.save(u)
      }
      console.log('[Seed] 已创建 4 名默认教师 (teacher1~teacher4)')
    }
    const classCount = await this.classRepo.count()
    if (classCount === 0) {
      const [wang, li] = await this.userRepo.find({ where: { username: 'teacher1' } } as any)
      const c1 = this.classRepo.create({ teacherId: wang.id, name: '一年级一班', grade: '一年级', classNo: '1', headTeacher: wang.name, term: '2026春季学期', subjects: ['语文','数学','英语'], color: 'butter' })
      const c2 = this.classRepo.create({ teacherId: li?.id || wang.id, name: '二年级二班', grade: '二年级', classNo: '2', headTeacher: li?.name || wang.name, term: '2026春季学期', subjects: ['语文','数学','英语','科学'], color: 'rose' })
      const classes = await this.classRepo.save([c1, c2])
      console.log('[Seed] 已创建 2 个默认班���')
      const stuCount = await this.studentRepo.count()
      if (stuCount === 0) {
        const stus = [
          { classId: classes[0].id, teacherId: wang.id, name: '张小明', gender: '男', studentNo: '2024001', parentName: '张伟', parentPhone: '13800001001' },
          { classId: classes[0].id, teacherId: wang.id, name: '李小华', gender: '女', studentNo: '2024002', parentName: '李强', parentPhone: '13800001002' },
          { classId: classes[0].id, teacherId: wang.id, name: '王小芳', gender: '女', studentNo: '2024003' },
          { classId: classes[0].id, teacherId: wang.id, name: '赵小刚', gender: '男', studentNo: '2024004' },
          { classId: classes[0].id, teacherId: wang.id, name: '刘思琪', gender: '女', studentNo: '2024005' },
          { classId: classes[0].id, teacherId: wang.id, name: '孙浩然', gender: '男', studentNo: '2024006' },
        ]
        await this.studentRepo.save(stus.map(s => this.studentRepo.create(s)))
        console.log('[Seed] 已创建 6 名默认学生（一年级一班）')
      }
    }
    console.log('[Seed] 种子数据自动重建完成')
  }

  /** 超管登录 → JWT */
  login(username: string, password: string) {
    const cfgUser = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const cfgPass = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (username !== cfgUser || password !== cfgPass) throw new UnauthorizedException('账号或密码错误')
    return { token: this.jwt.sign({ sub: 'super', role: 'super' }) }
  }

  /**
   * 生成学校编号：2 位前缀（管理员输入）+ 5 位随机字母数字 + 1 位平台后缀，
   * 共 8 位。web 端后缀 H，小程序端后缀 W。
   * 前缀不足 2 位或含非法字符将抛错。
   */
  private async genSchoolCode(prefix: string, suffixChar = 'H'): Promise<string> {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const digits = '23456789'
    const all = letters + digits
    const p = (prefix || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 2)
    if (p.length !== 2) {
      throw new BadRequestException('学校编号前缀必须为 2 位字符（大写字母或数字）')
    }
    const suffix = (suffixChar || 'H').toUpperCase().slice(0, 1)
    for (let attempt = 0; attempt < 30; attempt++) {
      const bytes = crypto.randomBytes(5)
      let rand = ''
      for (let i = 0; i < 5; i++) rand += all[bytes[i] % all.length]
      const code = p + rand + suffix // 2 + 5 + 1 = 8 位
      const dup = await this.schoolRepo.findOne({ where: { code } })
      if (!dup) return code
    }
    // 兜底：极端冲突时缩短随机段
    const tail = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
    return p + tail + suffix
  }

  /* ===== 学校管理（超管维护） ===== */

  /** 学校列表 */
  async listSchools(skip = 0, take = 100) {
    const [items, total] = await this.schoolRepo.findAndCount({
      order: { createdAt: 'DESC' }, skip, take,
    })
    return { items, total }
  }

  /** 学校详情 */
  async getSchool(id: string) {
    const s = await this.schoolRepo.findOne({ where: { id } })
    if (!s) throw new NotFoundException('学校不存在')
    return s
  }

  /** 新增学校：编号 = 2 位前缀 + 5 位随机 + 平台后缀(H/W)，共 8 位 */
  async createSchool(dto: { name: string; prefix?: string; platform?: 'web' | 'mini'; address?: string; contact?: string; phone?: string; status?: string }) {
    if (!dto.name || !dto.name.trim()) throw new BadRequestException('学校名称必填')
    const suffix = dto.platform === 'mini' ? 'W' : 'H'
    const code = await this.genSchoolCode(dto.prefix || '', suffix)
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

  /** 更新学校（编号不可改） */
  async updateSchool(id: string, dto: { name?: string; address?: string; contact?: string; phone?: string; status?: string }) {
    const s = await this.schoolRepo.findOne({ where: { id } })
    if (!s) throw new BadRequestException('学校不存在')
    if (dto.name !== undefined && dto.name.trim()) s.name = dto.name.trim()
    if (dto.address !== undefined) s.address = dto.address
    if (dto.contact !== undefined) s.contact = dto.contact
    if (dto.phone !== undefined) s.phone = dto.phone
    if (dto.status !== undefined) s.status = dto.status
    await this.schoolRepo.save(s)
    // 停用：级联禁用该校所有管理员和教师
    if (dto.status === 'inactive') {
      await this.saRepo.update({ schoolId: id }, { enabled: false })
      await this.userRepo.update({ schoolId: id }, { enabled: false })
    }
    // 启用：恢复管理员（以便登录管理教师），教师由管理员手动逐一启用
    if (dto.status === 'active') {
      await this.saRepo.update({ schoolId: id }, { enabled: true })
      // 教师不自动启用，需要学校管理员手动操作
    }
    return s
  }

  /** 删除学校（级联清理：教师、班级、学生、所有业务数据） */
  async deleteSchool(id: string) {
    const admins = await this.saRepo.find({ where: { schoolId: id } })
    if (admins.length) throw new BadRequestException('该校仍有学校管理员，请先删除或转移管理员后再删除学校')
    const r = await this.schoolRepo.findOne({ where: { id } })
    if (!r) throw new BadRequestException('学校不存在')

    await this.entityManager.transaction(async (em) => {
      // 1. 获取该校所有教师
      const teachers = await em.getRepository(User).find({ where: { schoolId: id } })
      const teacherIds = teachers.map(t => t.id)
      // 2. 获取该校所有班级
      const classes = await em.getRepository(ClassItem).find({ where: { teacherId: In(teacherIds) } })
      const classIds = classes.map(c => c.id)
      // 3. 清理教师关联的业务数据
      if (teacherIds.length) {
        for (const t of TEACHER_ID_TABLES) {
          try {
            await em.query(`DELETE FROM \`${t}\` WHERE teacherId IN (?)`, [teacherIds])
          } catch { /* 跳过 */ }
        }
      }
      // 4. 清理班级关联的业务数据
      if (classIds.length) {
        for (const t of CLASS_ID_TABLES) {
          try {
            await em.query(`DELETE FROM \`${t}\` WHERE classId IN (?)`, [classIds])
          } catch { /* 跳过 */ }
        }
      }
      // 5. 清理学生
      if (classIds.length) {
        await em.getRepository(Student).delete({ classId: In(classIds) })
      }
      // 6. 清理班级
      if (teacherIds.length) {
        await em.getRepository(ClassItem).delete({ teacherId: In(teacherIds) })
      }
      // 7. 清理教师
      await em.getRepository(User).delete({ schoolId: id })
      // 8. 清理校管
      await em.getRepository(SchoolAdmin).delete({ schoolId: id })
      // 9. 删除学校
      await em.getRepository(School).delete(id)
    })
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
      throw new BusinessException('ADMIN_FIELDS_REQUIRED', '学校/用户名/密码/姓名必填')
    }
    const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } })
    if (!school) throw new BusinessException('SCHOOL_NOT_FOUND', '所选学校不存在')
    // 用户名唯一性校验
    const exist = await this.saRepo.findOne({ where: { username: dto.username } })
    if (exist) throw new BusinessException('ADMIN_USERNAME_EXISTS', '用户名已存在')

    // 创建学校管理员：统一使用 bcrypt 哈希（与 seed / resetAdminPassword 保持一致，
    // 避免 sha256 与 bcrypt 双格式并存导致登录校验偶发失败）
    const hash = hashPassword(dto.password)
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
    a.passwordHash = hashPassword(newPassword)
    await this.saRepo.save(a)
    return { ok: true }
  }

  /** 删除管理员（不删学校，保留学校数据） */
  async deleteAdmin(id: string) {
    const result = await this.saRepo.delete(id)
    if (!result.affected) throw new BadRequestException('删除失败：管理员不存在或已被删除')
    return { ok: true }
  }

  /** 批量启用/禁用学校（勾选后一键停用/启用） */
  async batchToggleSchoolEnabled(ids: string[], enabled: boolean, operator = 'super') {
    if (!ids || !ids.length) throw new BadRequestException('请至少选择一条数据')
    const result = await this.schoolRepo.update(ids, { status: enabled ? 'active' : 'inactive' })
    // 级联禁用该校所有管理员和教师
    for (const id of ids) {
      await this.saRepo.update({ schoolId: id }, { enabled })
      await this.userRepo.update({ schoolId: id }, { enabled })
    }
    try {
      await this.audit.log('', 'batch_toggle_school', operator, `学校(${ids.length}所)`, `${enabled ? '批量启用' : '批量禁用'}学校`)
    } catch { /* audit 失败不应阻断主流程 */ }
    return { ok: true, message: `已${enabled ? '启用' : '禁用'} ${ids.length} 所学校` }
  }

  /** 批量启用/禁用学校管理员（勾选后一键停用/启用） */
  async batchToggleAdminEnabled(ids: string[], enabled: boolean, operator = 'super') {
    if (!ids || !ids.length) throw new BadRequestException('请至少选择一条数据')
    const result = await this.saRepo.update(ids, { enabled })
    try {
      await this.audit.log('', 'batch_toggle_admin', operator, `管理员(${ids.length}人)`, `${enabled ? '批量启用' : '批量禁用'}管理员`)
    } catch { /* audit 失败不应阻断主流程 */ }
    return { ok: true, message: `已${enabled ? '启用' : '禁用'} ${ids.length} 名管理员` }
  }

  /**
   * 超管一键全量重置：清除所有学校、教师及其全部个人数据，然后重建种子数据。
   * 此操作不可逆，仅用于演示环境恢复到干净初始化状态。
   */
  async resetAll(confirmed: boolean, operator = 'super') {
    if (!confirmed) throw new BadRequestException('请确认全量重置操作（confirm: true）。此操作将清除所有学校和教师数据，不可逆！')
    await this.entityManager.transaction(async (em) => {
      const teacherTables = [
        'picker_history', 'todos', 'notes', 'ai_settings', 'app_config', 'audit_logs',
        'paper_queries', 'generated_knowledges', 'generated_lesson_plans', 'generated_papers',
        'notice_templates', 'notifications', 'semesters', 'teaching_calendar',
        'backup_snapshots', 'reading_logs', 'checkins', 'home_visits',
        'behavior_records', 'growth_entries', 'parent_contacts',
        'award_records', 'award_categories', 'score_records', 'reward_records', 'group_scores',
        'grades', 'exams', 'homework', 'attendances', 'schedules',
        'seat_layouts', 'resources', 'work_logs', 'lesson_observations', 'lesson_plan_templates',
        'class_members', 'class_activities', 'class_expenses', 'class_duty_configs',
        'class_galleries', 'my_galleries', 'notices', 'duty_rosters', 'teachers',
      ]
      const classTables = [
        'grades', 'exams', 'homework', 'attendances', 'notices', 'schedules',
        'seat_layouts', 'class_galleries', 'my_galleries', 'class_activities',
        'class_expenses', 'class_duty_configs', 'duty_rosters', 'class_members',
      ]
      const teacherIds = await em.getRepository(User).find({ select: ['id'] }).then(r => r.map(t => t.id))
      const classIds = await em.getRepository(ClassItem).find({ select: ['id'] }).then(r => r.map(c => c.id))
      if (teacherIds.length) {
        for (const t of teacherTables) {
          try { await em.query(`DELETE FROM \`${t}\` WHERE teacherId IN (?)`, [teacherIds]) } catch { /* skip */ }
        }
      }
      if (classIds.length) {
        for (const t of classTables) {
          try { await em.query(`DELETE FROM \`${t}\` WHERE classId IN (?)`, [classIds]) } catch { /* skip */ }
        }
      }
      await em.getRepository(Student).delete({})
      await em.getRepository(ClassItem).delete({})
      await em.getRepository(User).delete({})
      await em.getRepository(SchoolAdmin).delete({})
      await em.getRepository(School).delete({})
    })
    await this.audit.log('', 'system_reset_all', operator, '全系统', '一键全量重置：清除所有学校/教师/班级/学生/业务数据').catch(() => {})
    await this.seedDemoData()
    return { ok: true, message: '已全量清除所有学校、教师、班级、学生及全部业务数据，并重建默认种子数据（超管/sa1/sa2/教师/班级/学生）' }
  }


  /** 超管获取所有教师列表 */
  async listTeachers(skip = 0, take = 500) {
    const [items, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' }, skip, take,
    })
    // 关联学校名称
    const schoolIds = [...new Set(items.map(u => u.schoolId).filter(Boolean))]
    const schools = schoolIds.length ? await this.schoolRepo.find({ where: schoolIds.map(id => ({ id })) }) : []
    const schoolMap = new Map(schools.map(s => [s.id, s.name]))
    const list = items.map(u => ({
      id: u.id, name: u.name, username: u.username, subject: u.subject,
      schoolId: u.schoolId, schoolName: schoolMap.get(u.schoolId) || '',
      teacherNo: u.teacherNo, phone: u.phone, enabled: u.enabled,
      createdAt: u.createdAt,
    }))
    return { items: list, total }
  }

  /** 清除单个教师的业务数据（保留教师账号，仅清除其创建的记录） */
  async clearTeacherData(teacherId: string, operator = 'super') {
    const user = await this.userRepo.findOne({ where: { id: teacherId } })
    if (!user) throw new BadRequestException('教师不存在')

    // 所有包含 teacherId 的业务表（使用共享常量，消除与 school-admin 的重复定义）
    await this.entityManager.transaction(async (em) => {
      for (const t of ALL_BUSINESS_TABLES) {
        try {
          await em.query(`DELETE FROM \`${t}\` WHERE teacherId = ?`, [teacherId])
        } catch {
          // 表不存在则跳过
        }
      }
      // 清除教师个人资料（teachers 表）
      try {
        await em.query(`DELETE FROM \`teachers\` WHERE id = ?`, [teacherId])
      } catch { /* teachers 表可能无此记录 */ }
      // 置空班级的 teacherId（避免孤儿班级）
      try {
        await em.getRepository(ClassItem).update({ teacherId }, { teacherId: null })
      } catch { /* ClassItem 表可能无 teacherId 字段 */ }
    })

    // 记录审计日志
    try {
      await this.audit.log(user.schoolId || '', 'clear_teacher_data', operator, user.name + '(' + user.username + ')', '清理教师业务数据')
    } catch { /* audit 失败不应阻断主流程 */ }

    return { ok: true, message: `已清除教师「${user.name}」的所有业务数据，教师账号已保留` }
  }
}
