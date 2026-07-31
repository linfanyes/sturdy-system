import { Module, UseGuards, Controller, Get, Post, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ClassMembersModule, ClassMemberService } from '../class-members/class-members.module'
import { Student } from '../students/student.entity'
import { StudentInfoUpdate } from './student-info-update.entity'

/**
 * 学生信息修改申请审核服务。
 * 家长提交 → 教师端审核（通过则写入学生信息）。
 */
export class StudentInfoUpdateService {
  constructor(
    @InjectRepository(StudentInfoUpdate) private readonly repo: Repository<StudentInfoUpdate>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly classMemberSvc: ClassMemberService,
  ) {}

  /** 家长端：提交修改申请 */
  async submit(parentPayload: any, studentId: string, payload: Record<string, any>) {
    if (!studentId) throw new BadRequestException('缺少学生ID')
    // 允许修改的字段白名单
    const allowed = ['parentPhone', 'address', 'studentPhone', 'parentName', 'birthDate', 'note']
    const filtered: Record<string, any> = {}
    for (const k of Object.keys(payload || {})) {
      if (allowed.includes(k)) filtered[k] = payload[k]
    }
    if (!Object.keys(filtered).length) throw new BadRequestException('没有可修改的字段')

    const stu = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!stu) throw new NotFoundException('学生不存在')
    // 家长只能修改自己孩子的信息（已由 JWT 的 studentId 隔离；多娃用 parentId 校验）
    if (parentPayload?.parentId && stu.parentId && parentPayload.parentId !== stu.parentId) {
      throw new BadRequestException('只能修改自己孩子的信息')
    }

    const entity = this.repo.create({
      teacherId: parentPayload?.studentId || 'parent', // 租户键占位，审核通过后由教师账号接管
      studentId: stu.id,
      classId: stu.classId,
      studentName: stu.name,
      parentId: parentPayload?.parentId || '',
      parentName: parentPayload?.parentName || stu.parentName || '家长',
      payload: filtered,
      status: 'pending',
    } as any)
    return this.repo.save(entity)
  }

  /** 家长端：查看自己提交的申请列表 */
  async listMine(parentPayload: any) {
    const q = this.repo.createQueryBuilder('u')
      .where('u.studentId = :sid', { sid: parentPayload.studentId })
      .orderBy('u.createdAt', 'DESC')
      .take(50)
    if (parentPayload.parentId) {
      q.andWhere('(u.parentId = :pid OR u.studentId = :sid)', { pid: parentPayload.parentId, sid: parentPayload.studentId })
    }
    return q.getMany()
  }

  /** 教师端：按班级查询待审核列表 */
  async listForTeacher(teacherId: string, classId?: string, status?: string) {
    const classIds = classId ? [classId] : await this.classMemberSvc.getClassIdsByTeacher(teacherId)
    if (!classIds.length) return []
    const q = this.repo.createQueryBuilder('u')
      .where('u.classId IN (:...cids)', { cids: classIds })
      .orderBy('u.createdAt', 'DESC')
      .take(200)
    if (status) q.andWhere('u.status = :status', { status })
    return q.getMany()
  }

  /** 教师端：审核（通过/拒绝），通过则把 payload 写入学生信息 */
  async review(teacherId: string, id: string, action: 'approve' | 'reject', note?: string) {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('申请不存在')
    if (item.status !== 'pending') throw new BadRequestException('该申请已处理')

    // 校验教师权限
    if (item.classId) {
      const can = await this.classMemberSvc.canAccess(teacherId, item.classId)
      if (!can) throw new NotFoundException('申请不存在或无权处理')
    }

    if (action === 'approve') {
      const stu = await this.studentRepo.findOne({ where: { id: item.studentId } })
      if (!stu) throw new NotFoundException('学生已不存在')
      Object.assign(stu, item.payload || {})
      await this.studentRepo.save(stu)
      item.status = 'approved'
    } else {
      item.status = 'rejected'
    }
    item.reviewNote = note || null
    item.reviewedBy = teacherId
    item.reviewedAt = new Date()
    return this.repo.save(item)
  }
}

@Roles('teacher')
@Feature('students')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('student-info-updates')
class StudentInfoUpdateController {
  constructor(private readonly s: StudentInfoUpdateService) {}

  /** 教师端：查询本班待审核列表 */
  @Get()
  list(@CurrentTeacher() t: any, @Query('classId') classId?: string, @Query('status') status?: string) {
    return this.s.listForTeacher(t.sub, classId, status)
  }

  /** 教师端：审核通过/拒绝 */
  @Post(':id/review')
  review(@CurrentTeacher() t: any, @Param('id') id: string, @Body() b: { action: 'approve' | 'reject'; note?: string }) {
    if (!b?.action || !['approve', 'reject'].includes(b.action)) {
      throw new BadRequestException('action 必须为 approve 或 reject')
    }
    return this.s.review(t.sub, id, b.action, b.note)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([StudentInfoUpdate, Student]), ClassMembersModule],
  providers: [StudentInfoUpdateService],
  controllers: [StudentInfoUpdateController],
  exports: [StudentInfoUpdateService],
})
export class StudentInfoUpdateModule {}
