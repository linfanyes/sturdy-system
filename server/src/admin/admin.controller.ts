import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AuditService } from '../audit/audit.service'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import { AdminLoginDto } from '../auth/dto/unified-login.dto'
import { CreateSchoolDto, UpdateSchoolDto } from './dto/create-school.dto'
import {
  CreateSchoolAdminDto, UpdateSchoolAdminDto, ToggleEnabledDto,
  ResetPasswordDto, ResetAllDto,
} from './dto/school-admin.dto'

// 超管登录：每分钟最多 6 次
const AdminLoginRateLimit = createRateLimitGuard(60_000, 6)

@Controller('admin')
@Roles('super')
export class AdminController {
  constructor(
    private readonly svc: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Post('login')
  @UseGuards(AdminLoginRateLimit)
  login(@Body() b: AdminLoginDto) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  /* ===== 学校管理（超管维护学校与主键编号） ===== */
  @Get('schools')
  @UseGuards(JwtAuthGuard)
  listSchools(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listSchools(Number(skip) || 0, Number(take) || 100)
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard)
  getSchool(@Param('id') id: string) {
    return this.svc.getSchool(id)
  }

  @Post('schools')
  @UseGuards(JwtAuthGuard)
  createSchool(@Body() b: CreateSchoolDto) { return this.svc.createSchool(b) }

  @Patch('schools/:id')
  @UseGuards(JwtAuthGuard)
  updateSchool(@Param('id') id: string, @Body() b: UpdateSchoolDto) { return this.svc.updateSchool(id, b) }

  @Delete('schools/:id')
  @UseGuards(JwtAuthGuard)
  deleteSchool(@Param('id') id: string) { return this.svc.deleteSchool(id) }

  /* ===== 学校管理员管理（超管只管理学校管理员） ===== */
  @Get('school-admins')
  @UseGuards(JwtAuthGuard)
  listAdmins(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listAdmins(Number(skip) || 0, Number(take) || 100)
  }

  @Post('school-admins')
  @UseGuards(JwtAuthGuard)
  createAdmin(@Body() b: CreateSchoolAdminDto) { return this.svc.createAdmin(b) }

  @Patch('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  updateAdmin(@Param('id') id: string, @Body() b: UpdateSchoolAdminDto) { return this.svc.updateAdmin(id, b) }

  @Patch('school-admins/:id/enabled')
  @UseGuards(JwtAuthGuard)
  toggleEnabled(@Param('id') id: string, @Body() b: ToggleEnabledDto) {
    return this.svc.toggleAdminEnabled(id, b?.enabled !== false)
  }

  @Patch('school-admins/:id/password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@Param('id') id: string, @Body() b: ResetPasswordDto) {
    return this.svc.resetAdminPassword(id, b?.password || '')
  }

  @Delete('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }

  @Post('reset-all')
  @UseGuards(JwtAuthGuard)
  resetAll(@Body() b: ResetAllDto) { return this.svc.resetAll(b?.confirm === true) }

  /* ===== 教师管理（超管可以查看所有教师并清理单个教师数据） ===== */
  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  listTeachers(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listTeachers(Number(skip) || 0, Number(take) || 500)
  }

  @Post('teachers/:id/clear-data')
  @UseGuards(JwtAuthGuard)
  clearTeacherData(@Param('id') id: string) { return this.svc.clearTeacherData(id) }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  auditLogs(@Query('schoolId') schoolId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.audit.list(schoolId, Number(skip) || 0, Number(take) || 100)
  }
}
