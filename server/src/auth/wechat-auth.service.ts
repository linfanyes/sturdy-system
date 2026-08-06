import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm'
import { Repository, EntityManager, In } from 'typeorm'
import { UsersService } from '../users/users.service'
import { Student } from '../students/student.entity'
import { Parent } from '../parent/parent.entity'
import { WechatService } from './wechat.service'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { verifyAndUpgrade } from '../common/utils/password.util'
import { AuditService } from '../audit/audit.service'
import { FeatureService } from '../common/feature/feature.service'
import { StudentParentService } from '../student-parent/student-parent.module'
import { parentImUserId } from '../im/parent-im.util'

/**
 * 微信认证服务：处理微信登录、微信绑定家长/教师账号等逻辑。
 *
 * 角色规则（产品决策：避免师兼家身份歧义）：
 * - 超级管理员/校管理员：无 openid 字段，永远不会被微信登录命中，只能用账号密码登录
 * - 教师：即使 openid 已绑定教师账号，微信登录也不会命中教师身份，教师必须用账号密码登录
 * - 家长：通过 StudentParent 关联表查 openid 绑定的所有学生（支持一娃多微信、一微信多娃）
 */
@Injectable()
export class WechatAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wechat: WechatService,
    private readonly users: UsersService,
    private readonly auditService: AuditService,
    private readonly feature: FeatureService,
    private readonly studentParentSvc: StudentParentService,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  /** 按学号查询学生用于家长登录/绑定：学号跨学校可能重复（历史残留），优先返回已开启家长登录的记录 */
  private async findStudentByNoForLogin(studentNo: string) {
    const all = await this.studentRepo.find({ where: { studentNo } })
    if (!all.length) return null
    return all.find((s) => s.parentLoginEnabled) || all[0]
  }

  /**
   * 微信登录：仅支持家长登录。
   *
   * 若该 openid 仅绑定了教师账号而无家长身份，返回 needsBind 引导绑定家长身份。
   */
  async wechatLogin(code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    // session_key 仅用于服务端换取身份信息，不回传客户端，避免泄露后被滥用
    const { openid } = await this.wechat.code2Session(code)
    if (!openid) throw new UnauthorizedException('登录失败')

    // 仅查家长身份（教师身份在微信登录中被忽略）
    const parent = await this.parentRepo.findOne({ where: { openId: openid } })

    // 通过 StudentParent 关联表查该 openid 绑定的所有学生（支持跨班跨校多娃）
    const bindings = await this.studentParentSvc.listByOpenid(openid)
    let kids: Student[] = []
    if (bindings.length) {
      const studentIds = bindings.map(b => b.studentId)
      kids = await this.studentRepo.find({ where: { id: In(studentIds) } })
    } else if (parent) {
      // 回退：旧数据未迁移到 StudentParent 表的，按 Parent.id 查 Student.parentId
      kids = await this.studentRepo.find({ where: { parentId: parent.id } })
    }

    // 确定是否存在家长身份
    const parentExists = !!parent || kids.length > 0

    // 情况1：家长身份命中 → 直接以家长身份登录
    if (parentExists) {
      const firstKid = kids[0]
      if (!firstKid) throw new UnauthorizedException('未关联学生')
      const p = parent
      const pn = p?.parentName || '家长'
      const pim = parentImUserId({ studentId: firstKid.id, relation: '家长', parentName: pn })
      const token = this.jwt.sign({
        sub: pim, type: 'parent',
        parentId: p?.id || '',
        studentId: firstKid.id, studentName: firstKid.name,
        classId: firstKid.classId, studentNo: firstKid.studentNo,
      })
      return {
        role: 'parent', token,
        parentId: p?.id || '',
        effectiveFeatures: await this.feature.buildProfile({ role: 'parent', studentId: firstKid.id }).then(p => p.effectiveFeatures),
        kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })),
        parentName: pn,
        needsBind: false,
      }
    }

    // 情况2：无家长身份 → 需要绑定家长账号（即使 openid 已绑定教师账号，也引导绑定家长身份）
    return { needsBind: true, openid }
  }

  /**
   * 微信绑教师账号：已禁用。
   * 产品决策：教师不支持微信登录，必须用账号密码登录，避免师兼家身份歧义。
   * 保留方法签名以兼容旧路由，但永远抛错。
   */
  async bindWechatTeacher(code: string, username: string, password: string, nickName?: string) {
    throw new BadRequestException('教师不支持微信登录，请使用账号密码登录')
  }

  /** 微信绑家长：用学号+可选家长密码绑定 openid（支持一学生多微信） */
  async bindWechatParent(code: string, studentNo: string, password?: string, nickName?: string, avatar?: string, relation?: string) {
    if (!code || !studentNo) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    if (!openid || !studentNo) throw new BadRequestException('参数不全')

    const stu = await this.findStudentByNoForLogin(studentNo)
    if (!stu) throw new BadRequestException('学号不存在')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')

    // 密码校验：家长密码未初始化时禁止绑定，避免仅凭学号接管家长身份
    if (!stu.parentPasswordHash) {
      throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
    }
    if (!password) throw new UnauthorizedException('绑定需要家长密码')
    const { valid, newHash } = verifyAndUpgrade(password, stu.parentPasswordHash)
    if (!valid) throw new UnauthorizedException('家长密码错误')
    if (newHash) stu.parentPasswordHash = newHash

    // 查找或创建 Parent 记录（同一 openid 对应同一 Parent）
    let parent = await this.parentRepo.findOne({ where: { openId: openid } })
    if (!parent) {
      parent = this.parentRepo.create({
        openId: openid,
        parentName: stu.parentName || '家长',
        nickName: nickName || stu.parentNickName || '',
      })
      parent = await this.parentRepo.save(parent)
    } else if (nickName && parent.nickName !== nickName) {
      parent.nickName = nickName
      await this.parentRepo.save(parent)
    }

    // 写入 StudentParent 关联表（幂等，支持一学生多微信）
    const { needsUpdateStudentParentId } = await this.studentParentSvc.bind({
      studentId: stu.id,
      parentId: parent.id,
      openId: openid,
      relation: relation || '',
      nickName: nickName || '',
      avatar: avatar || '',
      schoolId: stu.teacherId || '', // teacherId 实为租户键，跨校家长仍以 StudentParent.schoolId 聚合
      classId: stu.classId,
    })

    // 首次绑定时同步 Student.parentId（兼容旧逻辑）
    if (needsUpdateStudentParentId && !stu.parentId) {
      stu.parentId = parent.id
      await this.studentRepo.save(stu)
    }

    // 审计日志
    const teacher = await this.users.findById(stu.teacherId).catch(() => null)
    await this.auditService.log(teacher?.schoolId || stu.teacherId, 'bind_parent', openid, stu.studentNo, '绑定家长微信').catch(() => {})

    // 返回该 openid 关联的所有学生（跨班跨校多娃）
    const allBindings = await this.studentParentSvc.listByOpenid(openid)
    const allStudentIds = allBindings.map(b => b.studentId)
    const kids = allStudentIds.length
      ? await this.studentRepo.find({ where: { id: In(allStudentIds) } })
      : []
    const pn = parent.parentName || '家长'
    const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
    return {
      role: 'parent',
      token: this.jwt.sign({ sub: pim, type: 'parent', parentId: parent.id, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo }),
      parentId: parent.id,
      kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })),
      needsBind: false,
    }
  }

  /** 微信统一绑定：输入教师编号或学生学号，自动判别身份 */
  async bindByNumber(code: string, number: string, nickName?: string, password?: string, avatar?: string, relation?: string) {
    if (!code || !number) throw new BadRequestException('参数不全')
    const { openid } = await this.wechat.code2Session(code)
    // 尝试按教师编号查找
    const user = await this.users.findByTeacherNo(number)
    if (user) {
      throw new BadRequestException('教师不支持微信登录，请使用账号密码登录')
    }
    // 尝试按学号查找（家长绑定）
    const stu = await this.findStudentByNoForLogin(number)
    if (stu) {
      if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权')
      // 校验家长密码：未初始化时禁止绑定，避免仅凭学号接管家长身份
      if (!stu.parentPasswordHash) {
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      }
      if (!password) throw new UnauthorizedException('绑定需要家长密码')
      const { valid, newHash } = verifyAndUpgrade(password, stu.parentPasswordHash)
      if (!valid) throw new UnauthorizedException('家长密码错误')
      if (newHash) {
        stu.parentPasswordHash = newHash
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
      } else if (nickName && parent.nickName !== nickName) {
        parent.nickName = nickName
        await this.parentRepo.save(parent)
      }
      // 写入 StudentParent 关联表
      const { needsUpdateStudentParentId } = await this.studentParentSvc.bind({
        studentId: stu.id,
        parentId: parent.id,
        openId: openid,
        relation: relation || '',
        nickName: nickName || '',
        avatar: avatar || '',
        schoolId: stu.teacherId || '',
        classId: stu.classId,
      })
      if (needsUpdateStudentParentId && !stu.parentId) {
        stu.parentId = parent.id
        await this.studentRepo.save(stu)
      }
      // 审计日志
      const t = await this.users.findById(stu.teacherId).catch(() => null)
      await this.auditService.log(t?.schoolId || stu.teacherId, 'bind_parent', openid, stu.studentNo, '绑定家长微信').catch(() => {})
      const pn = parent.parentName || '家长'
      const pim = parentImUserId({ studentId: stu.id, relation: '家长', parentName: pn })
      const allBindings = await this.studentParentSvc.listByOpenid(openid)
      const allStudentIds = allBindings.map(b => b.studentId)
      const kids = allStudentIds.length
        ? await this.studentRepo.find({ where: { id: In(allStudentIds) } })
        : []
      return { role: 'parent', token: this.jwt.sign({ sub: pim, type: 'parent', parentId: parent.id, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: number }), parentId: parent.id, kids: kids.map(k => ({ studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId })), needsBind: false }
    }
    throw new BadRequestException('未找到对应的教师或学生信息，请确认编号是否正确')
  }
}
