import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common'
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

  @Get('teachers')
  @UseGuards(SchoolAdminGuard)
  listTeachers(@CurrentSchoolAdmin() a: any) {
    return this.svc.listTeachers(a.schoolId)
  }

  @Post('teachers')
  @UseGuards(SchoolAdminGuard)
  createTeacher(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createTeacher(a.schoolId, b)
  }

  @Post('teachers/:id/reset-password')
  @UseGuards(SchoolAdminGuard)
  resetPassword(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.resetPassword(a.schoolId, id, b?.password || '')
  }

  @Delete('teachers/:id')
  @UseGuards(SchoolAdminGuard)
  deleteTeacher(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteTeacher(a.schoolId, id)
  }

  @Get('stats')
  @UseGuards(SchoolAdminGuard)
  stats(@CurrentSchoolAdmin() a: any) {
    return this.svc.stats(a.schoolId)
  }
}
