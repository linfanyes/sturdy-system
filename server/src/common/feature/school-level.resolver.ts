import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { School } from '../../school/school.entity'
import { FeatureLevelResolver, FeatureContext } from './level-resolver.interface'
import { FEATURE_FLAGS, OPT_IN_FEATURES } from './feature-flags.constants'

/**
 * 学校级解析器（order = 10，优先级最高）。
 * 读取 School.featureFlags：
 * - null / []  → 返回「全部功能包 减去 默认关闭(opt-in)类」，即 opt-in 功能（如少儿编程）默认不开放
 * - 非空数组  → 返回该数组（学校级仅开放这些 key，下级即使开启也失效；含 opt-in key 即视为已显式开启）
 */
@Injectable()
export class SchoolLevelResolver implements FeatureLevelResolver {
  readonly order = 10

  constructor(
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
  ) {}

  async resolve(ctx: FeatureContext): Promise<string[] | null> {
    if (!ctx.schoolId) return null
    const school = await this.schoolRepo.findOne({ where: { id: ctx.schoolId } })
    const flags = school?.featureFlags
    if (!flags || flags.length === 0) {
      // 未显式配置：默认关闭 opt-in 类功能，其余全开
      return FEATURE_FLAGS.filter((k) => !OPT_IN_FEATURES.includes(k))
    }
    return flags
  }
}
