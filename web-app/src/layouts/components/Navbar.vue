<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePrefsStore } from '@/stores/prefs'
import { Search, Moon, Sun } from 'lucide-vue-next'
import { search as searchAll, type SearchResult } from '@/api/school-admin'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const prefs = usePrefsStore()
const route = useRoute()

const roleLabel: Record<Role, string> = {
  super: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

const roleDisplay = computed(() => {
  if (auth.role === 'teacher') {
    const pos = (auth.user as any)?.position
    return pos || '教师'
  }
  return roleLabel[auth.role || 'teacher']
})

const pageTitle = computed(() => (route.meta.title as string | undefined) || '')
const isHome = computed(() => route.name === 'super-dashboard' || route.name === 'school-admin-dashboard' || route.name === 'teacher-dashboard')

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，早点休息'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const displayName = computed(() => {
  const u = auth.user
  if (!u) return roleLabel[auth.role || 'teacher']
  if (auth.role === 'teacher') return u.name || '老师'
  if (auth.role === 'school_admin') return u.name || '校管'
  if (auth.role === 'super') return '超级管理员'
  return u.name || roleLabel[auth.role || 'teacher']
})

/* 全局搜索（仅校管） */
const searchKeyword = ref('')
const searchResult = ref<SearchResult | null>(null)
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchKeyword.value || searchKeyword.value.length < 1) {
    searchResult.value = null
    return
  }
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    try {
      searchResult.value = await searchAll(searchKeyword.value)
    } catch {
      searchResult.value = null
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

function closeSearch() {
  searchKeyword.value = ''
  searchResult.value = null
}

const hasResults = computed(() => {
  const r = searchResult.value
  if (!r) return false
  return (r.teachers?.length || 0) + (r.classes?.length || 0) + (r.students?.length || 0) > 0
})

const emit = defineEmits<{
  (e: 'goTeachers'): void
  (e: 'goClasses'): void
  (e: 'goStudents'): void
}>()

function goTeachers() { closeSearch(); emit('goTeachers') }
function goClasses() { closeSearch(); emit('goClasses') }
function goStudents() { closeSearch(); emit('goStudents') }
</script>

<template>
  <!-- 全局搜索（仅校管可见） -->
  <div v-if="auth.role === 'school_admin'" class="border-b border-cream-200 bg-surface/80 backdrop-blur px-6 py-2.5 shrink-0 no-print">
    <div class="max-w-7xl mx-auto relative">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
        <input
          v-model="searchKeyword"
          placeholder="全局搜索：教师 / 班级 / 学生"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          @input="onSearchInput"
        />
      </div>
      <div v-if="searchKeyword && (searchLoading || hasResults || (!searchLoading && !hasResults))" class="absolute z-20 mt-1 w-full bg-surface rounded-xl shadow-soft border border-cream-200 max-h-96 overflow-y-auto">
        <div v-if="searchLoading" class="px-4 py-3 text-sm text-cocoa-400">搜索中…</div>
        <div v-else-if="!hasResults" class="px-4 py-3 text-sm text-cocoa-400">未找到匹配结果</div>
        <template v-else>
          <div v-if="searchResult?.teachers?.length" class="py-1">
            <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">教师</div>
            <button
              v-for="t in searchResult.teachers"
              :key="t.id"
              class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
              @click="goTeachers"
            >
              <span class="text-cocoa-900 font-medium">{{ t.name }}</span>
              <span class="text-cocoa-400 text-xs">{{ t.subject || t.username }}</span>
            </button>
          </div>
          <div v-if="searchResult?.classes?.length" class="py-1">
            <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">班级</div>
            <button
              v-for="c in searchResult.classes"
              :key="c.id"
              class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
              @click="goClasses"
            >
              <span class="text-cocoa-900 font-medium">{{ c.name }}</span>
              <span class="text-cocoa-400 text-xs">{{ c.grade }} · {{ c.headTeacher }}</span>
            </button>
          </div>
          <div v-if="searchResult?.students?.length" class="py-1">
            <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">学生</div>
            <button
              v-for="s in searchResult.students"
              :key="s.id"
              class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
              @click="goStudents"
            >
              <span class="text-cocoa-900 font-medium">{{ s.name }}</span>
              <span class="text-cocoa-400 text-xs">{{ s.className }} · {{ s.studentNo }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- 统一页头 -->
  <header class="shrink-0 border-b border-cream-100 bg-surface/80 px-6 py-4 backdrop-blur">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-cocoa-900">{{ displayName }}</h1>
          <span class="chip bg-butter-100 text-butter-700">{{ greeting }}</span>
        </div>
        <!-- 子页面显示简洁面包屑 -->
        <nav v-if="!isHome" aria-label="breadcrumb" class="mt-1.5 flex items-center text-xs text-cocoa-500">
          <span class="font-medium text-cocoa-700">{{ pageTitle }}</span>
        </nav>
      </div>
      <div class="text-right flex items-center gap-3">
        <button
          class="theme-toggle p-2 rounded-lg hover:bg-cream-100 transition-colors"
          :title="prefs.theme === 'dark' ? '切换浅色模式' : '切换深色模式'"
          @click="prefs.toggleTheme()"
        >
          <Sun v-if="prefs.theme === 'dark'" class="w-4 h-4 text-amber-500" />
          <Moon v-else class="w-4 h-4 text-cocoa-500" />
        </button>
        <div>
          <div class="text-sm font-medium text-cocoa-700">{{ roleDisplay }}</div>
          <div class="mt-0.5 text-xs text-cocoa-400">{{ today }}</div>
        </div>
      </div>
    </div>
  </header>
</template>
