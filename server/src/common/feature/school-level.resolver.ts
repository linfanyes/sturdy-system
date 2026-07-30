import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { School } from '../../school/school.entity'
import { FeatureLevelResolver, FeatureContext } from './level-resolver.interface'

/**
 * 学校级解析器（order = 10，优先级最高）。
 * 读取 School.featureFlags：
 * - null / []  → 返回 null（不收窄，学校级未限制）
 * - 非空数组  → 返回该数组（学校级仅开放这些 key，下级即使开启也失效）
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
    if (!flags || flags.length === 0) return null
    return flags
  }
}
