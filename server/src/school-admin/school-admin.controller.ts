import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query, Res, BadRequestException } from '@nestjs/common'
import { SchoolAdminService } from './school-admin.service'
import { TeacherMgmtService } from './teacher-mgmt.service'
import { ClassMgmtService } from './class-mgmt.service'
import { StudentOpsService } from './student-ops.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentSchoolAdmin } from './current-school-admin.decorator'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import {
  CreateTeacherDto, BatchCreateTeachersDto, CreateClassDto, CreateNoticeDto, UpdateStudentDto,
} from './dto/school-admin.dto'

// S01修复：学校管理员登录限流 10次/分钟/IP，防止暴力破解（与超管登录、教师登录同等级别防护）
const SchoolAdminLoginRateLimit = createRateLimitGuard(60_000, 10)

/** 分页上限（与 base.controller 的 MAX_TAKE 对齐）：客户端 take 超 500 截断，防大查询拖垮数据库 */
const MAX_TAKE = 500
function clampTake(take?: string, def = 100): number {
  const v = Number(take) || def
  return Math.min(v, MAX_TAKE)
}

@Controller('school-admin')
@Roles('school_admin')
export class SchoolAdminController {
  constructor(
    private readonly svc: SchoolAdminService,
    private readonly teacherSvc: TeacherMgmtService,
    private readonly classSvc: ClassMgmtService,
    private readonly studentOps: StudentOpsService,
  ) {}

  /** D9 修复：校验 base64 文件数据的合法性，非法数据直接 400（避免解析出乱码行） */
  private assertValidBase64(data: string) {
    const s = String(data || '').replace(/\s/g, '')
    if (!s || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new BadRequestException('文件数据不是有效的 base64 编码')
  }

  @Post('login')
  @UseGuards(SchoolAdminLoginRateLimit)
  login(@Body() b: { username?: string; password?: string }) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  dashboard(@CurrentSchoolAdmin() a: any) { return this.svc.dashboard(a.schoolId) }

  /** 校管查看本校「学校级功能包开关」（用于教师有效权限预览，不修改） */
  @Get('school-features')
  @UseGuards(JwtAuthGuard)
  getSchoolFeatures(@CurrentSchoolAdmin() a: any) { return this.svc.getSchoolFeatures(a.schoolId) }

  /** 校管更新本校「学校级功能包开关」（超管默认，校管可覆盖本校功能子集） */
  @Patch('school-features')
  @UseGuards(JwtAuthGuard)
  updateSchoolFeatures(@CurrentSchoolAdmin() a: any, @Body() b: { featureFlags?: string[] | null }) {
    return this.svc.updateSchoolFeatures(a.schoolId, b.featureFlags ?? null)
  }

  // ===== 教师管理（委托 TeacherMgmtService）=====

  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  listTeachers(@CurrentSchoolAdmin() a: any, @Query('skip') skip?: string, @Query('take') take?: string, @Query('keyword') keyword?: string) {
    return this.teacherSvc.listTeachers(a.schoolId, Math.max(0, Number(skip) || 0), clampTake(take, 200), keyword)
  }

  @Get('teachers/:id')
  @UseGuards(JwtAuthGuard)
  getTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.teacherSvc.getTeacher(a.schoolId, id)
  }

  @Post('teachers')
  @UseGuards(JwtAuthGuard)
  createTeacher(@CurrentSchoolAdmin() a: any, @Body() b: CreateTeacherDto) { return this.teacherSvc.createTeacher(a.schoolId, b) }

  @Post('teachers/batch')
  @UseGuards(JwtAuthGuard)
  batchCreateTeachers(@CurrentSchoolAdmin() a: any, @Body() b: BatchCreateTeachersDto) {
    return this.teacherSvc.batchCreateTeachers(a.schoolId, b.teachers || [])
  }

  /** 从 CSV/Excel/JSON 文件导入教师（列：姓名,性别,学科,手机号） */
  @Post('teachers/batch-import')
  @UseGuards(JwtAuthGuard)
  async batchImportTeachers(@CurrentSchoolAdmin() a: any, @Body() b: { teachers?: any[]; filename?: string; data?: string }) {
    if (b?.teachers?.length) {
      return this.teacherSvc.batchCreateTeachers(a.schoolId, b.teachers)
    }
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.teacherSvc.parseTeacherFile(b.filename, b.data)
    const valid = rows.filter((r: any) => r.valid).map((r: any) => ({ name: r.name, gender: r.gender, subject: r.subject, phone: r.phone }))
    if (!valid.length) throw new BadRequestException('文件中无有效教师数据')
    return this.teacherSvc.batchCreateTeachers(a.schoolId, valid)
  }

  @Post('teachers/import')
  @UseGuards(JwtAuthGuard)
  async importTeachers(@CurrentSchoolAdmin() a: any, @Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.teacherSvc.parseTeacherFile(b.filename, b.data)
    const valid = rows.filter((r: any) => r.valid).map((r: any) => ({ name: r.name, gender: r.gender, subject: r.subject, phone: r.phone }))
    if (!valid.length) throw new BadRequestException('文件中无有效教师数据')
    return this.teacherSvc.batchCreateTeachers(a.schoolId, valid)
  }

  /** 教师文件预览：解析并校验，返回明细（含错误行） */
  @Post('teachers/import-preview')
  @UseGuards(JwtAuthGuard)
  async importTeachersPreview(@Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    this.assertValidBase64(b.data)
    return await this.teacherSvc.parseTeacherFile(b.filename, b.data)
  }

  /** 教师文件 AI 识别：图片走 OCR、表格转文本，再交给大模型结构化解析 */
  @Post('teachers/import-ai')
  @UseGuards(JwtAuthGuard)
  async importTeachersAi(@CurrentSchoolAdmin() a: any, @Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.teacherSvc.aiRecognizeTeachers(a.sub, b.filename, b.data)
  }

  @Patch('teachers/:id')
  @UseGuards(JwtAuthGuard)
  updateTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.teacherSvc.updateTeacher(a.schoolId, id, b)
  }

  @Patch('teachers/:id/features')
  @UseGuards(JwtAuthGuard)
  updateFeatures(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: { features?: string[] }) {
    return this.teacherSvc.updateTeacherFeatures(a.schoolId, id, b?.features || [])
  }

  @Post('teachers/:id/reset-password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.teacherSvc.resetPassword(a.schoolId, id, b?.password || '')
  }

  @Delete('teachers/:id')
  @UseGuards(JwtAuthGuard)
  deleteTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.teacherSvc.deleteTeacher(a.schoolId, id) }

  @Post('teachers/deactivate-all')
  @UseGuards(JwtAuthGuard)
  deactivateAllTeachers(@CurrentSchoolAdmin() a: any) { return this.teacherSvc.deactivateAllTeachers(a.schoolId) }

  @Get('parent-logins')
  @UseGuards(JwtAuthGuard)
  parentLogins(@CurrentSchoolAdmin() a: any) { return this.teacherSvc.listParentLogins(a.schoolId) }

  // ===== 班级管理（委托 ClassMgmtService）=====

  @Get('classes')
  @UseGuards(JwtAuthGuard)
  listClasses(@CurrentSchoolAdmin() a: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.classSvc.listClasses(a.schoolId, Math.max(0, Number(skip) || 0), clampTake(take, 500))
  }

  @Get('classes/:id')
  @UseGuards(JwtAuthGuard)
  getClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.classSvc.getClass(a.schoolId, id) }

  @Post('classes')
  @UseGuards(JwtAuthGuard)
  createClass(@CurrentSchoolAdmin() a: any, @Body() b: CreateClassDto) { return this.classSvc.createClass(a.schoolId, b) }

  @Patch('classes/:id')
  @UseGuards(JwtAuthGuard)
  updateClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.classSvc.updateClass(a.schoolId, id, b)
  }

  @Delete('classes/:id')
  @UseGuards(JwtAuthGuard)
  deleteClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.classSvc.deleteClass(a.schoolId, id) }

  /** 班级升级：三年级一班 → 四年级一班（年级+1，名称自动更新，学生和班主任保留） */
  @Post('classes/:id/promote')
  @UseGuards(JwtAuthGuard)
  promoteClass(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: { targetGrade?: string }) {
    return this.classSvc.promoteClass(a.schoolId, id, b?.targetGrade)
  }

  /** 批量创建班级（接收 classes 数组，逐条按班主任姓名解析为本校教师） */
  @Post('classes/batch')
  @UseGuards(JwtAuthGuard)
  batchCreateClasses(@CurrentSchoolAdmin() a: any, @Body() b: { classes: any[] }) {
    return this.classSvc.batchCreateClasses(a.schoolId, b?.classes || [])
  }

  /** 从 CSV/Excel/JSON 文件导入班级（列：班级名称,年级,班级序号,班主任姓名,学期） */
  @Post('classes/import')
  @UseGuards(JwtAuthGuard)
  async importClasses(
    @CurrentSchoolAdmin() a: any,
    @Body() b: { filename?: string; data?: string },
  ) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.classSvc.parseClassFile(b.filename, b.data)
    const valid = rows.filter((r) => r.valid).map((r) => ({ name: r.name, grade: r.grade, classNo: r.classNo, headTeacher: r.headTeacher, term: r.term }))
    if (!valid.length) throw new BadRequestException('文件中无有效班级数据')
    return this.classSvc.batchCreateClasses(a.schoolId, valid)
  }

  /** 班级文件预览：解析并校验，返回明细（含错误行） */
  @Post('classes/import-preview')
  @UseGuards(JwtAuthGuard)
  async importClassesPreview(@Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.classSvc.parseClassFile(b.filename, b.data)
  }

  /** 班级文件 AI 识别：图片走 OCR、表格转文本，再交给大模型结构化解析 */
  @Post('classes/import-ai')
  @UseGuards(JwtAuthGuard)
  async importClassesAi(@CurrentSchoolAdmin() a: any, @Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.classSvc.aiRecognizeClasses(a.sub, b.filename, b.data)
  }

  // ===== 学校公告 =====

  @Get('notices')
  @UseGuards(JwtAuthGuard)
  listNotices(@CurrentSchoolAdmin() a: any) { return this.svc.listSchoolNotices(a.schoolId) }

  @Post('notices')
  @UseGuards(JwtAuthGuard)
  createNotice(@CurrentSchoolAdmin() a: any, @Body() b: CreateNoticeDto) { return this.svc.createSchoolNotice(a.schoolId, a.sub, b) }

  @Delete('notices/:id')
  @UseGuards(JwtAuthGuard)
  deleteNotice(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.svc.deleteSchoolNotice(a.schoolId, id) }

  @Patch('notices/:id')
  @UseGuards(JwtAuthGuard)
  updateNotice(
    @CurrentSchoolAdmin() a: any,
    @Param('id') id: string,
    @Body() b: { title?: string; content?: string; pinned?: boolean },
  ) { return this.svc.updateSchoolNotice(a.schoolId, id, b) }

  // ===== 学生管理 =====

  /** 全校学生列表（委托 ClassMgmtService；支持 skip/take 分页与可选 classId 过滤） */
  @Get('students')
  @UseGuards(JwtAuthGuard)
  listStudents(
    @CurrentSchoolAdmin() a: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('classId') classId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.classSvc.listSchoolStudents(
      a.schoolId,
      Math.max(0, Number(skip) || 0),
      clampTake(take, 500),
      classId || undefined,
      keyword || undefined,
    )
  }

  @Get('students/export')
  @UseGuards(JwtAuthGuard)
  async exportStudents(@CurrentSchoolAdmin() a: any) {
    return await this.studentOps.exportStudentsData(a.schoolId)
  }

  @Patch('students/:id')
  @UseGuards(JwtAuthGuard)
  updateStudent(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: UpdateStudentDto) {
    return this.studentOps.updateStudent(a.schoolId, id, b)
  }

  @Delete('students/:id')
  @UseGuards(JwtAuthGuard)
  deleteStudent(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.studentOps.deleteStudent(a.schoolId, id)
  }

  /** 批量创建学生（接收 students 数组，可跨班级；校验所有 classId 属于本校） */
  @Post('students/batch')
  @UseGuards(JwtAuthGuard)
  batchCreateStudents(@CurrentSchoolAdmin() a: any, @Body() b: { students: any[] }) {
    return this.studentOps.batchCreateStudents(a.schoolId, b?.students || [])
  }

  /**
   * 从 CSV/Excel/JSON 文件导入学生到指定班级。
   * body: { classId, filename, data(base64) }
   * 文件列顺序与教师端一致：姓名,性别,学号,家长姓名,家长电话。
   * 解析后取有效行写入指定 classId，返回成功/失败明细。
   */
  @Post('students/batch-import')
  @UseGuards(JwtAuthGuard)
  async batchImportStudents(
    @CurrentSchoolAdmin() a: any,
    @Body() b: { classId?: string; students?: any[]; filename?: string; data?: string },
  ) {
    if (b?.students?.length) {
      return this.studentOps.batchCreateStudents(a.schoolId, b.students)
    }
    if (!b?.classId) throw new BadRequestException('缺少班级ID')
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.studentOps.parseStudentFile(b.filename, b.data)
    const valid = rows.filter((r) => r.valid).map((r) => ({
      name: r.name, gender: r.gender, studentNo: r.studentNo,
      parentName: r.parentName, parentPhone: r.parentPhone, classId: b.classId,
    }))
    if (!valid.length) throw new BadRequestException('文件中无有效学生数据')
    return this.studentOps.batchCreateStudents(a.schoolId, valid)
  }

  @Post('students/import')
  @UseGuards(JwtAuthGuard)
  async importStudents(
    @CurrentSchoolAdmin() a: any,
    @Body() b: { classId?: string; filename?: string; data?: string },
  ) {
    if (!b?.classId) throw new BadRequestException('缺少班级ID')
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    const { rows } = await this.studentOps.parseStudentFile(b.filename, b.data)
    const valid = rows.filter((r) => r.valid).map((r) => ({
      name: r.name, gender: r.gender, studentNo: r.studentNo,
      parentName: r.parentName, parentPhone: r.parentPhone, classId: b.classId,
    }))
    if (!valid.length) throw new BadRequestException('文件中无有效学生数据')
    return this.studentOps.batchCreateStudents(a.schoolId, valid)
  }

  /** 学生文件预览：解析并校验文件，不落库，返回明细（含错误行） */
  @Post('students/import-preview')
  @UseGuards(JwtAuthGuard)
  async importPreview(@Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.studentOps.parseStudentFile(b.filename, b.data)
  }

  /** 学生文件 AI 识别：图片走 OCR、表格转文本，再交给大模型结构化解析 */
  @Post('students/import-ai')
  @UseGuards(JwtAuthGuard)
  async importStudentsAi(@CurrentSchoolAdmin() a: any, @Body() b: { filename?: string; data?: string }) {
    if (!b?.filename || !b?.data) throw new BadRequestException('缺少文件数据')
    return await this.studentOps.aiRecognizeStudents(a.sub, b.filename, b.data)
  }

  // ===== 数据导出 =====

  @Get('export/teachers')
  @UseGuards(JwtAuthGuard)
  async exportTeachers(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const data = await this.teacherSvc.exportTeachers(a.schoolId)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=teachers.csv')
    res.send('\uFEFF' + data)
  }

  @Get('export/students')
  @UseGuards(JwtAuthGuard)
  async exportStudentsCsv(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const data = await this.studentOps.exportStudents(a.schoolId)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv')
    res.send('\uFEFF' + data)
  }

  /* ===== xlsx 二进制导出 ===== */

  @Get('export/teachers-xls')
  @UseGuards(JwtAuthGuard)
  async exportTeachersXls(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const buf = await this.teacherSvc.exportTeachersXls(a.schoolId)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=teachers.xlsx')
    res.send(buf)
  }

  @Get('export/students-xls')
  @UseGuards(JwtAuthGuard)
  async exportStudentsXls(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const buf = await this.studentOps.exportStudentsXls(a.schoolId)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx')
    res.send(buf)
  }

  @Get('export/classes-xls')
  @UseGuards(JwtAuthGuard)
  async exportClassesXls(@CurrentSchoolAdmin() a: any, @Res() res: any) {
    const buf = await this.classSvc.exportClassesXls(a.schoolId)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=classes.xlsx')
    res.send(buf)
  }

  // ===== 全局搜索 =====
  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@CurrentSchoolAdmin() a: any, @Query('q') q?: string) {
    return this.svc.search(a.schoolId, q || '')
  }

  // ===== 校管只读：成绩 / 考试 / 汇总分析（P2）=====

  @Get('academic/exams')
  @UseGuards(JwtAuthGuard)
  listExams(@CurrentSchoolAdmin() a: any, @Query('classId') classId?: string) {
    return this.svc.listSchoolExams(a.schoolId, classId || undefined)
  }

  @Get('academic/grades')
  @UseGuards(JwtAuthGuard)
  listGrades(
    @CurrentSchoolAdmin() a: any,
    @Query('classId') classId?: string,
    @Query('subject') subject?: string,
    @Query('examName') examName?: string,
  ) {
    return this.svc.listSchoolGrades(a.schoolId, classId || undefined, subject || undefined, examName || undefined)
  }

  @Get('academic/summary')
  @UseGuards(JwtAuthGuard)
  gradeSummary(@CurrentSchoolAdmin() a: any, @Query('classId') classId?: string, @Query('examId') examId?: string) {
    return this.svc.schoolGradeSummary(a.schoolId, classId || undefined, examId || undefined)
  }

  /** 校管只读：指定年级下各班成绩横向对比 */
  @Get('academic/class-comparison')
  @UseGuards(JwtAuthGuard)
  gradeClassComparison(
    @CurrentSchoolAdmin() a: any,
    @Query('grade') grade?: string,
    @Query('subject') subject?: string,
    @Query('examName') examName?: string,
  ) {
    return this.svc.gradeClassComparison(a.schoolId, { grade: grade || undefined, subject: subject || undefined, examName: examName || undefined })
  }

  /** 校管只读：指定班级本学期成绩汇总与趋势 */
  @Get('academic/class-trend')
  @UseGuards(JwtAuthGuard)
  classTermTrend(
    @CurrentSchoolAdmin() a: any,
    @Query('classId') classId?: string,
    @Query('subject') subject?: string,
    @Query('term') term?: string,
  ) {
    if (!classId) throw new BadRequestException('classId 必填')
    return this.svc.classTermTrend(a.schoolId, classId, { subject: subject || undefined, term: term || undefined })
  }

  /** 校管只读：本校全部班级作业聚合列表 */
  @Get('homework')
  @UseGuards(JwtAuthGuard)
  listHomework(
    @CurrentSchoolAdmin() a: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('classId') classId?: string,
    @Query('grade') grade?: string,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listSchoolHomework(a.schoolId, {
      skip: Math.max(0, Number(skip) || 0),
      take: clampTake(take, 50),
      classId: classId || undefined,
      grade: grade || undefined,
      subject: subject || undefined,
      status: status || undefined,
    })
  }
}
