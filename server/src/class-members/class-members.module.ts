import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
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

  /** 班主任创建班级时写入 head 记录 */
  async addHeadTeacher(teacherId: string, classId: string, className: string, subjects: string[] = []) {
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
