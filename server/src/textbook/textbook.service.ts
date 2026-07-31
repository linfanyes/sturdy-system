import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Like } from 'typeorm'
import { Textbook, TextbookUnit, TextbookKnowledgePoint } from './textbook.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { AiService } from '../ai/ai.service'

/**
 * 教材知识库服务。
 * - 校管：CRUD 教材/单元/知识点，触发 AI 批量生成
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
    const unitMap = new Map<string, TextbookUnit[]>()
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
    // 先查本校所有教材ID
    const textbooks = await this.textbookRepo.find({ where: { schoolId, status: 'published' }, select: ['id'] })
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
