import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.entity'
import { Teacher } from '../teacher/teacher.entity'
import { WechatService } from './wechat.service'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { parentImUserId } from '../im/parent-im.util'
import { verifyAndUpgrade } from '../common/utils/password.util'
import { AuditService } from '../audit/audit.service'
import { Parent } from '../parent/parent.entity'
import { FeatureService } from '../common/feature/feature.service'

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
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly auditService: AuditService,
    private readonly feature: FeatureService,
  ) {}

  /** 便捷：计算某角色的有效功能包（学校级 ∩ 教师级） */
  private async effectiveFeaturesFor(
    role: 'super' | 'school_admin' | 'teacher' | 'parent',
    opts: { schoolId?: string; teacherFeatures?: string[] | null; studentId?: string } = {},
  ): Promise<string[]> {
    const fp = await this.feature.buildProfile({ role, ...opts })
    return fp.effectiveFeatures
  }

  /** 统一登录：遍历超管→学校管理员→教师→家长，命中即返回 */
  async unifiedLogin(username: string, password: string) {
    if (!username || !password) throw new BadRequestException('请输入用户名和密码')
    const u = username.trim()
    const p = password

    // 1) 超级管理员（用户名命中即视为超管尝试，密码错误需明确提示，避免误报“账号不存在”）
    const su = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const sp = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (u === su) {
      if (p === sp) {
        return {
          role: 'super',
          token: this.jwt.sign({ sub: 'super', role: 'super' }),
          user: { name: '超级管理员' },
          effectiveFeatures: await this.effectiveFeaturesFor('super'),
        }
      }
      throw new UnauthorizedException('密码错误')
    }

    // 2) 学校管理员
    const admin = await this.saRepo.findOne({ where: { username: u } })
    if (admin) {
      if (admin.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系超级管理员')
      const { valid, newHash } = verifyAndUpgrade(p, admin.passwordHash)
      if (valid) {
        // 透明升级旧 sha256 为 bcrypt
        if (newHash) {
          admin.passwordHash = newHash
          await this.saRepo.save(admin)
        }
        const school = await this.schoolRepo.findOne({ where: { id: admin.schoolId } })
        return {
          role: 'school_admin',
          token: this.jwt.sign({ sub: admin.id, role: 'school_admin', schoolId: admin.schoolId }),
          user: { id: admin.id, name: admin.name, schoolId: admin.schoolId, schoolName: school?.name || '', schoolCode: school?.code || '' },
          effectiveFeatures: await this.effectiveFeaturesFor('school_admin'),
        }
      }
      throw new UnauthorizedException('密码错误')
    }

    // 3) 教师（用户名密码由学校管理员创建）
    const teacher = await this.users.findByUsername(u)
    if (teacher) {
      if (teacher.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系学校管理员')
      if (!teacher.passwordHash) throw new UnauthorizedException('该账号未设置密码，请用微信登录')
      const { valid, newHash } = verifyAndUpgrade(p, teacher.passwordHash)
      if (!valid) throw new UnauthorizedException('密码错误')
      // 透明升级旧 sha256 为 bcrypt
      if (newHash) {
        teacher.passwordHash = newHash
        await this.users.update(teacher.id, { passwordHash: newHash })
      }
      // 仅返回安全的字段，避免泄露 passwordHash/sessionKey
      const teacherProfile = await this.entityManager.findOne(Teacher, { where: { id: teacher.id } }).catch(() => null)
      const safeUser = {
        id: teacher.id, name: teacher.name, username: teacher.username,
        school: teacher.school, schoolId: teacher.schoolId, phone: teacher.phone,
        features: teacher.features, enabled: teacher.enabled,
        avatar: teacher.avatar, teacherNo: teacher.teacherNo,
        position: teacherProfile?.position || '',
      }
      // 检查教师是否关联了家长身份（使用 parentId 字段）
      let parentExists = false
      let parentRecord = null
      if (teacher.parentId) {
        parentRecord = await this.parentRepo.findOne({ where: { id: teacher.parentId } })
        if (parentRecord) {
          parentExists = true
        }
      }

      if (parentExists) {
        // 双角色：返回 needsRoleChoice
        const kids = await this.studentRepo.find({ where: { parentId: parentRecord!.id } })
        const firstKid = kids[0]
        let parentToken = ''
        if (firstKid) {
          const pim = parentImUserId({ studentId: firstKid.id, relation: '家长', parentName: parentRecord!.parentName })
          parentToken = this.jwt.sign({ sub: pim, type: 'parent', parentId: parentRecord!.id, studentId: firstKid.id, studentName: firstKid.name, classId: firstKid.classId, studentNo: firstKid.studentNo })
        }
        const teacherToken = this.jwt.sign({ sub: teacher.id, role: 'teacher', schoolId: teacher.schoolId || '' })

        return {
          needsRoleChoice: true,
          roles: ['teacher', 'parent'],
          teacher: { role: 'teacher', token: teacherToken, user: safeUser, effectiveFeatures: await this.effectiveFeaturesFor('teacher', { schoolId: teacher.schoolId, teacherFeatures: teacher.features }) },
          parent: {
            role: 'parent',
            parentId: parentRecord!.id,
            kids: kids?.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })) || [],
            token: parentToken,
            needsBind: false,
            effectiveFeatures: firstKid ? await this.effectiveFeaturesFor('parent', { studentId: firstKid.id }) : [],
          },
        }
      }

      // 无家长身份 → 走原逻辑返回 teacher
      return {
        role: 'teacher',
        token: this.jwt.sign({ sub: teacher.id, role: 'teacher', schoolId: teacher.schoolId || '' }),
        user: safeUser,
        effectiveFeatures: await this.effectiveFeaturesFor('teacher', { schoolId: teacher.schoolId, teacherFeatures: teacher.features }),
      }
    }

    // 4) 家长（用户名=学号，密码为老师开启家长登录时生成的随机密码，不再支持默认弱密码）
    const stu = await this.studentRepo.findOne({ where: { studentNo: u } })
    if (stu) {
      if (!stu.parentLoginEnabled) throw new UnauthorizedException('该学生家长登录尚未被老师授权')
      if (!stu.parentPasswordHash)
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      const { valid, newHash } = verifyAndUpgrade(p, stu.parentPasswordHash)
      if (!valid) throw new UnauthorizedException('密码错误')
      if (newHash) {
        stu.parentPasswordHash = newHash
        await this.studentRepo.save(stu)
      }
      const pn = stu.parentName || '家长'
      return {
        role: 'parent',
        token: this.jwt.sign({ sub: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), type: 'parent', studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u }),
        effectiveFeatures: await this.effectiveFeaturesFor('parent', { studentId: stu.id }),
        parent: { imUserId: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u },
      }
    }

    throw new UnauthorizedException('账号不存在')
  }

  /** 微信登录：并行查教师 + 家长身份，支持双角色选择和多娃 */
  async wechatLogin(code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid, session_key } = await this.wechat.code2Session(code)
    if (!openid) throw new UnauthorizedException('登录失败')

    // 并行查教师和家长（通过 Parent 表）
    const [user, parent] = await Promise.all([
      this.users.findByOpenid(openid).catch(() => null),
      this.parentRepo.findOne({ where: { openId: openid } }),
    ])

    // 确定是否存在家长身份
    let parentExists = !!parent
    let parentId = parent?.id || null

    // 如果用户有 parentId 关联但 openid 未直接匹配 Parent，也认为存在家长身份
    if (user && !parentExists && user.parentId) {
      parentExists = true
      parentId = user.parentId
    }

    // 更新 sessionKey
    if (user) {
      await this.users.update(user.id, { sessionKey: session_key }).catch(() => {})
    }

    // 情况1：同时是教师和家长 → 双角色选择
    if (user && parentExists) {
      // 获取家长信息和 kids（通过 parentId）
      const p = parent || await this.parentRepo.findOne({ where: { id: user.parentId } })
      const kids = await this.studentRepo.find({ where: { parentId: p.id } })
      const firstKid = kids[0]
      let parentToken = ''
      if (firstKid) {
        const pim = parentImUserId({ studentId: firstKid.id, relation: '家长', parentName: p.parentName })
        parentToken = this.jwt.sign({ sub: pim, type: 'parent', parentId: p.id, studentId: firstKid.id, studentName: firstKid.name, classId: firstKid.classId, studentNo: firstKid.studentNo })
      }
      const teacherToken = this.jwt.sign({ sub: user.id, openid, role: 'teacher', schoolId: user.schoolId || '' })

      return {
        needsRoleChoice: true,
        roles: ['teacher', 'parent'],
        teacher: { role: 'teacher', token: teacherToken, user },
          parent: {
            role: 'parent',
            parentId: p.id,
            kids: kids?.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })) || [],
            token: parentToken,
            needsBind: false,
            effectiveFeatures: firstKid ? await this.effectiveFeaturesFor('parent', { studentId: firstKid.id }) : [],
          },
      }
    }

    // 情况2：仅家长
    if (parentExists) {
      const kids = await this.studentRepo.find({ where: { parentId: parent.id } })
      const firstKid = kids[0]
      if (!firstKid) throw new UnauthorizedException('未关联学生')
      const pim = parentImUserId({ studentId: firstKid.id, relation: '家长', parentName: parent.parentName })
      const token = this.jwt.sign({ sub: pim, type: 'parent', parentId: parent.id, studentId: firstKid.id, studentName: firstKid.name, classId: firstKid.classId, studentNo: firstKid.studentNo })
      const pn = parent.parentName || '家长'
      return { role: 'parent', token, parentId: parent.id, effectiveFeatures: await this.effectiveFeaturesFor('parent', { studentId: firstKid.id }), kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })), parentName: pn, needsBind: false }
    }

    // 情况3：仅教师
    if (user) {
      if (user.enabled === false) throw new UnauthorizedException('账号已被学校管理员禁用，请联系学校')
      return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid, role: 'teacher', schoolId: user.schoolId || '' }), user, effectiveFeatures: await this.effectiveFeaturesFor('teacher', { schoolId: user.schoolId, teacherFeatures: user.features }), needsBind: false }
    }

    // 情况4：皆无
    return { needsBind: true, openid, sessionKey: session_key }
  }

  /** 微信绑教师账号：用教师用户名+密码验证后绑定 openid */
  async bindWechatTeacher(code: string, username: string, password: string) {
    if (!code || !username || !password) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('教师账号不存在或未设密码')
    const h = user.passwordHash
    const { valid, newHash } = verifyAndUpgrade(password, h)
    if (!valid) throw new UnauthorizedException('密码错误')
    if (newHash) { user.passwordHash = newHash; await this.users.update(user.id, { passwordHash: newHash }) }
    // 检查是否已有其他账号绑定此 openid
    const exist = await this.users.findByOpenid(openid)
    if (exist && exist.id !== user.id) throw new BadRequestException('该微信已绑定其他账号')
    await this.users.update(user.id, { openid })
    return { role: 'teacher', token: this.jwt.sign({ sub: user.id, openid, role: 'teacher', schoolId: user.schoolId || '' }), user }
  }

  /** 微信绑家长：用学号+可选家长密码绑定 openid（创建或复用 Parent 记录） */
  async bindWechatParent(code: string, studentNo: string, password?: string) {
    if (!code || !studentNo) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    if (!openid || !studentNo) throw new BadRequestException('参数不全')

    const stu = await this.studentRepo.findOne({ where: { studentNo } })
    if (!stu) throw new BadRequestException('学号不存在')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')

    // 密码校验（Phase 1 已有）
    if (stu.parentPasswordHash) {
      if (!password) throw new UnauthorizedException('绑定需要家长密码')
      const { valid, newHash } = verifyAndUpgrade(password, stu.parentPasswordHash)
      if (!valid) throw new UnauthorizedException('家长密码错误')
      if (newHash) stu.parentPasswordHash = newHash
    }

    // 查找或创建 Parent 记录
    let parent = await this.parentRepo.findOne({ where: { openId: openid } })
    if (!parent) {
      parent = this.parentRepo.create({
        openId: openid,
        parentName: stu.parentName || '家长',
        nickName: stu.parentNickName || '',
      })
      parent = await this.parentRepo.save(parent)
    } else {
      // 更新昵称
      if (stu.parentNickName) {
        parent.nickName = stu.parentNickName
        await this.parentRepo.save(parent)
      }
    }

    // 设置学生 parentId
    stu.parentId = parent.id
    await this.studentRepo.save(stu)

    // 审计日志
    const teacher = await this.users.findById(stu.teacherId).catch(() => null)
    await this.auditService.log(teacher?.schoolId || stu.teacherId, 'bind_parent', openid, stu.studentNo, '绑定家长微信').catch(() => {})

    const pn = parent.parentName || '家长'
    const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
    const kids = await this.studentRepo.find({ where: { parentId: parent.id } })
    return {
      role: 'parent',
      token: this.jwt.sign({ sub: pim, type: 'parent', parentId: parent.id, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo }),
      parentId: parent.id,
      kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })),
      needsBind: false,
    }
  }

  /** 微信统一绑定：输入教师编号或学生学号，自动判别身份（事务保护） */
  async bindByNumber(code: string, number: string, nickName?: string, password?: string) {
    if (!code || !number) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    // 尝试按教师编号查找
    const user = await this.users.findByTeacherNo(number)
    if (user) {
      throw new BadRequestException('请使用教师端-绑定微信功能')
    }
    // 尝试按学号查找（家长绑定）
    const stu = await this.studentRepo.findOne({ where: { studentNo: number } })
    if (stu) {
      if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')
      // 校验家长密码（若已设）
      if (stu.parentPasswordHash) {
        if (!password) throw new UnauthorizedException('绑定需要家长密码')
        const { valid, newHash } = verifyAndUpgrade(password, stu.parentPasswordHash)
        if (!valid) throw new UnauthorizedException('家长密码错误')
        if (newHash) {
          stu.parentPasswordHash = newHash
        }
      }
      // 查找或创建 Parent 记录
      let parent = await this.parentRepo.findOne({ where: { openId: openid } })
      if (!parent) {
        parent = this.parentRepo.create({
          openId: openid,
          parentName: stu.parentName || '家长',
          nickName: nickName || stu.parentNickName || '',
        })
        parent = await this.parentRepo.save(parent)
      } else if (nickName) {
        parent.nickName = nickName
        await this.parentRepo.save(parent)
      }
      stu.parentId = parent.id
      await this.studentRepo.save(stu)
      // 审计日志
      const t = await this.users.findById(stu.teacherId).catch(() => null)
      await this.auditService.log(t?.schoolId || stu.teacherId, 'bind_parent', openid, stu.studentNo, '绑定家长微信').catch(() => {})
      const pn = parent.parentName || '家长'
      const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
      const kids = await this.studentRepo.find({ where: { parentId: parent.id } })
      return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', parentId: parent.id, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: number }), parentId: parent.id, kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })), needsBind: false }
    }
    throw new BadRequestException('未找到对应的教师或学生信息，请确认编号是否正确')
  }

  /** 教师密码登录（学校管理员已绑定学校，无需学校编号） */
  async passwordLogin(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('账号不存在或未设密码')
    const { valid, newHash } = verifyAndUpgrade(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('密码错误')
    if (newHash) { user.passwordHash = newHash; await this.users.update(user.id, { passwordHash: newHash }) }
    return {
      token: this.jwt.sign({ sub: user.id, role: 'teacher', schoolId: user.schoolId || '' }),
      user,
      effectiveFeatures: await this.effectiveFeaturesFor('teacher', { schoolId: user.schoolId, teacherFeatures: user.features }),
    }
  }

  /**
   * 当前登录态功能档案（GET /auth/me）。
   * 复用 FeatureService.buildProfile 计算 effectiveFeatures / rawFeatures / schoolFeatureFlags。
   */
  async me(user: any) {
    const profile = await this.feature.buildProfile({
      role: user.role,
      schoolId: user.schoolId,
      studentId: user.studentId,
    })
    return {
      role: profile.role,
      schoolId: profile.schoolId,
      effectiveFeatures: profile.effectiveFeatures,
      rawFeatures: profile.rawFeatures,
      schoolFeatureFlags: profile.schoolFeatureFlags,
      user: {
        id: user.sub,
        role: user.role,
        schoolId: user.schoolId,
        studentId: user.studentId,
        studentName: user.studentName,
      },
    }
  }
}
