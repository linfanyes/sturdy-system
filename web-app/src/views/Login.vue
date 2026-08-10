<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import { unifiedLogin, buildParentUser } from '@/api/auth'
import type { UnifiedLoginResult } from '@/api/auth'
import { Loader2, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-vue-next'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const roleSwitchStore = useRoleSwitchStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const errMsg = ref('')
const form = ref({ username: '', password: '' })
// 密码可见性开关：默认密文，点击眼睛图标切换（type 变化不触发重新聚焦丢失，保持输入连续）
const showPassword = ref(false)
// 大写锁定提示：避免"密码明明输对了却登不上"的经典困扰
const capsLockOn = ref(false)
function checkCapsLock(e: KeyboardEvent) {
  capsLockOn.value = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')
}

/* ============ 师兼家双角色选择 ============ */
const showRoleChoiceModal = ref(false)
const roleChoiceData = ref<UnifiedLoginResult | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '早上好'
  if (h >= 12 && h < 18) return '下午好'
  return '晚上好'
})

const dashboardMap: Record<Role, string> = {
  super: '/super',
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

/* ============ 表情头像（本地选择，装饰用；与旧版 app 一致，4×4 网格） ============ */
const avatarOptions = [
  '🍎', '📚', '✏️', '🌸', '🌈', '⭐', '🌻', '🐻',
  '🦄', '🐥', '🍀', '🎈', '🎁', '🌷', '🐰', '🐼',
]
const selectedAvatar = ref(localStorage.getItem('g_login_avatar') || '🍎')
function pickAvatar(a: string) {
  selectedAvatar.value = a
  localStorage.setItem('g_login_avatar', a)
}

/* ============ 教育格言（轮播 + 手动刷新） ============ */
const mottos = [
  '用爱浇灌每一颗小苗',
  '每个孩子都是一颗等待发芽的种子',
  '教育是一棵树摇动另一棵树',
  '慢一点，花开自有其时',
  '用心看见每一个孩子',
]
const mottoIdx = ref(0)
let mottoTimer: ReturnType<typeof setInterval> | undefined

function nextMotto() {
  mottoIdx.value = (mottoIdx.value + 1) % mottos.length
}

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
    // 调用统一登录，获取原始响应
    const result = await unifiedLogin(form.value.username, form.value.password)

    // 师兼家双角色选择
    if (result.needsRoleChoice) {
      roleChoiceData.value = result
      showRoleChoiceModal.value = true
      return
    }

    // 正常登录流程
    auth.setAuth(result.token, result.user)
    saveRecent(form.value.username)
    const redirect = (route.query.redirect as string) || targetDashboard()
    router.push(redirect)
  } catch (e: any) {
    errMsg.value = e?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}

/* ============ 双角色选择 ============ */
function selectRole(role: 'teacher' | 'parent') {
  const data = roleChoiceData.value
  if (!data?.teacher || !data.parent) return

  // 预构建两端 user 对象（teacher 来自登录响应 user，parent 由后端 parent 分支构造）
  const teacherUser = { role: 'teacher', ...data.teacher.user }
  const parentUser = buildParentUser(data.parent)

  // 无论先选哪个身份，都写入双 token + 双 user，保证两端切换按钮都可出现
  if (role === 'teacher') {
    roleSwitchStore.setTokens({
      teacherToken: data.teacher.token,
      parentToken: data.parent.token,
      teacherUser,
      parentUser,
      initialRole: 'teacher',
    })
    auth.setAuth(data.teacher.token, teacherUser)
    router.push('/teacher')
  } else {
    roleSwitchStore.setTokens({
      teacherToken: data.teacher.token,
      parentToken: data.parent.token,
      teacherUser,
      parentUser,
      initialRole: 'parent',
    })
    auth.setAuth(data.parent.token, parentUser)
    router.push('/parent')
  }

  showRoleChoiceModal.value = false
  roleChoiceData.value = null
}
</script>

<template>
  <div
    class="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-8"
    style="background: linear-gradient(135deg, #fff0e6 0%, #fff8f0 40%, #eafaf1 100%);"
  >
    <!-- 柔和光斑 -->
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div
        class="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-sakura-300/35 blur-[120px]"
      />
      <div
        class="absolute top-1/3 -right-40 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full bg-mint-300/30 blur-[120px]"
        style="animation-delay: -2s"
      />
      <div
        class="absolute -bottom-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-butter-300/35 blur-[120px]"
        style="animation-delay: -4s"
      />
    </div>

    <!-- 右侧竖排装饰文字 -->
    <div
      class="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 select-none lg:block"
    >
      <div
        class="text-lg font-semibold tracking-[0.35em] text-cocoa-300/35"
        style="writing-mode: vertical-rl"
      >
        用心看见每一个孩子
      </div>
    </div>

    <div
      class="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] xl:max-w-6xl"
    >
      <!-- 左侧品牌/欢迎区 -->
      <div class="space-y-7 text-center lg:text-left">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-white/70 bg-surface/80 px-4 py-1.5 text-sm font-semibold text-cocoa-800 shadow-sm backdrop-blur"
        >
          <Sparkles :size="16" class="text-butter-500" /> 园丁工作台
        </div>

        <h1 class="text-3xl font-bold leading-tight text-cocoa-900 sm:text-4xl lg:text-[2.75rem]">
          <div>{{ greeting }}，欢迎回来</div>
          <div class="mt-2">
            今天也要
            <span class="relative inline-block px-1">
              <span class="relative z-10">闪闪发光</span>
              <span
                class="absolute bottom-1 left-0 right-0 -z-0 h-3 rounded bg-butter-300/60"
              />
            </span>
            哦
          </div>
        </h1>

        <p
          class="mx-auto max-w-md text-base text-cocoa-600 lg:mx-0 lg:text-lg"
        >
          只需输入用户名与密码，即可进入你的「工作台」。所有登录凭据由后端安全校验，请放心使用。
        </p>

        <!-- 三步引导（复刻旧版彩色编号圆圈） -->
        <ul class="mx-auto inline-flex flex-col items-start gap-3 text-sm text-cocoa-700 lg:mx-0">
          <li class="flex items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-butter-300 text-xs font-bold text-cocoa-800"
            >1</span>
            <span>输入用户名与密码</span>
          </li>
          <li class="flex items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sakura-300 text-xs font-bold text-cocoa-800"
            >2</span>
            <span>系统自动识别您的角色</span>
          </li>
          <li class="flex items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint-300 text-xs font-bold text-cocoa-800"
            >3</span>
            <span>进入专属工作台，开始今天的工作</span>
          </li>
        </ul>

        <!-- 装饰 emoji -->
        <div class="flex items-center justify-center gap-3 lg:justify-start">
          <span class="text-3xl sm:text-4xl">📚</span>
          <span class="text-2xl sm:text-3xl">✏️</span>
          <span class="text-3xl sm:text-4xl">🍎</span>
          <span class="text-2xl sm:text-3xl">🌈</span>
          <span class="text-3xl sm:text-4xl">🌻</span>
        </div>
      </div>

      <!-- 右侧登录卡 -->
      <div class="relative">
        <!-- 顶部头像徽章（悬浮在卡片上方） -->
        <div class="absolute -top-7 left-1/2 z-10 -translate-x-1/2">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-butter-300 to-butter-500 text-3xl shadow-xl"
          >
            {{ selectedAvatar }}
          </div>
        </div>

        <div
          class="rounded-[2.25rem] bg-surface/90 p-6 shadow-2xl shadow-cocoa-900/5 backdrop-blur sm:p-8"
        >
          <div class="mb-6 pt-6 text-center">
            <h2 class="title-display text-2xl sm:text-[1.75rem]">一键登录</h2>
            <p class="mt-1 text-sm text-cocoa-500">
              只需要几秒，立即开始今天的工作 ✨
            </p>
          </div>

          <!-- 最近登录 -->
          <div v-if="recent.length" class="mb-4">
            <div class="mb-2 text-xs text-cocoa-400">最近登录</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="acc in recent"
                :key="acc"
                type="button"
                @click="fillRecent(acc)"
                class="rounded-full border border-cream-200 bg-cream-50 px-3 py-1 text-xs text-cocoa-600 transition hover:border-butter-300 hover:bg-butter-50"
              >
                {{ acc }}
              </button>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="handleLogin">
            <div>
              <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cocoa-600">
                <span>👤</span> 用户名
              </label>
              <input
                v-model="form.username"
                type="text"
                autocomplete="username"
                placeholder="请输入用户名"
                aria-label="用户名"
                class="input-soft"
              />
            </div>
            <div>
              <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cocoa-600">
                <span>🔒</span> 密码
              </label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                  aria-label="密码"
                  class="input-soft pr-11"
                  @keydown="checkCapsLock"
                  @keyup="checkCapsLock"
                />
                <button
                  type="button"
                  tabindex="-1"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  class="absolute inset-y-0 right-3 flex items-center text-cocoa-400 transition hover:text-cocoa-600"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-5 w-5" />
                  <Eye v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="capsLockOn" class="mt-1 text-xs text-amber-500">
                ⚠️ 大写锁定已开启
              </p>
            </div>

            <!-- 错误提示 -->
            <div
              v-if="errMsg"
              class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500"
            >
              {{ errMsg }}
            </div>

            <!-- 登录按钮（复刻旧版黄油渐变圆角胶囊） -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-full bg-gradient-to-r from-butter-400 to-butter-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-butter-400/30 transition hover:from-butter-500 hover:to-butter-600 hover:shadow-xl disabled:opacity-70"
            >
              <Loader2 v-if="loading" class="mr-2 inline h-4 w-4 animate-spin" />
              {{ loading ? '登录中…' : '开始工作 →' }}
            </button>

            <!-- 忘记密码引导：账号由老师/管理员创建，找回需联系老师 -->
            <p class="text-center text-xs text-cocoa-400">
              忘记密码？请联系班主任或学校管理员重置
            </p>
          </form>

          <!-- 个性化（头像 / 格言）默认收起，减少登录页干扰 -->
          <details class="mt-6 group">
            <summary
              class="cursor-pointer select-none text-xs font-medium text-cocoa-500 hover:text-cocoa-700 transition-colors list-none flex items-center gap-1"
            >
              🎨 个性化登录页
              <span class="text-cocoa-300 group-open:hidden">（头像 / 格言）</span>
              <span class="ml-auto text-cocoa-300 group-open:rotate-90 transition-transform">›</span>
            </summary>

            <!-- 头像选择（复刻 4×4 网格） -->
            <div class="mt-3">
              <div class="mb-2 text-xs font-medium text-cocoa-500">
                选择一个表情头像
              </div>
              <div class="grid grid-cols-8 gap-2">
                <button
                  v-for="a in avatarOptions"
                  :key="a"
                  type="button"
                  @click="pickAvatar(a)"
                  :aria-label="`选择头像 ${a}`"
                  :class="[
                    'flex h-9 w-9 items-center justify-center rounded-full text-lg transition',
                    selectedAvatar === a
                      ? 'bg-butter-100 ring-2 ring-butter-400'
                      : 'hover:bg-cream-100',
                  ]"
                >
                  {{ a }}
                </button>
              </div>
            </div>

            <!-- 教育格言（复刻输入框 + 刷新按钮） -->
            <div class="mt-4">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-medium text-cocoa-500">教育格言（可选）</span>
                <button
                  type="button"
                  @click="nextMotto"
                  class="rounded-full p-1 text-cocoa-400 transition hover:bg-cream-100 hover:text-cocoa-600"
                  title="换一句"
                >
                  <RefreshCw class="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                :value="mottos[mottoIdx] + ' 🌱'"
                readonly
                class="w-full cursor-default rounded-xl border border-cream-200 bg-cream-50/70 px-3 py-2 text-center text-sm text-cocoa-700 outline-none transition focus:border-butter-300"
              />
            </div>
          </details>

          <div class="mt-5 text-center text-xs leading-relaxed text-cocoa-400">
            登录后本机将记住登录状态，再次打开无需重复登录
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 师兼家双角色选择弹层 -->
  <div
    v-if="showRoleChoiceModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
      <h3 class="mb-2 text-center text-lg font-bold text-cocoa-900">选择登录身份</h3>
      <p class="mb-5 text-center text-sm text-cocoa-500">
        该账号同时关联了教师和家长身份
      </p>
      <div class="space-y-3">
        <button
          @click="selectRole('teacher')"
          class="w-full rounded-full bg-cream-50 py-3 text-sm font-semibold text-cocoa-800 ring-1 ring-cream-200 transition hover:bg-butter-50 hover:ring-butter-300"
        >
          👨‍🏫 以老师身份进入
        </button>
        <button
          @click="selectRole('parent')"
          class="w-full rounded-full bg-cream-50 py-3 text-sm font-semibold text-cocoa-800 ring-1 ring-cream-200 transition hover:bg-butter-50 hover:ring-butter-300"
        >
          👨‍👩‍👧‍👦 以家长身份进入
        </button>
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
