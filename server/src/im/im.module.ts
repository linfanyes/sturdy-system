import {
  Module,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import crypto from 'node:crypto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { AppConfig } from '../config/app-config.entity'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { ClassItem } from '../classes/class.entity'

/**
 * 腾讯云 IM（体验版免费）：家校沟通。
 * 本模块只负责生成 UserSig（服务端签名），以及把「真实学生—家长关系」映射成 IM 账号，
 * 让教师端的家校沟通能从真实花名册发起会话、一键建全班群（群号落库）。
 * 未配置 SDKAppID/密钥时返回空签名，前端自动进入演示模式。
 */

/** 由（学生ID + 关系 + 家长姓名）稳定派生一个 ASCII IM 账号（≤32 字符，保证唯一且可复现） */
function parentImUserId(p: { studentId: string; relation: string; parentName: string }): string {
  const raw = `${p.studentId}|${p.relation}|${p.parentName}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) >>> 0
  return 'p_' + h.toString(36)
}

@Injectable()
export class ImService {
  constructor(
    @InjectRepository(AppConfig) private readonly appRepo: Repository<AppConfig>,
    @InjectRepository(ParentContact) private readonly pcRepo: Repository<ParentContact>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
  ) {}

  private async cfg() {
    const [a, k] = await Promise.all([
      this.appRepo.findOne({ where: { key: 'imSdkAppId' } }),
      this.appRepo.findOne({ where: { key: 'imSecretKey' } }),
    ])
    return { sdkAppId: a?.value || '', secretKey: k?.value || '' }
  }

  /** 生成腾讯云 IM UserSig（标准 TLS 签名，HMAC-SHA256） */
  async getUserSig(userId: string): Promise<{ sdkAppId: string; userSig: string }> {
    const { sdkAppId, secretKey } = await this.cfg()
    const appid = parseInt(sdkAppId || '0', 10)
    if (!appid || !secretKey) return { sdkAppId: sdkAppId || '', userSig: '' }
    const time = Math.floor(Date.now() / 1000)
    const expire = 86400 * 7
    const content =
      `TLS.identifier:${userId}\n` +
      `TLS.sdkappid:${appid}\n` +
      `TLS.time:${time}\n` +
      `TLS.expire:${time + expire}\n`
    const hmac = crypto.createHmac('sha256', secretKey).update(content).digest('base64')
    const content2 = content + `TLS.sig:${hmac}\nTLS.sigver:2.0\nTLS.ver:2.0\n`
    const raw = Buffer.from(content2).toString('base64')
    return { sdkAppId: String(appid), userSig: encodeURIComponent(raw) }
  }

  /**
   * 家长花名册：把 parent_contacts（家校联系日志，一条记录=一次联系事件）按
   * （studentId + relation + parentName）归并成唯一家长，并派生稳定 IM 账号。
   * 仅返回当前教师有权访问的班级家长；指定 classId 时校验归属。
   */
  async getParentRoster(
    teacherId: string,
    classId?: string,
  ): Promise<
    Array<{
      imUserId: string
      studentId: string
      studentName: string
      classId: string
      parentName: string
      relation: string
      phone: string
      wechat: string
    }>
  > {
    if (classId) {
      const cls = await this.classRepo.findOne({ where: { id: classId, teacherId } })
      if (!cls) return []
    }
    const where: any = { teacherId }
    if (classId) where.classId = classId
    const contacts = await this.pcRepo.find({ where, order: { createdAt: 'DESC' } })
    const map = new Map<string, any>()
    for (const c of contacts) {
      const key = `${c.studentId}|${c.relation}|${c.parentName}`
      if (!map.has(key)) {
        map.set(key, {
          imUserId: parentImUserId(c),
          studentId: c.studentId,
          studentName: c.studentName,
          classId: c.classId,
          parentName: c.parentName,
          relation: c.relation,
          phone: c.phone,
          wechat: c.wechat,
        })
      }
    }
    return Array.from(map.values())
  }

  /** 班级群号落库（教师需是该班班主任/任课） */
  async setClassGroup(teacherId: string, classId: string, groupId: string) {
    const cls = await this.classRepo.findOne({ where: { id: classId, teacherId } })
    if (!cls) throw new NotFoundException('班级不存在或无权访问')
    cls.imGroupId = groupId || ''
    return this.classRepo.save(cls)
  }
}

@Controller('im')
export class ImController {
  constructor(private readonly im: ImService) {}

  /** 获取 UserSig：userId 缺省使用当前教师 ID */
  @Post('user-sig')
  @UseGuards(JwtAuthGuard)
  userSig(@Body() b: { userId?: string }, @CurrentTeacher() t: any) {
    const userId = (b && b.userId) || (t && t.sub) || 'teacher'
    return this.im.getUserSig(userId)
  }

  /** 家长花名册（按 classId 过滤，仅当前教师可见） */
  @Get('parents')
  @UseGuards(JwtAuthGuard)
  parents(@Query('classId') classId: string, @CurrentTeacher() t: any) {
    return this.im.getParentRoster(t.sub, classId)
  }

  /** 班级群号落库 */
  @Post('class-group')
  @UseGuards(JwtAuthGuard)
  classGroup(@Body() b: { classId?: string; groupId?: string }, @CurrentTeacher() t: any) {
    if (!b || !b.classId) throw new BadRequestException('classId 必填')
    return this.im.setClassGroup(t.sub, b.classId, b.groupId || '')
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig, ParentContact, ClassItem])],
  providers: [ImService],
  controllers: [ImController],
  exports: [ImService],
})
export class ImModule {}
