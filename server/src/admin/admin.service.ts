import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import { User } from '../users/user.entity'

@Injectable()
export class AdminService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** 管理员登录验证：对照环境变量 ADMIN_USER / ADMIN_PASSWORD 或默认 admin/admin */
  login(username: string, password: string): string {
    const cfgUser = this.config.get('ADMIN_USER') || 'admin'
    const cfgPass = this.config.get('ADMIN_PASSWORD') || 'admin'
    if (username === cfgUser && password === cfgPass) {
      // 生成简易 token：ADMIN: + base64(username:timestamp)
      const payload = `${username}:${Date.now()}`
      return 'ADMIN:' + Buffer.from(payload).toString('base64')
    }
    throw new UnauthorizedException('管理员账号或密码错误')
  }

  /** 验证管理员 token */
  verifyAdminToken(token: string): boolean {
    if (!token || !token.startsWith('ADMIN:')) return false
    try {
      const payload = Buffer.from(token.slice(6), 'base64').toString()
      const [username, ts] = payload.split(':')
      const cfgUser = this.config.get('ADMIN_USER') || 'admin'
      if (username !== cfgUser) return false
      // token 有效期 24 小时
      return Date.now() - Number(ts) < 24 * 3600 * 1000
    } catch {
      return false
    }
  }

  /** 获取全部用户列表 */
  async listUsers() {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } })
    return users.map((u) => ({
      id: u.id,
      openid: u.openid ? u.openid.slice(0, 6) + '***' : '未绑定',
      name: u.name,
      school: u.school || '',
      subject: u.subject || '',
      features: u.features || [],
      createdAt: u.createdAt,
    }))
  }

  /** 删除用户及其全部数据 */
  async deleteUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } })
    if (!user) throw new BadRequestException('用户不存在')
    await this.userRepo.remove(user)
    return { id, deleted: true }
  }

  /** 更新用户功能配置 */
  async updateUserFeatures(id: string, features: string[]) {
    const user = await this.userRepo.findOne({ where: { id } })
    if (!user) throw new BadRequestException('用户不存在')
    user.features = features
    await this.userRepo.save(user)
    return { id, features }
  }
}
