import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { School } from '../../school/school.entity'
import { Student } from '../../students/student.entity'
import { User } from '../../users/user.entity'
import { ClassItem } from '../../classes/class.entity'
import { FeatureService, FEATURE_RESOLVERS } from './feature.service'
import { FeatureGuard } from './feature.guard'
import { SchoolLevelResolver } from './school-level.resolver'
import { TeacherLevelResolver } from './teacher-level.resolver'
import { ClassMembersModule } from '../../class-members/class-members.module'

/**
 * 功能包模块（全局）。
 * - 提供 FeatureService（计算 effectiveFeatures / 构建档案）与 FeatureGuard。
 * - 通过 FEATURE_RESOLVERS 令牌注入「有序层级链」，将来插入 ProjectLevelResolver 只需在此追加。
 * - 导入 ClassMembersModule：家长功能包需解析孩子班级所有教师（班主任+科任）的 features 并集。
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([School, Student, User, ClassItem]),
    ClassMembersModule,
  ],
  providers: [
    FeatureService,
    FeatureGuard,
    SchoolLevelResolver,
    TeacherLevelResolver,
    {
      provide: FEATURE_RESOLVERS,
      useFactory: (school: SchoolLevelResolver, teacher: TeacherLevelResolver) =>
        [school, teacher].sort((a, b) => a.order - b.order),
      inject: [SchoolLevelResolver, TeacherLevelResolver],
    },
  ],
  exports: [FeatureService, FeatureGuard],
})
export class FeatureModule {}
