import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Like } from 'typeorm'
import { Textbook, TextbookUnit, TextbookKnowledgePoint } from './textbook.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { AiService } from '../ai/ai.service'
import { SEED_TEXTBOOKS } from './textbook.seed-data'

/**
 * 教材知识库服务。
 * - 校管：CRUD 教材/单元/知识点，触发 AI 批量生成
 * - 学科组长：编辑对应学科/年级的教材内容
 * - 教师/家长：只读查询（按 schoolId 隔离）
 * 家长 JWT 无 schoolId，需通过 studentId → 班级 → 教师 → schoolId 反查。
 */
@Injectable()
export class TextbookService {
  constructor(
    @InjectRepository(Textbook) private textbookRepo: Repository<Textbook>,
    @InjectRepository(TextbookUnit) private unitRepo: Repository<TextbookUnit>,
    @InjectRepository(TextbookKnowledgePoint) private kpRepo: Repository<TextbookKnowledgePoint>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    private readonly ai: AiService,
  ) {}

  // ============ schoolId 解析 ============

  /** 教师/校管：JWT 直接含 schoolId */
  fromJwtSchoolId(user: any): string {
    return user?.schoolId || ''
  }

  /** 家长：通过 studentId → 班级 → 班主任教师 → schoolId 反查 */
  async resolveSchoolIdByStudent(studentId: string): Promise<string> {
    if (!studentId) return ''
    const stu = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!stu?.classId) return ''
    const cls = await this.classRepo.findOne({ where: { id: stu.classId } })
    if (!cls?.teacherId) return ''
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId } })
    return teacher?.schoolId || ''
  }

  // ============ 校管 CRUD：教材 ============

  /** 列出本校教材（支持按学科/年级筛选） */
  async listTextbooks(schoolId: string, q?: { subject?: string; grade?: string; term?: string }) {
    const where: any = { schoolId }
    if (q?.subject) where.subject = q.subject
    if (q?.grade) where.grade = q.grade
    if (q?.term) where.term = q.term
    return this.textbookRepo.find({ where, order: { subject: 'ASC', grade: 'ASC', term: 'ASC', createdAt: 'DESC' } })
  }

  async createTextbook(schoolId: string, data: Partial<Textbook>) {
    if (!data?.name) throw new BadRequestException('教材名称不能为空')
    const tb = this.textbookRepo.create({ ...data, schoolId })
    return this.textbookRepo.save(tb)
  }

  async updateTextbook(schoolId: string, id: string, data: Partial<Textbook>) {
    const tb = await this.textbookRepo.findOne({ where: { id, schoolId } })
    if (!tb) throw new NotFoundException('教材不存在')
    Object.assign(tb, data)
    return this.textbookRepo.save(tb)
  }

  async deleteTextbook(schoolId: string, id: string) {
    const tb = await this.textbookRepo.findOne({ where: { id, schoolId } })
    if (!tb) throw new NotFoundException('教材不存在')
    // 级联删除单元与知识点
    const units = await this.unitRepo.find({ where: { textbookId: id } })
    if (units.length) {
      await this.kpRepo.delete({ unitId: In(units.map(u => u.id)) })
      await this.unitRepo.delete({ textbookId: id })
    }
    await this.textbookRepo.delete(id)
    return { ok: true }
  }

  // ============ 校管 CRUD：单元 ============

  async listUnits(schoolId: string, textbookId: string) {
    await this.assertTextbookInSchool(textbookId, schoolId)
    return this.unitRepo.find({ where: { textbookId }, order: { unitOrder: 'ASC', createdAt: 'ASC' } })
  }

  async createUnit(schoolId: string, data: Partial<TextbookUnit>) {
    await this.assertTextbookInSchool(data.textbookId, schoolId)
    const u = this.unitRepo.create(data)
    return this.unitRepo.save(u)
  }

  async updateUnit(schoolId: string, id: string, data: Partial<TextbookUnit>) {
    const u = await this.unitRepo.findOne({ where: { id } })
    if (!u) throw new NotFoundException('单元不存在')
    await this.assertTextbookInSchool(u.textbookId, schoolId)
    Object.assign(u, data)
    return this.unitRepo.save(u)
  }

  async deleteUnit(schoolId: string, id: string) {
    const u = await this.unitRepo.findOne({ where: { id } })
    if (!u) throw new NotFoundException('单元不存在')
    await this.assertTextbookInSchool(u.textbookId, schoolId)
    await this.kpRepo.delete({ unitId: id })
    await this.unitRepo.delete(id)
    return { ok: true }
  }

  // ============ 校管 CRUD：知识点 ============

  async listKnowledgePoints(schoolId: string, unitId: string) {
    await this.assertUnitInSchool(unitId, schoolId)
    return this.kpRepo.find({ where: { unitId }, order: { pointOrder: 'ASC', createdAt: 'ASC' } })
  }

  async createKnowledgePoint(schoolId: string, data: Partial<TextbookKnowledgePoint>) {
    await this.assertUnitInSchool(data.unitId, schoolId)
    const kp = this.kpRepo.create(data)
    return this.kpRepo.save(kp)
  }

  async updateKnowledgePoint(schoolId: string, id: string, data: Partial<TextbookKnowledgePoint>) {
    const kp = await this.kpRepo.findOne({ where: { id } })
    if (!kp) throw new NotFoundException('知识点不存在')
    await this.assertUnitInSchool(kp.unitId, schoolId)
    Object.assign(kp, data)
    return this.kpRepo.save(kp)
  }

  async deleteKnowledgePoint(schoolId: string, id: string) {
    const kp = await this.kpRepo.findOne({ where: { id } })
    if (!kp) throw new NotFoundException('知识点不存在')
    await this.assertUnitInSchool(kp.unitId, schoolId)
    await this.kpRepo.delete(id)
    return { ok: true }
  }

  // ============ 查询：树形 / 检索 ============

  /**
   * 教材树形结构（教材 → 单元 → 知识点），用于教师/家长浏览。
   * @param schoolId 学校ID
   * @param filter 可按 subject/grade/textbookId 过滤
   */
  async getTextbookTree(schoolId: string, filter?: { subject?: string; grade?: string; term?: string; textbookId?: string }) {
    const where: any = { schoolId, status: 'published' }
    if (filter?.subject) where.subject = filter.subject
    if (filter?.grade) where.grade = filter.grade
    if (filter?.term) where.term = filter.term
    if (filter?.textbookId) where.id = filter.textbookId
    const textbooks = await this.textbookRepo.find({ where, order: { subject: 'ASC', grade: 'ASC', term: 'ASC' } })
    if (!textbooks.length) return []
    const tbIds = textbooks.map(t => t.id)
    const units = await this.unitRepo.find({ where: { textbookId: In(tbIds) }, order: { unitOrder: 'ASC' } })
    const unitIds = units.map(u => u.id)
    const points = unitIds.length
      ? await this.kpRepo.find({ where: { unitId: In(unitIds) }, order: { pointOrder: 'ASC' } })
      : []
    const pointMap = new Map<string, TextbookKnowledgePoint[]>()
    for (const p of points) {
      const arr = pointMap.get(p.unitId) || []
      arr.push(p)
      pointMap.set(p.unitId, arr)
    }
    const unitMap = new Map<string, any[]>()
    for (const u of units) {
      const arr = unitMap.get(u.textbookId) || []
      arr.push({ ...u, knowledgePoints: pointMap.get(u.id) || [] })
      unitMap.set(u.textbookId, arr)
    }
    return textbooks.map(t => ({ ...t, units: unitMap.get(t.id) || [] }))
  }

  /** 关键词检索知识点（跨单元，按学校隔离） */
  async searchKnowledgePoints(schoolId: string, keyword: string, limit = 50) {
    if (!keyword?.trim()) return []
    const kw = keyword.trim()
    // 先查本校所有教材（需 name/subject/grade 用于结果展示）
    const textbooks = await this.textbookRepo.find({ where: { schoolId, status: 'published' }, select: ['id', 'name', 'subject', 'grade'] })
    if (!textbooks.length) return []
    const tbIds = textbooks.map(t => t.id)
    const units = await this.unitRepo.find({ where: { textbookId: In(tbIds) }, select: ['id', 'title', 'textbookId'] })
    if (!units.length) return []
    const unitIds = units.map(u => u.id)
    const points = await this.kpRepo.find({
      where: [
        { unitId: In(unitIds), title: Like(`%${kw}%`) },
        { unitId: In(unitIds), keywords: Like(`%${kw}%`) },
        { unitId: In(unitIds), content: Like(`%${kw}%`) },
      ],
      take: limit,
      order: { pointOrder: 'ASC' },
    })
    const unitMap = new Map(units.map(u => [u.id, u]))
    const tbMap = new Map(textbooks.map(t => [t.id, t]))
    return points.map(p => {
      const u = unitMap.get(p.unitId)
      const tb = u ? tbMap.get(u.textbookId) : null
      return { ...p, unitTitle: u?.title || '', textbookName: tb?.name || '', subject: tb?.subject || '', grade: tb?.grade || '' }
    })
  }

  // ============ AI 批量生成 ============

  /**
   * 校管触发：AI 生成一本教材的单元与知识点。
   * @param schoolId 学校ID
   * @param data { publisher, subject, grade, term, name }
   * @returns 生成统计 { textbookId, unitCount, pointCount }
   */
  async generateByAi(schoolId: string, data: { publisher: string; subject: string; grade: string; term: string; name?: string }) {
    if (!data?.publisher || !data?.subject || !data?.grade || !data?.term) {
      throw new BadRequestException('出版社、学科、年级、册次不能为空')
    }
    // 找一个本校教师作为 AI 配置来源（chatSync 需要 teacherId 拉 AI settings）
    const teacher = await this.userRepo.findOne({ where: { schoolId } })
    if (!teacher) throw new BadRequestException('本校暂无教师，无法读取 AI 配置，请先创建教师')

    const name = data.name || `${data.publisher}${data.grade}${data.subject}${data.term}`

    // 1. 创建教材记录（若已存在同名同版本则复用）
    let tb = await this.textbookRepo.findOne({ where: { schoolId, publisher: data.publisher, subject: data.subject, grade: data.grade, term: data.term } })
    if (!tb) {
      tb = this.textbookRepo.create({ schoolId, publisher: data.publisher, subject: data.subject, grade: data.grade, term: data.term, name, status: 'published' })
      tb = await this.textbookRepo.save(tb)
    }

    // 2. AI 生成结构化单元+知识点（要求 JSON 输出）
    const prompt = `请为《${data.publisher}·${data.grade}${data.subject}${data.term}》生成教材目录与核心知识点。
要求：
1. 严格按该版本教材的真实目录结构，列出全部单元（通常 6-10 个单元）
2. 每个单元下列出 3-6 个核心知识点，包含：标题、类型(概念/例题/易错点/拓展/重点)、详细内容(50-150字)、难度(简单/中等/困难)、关键词(逗号分隔)
3. 只返回 JSON，不要任何解释文字，格式如下：
{"units":[{"title":"第一单元 xxx","summary":"单元概述","points":[{"title":"知识点标题","type":"重点","content":"详细内容","difficulty":"中等","keywords":"关键词1,关键词2"}]}]}`
    const raw = await this.ai.chatSync(teacher.id, { messages: [{ role: 'user', content: prompt }] })
    const parsed = this.safeParseJson(raw)
    if (!parsed?.units?.length) throw new BadRequestException('AI 生成失败或返回格式错误，请检查 AI 配置后重试')

    // 3. 清空旧单元（重新生成时覆盖）并写入新数据
    const oldUnits = await this.unitRepo.find({ where: { textbookId: tb.id } })
    if (oldUnits.length) {
      await this.kpRepo.delete({ unitId: In(oldUnits.map(u => u.id)) })
      await this.unitRepo.delete({ textbookId: tb.id })
    }

    let unitCount = 0
    let pointCount = 0
    for (let i = 0; i < parsed.units.length; i++) {
      const u = parsed.units[i]
      const unit = await this.unitRepo.save(this.unitRepo.create({
        textbookId: tb.id, unitOrder: i + 1, title: u.title || `第${i + 1}单元`,
        summary: u.summary || '',
      }))
      unitCount++
      const points = Array.isArray(u.points) ? u.points : []
      for (let j = 0; j < points.length; j++) {
        const p = points[j]
        await this.kpRepo.save(this.kpRepo.create({
          unitId: unit.id, pointOrder: j + 1,
          title: p.title || `知识点${j + 1}`,
          type: p.type || '重点',
          content: p.content || '',
          difficulty: p.difficulty || '',
          keywords: p.keywords || '',
        }))
        pointCount++
      }
    }
    return { textbookId: tb.id, name: tb.name, unitCount, pointCount }
  }

  // ============ 一键初始化种子教材 ============

  /**
   * 一键初始化本校教材：写入 32 本预置教材（人教版语文/数学 + 外研版英语）及其单元与知识点。
   * 幂等：已存在的教材（相同 publisher+subject+grade+term）跳过，不覆盖已有内容。
   * @returns { created, skipped, totalUnits, totalPoints }
   */
  async seedDefaults(schoolId: string) {
    if (!schoolId) throw new BadRequestException('缺少学校ID')
    let created = 0
    let skipped = 0
    let totalUnits = 0
    let totalPoints = 0
    for (const seed of SEED_TEXTBOOKS) {
      // 幂等：同校同版本同学科同年级同册次已存在则跳过
      const existing = await this.textbookRepo.findOne({
        where: { schoolId, publisher: seed.publisher, subject: seed.subject, grade: seed.grade, term: seed.term },
      })
      if (existing) { skipped++; continue }
      // 创建教材
      const tb = await this.textbookRepo.save(this.textbookRepo.create({
        schoolId, publisher: seed.publisher, subject: seed.subject,
        grade: seed.grade, term: seed.term, name: seed.name, status: 'published',
      }))
      created++
      // 创建单元与知识点
      for (let i = 0; i < seed.units.length; i++) {
        const su = seed.units[i]
        const unit = await this.unitRepo.save(this.unitRepo.create({
          textbookId: tb.id, unitOrder: i + 1, title: su.title, summary: su.summary || '',
        }))
        totalUnits++
        for (let j = 0; j < su.points.length; j++) {
          const sp = su.points[j]
          await this.kpRepo.save(this.kpRepo.create({
            unitId: unit.id, pointOrder: j + 1,
            title: sp.title, type: sp.type, content: sp.content,
            difficulty: sp.difficulty, keywords: sp.keywords,
          }))
          totalPoints++
        }
      }
    }
    return { created, skipped, totalUnits, totalPoints }
  }

  /** 容错解析 AI 返回的 JSON（可能带 ```json 代码块包裹） */
  private safeParseJson(raw: string): any {
    if (!raw) return null
    let s = raw.trim()
    // 去除 markdown 代码块
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    // 截取第一个 { 到最后一个 }
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start >= 0 && end > start) s = s.slice(start, end + 1)
    try { return JSON.parse(s) } catch { return null }
  }

  // ============ 学科组长编辑权限 ============

  /**
   * 解析教师职务，判断是否为学科组长及管辖范围。
   * @returns { subject?, grade? } 学科组长返回管辖学科和年级（grade 可空=全年级）
   */
  parseLeaderPosition(position: string): { subject?: string; grade?: string } {
    if (!position) return {}
    const subjects = ['语文', '数学', '英语', '科学', '音乐', '美术', '体育', '信息技术']
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
      '初一', '初二', '初三', '高一', '高二', '高三']
    // 先匹配 "{年级}{学科}组长"
    for (const g of grades) {
      for (const s of subjects) {
        if (position === `${g}${s}组长`) return { subject: s, grade: g }
      }
    }
    // 再匹配 "{学科}组长"（全年级）
    for (const s of subjects) {
      if (position === `${s}组长`) return { subject: s }
    }
    return {}
  }

  /**
   * 判断教师是否有权编辑某本教材。
   * 校管：全部可编辑；学科组长：仅限管辖学科+年级。
   */
  async canEditTextbook(user: any, textbookId: string): Promise<boolean> {
    // 校管/超管全权
    if (user?.role === 'school_admin' || user?.role === 'super') return true
    if (user?.role !== 'teacher') return false
    // 加载教师记录（JWT payload 不含 position，需从 DB 读取最新职务）
    const teacher = await this.userRepo.findOne({ where: { id: user.sub } })
    if (!teacher?.schoolId) return false
    const { subject: leadSubject, grade: leadGrade } = this.parseLeaderPosition(teacher.position || user?.position || '')
    if (!leadSubject) return false
    // 加载教材，校验 schoolId + 学科 + 年级
    const tb = await this.textbookRepo.findOne({ where: { id: textbookId, schoolId: teacher.schoolId } })
    if (!tb) return false
    if (tb.subject !== leadSubject) return false
    if (leadGrade && tb.grade !== leadGrade) return false
    return true
  }

  /** 学科组长编辑教材（基础信息） */
  async teacherUpdateTextbook(user: any, textbookId: string, data: Partial<Textbook>) {
    const ok = await this.canEditTextbook(user, textbookId)
    if (!ok) throw new ForbiddenException('无权编辑此教材（仅限管辖学科/年级的学科组长）')
    const tb = await this.textbookRepo.findOne({ where: { id: textbookId } })
    if (!tb) throw new NotFoundException('教材不存在')
    // 学科组长仅可修改名称、状态，不可改学科/年级/版本
    if (data.name !== undefined) tb.name = data.name
    if (data.status !== undefined) tb.status = data.status
    return this.textbookRepo.save(tb)
  }

  /** 学科组长编辑单元 */
  async teacherUpdateUnit(user: any, unitId: string, data: Partial<TextbookUnit>) {
    const u = await this.unitRepo.findOne({ where: { id: unitId } })
    if (!u) throw new NotFoundException('单元不存在')
    const ok = await this.canEditTextbook(user, u.textbookId)
    if (!ok) throw new ForbiddenException('无权编辑此教材的单元')
    if (data.title !== undefined) u.title = data.title
    if (data.unitOrder !== undefined) u.unitOrder = data.unitOrder
    if (data.summary !== undefined) u.summary = data.summary
    return this.unitRepo.save(u)
  }

  /** 学科组长新增单元 */
  async teacherCreateUnit(user: any, data: Partial<TextbookUnit>) {
    const ok = await this.canEditTextbook(user, data.textbookId || '')
    if (!ok) throw new ForbiddenException('无权编辑此教材')
    const u = this.unitRepo.create(data)
    return this.unitRepo.save(u)
  }

  /** 学科组长编辑知识点 */
  async teacherUpdatePoint(user: any, pointId: string, data: Partial<TextbookKnowledgePoint>) {
    const kp = await this.kpRepo.findOne({ where: { id: pointId } })
    if (!kp) throw new NotFoundException('知识点不存在')
    const u = await this.unitRepo.findOne({ where: { id: kp.unitId } })
    if (!u) throw new NotFoundException('单元不存在')
    const ok = await this.canEditTextbook(user, u.textbookId)
    if (!ok) throw new ForbiddenException('无权编辑此教材的知识点')
    if (data.title !== undefined) kp.title = data.title
    if (data.type !== undefined) kp.type = data.type
    if (data.content !== undefined) kp.content = data.content
    if (data.difficulty !== undefined) kp.difficulty = data.difficulty
    if (data.keywords !== undefined) kp.keywords = data.keywords
    if (data.pointOrder !== undefined) kp.pointOrder = data.pointOrder
    return this.kpRepo.save(kp)
  }

  /** 学科组长新增知识点 */
  async teacherCreatePoint(user: any, data: Partial<TextbookKnowledgePoint>) {
    const u = await this.unitRepo.findOne({ where: { id: data.unitId || '' } })
    if (!u) throw new NotFoundException('单元不存在')
    const ok = await this.canEditTextbook(user, u.textbookId)
    if (!ok) throw new ForbiddenException('无权编辑此教材')
    const kp = this.kpRepo.create(data)
    return this.kpRepo.save(kp)
  }

  // ============ 内部校验 ============

  private async assertTextbookInSchool(textbookId: string, schoolId: string) {
    if (!textbookId) throw new BadRequestException('缺少教材ID')
    const tb = await this.textbookRepo.findOne({ where: { id: textbookId, schoolId } })
    if (!tb) throw new NotFoundException('教材不存在或无权操作')
    return tb
  }

  private async assertUnitInSchool(unitId: string, schoolId: string) {
    if (!unitId) throw new BadRequestException('缺少单元ID')
    const u = await this.unitRepo.findOne({ where: { id: unitId } })
    if (!u) throw new NotFoundException('单元不存在')
    await this.assertTextbookInSchool(u.textbookId, schoolId)
    return u
  }
}
