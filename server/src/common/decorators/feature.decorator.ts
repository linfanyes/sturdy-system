import { SetMetadata } from '@nestjs/common'

/**
 * 标记「面向 teacher / parent 的功能包业务端点」所需的功能包 key。
 * 配合 JwtAuthGuard + FeatureGuard 使用：FeatureGuard 读取此处元数据，
 * 调用 FeatureService 计算当前用户的有效功能包集合，未命中则抛 403。
 *
 * 用法（类级或方法级均可，方法级优先）：
 *   @Feature('games')
 *   @UseGuards(JwtAuthGuard, FeatureGuard)
 *   @Post('start')
 *   start() {}
 *
 * 注意：
 * - /admin/*、/school-admin/* 等管理端点【不要】标注 @Feature，
 *   否则学校级关闭某 key 时会误伤超管/校管（超管/校管在 guard 中 effective=ALL，本不会被拦，
 *   但为避免语义歧义与未来调整风险，管理端点保持不标）。
 * - DEMO_MODE 不禁用后端 @Feature 校验（安全红线）。
 */
export const Feature = (...features: string[]) => SetMetadata('features', features)
