import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import https from 'node:https'

// 默认严格校验微信服务器证书（防 MITM 窃取 openid / session_key）。
// 仅当显式设置环境变量 WECHAT_TLS_INSECURE=true（如已知 VPC 内存在 TLS 拦截代理）时才放宽校验。
const wechatTlsInsecure = process.env.WECHAT_TLS_INSECURE === 'true'
const tlsAgent = new https.Agent({ rejectUnauthorized: !wechatTlsInsecure })

@Injectable()
export class WechatService {
  constructor(private readonly config: ConfigService) {}

  /** 用 wx.login 拿到的 code 换取 openid / session_key */
  async code2Session(code: string) {
    const appid = this.config.get<string>('WECHAT_APPID')
    const secret = this.config.get<string>('WECHAT_SECRET')
    if (!appid || !secret) {
      throw new BadRequestException('服务端未配置微信 AppID / Secret')
    }
    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}` +
      `&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    const { data } = await axios.get(url, { httpsAgent: tlsAgent })
    if (data.errcode) {
      throw new BadRequestException(`微信登录失败: ${data.errmsg}`)
    }
    return data as { openid: string; session_key: string; unionid?: string }
  }
}
