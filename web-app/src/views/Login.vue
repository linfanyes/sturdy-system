<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { unifiedLogin } from '@/api/auth'
import { Loader2, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-vue-next'
import GrowthIcon from '@/components/GrowthIcon.vue'
import type { Role } from '@/types/user'

const auth = useAuthStore()
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

</script>

<template>
  <div class="login-page relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-8">
    <!-- 柔和光斑 -->
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="decor-blob bg-sakura-300/35" />
      <div class="decor-blob bg-mint-300/30" style="animation-delay: -2s" />
      <div class="decor-blob bg-butter-300/35" style="animation-delay: -4s" />
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
      <div class="left-section space-y-7 text-center lg:text-left">
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

        <!-- 装饰生长图标（品牌锚点，替代 emoji） -->
        <div class="flex items-center justify-center gap-4 lg:justify-start">
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-butter-100 text-butter-600"><GrowthIcon name="seed" :size="26" /></span>
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sakura-100 text-sakura-400"><GrowthIcon name="sprout" :size="26" /></span>
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-500"><GrowthIcon name="bud" :size="26" /></span>
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky2-100 text-sky2-500"><GrowthIcon name="bloom" :size="26" /></span>
        </div>
      </div>

      <!-- 右侧登录卡 -->
      <div class="login-card-wrapper relative">
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
                <GrowthIcon name="user" :size="14" class="text-cocoa-400" /> 用户名
              </label>
              <input
                v-model="form.username"
                type="text"
                autocomplete="username"
                placeholder="请输入用户名"
                aria-label="用户名"
                class="input-soft input-glow"
              />
            </div>
            <div>
              <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cocoa-600">
                <GrowthIcon name="lock" :size="14" class="text-cocoa-400" /> 密码
              </label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                  aria-label="密码"
                  class="input-soft input-glow pr-11"
                  @keydown="checkCapsLock"
                  @keyup="checkCapsLock"
                />
                <button
                  type="button"
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
              :class="['rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500', { 'err-shake': errMsg }]"
            >
              {{ errMsg }}
            </div>

            <!-- 登录按钮 -->
            <button
              type="submit"
              :disabled="loading"
              class="btn-primary btn-press btn-breathe group relative w-full overflow-hidden px-6 py-3 text-base font-semibold"
            >
              <span aria-hidden class="pointer-events-none absolute left-0 top-0 h-full w-2/5 bg-white/30 blur-sm group-hover:animate-sweep" />
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
</template>

<style scoped>
/* 登录页背景：奶油米黄渐变 + 暗色模式 */
.login-page {
  background: linear-gradient(135deg, #fff0e6 0%, #fff8f0 40%, #eafaf1 100%);
}
.dark .login-page {
  background: linear-gradient(135deg, #1a1714 0%, #231f1a 40%, #1a2018 100%);
}

/* 装饰光斑 */
.decor-blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(120px);
  animation: float-decor 6s ease-in-out infinite;
}
.decor-blob:nth-child(1) {
  top: -8rem;
  left: -8rem;
  width: 28rem;
  height: 28rem;
}
.decor-blob:nth-child(2) {
  top: 33%;
  right: -10rem;
  width: 32rem;
  height: 32rem;
  transform: translateY(-50%);
}
.decor-blob:nth-child(3) {
  bottom: -8rem;
  left: 25%;
  width: 26rem;
  height: 26rem;
}
.dark .decor-blob {
  opacity: 0.15;
}

.motto-enter-active,
.motto-leave-active {
  transition: opacity 0.5s ease;
}
.motto-enter-from,
.motto-leave-to {
  opacity: 0;
}

/* 登录卡入场动画 */
@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes left-slide-in {
  from {
    opacity: 0;
    transform: translateX(-32px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 左侧品牌区 stagger 入场 */
.left-section > * {
  animation: left-slide-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.left-section > *:nth-child(1) { animation-delay: 0.1s; }
.left-section > *:nth-child(2) { animation-delay: 0.2s; }
.left-section > *:nth-child(3) { animation-delay: 0.32s; }
.left-section > *:nth-child(4) { animation-delay: 0.44s; }
.left-section > *:nth-child(5) { animation-delay: 0.56s; }

/* 右侧登录卡入场 */
.login-card-wrapper {
  animation: card-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}

/* 输入框聚焦光晕 */
.input-glow:focus {
  box-shadow: 0 0 0 4px rgba(245, 179, 66, 0.15), 0 4px 16px rgba(245, 179, 66, 0.1);
}

/* 登录按钮按压反馈 */
.btn-press:active {
  transform: scale(0.96) translateY(1px) !important;
}

/* 浮动装饰元素 */
@keyframes float-decor {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}
.decor-float {
  animation: float-decor 5s ease-in-out infinite;
}

/* 图标微妙摇摆 */
@keyframes icon-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
.icon-wiggle:hover {
  animation: icon-wiggle 0.6s ease-in-out;
}

/* 错误信息抖动 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.err-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

/* 成功率场呼吸 */
@keyframes success-breathe {
  0%, 100% { box-shadow: 0 4px 12px rgba(214, 148, 38, 0.3); }
  50% { box-shadow: 0 6px 24px rgba(214, 148, 38, 0.5); }
}
.btn-breathe:not(:disabled) {
  animation: success-breathe 2.5s ease-in-out infinite;
}

/* 减少动态 */
@media (prefers-reduced-motion: reduce) {
  .left-section > *,
  .login-card-wrapper,
  .decor-float,
  .icon-wiggle:hover,
  .btn-breathe:not(:disabled) {
    animation: none !important;
  }
}
</style>
