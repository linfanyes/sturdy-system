import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ClassMember } from './class-member.entity'

/**
 * 班级成员服务：管理教师与班级的多对多关系（按学期隔离）。
 *
 * 班主任业务规则（一师一班 head / 一班一 head）在同一 term 内生效；
 * 跨学期互不影响——春季的 head 记录不阻止秋季担任其他班 head。
 *
 * term 参数约定：
 * - 校验/写入方法（assertCanBecomeHead/addHeadTeacher 等）：term 必填
 * - 查询方法（getClassIdsByTeacher/canAccess/getRole）：term 可选，不传=所有学期（兼容旧前端）
 */
export class ClassMemberService {
  constructor(@InjectRepository(ClassMember) private readonly repo: Repository<ClassMember>) {}

  /**
   * 查询某教师参与的所有班级 id（含班主任 + 科任老师）。
   * @param term 可选，传则按学期过滤，不传返回所有学期（兼容旧前端）
   */
  async getClassIdsByTeacher(teacherId: string, term?: string): Promise<string[]> {
    const where: any = { teacherId }
    if (term !== undefined) where.term = term
    const rows = await this.repo.find({ where, select: ['classId'] })
    return [...new Set(rows.map(r => r.classId))]
  }

  /**
   * 查询某教师在某班级的关系（班主任/科任老师/无）。
   * @param term 可选，传则按学期过滤；不传返回最近一条记录的 role
   */
  async getRole(teacherId: string, classId: string, term?: string): Promise<string | null> {
    const where: any = { teacherId, classId }
    if (term !== undefined) where.term = term
    const row = await this.repo.findOne({ where, order: { createdAt: 'DESC' } })
    return row?.role || null
  }

  /**
   * 判断某教师是否可访问某班级。
   * @param term 可选，传则按学期过滤；不传则只要有任一学期记录即可访问（兼容旧前端）
   */
  async canAccess(teacherId: string, classId: string, term?: string): Promise<boolean> {
    const where: any = { teacherId, classId }
    if (term !== undefined) where.term = term
    const count = await this.repo.count({ where })
    return count > 0
  }

  /**
   * 仅校验规则1（同一 term 内）：该老师是否已是「其他班级」的班主任。
   * 用于转交班主任场景的前置校验——此时目标班级的旧 head 尚未降级，
   * 若用 assertCanBecomeHead 会被规则2误拦（"该班级已有班主任"），
   * 故提供此轻量方法只检查"一师一班 head"。
   *
   * @param teacherId     待任命的教师
   * @param excludeClassId 即将接手的班级 id（排除自身，避免误判）
   * @param term          学期名（规则按同 term 内判断）
   */
  async assertTeacherNotHeadElsewhere(teacherId: string, excludeClassId: string, term: string): Promise<void> {
    const otherHeadClass = await this.repo.findOne({
      where: { teacherId, role: 'head', term },
    })
    if (otherHeadClass && otherHeadClass.classId !== excludeClassId) {
      throw new BadRequestException(
        `该老师在本学期已是「${otherHeadClass.className || otherHeadClass.classId}」的班主任，一人只能担任一个班的班主任`,
      )
    }
  }

  /**
   * 校验某教师可以成为某班级的班主任（同一 term 内），确保两条业务规则：
   * 1. 一个老师在同一学期只能是一个班的班主任（防止一师多班 head）
   * 2. 一个班在同一学期只能有一个班主任（防止一班多 head）
   *
   * 转交场景：旧 head 降级为 subject 后再调用本方法校验新 head。
   * 本方法不处理转交降级，仅做规则校验。
   *
   * @param term 学期名（规则按同 term 内判断）
   */
  async assertCanBecomeHead(teacherId: string, classId: string, term: string): Promise<void> {
    // 规则1：该老师是否已在本学期其他班级担任 head
    const otherHeadClass = await this.repo.findOne({
      where: { teacherId, role: 'head', term },
    })
    if (otherHeadClass && otherHeadClass.classId !== classId) {
      throw new BadRequestException(
        `该老师在本学期已是「${otherHeadClass.className || otherHeadClass.classId}」的班主任，一人只能担任一个班的班主任`,
      )
    }
    // 规则2：该班级在本学期是否已有其他班主任
    const existingHead = await this.repo.findOne({
      where: { classId, role: 'head', term },
    })
    if (existingHead && existingHead.teacherId !== teacherId) {
      throw new BadRequestException(
        `该班级在本学期已有班主任，请先转交或降级原班主任`,
      )
    }
  }

  /**
   * 班主任创建班级时写入 head 记录（按学期隔离）。
   * @param term 学期名，与 ClassItem.term 对齐
   */
  async addHeadTeacher(teacherId: string, classId: string, className: string, term: string, subjects: string[] = []) {
    await this.assertCanBecomeHead(teacherId, classId, term)
    const existing = await this.repo.findOne({ where: { teacherId, classId, term } })
    if (existing) {
      existing.role = 'head'
      existing.className = className
      if (subjects.length) existing.subjects = subjects
      return this.repo.save(existing)
    }
    return this.repo.save(this.repo.create({
      teacherId, classId, className, role: 'head', subjects, term,
    }))
  }

  /** 校管/班主任把科任老师加入班级（按学期隔离） */
  async addSubjectTeacher(teacherId: string, classId: string, className: string, subjects: string[], term: string) {
    const existing = await this.repo.findOne({ where: { teacherId, classId, term } })
    if (existing) {
      existing.role = existing.role === 'head' ? 'head' : 'subject'
      existing.subjects = subjects
      return this.repo.save(existing)
    }
    return this.repo.save(this.repo.create({
      teacherId, classId, className, role: 'subject', subjects, term,
    }))
  }

  /** 教师更新自己在某班级的任教学科（班主任可兼任本班科任） */
  async updateMySubjects(teacherId: string, classId: string, subjects: string[], term: string) {
    const row = await this.repo.findOne({ where: { teacherId, classId, term } })
    if (!row) throw new NotFoundException('您不是该班级成员，无法更新任教学科')
    row.subjects = subjects
    return this.repo.save(row)
  }

  /** 教师离开班级（按学期） */
  async removeMember(teacherId: string, classId: string, term: string) {
    const row = await this.repo.findOne({ where: { teacherId, classId, term } })
    if (row) await this.repo.remove(row)
  }

  /** 查询某班级所有成员（可按学期过滤） */
  async listByClass(classId: string, term?: string): Promise<ClassMember[]> {
    const where: any = { classId }
    if (term !== undefined) where.term = term
    return this.repo.find({ where, order: { role: 'DESC', createdAt: 'ASC' } })
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassMember])],
  providers: [ClassMemberService],
  exports: [ClassMemberService],
})
export class ClassMembersModule {}
