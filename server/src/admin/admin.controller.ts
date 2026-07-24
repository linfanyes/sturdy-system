import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AuditService } from '../audit/audit.service'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import { AdminLoginDto } from '../auth/dto/unified-login.dto'

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

  @Post('schools')
  @UseGuards(JwtAuthGuard)
  createSchool(@Body() b: any) { return this.svc.createSchool(b) }

  @Patch('schools/:id')
  @UseGuards(JwtAuthGuard)
  updateSchool(@Param('id') id: string, @Body() b: any) { return this.svc.updateSchool(id, b) }

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
  createAdmin(@Body() b: any) { return this.svc.createAdmin(b) }

  @Patch('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  updateAdmin(@Param('id') id: string, @Body() b: any) { return this.svc.updateAdmin(id, b) }

  @Patch('school-admins/:id/enabled')
  @UseGuards(JwtAuthGuard)
  toggleEnabled(@Param('id') id: string, @Body() b: { enabled?: boolean }) {
    return this.svc.toggleAdminEnabled(id, b?.enabled !== false)
  }

  @Patch('school-admins/:id/password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@Param('id') id: string, @Body() b: { password?: string }) {
    return this.svc.resetAdminPassword(id, b?.password || '')
  }

  @Delete('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }

  @Post('reset-all')
  @UseGuards(JwtAuthGuard)
  resetAll(@Body() b: { confirm?: boolean }) { return this.svc.resetAll(b?.confirm === true) }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  auditLogs(@Query('schoolId') schoolId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.audit.list(schoolId, Number(skip) || 0, Number(take) || 100)
  }
}
