import { Module, Injectable, Controller, Post, Body, UseGuards } from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import https from 'node:https'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AppConfig } from '../config/app-config.entity'

// 微信接口在 TLS 拦截环境下可能报 self-signed，单独放宽证书校验
const tlsAgent = new https.Agent({ rejectUnauthorized: false })

/**
 * 微信内容安全：文本/图片违规检测 + 订阅消息推送。
 * 微信内容安全/订阅消息均为免费额度能力（小程序合规必需），未配置 AppSecret 时静默放行。
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

  /**
   * 发送微信订阅消息（免费）
   * 未配置 credentials 时静默跳过，不阻塞业务。
   */
  async sendSubscribe(openIds: string[], templateId: string, page: string, data: Record<string, { value: string }>): Promise<{ sent: number; total: number }> {
    const token = await this.getAccessToken()
    if (!token) return { sent: 0, total: openIds.length }
    let sent = 0
    for (const openId of openIds) {
      try {
        await axios.post(
          `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
          { touser: openId, template_id: templateId, page, data },
          { httpsAgent: tlsAgent, timeout: 8000 },
        )
        sent++
      } catch {
        // 单个发送失败不中断
      }
    }
    return { sent, total: openIds.length }
  }

  /** 推送通知给已订阅的家长 */
  async pushNotice(notice: { title: string; content?: string }, parentOpenIds: string[]) {
    return this.sendSubscribe(
      parentOpenIds,
      'NOTICE_TEMPLATE_ID', // 替换为微信公众平台申请的真实模板 ID
      'pages/parent/parent',
      {
        thing1: { value: notice.title?.slice(0, 20) || '班级通知' },
        thing2: { value: (notice.content || '').slice(0, 40) || '查看详情' },
      },
    )
  }

  /** 推送作业提醒给已订阅的家长 */
  async pushHomework(hw: { subject: string; title: string; content?: string }, parentOpenIds: string[]) {
    return this.sendSubscribe(
      parentOpenIds,
      'HOMEWORK_TEMPLATE_ID', // 替换为真实模板 ID
      'pages/parent/parent',
      {
        thing1: { value: (hw.subject || '') + ' · ' + (hw.title || '').slice(0, 10) },
        thing2: { value: (hw.content || '').slice(0, 40) || '请查看作业详情' },
      },
    )
  }
}

@Controller('security')
export class SecurityController {
  constructor(private readonly sec: SecurityService) {}

  /** 文本安全审核（教师+家长共用） */
  @Roles('teacher', 'parent')
  @Post('msg-check')
  @UseGuards(JwtAuthGuard)
  msgCheck(@Body() b: { content?: string }, @CurrentTeacher() t: any) {
    return this.sec.msgSecCheck(b?.content || '')
  }

  /** 图片安全审核（教师+家长共用） */
  @Roles('teacher', 'parent')
  @Post('img-check')
  @UseGuards(JwtAuthGuard)
  imgCheck(@Body() b: { image?: string }, @CurrentTeacher() t: any) {
    return this.sec.imgSecCheck(b?.image || '')
  }

  /** 手动触发通知推送 */
  @Roles('teacher')
  @Post('push-notice')
  @UseGuards(JwtAuthGuard)
  async pushNotice(@Body() b: { openIds: string[]; title: string; content?: string }) {
    return this.sec.pushNotice({ title: b.title, content: b.content }, b.openIds || [])
  }

  /** 手动触发作业推送 */
  @Roles('teacher')
  @Post('push-homework')
  @UseGuards(JwtAuthGuard)
  async pushHomework(@Body() b: { openIds: string[]; subject: string; title: string; content?: string }) {
    return this.sec.pushHomework({ subject: b.subject, title: b.title, content: b.content }, b.openIds || [])
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  providers: [SecurityService],
  controllers: [SecurityController],
  exports: [SecurityService],
})
export class SecurityModule {}
