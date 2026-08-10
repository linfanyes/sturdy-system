import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { UsersService } from '../users/users.service'
import { Teacher } from '../teacher/teacher.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { parentImUserId } from '../im/parent-im.util'
import { verifyAndUpgrade, isBcryptHash } from '../common/utils/password.util'
import { AuditService } from '../audit/audit.service'
import { Parent } from '../parent/parent.entity'
import { FeatureService } from '../common/feature/feature.service'
import { WechatAuthService } from './wechat-auth.service'
import { findStudentByNoForLogin } from '../common/utils/student.util'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wechatAuth: WechatAuthService,
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

  /** 按学号查询学生用于家长登录：学号跨学校可能重复，优先返回已开启家长登录的记录 */
  private async findStudentByNoForLogin(studentNo: string) {
    return findStudentByNoForLogin(this.studentRepo, studentNo)
  }

  /** 统一登录：遍历超管→学校管理员→教师→家长，命中即返回 */
  async unifiedLogin(username: string, password: string) {
    if (!username || !password) throw new BadRequestException('请输入用户名和密码')
    const u = username.trim()
    const p = password.trim()

    // 1) 超级管理员（用户名命中即视为超管尝试，密码错误需明确提示，避免误报"账号不存在"）
    const su = this.config.get('SUPER_ADMIN_USER') || 'admin'
    const sp = this.config.get('SUPER_ADMIN_PASSWORD') || 'admin'
    if (u === su) {
      // 支持 bcrypt 哈希或明文比较（向后兼容）。
      // 建议通过 SUPER_ADMIN_PASSWORD 设置 bcrypt 哈希（$2b$... 开头）以提高安全性。
      const valid = isBcryptHash(sp)
        ? bcrypt.compareSync(p, sp)
        : p === sp
      if (valid) {
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
        position: teacher.position || teacherProfile?.position || '',
        // 任教学科：用于前端按学科过滤菜单/工具（语数外老师一般只任一科）
        subject: teacher.subject || teacherProfile?.subject || '',
        subjects: teacher.subjects || teacherProfile?.subjects || [],
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
    const stu = await this.findStudentByNoForLogin(u)
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
      // 缺陷修复：纯家长分支此前签发的 JWT 缺少 parentId，导致 /parent-auth/me、
      // 切换孩子、跨娃比对等依赖 parentId 的家长端功能全部拿到空数据。
      // 与「教师开启家长登录（toggle D6）」逻辑对齐：复用/创建 Parent 记录并回填 student.parentId。
      let parentId: string | undefined = stu.parentId || undefined
      if (!parentId) {
        try {
          const phone = (stu.parentPhone || '').trim()
          if (phone) {
            let parentRecord = await this.parentRepo.findOne({ where: { phone } })
            if (!parentRecord) {
              parentRecord = await this.parentRepo.save(this.parentRepo.create({ phone, parentName: pn }))
            }
            parentId = parentRecord.id
            stu.parentId = parentRecord.id
            await this.studentRepo.save(stu)
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(`[unified-login] 回填家长 parentId 失败（不影响登录）: ${(e as Error)?.message}`)
        }
      }
      return {
        role: 'parent',
        token: this.jwt.sign({ sub: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), type: 'parent', parentId, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u }),
        effectiveFeatures: await this.effectiveFeaturesFor('parent', { studentId: stu.id }),
        parent: { imUserId: parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn }), parentId, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: u },
      }
    }

    throw new UnauthorizedException('账号不存在')
  }

  /** 微信登录：委托 WechatAuthService（保持接口兼容） */
  async wechatLogin(code: string) {
    return this.wechatAuth.wechatLogin(code)
  }

  /** 微信绑教师账号：委托 WechatAuthService（保持接口兼容） */
  async bindWechatTeacher(code: string, username: string, password: string, nickName?: string) {
    return this.wechatAuth.bindWechatTeacher(code, username, password, nickName)
  }

  /** 微信绑家长：委托 WechatAuthService（保持接口兼容） */
  async bindWechatParent(code: string, studentNo: string, password?: string, nickName?: string, avatar?: string, relation?: string) {
    return this.wechatAuth.bindWechatParent(code, studentNo, password, nickName, avatar, relation)
  }

  /** 微信统一绑定：委托 WechatAuthService（保持接口兼容） */
  async bindByNumber(code: string, number: string, nickName?: string, password?: string, avatar?: string, relation?: string) {
    return this.wechatAuth.bindByNumber(code, number, nickName, password, avatar, relation)
  }

  /** 教师密码登录（学校管理员已绑定学校，无需学校编号） */
  async passwordLogin(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user || !user.passwordHash) throw new UnauthorizedException('账号不存在或未设密码')
    if (user.enabled === false) throw new UnauthorizedException('账号已被禁用，请联系学校管理员')
    const { valid, newHash } = verifyAndUpgrade(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('密码错误')
    if (newHash) { user.passwordHash = newHash; await this.users.update(user.id, { passwordHash: newHash }) }
    // 安全修复：仅返回安全字段，避免泄露 passwordHash / sessionKey / openid 等敏感信息
    const safeUser = {
      id: user.id, name: user.name, username: user.username,
      school: user.school, schoolId: user.schoolId, phone: user.phone,
      features: user.features, enabled: user.enabled,
      avatar: user.avatar, teacherNo: user.teacherNo,
      position: user.position || '',
      subject: user.subject || '',
      subjects: user.subjects || [],
    }
    return {
      token: this.jwt.sign({ sub: user.id, role: 'teacher', schoolId: user.schoolId || '' }),
      user: safeUser,
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

    const resultUser: any = {
      id: user.sub,
      role: user.role,
      schoolId: user.schoolId,
      studentId: user.studentId,
      studentName: user.studentName,
    }

    // 教师角色：补充 subject / subjects / 微信绑定信息
    if (user.role === 'teacher') {
      const teacher = await this.users.findById(user.sub).catch(() => null)
      if (teacher) {
        resultUser.name = teacher.name
        resultUser.username = teacher.username
        resultUser.phone = teacher.phone
        resultUser.teacherNo = teacher.teacherNo
        resultUser.avatar = teacher.avatar
        resultUser.enabled = teacher.enabled
        resultUser.subject = teacher.subject
        resultUser.subjects = teacher.subjects
        resultUser.position = teacher.position || ''
        // 微信绑定信息（脱敏 openid，仅展示是否绑定+昵称）
        resultUser.wechatBound = !!teacher.openid
        resultUser.wechatName = teacher.wechatName || ''
        resultUser.wechatOpenidTail = teacher.openid ? teacher.openid.slice(-6) : ''
      }
    }

    return {
      role: profile.role,
      schoolId: profile.schoolId,
      effectiveFeatures: profile.effectiveFeatures,
      rawFeatures: profile.rawFeatures,
      schoolFeatureFlags: profile.schoolFeatureFlags,
      user: resultUser,
    }
  }
}
