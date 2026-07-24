import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query, Res } from '@nestjs/common'
import { SchoolAdminService } from './school-admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentSchoolAdmin } from './current-school-admin.decorator'

@Controller('school-admin')
@Roles('school_admin')
export class SchoolAdminController {
  constructor(private readonly svc: SchoolAdminService) {}

  @Post('login')
  login(@Body() b: { username?: string; password?: string }) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  dashboard(@CurrentSchoolAdmin() a: any) { return this.svc.dashboard(a.schoolId) }

  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  listTeachers(@CurrentSchoolAdmin() a: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listTeachers(a.schoolId, Number(skip) || 0, Number(take) || 200)
  }

  @Post('teachers')
  @UseGuards(JwtAuthGuard)
  createTeacher(@CurrentSchoolAdmin() a: any, @Body() b: any) { return this.svc.createTeacher(a.schoolId, b) }

  @Post('teachers/batch')
  @UseGuards(JwtAuthGuard)
  batchCreateTeachers(@CurrentSchoolAdmin() a: any, @Body() b: { teachers: { name: string; phone?: string; gender?: string; subject?: string; password?: string; username?: string }[] }) {
    return this.svc.batchCreateTeachers(a.schoolId, b.teachers || [])
  }

  @Patch('teachers/:id')
  @UseGuards(JwtAuthGuard)
  updateTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateTeacher(a.schoolId, id, b)
  }

  @Patch('teachers/:id/features')
  @UseGuards(JwtAuthGuard)
  updateFeatures(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: { features?: string[] }) {
    return this.svc.updateTeacherFeatures(a.schoolId, id, b?.features || [])
  }

  @Post('teachers/:id/reset-password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.resetPassword(a.schoolId, id, b?.password || '')
  }

  @Delete('teachers/:id')
  @UseGuards(JwtAuthGuard)
  deleteTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.svc.deleteTeacher(a.schoolId, id) }

  @Get('parent-logins')
  @UseGuards(JwtAuthGuard)
  parentLogins(@CurrentSchoolAdmin() a: any) { return this.svc.listParentLogins(a.schoolId) }

  // ===== 班级管理 =====

  @Get('classes')
  @UseGuards(JwtAuthGuard)
  listClasses(@CurrentSchoolAdmin() a: any) { return this.svc.listClasses(a.schoolId) }

  @Post('classes')
  @UseGuards(JwtAuthGuard)
  createClass(@CurrentSchoolAdmin() a: any, @Body() b: any) { return this.svc.createClass(a.schoolId, b) }

  @Patch('classes/:id')
  @UseGuards(JwtAuthGuard)
  updateClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateClass(a.schoolId, id, b)
  }

  @Delete('classes/:id')
  @UseGuards(JwtAuthGuard)
  deleteClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.svc.deleteClass(a.schoolId, id) }

  // ===== 学校公告 =====

  @Get('notices')
  @UseGuards(JwtAuthGuard)
  listNotices(@CurrentSchoolAdmin() a: any) { return this.svc.listSchoolNotices(a.schoolId) }

  @Post('notices')
  @UseGuards(JwtAuthGuard)
  createNotice(@CurrentSchoolAdmin() a: any, @Body() b: any) { return this.svc.createSchoolNotice(a.schoolId, a.sub, b) }

  @Delete('notices/:id')
  @UseGuards(JwtAuthGuard)
  deleteNotice(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.svc.deleteSchoolNotice(a.schoolId, id) }

  // ===== 学生管理 =====
  @Get('students')
  @UseGuards(JwtAuthGuard)
  listStudents(@CurrentSchoolAdmin() a: any) { return this.svc.listSchoolStudents(a.schoolId) }

  @Patch('students/:id')
  @UseGuards(JwtAuthGuard)
  updateStudent(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateStudent(a.schoolId, id, b)
  }

  // ===== 数据导出 =====
  @Get('export/teachers')
  @UseGuards(JwtAuthGuard)
  async exportTeachers(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const data = await this.svc.exportTeachers(a.schoolId)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=teachers.csv')
    res.send('\uFEFF' + data)
  }

  @Get('export/students')
  @UseGuards(JwtAuthGuard)
  async exportStudents(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const data = await this.svc.exportStudents(a.schoolId)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv')
    res.send('\uFEFF' + data)
  }

  // ===== 全局搜索 =====
  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@CurrentSchoolAdmin() a: any, @Query('q') q?: string) {
    return this.svc.search(a.schoolId, q || '')
  }
}
