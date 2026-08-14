<script setup lang="ts">
/**
 * 家校沟通 IM（对齐小程序 pages/community/im.vue）
 * - 后端未配置腾讯 IM（/im/user-sig 返回空签名）时自动进入演示模式
 * - 已配置时动态加载 tim-js-sdk（构建期不强制依赖，缺失则回退演示模式）
 * - 支持从家长花名册发起单聊、一键创建全班群（群号落库）
 */
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { getImUserSig, listImParents, createImClassGroup } from '@/api/teacher'
import { toast } from '@/utils/feedback'
import { MessageCircle, Users, Plus, Send } from 'lucide-vue-next'

interface ConvMessage { id: string; me: boolean; text: string; isRead?: boolean; time?: number }
interface Conv { id: string; name: string; avatar: string; to: string; type: 'C2C' | 'GROUP'; lastText: string; sub?: string; unread: number; messages: ConvMessage[] }

const auth = useAuthStore()
const { classes } = useClasses()

const demoMode = ref(true)
const connected = ref(false)
const loginUser = ref('')
const convList = ref<Conv[]>([])
const activeConvId = ref('')
const draft = ref('')
const chatBody = ref<HTMLElement | null>(null)
const showRoster = ref(false)
const rosterClassId = ref('')
const roster = ref<any[]>([])

/** 模块级 TIM 单例（非响应式，避免重复创建） */
let tim: any = null
let TIM: any = null
let sdkReady = false

const demoSeed: Conv[] = [
  {
    id: 'demo_parent_1', name: '张三妈妈', avatar: '👩', to: 'parent_zhang', type: 'C2C', lastText: '好的，谢谢老师！', unread: 0, sub: '示例·三年级2班',
    messages: [
      { id: 'd1', me: false, text: '老师好，张三今天请假，作业我拍照片发您', time: 1 },
      { id: 'd2', me: true, text: '收到，祝早日康复，作业不用着急交', time: 2 },
      { id: 'd3', me: false, text: '好的，谢谢老师！', time: 3 },
    ],
  },
  {
    id: 'demo_group_1', name: '三年级2班 全班群', avatar: '👥', to: 'demo_group', type: 'GROUP', lastText: '明天穿校服，戴红领巾', unread: 1,
    messages: [
      { id: 'g1', me: true, text: '各位家长：明天春游，8点校门口集合', time: 1 },
      { id: 'g2', me: false, text: '收到', time: 2 },
    ],
  },
]

const activeConv = computed(() => convList.value.find(c => c.id === activeConvId.value) || null)
const statusText = computed(() => (demoMode.value ? '演示模式' : connected.value ? '已连接' : '连接中…'))

function seedDemo() {
  convList.value = JSON.parse(JSON.stringify(demoSeed))
  activeConvId.value = convList.value[0]?.id || ''
}

function scrollToBottom() {
  nextTick(() => { if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight })
}

function fmtTime(t?: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ---------------- TIM 事件 ---------------- */
function normMsg(m: any): ConvMessage {
  const type = m.type || (TIM && m.conversationType)
  let text = ''
  try { text = m.payload?.text || '' } catch { text = '' }
  if (type === TIM?.TYPES?.MSG_IMAGE || m?.payload?.imageUrl) text = '[图片]'
  else if (type === TIM?.TYPES?.MSG_SOUND) text = '[语音]'
  else if (type === TIM?.TYPES?.MSG_FILE) text = '[文件]'
  return { id: m.ID || String(Math.random()), me: m.from === loginUser.value, text, isRead: !!m.isPeerRead, time: m.time }
}

function onSdkReady() {
  sdkReady = true
  connected.value = true
  tim?.getConversationList?.().then((res: any) => {
    const list = res?.data?.conversationList || []
    for (const c of list) {
      const isGroup = c.type === 'GROUP'
      const id = c.conversationID
      if (!convList.value.find(x => x.id === id)) {
        convList.value.push({
          id, name: c.userProfile?.nick || c.groupProfile?.name || id, avatar: isGroup ? '👥' : '👤',
          to: isGroup ? c.groupProfile?.groupID : c.userProfile?.userID, type: isGroup ? 'GROUP' : 'C2C',
          lastText: c.lastMessage?.payload?.text || '', unread: c.unreadCount || 0, messages: [],
        })
      }
    }
    if (!activeConvId.value && convList.value.length) activeConvId.value = convList.value[0].id
  }).catch(() => {})
}

function onMessageReceived(ev: any) {
  for (const m of ev.data || []) {
    const conv = convList.value.find(c => c.id === m.conversationID)
    const nm = normMsg(m)
    if (conv) {
      conv.messages.push(nm)
      conv.lastText = nm.text
      if (m.conversationID !== activeConvId.value) conv.unread++
    }
    if (activeConvId.value === m.conversationID) scrollToBottom()
  }
}

/* ---------------- 初始化 ---------------- */
async function initTim(sdkAppId: string, userSig: string) {
  if (tim) {
    if (sdkReady && !connected.value) {
      try { await tim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) }) } catch { /* ignore */ }
    }
    return
  }
  // 动态导入 tim-js-sdk（包未安装时回退演示模式，不阻塞构建）
  try {
    const pkg = 'tim-js-sdk'
    const mod: any = await import(/* @vite-ignore */ pkg)
    TIM = mod.default || mod
  } catch {
    toast.warning('Web 端 IM SDK 未安装，已进入演示模式')
    demoMode.value = true
    return
  }
  try {
    tim = TIM.create({ SDKAppID: Number(sdkAppId) })
    tim.setLogLevel(1)
    tim.on(TIM.EVENT.SDK_READY, onSdkReady)
    tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived)
    await tim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) })
    demoMode.value = false
  } catch {
    toast.error('IM 登录失败，请检查密钥配置')
  }
}

onMounted(async () => {
  seedDemo()
  try {
    const r = await getImUserSig()
    if (r && r.sdkAppId && r.userSig) {
      loginUser.value = String(auth.user?.id || 'teacher')
      await initTim(r.sdkAppId, r.userSig)
    }
  } catch {
    demoMode.value = true
  }
})

onBeforeUnmount(() => {
  try { tim?.off?.(TIM?.EVENT?.SDK_READY, onSdkReady) } catch { /* ignore */ }
  try { tim?.off?.(TIM?.EVENT?.MESSAGE_RECEIVED, onMessageReceived) } catch { /* ignore */ }
})

/* ---------------- 会话操作 ---------------- */
async function openConv(id: string) {
  activeConvId.value = id
  const conv = convList.value.find(c => c.id === id)
  if (!conv) return
  conv.unread = 0
  if (demoMode.value || !tim) return
  try {
    const res = await tim.getMessageList({ conversationID: id })
    conv.messages = (res.data.messageList || []).map(normMsg)
  } catch { /* ignore */ }
  try { await tim.setMessageRead({ conversationID: id }) } catch { /* ignore */ }
  scrollToBottom()
}

async function openByTo(to: string, name: string, type: 'C2C' | 'GROUP', sub = '') {
  const id = type + to
  let conv = convList.value.find(c => c.id === id)
  if (!conv) {
    conv = reactive({ id, name, avatar: type === 'GROUP' ? '👥' : '👤', to, type, lastText: '', sub, unread: 0, messages: [] as ConvMessage[] })
    convList.value.unshift(conv)
  }
  await openConv(id)
}

/* ---------------- 花名册 / 建群 ---------------- */
const classLabel = (c: any) => c && (c.name || `${c.grade || ''}（${c.classNo || ''}）班`)

async function openRoster() {
  await loadClasses()
  if (!classes.value.length) { toast.warning('暂无班级'); return }
  rosterClassId.value = classes.value[0].id
  showRoster.value = true
  await loadRoster()
}

async function loadRoster() {
  roster.value = []
  try { roster.value = (await listImParents(rosterClassId.value)) || [] } catch { roster.value = [] }
}

async function pickParent(p: any) {
  showRoster.value = false
  const cls = classes.value.find(c => c.id === rosterClassId.value)
  await openByTo(p.imUserId, p.parentName, 'C2C', `${classLabel(cls)}·${p.studentName}`)
}

async function createClassGroupFlow() {
  await loadClasses()
  const cls = classes.value[0]
  if (!cls) { toast.warning('暂无班级'); return }
  if (cls.imGroupId) { await openByTo(cls.imGroupId, classLabel(cls), 'GROUP'); return }
  if (demoMode.value) { await openByTo('demo_group_' + cls.id, classLabel(cls) + ' 全班群', 'GROUP'); return }
  try {
    const members = roster.value.map(p => ({ userID: p.imUserId }))
    const res = await tim.createGroup({ name: classLabel(cls), type: TIM.TYPES.GRP_PUBLIC, memberList: members })
    const gid = res.data.group.groupID
    toast.success('班级群已创建')
    try { await createImClassGroup({ classId: cls.id, groupId: gid }) } catch { /* ignore */ }
    cls.imGroupId = gid
    await openByTo(gid, classLabel(cls) + ' 全班群', 'GROUP')
  } catch {
    toast.error('建群失败，请检查 IM 配置')
  }
}

/* ---------------- 发送 ---------------- */
async function send() {
  const text = draft.value.trim()
  if (!text) return
  const conv = activeConv.value
  if (!conv) return
  draft.value = ''
  if (demoMode.value || !tim) {
    conv.messages.push({ id: 'l' + Date.now(), me: true, text, isRead: false })
    conv.lastText = text
    scrollToBottom()
    setTimeout(() => {
      conv.messages.push({ id: 'r' + Date.now(), me: false, text: '（演示自动回复）收到，谢谢老师！', isRead: true })
      conv.lastText = '（演示自动回复）收到，谢谢老师！'
      scrollToBottom()
    }, 800)
    return
  }
  try {
    const msg = tim.createTextMessage({ to: conv.to, conversationType: conv.type, payload: { text } })
    await tim.sendMessage(msg)
    conv.messages.push(normMsg(msg))
    conv.lastText = text
    scrollToBottom()
  } catch {
    toast.error('发送失败')
    draft.value = text
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <MessageCircle class="w-6 h-6 text-butter-500" /> 家校沟通
        <span
          class="text-xs font-normal px-2.5 py-1 rounded-full"
          :class="demoMode ? 'bg-cream-100 text-cocoa-400' : connected ? 'bg-mint-100 text-mint-500' : 'bg-butter-100 text-butter-600'"
        >{{ statusText }}</span>
      </h1>
      <div class="flex gap-2">
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm hover:bg-butter-600" @click="openRoster">
          <Plus class="w-4 h-4" /> 从花名册选家长
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-100 text-cocoa-600 text-sm hover:bg-cream-200" @click="createClassGroupFlow">
          <Users class="w-4 h-4" /> 一键全班群
        </button>
      </div>
    </div>

    <!-- 演示模式提示 -->
    <div v-if="demoMode" class="rounded-xl p-3 bg-cream-50 border border-cream-200 text-xs text-cocoa-400 leading-relaxed">
      当前为演示模式：消息仅在本地展示。管理员在「平台配置」中配置腾讯云 IM SDKAppID / SecretKey，并安装 tim-js-sdk 后即可启用真实家校沟通。
    </div>

    <!-- 会话卡片 -->
    <div class="flex gap-3 overflow-x-auto pb-1">
      <button
        v-for="c in convList"
        :key="c.id"
        class="shrink-0 w-44 text-left rounded-2xl p-3 border transition-colors"
        :class="c.id === activeConvId ? 'bg-butter-50 border-butter-300' : 'bg-surface border-cream-200 hover:border-butter-200'"
        @click="openConv(c.id)"
      >
        <div class="text-center text-2xl">{{ c.avatar }}</div>
        <div class="text-center text-sm font-bold text-cocoa-800 truncate mt-1">{{ c.name }}</div>
        <div class="text-center text-xs text-cocoa-400 truncate mt-0.5">{{ c.lastText || '暂无消息' }}</div>
        <div v-if="c.unread" class="mt-1 text-center">
          <span class="inline-block min-w-[18px] px-1 text-[10px] leading-[18px] rounded-full bg-sakura-500 text-white">{{ c.unread > 99 ? '99+' : c.unread }}</span>
        </div>
      </button>
      <div v-if="!convList.length" class="text-sm text-cocoa-400 py-6">暂无会话，点右上角「从花名册选家长」发起沟通</div>
    </div>

    <!-- 聊天面板 -->
    <div v-if="activeConv" class="bg-surface rounded-2xl shadow-softer border border-cream-200 flex flex-col h-[480px]">
      <div class="px-5 py-3 border-b border-cream-100 flex items-baseline gap-3">
        <span class="font-bold text-cocoa-800">{{ activeConv.name }}</span>
        <span v-if="activeConv.sub" class="text-xs text-cocoa-400">{{ activeConv.sub }}</span>
        <span class="text-xs text-cocoa-300">{{ activeConv.type === 'GROUP' ? '群聊' : '单聊' }}</span>
      </div>
      <div ref="chatBody" class="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-cream-50/50">
        <div v-for="m in activeConv.messages" :key="m.id" class="flex" :class="m.me ? 'justify-end' : 'justify-start'">
          <div class="max-w-[70%]">
            <div
              class="px-3.5 py-2 rounded-2xl text-sm leading-relaxed"
              :class="m.me ? 'bg-butter-500 text-white rounded-br-sm' : 'bg-white text-cocoa-800 border border-cream-200 rounded-bl-sm'"
            >{{ m.text }}</div>
            <div class="text-[10px] text-cocoa-300 mt-1" :class="m.me ? 'text-right' : ''">
              {{ fmtTime(m.time) }}<template v-if="m.me && m.isRead"> · 已读</template>
            </div>
          </div>
        </div>
      </div>
      <div class="px-4 py-3 border-t border-cream-100 flex gap-2">
        <input
          v-model="draft"
          placeholder="输入消息，回车发送…"
          class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          @keyup.enter="send"
        />
        <button
          class="flex items-center gap-1 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50"
          :disabled="!draft.trim()"
          @click="send"
        >
          <Send class="w-4 h-4" /> 发送
        </button>
      </div>
    </div>

    <!-- 花名册弹窗 -->
    <div v-if="showRoster" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" @click.self="showRoster = false">
      <div class="bg-surface rounded-2xl shadow-softer w-full max-w-md p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-cocoa-800">家长花名册</h3>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showRoster = false">✕</button>
        </div>
        <select
          v-model="rosterClassId"
          class="w-full mb-3 px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm"
          @change="loadRoster"
        >
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ classLabel(c) }}</option>
        </select>
        <div class="max-h-72 overflow-y-auto divide-y divide-cream-100">
          <button
            v-for="p in roster"
            :key="p.imUserId"
            class="w-full flex items-center justify-between px-2 py-2.5 hover:bg-cream-50 rounded-lg text-left"
            @click="pickParent(p)"
          >
            <div>
              <div class="text-sm text-cocoa-800">{{ p.parentName }}（{{ p.studentName }} {{ p.relation }}）</div>
              <div class="text-xs text-cocoa-400">{{ p.phone || p.wechat || '无联系方式' }}</div>
            </div>
            <MessageCircle class="w-4 h-4 text-butter-500" />
          </button>
          <div v-if="!roster.length" class="text-center text-sm text-cocoa-400 py-8">该班暂无家长联系记录</div>
        </div>
      </div>
    </div>
  </div>
</template>
