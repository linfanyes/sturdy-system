import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { User } from '../users/user.entity'
import { ClassMember } from '../class-members/class-member.entity'
import { ClassMemberService } from '../class-members/class-members.module'
import { AuditService } from '../audit/audit.service'
import { AiService } from '../ai/ai.service'
import { xlsxFirstSheetToRows } from '../common/excel.util'
import { normalizeGender } from '@gardener/shared/utils/gender'
import * as ExcelJS from 'exceljs'
import { CLASS_ID_TABLES } from '../common/constants/tenant-tables'

/**
 * 班级管理服务：负责班级的增删改查、批量创建、升降级、学生列表、导出等。
 * 从 SchoolAdminService 拆分出来，降低原服务的复杂度。
 */
@Injectable()
export class ClassMgmtService {
  constructor(
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ClassMember) private readonly classMemberRepo: Repository<ClassMember>,
    private readonly classMemberSvc: ClassMemberService,
    private readonly audit: AuditService,
    private readonly ai: AiService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  /** 本校班级列表（通过教师所属学校查询） */
  async listClasses(schoolId: string, skip = 0, take = 500) {
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const ids = allTeachers.map(t => t.id)
    if (!ids.length) return { items: [], total: 0 }
    const [items, total] = await this.classRepo.findAndCount({
      where: ids.map(id => ({ teacherId: id })),
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    if (items.length) {
      const classIds = items.map(i => i.id)
      // 回填每个班级的学生人数（按 classId 分组统计）
      const counts: Array<{ classId: string; cnt: string }> = await this.studentRepo
        .createQueryBuilder('s')
        .select('s.classId', 'classId')
        .addSelect('COUNT(*)', 'cnt')
        .where('s.classId IN (:...ids)', { ids: classIds })
        .groupBy('s.classId')
        .getRawMany()
      const cntByClass = new Map(counts.map(r => [r.classId, Number(r.cnt) || 0]))
      // 从 class_members 回填科任老师（role='subject'），保证前端编辑下拉能显示已选科任；
      // 实体 subjectTeachers 列可能为历史遗留的 Record 或空值，此处以 class_member 为准
      const members = await this.classMemberRepo.find({
        where: classIds.map(cid => ({ classId: cid, role: 'subject' })),
      })
      const byClass = new Map<string, { teacherId: string; subjects: string[] }[]>()
      for (const m of members) {
        if (!byClass.has(m.classId)) byClass.set(m.classId, [])
        byClass.get(m.classId)!.push({ teacherId: m.teacherId, subjects: m.subjects || [] })
      }
      for (const item of items) {
        ;(item as any).studentCount = cntByClass.get(item.id) || 0
        ;(item as any).subjectTeachers = byClass.get(item.id) || []
      }
    }
    return { items, total }
  }

  /** 单个班级详情（校验班级属于本校） */
  async getClass(schoolId: string, id: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    // 验证班级属于本校
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权查看此班级')
    // 学生人数
    const studentCount = await this.studentRepo.count({ where: { classId: id } })
    ;(cls as any).studentCount = studentCount
    // 科任老师（含班主任）
    const allMembers = await this.classMemberRepo.find({ where: { classId: id } })
    ;(cls as any).members = allMembers
    const subjectMembers = allMembers.filter(m => m.role === 'subject')
    ;(cls as any).subjectTeachers = subjectMembers.map(m => ({ teacherId: m.teacherId, subjects: m.subjects || [] }))
    return cls
  }

  /** 创建班级（班主任必须是本校教师，由校管指定班主任身份；支持指定班主任任教学科 + 一次性加入科任老师） */
  async createClass(schoolId: string, dto: {
    name: string; grade: string; classNo: string; headTeacher: string; headTeacherId: string;
    term?: string; subjects?: string[];
    subjectTeachers?: { teacherId: string; subjects?: string[] }[];
  }) {
    if (!dto.name || !dto.grade || !dto.headTeacherId) throw new BadRequestException('班级名称/年级/班主任必填')
    const teacher = await this.userRepo.findOne({ where: { id: dto.headTeacherId, schoolId } })
    if (!teacher) throw new BadRequestException('指定的班主任不在本校')
    const term = dto.term || ''
    // 前置校验：该老师是否已在本学期其他班级担任班主任（业务规则：一师一班 head，按学期隔离）
    await this.classMemberSvc.assertTeacherNotHeadElsewhere(teacher.id, '', term)
    const c = this.classRepo.create({
      teacherId: teacher.id, name: dto.name, grade: dto.grade, classNo: dto.classNo || '1',
      headTeacher: dto.headTeacher || teacher.name, term,
      subjects: dto.subjects || [],
    })
    const saved = await this.classRepo.save(c)
    // 写入 class_members 的 head 记录（addHeadTeacher 内部会再次 assertCanBecomeHead 兜底；
    // 数据库部分唯一索引 0014 迁移最终兜底并发场景；subjects 支持班主任兼任本班科任）
    await this.classMemberSvc.addHeadTeacher(teacher.id, saved.id, saved.name, term, dto.subjects || [])
    // 一次性加入科任老师（校验同校，按学期写入 class_members）
    if (dto.subjectTeachers?.length) {
      for (const st of dto.subjectTeachers) {
        if (!st.teacherId || st.teacherId === teacher.id) continue // 跳过空值和班主任自身（已是 head）
        const stUser = await this.userRepo.findOne({ where: { id: st.teacherId, schoolId } })
        if (!stUser) throw new BadRequestException(`科任老师 ${st.teacherId} 不在本校`)
        await this.classMemberSvc.addSubjectTeacher(st.teacherId, saved.id, saved.name, st.subjects || [], term)
      }
    }
    this.audit.log(schoolId, 'create_class', '系统', saved.name, `班主任：${teacher.name}`).catch(() => {})
    return saved
  }

  /** 更新班级信息（支持转交班主任） */
  async updateClass(schoolId: string, id: string, dto: Partial<{ name: string; grade: string; classNo: string; headTeacher: string; term: string; headTeacherId: string; subjects?: string[]; subjectTeachers?: { teacherId: string; subjects?: string[] }[] }>) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    // 验证班级属于本校
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    // 转交班主任：修改 classes.teacherId 并更新 class_members（按班级当前学期 term 隔离）
    if (dto.headTeacherId && dto.headTeacherId !== cls.teacherId) {
      const newHead = await this.userRepo.findOne({ where: { id: dto.headTeacherId, schoolId } })
      if (!newHead) throw new BadRequestException('指定的新班主任不在本校')
      const term = cls.term || ''
      // 前置校验：新班主任是否已在本学期其他班级担任班主任（业务规则：一师一班 head，按学期隔离）
      // 必须在降级旧 head 之前做，避免误触"该班级已有班主任"规则
      await this.classMemberSvc.assertTeacherNotHeadElsewhere(newHead.id, id, term)
      // 降级旧班主任为科任老师（同 term 内，保留协作关系可在本班继续任教）
      await this.classMemberRepo
        .createQueryBuilder()
        .update()
        .set({ role: 'subject' })
        .where('classId = :cid AND teacherId = :tid AND term = :term', { cid: id, tid: teacher.id, term })
        .execute()
        .catch(() => {})
      // 写入新班主任 head 记录（addHeadTeacher 内部 assertCanBecomeHead 兜底：
      // 规则1再次校验，规则2因旧 head 已降级而通过）
      await this.classMemberSvc.addHeadTeacher(newHead.id, id, cls.name, term)
      cls.teacherId = newHead.id
      cls.headTeacher = dto.headTeacher || newHead.name
      // 同步更新该班所有学生的 teacherId，避免转交后原班主任仍能看到学生、新班主任看不到
      await this.studentRepo.update({ classId: id }, { teacherId: newHead.id }).catch(() => {})
    } else {
      Object.assign(cls, dto)
    }
    // 同步「班主任任教学科」到班级主表（列表展示依赖 ClassItem.subjects）
    if (dto.subjects !== undefined) cls.subjects = dto.subjects
    // 同步科任老师（按科目下拉设置）：清除现有 role='subject' 成员后按 dto 重新写入（排除班主任本人）
    if (dto.subjectTeachers !== undefined) {
      const term = cls.term || ''
      await this.classMemberRepo
        .createQueryBuilder()
        .delete()
        .where('classId = :cid AND role = :role', { cid: id, role: 'subject' })
        .execute()
        .catch(() => {})
      for (const st of dto.subjectTeachers) {
        if (!st.teacherId || st.teacherId === cls.teacherId) continue
        await this.classMemberSvc.addSubjectTeacher(st.teacherId, id, cls.name, st.subjects || [], term)
      }
    }
    return this.classRepo.save(cls)
  }

  /** 删除班级（级联清理：class_members + 学生家长登录 + 班级业务数据 + 学生 classId 置空） */
  async deleteClass(schoolId: string, id: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')
    await this.entityManager.transaction(async (em) => {
      // 1. 清理班级成员关系
      await em.getRepository(ClassMember).delete({ classId: id })
      // 2. 学生 classId 置空并禁用家长登录（classId 列 NOT NULL，用空串代替 null）
      await em.getRepository(Student).update(
        { classId: id },
        { classId: '', parentLoginEnabled: false, parentNickName: '', parentPasswordHash: null }
      )
      // 3. 清理班级关联的业务数据（按 classId，使用共享常量）
      for (const t of CLASS_ID_TABLES) {
        try {
          await em.query(`DELETE FROM \`${t}\` WHERE classId = ?`, [id])
        } catch { /* 表不存在或无该字段则跳过 */ }
      }
      // 4. 最后删除班级
      await em.getRepository(ClassItem).remove(cls)
    })
    this.audit.log(schoolId, 'delete_class', '系统', cls.name, '删除班级（学生 classId 置空，禁用家长登录，清理业务数据）').catch(() => {})
    return { ok: true }
  }

  /** 班级升级：三年级一班 → 四年级一班（年级+1，名称自动更新，学生和班主任保留） */
  async promoteClass(schoolId: string, id: string, targetGrade?: string) {
    const cls = await this.classRepo.findOne({ where: { id } })
    if (!cls) throw new BadRequestException('班级不存在')
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId } })
    if (!teacher) throw new BadRequestException('无权操作此班级')

    // 年级升级映射
    const gradeMap: Record<string, string> = {
      '一年级': '二年级', '二年级': '三年级', '三年级': '四年级',
      '四年级': '五年级', '五年级': '六年级', '六年级': '初一',
      '初一': '初二', '初二': '初三', '初三': '高一',
      '高一': '高二', '高二': '高三',
    }

    const currentGrade = cls.grade || ''
    const nextGrade = targetGrade || gradeMap[currentGrade]
    if (!nextGrade) throw new BadRequestException(`无法识别「${currentGrade}」的下一个年级，请指定目标年级`)

    // 更新年级和班级名称
    cls.grade = nextGrade
    // 自动更新班级名称中的年级部分（如 "三年级1班" → "四年级1班"）
    if (cls.name) {
      cls.name = cls.name.replace(currentGrade, nextGrade)
    }

    await this.classRepo.save(cls)
    this.audit.log(schoolId, 'promote_class', '系统', cls.name, `班级升级：${currentGrade} → ${nextGrade}`).catch(() => {})
    return { ok: true, message: `已升级至「${nextGrade}」，班级名称：${cls.name}` }
  }

  /** 批量创建班级（逐条创建，自动按班主任姓名解析为本校教师；返回成功/失败明细） */
  async batchCreateClasses(schoolId: string, classes: any[]) {
    if (!classes?.length) throw new BadRequestException('请提供至少一个班级信息')
    const results: any[] = []
    let success = 0
    let failed = 0
    for (const c of classes) {
      const name = String(c.name || '').trim()
      const grade = String(c.grade || '').trim()
      const classNo = String(c.classNo || '1').trim() || '1'
      const headTeacherName = String(c.headTeacher || c.headTeacherName || '').trim()
      const term = String(c.term || '').trim()
      try {
        if (!name) throw new Error('缺少班级名称')
        if (!grade) throw new Error('缺少年级')
        if (!headTeacherName) throw new Error('缺少班主任姓名')
        const teacher = await this.userRepo.findOne({ where: { name: headTeacherName, schoolId } })
        if (!teacher) throw new Error(`本校无名为「${headTeacherName}」的教师`)
        await this.createClass(schoolId, {
          name, grade, classNo, headTeacher: teacher.name, headTeacherId: teacher.id, term,
        })
        results.push({ name, grade, classNo, headTeacherName, status: '成功' })
        success++
      } catch (e: any) {
        results.push({ name, grade, classNo, headTeacherName, status: '失败', error: e.message })
        failed++
      }
    }
    this.audit.log(schoolId, 'batch_create_classes', '系统', `批量创建班级 ${success} 成功 / ${failed} 失败`, '校管批量导入班级').catch(() => {})
    return { total: classes.length, success, failed, results }
  }

  /**
   * 解析班级文件（Excel/CSV/TXT/JSON），返回校验后的明细。
   * 列顺序：班级名称, 年级, 班级序号(可选), 班主任(姓名), 学期(可选)。
   * 班主任以姓名匹配本校教师，导入时再解析为 teacherId。
   */
  async parseClassFile(filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
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
      rawRows = arr.map((o) => [
        String(o?.name ?? ''), String(o?.grade ?? ''), String(o?.classNo ?? '1'),
        String(o?.headTeacher ?? o?.headTeacherName ?? ''), String(o?.term ?? ''),
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

    if (rawRows.length && /班级名称|名称|name/i.test(String(rawRows[0][0]))) {
      rawRows = rawRows.slice(1)
    }

    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    rawRows.forEach((r, i) => {
      const name = String(r[0] || '').trim()
      const grade = String(r[1] || '').trim()
      const classNo = String(r[2] || '1').trim() || '1'
      const headTeacher = String(r[3] || '').trim()
      const term = String(r[4] || '').trim()
      let error = ''
      if (!name) error = '缺少班级名称'
      else if (!grade) error = '缺少年级'
      else if (!headTeacher) error = '缺少班主任姓名'
      if (error) errorCount++
      else validCount++
      rows.push({ name, grade, classNo, headTeacher, term, line: i + 1, valid: !error, error })
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
   * AI 识别班级文件：文本解析后交给大模型结构化，返回与 parseClassFile 同构的预览行。
   */
  async aiRecognizeClasses(teacherId: string, filename: string, dataBase64: string): Promise<{ rows: any[]; validCount: number; errorCount: number }> {
    const { text } = await this.ai.parseFile('teacher', teacherId, { fileName: filename, fileData: dataBase64 })
    const instruction =
      '从下列文本中提取班级名单，每行/每个班级一行。只返回 JSON 数组，不要解释或前后缀。' +
      '元素字段：name(班级名称,必填), grade(年级,必填), classNo(班级序号,可空), ' +
      'headTeacher(班主任姓名,必填), term(学期,可空)。'
    const res = await this.ai.parse('teacher', teacherId, { text, instruction })
    const rows: any[] = []
    let validCount = 0
    let errorCount = 0
    this.normalizeAiRows(res).forEach((o: any, i: number) => {
      const name = String(o?.name ?? '').trim()
      const grade = String(o?.grade ?? '').trim()
      const classNo = String(o?.classNo ?? '1').trim() || '1'
      const headTeacher = String(o?.headTeacher ?? '').trim()
      const term = String(o?.term ?? '').trim()
      let error = ''
      if (!name) error = '缺少班级名称'
      else if (!grade) error = '缺少年级'
      else if (!headTeacher) error = '缺少班主任姓名'
      if (error) errorCount++
      else validCount++
      rows.push({ name, grade, classNo, headTeacher, term, line: i + 1, valid: !error, error })
    })
    return { rows, validCount, errorCount }
  }

  /**
   * 全校学生列表（P0-3：分页化，避免一次性全量加载；支持 skip/take 与可选 classId 过滤）。
   * 响应形状保持 { items, total } 不变，兼容旧调用方；page/pageSize 为附加信息。
   */
  async listSchoolStudents(schoolId: string, skip = 0, take = 500, classId?: string, keyword?: string) {
    const allTeachers = await this.userRepo.find({ where: { schoolId } })
    const ids = allTeachers.map(t => t.id)
    if (!ids.length) return { items: [], total: 0 }
    const classes = await this.classRepo.find({ where: ids.map(id => ({ teacherId: id })) })
    const classIds = classes.map(c => c.id)
    if (!classIds.length) return { items: [], total: 0 }
    // 构建班级名映射
    const classMap: Record<string, string> = {}
    for (const c of classes) classMap[c.id] = c.name
    // 指定 classId 时仅过滤该班（须属于本校班级集合，防止越权）；否则全校分页
    let where: any
    if (classId) {
      if (!classIds.includes(classId)) return { items: [], total: 0 }
      where = { classId }
    } else {
      where = classIds.map(id => ({ classId: id }))
    }
    let students: Student[]
    let total: number
    if (keyword && keyword.trim()) {
      const kw = keyword.trim()
      const all = await this.studentRepo.find({ where, order: { name: 'ASC' } })
      const filtered = all.filter(s => s.name?.includes(kw) || s.studentNo?.includes(kw))
      total = filtered.length
      students = filtered.slice(skip, skip + take)
    } else {
      const [items, cnt] = await this.studentRepo.findAndCount({
        where, order: { name: 'ASC' }, skip, take,
      })
      students = items
      total = cnt
    }
    return {
      items: students.map(s => ({
        ...s, className: classMap[s.classId] || '',
      })),
      total,
      page: Math.floor(skip / Math.max(1, take)),
      pageSize: take,
    }
  }

  /** 导出班级 xlsx 二进制 */
  async exportClassesXls(schoolId: string): Promise<Buffer> {
    const { items } = await this.listClasses(schoolId)
    const headers = ['班级名称', '年级', '班级序号', '学期', '班主任', '班主任任教学科']
    const rows = items.map((c) => [c.name, c.grade || '', c.classNo || '', c.term || '', c.headTeacher || '', (c.subjects || []).join('/')])
    return this.workbookFrom(headers, rows as any[])
  }

  // ===== 工具方法（复用） =====

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
}
