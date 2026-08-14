import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Student } from '../students/student.entity'
import { Parent } from '../parent/parent.entity'
import { ImService } from '../im/im.module'
import { parentImUserId } from '../im/parent-im.util'
import { WechatService } from '../auth/wechat.service'
import { hashPassword, verifyAndUpgrade } from '../common/utils/password.util'
import { StudentParentService } from '../student-parent/student-parent.module'
import { ParentQueryService } from './parent-query.service'
import { FeatureService } from '../common/feature/feature.service'
import { isStudentNo } from '@gardener/shared/validators'

/**
 * 家长端：登录相关 + 协调逻辑。
 * 只读查询已拆分至 ParentQueryService，本类专注于认证/绑定/角色切换等非查询能力。
 *
 * 多娃支持：通过 StudentParent 关联表查询某 openid/parentId 绑定的所有学生，
 * 支持跨班跨校。回退兼容旧数据（Student.parentId）。
 */
@Injectable()
export class ParentAuthService {
  constructor(
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly jwt: JwtService,
    private readonly im: ImService,
    private readonly config: ConfigService,
    private readonly wechat: WechatService,
    private readonly studentParentSvc: StudentParentService,
    private readonly query: ParentQueryService,
    private readonly feature: FeatureService,
  ) {}

  /** 计算某学生的家长有效功能包（应用班主任「家长功能包」显式配置，失败时回退空=不限制） */
  private async computeEffectiveFeatures(studentId: string): Promise<string[]> {
    try {
      const ctx = await this.feature.resolveContextFromReq({ role: 'parent', studentId })
      return await this.feature.getEffectiveFeatures(ctx)
    } catch {
      return []
    }
  }

  /** 学号 + 密码登录 */
  async login(studentNo: string, password: string) {
    // 缺陷修复：原先仅允许纯数字学号，但学号管理/统一登录允许字母数字（isStudentNo: [A-Za-z0-9]{2,32}），
    // 导致字母学号的学生家长无法从小程序专用登录页登录（跨端不一致）。统一采用共享校验器口径。
    if (!studentNo || !isStudentNo(studentNo.trim()) || studentNo.trim().length < 2)
      throw new BadRequestException('请输入正确的学号')
    if (!password) throw new BadRequestException('请输入密码')
    const no = studentNo.trim()
    const stu = await this.query.findStudentByNoForLogin(no)
    if (!stu) throw new BadRequestException('未找到该学号对应的学生，请检查学号是否正确')
    if (!stu.parentLoginEnabled) throw new BadRequestException('该学生家长登录尚未被老师授权，请联系老师开启')

    const hash = stu.parentPasswordHash
    let passwordOk = false
    if (hash) {
      const { valid, newHash } = verifyAndUpgrade(password, hash)
      passwordOk = valid
      if (valid && newHash) {
        stu.parentPasswordHash = newHash
        await this.studentRepo.save(stu)
      }
    }
    if (!passwordOk) {
      if (!hash)
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      throw new UnauthorizedException('密码错误')
    }

    const parentName = stu.parentName || '家长'
    const imUserId = parentImUserId({ studentId: stu.id, relation: '家长', parentName })
    const token = this.jwt.sign({
      sub: imUserId,
      type: 'parent',
      aud: 'parent',
      parentId: stu.parentId || undefined,
      studentId: stu.id,
      studentName: stu.name,
      classId: stu.classId,
      studentNo: no,
    })
    // 家长功能包：登录时一并下发，双端家长页据此做页面显隐（班主任可配置班级家长功能包）
    const effectiveFeatures = await this.computeEffectiveFeatures(stu.id)
    return {
      token,
      effectiveFeatures,
      parent: { imUserId, studentId: stu.id, studentName: stu.name, classId: stu.classId, studentNo: no, effectiveFeatures },
    }
  }

  /** 家长修改自己的登录密码（需已登录） */
  async changePassword(payload: any, oldPassword: string, newPassword: string) {
    if (!oldPassword) throw new BadRequestException('请输入原密码')
    if (!newPassword || newPassword.length < 8)
      throw new BadRequestException('新密码至少 8 位')
    const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
    if (!stu) throw new BadRequestException('学生不存在')

    const hash = stu.parentPasswordHash
    let oldOk = false
    if (hash) {
      oldOk = verifyAndUpgrade(oldPassword, hash).valid
    }
    if (!oldOk) {
      if (!hash)
        throw new BadRequestException('家长密码尚未初始化，请联系老师重新开启家长登录以设置密码')
      throw new UnauthorizedException('原密码错误')
    }

    stu.parentPasswordHash = hashPassword(newPassword)
    await this.studentRepo.save(stu)
    return { ok: true }
  }

  /** 当前家长信息 + 全量 kids（跨班跨校）+ 微信绑定信息 */
  async getMe(payload: any) {
    const parent = await this.parentRepo.findOne({ where: { id: payload.parentId } })
    if (!parent) return null

    const kids = await this.query.findKids(payload.parentId)
    const activeKid = kids.find(k => k.id === payload.studentId) || kids[0] || null
    if (!activeKid) return null

    const myBindings = parent.openId
      ? await this.studentParentSvc.listByOpenid(parent.openId)
      : []

    // 家长功能包：当前激活孩子对应的有效功能（班主任可配置班级家长功能包）
    const effectiveFeatures = await this.computeEffectiveFeatures(activeKid.id)

    return {
      parentName: parent.parentName || '家长',
      studentId: activeKid.id, studentName: activeKid.name, studentNo: activeKid.studentNo,
      classId: activeKid.classId, className: '',
      parentId: parent.id,
      effectiveFeatures,
      studentInfo: {
        name: activeKid.name,
        gender: activeKid.gender,
        birthDate: activeKid.birthDate,
        parentName: activeKid.parentName,
        parentPhone: activeKid.parentPhone,
        studentPhone: activeKid.studentPhone,
        address: activeKid.address,
        note: activeKid.note,
      },
      kids: kids.map(k => ({
        studentId: k.id, studentName: k.name, studentNo: k.studentNo, classId: k.classId,
      })),
      wechat: {
        bound: !!parent.openId,
        nickName: parent.nickName || '',
        openIdTail: parent.openId ? parent.openId.slice(-6) : '',
        bindingCount: myBindings.length,
      },
    }
  }

  /** 切换当前激活的孩子（多娃场景，支持跨班跨校） */
  async switchStudent(payload: any, targetStudentId: string) {
    if (!payload.parentId) throw new ForbiddenException('无家长身份')
    const kids = await this.query.findKids(payload.parentId)
    const target = kids.find(k => k.id === targetStudentId)
    if (!target) throw new ForbiddenException('学生不属于该家长')

    const parent = await this.parentRepo.findOne({ where: { id: payload.parentId } })
    const pn = parent?.parentName || '家长'
    const pim = parentImUserId({ studentId: target.id, relation: '家长', parentName: pn })
    const token = this.jwt.sign({
      sub: pim, type: 'parent', aud: 'parent', parentId: payload.parentId,
      studentId: target.id, studentName: target.name,
      classId: target.classId, studentNo: target.studentNo,
    })
    const effectiveFeatures = await this.computeEffectiveFeatures(target.id)
    return {
      token, effectiveFeatures,
      studentId: target.id, studentName: target.name, studentNo: target.studentNo, classId: target.classId,
    }
  }

  /** 已登录家长绑定微信 */
  async bindWechat(code: string, payload: any, nickName: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const { openid } = await this.wechat.code2Session(code)
    const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
    if (!stu) throw new BadRequestException('学生不存在')

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

    const { needsUpdateStudentParentId } = await this.studentParentSvc.bind({
      studentId: stu.id,
      parentId: parent.id,
      openId: openid,
      nickName: nickName || '',
      schoolId: stu.teacherId || '',
      classId: stu.classId,
    })
    if (needsUpdateStudentParentId && !stu.parentId) {
      stu.parentId = parent.id
    }
    if (nickName) stu.parentNickName = nickName
    await this.studentRepo.save(stu)

    return {
      ok: true,
      nickName,
      openIdTail: openid.slice(-6),
      parentId: parent.id,
    }
  }

  /** 查询当前家长的所有微信绑定信息 */
  async getBindings(payload: any) {
    if (!payload.parentId) return { bindings: [], parent: null }
    const parent = await this.parentRepo.findOne({ where: { id: payload.parentId } })
    if (!parent) return { bindings: [], parent: null }
    const bindings = await this.studentParentSvc.listByParent(payload.parentId)
    return {
      parent: {
        parentName: parent.parentName,
        nickName: parent.nickName || '',
        openIdTail: parent.openId ? parent.openId.slice(-6) : '',
        bound: !!parent.openId,
      },
      bindings: bindings.map(b => ({
        id: b.id,
        studentId: b.studentId,
        openIdTail: b.openId ? b.openId.slice(-6) : '',
        nickName: b.nickName,
        avatar: b.avatar,
        relation: b.relation,
        isPrimary: b.isPrimary,
        classId: b.classId,
        createdAt: b.createdAt,
      })),
    }
  }

  /** 家长订阅微信通知 */
  async subscribe(studentNo: string, code: string) {
    if (!code) return { ok: false, msg: '缺少 code' }
    const stu = await this.studentRepo.findOne({ where: { studentNo } })
    if (!stu) throw new BadRequestException('学生不存在')
    try {
      const { openid: openId } = await this.wechat.code2Session(code)
      return { ok: !!openId, openId: openId || '' }
    } catch (e: unknown) {
      return { ok: false, msg: '订阅请求失败' }
    }
  }

  /** 签发家长 IM UserSig */
  getImUserSig(payload: any) {
    return this.im.getUserSig(payload.sub)
  }
}
