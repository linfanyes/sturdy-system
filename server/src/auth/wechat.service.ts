import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import https from 'node:https'

// 部分云托管 VPC 内存在 TLS 拦截代理(MITM)，会向 api.weixin.qq.com 等公网 HTTPS
// 出示自签证书；Node 默认拒绝自签证书，导致微信登录报 "self-signed certificate"。
// 这里仅为微信接口单独放宽证书校验（仅限本 Agent，不影响全局 TLS 策略）。
const tlsAgent = new https.Agent({ rejectUnauthorized: false })

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
