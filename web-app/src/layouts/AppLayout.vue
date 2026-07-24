<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Users, School, Megaphone, GraduationCap, LogOut, User, Search,
} from 'lucide-vue-next'
import { search as searchAll, type SearchResult } from '@/api/school-admin'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** 角色中文标签 */
const roleLabel: Record<Role, string> = {
  super: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

/** 各角色侧边栏菜单（每项可独立图标） */
const navItems: Record<Role, { name: string; label: string; to: string; icon: any }[]> = {
  super: [{ name: 'super-dashboard', label: '工作台', to: '/super', icon: LayoutDashboard }],
  school_admin: [
    { name: 'school-admin-dashboard', label: '工作台', to: '/school-admin', icon: LayoutDashboard },
    { name: 'school-admin-teachers', label: '教师管理', to: '/school-admin/teachers', icon: Users },
    { name: 'school-admin-classes', label: '班级管理', to: '/school-admin/classes', icon: School },
    { name: 'school-admin-students', label: '学生管理', to: '/school-admin/students', icon: GraduationCap },
    { name: 'school-admin-notices', label: '学校公告', to: '/school-admin/notices', icon: Megaphone },
  ],
  teacher: [{ name: 'teacher-dashboard', label: '工作台', to: '/teacher', icon: LayoutDashboard }],
  parent: [{ name: 'parent-dashboard', label: '孩子动态', to: '/parent', icon: LayoutDashboard }],
}

const items = computed(() => (auth.role ? navItems[auth.role] : []))

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

/* ============ 全局搜索（仅校管） ============ */
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

function goTeachers() { closeSearch(); router.push('/school-admin/teachers') }
function goClasses() { closeSearch(); router.push('/school-admin/classes') }
function goStudents() { closeSearch(); router.push('/school-admin/students') }

const hasResults = computed(() => {
  const r = searchResult.value
  if (!r) return false
  return (r.teachers?.length || 0) + (r.classes?.length || 0) + (r.students?.length || 0) > 0
})
</script>

<template>
  <div class="flex h-full">
    <!-- 侧边栏 -->
    <aside class="w-56 shrink-0 border-r border-cream-200 bg-cream-100/60 flex flex-col">
      <div class="px-5 py-6">
        <div class="text-lg font-bold text-cocoa-900">园丁工作台</div>
        <div class="text-xs text-cocoa-500 mt-0.5">Web 管理端</div>
      </div>
      <nav class="flex-1 px-3 space-y-1">
        <router-link
          v-for="item in items"
          :key="item.name"
          :to="item.to"
          :class="[
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors',
            route.name === item.name
              ? 'bg-butter-400 text-white font-semibold'
              : 'text-cocoa-700 hover:bg-cream-200',
          ]"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </router-link>
      </nav>
      <!-- 底部用户信息 -->
      <div class="p-3 border-t border-cream-200">
        <div class="flex items-center gap-2 px-2 py-1.5">
          <div class="w-8 h-8 rounded-full bg-butter-300 flex items-center justify-center">
            <User class="w-4 h-4 text-cocoa-700" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-cocoa-900 truncate">{{ auth.user?.name }}</div>
            <div class="text-xs text-cocoa-500">{{ auth.role ? roleLabel[auth.role] : '' }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-200 text-cocoa-500" title="退出登录" @click="handleLogout">
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    <!-- 主内容区 -->
    <main class="flex-1 overflow-auto bg-cream-50 flex flex-col">
      <!-- 顶栏：全局搜索（仅校管可见） -->
      <div v-if="auth.role === 'school_admin'" class="border-b border-cream-200 bg-white/60 backdrop-blur px-6 py-2.5">
        <div class="max-w-6xl mx-auto relative">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
            <input
              v-model="searchKeyword"
              placeholder="全局搜索：教师 / 班级 / 学生"
              class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
              @input="onSearchInput"
            />
          </div>
          <!-- 搜索结果下拉 -->
          <div v-if="searchKeyword && (searchLoading || hasResults || (!searchLoading && !hasResults))" class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-96 overflow-y-auto">
            <div v-if="searchLoading" class="px-4 py-3 text-sm text-cocoa-400">搜索中…</div>
            <div v-else-if="!hasResults" class="px-4 py-3 text-sm text-cocoa-400">未找到匹配结果</div>
            <template v-else>
              <!-- 教师结果 -->
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
              <!-- 班级结果 -->
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
              <!-- 学生结果 -->
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
      <!-- 实际页面内容 -->
      <div class="flex-1 overflow-auto">
        <div class="max-w-6xl mx-auto p-6">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
