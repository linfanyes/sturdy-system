<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Loader2, Sparkles } from 'lucide-vue-next'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const errMsg = ref('')
const form = ref({ username: '', password: '' })

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '早上好'
  if (h >= 12 && h < 18) return '下午好'
  return '晚上好'
})

const dashboardMap: Record<Role, string> = {
  super_admin: '/super',
  school_admin: '/school-admin',
  teacher: '/teacher',
  parent: '/parent',
}
function targetDashboard(): string {
  return (auth.role && dashboardMap[auth.role]) || '/login'
}

/* ============ 历史账号（本地存储，最近 3 条，不再区分角色） ============ */
const RECENT_KEY = 'g_recent_accounts'
const recent = ref<string[]>([])
function loadRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (Array.isArray(parsed)) {
      recent.value = parsed.filter((v): v is string => typeof v === 'string')
    } else if (parsed && typeof parsed === 'object') {
      // 兼容旧版：曾以 { 角色: string[] } 对象形式存储
      recent.value = Object.values(parsed)
        .flat()
        .filter((v): v is string => typeof v === 'string')
    } else if (typeof parsed === 'string') {
      recent.value = [parsed]
    } else {
      recent.value = []
    }
  } catch {
    recent.value = []
  }
}
function saveRecent(val: string) {
  if (!val) return
  const base = Array.isArray(recent.value) ? recent.value : []
  const list = base.filter((v) => v !== val)
  list.unshift(val)
  recent.value = list.slice(0, 3)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
}
function fillRecent(val: string) {
  form.value.username = val
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
  if (!form.value.username || !form.value.password) {
    errMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errMsg.value = ''
  try {
    // 后端统一登录，自动识别角色；登录成功后按返回角色跳转
    await auth.loginByUsername(form.value.username, form.value.password)
    saveRecent(form.value.username)
    const redirect = (route.query.redirect as string) || targetDashboard()
    router.push(redirect)
  } catch (e: any) {
    errMsg.value = e?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
    <!-- 浮动渐变光斑 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div class="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-sakura-300/40 blur-3xl animate-floaty" />
      <div
        class="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-mint-300/40 blur-3xl animate-floaty"
        style="animation-delay: -2s"
      />
      <div
        class="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-butter-300/40 blur-3xl animate-floaty"
        style="animation-delay: -4s"
      />
    </div>

    <div class="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-14 max-w-5xl xl:max-w-6xl w-full items-center relative">
      <!-- 左侧欢迎 -->
      <div class="space-y-7 text-center lg:text-left">
        <div class="inline-flex items-center gap-1.5 chip bg-white/80 text-cocoa-800 border border-white/80 shadow-softer px-4 py-1.5 text-sm font-semibold tracking-wide">
          <Sparkles :size="16" class="text-butter-500" /> 园丁工作台
        </div>

        <h1 class="title-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight text-cocoa-900 mt-3">
          {{ greeting }}，欢迎回来 <span class="inline-block animate-wiggle">👋</span>
        </h1>
        <p class="text-xl sm:text-2xl lg:text-[1.6rem] text-cocoa-600 font-medium mt-4 hidden sm:block">
          用 <span class="scribble">爱</span> 浇灌每一颗小苗
        </p>

        <ul class="space-y-2.5 text-cocoa-700 text-sm hidden lg:block mt-6">
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-butter-300 flex items-center justify-center text-xs font-bold">1</span>
            输入用户名与密码
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-sakura-300 flex items-center justify-center text-xs font-bold">2</span>
            系统自动识别您的角色
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-mint-300 flex items-center justify-center text-xs font-bold">3</span>
            进入专属工作台，开始今天的工作
          </li>
        </ul>

        <!-- 教育格言轮播 -->
        <transition name="motto" mode="out-in">
          <p :key="mottoIdx" class="text-cocoa-400 text-xs sm:text-sm italic hidden lg:block">
            「{{ mottos[mottoIdx] }}」
          </p>
        </transition>

        <div class="flex items-center justify-center lg:justify-start gap-3 pt-1">
          <div class="text-3xl sm:text-4xl animate-wiggleSlow">📚</div>
          <div class="text-2xl sm:text-3xl animate-floaty">✏️</div>
          <div class="text-3xl sm:text-4xl animate-wiggle" style="animation-delay: -0.5s">🍎</div>
          <div class="text-2xl sm:text-3xl animate-floaty" style="animation-delay: -1.5s">🌈</div>
        </div>
      </div>

      <!-- 右侧登录卡 -->
      <div class="card-soft p-6 sm:p-8 relative animate-fadeIn flex flex-col">
        <!-- 头像角标 -->
        <div class="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-butter-300 to-butter-400 flex items-center justify-center text-2xl shadow-pop border-4 border-white">
          {{ selectedAvatar }}
        </div>

        <div class="text-center mt-5 mb-6">
          <h2 class="title-display text-xl sm:text-2xl mb-1">登录</h2>
          <p class="text-xs sm:text-sm text-cocoa-500">请输入用户名和密码</p>
        </div>

        <!-- 头像选择（装饰） -->
        <div class="flex items-center justify-center gap-1.5 mb-5">
          <span class="text-xs text-cocoa-400 mr-1">头像</span>
          <button
            v-for="a in avatarOptions"
            :key="a"
            type="button"
            @click="pickAvatar(a)"
            :aria-label="`选择头像 ${a}`"
            :class="[
              'w-8 h-8 rounded-full text-base flex items-center justify-center transition',
              selectedAvatar === a ? 'bg-butter-100 ring-2 ring-butter-400' : 'hover:bg-cream-100',
            ]"
          >
            {{ a }}
          </button>
        </div>

        <!-- 最近登录 -->
        <div v-if="recent.length" class="mb-4">
          <div class="text-xs text-cocoa-400 mb-1.5">最近登录</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="acc in recent"
              :key="acc"
              type="button"
              @click="fillRecent(acc)"
              class="chip text-xs bg-white/80 border border-cream-200 text-cocoa-600 px-2.5 py-1 hover:bg-butter-50"
            >
              {{ acc }}
            </button>
          </div>
        </div>

        <!-- 统一表单 -->
        <form class="space-y-3" @submit.prevent="handleLogin">
          <div class="relative">
            <input
              v-model="form.username"
              type="text"
              autocomplete="username"
              placeholder="用户名"
              class="input-soft"
            />
          </div>
          <div class="relative">
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="密码"
              class="input-soft"
            />
          </div>

          <!-- 错误提示 -->
          <div v-if="errMsg" class="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ errMsg }}</div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full !py-3 !text-base mt-1"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            {{ loading ? '登录中…' : '开始工作' }}
          </button>
        </form>

        <div class="mt-5 text-xs text-center text-cocoa-400 leading-relaxed">
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
