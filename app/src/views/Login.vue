<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore, currentTermStr, termOptions, findHistoryByName } from '../stores/user'
import { useRouter, useRoute } from 'vue-router'
import { Sparkles, ArrowRight, KeyRound, User2, X, Save, School, RefreshCw } from 'lucide-vue-next'
import { avatarPool } from '../seed'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const toast = useToastStore()

const LOGIN_CODE = '1314520'

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '早上好'
  if (h >= 12 && h < 18) return '下午好'
  return '晚上好'
})

const name = ref(userStore.user?.name || '')
const avatar = ref(userStore.user?.avatar || '🍎')
const motto = ref(userStore.user?.motto || '用爱浇灌每一颗小苗 🌱')
const loginCode = ref('')

const mottoPool = [
  '用爱浇灌每一颗小苗 🌱',
  '每一颗星都有自己的光芒 ✨',
  '耐心是教育最美的语言 🌸',
  '今天的努力，明天的收获 🌾',
  '让每个孩子都闪闪发光 🌟',
  '教育是心与心的相遇 💛',
  '陪伴是最长情的告白 🕊️',
  '播种习惯，收获性格 🌳',
  '因材施教，静待花开 🌷',
  '做学生成长路上的点灯人 🕯️',
  '知识是光，照亮前路 📚',
  '以爱为底色，绘童年色彩 🎨',
]
function refreshMotto() {
  const current = motto.value.trim()
  let next = mottoPool[Math.floor(Math.random() * mottoPool.length)]
  // 尽量不与当前重复
  if (mottoPool.length > 1) {
    let guard = 0
    while (next === current && guard < 10) {
      next = mottoPool[Math.floor(Math.random() * mottoPool.length)]
      guard++
    }
  }
  motto.value = next
}

// 首次设置弹框
const firstSetupOpen = ref(false)
const editSubjects = ref<string[]>([])
const editTerm = ref(currentTermStr())
const editName = ref('')
const editAvatar = ref('🍎')
const editSchool = ref('')

const allSubjects = [
  '语文',
  '数学',
  '英语',
  '科学',
  '品德',
  '音乐',
  '美术',
  '体育',
  '综合实践',
  '信息技术',
]

const termList = computed(() => termOptions())

const historyList = ref<{ name: string; avatar: string; lastLoginAt: number }[]>([])

onMounted(() => {
  try {
    const raw = localStorage.getItem('trace-user-history')
    if (raw) {
      const list = JSON.parse(raw) || []
      historyList.value = list.slice(0, 6).map((h: any) => ({
        name: h.name,
        avatar: h.avatar,
        lastLoginAt: h.lastLoginAt,
      }))
    }
  } catch (e) {
    /* noop */
  }
})

function pickHistory(h: { name: string; avatar: string }) {
  name.value = h.name
  avatar.value = h.avatar
}

function toggleSubject(s: string) {
  const i = editSubjects.value.indexOf(s)
  if (i >= 0) editSubjects.value.splice(i, 1)
  else editSubjects.value.push(s)
}

function enter() {
  const n = name.value.trim()
  if (!n) {
    toast.warning('请先填写老师称呼')
    return
  }
  if (loginCode.value.trim() !== LOGIN_CODE) {
    toast.error('登录码不正确')
    return
  }
  // 检查历史
  const hist = findHistoryByName(n)
  if (hist) {
    // 已有历史：直接用历史数据登录
    userStore.login(
      n,
      hist.subject,
      avatar.value,
      motto.value,
      { subjects: hist.subjects || [], term: hist.term || currentTermStr(), school: hist.school || '' },
    )
    toast.success('欢迎回来, ' + n + ' 老师!')
    goRedirect()
  } else {
    // 首次：弹框设置
    editName.value = n
    editAvatar.value = avatar.value
    editSubjects.value = []
    editTerm.value = currentTermStr()
    editSchool.value = (userStore.user && userStore.user.school) || ''
    firstSetupOpen.value = true
  }
}

function confirmFirstSetup() {
  if (!editSubjects.value.length) {
    toast.warning('请至少勾选一个任教学科')
    return
  }
  if (!editTerm.value.trim()) {
    toast.warning('请填写或选择学期')
    return
  }
  const subjects = [...editSubjects.value]
  userStore.login(
    editName.value.trim(),
    subjects[0],
    editAvatar.value,
    motto.value,
    { subjects, term: editTerm.value.trim(), school: editSchool.value.trim() },
  )
  firstSetupOpen.value = false
  toast.success('欢迎, ' + editName.value + ' 老师!')
  goRedirect()
}

function goRedirect() {
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 py-8">
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

    <div class="grid lg:grid-cols-2 gap-6 sm:gap-10 max-w-5xl xl:max-w-6xl w-full items-center relative xl:pr-20">
      <!-- 左侧欢迎 -->
      <div class="space-y-4 sm:space-y-5 text-center lg:text-center -mt-6 lg:-mt-10">
        <div class="inline-flex items-center gap-1.5 chip bg-white/80 text-cocoa-800 border border-white/80 shadow-softer px-4 py-1.5 text-sm font-semibold tracking-wide">
          <Sparkles :size="16" class="text-butter-500" /> 园丁工作台
        </div>
        <h1 class="title-display text-3xl sm:text-4xl lg:text-5xl leading-tight text-cocoa-900">
          {{ greeting }}，老师 <span class="inline-block animate-wiggle">👋</span>
          <br class="hidden sm:block">
          <span class="sm:hidden">今天也要</span>
          <span class="hidden sm:inline">今天也要</span> <span class="scribble">闪闪发光</span> 哦
        </h1>
        <p class="text-cocoa-500 text-sm sm:text-base max-w-md mx-auto lg:mx-0">
          只需填写称呼与登录码，便可永久使用你的「工作台」。
          所有数据都保存在本机浏览器，安全又贴心。
        </p>
        <ul class="space-y-2 text-cocoa-700 text-sm hidden lg:block">
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-butter-300 flex items-center justify-center">1</span>
            填写你的称呼
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-sakura-300 flex items-center justify-center">2</span>
            输入登录码
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-mint-300 flex items-center justify-center">3</span>
            首次登录设置任教学期与学科后即可使用
          </li>
        </ul>
        <div class="flex items-center justify-center lg:justify-start gap-3 pt-2">
          <div class="text-3xl sm:text-4xl animate-wiggleSlow">
            📚
          </div>
          <div class="text-2xl sm:text-3xl animate-floaty">
            ✏️
          </div>
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
      <div class="card-soft p-5 sm:p-7 lg:p-9 relative">
        <div class="absolute -top-4 -left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-butter-300/80 flex items-center justify-center text-xl sm:text-2xl shadow-pop">
          {{ avatar }}
        </div>
        <h2 class="title-display text-xl sm:text-2xl mb-1">
          一键登录
        </h2>
        <p class="text-xs sm:text-sm text-cocoa-500 mb-4 sm:mb-6">
          只需要 5 秒，立即开始今天的工作 ✨
        </p>

        <div class="space-y-4">
          <div>
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              <User2 :size="12" /> 老师称呼
            </label>
            <input
              v-model="name"
              class="input-soft mt-1"
              placeholder="比如：珊珊老师"
              maxlength="20"
              @keyup.enter="enter"
            >
          </div>

          <!-- 历史记录快速选择 -->
          <div
            v-if="historyList.length"
            class="text-xs text-cocoa-500"
          >
            <div class="ml-1 mb-1">
              历史账号：
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="h in historyList"
                :key="h.name"
                class="chip border bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100"
                type="button"
                @click="pickHistory(h)"
              >
                <span class="mr-1">{{ h.avatar }}</span>{{ h.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              <KeyRound :size="12" /> 登录码
            </label>
            <input
              v-model="loginCode"
              type="password"
              class="input-soft mt-1"
              placeholder="请输入登录码"
              maxlength="20"
              @keyup.enter="enter"
            >
            <div class="text-[10px] text-cocoa-400 mt-0.5 ml-1">
              仅本人知晓的登录码，错误将无法登录
            </div>
          </div>

          <div>
            <label class="text-xs text-cocoa-500 ml-1">选择一个表情头像</label>
            <div class="mt-1 grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 rounded-2xl bg-white/60 border border-white/80">
              <button
                v-for="a in avatarPool"
                :key="a"
                class="aspect-square rounded-xl text-2xl flex items-center justify-center transition"
                :class="avatar === a ? 'bg-butter-300 scale-110 shadow-softer' : 'hover:bg-butter-100'"
                @click="avatar = a"
                type="button"
              >
                {{ a }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">教育格言 (可选)</label>
            <div class="flex items-center gap-2 mt-1">
              <input
                v-model="motto"
                class="input-soft flex-1"
                placeholder="一句话写给你和你的学生们"
                maxlength="50"
                @keyup.enter="enter"
              >
              <button
                type="button"
                class="btn-ghost !px-2.5 !py-2 shrink-0"
                title="换一句"
                @click="refreshMotto"
              >
                <RefreshCw :size="14" />
              </button>
            </div>
          </div>
        </div>

        <button
          class="btn-primary w-full mt-6 !py-3 !text-base"
          @click="enter"
        >
          开始工作 <ArrowRight :size="18" />
        </button>
        <p class="text-center text-xs text-cocoa-300 mt-3">
          数据保存在本地浏览器，不会上传任何服务器
        </p>
      </div>

      <!-- 右侧竖排艺术字：放在登录框与右边缘之间 -->
      <div
        class="hidden xl:flex absolute -right-28 top-1/4 -translate-y-1/2 h-4/5 items-center justify-center pointer-events-none select-none animate-bouncey"
        style="writing-mode: vertical-rl; text-orientation: mixed;"
      >
        <span
          class="text-2xl font-bold tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-b from-butter-500 via-sakura-400 to-mint-400 opacity-80 drop-shadow-sm"
        >
          我命由天不由我
        </span>
      </div>
    </div>

    <!-- 首次登录弹框：设置任教学期与学科 -->
    <Modal
      :open="firstSetupOpen"
      title="首次登录设置"
      width="560px"
      :closable="false"
      @close="firstSetupOpen = false"
    >
      <div class="space-y-3">
        <div class="text-sm text-cocoa-700">
          欢迎, <span class="text-butter-600 font-medium">{{ editName }}</span> 老师! 第一次来, 请简单设置一下：
        </div>

        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <School :size="11" /> 所在学校
          </label>
          <input
            v-model="editSchool"
            class="input-soft mt-1"
            placeholder="如：阳光小学"
            maxlength="30"
          >
        </div>

        <div>
          <label class="text-xs text-cocoa-500 ml-1">当前任教学期</label>
          <div class="mt-1 flex gap-2">
            <select
              v-model="editTerm"
              class="input-soft flex-1"
            >
              <option
                v-for="t in termList"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
            <input
              v-model="editTerm"
              class="input-soft flex-1"
              placeholder="或自定义, 如 2026春季学期"
            >
          </div>
        </div>

        <div>
          <label class="text-xs text-cocoa-500 ml-1">任教学科 (可多选)</label>
          <div class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="s in allSubjects"
              :key="s"
              type="button"
              class="chip border transition"
              :class="
                editSubjects.includes(s)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleSubject(s)"
            >
              {{ editSubjects.includes(s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
          <div
            v-if="editSubjects.length"
            class="text-[10px] text-cocoa-500 mt-1.5"
          >
            已选 {{ editSubjects.length }} 个学科
          </div>
        </div>

        <div class="text-[10px] text-cocoa-400">
          设置后可在「个人中心」随时修改。
        </div>
      </div>
      <template #footer>
        <button
          class="btn-primary"
          @click="confirmFirstSetup"
        >
          <Save :size="14" /> 确认进入
        </button>
      </template>
    </Modal>
  </div>
</template>
