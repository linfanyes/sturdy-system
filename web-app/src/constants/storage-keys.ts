/**
 * 统一 Storage Key 常量
 * P2修复：集中管理所有 localStorage key，避免散落在各文件中难以维护
 */

// 鉴权相关
export const TOKEN_KEY = 'trace_web_token'
export const USER_KEY = 'trace_web_user'
export const MULTI_ROLE_KEY = 'trace_web_multi_role'

// 登录偏好
export const LOGIN_AVATAR_KEY = 'g_login_avatar'
export const LOGIN_RECENT_KEY = 'g_login_recent'

// 学生/班级缓存
export const CLASSES_CACHE_KEY = 'g_classes'

// 无障碍
export const FONT_SCALE_KEY = 'fontScale'

// 游戏高分
export const GAME_HIGHSCORE_PREFIX = 'web_game_'

// 工具存储
export const KIDS_CODING_LOCAL_KEY = 'kids-coding-local'
export const KIDS_CODING_PRACTICE_KEY = 'kids-coding-practice-local'
