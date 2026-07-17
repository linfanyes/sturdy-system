import { Injectable, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly wechat: WechatService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * 微信登录：code -> openid -> 自动建档/登录 -> 签发 JWT。
   * 新用户先用默认资料建档，前端通过 PUT /api/users/me 补全。
   */
  async wechatLogin(code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid, session_key } = await this.wechat.code2Session(code)
    let user = await this.users.findByOpenid(openid)
    let isNew = false
    if (!user) {
      isNew = true
      user = await this.users.create({
        openid,
        sessionKey: session_key,
        name: '老师',
        subject: '语文',
        subjects: ['语文'],
        term: '',
        school: '',
        avatar: '🍎',
        motto: '',
      })
    } else {
      await this.users.update(user.id, { sessionKey: session_key })
    }
    const token = this.jwt.sign({ sub: user.id, openid })
    return { token, user, isNew }
  }
}
