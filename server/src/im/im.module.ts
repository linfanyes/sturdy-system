import { Module, Injectable, Controller, Post, Body, UseGuards } from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import crypto from 'node:crypto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AppConfig } from '../config/app-config.entity'

/**
 * 腾讯云 IM（体验版免费）：家校沟通。
 * 本模块只负责生成 UserSig（服务端签名），前端（tim-wx-sdk）凭 UserSig 登录 IM。
 * 未配置 SDKAppID/密钥时返回空签名，前端自动进入演示模式。
 */
@Injectable()
export class ImService {
  constructor(
    @InjectRepository(AppConfig) private readonly appRepo: Repository<AppConfig>,
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
}

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  providers: [ImService],
  controllers: [ImController],
  exports: [ImService],
})
export class ImModule {}
