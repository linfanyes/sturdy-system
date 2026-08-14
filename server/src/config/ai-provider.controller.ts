import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common'
import { AiProviderService } from './ai-provider.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'

/** 剔除不应暴露给客户端的内部字段（租户键/主键/时间戳） */
function stripInternal(p: any): any {
  if (!p || typeof p !== 'object') return p
  const { id, teacherId, createdAt, updatedAt, isDeleted, ...rest } = p
  return rest
}

@Controller('ai-providers')
export class AiProviderController {
  constructor(private readonly svc: AiProviderService) {}

  // 任意已登录用户均可查看（教师端配置时需选择服务商）——仅返回业务字段，不外泄内部租户键/时间戳
  @Get()
  @UseGuards(JwtAuthGuard)
  async list() {
    const all = await this.svc.list()
    return (all || []).map(stripInternal)
  }

  // 仅超管可增删改
  @Roles('super')
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: any) {
    this.assertWritable(dto)
    return this.svc.create(this.stripUnsafe(dto))
  }

  @Roles('super')
  @Patch(':code')
  @UseGuards(JwtAuthGuard)
  update(@Param('code') code: string, @Body() dto: any) {
    this.assertWritable(dto)
    return this.svc.update(code, this.stripUnsafe(dto))
  }

  @Roles('super')
  @Delete(':code')
  @UseGuards(JwtAuthGuard)
  remove(@Param('code') code: string) {
    return this.svc.remove(code)
  }

  /** 基础字段校验：必填 code/name，模型数组须为数组 */
  private assertWritable(dto: any) {
    if (!dto || typeof dto !== 'object') throw new BadRequestException('请求体格式不正确')
    for (const f of ['code', 'name']) {
      if (dto[f] === undefined || dto[f] === null || String(dto[f]).trim() === '') {
        throw new BadRequestException('code 和 name 必填')
      }
    }
    for (const f of ['textModels', 'visionModels', 'imageModels', 'videoModels']) {
      if (dto[f] !== undefined && !Array.isArray(dto[f])) {
        throw new BadRequestException(`${f} 必须为数组`)
      }
    }
  }

  /** 剔除不可由客户端写入的内部字段，防批量赋值 */
  private stripUnsafe(dto: any): any {
    const out: any = { ...dto }
    for (const k of ['id', 'teacherId', 'createdAt', 'updatedAt', 'isDeleted']) delete out[k]
    return out
  }
}
