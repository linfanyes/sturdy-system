/**
 * 按用户隔离的 localStorage 工具
 *
 * 设计目标:
 * 1. 不同登录老师的数据互不共享 (AI Key / 班级 / 学生 / 成绩 等)
 * 2. 老师登出后, 其数据保留, 下次登录自动恢复
 * 3. 同一台电脑多人轮换使用, 不会泄露信息
 *
 * 存储 key 格式:
 *   trace.{userId}.{base}
 *   - 未登录时退化为 trace.public.{base} (登录页 / 注册页使用)
 *
 * 调用方式 (在任何数据 store 中):
 *   import { getStorageKey, onUserChange, getCurrentUserId } from '../utils/storage'
 *   const KEY = () => getStorageKey('class')        // 函数式, 始终使用最新 user
 *   watch(state, () => localStorage.setItem(KEY(), JSON.stringify(state)))
 *   onUserChange(() => { state.value = load() })   // 用户切换时重新加载
 */

let _currentUserId: string | null = null
const _subscribers = new Set<() => void>()

/** 设置当前用户 ID; 传入 null 表示未登录 (登录页 / 登出后) */
export function setCurrentUserId(id: string | null) {
  if (_currentUserId === id) return
  _currentUserId = id
  // 同步通知所有订阅者
  for (const cb of _subscribers) {
    try {
      cb()
    } catch (e) {
      console.warn('[storage] user-change callback error:', e)
    }
  }
}

/** 获取当前用户 ID; 未登录返回 null */
export function getCurrentUserId(): string | null {
  return _currentUserId
}

/**
 * 根据当前用户生成 localStorage key
 * - 已登录: trace.{userId}.{base}
 * - 未登录: trace.public.{base}
 */
export function getStorageKey(base: string): string {
  return _currentUserId
    ? `trace.${_currentUserId}.${base}`
    : `trace.public.${base}`
}

/**
 * 订阅用户切换事件 (登录/登出/切换账号时触发)
 * @param cb 回调函数
 * @returns 取消订阅的函数
 */
export function onUserChange(cb: () => void): () => void {
  _subscribers.add(cb)
  return () => {
    _subscribers.delete(cb)
  }
}

/**
 * 兼容工具: 把一份旧的全局 key (如 'trace-class') 迁移到当前用户的 key
 * 仅在第一次为该用户加载时执行一次
 *
 * 用法:
 *   const data = migrateLegacyKey('class', defaultValue)
 *   - 若 trace.{userId}.class 存在: 返回它
 *   - 否则若 trace.class 存在: 把数据迁移到 trace.{userId}.class 后返回
 *   - 否则返回 defaultValue
 */
export function migrateLegacyKey<T>(base: string, fallback: T): T {
  const userKey = getStorageKey(base)
  try {
    const raw = localStorage.getItem(userKey)
    if (raw) return JSON.parse(raw) as T
    // 未找到用户 key, 尝试旧 key
    const legacyRaw = localStorage.getItem(`trace.${base}`)
    if (legacyRaw) {
      const data = JSON.parse(legacyRaw) as T
      // 迁移到新 key
      localStorage.setItem(userKey, JSON.stringify(data))
      // 清理旧 key (避免占用空间)
      localStorage.removeItem(`trace.${base}`)
      return data
    }
  } catch (e) {
    /* noop */
  }
  return fallback
}
