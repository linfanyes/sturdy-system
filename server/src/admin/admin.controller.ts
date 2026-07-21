import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { SuperAdminGuard } from './super-admin.guard'

@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Post('login')
  login(@Body() b: { username?: string; password?: string }) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  /* ===== 学校管理（超管维护学校与主键编号） ===== */
  @Get('schools')
  @UseGuards(SuperAdminGuard)
  listSchools() { return this.svc.listSchools() }

  @Post('schools')
  @UseGuards(SuperAdminGuard)
  createSchool(@Body() b: any) { return this.svc.createSchool(b) }

  @Patch('schools/:id')
  @UseGuards(SuperAdminGuard)
  updateSchool(@Param('id') id: string, @Body() b: any) { return this.svc.updateSchool(id, b) }

  @Delete('schools/:id')
  @UseGuards(SuperAdminGuard)
  deleteSchool(@Param('id') id: string) { return this.svc.deleteSchool(id) }

  /* ===== 学校管理员管理（超管只管理学校管理员） ===== */
  @Get('school-admins')
  @UseGuards(SuperAdminGuard)
  listAdmins() { return this.svc.listAdmins() }

  @Post('school-admins')
  @UseGuards(SuperAdminGuard)
  createAdmin(@Body() b: any) { return this.svc.createAdmin(b) }

  @Patch('school-admins/:id')
  @UseGuards(SuperAdminGuard)
  updateAdmin(@Param('id') id: string, @Body() b: any) { return this.svc.updateAdmin(id, b) }

  @Patch('school-admins/:id/enabled')
  @UseGuards(SuperAdminGuard)
  toggleEnabled(@Param('id') id: string, @Body() b: { enabled?: boolean }) {
    return this.svc.toggleAdminEnabled(id, b?.enabled !== false)
  }

  @Patch('school-admins/:id/password')
  @UseGuards(SuperAdminGuard)
  resetPassword(@Param('id') id: string, @Body() b: { password?: string }) {
    return this.svc.resetAdminPassword(id, b?.password || '')
  }

  @Delete('school-admins/:id')
  @UseGuards(SuperAdminGuard)
  deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }
}
