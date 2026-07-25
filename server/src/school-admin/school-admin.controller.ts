import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query, Res, BadRequestException } from '@nestjs/common'
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

  /** 批量创建学生（接收 students 数组，可跨班级；校验所有 classId 属于本校） */
  @Post('students/batch')
  @UseGuards(JwtAuthGuard)
  batchCreateStudents(@CurrentSchoolAdmin() a: any, @Body() b: { students: any[] }) {
    return this.svc.batchCreateStudents(a.schoolId, b?.students || [])
  }

  /**
   * 从 CSV/Excel/JSON 文件导入学生到指定班级。
   * body: { classId, filename, data(base64) }
   * 文件列顺序与教师端一致：姓名,性别,学号,家长姓名,家长电话。
   * 解析后取有效行写入指定 classId，返回成功/失败明细。
   */
  @Post('students/import')
  @UseGuards(JwtAuthGuard)
  async importStudents(
    @CurrentSchoolAdmin() a: any,
    @Body() b: { classId?: string; filename?: string; data?: string },
  ) {
    if (!b?.classId) throw new BadRequestException('缺少班级ID')
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.svc.parseStudentFile(b.filename, b.data)
    // 仅导入校验通过的有效行，统一填充 classId
    const valid = rows.filter((r) => r.valid).map((r) => ({
      name: r.name, gender: r.gender, studentNo: r.studentNo,
      parentName: r.parentName, parentPhone: r.parentPhone, classId: b.classId,
    }))
    if (!valid.length) throw new BadRequestException('文件中无有效学生数据')
    return this.svc.batchCreateStudents(a.schoolId, valid)
  }

  /** 学生文件预览：解析并校验文件，不落库，返回明细（含错误行） */
  @Post('students/import-preview')
  @UseGuards(JwtAuthGuard)
  async importPreview(@Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.svc.parseStudentFile(b.filename, b.data)
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
