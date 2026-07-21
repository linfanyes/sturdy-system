import { Module, Injectable, Controller, Post, Body, UseGuards } from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import https from 'node:https'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AppConfig } from '../config/app-config.entity'

// 微信接口在 TLS 拦截环境下可能报 self-signed，单独放宽证书校验
const tlsAgent = new https.Agent({ rejectUnauthorized: false })

/**
 * 微信内容安全：文本/图片违规检测。
 * 微信内容安全为免费额度能力（小程序合规必需），未配置 AppSecret 时放行，不阻塞业务。
 */
@Injectable()
export class SecurityService {
  private tokenCache: { token: string; exp: number } | null = null

  constructor(
    @InjectRepository(AppConfig) private readonly appRepo: Repository<AppConfig>,
  ) {}

  private async getCfg() {
    const [idRow, secRow] = await Promise.all([
      this.appRepo.findOne({ where: { key: 'wxAppId' } }),
      this.appRepo.findOne({ where: { key: 'wxAppSecret' } }),
    ])
    return { appId: idRow?.value || '', secret: secRow?.value || '' }
  }

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now()
    if (this.tokenCache && this.tokenCache.exp > now + 60000) return this.tokenCache.token
    const { appId, secret } = await this.getCfg()
    if (!appId || !secret) return null
    try {
      const r = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: { grant_type: 'client_credential', appid: appId, secret },
        httpsAgent: tlsAgent,
        timeout: 10000,
      })
      if (r.data?.access_token) {
        this.tokenCache = {
          token: r.data.access_token,
          exp: now + (r.data.expires_in || 7200) * 1000,
        }
        return r.data.access_token
      }
    } catch {
      /* 获取失败视为未配置，放行 */
    }
    return null
  }

  /** 文本安全审核；未配置 AppSecret 或接口异常时放行 */
  async msgSecCheck(content: string): Promise<{ pass: boolean; reason?: string }> {
    if (!content || !content.trim()) return { pass: true }
    const token = await this.getAccessToken()
    if (!token) return { pass: true }
    try {
      const r = await axios.post(
        `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
        { content: content.slice(0, 2000) },
        { headers: { 'Content-Type': 'application/json' }, httpsAgent: tlsAgent, timeout: 10000 },
      )
      if (r.data?.errcode === 0) return { pass: true }
      if (r.data?.errcode === 87014) return { pass: false, reason: r.data?.errmsg || '内容疑似违规' }
      return { pass: true }
    } catch {
      return { pass: true }
    }
  }

  /** 图片安全审核；未配置 AppSecret 或接口异常时放行 */
  async imgSecCheck(base64: string): Promise<{ pass: boolean; reason?: string }> {
    if (!base64) return { pass: true }
    const token = await this.getAccessToken()
    if (!token) return { pass: true }
    try {
      const buf = Buffer.from(base64, 'base64')
      const FormData = (globalThis as any).FormData
      const fd = new FormData()
      fd.append('media', new Blob([buf], { type: 'image/png' }), 'img.png')
      const r = await axios.post(
        `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${token}`,
        fd,
        { httpsAgent: tlsAgent, timeout: 15000 },
      )
      if (r.data?.errcode === 0) return { pass: true }
      if (r.data?.errcode === 87014) return { pass: false, reason: r.data?.errmsg || '图片疑似违规' }
      return { pass: true }
    } catch {
      return { pass: true }
    }
  }
}

@Controller('security')
export class SecurityController {
  constructor(private readonly sec: SecurityService) {}

  /** 文本安全审核 */
  @Post('msg-check')
  @UseGuards(JwtAuthGuard)
  msgCheck(@Body() b: { content?: string }, @CurrentTeacher() t: any) {
    return this.sec.msgSecCheck(b?.content || '')
  }

  /** 图片安全审核（image 为 base64，不含 data: 前缀） */
  @Post('img-check')
  @UseGuards(JwtAuthGuard)
  imgCheck(@Body() b: { image?: string }, @CurrentTeacher() t: any) {
    return this.sec.imgSecCheck(b?.image || '')
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  providers: [SecurityService],
  controllers: [SecurityController],
  exports: [SecurityService],
})
export class SecurityModule {}
