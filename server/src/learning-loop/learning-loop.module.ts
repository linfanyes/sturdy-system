import { Module, Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { StudyPlan, WeakPointExercise } from './learning-loop.entity'
import { LearningLoopService } from './learning-loop.service'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { MathMistake } from '../math-mistakes/math-mistakes.module'
import { Grade } from '../grades/grade.entity'
import { AiModule } from '../ai/ai.module'

@Controller('learning-loop')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherLearningLoopController {
  constructor(private readonly svc: LearningLoopService) {}

  /** 学情画像：薄弱知识点清单 */
  @Get('profile')
  profile(@CurrentTeacher() t: any, @Query('classId') classId: string, @Query('studentId') studentId?: string) {
    return this.svc.getProfile(t.id, classId, studentId)
  }

  /** AI 生成薄弱点同类题练习 */
  @Post('exercise')
  generate(@CurrentTeacher() t: any, @Body() body: any) {
    return this.svc.generateExercise(t.id, body.studentId, body.knowledgePoint)
  }

  /** 保存学习计划（按学生+周 upsert） */
  @Post('plan')
  savePlan(@CurrentTeacher() t: any, @Body() body: any) {
    return this.svc.savePlan(t.id, body)
  }
}

@Controller('parent/learning-loop')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentLearningLoopController {
  constructor(private readonly svc: LearningLoopService) {}

  /** 当前学生学习计划 + 练习列表 */
  @Get('plan')
  plan(@CurrentParent() p: any) {
    return this.svc.parentPlan(p.studentId)
  }

  /** 生成薄弱点练习 */
  @Post('exercise')
  generate(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.parentGenerate(p.studentId, body.knowledgePoint)
  }

  /** 标记练习已完成 */
  @Post('exercise/:id/done')
  done(@CurrentParent() p: any, @Param('id') id: string) {
    return this.svc.parentMarkDone(p.studentId, id)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([StudyPlan, WeakPointExercise, Student, ClassItem, MathMistake, Grade]),
    AiModule,
  ],
  controllers: [TeacherLearningLoopController, ParentLearningLoopController],
  providers: [LearningLoopService],
  exports: [LearningLoopService],
})
export class LearningLoopModule {}
