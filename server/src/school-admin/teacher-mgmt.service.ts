import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, In } from 'typeorm'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { ClassItem } from '../classes/class.entity'
import { ClassMemberService } from '../class-members/class-members.module'
import { AuditService } from '../audit/audit.service'
import { AiService } from '../ai/ai.service'
import { hashPassword } from '../common/utils/password.util'
import { normalizeGender } from '@gardener/shared/utils/gender'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import { pinyin } from 'pinyin-pro'
import * as ExcelJS from 'exceljs'
import { TEACHER_ID_TABLES } from '../common/constants/tenant-tables'

/**
 * 教师管理服务：负责教师的增删改查、批量导入/导出、密码重置、AI 识别等。
 * 从 SchoolAdminService 拆分出来，降低原服务的复杂度。
 */
@Injectable()
export class TeacherMgmtService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    private readonly classMemberSvc: ClassMemberService,
    private readonly audit: AuditService,
    private readonly ai: AiService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  /** 本校教师列表 */
  async listTeachers(schoolId: string, skip = 0, take = 200, keyword?: string) {
    let where: any = { schoolId }
    let teachers: User[]
    let total: number
    if (keyword && keyword.trim()) {
      const kw = keyword.trim()
      teachers = await this.userRepo.find({ where: { schoolId }, order: { createdAt: 'DESC' } })
      const filtered = teachers.filter(u =>
        u.name?.includes(kw) || u.username?.includes(kw) || u.teacherNo?.includes(kw) || u.subject?.includes(kw)
      )
      total = filtered.length
      teachers = filtered.slice(skip, skip + take)
    } else {
      const [items, cnt] = await this.userRepo.findAndCount({
        where: { schoolId }, order: { createdAt: 'DESC' }, skip, take,
      })
      teachers = items
      total = cnt
    }
    const items = teachers.map(u => ({
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
      // S03修复：密码可选：未传则生成8位随机密码，强制首次修改
      const initialPassword = dto.password && dto.password.length >= 6
        ? dto.password
        : this.generateRandomPassword()
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
   * 未提供合规密码（6-20 位）时，生成8位随机密码（仍满足不少于6位）。
   */
  async resetPassword(schoolId: string, teacherId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    // 密码长度下限不少于6位（用户要求），上限20位
    const raw = (newPassword || '').trim()
    let pwd: string
    if (raw) {
      if (raw.length < 6 || raw.length > 20) throw new BadRequestException('密码长度须为 6-20 位')
      pwd = raw
    } else {
      pwd = this.generateRandomPassword() // 未提供则生成随机密码
    }
    user.passwordHash = hashPassword(pwd)
    // 重置密码同时重新启用账号：若教师此前被禁用（学校停用级联或手动禁用），
    // 仅重置密码而不恢复 enabled 会导致登录时被 enabled 检查拦截
    user.enabled = true
    await this.userRepo.save(user)
    return { ok: true, defaultPassword: pwd, forcePasswordChange: true }
  }

  /** S03修复：生成8位随机密码（包含大小写字母和数字） */
  private generateRandomPassword(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /** 获取教师详情 */
  async getTeacher(schoolId: string, teacherId: string) {
    const user = await this.userRepo.findOne({ where: { id: teacherId, schoolId } })
    if (!user) throw new BadRequestException('教师不存在或不属于本校')
    return {
      id: user.id, name: user.name, username: user.username, subject: user.subject,
      phone: user.phone, gender: user.gender, school: user.school, features: user.features || [],
      enabled: user.enabled !== false, createdAt: user.createdAt,
      teacherNo: user.teacherNo || '', position: user.position || '',
      positions: user.positions || [], grade: user.grade || '',
    }
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

  /** 导出教师 CSV */
  async exportTeachers(schoolId: string): Promise<string> {
    const r = await this.listTeachers(schoolId)
    const rows = [['姓名', '用户名', '学科', '性别', '手机号', '教师编号', '状态']]
    for (const t of r.items) {
      rows.push([t.name, t.username || '', t.subject || '', t.gender || '', t.phone ? this.maskPhone(t.phone) : '', t.teacherNo || '', t.enabled ? '启用' : '禁用'])
    }
    return this.toCsv(rows)
  }

  /** 导出教师 xlsx 二进制 */
  async exportTeachersXls(schoolId: string): Promise<Buffer> {
    const r = await this.listTeachers(schoolId)
    const headers = ['姓名', '用户名', '学科', '性别', '手机号', '教师编号', '状态']
    const rows = r.items.map((t) => [t.name, t.username || '', t.subject || '', t.gender || '', t.phone ? this.maskPhone(t.phone) : '', t.teacherNo || '', t.enabled ? '启用' : '禁用'])
    return this.workbookFrom(headers, rows as any[])
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
      gender = normalizeGender(gender)
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
      gender = normalizeGender(gender)
      let error = ''
      if (!name) error = '缺少姓名'
      else if (phone && !/^\d{6,15}$/.test(phone)) error = '手机号格式不正确'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, subject, phone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  // ===== 工具方法（复用） =====

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

  private maskPhone(phone?: string): string {
    const p = String(phone || '')
    if (p.length <= 4) return p
    return p.slice(0, 3) + '****' + p.slice(-4)
  }
}
