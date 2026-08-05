import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { OnlineResourcesService } from './online-resources.service'

/**
 * 智慧中小学在线资源代理
 * 路由前缀 /online-resources/zhzx
 * 教师 / 校管 / 超管均可浏览（只读）。
 */
@Controller('online-resources/zhzx')
@Roles('teacher', 'school_admin', 'super')
export class OnlineResourcesController {
  constructor(private readonly svc: OnlineResourcesService) {}

  /** 课程目录（按学科/年级/关键词过滤） */
  @Get('courses')
  @UseGuards(JwtAuthGuard)
  listCourses(
    @CurrentTeacher() _user: any,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.svc.listCourses({ subject, grade, keyword })
  }

  /** 课程详情（尝试实时解析课时，失败降级精选目录） */
  @Get('courses/:id')
  @UseGuards(JwtAuthGuard)
  getCourse(@Param('id') id: string) {
    return this.svc.getCourseDetail(id)
  }
}
