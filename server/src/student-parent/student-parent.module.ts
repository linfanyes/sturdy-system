import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { StudentParent } from './student-parent.entity'

/**
 * 学生-家长微信绑定服务：管理多对多绑定关系。
 *
 * 设计要点：
 * - 一个学生可绑多个微信（爸爸、妈妈、监护人）
 * - 一个微信可绑多个学生（自家多娃，跨班跨校）
 * - (studentId, openId) 唯一约束防止重复绑定
 * - 首个绑定自动 isPrimary=true，Student.parentId 同步指向该 Parent
 */
export class StudentParentService {
  constructor(
    @InjectRepository(StudentParent) private readonly repo: Repository<StudentParent>,
  ) {}

  /** 查询某 openid 绑定的所有学生关系（含学生信息由调用方再查 Student 表） */
  async listByOpenid(openId: string): Promise<StudentParent[]> {
    if (!openId) return []
    return this.repo.find({ where: { openId }, order: { createdAt: 'ASC' } })
  }

  /** 查询某家长 ID 关联的所有学生绑定关系 */
  async listByParent(parentId: string): Promise<StudentParent[]> {
    if (!parentId) return []
    return this.repo.find({ where: { parentId }, order: { createdAt: 'ASC' } })
  }

  /** 查询某学生绑定的所有家长微信 */
  async listByStudent(studentId: string): Promise<StudentParent[]> {
    if (!studentId) return []
    return this.repo.find({ where: { studentId }, order: { isPrimary: 'DESC', createdAt: 'ASC' } })
  }

  /** 查询某班级所有家长绑定（用于教师端班级家长列表） */
  async listByClass(classId: string): Promise<StudentParent[]> {
    if (!classId) return []
    return this.repo.find({ where: { classId }, order: { studentId: 'ASC', isPrimary: 'DESC', createdAt: 'ASC' } })
  }

  /**
   * 创建绑定关系（已存在则返回现有记录，幂等）。
   * 若该学生尚无主家长，自动置 isPrimary=true 并返回 needsUpdateStudentParentId=true。
   */
  async bind(opts: {
    studentId: string
    parentId: string
    openId: string
    relation?: string
    nickName?: string
    avatar?: string
    schoolId?: string
    classId?: string
  }): Promise<{ binding: StudentParent; created: boolean; needsUpdateStudentParentId: boolean }> {
    const existing = await this.repo.findOne({
      where: { studentId: opts.studentId, openId: opts.openId },
    })
    if (existing) {
      // 更新可选字段
      let dirty = false
      if (opts.nickName && existing.nickName !== opts.nickName) { existing.nickName = opts.nickName; dirty = true }
      if (opts.avatar && existing.avatar !== opts.avatar) { existing.avatar = opts.avatar; dirty = true }
      if (opts.relation && existing.relation !== opts.relation) { existing.relation = opts.relation; dirty = true }
      if (opts.schoolId && existing.schoolId !== opts.schoolId) { existing.schoolId = opts.schoolId; dirty = true }
      if (opts.classId && existing.classId !== opts.classId) { existing.classId = opts.classId; dirty = true }
      if (dirty) await this.repo.save(existing)
      return { binding: existing, created: false, needsUpdateStudentParentId: false }
    }

    // 检查该学生是否已有主家长
    const existingBindings = await this.repo.find({ where: { studentId: opts.studentId } })
    const isPrimary = existingBindings.length === 0

    const binding = this.repo.create({
      studentId: opts.studentId,
      parentId: opts.parentId,
      openId: opts.openId,
      relation: opts.relation || '',
      nickName: opts.nickName || '',
      avatar: opts.avatar || '',
      schoolId: opts.schoolId || '',
      classId: opts.classId || '',
      isPrimary,
    })
    await this.repo.save(binding)
    return { binding, created: true, needsUpdateStudentParentId: isPrimary }
  }

  /** 解绑某条关系 */
  async unbind(bindingId: string): Promise<void> {
    const binding = await this.repo.findOne({ where: { id: bindingId } })
    if (!binding) throw new NotFoundException('绑定记录不存在')
    await this.repo.remove(binding)
    // 若解绑的是主家长，自动提升下一个为 主家长
    if (binding.isPrimary) {
      const next = await this.repo.findOne({
        where: { studentId: binding.studentId },
        order: { createdAt: 'ASC' },
      })
      if (next) {
        next.isPrimary = true
        await this.repo.save(next)
      }
    }
  }

  /** 教师设置某绑定为主家长 */
  async setPrimary(bindingId: string): Promise<StudentParent> {
    const binding = await this.repo.findOne({ where: { id: bindingId } })
    if (!binding) throw new NotFoundException('绑定记录不存在')
    // 取消该学生其他主家长标记
    const others = await this.repo.find({ where: { studentId: binding.studentId, isPrimary: true } })
    for (const o of others) {
      if (o.id !== bindingId) {
        o.isPrimary = false
        await this.repo.save(o)
      }
    }
    binding.isPrimary = true
    return this.repo.save(binding)
  }

  /** 删除某学生的所有绑定（学生删除时调用） */
  async removeAllByStudent(studentId: string): Promise<void> {
    if (!studentId) return
    await this.repo.delete({ studentId })
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([StudentParent])],
  providers: [StudentParentService],
  exports: [StudentParentService],
})
export class StudentParentModule {}
