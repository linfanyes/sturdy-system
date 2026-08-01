import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentSchoolAdmin } from '../school-admin/current-school-admin.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ResourceLibraryService } from './resource-library.service'

/**
 * 校管资源库管理：CRUD + 一键初始化
 * 路由前缀 /school-admin/resource-library
 */
@Controller('school-admin/resource-library')
@Roles('school_admin')
export class SchoolAdminResourceLibraryController {
  constructor(private readonly svc: ResourceLibraryService) {}

  // ---- 一键初始化 ----
  @Post('seed-defaults')
  @UseGuards(JwtAuthGuard)
  async seedDefaults(@CurrentSchoolAdmin() a: any) {
    return this.svc.seedDefaults(a.schoolId)
  }

  // ---- 古诗词 ----
  @Get('poems')
  @UseGuards(JwtAuthGuard)
  listPoems(@CurrentSchoolAdmin() a: any, @Query('grade') grade?: string, @Query('dynasty') dynasty?: string, @Query('keyword') keyword?: string) {
    return this.svc.listPoems(a.schoolId, { grade, dynasty, keyword })
  }
  @Post('poems')
  @UseGuards(JwtAuthGuard)
  createPoem(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createPoem(a.schoolId, b)
  }
  @Patch('poems/:id')
  @UseGuards(JwtAuthGuard)
  updatePoem(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updatePoem(a.schoolId, id, b)
  }
  @Delete('poems/:id')
  @UseGuards(JwtAuthGuard)
  deletePoem(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deletePoem(a.schoolId, id)
  }

  // ---- 数学公式 ----
  @Get('formulas')
  @UseGuards(JwtAuthGuard)
  listFormulas(@CurrentSchoolAdmin() a: any, @Query('grade') grade?: string, @Query('category') category?: string, @Query('keyword') keyword?: string) {
    return this.svc.listFormulas(a.schoolId, { grade, category, keyword })
  }
  @Post('formulas')
  @UseGuards(JwtAuthGuard)
  createFormula(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createFormula(a.schoolId, b)
  }
  @Patch('formulas/:id')
  @UseGuards(JwtAuthGuard)
  updateFormula(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateFormula(a.schoolId, id, b)
  }
  @Delete('formulas/:id')
  @UseGuards(JwtAuthGuard)
  deleteFormula(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteFormula(a.schoolId, id)
  }

  // ---- 英语单词 ----
  @Get('words')
  @UseGuards(JwtAuthGuard)
  listWords(@CurrentSchoolAdmin() a: any, @Query('grade') grade?: string, @Query('category') category?: string, @Query('keyword') keyword?: string) {
    return this.svc.listWords(a.schoolId, { grade, category, keyword })
  }
  @Get('words/categories')
  @UseGuards(JwtAuthGuard)
  wordCategories(@CurrentSchoolAdmin() a: any) {
    return this.svc.listWordCategories(a.schoolId)
  }
  @Post('words')
  @UseGuards(JwtAuthGuard)
  createWord(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createWord(a.schoolId, b)
  }
  @Patch('words/:id')
  @UseGuards(JwtAuthGuard)
  updateWord(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateWord(a.schoolId, id, b)
  }
  @Delete('words/:id')
  @UseGuards(JwtAuthGuard)
  deleteWord(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteWord(a.schoolId, id)
  }
}

/**
 * 教师/家长只读查询 + 学科组长编辑
 * 路由前缀 /resource-library
 */
@Controller('resource-library')
@Roles('teacher', 'parent')
export class ResourceLibraryController {
  constructor(private readonly svc: ResourceLibraryService) {}

  /** 统一解析 schoolId */
  private async resolveSchoolId(user: any): Promise<string> {
    if (user?.role === 'parent') {
      return this.svc.resolveSchoolIdByStudent(user?.studentId || '')
    }
    return this.svc.fromJwtSchoolId(user)
  }

  // ---- 古诗词 ----
  @Get('poems')
  @UseGuards(JwtAuthGuard)
  async listPoems(@CurrentTeacher() user: any, @Query('grade') grade?: string, @Query('dynasty') dynasty?: string, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.listPoems(schoolId, { grade, dynasty, keyword })
  }
  @Get('poems/search')
  @UseGuards(JwtAuthGuard)
  async searchPoems(@CurrentTeacher() user: any, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.searchPoems(schoolId, keyword || '')
  }

  // ---- 数学公式 ----
  @Get('formulas')
  @UseGuards(JwtAuthGuard)
  async listFormulas(@CurrentTeacher() user: any, @Query('grade') grade?: string, @Query('category') category?: string, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.listFormulas(schoolId, { grade, category, keyword })
  }
  @Get('formulas/search')
  @UseGuards(JwtAuthGuard)
  async searchFormulas(@CurrentTeacher() user: any, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.searchFormulas(schoolId, keyword || '')
  }

  // ---- 英语单词 ----
  @Get('words')
  @UseGuards(JwtAuthGuard)
  async listWords(@CurrentTeacher() user: any, @Query('grade') grade?: string, @Query('category') category?: string, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.listWords(schoolId, { grade, category, keyword })
  }
  @Get('words/categories')
  @UseGuards(JwtAuthGuard)
  async wordCategories(@CurrentTeacher() user: any) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.listWordCategories(schoolId)
  }
  @Get('words/search')
  @UseGuards(JwtAuthGuard)
  async searchWords(@CurrentTeacher() user: any, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.searchWords(schoolId, keyword || '')
  }

  // ============ 学科组长编辑接口 ============

  @Patch('poems/:id')
  @UseGuards(JwtAuthGuard)
  async editPoem(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdatePoem(user, id, b)
  }

  @Patch('formulas/:id')
  @UseGuards(JwtAuthGuard)
  async editFormula(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdateFormula(user, id, b)
  }

  @Patch('words/:id')
  @UseGuards(JwtAuthGuard)
  async editWord(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdateWord(user, id, b)
  }
}
