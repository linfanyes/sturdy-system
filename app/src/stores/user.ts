import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { User, TeachingAssignment } from '../types'
import { now, uid } from '../utils'
import { setCurrentUserId, getStorageKey, onUserChange } from '../utils/storage'

const KEY = 'trace-user'
// 任教配置需按登录人隔离: trace.{userId}.teach (函数式, 始终取最新用户)
const TEACH_KEY = () => getStorageKey('teach')
const HISTORY_KEY = 'trace-user-history' // 历史上登录过的老师

interface UserHistory {
  name: string
  subject: string
  subjects: string[]
  term: string
  school: string
  avatar: string
  motto: string
  lastLoginAt: number
}

/**
 * 根据当前日期推断默认学期（首次登录默认值）。
 * 春季学期约为 2-7 月 → 取「当年春季学期」；
 * 秋季学期约为 8-12 月 → 取「当年秋季学期」；
 * 1 月属于上一年度秋季学期。
 * 关键修复：原逻辑在 1-7 月错误地返回「上一年春季学期」，
 * 现改为返回「当年春季学期」，满足首次登录默认当年春季学期的要求。
 */
export function currentTermStr(nowDate = new Date()): string {
  const y = nowDate.getFullYear()
  const m = nowDate.getMonth() + 1
  if (m >= 2 && m <= 7) return `${y}春季学期`
  if (m >= 8) return `${y}秋季学期`
  return `${y - 1}秋季学期`
}

/** 学期下拉选项：当年 + 前三年（每年春/秋），共 8 项；基于当前日期动态生成，每次打开都反映最新年份 */
export function termOptions(nowDate = new Date()): string[] {
  const y = nowDate.getFullYear()
  const out: string[] = []
  // 当年、前一年、前二年、前三年，各春/秋学期（顺序：当年春、当年秋、前一年春…）
  for (let off = 0; off < 4; off++) {
    const baseY = y - off
    out.push(`${baseY}春季学期`)
    out.push(`${baseY}秋季学期`)
  }
  return out
}

/** 把任意学期格式统一为 'YYYY春季学期' / 'YYYY秋季学期' 形式 */
export function normalizeTerm(t?: string | null): string {
  if (!t) return currentTermStr()
  const s = String(t).trim()
  if (!s) return currentTermStr()
  if (s.includes('春季学期') || s.includes('秋季学期')) return s
  // 兼容 '2025-2026-1' / '2025-2026-2' / '2025-2026第1学期' 等
  const m = /^(\d{4})[-/](\d{4})[-_]?(\d)/.exec(s)
  if (m) {
    const y1 = +m[1]
    const y2 = +m[2]
    const termIdx = +m[3]
    // 1 = 上学期(秋), 2 = 下学期(春)
    return `${termIdx === 1 ? y1 : y2}${termIdx === 1 ? '秋季学期' : '春季学期'}`
  }
  // 兼容 '2026 春' / '2026 秋'
  if (/春/.test(s)) {
    const mm = /(\d{4})/.exec(s)
    if (mm) return `${mm[1]}春季学期`
  }
  if (/秋/.test(s)) {
    const mm = /(\d{4})/.exec(s)
    if (mm) return `${mm[1]}秋季学期`
  }
  return s
}

function loadHistory(): UserHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw) || []
  } catch (e) {
    /* noop */
  }
  return []
}

function saveHistory(list: UserHistory[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch (e) {
    /* noop */
  }
}

export function findHistoryByName(name: string): UserHistory | null {
  const list = loadHistory()
  return list.find((h) => h.name === name) || null
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const theme = ref<'light' | 'dark'>('light')
  const colorScheme = ref<'butter' | 'mint' | 'sakura' | 'sky'>('butter')
  const fontSize = ref<'sm' | 'md' | 'lg'>('md')
  const teaching = ref<TeachingAssignment[]>([])

  // 初始化
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw)
      // 规范化历史数据中的学期格式 (兼容 '2025-2026-1' 等)
      if (data.user) {
        data.user.term = normalizeTerm(data.user.term)
      }
      user.value = data.user
      theme.value = data.theme ?? 'light'
    }
    const rawTheme = localStorage.getItem('trace-theme')
    if (rawTheme) theme.value = rawTheme as 'light' | 'dark'
    const rawColor = localStorage.getItem('trace-color')
    if (rawColor) colorScheme.value = rawColor as 'butter' | 'mint' | 'sakura' | 'sky'
    const rawFontSize = localStorage.getItem('trace-fontsize')
    if (rawFontSize) fontSize.value = rawFontSize as 'sm' | 'md' | 'lg'
    // 兼容迁移: 把旧的全局 'trace-teach' 迁到当前用户隔离 key
    const legacyTeach = localStorage.getItem('trace-teach')
    const rawTeach = localStorage.getItem(TEACH_KEY())
    if (rawTeach) teaching.value = JSON.parse(rawTeach) || []
    else if (legacyTeach) teaching.value = JSON.parse(legacyTeach) || []
  } catch (e) {
    console.warn('user init err', e)
  }

  /** 用户切换 (登录/登出/换账号) 时重新加载该用户的任教配置 */
  function reloadTeaching() {
    try {
      const raw = localStorage.getItem(TEACH_KEY())
      teaching.value = raw ? JSON.parse(raw) || [] : []
    } catch (e) {
      teaching.value = []
    }
  }
  onUserChange(() => {
    reloadTeaching()
  })

  function login(
    name: string,
    subject: string,
    avatar: string,
    motto: string,
    extras: { subjects: string[]; term: string; school?: string } = {
      subjects: [],
      term: currentTermStr(),
      school: '',
    },
  ) {
    user.value = {
      id: uid(),
      name,
      subject,
      subjects: extras.subjects && extras.subjects.length ? [...extras.subjects] : subject ? [subject] : [],
      term: extras.term || currentTermStr(),
      school: extras.school || '',
      avatar,
      motto: motto || '用爱浇灌每一颗小苗 🌱',
      createdAt: now(),
    }
    // 同步 userId 到 storage 模块, 触发各 store reload
    if (user.value) setCurrentUserId(user.value.id)
    // 写入历史
    const list = loadHistory().filter((h) => h.name !== name)
    list.unshift({
      name,
      subject,
      subjects: extras.subjects && extras.subjects.length ? [...extras.subjects] : subject ? [subject] : [],
      term: extras.term || currentTermStr(),
      school: extras.school || '',
      avatar,
      motto: motto || '',
      lastLoginAt: now(),
    })
    saveHistory(list.slice(0, 20))
  }

  function update(patch: Partial<User>) {
    if (!user.value) return
    user.value = { ...user.value, ...patch }
    // 同步历史
    const list = loadHistory()
    const i = list.findIndex((h) => h.name === user.value!.name)
    const hist: UserHistory = {
      name: user.value.name,
      subject: user.value.subject,
      subjects: user.value.subjects || (user.value.subject ? [user.value.subject] : []),
      term: user.value.term || currentTermStr(),
      school: user.value.school || '',
      avatar: user.value.avatar,
      motto: user.value.motto,
      lastLoginAt: now(),
    }
    if (i >= 0) list[i] = hist
    else list.unshift(hist)
    saveHistory(list.slice(0, 20))
  }

  function logout() {
    user.value = null
    setCurrentUserId(null)
  }

  function setTheme(t: 'light' | 'dark') {
    theme.value = t
    localStorage.setItem('trace-theme', t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  function setColorScheme(c: 'butter' | 'mint' | 'sakura' | 'sky') {
    colorScheme.value = c
    localStorage.setItem('trace-color', c)
    document.documentElement.setAttribute('data-color', c)
  }

  /** 单按钮切换明亮 / 暗黑模式 */
  function toggleDark() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  /** 主题色按固定顺序循环切换：butter → mint → sakura → sky → butter */
  const COLOR_ORDER: ('butter' | 'mint' | 'sakura' | 'sky')[] = ['butter', 'mint', 'sakura', 'sky']
  function cycleThemeColor() {
    const idx = COLOR_ORDER.indexOf(colorScheme.value)
    const next = COLOR_ORDER[(idx + 1) % COLOR_ORDER.length]
    setColorScheme(next)
  }

  function setFontSize(s: 'sm' | 'md' | 'lg') {
    fontSize.value = s
    localStorage.setItem('trace-fontsize', s)
    document.documentElement.setAttribute('data-font', s)
  }

  function setTeaching(list: TeachingAssignment[]) {
    teaching.value = list
  }

  function toggleTeaching(classId: string, subject: string) {
    const i = teaching.value.findIndex(
      (t) => t.classId === classId && t.subject === subject,
    )
    if (i >= 0) teaching.value.splice(i, 1)
    else teaching.value.push({ classId, subject })
  }

  function isTeaching(classId: string, subject: string) {
    return teaching.value.some(
      (t) => t.classId === classId && t.subject === subject,
    )
  }

  // 持久化
  watch(
    user,
    (val) => {
      if (val) {
        localStorage.setItem(KEY, JSON.stringify({ user: val, theme: theme.value }))
        // 同步 userId 到 storage 模块, 触发各 store reload
        setCurrentUserId(val.id)
      } else {
        localStorage.removeItem(KEY)
        setCurrentUserId(null)
      }
    },
    { deep: true },
  )

  watch(
    teaching,
    (val) => {
      localStorage.setItem(TEACH_KEY(), JSON.stringify(val))
    },
    { deep: true },
  )

  return { user, theme, colorScheme, fontSize, teaching, login, update, logout, setTheme, setColorScheme, toggleDark, cycleThemeColor, setFontSize, setTeaching, toggleTeaching, isTeaching }
})
