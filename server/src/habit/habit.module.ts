import { Module, Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { HabitChallenge, HabitCheckin } from './habit.entity'
import { HabitService } from './habit.service'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Controller('habit')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherHabitController {
  constructor(private readonly svc: HabitService) {}

  /** 班级挑战 */
  @Get('challenges')
  classChallenges(@CurrentTeacher() t: any, @Query('classId') classId: string) {
    return this.svc.classChallenges(t.id, classId)
  }

  /** 班级打卡排行榜 */
  @Get('ranking')
  ranking(@CurrentTeacher() t: any, @Query('classId') classId: string) {
    return this.svc.ranking(t.id, classId)
  }
}

@Controller('parent/habit')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentHabitController {
  constructor(private readonly svc: HabitService) {}

  /** 发起挑战 */
  @Post('challenge')
  create(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.createChallenge(p.studentId, 'parent', body)
  }

  /** 我的挑战 */
  @Get('my')
  my(@CurrentParent() p: any) {
    return this.svc.myChallenges(p.studentId)
  }

  /** 打卡 */
  @Post('checkin')
  checkin(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.checkin(body.challengeId, p.studentId, body)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([HabitChallenge, HabitCheckin, Student, ClassItem])],
  controllers: [TeacherHabitController, ParentHabitController],
  providers: [HabitService],
  exports: [HabitService],
})
export class HabitModule {}
