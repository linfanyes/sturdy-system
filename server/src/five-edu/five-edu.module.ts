import { Module, Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { FiveEduRecord } from './five-edu.entity'
import { FiveEduService } from './five-edu.service'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Grade } from '../grades/grade.entity'
import { Checkin } from '../checkin/checkin.module'
import { ReadingLog } from '../reading-log/reading-log.module'
import { ScoreRecord, RewardRecord } from '../engagement/engagement.entity'
import { AwardRecord } from '../award/award.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { CodingBadge } from '../kids-coding/badge.entity'
import { CodingReview } from '../kids-coding/review.entity'
import { AiModule } from '../ai/ai.module'

@Controller('five-edu')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherFiveEduController {
  constructor(private readonly svc: FiveEduService) {}

  /** 班级五育档案总览（含 AI 点评）+ 可选单学生 */
  @Get('profile')
  profile(@CurrentTeacher() t: any, @Query('classId') classId: string, @Query('studentId') studentId?: string) {
    return this.svc.getProfile(t.id, classId, studentId)
  }

  /** 保存过程性评价 / 家务打卡 */
  @Post('record')
  saveRecord(@CurrentTeacher() t: any, @Body() body: any) {
    return this.svc.saveRecord(t.id, body)
  }

  /** 过程性评价记录列表 */
  @Get('records')
  listRecords(@CurrentTeacher() t: any, @Query('studentId') studentId?: string) {
    return this.svc.listRecords(t.id, studentId)
  }
}

@Controller('parent/five-edu')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentFiveEduController {
  constructor(private readonly svc: FiveEduService) {}

  /** 当前绑定学生的五育档案 + 过程性评价记录 */
  @Get('profile')
  profile(@CurrentParent() p: any) {
    return this.svc.parentProfile(p.studentId)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiveEduRecord, Student, ClassItem, Grade, Checkin, ReadingLog,
      ScoreRecord, RewardRecord, AwardRecord, MoodCheckIn, CodingBadge, CodingReview,
    ]),
    AiModule,
  ],
  controllers: [TeacherFiveEduController, ParentFiveEduController],
  providers: [FiveEduService],
  exports: [FiveEduService],
})
export class FiveEduModule {}
