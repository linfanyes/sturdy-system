import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { BadRequestException } from '@nestjs/common'
import { ClassMember } from './class-member.entity'

/**
 * 班级成员服务：管理教师与班级的多对多关系。
 * 供 base.service 查询"当前教师任教的班级集合"使用。
 */
export class ClassMemberService {
  constructor(@InjectRepository(ClassMember) private readonly repo: Repository<ClassMember>) {}

  /** 查询某教师参与的所有班级 id（含班主任 + 科任老师） */
  async getClassIdsByTeacher(teacherId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { teacherId },
      select: ['classId'],
    })
    return rows.map(r => r.classId)
  }

  /** 查询某教师在某班级的关系（班主任/科任老师/无） */
  async getRole(teacherId: string, classId: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { teacherId, classId } })
    return row?.role || null
  }

  /** 判断某教师是否可访问某班级 */
  async canAccess(teacherId: string, classId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { teacherId, classId } })
    return count > 0
  }

  /**
   * 仅校验规则1：该老师是否已是「其他班级」的班主任。
   * 用于转交班主任场景的前置校验——此时目标班级的旧 head 尚未降级，
   * 若用 assertCanBecomeHead 会被规则2误拦（"该班级已有班主任"），
   * 故提供此轻量方法只检查"一师一班 head"。
   *
   * @param teacherId    待任命的教师
   * @param excludeClassId 即将接手的班级 id（排除自身，避免误判）
   */
  async assertTeacherNotHeadElsewhere(teacherId: string, excludeClassId: string): Promise<void> {
    const otherHeadClass = await this.repo.findOne({
      where: { teacherId, role: 'head' },
    })
    if (otherHeadClass && otherHeadClass.classId !== excludeClassId) {
      throw new BadRequestException(
        `该老师已是「${otherHeadClass.className || otherHeadClass.classId}」的班主任，一人只能担任一个班的班主任`,
      )
    }
  }

  /**
   * 校验某教师可以成为某班级的班主任，确保两条业务规则：
   * 1. 一个老师只能是一个班的班主任（防止一师多班 head）
   * 2. 一个班只能有一个班主任（防止一班多 head）
   *
   * 转交场景：旧 head 降级为 subject 后再调用本方法校验新 head。
   * 本方法不处理转交降级，仅做规则校验。
   */
  async assertCanBecomeHead(teacherId: string, classId: string): Promise<void> {
    // 规则1：该老师是否已在其他班级担任 head
    const otherHeadClass = await this.repo.findOne({
      where: { teacherId, role: 'head' },
    })
    if (otherHeadClass && otherHeadClass.classId !== classId) {
      throw new BadRequestException(
        `该老师已是「${otherHeadClass.className || otherHeadClass.classId}」的班主任，一人只能担任一个班的班主任`,
      )
    }
    // 规则2：该班级是否已有其他班主任
    const existingHead = await this.repo.findOne({
      where: { classId, role: 'head' },
    })
    if (existingHead && existingHead.teacherId !== teacherId) {
      throw new BadRequestException(
        `该班级已有班主任，请先转交或降级原班主任`,
      )
    }
  }

  /** 班主任创建班级时写入 head 记录 */
  async addHeadTeacher(teacherId: string, classId: string, className: string, subjects: string[] = []) {
    await this.assertCanBecomeHead(teacherId, classId)
    const existing = await this.repo.findOne({ where: { teacherId, classId } })
    if (existing) {
      existing.role = 'head'
      existing.className = className
      if (subjects.length) existing.subjects = subjects
      return this.repo.save(existing)
    }
    return this.repo.save(this.repo.create({
      teacherId, classId, className, role: 'head', subjects,
    }))
  }

  /** 校管把科任老师加入班级 */
  async addSubjectTeacher(teacherId: string, classId: string, className: string, subjects: string[]) {
    const existing = await this.repo.findOne({ where: { teacherId, classId } })
    if (existing) {
      existing.role = existing.role === 'head' ? 'head' : 'subject'
      existing.subjects = subjects
      return this.repo.save(existing)
    }
    return this.repo.save(this.repo.create({
      teacherId, classId, className, role: 'subject', subjects,
    }))
  }

  /** 教师离开班级 */
  async removeMember(teacherId: string, classId: string) {
    const row = await this.repo.findOne({ where: { teacherId, classId } })
    if (row) await this.repo.remove(row)
  }

  /** 查询某班级所有成员 */
  async listByClass(classId: string): Promise<ClassMember[]> {
    return this.repo.find({ where: { classId }, order: { role: 'DESC', createdAt: 'ASC' } })
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassMember])],
  providers: [ClassMemberService],
  exports: [ClassMemberService],
})
export class ClassMembersModule {}
