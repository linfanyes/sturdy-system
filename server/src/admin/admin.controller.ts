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

  /* ===== 学校 CRUD ===== */
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

  /* ===== 学校管理员 CRUD ===== */
  @Get('school-admins')
  @UseGuards(SuperAdminGuard)
  listAdmins(@Body() b?: { schoolId?: string }) { return this.svc.listAdmins(b?.schoolId) }

  @Post('school-admins')
  @UseGuards(SuperAdminGuard)
  createAdmin(@Body() b: any) { return this.svc.createAdmin(b) }

  @Delete('school-admins/:id')
  @UseGuards(SuperAdminGuard)
  deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }

  /* ===== 教师总览 ===== */
  @Get('teachers')
  @UseGuards(SuperAdminGuard)
  listTeachers(@Body() b?: { schoolId?: string }) { return this.svc.listTeachers(b?.schoolId) }

  @Delete('users/:id')
  @UseGuards(SuperAdminGuard)
  deleteUser(@Param('id') id: string) { return this.svc.deleteUser(id) }

  @Patch('users/:id/features')
  @UseGuards(SuperAdminGuard)
  updateFeatures(@Param('id') id: string, @Body() b: { features?: string[] }) {
    return this.svc.updateUserFeatures(id, b?.features || [])
  }
}
