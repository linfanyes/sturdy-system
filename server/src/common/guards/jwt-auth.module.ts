import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from './jwt-auth.guard'
import { User } from '../../users/user.entity'
import { SchoolAdmin } from '../../school-admin/school-admin.entity'
import { Student } from '../../students/student.entity'

/**
 * 全局 JWT 守卫模块。
 * 为 JwtAuthGuard 提供用户/校管/学生仓储，使守卫能按角色校验账号启用状态
 * （账号被禁用后已签发令牌立即失效，而非等到过期）。
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, SchoolAdmin, Student])],
  providers: [JwtAuthGuard],
  // 导出守卫及其依赖的仓储，使在任意模块通过 @UseGuards(JwtAuthGuard) 实例化
  // 守卫时（守卫构造依赖 User/SchoolAdmin/Student 仓储）都能从全局解析到这些仓储。
  exports: [JwtAuthGuard, TypeOrmModule.forFeature([User, SchoolAdmin, Student])],
})
export class JwtAuthModule {}
