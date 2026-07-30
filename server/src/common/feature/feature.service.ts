import { Injectable, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../users/user.entity'
import { Student } from '../../students/student.entity'
import { School } from '../../school/school.entity'
import { FEATURE_FLAGS } from '@gardener/shared/constants'
import { FeatureLevelResolver, FeatureContext } from './level-resolver.interface'

/** 层级解析器注入令牌（便于将来插入 ProjectLevelResolver 等而不返工） */
export const FEATURE_RESOLVERS = Symbol('FEATURE_RESOLVERS')

/** 功能档案：用于登录响应 / GET /auth/me，前端据此做 UX 显隐与「有效权限预览」 */
export interface FeatureProfile {
  role: 'super' | 'school_admin' | 'teacher' | 'parent'
  schoolId?: string
  /** 原始配置：教师级 User.features；超管/校管为 '*'；家长为孩子教师 features */
  rawFeatures: string[] | '*' | null
  /** 该校 School.featureFlags（超管/校管为 null） */
  schoolFeatureFlags: string[] | null
  /** 学校级 ∩ 教师级 实际可用 key */
  effectiveFeatures: string[]
}

/**
 * 功能包解析服务（@Global）。
 *
 * 核心算法：
 * 1) super / school_admin → 全开（ALL）。后端 @Feature 校验永不为其返回 403（安全红线：学校级开关只影响 teacher/parent）。
 * 2) teacher / parent    → 走「有序层级链交集」：
 *      effective = FEATURE_FLAGS 依次与各级 resolver 返回集合取交集；
 *      某级返回 null/[] 表示不收窄（全开），上级(学校级)关闭的 key 下级无法补回。
 * 3) parent 解析链路：studentId → Student.teacherId（继承 BaseEntity 的租户键）→ User，
 *      复用「孩子所在教师 features + 该校 featureFlags」走同一层级链（school ∩ teacher）。
 */
@Injectable()
export class FeatureService {
  private readonly allFeatures: string[]
  private readonly allSet: Set<string>

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @Inject(FEATURE_RESOLVERS) private readonly resolvers: FeatureLevelResolver[],
  ) {
    this.allFeatures = FEATURE_FLAGS
    this.allSet = new Set(FEATURE_FLAGS)
  }

  /**
   * 把 JWT payload（req.user）转换为 FeatureContext。
   * - super / school_admin → 仅 role（getEffectiveFeatures 直接返回 ALL）
   * - teacher             → 加载 User 取得 schoolId + features
   * - parent              → studentId → Student.teacherId → User，取得学校级与教师级上下文
   */
  async resolveContextFromReq(user: any): Promise<FeatureContext> {
    const role = user?.role
    if (role === 'super' || role === 'school_admin') return { role }
    if (role === 'teacher') {
      const u = await this.userRepo.findOne({ where: { id: user.sub } })
      return {
        role: 'teacher',
        schoolId: u?.schoolId ?? undefined,
        teacherFeatures: u?.features ?? null,
      }
    }
    if (role === 'parent') {
      const stu = await this.studentRepo.findOne({ where: { id: user.studentId } })
      if (!stu?.teacherId) return { role: 'parent' }
      const teacher = await this.userRepo.findOne({ where: { id: stu.teacherId } })
      return {
        role: 'parent',
        schoolId: teacher?.schoolId ?? undefined,
        teacherFeatures: teacher?.features ?? null,
      }
    }
    return { role: (role as FeatureContext['role']) ?? 'teacher' }
  }

  /** 计算有效功能包集合（核心算法） */
  async getEffectiveFeatures(ctx: FeatureContext): Promise<string[]> {
    if (ctx.role === 'super' || ctx.role === 'school_admin') return [...this.allFeatures]
    let effective = new Set(this.allSet)
    for (const resolver of this.resolvers) {
      const allowed = await resolver.resolve(ctx)
      if (!allowed) continue // null/[] 表示该级不收窄
      const allowedSet = new Set(allowed)
      effective = new Set([...effective].filter((k) => allowedSet.has(k)))
    }
    return [...effective]
  }

  /**
   * 构建功能档案，用于登录响应注入与 GET /auth/me 返回。
   * @param input login 时已具备 role + 可选 schoolId/teacherFeatures/studentId
   */
  async buildProfile(input: {
    role: 'super' | 'school_admin' | 'teacher' | 'parent'
    schoolId?: string
    teacherFeatures?: string[] | null
    studentId?: string
  }): Promise<FeatureProfile> {
    let ctx: FeatureContext
    if (input.role === 'teacher') {
      ctx = { role: 'teacher', schoolId: input.schoolId, teacherFeatures: input.teacherFeatures ?? null }
    } else if (input.role === 'parent') {
      ctx = await this.resolveContextFromReq({ role: 'parent', studentId: input.studentId })
    } else {
      ctx = { role: input.role }
    }

    const effectiveFeatures = await this.getEffectiveFeatures(ctx)

    let schoolFeatureFlags: string[] | null = null
    if (ctx.schoolId) {
      const school = await this.schoolRepo.findOne({ where: { id: ctx.schoolId } })
      schoolFeatureFlags = school?.featureFlags ?? null
    }

    const rawFeatures: string[] | '*' | null =
      input.role === 'teacher' || input.role === 'parent'
        ? (ctx.teacherFeatures ?? null)
        : input.role === 'super' || input.role === 'school_admin'
          ? '*'
          : null

    return {
      role: input.role,
      schoolId: ctx.schoolId,
      rawFeatures,
      schoolFeatureFlags,
      effectiveFeatures,
    }
  }
}
