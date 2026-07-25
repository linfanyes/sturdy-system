<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Shield, School, GraduationCap, Users, Loader2, Sparkles } from 'lucide-vue-next'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

type Tab = Role
const tab = ref<Tab>('teacher')
const loading = ref(false)
const errMsg = ref('')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '早上好'
  if (h >= 12 && h < 18) return '下午好'
  return '晚上好'
})

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

/* ============ 历史账号（本地存储，最近 3 条/角色） ============ */
const RECENT_KEY = 'g_recent_accounts'
type RecentMap = Record<string, string[]>
const recent = ref<RecentMap>({})
function loadRecent() {
  try {
    recent.value = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}')
  } catch {
    recent.value = {}
  }
}
function saveRecent(role: string, val: string) {
  if (!val) return
  const map: RecentMap = { ...recent.value }
  const list = (map[role] || []).filter((v) => v !== val)
  list.unshift(val)
  map[role] = list.slice(0, 3)
  recent.value = map
  localStorage.setItem(RECENT_KEY, JSON.stringify(map))
}
function fillRecent(val: string) {
  if (tab.value === 'parent') parentForm.value.studentNo = val
  else if (tab.value === 'super') superForm.value.username = val
  else if (tab.value === 'school_admin') schoolAdminForm.value.username = val
  else teacherForm.value.username = val
}

/* ============ 表情头像（本地选择，装饰用） ============ */
const avatarOptions = ['🍎', '🌱', '🌈', '📚', '🌟', '🐣', '🍀', '☀️']
const selectedAvatar = ref(localStorage.getItem('g_login_avatar') || '🍎')
function pickAvatar(a: string) {
  selectedAvatar.value = a
  localStorage.setItem('g_login_avatar', a)
}

/* ============ 教育格言（轮播） ============ */
const mottos = [
  '用爱浇灌每一颗小苗',
  '每个孩子都是一颗等待发芽的种子',
  '教育是一棵树摇动另一棵树',
  '慢一点，花开自有其时',
  '用心看见每一个孩子',
]
const mottoIdx = ref(0)
let mottoTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  loadRecent()
  mottoTimer = setInterval(() => {
    mottoIdx.value = (mottoIdx.value + 1) % mottos.length
  }, 4500)
})
onUnmounted(() => {
  if (mottoTimer) clearInterval(mottoTimer)
})

async function handleLogin() {
  loading.value = true
  errMsg.value = ''
  try {
    let accVal = ''
    if (tab.value === 'super') {
      accVal = superForm.value.username
      await auth.loginAsSuper(superForm.value.username, superForm.value.password)
    } else if (tab.value === 'school_admin') {
      accVal = schoolAdminForm.value.username
      await auth.loginAsSchoolAdmin(schoolAdminForm.value.username, schoolAdminForm.value.password)
    } else if (tab.value === 'teacher') {
      accVal = teacherForm.value.username
      await auth.loginAsTeacher(teacherForm.value.username, teacherForm.value.password)
    } else {
      accVal = parentForm.value.studentNo
      await auth.loginAsParent(parentForm.value.studentNo, parentForm.value.password)
    }
    saveRecent(tab.value, accVal)
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
  <div class="min-h-full w-full flex items-center justify-center p-4 sm:p-6 py-8 relative overflow-hidden">
    <!-- 浮动渐变光斑（与原始 web 页面一致的暖色氛围） -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div class="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-sakura-300/40 blur-3xl animate-floaty" />
      <div
        class="absolute top-32 -right-16 w-80 h-80 rounded-full bg-mint-300/40 blur-3xl animate-floaty"
        style="animation-delay: -2s"
      />
      <div
        class="absolute -bottom-16 left-1/3 w-72 h-72 rounded-full bg-butter-300/40 blur-3xl animate-floaty"
        style="animation-delay: -4s"
      />
    </div>

    <div class="grid lg:grid-cols-2 gap-6 sm:gap-10 max-w-5xl xl:max-w-6xl w-full items-center relative">
      <!-- 左侧欢迎 -->
      <div class="space-y-5 text-center lg:text-left -mt-4">
        <div class="inline-flex items-center gap-1.5 chip bg-white/80 text-cocoa-800 border border-white/80 shadow-softer px-4 py-1.5 text-sm font-semibold tracking-wide">
          <Sparkles :size="16" class="text-butter-500" /> 园丁工作台
        </div>
        <h1 class="title-display text-3xl sm:text-4xl lg:text-5xl leading-tight text-cocoa-900">
          {{ greeting }}，欢迎回来 <span class="inline-block animate-wiggle">👋</span>
          <br class="hidden sm:block" />
          <span class="hidden sm:inline">用 <span class="scribble">爱</span> 浇灌每一颗小苗</span>
        </h1>
        <p class="text-cocoa-500 text-sm sm:text-base max-w-md mx-auto lg:mx-0">
          Web 管理端 · 多角色安全登录。教师、学校管理员、家长与超级管理员，
          各凭账号进入专属工作台。
        </p>
        <ul class="space-y-2 text-cocoa-700 text-sm hidden lg:block">
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-butter-300 flex items-center justify-center">1</span>
            选择您的角色
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-sakura-300 flex items-center justify-center">2</span>
            输入账号与密码
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-mint-300 flex items-center justify-center">3</span>
            进入专属工作台，开始今天的工作
          </li>
        </ul>
        <!-- 教育格言轮播 -->
        <transition name="motto" mode="out-in">
          <p :key="mottoIdx" class="text-cocoa-400 text-xs sm:text-sm italic hidden lg:block">
            「{{ mottos[mottoIdx] }}」
          </p>
        </transition>
        <div class="flex items-center justify-center lg:justify-start gap-3 pt-2">
          <div class="text-3xl sm:text-4xl animate-wiggleSlow">📚</div>
          <div class="text-2xl sm:text-3xl animate-floaty">✏️</div>
          <div
            class="text-3xl sm:text-4xl animate-wiggle"
            style="animation-delay: -0.5s"
          >
            🍎
          </div>
          <div
            class="text-2xl sm:text-3xl animate-floaty"
            style="animation-delay: -1.5s"
          >
            🌈
          </div>
        </div>
      </div>

      <!-- 右侧登录卡 -->
      <div class="card-soft p-5 sm:p-7 lg:p-9 relative animate-fadeIn">
        <div class="absolute -top-4 -left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-butter-300/80 flex items-center justify-center text-xl sm:text-2xl shadow-pop">
          {{ selectedAvatar }}
        </div>
        <h2 class="title-display text-xl sm:text-2xl mb-1">
          登录
        </h2>
        <p class="text-xs sm:text-sm text-cocoa-500 mb-3 sm:mb-4">
          只需几秒，立即开始今天的工作 ✨
        </p>

        <!-- 表情头像选择（本地装饰） -->
        <div class="flex items-center gap-1.5 mb-4">
          <span class="text-xs text-cocoa-400 mr-1">头像</span>
          <button
            v-for="a in avatarOptions"
            :key="a"
            type="button"
            @click="pickAvatar(a)"
            :aria-label="`选择头像 ${a}`"
            :class="[
              'w-7 h-7 rounded-full text-base flex items-center justify-center transition',
              selectedAvatar === a ? 'bg-butter-100 ring-2 ring-butter-400' : 'hover:bg-cream-100',
            ]"
          >
            {{ a }}
          </button>
        </div>

        <!-- 角色切换 -->
        <div class="grid grid-cols-4 gap-1.5 mb-5 bg-cream-100/80 p-1 rounded-2xl">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
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

        <!-- 最近登录（历史账号快捷填充） -->
        <div v-if="recent[tab] && recent[tab].length" class="mb-3">
          <div class="text-xs text-cocoa-400 mb-1.5">最近登录</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="acc in recent[tab]"
              :key="acc"
              type="button"
              @click="fillRecent(acc)"
              class="chip text-xs bg-white/80 border border-cream-200 text-cocoa-600 px-2.5 py-1 hover:bg-butter-50"
            >
              {{ acc }}
            </button>
          </div>
        </div>

        <!-- 表单 -->
        <form class="space-y-3" @submit.prevent="handleLogin">
          <template v-if="tab !== 'parent'">
            <input
              v-model="(tab === 'super' ? superForm : tab === 'school_admin' ? schoolAdminForm : teacherForm).username"
              type="text"
              :placeholder="tab === 'super' ? '超管用户名' : tab === 'school_admin' ? '校管用户名' : '教师用户名'"
              class="input-soft"
            />
            <input
              v-model="(tab === 'super' ? superForm : tab === 'school_admin' ? schoolAdminForm : teacherForm).password"
              type="password"
              placeholder="密码"
              class="input-soft"
            />
          </template>
          <template v-else>
            <input
              v-model="parentForm.studentNo"
              type="text"
              placeholder="学生学号"
              class="input-soft"
            />
            <input
              v-model="parentForm.password"
              type="password"
              placeholder="密码（默认 123456）"
              class="input-soft"
            />
          </template>

          <!-- 错误提示 -->
          <div v-if="errMsg" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ errMsg }}</div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full !py-3 !text-base"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            {{ loading ? '登录中…' : '开始工作' }}
          </button>
        </form>

        <div class="mt-4 text-xs text-center text-cocoa-400">
          登录后 token 将持久化到本地，关闭浏览器后无需重新登录
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.motto-enter-active,
.motto-leave-active {
  transition: opacity 0.5s ease;
}
.motto-enter-from,
.motto-leave-to {
  opacity: 0;
}
</style>
