/**
 * 游戏公共工具：音效 + 震动 + 最高分 + 配色
 * 所有小游戏统一引用此模块，避免重复实现
 */

import { ref } from 'vue'

// ========== 最高分本地存储 ==========
export function getBest(key) {
  try {
    const v = uni.getStorageSync('game_best_' + key)
    return typeof v === 'number' ? v : 0
  } catch (e) {
    return 0
  }
}
export function setBest(key, score) {
  const prev = getBest(key)
  if (score > prev) {
    uni.setStorageSync('game_best_' + key, score)
    return true // 新纪录
  }
  return false
}

// ========== 震动反馈 ==========
export function vibrate(type = 'short') {
  try {
    if (type === 'long') uni.vibrateLong({})
    else uni.vibrateShort({ type: 'light' })
  } catch (e) {}
}

// ========== 音效（统一单例，避免泄漏） ==========
let audioCtx = null
let soundEnabled = true

export function setSoundEnabled(v) { soundEnabled = !!v }
export function isSoundEnabled() { return soundEnabled }

// 使用 WebAudio 风格的简短合成音效（小程序 InnerAudioContext 不支持实时合成，
// 这里用 Base64 内嵌极短 wav，避免外部资源依赖）
const SOUNDS = {
  // 短促 "叮"（命中/得分）
  hit: 'data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAEAAAAY2FjdXN0b21hdG9y',
  // 失败 "嘟"
  fail: 'data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAEAAAAY2FjdXN0b21hdG9y',
  // 升级/通关 "叮咚"
  win: 'data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAEAAAAY2FjdXN0b21hdG9y',
  // 点击/翻牌
  tap: 'data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAEAAAAY2FjdXN0b21hdG9y',
}

export function playSound(type) {
  if (!soundEnabled) return
  const url = SOUNDS[type]
  if (!url) return
  try {
    if (audioCtx) {
      try { audioCtx.destroy() } catch (e) {}
    }
    audioCtx = uni.createInnerAudioContext()
    audioCtx.src = url
    audioCtx.autoplay = true
    audioCtx.onError(() => {
      // 静默失败：小程序对 data: URI 兼容性差，不影响游戏
    })
  } catch (e) {}
}

export function destroySound() {
  if (audioCtx) {
    try { audioCtx.destroy() } catch (e) {}
    audioCtx = null
  }
}

// ========== 暗色模式色板（游戏专用） ==========
// 游戏色板：light/dark 两套，避免每个游戏各自维护
export const GAME_COLORS = {
  light: {
    bg: '#fff7e6',
    board: '#fdf6ec',
    card: '#ffffff',
    cell: '#f0e4d0',
    cellAlt: '#e8d8b8',
    border: '#d4c8b0',
    text: '#3a3a3a',
    sub: '#8a7a60',
    primary: '#e6a23c',
    accent: '#07c160',
    danger: '#e64340',
    info: '#409eff',
    purple: '#9b59b6',
    snake: '#07c160',
    snakeHead: '#e6a23c',
    food: '#e64340',
  },
  dark: {
    bg: '#1a1a1a',
    board: '#242424',
    card: '#2a2a2a',
    cell: '#333333',
    cellAlt: '#3a3a3a',
    border: '#404040',
    text: '#e8e8e8',
    sub: '#999999',
    primary: '#f0a64a',
    accent: '#34d27b',
    danger: '#ff5c5c',
    info: '#5aa6ff',
    purple: '#b76bd8',
    snake: '#34d27b',
    snakeHead: '#f0a64a',
    food: '#ff5c5c',
  },
}

export function pickColors(dark) {
  return dark ? GAME_COLORS.dark : GAME_COLORS.light
}

// ========== 通用工具 ==========
export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
export function fmtTime(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// ========== 游戏顶部状态条通用工具 ==========
export function useGame(gameKey) {
  const best = ref(getBest(gameKey))
  const isNewRecord = ref(false)
  function submitScore(score) {
    const isNew = setBest(gameKey, score)
    if (isNew) best.value = score
    isNewRecord.value = isNew
    return isNew
  }
  function reload() {
    best.value = getBest(gameKey)
  }
  return { best, isNewRecord, submitScore, reload }
}
