<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Users, School, Megaphone, LogOut, User,
} from 'lucide-vue-next'
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
    <main class="flex-1 overflow-auto bg-cream-50">
      <div class="max-w-6xl mx-auto p-6">
        <slot />
      </div>
    </main>
  </div>
</template>
