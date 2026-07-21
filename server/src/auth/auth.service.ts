import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { parentImUserId } from '../im/parent-im.util'
import * as crypto from 'node:crypto'

const PARENT_DEFAULT_PASSWORD = '123456'

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly wechat: WechatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  /** 统一登录：遍历超管→学校管理员→教师→家长，命中即返回 */
  async unifiedLogin(username: string, password: string) {
    if (!username || !password) throw new BadRequestException('请输入用户名和密码')
    const u = username.trim()
    const p = password

    // 1) 超级管理员
    const su = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const sp = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (u === su && p === sp) {
      return { role: 'super', token: this.jwt.sign({ sub: 'super', role: 'super' }), user: { name: '超级管理员' } }
    }

    // 2) 学校管理员
    const admin = await this.saRepo.findOne({ where: { username: u } })
    if (admin) {
      if (p === admin.passwordHash || crypto.createHash('sha256').update(p).digest('hex') === admin.passwordHash) {
        return {
          role: 'school_admin',
          token: this.jwt.sign({ sub: admin.id, role: 'school_admin', schoolId: admin.schoolId }),
          user: { id: admin.id, name: admin.name, schoolId: admin.schoolId },
        }
      }
      throw new UnauthorizedException('密码错误')
    }

    // 3) 教师（用户名密码由学校管理员创建）
    const teacher = await this.users.findByUsername(u)
    if (teacher) {
      if (!teacher.passwordHash) throw new UnauthorizedException('该账号未设置密码，请用微信登录')
      const h = crypto.createHash('sha256').update(p).digest('hex')
      if (h !== teacher.passwordHash) throw new UnauthorizedException('密码错误')
      return { role: 'teacher', token: this.jwt.sign({ sub: teacher.id }), user: teacher }
    }

    // 4) 家长（用户名=学号，默认密码 123456）
    const stu = await this.studentRepo.findOne({ where: { studentNo: u } })
    if (stu) {
      if (!stu.parentLoginEnabled) throw new UnauthorizedException('该学生家长登录尚未被老师授权')
      if (p !== PARENT_DEFAULT_PASSWORD) throw new UnauthorizedException('密码错误')
      const pn = stu.parentName || '家长'
      return {
        role: 'parent',
        token: this.jwt.sign({ sub: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u }),
        parent: { imUserId: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u },
      }
    }

    throw new UnauthorizedException('账号不存在')
  }

  /** 微信登录：返回 openid → 若已绑定教师则自动登录；否则返回 needsBind + openid */
  async wechatLogin(code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid, session_key } = await this.wechat.code2Session(code)
    // 查教师绑定
    let user = await this.users.findByOpenid(openid)
    if (user) {
      await this.users.update(user.id, { sessionKey: session_key })
      return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid }), user, needsBind: false }
    }
    // 查家长绑定
    const stu = await this.studentRepo.findOne({ where: { parentOpenId: openid } })
    if (stu) {
      const pn = stu.parentName || '家长'
      const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
      return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: stu.studentNo }), needsBind: false }
    }
    return { needsBind: true, openid, sessionKey: session_key }
  }

  /** 微信绑教师账号：用教师用户名+密码验证后绑定 openid */
  async bindWechatTeacher(code: string, username: string, password: string) {
    if (!code || !username || !password) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('教师账号不存在或未设密码')
    const h = crypto.createHash('sha256').update(password).digest('hex')
    if (h !== user.passwordHash) throw new UnauthorizedException('密码错误')
    // 检查是否已有其他账号绑定此 openid
    const exist = await this.users.findByOpenid(openid)
    if (exist && exist.id !== user.id) throw new BadRequestException('该微信已绑定其他账号')
    await this.users.update(user.id, { openid })
    return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid }), user }
  }

  /** 微信绑家长：用学号绑定 openid */
  async bindWechatParent(code: string, studentNo: string) {
    if (!code || !studentNo) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    const stu = await this.studentRepo.findOne({ where: { studentNo } })
    if (!stu) throw new BadRequestException('学号不存在')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')
    stu.parentOpenId = openid
    await this.studentRepo.save(stu)
    const pn = stu.parentName || '家长'
    const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
    return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo }), needsBind: false }
  }

  /** 教师密码登录（学校管理员已绑定学校，无需学校编号） */
  async passwordLogin(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('账号不存在或未设密码')
    const h = crypto.createHash('sha256').update(password).digest('hex')
    if (h !== user.passwordHash) throw new UnauthorizedException('密码错误')
    return { token: this.jwt.sign({ sub: user.id }), user }
  }
}
