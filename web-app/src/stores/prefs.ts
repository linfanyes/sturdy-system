import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type Density = 'compact' | 'default' | 'comfortable'

const STORAGE_KEY = 'gardener_user_prefs'

interface StoredPrefs {
  theme: ThemeMode
  density: Density
  sidebarCollapsed: boolean
  accentColor: string
  fontSize: 'sm' | 'md' | 'lg'
  recentExams: string[]
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultPrefs(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaultPrefs()
}

function defaultPrefs(): StoredPrefs {
  return {
    theme: 'auto',
    density: 'default',
    sidebarCollapsed: false,
    accentColor: 'butter',
    fontSize: 'md',
    recentExams: [],
  }
}

function applyThemeClass(theme: ThemeMode) {
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export const usePrefsStore = defineStore('prefs', () => {
  const stored = loadPrefs()
  const theme = ref<ThemeMode>(stored.theme)
  const density = ref<Density>(stored.density)
  const sidebarCollapsed = ref(stored.sidebarCollapsed)
  const accentColor = ref(stored.accentColor)
  const fontSize = ref<'sm' | 'md' | 'lg'>(stored.fontSize)
  const recentExams = ref<string[]>(stored.recentExams)

  // 持久化
  const persist = () => {
    const data: StoredPrefs = {
      theme: theme.value,
      density: density.value,
      sidebarCollapsed: sidebarCollapsed.value,
      accentColor: accentColor.value,
      fontSize: fontSize.value,
      recentExams: recentExams.value,
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  }

  watch([theme, density, sidebarCollapsed, accentColor, fontSize, recentExams], persist, { deep: true })

  // 应用主题到 DOM
  watch(theme, applyThemeClass)
  watch(accentColor, (c) => {
    const root = document.documentElement
    root.style.setProperty('--accent-color', c)
  })
  watch(fontSize, (s) => {
    const scale = s === 'sm' ? 0.9 : s === 'lg' ? 1.1 : 1
    document.documentElement.style.fontSize = `${Math.round(16 * scale)}px`
  })

  // 初始化：应用存储的偏好
  onMounted(() => {
    applyThemeClass(theme.value)
    document.documentElement.style.setProperty('--accent-color', accentColor.value)
    const scale = fontSize.value === 'sm' ? 0.9 : fontSize.value === 'lg' ? 1.1 : 1
    document.documentElement.style.fontSize = `${Math.round(16 * scale)}px`
  })

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function addRecentExam(examId: string) {
    const list = [examId, ...recentExams.value.filter((id) => id !== examId)].slice(0, 5)
    recentExams.value = list
  }

  function clearRecentExams() {
    recentExams.value = []
  }

  return {
    theme, density, sidebarCollapsed, accentColor, fontSize, recentExams,
    toggleTheme, addRecentExam, clearRecentExams,
  }
})
