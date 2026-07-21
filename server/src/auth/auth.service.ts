import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'
import * as crypto from 'node:crypto'

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

  /** 用户名+密码登录（学校管理员为教师创建的账号） */
  async passwordLogin(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user) throw new UnauthorizedException('账号不存在')
    if (!user.passwordHash) throw new UnauthorizedException('该账号未设置密码，请用微信登录')
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== user.passwordHash) throw new UnauthorizedException('密码错误')
    const token = this.jwt.sign({ sub: user.id })
    return { token, user }
  }
}
