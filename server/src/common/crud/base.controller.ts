import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { CurrentTeacher } from '../decorators/current-teacher.decorator'
import { CrudService } from './base.service'

/**
 * 通用 CRUD 控制器基类。子类用 @Controller('path') 标注路径并继承即可。
 * 所有写操作自动注入当前教师的 teacherId（来自 JWT）。
 * GET / 支持可选 ?classId= 服务端过滤（实体有 classId 字段时生效，不传则返回全部）。
 */
@UseGuards(JwtAuthGuard)
export class CrudController<T extends { id: string; teacherId: string }> {
  constructor(protected readonly service: CrudService<T>) {}

  @Post()
  create(@Body() dto: any, @CurrentTeacher() t: any) {
    return this.service.create(t.sub, dto)
  }

  @Get()
  findAll(@CurrentTeacher() t: any, @Query('classId') classId?: string) {
    return this.service.findAll(t.sub, classId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.service.findOne(id, t.sub)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentTeacher() t: any) {
    return this.service.update(id, t.sub, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.service.remove(id, t.sub)
  }
}
