import { SetMetadata } from '@nestjs/common'

/**
 * 标记控制器或方法所需的角色。
 * 配合 JwtAuthGuard 使用，在 jwt-auth.guard.ts 中通过 Reflector 读取。
 *
 * 用法：
 *   @Roles('teacher')
 *   @UseGuards(JwtAuthGuard)
 *   export class MyController {}
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
