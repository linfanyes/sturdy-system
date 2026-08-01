import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Like } from 'typeorm'
import { Poem, MathFormula, EnglishWord } from './resource-library.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { SEED_POEMS, SEED_MATH_FORMULAS, SEED_ENGLISH_WORDS } from './resource-library.seed-data'

/**
 * 教学资源库服务。
 * - 校管：CRUD 三类资源 + 一键初始化种子数据
 * - 学科组长：编辑对应学科的资源（语文组长→古诗词，数学组长→公式，英语组长→单词）
 * - 教师/家长：只读查询（按 schoolId 隔离）
 */
@Injectable()
export class ResourceLibraryService {
  constructor(
    @InjectRepository(Poem) private poemRepo: Repository<Poem>,
    @InjectRepository(MathFormula) private formulaRepo: Repository<MathFormula>,
    @InjectRepository(EnglishWord) private wordRepo: Repository<EnglishWord>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
  ) {}

  // ============ schoolId 解析 ============

  fromJwtSchoolId(user: any): string {
    return user?.schoolId || ''
  }

  async resolveSchoolIdByStudent(studentId: string): Promise<string> {
    if (!studentId) return ''
    const stu = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!stu?.classId) return ''
    const cls = await this.classRepo.findOne({ where: { id: stu.classId } })
    if (!cls?.teacherId) return ''
    const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId } })
    return teacher?.schoolId || ''
  }

  // ============ 古诗词 ============

  async listPoems(schoolId: string, q?: { grade?: string; dynasty?: string; keyword?: string }) {
    const where: any = { schoolId, status: 'published' }
    if (q?.grade && q.grade !== '通用') where.grade = q.grade
    if (q?.dynasty) where.dynasty = q.dynasty
    if (q?.keyword) {
      where.title = Like(`%${q.keyword}%`)
    }
    return this.poemRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async searchPoems(schoolId: string, keyword: string, limit = 50) {
    if (!keyword?.trim()) return []
    const kw = keyword.trim()
    const poems = await this.poemRepo.find({
      where: [
        { schoolId, status: 'published', title: Like(`%${kw}%`) },
        { schoolId, status: 'published', author: Like(`%${kw}%`) },
        { schoolId, status: 'published', content: Like(`%${kw}%`) },
        { schoolId, status: 'published', keywords: Like(`%${kw}%`) },
      ],
      take: limit,
      order: { sortOrder: 'ASC' },
    })
    return poems
  }

  // ============ 数学公式定理 ============

  async listFormulas(schoolId: string, q?: { grade?: string; category?: string; keyword?: string }) {
    const where: any = { schoolId, status: 'published' }
    if (q?.grade && q.grade !== '通用') where.grade = q.grade
    if (q?.category) where.category = q.category
    if (q?.keyword) {
      where.title = Like(`%${q.keyword}%`)
    }
    return this.formulaRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async searchFormulas(schoolId: string, keyword: string, limit = 50) {
    if (!keyword?.trim()) return []
    const kw = keyword.trim()
    return this.formulaRepo.find({
      where: [
        { schoolId, status: 'published', title: Like(`%${kw}%`) },
        { schoolId, status: 'published', formula: Like(`%${kw}%`) },
        { schoolId, status: 'published', keywords: Like(`%${kw}%`) },
      ],
      take: limit,
      order: { sortOrder: 'ASC' },
    })
  }

  // ============ 英语分类单词 ============

  async listWords(schoolId: string, q?: { grade?: string; category?: string; keyword?: string }) {
    const where: any = { schoolId, status: 'published' }
    if (q?.grade && q.grade !== '通用') where.grade = q.grade
    if (q?.category) where.category = q.category
    if (q?.keyword) {
      where.word = Like(`%${q.keyword}%`)
    }
    return this.wordRepo.find({ where, order: { category: 'ASC', sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async searchWords(schoolId: string, keyword: string, limit = 50) {
    if (!keyword?.trim()) return []
    const kw = keyword.trim()
    return this.wordRepo.find({
      where: [
        { schoolId, status: 'published', word: Like(`%${kw}%`) },
        { schoolId, status: 'published', meaning: Like(`%${kw}%`) },
        { schoolId, status: 'published', category: Like(`%${kw}%`) },
      ],
      take: limit,
      order: { category: 'ASC', sortOrder: 'ASC' },
    })
  }

  /** 获取单词的所有分类（用于前端分类筛选） */
  async listWordCategories(schoolId: string): Promise<string[]> {
    const words = await this.wordRepo.find({ where: { schoolId, status: 'published' }, select: ['category'] })
    return [...new Set(words.map(w => w.category).filter(Boolean))]
  }

  // ============ 校管 CRUD ============

  // 古诗词
  async createPoem(schoolId: string, data: Partial<Poem>) {
    if (!data?.title) throw new BadRequestException('标题不能为空')
    return this.poemRepo.save(this.poemRepo.create({ ...data, schoolId }))
  }
  async updatePoem(schoolId: string, id: string, data: Partial<Poem>) {
    const p = await this.poemRepo.findOne({ where: { id, schoolId } })
    if (!p) throw new NotFoundException('古诗词不存在')
    Object.assign(p, data)
    return this.poemRepo.save(p)
  }
  async deletePoem(schoolId: string, id: string) {
    const p = await this.poemRepo.findOne({ where: { id, schoolId } })
    if (!p) throw new NotFoundException('古诗词不存在')
    await this.poemRepo.delete(id)
    return { ok: true }
  }

  // 数学公式
  async createFormula(schoolId: string, data: Partial<MathFormula>) {
    if (!data?.title) throw new BadRequestException('标题不能为空')
    return this.formulaRepo.save(this.formulaRepo.create({ ...data, schoolId }))
  }
  async updateFormula(schoolId: string, id: string, data: Partial<MathFormula>) {
    const f = await this.formulaRepo.findOne({ where: { id, schoolId } })
    if (!f) throw new NotFoundException('公式不存在')
    Object.assign(f, data)
    return this.formulaRepo.save(f)
  }
  async deleteFormula(schoolId: string, id: string) {
    const f = await this.formulaRepo.findOne({ where: { id, schoolId } })
    if (!f) throw new NotFoundException('公式不存在')
    await this.formulaRepo.delete(id)
    return { ok: true }
  }

  // 英语单词
  async createWord(schoolId: string, data: Partial<EnglishWord>) {
    if (!data?.word) throw new BadRequestException('单词不能为空')
    return this.wordRepo.save(this.wordRepo.create({ ...data, schoolId }))
  }
  async updateWord(schoolId: string, id: string, data: Partial<EnglishWord>) {
    const w = await this.wordRepo.findOne({ where: { id, schoolId } })
    if (!w) throw new NotFoundException('单词不存在')
    Object.assign(w, data)
    return this.wordRepo.save(w)
  }
  async deleteWord(schoolId: string, id: string) {
    const w = await this.wordRepo.findOne({ where: { id, schoolId } })
    if (!w) throw new NotFoundException('单词不存在')
    await this.wordRepo.delete(id)
    return { ok: true }
  }

  // ============ 学科组长编辑权限 ============

  /** 解析教师职务中的学科组长信息 */
  private parseLeaderPosition(position: string): { subject?: string; grade?: string } {
    if (!position) return {}
    const subjects = ['语文', '数学', '英语', '科学', '音乐', '美术', '体育', '信息技术']
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
      '初一', '初二', '初三', '高一', '高二', '高三']
    for (const subject of subjects) {
      if (position === `${subject}组长`) return { subject }
      for (const grade of grades) {
        if (position === `${grade}${subject}组长`) return { subject, grade }
      }
    }
    return {}
  }

  /** 判断教师是否有权编辑某类资源 */
  private canEditResourceType(user: any, resourceType: 'poem' | 'formula' | 'word'): boolean {
    if (user?.role === 'school_admin' || user?.role === 'super') return true
    if (user?.role !== 'teacher') return false
    const subjectMap: Record<string, string> = { poem: '语文', formula: '数学', word: '英语' }
    const requiredSubject = subjectMap[resourceType]
    if (!requiredSubject) return false
    // position 中的学科需匹配（grade 不限制资源编辑，只限制教材编辑）
    const { subject } = this.parseLeaderPosition(user?.position || '')
    return subject === requiredSubject
  }

  /** 学科组长从 DB 读取最新 position 后判断权限 */
  private async checkEditPermission(user: any, resourceType: 'poem' | 'formula' | 'word'): Promise<void> {
    if (user?.role === 'school_admin' || user?.role === 'super') return
    if (user?.role !== 'teacher') throw new ForbiddenException('仅学科组长可编辑')
    const teacher = await this.userRepo.findOne({ where: { id: user.sub } })
    const { subject } = this.parseLeaderPosition(teacher?.position || user?.position || '')
    const subjectMap: Record<string, string> = { poem: '语文', formula: '数学', word: '英语' }
    if (subject !== subjectMap[resourceType]) {
      throw new ForbiddenException(`仅${subjectMap[resourceType]}组长可编辑此资源`)
    }
  }

  async teacherUpdatePoem(user: any, id: string, data: Partial<Poem>) {
    await this.checkEditPermission(user, 'poem')
    const teacher = await this.userRepo.findOne({ where: { id: user.sub } })
    const p = await this.poemRepo.findOne({ where: { id, schoolId: teacher.schoolId } })
    if (!p) throw new NotFoundException('古诗词不存在')
    // 学科组长仅可修改内容字段，不可改 schoolId/status
    for (const k of ['title', 'dynasty', 'author', 'content', 'translation', 'appreciation', 'grade', 'keywords', 'audioUrl', 'sortOrder']) {
      if (data[k] !== undefined) (p as any)[k] = data[k]
    }
    return this.poemRepo.save(p)
  }

  async teacherUpdateFormula(user: any, id: string, data: Partial<MathFormula>) {
    await this.checkEditPermission(user, 'formula')
    const teacher = await this.userRepo.findOne({ where: { id: user.sub } })
    const f = await this.formulaRepo.findOne({ where: { id, schoolId: teacher.schoolId } })
    if (!f) throw new NotFoundException('公式不存在')
    for (const k of ['title', 'category', 'formula', 'explanation', 'example', 'grade', 'keywords', 'sortOrder']) {
      if (data[k] !== undefined) (f as any)[k] = data[k]
    }
    return this.formulaRepo.save(f)
  }

  async teacherUpdateWord(user: any, id: string, data: Partial<EnglishWord>) {
    await this.checkEditPermission(user, 'word')
    const teacher = await this.userRepo.findOne({ where: { id: user.sub } })
    const w = await this.wordRepo.findOne({ where: { id, schoolId: teacher.schoolId } })
    if (!w) throw new NotFoundException('单词不存在')
    for (const k of ['word', 'phonetic', 'meaning', 'category', 'example', 'grade', 'audioUrl', 'sortOrder']) {
      if (data[k] !== undefined) (w as any)[k] = data[k]
    }
    return this.wordRepo.save(w)
  }

  // ============ 一键初始化种子数据 ============

  /**
   * 一键初始化本校资源库：写入古诗词、数学公式、英语单词种子数据。
   * 幂等：已有数据时跳过（按 title/word 判重）。
   */
  async seedDefaults(schoolId: string) {
    if (!schoolId) throw new BadRequestException('缺少学校ID')
    let poemCreated = 0, poemSkipped = 0
    let formulaCreated = 0, formulaSkipped = 0
    let wordCreated = 0, wordSkipped = 0

    // 古诗词
    for (let i = 0; i < SEED_POEMS.length; i++) {
      const seed = SEED_POEMS[i]
      const existing = await this.poemRepo.findOne({ where: { schoolId, title: seed.title } })
      if (existing) { poemSkipped++; continue }
      await this.poemRepo.save(this.poemRepo.create({
        schoolId, title: seed.title, dynasty: seed.dynasty, author: seed.author,
        content: seed.content, translation: seed.translation || '', appreciation: seed.appreciation || '',
        grade: seed.grade, keywords: seed.keywords, sortOrder: i + 1, status: 'published',
      }))
      poemCreated++
    }

    // 数学公式
    for (let i = 0; i < SEED_MATH_FORMULAS.length; i++) {
      const seed = SEED_MATH_FORMULAS[i]
      const existing = await this.formulaRepo.findOne({ where: { schoolId, title: seed.title } })
      if (existing) { formulaSkipped++; continue }
      await this.formulaRepo.save(this.formulaRepo.create({
        schoolId, title: seed.title, category: seed.category, formula: seed.formula,
        explanation: seed.explanation || '', example: seed.example || '',
        grade: seed.grade, keywords: seed.keywords, sortOrder: i + 1, status: 'published',
      }))
      formulaCreated++
    }

    // 英语单词
    for (let i = 0; i < SEED_ENGLISH_WORDS.length; i++) {
      const seed = SEED_ENGLISH_WORDS[i]
      const existing = await this.wordRepo.findOne({ where: { schoolId, word: seed.word } })
      if (existing) { wordSkipped++; continue }
      await this.wordRepo.save(this.wordRepo.create({
        schoolId, word: seed.word, phonetic: seed.phonetic, meaning: seed.meaning,
        category: seed.category, example: seed.example || '', grade: seed.grade,
        sortOrder: i + 1, status: 'published',
      }))
      wordCreated++
    }

    return {
      poems: { created: poemCreated, skipped: poemSkipped },
      formulas: { created: formulaCreated, skipped: formulaSkipped },
      words: { created: wordCreated, skipped: wordSkipped },
    }
  }
}
