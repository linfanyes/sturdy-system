import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, Get, Post, Patch, Body, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Exam } from './exam.entity'
import { Grade } from '../grades/grade.entity'
import { ClassItem } from '../classes/class.entity'
import { User } from '../users/user.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'
import { CreateExamDto, UpdateExamDto } from './dto/exams.dto'

class ExamsService extends CrudService<Exam> {
  constructor(
    @InjectRepository(Exam) repo: Repository<Exam>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    @InjectRepository(User) private userRepo: Repository<User>,
    classMemberSvc: ClassMemberService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc)
  }

  /** 考试是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
  }

  /** 通用班级访问校验：teacher 走 class_member 表，school_admin 走「班级→教师→学校」归属 */
  private async canAccessClass(user: any, classId: string): Promise<boolean> {
    if (user?.role === 'school_admin') {
      const cls = await this.classRepo.findOne({ where: { id: classId } as any })
      if (!cls) return false
      const teacher = await this.userRepo.findOne({ where: { id: cls.teacherId, schoolId: user.schoolId } as any })
      return !!teacher
    }
    return this.classMemberSvc.canAccess(user.sub, classId)
  }

  /**
   * 考试按班级共享：同班教师可互看。
   * 安全约束：传入 classId 时必须先校验班级归属当前用户（教师走任教班级，校管走学校归属），
   * 否则返回空，杜绝用任意 classId 越权读取其他学校/班级考试；
   * 不传 classId 时教师按 teacherId 过滤，校管必须指定班级（避免跨校泄露）。
   */
  async findAll(user: any, classId?: string, skip = 0, take = 500) {
    const where: any = {}
    if (classId) {
      // 班主任或同班科任老师/校管均可查看该班级考试
      const canAccess = await this.canAccessClass(user, classId)
      if (!canAccess) return { items: [], total: 0 }
      where.classId = classId
    } else if (user?.role === 'school_admin') {
      // 校管必须指定班级，避免跨校泄露
      return { items: [], total: 0 }
    } else {
      where.teacherId = user.sub
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /** 校管/教师查询单个考试：按记录班级归属校验（复用 canAccessClass） */
  async findOneForUser(user: any, id: string): Promise<Exam> {
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e) throw new NotFoundException('考试不存在或无权访问')
    const canAccess = await this.canAccessClass(user, e.classId)
    if (!canAccess) throw new NotFoundException('考试不存在或无权访问')
    return e
  }

  /** 创建考试计划时，为每个科目自动建一条空成绩记录 */
  async create(teacherId: string, dto: any): Promise<Exam> {
    // 检查是否有同名考试（同班同学期同名才冲突，不同学期允许）
    const existingExam = await this.repo.findOne({
      where: { classId: dto.classId, name: dto.name, term: dto.term } as any,
    })
    if (existingExam) {
      throw new BadRequestException('该班级已存在同名考试，请修改考试名称')
    }
    const exam = await super.create(teacherId, dto)
    try {
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
    } catch (e) {
      // 如果创建成绩记录失败，删除已创建的考试
      await super.remove(exam.id, teacherId)
      throw e
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
    // 检查是否有其他老师录入的成绩（避免误删他人数据）
    const relatedGrades = await this.gradeRepo.find({ where: { examId: id } as any, select: ['teacherId'] })
    const otherTeacherGrades = relatedGrades.filter(g => g.teacherId !== teacherId)
    if (otherTeacherGrades.length > 0 && !isHead) {
      throw new BadRequestException('该考试下有其他老师录入的成绩，无法删除。请联系班主任处理。')
    }
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

  /** 考试列表：教师按任教班级过滤，校管按「班级→教师→学校」归属校验 */
  @Get()
  @Roles('teacher', 'school_admin')
  findAll(
    @CurrentTeacher() t: any,
    @Query('classId') classId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return (this.service as ExamsService).findAll(
      t,
      classId,
      Math.max(0, Number(skip) || 0),
      Math.min(Number(take) || 500, 500),
    )
  }

  /** 考试详情：教师/校管均按记录班级归属校验 */
  @Get(':id')
  @Roles('teacher', 'school_admin')
  findOne(@Param('id') id: string, @CurrentTeacher() t: any) {
    return (this.service as ExamsService).findOneForUser(t, id)
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
  imports: [TypeOrmModule.forFeature([Exam, Grade, ClassItem, User]), ClassMembersModule],
  providers: [ExamsService],
  controllers: [ExamsController],
})
export class ExamsModule {}
