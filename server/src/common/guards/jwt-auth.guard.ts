import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../users/user.entity'
import { SchoolAdmin } from '../../school-admin/school-admin.entity'
import { Student } from '../../students/student.entity'

/**
 * 统一 JWT 守卫（不依赖 passport，减少依赖）。
 * 校验 Authorization: Bearer <token>，把完整 payload 挂到 req.user，
 * 并统一 role 字段（家长令牌 type='parent' → role='parent'），
 * 使 @CurrentTeacher / @CurrentSchoolAdmin / @CurrentParent 装饰器均可直接读取所需字段。
 *
 * 同时按角色校验账号启用状态：
 * - teacher / school_admin：enabled=false 立即拒绝（令牌失效不再等待过期）；
 * - parent：学生不存在或家长登录被关闭时拒绝。
 *
 * 使用方法（方法级 @Roles() 标注所需角色，未标注则不校验角色）：
 *   @Roles('teacher') / @Roles('super') / @Roles('school_admin') / @Roles('parent')
 *   @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SchoolAdmin) private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或缺少令牌')
    }
    const token = auth.slice(7)
    let payload: any
    try {
      payload = this.jwt.verify(token)
    } catch (e: any) {
      // S05修复：不再记录token前缀，避免敏感信息泄露到日志
      if (process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line no-console
        console.warn('[JWT] 校验失败:', e?.message?.slice(0, 100))
      }
      throw new UnauthorizedException('登录已过期，请重新登录')
    }

    // 统一 role：家长令牌用 type='parent'，映射为 role='parent' 便于 @Roles 校验
    const role = payload.role || (payload.type === 'parent' ? 'parent' : undefined)
    req.user = { ...payload, role }

    // 校验账号启用状态：禁用/删除后令牌立即失效（JWT 本身无状态，这里按角色查库）
    await this.assertAccountActive(role, payload)

    // 检查 @Roles 注解（使用 Reflector 读取类/方法上的元数据）
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])
    if (requiredRoles && requiredRoles.length > 0) {
      if (!role || !requiredRoles.includes(role)) {
        throw new UnauthorizedException('权限不足')
      }
    }

    return true
  }

  /** 按角色校验账号启用状态；状态未知时宁拒绝不放行 */
  private async assertAccountActive(role: string | undefined, payload: any): Promise<void> {
    try {
      if (role === 'teacher') {
        const u = await this.userRepo.findOne({ where: { id: payload.sub } })
        if (!u || u.enabled === false) {
          throw new UnauthorizedException('账号已被禁用，请联系学校管理员')
        }
      } else if (role === 'school_admin') {
        const a = await this.saRepo.findOne({ where: { id: payload.sub } })
        if (!a || a.enabled === false) {
          throw new UnauthorizedException('账号已被禁用，请联系超级管理员')
        }
      } else if (role === 'parent') {
        if (payload.studentId) {
          const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
          if (!stu || stu.parentLoginEnabled === false) {
            throw new UnauthorizedException('家长登录已关闭或学生不存在')
          }
        }
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e
      throw new UnauthorizedException('账号状态校验失败，请重新登录')
    }
  }
}
