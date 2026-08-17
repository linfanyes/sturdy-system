/**
 * 安全常量（跨端共享）
 *
 * 来源对齐：
 *   - web-app/src/api/request.ts (行 67): 字面量正则判断 401 失效
 *   - mini-project/src/common/request.js (行 119): 字面量正则判断 401 失效
 *
 * 同一份正则定义，避免两端漂移。当后端新增/修改失效提示文案时只改一处。
 *
 * 注意：后端 JwtAuthGuard 中"权限不足"也返回 401，但这代表角色不匹配而非会话失效，
 * 不应触发登出。正则需精确匹配"真·会话失效"文案，排除"权限不足"。
 *
 * 后端 JwtAuthGuard 返回的 401 文案：
 *   真·会话失效（应清除登录态）：
 *     - '未登录或缺少令牌'
 *     - '登录已过期，请重新登录'
 *     - '令牌类型不匹配'
 *     - '账号已被禁用，请联系学校管理员'
 *     - '账号已被禁用，请联系超级管理员'
 *     - '家长登录已关闭或学生不存在'
 *     - '账号状态校验失败，请重新登录'
 *   伪·会话失效（角色不匹配，不应清登录态）：
 *     - '权限不足'
 */

/**
 * 后端返回的「会话失效」提示文案匹配正则。
 * P1-11修复：
 *   - "未登录" 改为精确前缀匹配，避免误匹配 "用户未登录，请注册账号" 等非会话失效场景
 *   - 移除重复的 "账号已禁用"（已被 "账号已被禁用" 覆盖）
 *   - 添加排除 "权限不足"（角色不匹配，不应触发登出）
 */
export const SESSION_INVALID_PATTERNS =
  /登录已过期|缺少令牌|令牌类型不匹配|账号已被禁用|登录已关闭|账号状态校验失败|^未登录(?!.*注册)/

/** 排除模式：匹配到这些时不视为会话失效 */
const SESSION_INVALID_EXCLUDES = /权限不足/

/** 字符串是否命中会话失效模式（排除误匹配场景） */
export function isSessionInvalid(msgText: string): boolean {
  if (SESSION_INVALID_EXCLUDES.test(msgText)) return false
  return SESSION_INVALID_PATTERNS.test(msgText)
}
