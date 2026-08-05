import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Post, Patch, Body, Param, NotFoundException } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Exam } from './exam.entity'
import { Grade } from '../grades/grade.entity'
import { ClassItem } from '../classes/class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { CreateExamDto, UpdateExamDto } from '../dto/exams.dto'

class ExamsService extends CrudService<Exam> {
  constructor(
    @InjectRepository(Exam) repo: Repository<Exam>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    classMemberSvc: ClassMemberService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc)
  }

  /** 考试是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
  }

  /**
   * 考试按班级共享：同班教师可互看。
   * 安全约束：传入 classId 时必须先校验班级归属当前教师，否则返回空，
   * 杜绝用任意 classId 越权读取其他教师班级考试；不传 classId 时按 teacherId 过滤。
   */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500) {
    const where: any = {}
    if (classId) {
      // 班主任或同班科任老师均可查看该班级考试
      const canAccess = await this.classMemberSvc.canAccess(teacherId, classId)
      if (!canAccess) return { items: [], total: 0 }
      where.classId = classId
    } else {
      where.teacherId = teacherId
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /** 创建考试计划时，为每个科目自动建一条空成绩记录 */
  async create(teacherId: string, dto: any): Promise<Exam> {
    const exam = await super.create(teacherId, dto)
    for (const subject of dto.subjects || []) {
      await this.gradeRepo.save(
        this.gradeRepo.create({
          teacherId,
          classId: dto.classId,
          subject,
          examName: dto.name,
          examId: exam.id,
          date: dto.date,
          scores: [],
        } as any),
      )
    }
    return exam
  }

  /** 删除考试：班主任可删除同班任何考试，科任老师仅可删除自己创建的考试 */
  async remove(id: string, teacherId: string) {
    const exam = await this.repo.findOne({ where: { id } as any })
    if (!exam) throw new NotFoundException('考试不存在')
    // 班主任可删除同班任何考试
    const isHead = await this.classMemberSvc.getRole(teacherId, exam.classId) === 'head'
    if (!isHead && exam.teacherId !== teacherId) throw new NotFoundException('无权删除此考试')
    await this.gradeRepo.delete({ examId: id } as any)
    return super.remove(id, teacherId)
  }
}

@Roles('teacher')
@Feature('exams')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('exams')
class ExamsController extends CrudController<Exam> {
  constructor(s: ExamsService) {
    super(s)
  }

  @Post()
  create(@Body() dto: CreateExamDto, @CurrentTeacher() t: any) {
    return super.create(dto as any, t)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @CurrentTeacher() t: any) {
    return super.update(id, dto as any, t)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Grade, ClassItem]), ClassMembersModule],
  providers: [ExamsService],
  controllers: [ExamsController],
})
export class ExamsModule {}
