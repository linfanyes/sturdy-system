import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentSchoolAdmin } from '../school-admin/current-school-admin.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { TextbookService } from './textbook.service'

/**
 * 校管教材管理：CRUD 教材/单元/知识点 + AI 批量生成
 * 路由前缀 /school-admin/textbooks
 */
@Controller('school-admin/textbooks')
@Roles('school_admin')
export class SchoolAdminTextbookController {
  constructor(private readonly svc: TextbookService) {}

  // ---- 教材 ----
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentSchoolAdmin() a: any, @Query('subject') subject?: string, @Query('grade') grade?: string, @Query('term') term?: string) {
    return this.svc.listTextbooks(a.schoolId, { subject, grade, term })
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createTextbook(a.schoolId, b)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateTextbook(a.schoolId, id, b)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteTextbook(a.schoolId, id)
  }

  // ---- 单元 ----
  @Get(':id/units')
  @UseGuards(JwtAuthGuard)
  listUnits(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.listUnits(a.schoolId, id)
  }

  @Post('units')
  @UseGuards(JwtAuthGuard)
  createUnit(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createUnit(a.schoolId, b)
  }

  @Patch('units/:id')
  @UseGuards(JwtAuthGuard)
  updateUnit(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateUnit(a.schoolId, id, b)
  }

  @Delete('units/:id')
  @UseGuards(JwtAuthGuard)
  removeUnit(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteUnit(a.schoolId, id)
  }

  // ---- 知识点 ----
  @Get('units/:unitId/points')
  @UseGuards(JwtAuthGuard)
  listPoints(@CurrentSchoolAdmin() a: any, @Param('unitId') unitId: string) {
    return this.svc.listKnowledgePoints(a.schoolId, unitId)
  }

  @Post('points')
  @UseGuards(JwtAuthGuard)
  createPoint(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.createKnowledgePoint(a.schoolId, b)
  }

  @Patch('points/:id')
  @UseGuards(JwtAuthGuard)
  updatePoint(@CurrentSchoolAdmin() a: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateKnowledgePoint(a.schoolId, id, b)
  }

  @Delete('points/:id')
  @UseGuards(JwtAuthGuard)
  removePoint(@CurrentSchoolAdmin() a: any, @Param('id') id: string) {
    return this.svc.deleteKnowledgePoint(a.schoolId, id)
  }

  // ---- AI 批量生成 ----
  @Post('ai-generate')
  @UseGuards(JwtAuthGuard)
  generate(@CurrentSchoolAdmin() a: any, @Body() b: any) {
    return this.svc.generateByAi(a.schoolId, b)
  }

  // ---- 一键初始化预置教材（32本：人教版语文/数学 + 外研版英语） ----
  @Post('seed-defaults')
  @UseGuards(JwtAuthGuard)
  seedDefaults(@CurrentSchoolAdmin() a: any) {
    return this.svc.seedDefaults(a.schoolId)
  }
}

/**
 * 教师/家长只读查询：教材树 + 知识点检索
 * 路由前缀 /textbooks
 */
@Controller('textbooks')
@Roles('teacher', 'parent')
export class TextbookController {
  constructor(private readonly svc: TextbookService) {}

  /** 教材树（教师：按 JWT schoolId；家长：按孩子反查 schoolId） */
  @Get('tree')
  @UseGuards(JwtAuthGuard)
  async tree(
    @CurrentTeacher() user: any,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('term') term?: string,
    @Query('textbookId') textbookId?: string,
  ) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.getTextbookTree(schoolId, { subject, grade, term, textbookId })
  }

  /** 关键词检索知识点 */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@CurrentTeacher() user: any, @Query('keyword') keyword?: string) {
    const schoolId = await this.resolveSchoolId(user)
    return this.svc.searchKnowledgePoints(schoolId, keyword || '')
  }

  /** 统一解析 schoolId：教师/校管直接取 JWT；家长通过 studentId 反查 */
  private async resolveSchoolId(user: any): Promise<string> {
    if (user?.role === 'parent') {
      return this.svc.resolveSchoolIdByStudent(user?.studentId || '')
    }
    return this.svc.fromJwtSchoolId(user)
  }

  // ============ 学科组长编辑接口（教师身份，基于 position 权限） ============

  /** 学科组长编辑教材基础信息 */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async editTextbook(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdateTextbook(user, id, b)
  }

  /** 学科组长新增单元 */
  @Post('units')
  @UseGuards(JwtAuthGuard)
  async createUnit(@CurrentTeacher() user: any, @Body() b: any) {
    return this.svc.teacherCreateUnit(user, b)
  }

  /** 学科组长编辑单元 */
  @Patch('units/:id')
  @UseGuards(JwtAuthGuard)
  async editUnit(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdateUnit(user, id, b)
  }

  /** 学科组长新增知识点 */
  @Post('points')
  @UseGuards(JwtAuthGuard)
  async createPoint(@CurrentTeacher() user: any, @Body() b: any) {
    return this.svc.teacherCreatePoint(user, b)
  }

  /** 学科组长编辑知识点 */
  @Patch('points/:id')
  @UseGuards(JwtAuthGuard)
  async editPoint(@CurrentTeacher() user: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.teacherUpdatePoint(user, id, b)
  }
}
