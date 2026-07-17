import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

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
      `&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    const { data } = await axios.get(url)
    if (data.errcode) {
      throw new BadRequestException(`微信登录失败: ${data.errmsg}`)
    }
    return data as { openid: string; session_key: string; unionid?: string }
  }
}
