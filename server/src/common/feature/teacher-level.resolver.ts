import { Injectable } from '@nestjs/common'
import { FeatureLevelResolver, FeatureContext } from './level-resolver.interface'

/**
 * 教师级解析器（order = 20）。
 * 读取 ctx.teacherFeatures（来自 User.features，或家长端经其子教师归属）：
 * - null / []  → 返回 null（不收窄，教师级全部可用）
 * - 非空数组  → 返回该数组（教师级仅开放这些 key）
 *
 * 说明：本解析器不查库，直接消费已解析到 ctx 的 teacherFeatures，
 *       保证层级链可插拔且解耦。
 */
@Injectable()
export class TeacherLevelResolver implements FeatureLevelResolver {
  readonly order = 20

  async resolve(ctx: FeatureContext): Promise<string[] | null> {
    if (!ctx.teacherFeatures || ctx.teacherFeatures.length === 0) return null
    return ctx.teacherFeatures
  }
}
