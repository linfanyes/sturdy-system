/**
 * 鉴权状态重置事件总线（用于打破 request.js ↔ store.js 的 circular chunk）。
 *
 * request.js 在 401 会话失效时只负责清 storage 与发事件；
 * store.js 通过 onAuthReset 注册回调，在收到事件时重置 reactive 状态。
 * 两者不直接互相引用，从而打破循环依赖。
 */

const listeners = []

export function onAuthReset(cb) {
  listeners.push(cb)
}

export function emitAuthReset() {
  for (const cb of listeners) {
    try { cb() } catch (e) { console.error('[auth-reset]', e) }
  }
}
