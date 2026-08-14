import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AnalysisService } from './analysis.service'

/**
 * 学生成长分析接口（老师/校管视角）。
 * 所有端点均校验调用者对所查班级的访问权限，杜绝跨班/跨校越权读取成绩数据。
 */
@Roles('teacher', 'school_admin')
@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  /** 学生历次考试趋势（subject 可选） */
  @Get('student-trend')
  studentTrend(
    @CurrentTeacher() t: any,
    @Query('studentId') studentId: string,
    @Query('classId') classId: string,
    @Query('subject') subject?: string,
  ) {
    return this.analysis.studentTrend(t, studentId, classId, subject)
  }

  /** 班级历次考试均分/及格率/优秀率/参加人数（subject 可选） */
  @Get('class-trend')
  classTrend(@CurrentTeacher() t: any, @Query('classId') classId: string, @Query('subject') subject?: string) {
    return this.analysis.classTrend(t, classId, subject)
  }

  /** 班级各科目相对强弱分析（雷达图） */
  @Get('subject-strength')
  subjectStrength(@CurrentTeacher() t: any, @Query('classId') classId: string) {
    return this.analysis.subjectStrength(t, classId)
  }
}