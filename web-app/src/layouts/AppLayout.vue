<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { User } from 'lucide-vue-next'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import { teacherMenu, superMenu, schoolAdminMenu, palette } from './layoutMenus'
import type { MenuSubGroup, ColorTone } from './layoutMenus'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const sidebarActiveCategory = ref<string>('')

function handleActiveCategoryChange(val: string) {
  sidebarActiveCategory.value = val
}

/** 是否在内容区展示二级菜单瓷砖 */
const showTilesPanel = computed(() =>
  ((auth.role === 'teacher' && !!sidebarActiveCategory.value && route.name === 'teacher-dashboard') ||
   (auth.role === 'super' && !!sidebarActiveCategory.value && route.name === 'super-dashboard') ||
   (auth.role === 'school_admin' && !!sidebarActiveCategory.value && route.name === 'school-admin-dashboard'))
)

const activeGroups = computed<MenuSubGroup[]>(() => {
  if (!sidebarActiveCategory.value) return []
  if (auth.role === 'super') {
    const cat = superMenu.find((c) => c.label === sidebarActiveCategory.value)
    return cat?.groups || []
  }
  if (auth.role === 'school_admin') {
    const cat = schoolAdminMenu.find((c) => c.label === sidebarActiveCategory.value)
    return cat?.groups || []
  }
  const cat = teacherMenu.find((c) => c.label === sidebarActiveCategory.value)
  return cat?.groups || []
})

const activeCategoryLabel = computed(() => sidebarActiveCategory.value)

function navigateTo(to: string) {
  router.push(to)
}

function backToDashboard() {
  sidebarActiveCategory.value = ''
  if (auth.role === 'super' && route.name !== 'super-dashboard') router.push('/super')
  else if (auth.role === 'school_admin' && route.name !== 'school-admin-dashboard') router.push('/school-admin')
  else if (auth.role === 'teacher' && route.name !== 'teacher-dashboard') router.push('/teacher')
}

function backToTiles() {
  if (auth.role === 'super') router.push('/super')
  else if (auth.role === 'school_admin') router.push('/school-admin')
  else router.push('/teacher')
}

function goBackUp() {
  if (sidebarActiveCategory.value) backToTiles()
  else backToDashboard()
}

async function handleLogout() {
  if (!await confirm('确定要退出登录吗？')) return
  auth.logout()
  router.push({ name: 'login' })
}

function goTeachers() { router.push('/school-admin/teachers') }
function goClasses() { router.push('/school-admin/classes') }
function goStudents() { router.push('/school-admin/students') }

const pageTitle = computed(() => (route.meta.title as string | undefined) || '')
const isHome = computed(() => route.name === 'super-dashboard' || route.name === 'school-admin-dashboard' || route.name === 'teacher-dashboard')
</script>

<template>
  <div class="flex h-full bg-cream-50">
    <!-- 侧边栏子组件 -->
    <Sidebar
      @logout="handleLogout"
      @active-category-change="handleActiveCategoryChange"
    />

    <!-- 主内容区 -->
    <main class="flex-1 overflow-hidden bg-cream-50 flex flex-col">
      <!-- 顶栏子组件 -->
      <Navbar
        @go-teachers="goTeachers"
        @go-classes="goClasses"
        @go-students="goStudents"
      />

      <!-- 面包屑子组件 -->
      <div class="px-6 pt-3">
        <Breadcrumb :show-tiles-panel="showTilesPanel" @go-back-up="goBackUp" />
      </div>

      <!-- 实际页面内容 -->
      <div class="flex-1 overflow-auto scroll-smooth">
        <div class="w-full min-h-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 flex flex-col">
          <!-- 教师工作台：二级菜单瓷砖铺满内容区 -->
          <template v-if="showTilesPanel">
            <div class="flex items-center gap-2 text-sm text-cocoa-700 font-medium mb-4">
              {{ activeCategoryLabel }}
            </div>
            <div v-for="g in activeGroups" :key="g.label || 'main'" class="mb-6">
              <div v-if="g.label" class="flex items-center gap-2 mb-3">
                <h3 class="text-sm font-semibold text-cocoa-700 tracking-wider">{{ g.label }}</h3>
                <div class="flex-1 h-px bg-cream-200"></div>
                <span class="text-xs text-cocoa-400">{{ g.items.length }} 项</span>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                <button
                  v-for="item in g.items"
                  :key="item.name"
                  class="group flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border-2 border-transparent hover:scale-105 hover:-translate-y-1 p-4"
                  :class="route.name === item.name ? ['ring-2', palette(item.color || 'butter').ring, palette(item.color || 'butter').bg] : ['hover:shadow-lg hover:shadow-butter-200/30', palette(item.color || 'butter').soft]"
                  @click="navigateTo(item.to)"
                >
                  <div
                    class="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                    :class="palette(item.color || 'butter').bg + ' ' + palette(item.color || 'butter').text"
                  >
                    <span v-if="item.emoji" class="text-2xl">{{ item.emoji }}</span>
                    <component v-else :is="item.icon || User" class="w-6 h-6" />
                  </div>
                  <span class="mt-2 text-xs font-medium text-cocoa-800 text-center leading-tight">{{ item.label }}</span>
                </button>
              </div>
            </div>
          </template>
          <!-- 常规页面内容（带过渡动画） -->
          <template v-else>
            <router-view v-slot="{ Component }">
              <Transition name="page-slide" mode="out-in">
                <component :is="Component" />
              </Transition>
            </router-view>
          </template>
          <footer class="mt-auto pt-8 pb-2 text-center text-xs text-cocoa-400">
            © 2026 园丁工作台 · Web 管理端
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>
