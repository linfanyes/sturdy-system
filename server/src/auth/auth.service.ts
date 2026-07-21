import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'
import { School } from '../school/school.entity'
import * as crypto from 'node:crypto'

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly wechat: WechatService,
    private readonly jwt: JwtService,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
  ) {}

  /** 微信登录 */
  async wechatLogin(code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid, session_key } = await this.wechat.code2Session(code)
    let user = await this.users.findByOpenid(openid)
    let isNew = false
    if (!user) {
      isNew = true
      user = await this.users.create({
        openid, sessionKey: session_key, name: '老师', subject: '语文',
        subjects: ['语文'], term: '', school: '', avatar: '🍎', motto: '',
      })
    } else {
      await this.users.update(user.id, { sessionKey: session_key })
    }
    const token = this.jwt.sign({ sub: user.id, openid })
    return { token, user, isNew }
  }

  /** 教师用户名+密码+学校编号登录 */
  async passwordLogin(schoolCode: string, username: string, password: string) {
    const school = await this.schoolRepo.findOne({ where: { code: schoolCode } })
    if (!school) throw new UnauthorizedException('学校编号不存在')
    const user = await this.users.findByUsername(username)
    if (!user || user.schoolId !== school.id) throw new UnauthorizedException('账号不存在或不属于该学校')
    if (!user.passwordHash) throw new UnauthorizedException('该账号未设置密码，请用微信登录')
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== user.passwordHash) throw new UnauthorizedException('密码错误')
    const token = this.jwt.sign({ sub: user.id })
    return { token, user }
  }
}
