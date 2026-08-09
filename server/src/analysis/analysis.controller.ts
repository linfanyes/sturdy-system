import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AnalysisService } from './analysis.service'

/**
 * 学生成长分析接口（老师/校管视角）。
 * 鉴权用 JwtAuthGuard，后续可加 schoolId/teacherId 参数做更细粒度权限控制。
 */
@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  /** 学生历次考试趋势（subject 可选） */
  @Get('student-trend')
  studentTrend(
    @Query('studentId') studentId: string,
    @Query('classId') classId: string,
    @Query('subject') subject?: string,
  ) {
    return this.analysis.studentTrend(studentId, classId, subject)
  }

  /** 班级历次考试均分/及格率/优秀率/参加人数（subject 可选） */
  @Get('class-trend')
  classTrend(@Query('classId') classId: string, @Query('subject') subject?: string) {
    return this.analysis.classTrend(classId, subject)
  }

  /** 班级各科目相对强弱分析（雷达图） */
  @Get('subject-strength')
  subjectStrength(@Query('classId') classId: string) {
    return this.analysis.subjectStrength(classId)
  }
}