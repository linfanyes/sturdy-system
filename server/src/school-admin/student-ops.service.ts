import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, Not } from 'typeorm'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { AuditService } from '../audit/audit.service'
import { AiService } from '../ai/ai.service'
import { ClassMgmtService } from './class-mgmt.service'
import { normalizeGender } from '@gardener/shared/utils/gender'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import * as ExcelJS from 'exceljs'

/**
 * 校管端学生操作专职服务（A03 上帝服务拆分第 3 步）。
 * 从 SchoolAdminService 拆出：学生增删改、批量创建、文件/AI 识别导入、数据导出。
 */
@Injectable()
export class StudentOpsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly audit: AuditService,
    private readonly ai: AiService,
    private readonly classMgmt: ClassMgmtService,
  ) {}

  // ===== 学生管理 =====

  /** 编辑学生基本信息（含学号） */
  async updateStudent(schoolId: string, id: string, dto: { name?: string; gender?: string; parentName?: string; parentPhone?: string; studentNo?: string }) {
    const student = await this.studentRepo.findOne({ where: { id } })
    if (!student) throw new BadRequestException('学生不存在')
    const cls = await this.classRepo.findOne({ where: { id: student.classId } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此学生')
    // 学号唯一性校验：若修改学号，确保不与本校其他学生冲突
    if (dto.studentNo && dto.studentNo !== student.studentNo) {
      const clash = await this.studentRepo.findOne({ where: { studentNo: dto.studentNo, id: Not(id) } })
      if (clash) throw new BadRequestException('该学号已被其他学生使用')
    }
    Object.assign(student, dto)
    return this.studentRepo.save(student)
  }

  /** 删除学生（校验归属本校，事务清理关联家长联系记录） */
  async deleteStudent(schoolId: string, id: string) {
    const student = await this.studentRepo.findOne({ where: { id } })
    if (!student) throw new BadRequestException('学生不存在')
    const cls = await this.classRepo.findOne({ where: { id: student.classId } })
    if (cls) {
      const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
      if (!teacher) throw new BadRequestException('无权操作此学生')
    }
    await this.entityManager.transaction(async (em) => {
      // 清理家长联系记录
      try {
        await em.getRepository(ParentContact).delete({ studentId: id })
      } catch { /* 表不存在则跳过 */ }
      await em.getRepository(Student).remove(student)
    })
    this.audit.log(schoolId, 'delete_student', '系统', student.name + '(' + (student.studentNo || '') + ')', '删除学生').catch(() => {})
    return { ok: true }
  }

  /**
   * 批量创建学生：校验所有 classId 属于该 schoolId，逐条写入并返回成功/失败明细。
   * 参考 students.module.ts 的 importStudents，但以 schoolId 做归属校验、
   * 逐条 try/catch 收集结果（不因单条失败回滚全部，与 batchCreateTeachers 风格一致）。
   * 同步为带家长信息的学生生成 parent-contact 记录。
   * 根据学号控重：学号非空时，若数据库或本批次中已存在相同学号，则跳过并标记失败。
   */
  async batchCreateStudents(schoolId: string, students: any[]) {
    if (!students?.length) throw new BadRequestException('请提供至少一名学生信息')
    // 1. 校验：本校所有班级
    const allTeachers = await this.userRepo.find({ where: { schoolId }, select: ['id'] })
    const teacherIds = allTeachers.map(t => t.id)
    if (!teacherIds.length) throw new BadRequestException('本校暂无教师，无法创建学生')
    const classes = await this.classRepo.find({ where: teacherIds.map(id => ({ teacherId: id })) })
    const classMap = new Map(classes.map(c => [c.id, c]))
    if (!classMap.size) throw new BadRequestException('本校暂无班级，无法创建学生')

    // 2. 预查本校所有已存在学号，用于控重（学号非空才查）
    const allClassIds = Array.from(classMap.keys())
    const existingStudents = allClassIds.length
      ? await this.studentRepo.find({ where: allClassIds.map(id => ({ classId: id })), select: ['studentNo'] })
      : []
    const existingNos = new Set(existingStudents.map(s => s.studentNo).filter(Boolean))
    // 本批次内已写入的学号集合（防止批内重复）
    const batchSeenNos = new Set<string>()

    // 3. 逐条校验 + 写入
    const results: any[] = []
    let success = 0
    let failed = 0
    const today = new Date().toISOString().slice(0, 10)
    for (const it of students) {
      const name = String(it.name || '').trim()
      let gender = String(it.gender || '').trim()
      const studentNo = String(it.studentNo || '').trim()
      const classId = String(it.classId || '').trim()
      const parentName = String(it.parentName || '').trim()
      const parentPhone = String(it.parentPhone || '').trim()
      // 性别归一化
      gender = normalizeGender(gender)
      try {
        if (!name) throw new Error('缺少姓名')
        if (gender !== '男' && gender !== '女') throw new Error('性别须为男/女')
        if (!classId) throw new Error('缺少班级ID')
        const cls = classMap.get(classId)
        if (!cls) throw new Error('班级不属于本校')
        if (parentPhone && !/^\d{6,15}$/.test(parentPhone)) throw new Error('家长电话格式不正确')
        // 学号控重：学号非空时检查数据库已有 + 本批次已写入
        if (studentNo) {
          if (existingNos.has(studentNo)) throw new Error(`学号「${studentNo}」已存在（数据库）`)
          if (batchSeenNos.has(studentNo)) throw new Error(`学号「${studentNo}」在本批次中重复`)
        }

        // 当前班级已有学生数 + 1 作为 seatNo
        const existCount = await this.studentRepo.count({ where: { classId } })
        const e = new Student()
        Object.assign(e, {
          name, gender, studentNo, classId, parentName, parentPhone,
          seatNo: existCount + 1, tags: [], teacherId: cls.teacherId,
        })
        const saved = await this.studentRepo.save(e)
        // 记录已写入学号，供后续控重
        if (studentNo) batchSeenNos.add(studentNo)
        // 同步生成家长联系记录
        if (parentName || parentPhone) {
          const pc = new ParentContact()
          Object.assign(pc, {
            studentId: saved.id, studentName: name, classId,
            parentName: parentName || '家长', relation: '家长',
            phone: parentPhone || '', wechat: '',
            method: parentPhone ? '电话' : '其他',
            content: '校管批量导入时自动建立', date: today, followUp: '',
            teacherId: cls.teacherId,
          })
          await this.entityManager.save(ParentContact, pc).catch(() => {})
        }
        results.push({ name, studentNo, classId, status: '成功', id: saved.id })
        success++
      } catch (err: any) {
        results.push({ name, studentNo, classId, status: '失败', error: err.message || String(err) })
        failed++
      }
    }
    this.audit.log(schoolId, 'batch_create_students', '系统',
      `批量创建学生 ${success} 成功 / ${failed} 失败`, '校管批量导入学生').catch(() => {})
    return { total: students.length, success, failed, results }
  }

  /**
   * 解析学生文件（Excel/CSV/TXT/JSON），返回校验后的明细。
   * 与 students.module.ts parseFile 一致的列顺序：姓名,性别,学号,家长姓名,家长电话。
   * JSON 文件则直接解析为数组对象。classId 由调用方（import 端点）按班级统一填充。
   */
  async parseStudentFile(filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const ext = (filename.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(dataBase64, 'base64')
    let rawRows: string[][] = []

    if (ext === 'json') {
      // JSON 文件：直接解析为数组对象，转为统一的 row 结构
      let arr: any[] = []
      try {
        arr = JSON.parse(buf.toString('utf-8'))
      } catch {
        throw new BadRequestException('JSON 文件格式错误')
      }
      if (!Array.isArray(arr)) throw new BadRequestException('JSON 文件应为数组结构')
      rawRows = arr.map((o) => [
        String(o?.name ?? ''), String(o?.gender ?? ''), String(o?.studentNo ?? ''),
        String(o?.parentName ?? ''), String(o?.parentPhone ?? ''),
      ])
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

    // 跳过表头（首格含「姓名」认定为表头）
    if (rawRows.length && /姓名|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      let gender = String(r[1] || '').trim()
      const studentNo = String(r[2] || '').trim()
      const parentName = String(r[3] || '').trim()
      const parentPhone = String(r[4] || '').trim()
      gender = normalizeGender(gender)

      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone))
        error = '家长电话格式不正确（应为6-15位数字）'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, studentNo, parentName, parentPhone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
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
   * AI 识别学生文件：文本解析后交给大模型结构化，返回与 parseStudentFile 同构的预览行。
   */
  async aiRecognizeStudents(teacherId: string, filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const { text } = await this.ai.parseFile('teacher', teacherId, { fileName: filename, fileData: dataBase64 })
    const instruction =
      '从下列文本中提取学生名单，每行/每位学生一行。只返回 JSON 数组，不要解释或前后缀。' +
      '元素字段：name(姓名,必填字符串), gender(性别,仅"男"或"女",必填), studentNo(学号,可空), ' +
      'parentName(家长姓名,可空), parentPhone(家长电话,可空数字)。'
    const res = await this.ai.parse('teacher', teacherId, { text, instruction })
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    this.normalizeAiRows(res).forEach((o: any, i: number) => {
      const name = String(o?.name ?? '').trim()
      let gender = String(o?.gender ?? '').trim()
      gender = normalizeGender(gender)
      const studentNo = String(o?.studentNo ?? '').trim()
      const parentName = String(o?.parentName ?? '').trim()
      const parentPhone = String(o?.parentPhone ?? '').trim()
      let error = ''
      if (!name) error = '缺少姓名'
      else if (gender !== '男' && gender !== '女') error = '性别须为男/女'
      else if (parentPhone && !/^\d{6,15}$/.test(parentPhone)) error = '家长电话格式不正确'
      if (error) errorCount++
      else validCount++
      rows.push({ name, gender, studentNo, parentName, parentPhone, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  // ===== 数据导出 =====

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

  // S02修复：手机号脱敏辅助函数（导出场景使用）
  private maskPhone(phone?: string): string {
    const p = String(phone || '')
    if (p.length <= 4) return p
    return p.slice(0, 3) + '****' + p.slice(-4)
  }

  async exportStudents(schoolId: string): Promise<string> {
    const r = await this.classMgmt.listSchoolStudents(schoolId, 0, 10000)
    const rows = [['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']]
    for (const s of r.items) {
      // S02修复：导出时家长电话脱敏，防止敏感信息泄露
      rows.push([s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone ? this.maskPhone(s.parentPhone) : '', s.parentLoginEnabled ? '是' : '否'])
    }
    return this.toCsv(rows)
  }

  async exportStudentsData(schoolId: string) {
    const r = await this.classMgmt.listSchoolStudents(schoolId, 0, 10000)
    const data = r.items.map(s => ({
      id: s.id, name: s.name, studentNo: s.studentNo, gender: s.gender,
      classId: s.classId, className: s.className,
      parentName: s.parentName, parentPhone: s.parentPhone,
      parentLoginEnabled: s.parentLoginEnabled,
    }))
    return { total: r.total, data }
  }

  async exportStudentsXls(schoolId: string): Promise<Buffer> {
    const r = await this.classMgmt.listSchoolStudents(schoolId, 0, 10000)
    const headers = ['姓名', '学号', '性别', '班级', '家长', '家长电话', '家长开通']
    // S02修复：xlsx导出同样脱敏家长电话
    const rows = r.items.map((s) => [s.name, s.studentNo || '', s.gender || '', s.className || '', s.parentName || '', s.parentPhone ? this.maskPhone(s.parentPhone) : '', s.parentLoginEnabled ? '是' : '否'])
    return this.workbookFrom(headers, rows)
  }
}
