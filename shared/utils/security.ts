/**
 * 安全常量（跨端共享）
 *
 * 来源对齐：
 *   - web-app/src/api/request.ts (行 67): 字面量正则判断 401 失效
 *   - mini-project/src/common/request.js (行 119): 字面量正则判断 401 失效
 *
 * 同一份正则定义，避免两端漂移。当后端新增/修改失效提示文案时只改一处。
 */

/** 后端返回的「会话失效」提示文案匹配正则 */
export const SESSION_INVALID_PATTERNS =
  /登录已过期|未登录|缺少令牌|账号已禁用|登录已关闭|账号已被禁用/

/** 字符串是否命中会话失效模式 */
export function isSessionInvalid(msgText: string): boolean {
  return SESSION_INVALID_PATTERNS.test(msgText)
}
