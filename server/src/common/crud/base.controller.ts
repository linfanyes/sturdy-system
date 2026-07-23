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
import { Roles } from '../decorators/roles.decorator'
import { CurrentTeacher } from '../decorators/current-teacher.decorator'
import { CrudService } from './base.service'

/**
 * 分页上限：客户端传的 take 超过此值时被截断（防止恶意大查询拖垮数据库）。
 */
const MAX_TAKE = 500

function clampTake(take?: string): number {
  const v = Number(take) || MAX_TAKE
  return Math.min(v, MAX_TAKE)
}

/**
 * 剔除客户端不应自行写入的字段（租户键/主键/角色/时间戳等），
 * 防止越权批量赋值（mass assignment）。teacherId 仍由服务端从 JWT 注入。
 */
const UNSAFE_KEYS = new Set(['teacherId', 'id', 'role', 'createdAt', 'updatedAt', 'isDeleted'])
function stripUnsafe(dto: any): any {
  if (!dto || typeof dto !== 'object') return dto
  const out: any = {}
  for (const k of Object.keys(dto)) {
    if (UNSAFE_KEYS.has(k)) continue
    out[k] = dto[k]
  }
  return out
}

/**
 * 通用 CRUD 控制器基类。子类用 @Controller('path') 标注路径并继承即可。
 * 所有写操作自动注入当前教师的 teacherId（来自 JWT）。
 * GET / 支持可选 ?classId= 服务端过滤（实体有 classId 字段时生效，不传则返回全部）。
 */
@Roles('teacher')
@UseGuards(JwtAuthGuard)
export class CrudController<T extends { id: string; teacherId: string }> {
  constructor(protected readonly service: CrudService<T>) {}

  @Post()
  create(@Body() dto: any, @CurrentTeacher() t: any) {
    return this.service.create(t.sub, stripUnsafe(dto))
  }

  @Get()
  findAll(@CurrentTeacher() t: any, @Query('classId') classId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.findAll(t.sub, classId, Number(skip) || 0, clampTake(take))
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.service.findOne(id, t.sub)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentTeacher() t: any) {
    return this.service.update(id, t.sub, stripUnsafe(dto))
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.service.remove(id, t.sub)
  }
}
