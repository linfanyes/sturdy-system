import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common'
import { SchoolAdminService } from './school-admin.service'
import { SchoolAdminGuard } from './school-admin.guard'
import { CurrentSchoolAdmin } from './current-school-admin.decorator'

@Controller('school-admin')
export class SchoolAdminController {
  constructor(private readonly svc: SchoolAdminService) {}

  @Post('login')
  login(@Body() b: { username?: string; password?: string }) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  @Get('dashboard')
  @UseGuards(SchoolAdminGuard)
  dashboard(@CurrentSchoolAdmin() a: any) { return this.svc.dashboard(a.schoolId) }

  @Get('teachers')
  @UseGuards(SchoolAdminGuard)
  listTeachers(@CurrentSchoolAdmin() a: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listTeachers(a.schoolId, Number(skip) || 0, Number(take) || 200)
  }

  @Post('teachers')
  @UseGuards(SchoolAdminGuard)
  createTeacher(@CurrentSchoolAdmin() a: any, @Body() b: any) { return this.svc.createTeacher(a.schoolId, b) }

  @Patch('teachers/:id')
  @UseGuards(SchoolAdminGuard)
  updateTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateTeacher(a.schoolId, id, b)
  }

  @Patch('teachers/:id/features')
  @UseGuards(SchoolAdminGuard)
  updateFeatures(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: { features?: string[] }) {
    return this.svc.updateTeacherFeatures(a.schoolId, id, b?.features || [])
  }

  @Post('teachers/:id/reset-password')
  @UseGuards(SchoolAdminGuard)
  resetPassword(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.resetPassword(a.schoolId, id, b?.password || '')
  }

  @Delete('teachers/:id')
  @UseGuards(SchoolAdminGuard)
  deleteTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string) { return this.svc.deleteTeacher(a.schoolId, id) }

  @Get('parent-logins')
  @UseGuards(SchoolAdminGuard)
  parentLogins(@CurrentSchoolAdmin() a: any) { return this.svc.listParentLogins(a.schoolId) }
}
