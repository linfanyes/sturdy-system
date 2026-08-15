import { Module, Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { ClassInsight } from './insight.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { Grade } from '../grades/grade.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { InsightService } from './insight.service'
import { InsightBatchService } from './insight.batch.service'
import { MoodModule } from '../mood/mood.module'
import { AiModule } from '../ai/ai.module'
import { MessagesModule } from '../messages/messages.module'

@Controller('insight')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherInsightController {
  constructor(private readonly svc: InsightService) {}

  /** 教师本人各班级最新洞察 */
  @Get()
  list(@CurrentTeacher() t: any) {
    return this.svc.getLatestForTeacher(t.id)
  }

  /** 手动重新生成并推送某班洞察 */
  @Post('regenerate/:classId')
  async regenerate(@Param('classId') classId: string, @CurrentTeacher() t: any) {
    const insight = await this.svc.buildAndStore(t.id, classId)
    await this.svc.pushToTeacher(t.id, insight)
    return insight
  }

  /** 基于本班真实数据一键生成班级文案（家长会发言稿/致家长信/学期总结/班级寄语） */
  @Post('generate-doc')
  generateDoc(@Body() body: any, @CurrentTeacher() t: any) {
    return this.svc.generateClassDoc(t.id, body.classId, body.type || 'letter')
  }
}

@Controller('parent/insight')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentInsightController {
  constructor(private readonly svc: InsightService) {}

  /** 学生 AI 学习伙伴（带内容安全护栏） */
  @Post('study-buddy')
  studyBuddy(@Body() body: any, @CurrentParent() p: any) {
    const messages = Array.isArray(body?.messages) ? body.messages : []
    return this.svc.studyBuddy(p.sub, messages, body?.studentName)
  }
}

@Controller('admin/insight')
@RolesDecorator('super')
@UseGuards(JwtAuthGuard)
export class InsightAdminController {
  constructor(private readonly batch: InsightBatchService) {}

  /** 超管手动触发全校班级洞察推送 */
  @Post('push-all')
  pushAll() {
    return this.batch.pushAllInsights()
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassInsight, MoodCheckIn, Grade, ClassItem, Student]),
    MoodModule,
    AiModule,
    MessagesModule,
  ],
  controllers: [TeacherInsightController, ParentInsightController, InsightAdminController],
  providers: [InsightService, InsightBatchService],
  exports: [InsightService],
})
export class InsightModule {}
