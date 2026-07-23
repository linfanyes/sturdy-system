import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.entity'
import { WechatService } from './wechat.service'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
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
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
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
      if (admin.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系超级管理员')
      if (p === admin.passwordHash || crypto.createHash('sha256').update(p).digest('hex') === admin.passwordHash) {
        const school = await this.schoolRepo.findOne({ where: { id: admin.schoolId } })
        return {
          role: 'school_admin',
          token: this.jwt.sign({ sub: admin.id, role: 'school_admin', schoolId: admin.schoolId }),
          user: { id: admin.id, name: admin.name, schoolId: admin.schoolId, schoolName: school?.name || '', schoolCode: school?.code || '' },
        }
      }
      throw new UnauthorizedException('密码错误')
    }

    // 3) 教师（用户名密码由学校管理员创建）
    const teacher = await this.users.findByUsername(u)
    if (teacher) {
      if (teacher.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系学校管理员')
      if (!teacher.passwordHash) throw new UnauthorizedException('该账号未设置密码，请用微信登录')
      const h = crypto.createHash('sha256').update(p).digest('hex')
      if (h !== teacher.passwordHash) throw new UnauthorizedException('密码错误')
      // 仅返回安全的字段，避免泄露 passwordHash/sessionKey
      const safeUser = {
        id: teacher.id, name: teacher.name, username: teacher.username,
        school: teacher.school, schoolId: teacher.schoolId, phone: teacher.phone,
        features: teacher.features, enabled: teacher.enabled,
        avatar: teacher.avatar, teacherNo: teacher.teacherNo,
      }
      return { role: 'teacher', token: this.jwt.sign({ sub: teacher.id, role: 'teacher' }), user: safeUser }
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
      if (user.enabled === false) throw new UnauthorizedException('账号已被学校管理员禁用，请联系学校')
      await this.users.update(user.id, { sessionKey: session_key })
      return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid, role: 'teacher' }), user, needsBind: false }
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
    return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid, role: 'teacher' }), user }
  }

  /** 微信绑家长：用学号绑定 openid */
  async bindWechatParent(code: string, studentNo: string) {
    if (!code || !studentNo) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    // 检查该 openid 是否已被其他学生绑定
    const existing = await this.studentRepo.findOne({ where: { parentOpenId: openid } })
    if (existing && existing.studentNo !== studentNo) {
      throw new BadRequestException('该微信已被其他学生家长绑定')
    }
    const stu = await this.studentRepo.findOne({ where: { studentNo } })
    if (!stu) throw new BadRequestException('学号不存在')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')
    stu.parentOpenId = openid
    await this.studentRepo.save(stu)
    const pn = stu.parentName || '家长'
    const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
    return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo }), needsBind: false }
  }

  /** 微信统一绑定：输入教师编号或学生学号，自动判别身份（事务保护） */
  async bindByNumber(code: string, number: string, nickName?: string) {
    if (!code || !number) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    // 尝试按教师编号查找
    const user = await this.users.findByTeacherNo(number)
    if (user) {
      return await this.entityManager.transaction(async (em) => {
        const userRepo = em.getRepository(User)
        // 悲观锁锁定该行，防止并发重复绑定
        const lockedUser = await userRepo
          .createQueryBuilder('u')
          .where('u.id = :id', { id: user.id })
          .setLock('pessimistic_write')
          .getOne()
        if (!lockedUser) throw new BadRequestException('教师账号不存在')
        if (lockedUser.openid && lockedUser.openid !== openid) {
          throw new BadRequestException('该教师编号已被其他微信绑定')
        }
        const DEFAULT_PWD = '1314520'
        const pwdHash = crypto.createHash('sha256').update(DEFAULT_PWD).digest('hex')
        const displayName = nickName || ('老师' + number.slice(-4))
        Object.assign(lockedUser, { openid, passwordHash: pwdHash, sessionKey: '', name: displayName, wechatName: nickName || '' })
        await userRepo.save(lockedUser)
        const safeUser = {
          id: lockedUser.id, name: lockedUser.name, username: lockedUser.username,
          school: lockedUser.school, teacherNo: lockedUser.teacherNo,
        }
        return { role: 'teacher', token: this.jwt.sign({ sub: lockedUser.id, openid, role: 'teacher' }), user: safeUser, needsBind: false }
      })
    }
    // 尝试按学号查找（家长绑定）
    const stu = await this.studentRepo.findOne({ where: { studentNo: number } })
    if (stu) {
      // 检查 openid 是否已被其他学生绑定
      const existing = await this.studentRepo.findOne({ where: { parentOpenId: openid } })
      if (existing && existing.studentNo !== number) {
        throw new BadRequestException('该微信已被其他学生家长绑定')
      }
      if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')
      stu.parentOpenId = openid
      await this.studentRepo.save(stu)
      const pn = stu.parentName || '家长'
      const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
      return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: number }), needsBind: false }
    }
    throw new BadRequestException('未找到对应的教师或学生信息，请确认编号是否正确')
  }

  /** 教师密码登录（学校管理员已绑定学校，无需学校编号） */
  async passwordLogin(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('账号不存在或未设密码')
    const h = crypto.createHash('sha256').update(password).digest('hex')
    if (h !== user.passwordHash) throw new UnauthorizedException('密码错误')
    return { token: this.jwt.sign({ sub: user.id, role: 'teacher' }), user }
  }
}
