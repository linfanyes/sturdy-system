import { Module, Controller, Get, Post, Body, Query, UseGuards, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { LiteracyLesson, LiteracyBadge } from './literacy.entity'
import { LiteracyService } from './literacy.service'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Controller('literacy')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherLiteracyController {
  constructor(private readonly svc: LiteracyService) {}

  /** 微课列表 */
  @Get('lessons')
  list(@Query('category') category?: string) {
    return this.svc.listLessons(category)
  }

  /** 班级徽章统计 */
  @Get('class-badges')
  classBadges(@CurrentTeacher() t: any, @Query('classId') classId: string) {
    return this.svc.classBadges(t.id, classId)
  }
}

@Controller('parent/literacy')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentLiteracyController {
  constructor(private readonly svc: LiteracyService) {}

  /** 微课列表 */
  @Get('lessons')
  list(@Query('category') category?: string) {
    return this.svc.listLessons(category)
  }

  /** 完成得徽章 */
  @Post('complete')
  complete(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.complete(body.lessonId, p.studentId)
  }

  /** 我的徽章 */
  @Get('my-badges')
  my(@CurrentParent() p: any) {
    return this.svc.myBadges(p.studentId)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([LiteracyLesson, LiteracyBadge, Student, ClassItem])],
  controllers: [TeacherLiteracyController, ParentLiteracyController],
  providers: [LiteracyService],
  exports: [LiteracyService],
})
export class LiteracyModule implements OnModuleInit {
  constructor(private readonly svc: LiteracyService) {}
  async onModuleInit() {
    try {
      await this.svc.seedIfEmpty()
    } catch (e) {
      // 容错：缺列/表结构未对齐不应阻断整个后端启动（与 admin.service.seedDemoData 一致）
      console.warn('[Literacy] 种子初始化失败（可忽略，待迁移补齐结构后重试）:', (e as Error).message)
    }
  }
}
