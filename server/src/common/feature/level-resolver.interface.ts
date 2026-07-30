/**
 * 功能包解析层级接口（可插拔有序层级链）。
 *
 * 设计目标：本期实现「学校级 > 教师级」两级解析；将来若加入「项目级」，
 * 只需新增一个实现本接口的 Resolver（如 ProjectLevelResolver，设定合适的 order），
 * 注册进 FeatureModule 即可，无需改动已有逻辑（开闭原则）。
 *
 * 解析语义（与历史约定一致）：
 * - 返回 null / undefined / 空数组  → 该层级「不收窄」，即对全部功能包放行（无限制）。
 * - 返回非空数组                → 该层级仅允许数组内的包级 key（交集时用于收窄）。
 */
export interface FeatureLevelResolver {
  /** 层级序号：数值越小优先级越高（越先参与交集）。学校级=10，教师级=20。 */
  readonly order: number

  /**
   * 解析当前层级允许的功能包 key 集合。
   * @param ctx 功能上下文（含 role / schoolId / teacherFeatures / studentId）
   * @returns 允许集合（null=不收窄）或具体 key 数组
   */
  resolve(ctx: FeatureContext): Promise<string[] | null>
}

/** 功能上下文：由 JWT payload 经 FeatureService.resolveContextFromReq 归一化得到 */
export interface FeatureContext {
  role: 'super' | 'school_admin' | 'teacher' | 'parent'
  /** 学校 ID（教师/家长经其子教师归属学校） */
  schoolId?: string
  /** 教师级已配置的功能包（User.features），null/[] = 全部 */
  teacherFeatures?: string[] | null
  /** 家长端选中孩子的 studentId（用于解析其教师） */
  studentId?: string
}
