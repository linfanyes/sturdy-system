<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Shield, School, GraduationCap, Users, Loader2 } from 'lucide-vue-next'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

type Tab = Role
const tab = ref<Tab>('teacher')
const loading = ref(false)
const errMsg = ref('')

// 各角色表单
const superForm = ref({ username: '', password: '' })
const schoolAdminForm = ref({ username: '', password: '' })
const teacherForm = ref({ username: '', password: '' })
const parentForm = ref({ studentNo: '', password: '' })

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'teacher', label: '教师', icon: GraduationCap },
  { key: 'school_admin', label: '学校管理员', icon: School },
  { key: 'parent', label: '家长', icon: Users },
  { key: 'super', label: '超管', icon: Shield },
]

const dashboardMap: Record<Tab, string> = {
  super: '/super',
  school_admin: '/school-admin',
  teacher: '/teacher',
  parent: '/parent',
}

async function handleLogin() {
  loading.value = true
  errMsg.value = ''
  try {
    if (tab.value === 'super') {
      await auth.loginAsSuper(superForm.value.username, superForm.value.password)
    } else if (tab.value === 'school_admin') {
      await auth.loginAsSchoolAdmin(schoolAdminForm.value.username, schoolAdminForm.value.password)
    } else if (tab.value === 'teacher') {
      await auth.loginAsTeacher(teacherForm.value.username, teacherForm.value.password)
    } else {
      await auth.loginAsParent(parentForm.value.studentNo, parentForm.value.password)
    }
    const redirect = (route.query.redirect as string) || dashboardMap[tab.value]
    router.push(redirect)
  } catch (e: any) {
    errMsg.value = e?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-4 bg-gradient-to-br from-cream-100 to-cream-200">
    <div class="w-full max-w-md bg-white rounded-4xl shadow-soft p-8 animate-fadeIn">
      <!-- 标题 -->
      <div class="text-center mb-6">
        <div class="text-2xl font-bold text-cocoa-900">园丁工作台</div>
        <div class="text-sm text-cocoa-500 mt-1">Web 管理端 · 多角色登录</div>
      </div>

      <!-- 角色切换 -->
      <div class="grid grid-cols-4 gap-1.5 mb-6 bg-cream-100 p-1 rounded-2xl">
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="tab = t.key; errMsg = ''"
          :class="[
            'flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all',
            tab === t.key ? 'bg-white text-butter-600 shadow-softer' : 'text-cocoa-500 hover:text-cocoa-700',
          ]"
        >
          <component :is="t.icon" class="w-5 h-5" />
          {{ t.label }}
        </button>
      </div>

      <!-- 表单 -->
      <form class="space-y-3" @submit.prevent="handleLogin">
        <!-- 教师 / 校管 / 超管：用户名+密码 -->
        <template v-if="tab !== 'parent'">
          <input
            v-model="(tab === 'super' ? superForm : tab === 'school_admin' ? schoolAdminForm : teacherForm).username"
            type="text"
            placeholder="用户名"
            class="w-full px-4 py-3 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-900 placeholder-cocoa-300 focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
          />
          <input
            v-model="(tab === 'super' ? superForm : tab === 'school_admin' ? schoolAdminForm : teacherForm).password"
            type="password"
            placeholder="密码"
            class="w-full px-4 py-3 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-900 placeholder-cocoa-300 focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
          />
        </template>
        <!-- 家长：学号+密码 -->
        <template v-else>
          <input
            v-model="parentForm.studentNo"
            type="text"
            placeholder="学生学号"
            class="w-full px-4 py-3 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-900 placeholder-cocoa-300 focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
          />
          <input
            v-model="parentForm.password"
            type="password"
            placeholder="密码（默认 123456）"
            class="w-full px-4 py-3 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-900 placeholder-cocoa-300 focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
          />
        </template>

        <!-- 错误提示 -->
        <div v-if="errMsg" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ errMsg }}</div>

        <!-- 登录按钮 -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl bg-butter-500 hover:bg-butter-600 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <div class="mt-4 text-xs text-center text-cocoa-400">
        登录后 token 将持久化到本地，关闭浏览器后无需重新登录
      </div>
    </div>
  </div>
</template>
