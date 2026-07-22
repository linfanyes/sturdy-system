<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">💬 家校沟通</view>
      <view class="status" :class="connected ? 'on' : ''">{{ statusText }}</view>
      <view v-if="!demoMode" class="add" @click="newConv">＋</view>
    </view>
    <view class="hint" v-if="demoMode">
      演示模式：未配置腾讯云 IM（体验版免费）。在后端配置 IM_SDK_APP_ID / IM_SECRET_KEY 后即可真实收发。下方为模拟会话。
    </view>

    <scroll-view scroll-x class="chats">
      <view
        v-for="c in convList"
        :key="c.id"
        class="chat"
        :class="activeConvId === c.id && 'on'"
        @click="openConv(c.id)"
      >
        <view class="ava">{{ c.avatar }}</view>
        <view class="nm">{{ c.name }}</view>
        <view class="last" v-if="c.lastText">{{ c.lastText }}</view>
      </view>
    </scroll-view>

    <view class="convhead" v-if="activeConv.id">
      <view class="cn">{{ activeConv.name }}</view>
      <view class="cs" v-if="activeConv.sub">{{ activeConv.sub }}</view>
    </view>

    <scroll-view scroll-y class="msgs" :scroll-into-view="scrollTarget" scroll-with-animation>
      <view
        v-for="m in activeConv.messages"
        :key="m.id"
        :id="m.id"
        class="row"
        :class="m.me && 'me'"
      >
        <view class="col">
          <image
            v-if="m.type === 'image' && m.imageUrl"
            :src="m.imageUrl"
            class="img"
            mode="widthFix"
            @click="previewImg(m.imageUrl)"
          />
          <view v-else class="bubble">{{ m.text }}</view>
          <view v-if="m.me && m.isRead" class="read">已读</view>
        </view>
      </view>
    </scroll-view>

    <view class="inputbar">
      <view class="imgbtn" @click="sendImage">🖼</view>
      <input v-model="draft" class="inp" placeholder="输入消息…" confirm-type="send" @confirm="send" />
      <view class="send" @click="send">发送</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme, auth } from '../../common/store'
import api from '../../common/request'
import { pickAndCompressImage } from '../../common/image'

const dark = computed(() => theme.mode === 'dark')

// —— 状态 ——
const demoMode = ref(true) // true=演示模式（未配置真实 IM）
const connected = ref(false) // 已登录腾讯云 IM
const loginUser = ref('') // 当前登录的 IM userID（教师）
const convList = ref([]) // 会话列表（归一化）
const activeConvId = ref('')
const draft = ref('')
const scrollTarget = ref('')
const classes = ref([]) // 教师班级列表（用于花名册选家长 / 全班群）

// 演示模式种子数据（与真实会话使用同一归一化结构）
const demoSeed = [
  {
    id: 'C2C_parent_zhang',
    name: '张三妈妈',
    avatar: '👩',
    to: 'parent_zhang',
    type: 'C2C',
    lastText: '',
    sub: '',
    messages: [
      { id: 'd1', me: false, type: 'text', text: '老师好，小明今天作业完成了吗？', isRead: true },
      { id: 'd2', me: true, type: 'text', text: '完成的，课堂表现也很积极 👍', isRead: false },
    ],
  },
  {
    id: 'C2C_parent_li',
    name: '李四爸爸',
    avatar: '👨',
    to: 'parent_li',
    type: 'C2C',
    lastText: '',
    sub: '',
    messages: [{ id: 'd3', me: false, type: 'text', text: '明天家长会我能请假来参加吗？', isRead: true }],
  },
  {
    id: 'C2C_parent_wang',
    name: '王五奶奶',
    avatar: '👵',
    to: 'parent_wang',
    type: 'C2C',
    lastText: '',
    sub: '',
    messages: [{ id: 'd4', me: false, type: 'text', text: '孩子最近在幼儿园吃饭乖吗？', isRead: true }],
  },
]

const activeConv = computed(
  () =>
    convList.value.find((c) => c.id === activeConvId.value) ||
    convList.value[0] || { id: '', name: '', avatar: '', to: '', type: '', lastText: '', sub: '', messages: [] },
)

const statusText = computed(() => {
  if (demoMode.value) return '演示模式'
  return connected.value ? '已接入腾讯云 IM（体验版）' : '连接中…'
})

// 模块级 TIM 单例（非响应式，避免重复创建）
let tim = null
let sdkReady = false

// —— 归一化辅助 ——
function preview(msg) {
  if (!msg) return ''
  const t = msg.type
  if (t === TIM.TYPES.MSG_TEXT) return msg.payload.text
  if (t === TIM.TYPES.MSG_IMAGE) return '[图片]'
  if (t === TIM.TYPES.MSG_SOUND) return '[语音]'
  if (t === TIM.TYPES.MSG_FILE) return '[文件]'
  if (t === TIM.TYPES.MSG_CUSTOM) return '[自定义消息]'
  return '[消息]'
}

function normConv(c) {
  const type = c.type // 'C2C' | 'GROUP' | 'TIM'
  const to = c.to
  let name = to
  let avatar = '👤'
  if (type === 'GROUP') {
    name = (c.groupProfile && c.groupProfile.name) || to
    avatar = '👥'
  } else if (type === 'C2C') {
    name = (c.userProfile && (c.userProfile.nick || c.userProfile.userID)) || to
    avatar = '👤'
  } else {
    name = '系统通知'
    avatar = '🔔'
  }
  return { id: c.conversationID, name, avatar, to, type, lastText: preview(c.lastMessage), sub: '', messages: [] }
}

function normMsg(m) {
  const me = m.from === loginUser.value
  let type = 'text'
  let text = ''
  let imageUrl = ''
  if (m.type === TIM.TYPES.MSG_TEXT) {
    type = 'text'
    text = m.payload.text
  } else if (m.type === TIM.TYPES.MSG_IMAGE) {
    type = 'image'
    const arr = m.payload.imageInfoArray || []
    imageUrl = arr.length ? arr[arr.length - 1].url : ''
  } else if (m.type === TIM.TYPES.MSG_FILE) {
    type = 'text'
    text = '[文件]'
  } else if (m.type === TIM.TYPES.MSG_SOUND) {
    type = 'text'
    text = '[语音]'
  } else if (m.type === TIM.TYPES.MSG_CUSTOM) {
    type = 'text'
    text = '[自定义消息]'
  } else {
    type = 'text'
    text = '[暂不支持的消息]'
  }
  return { id: m.ID, me, type, text, imageUrl, isRead: !!m.isPeerRead, time: m.time }
}

// —— TIM 事件 ——
function onSdkReady() {
  sdkReady = true
  connected.value = true
  demoMode.value = false
  tim.getConversationList()
    .then((res) => applyConvList(res.data.conversationList))
    .catch(() => {})
}

function applyConvList(list) {
  const map = {}
  convList.value.forEach((c) => (map[c.id] = c))
  for (const c of list) {
    const norm = normConv(c)
    if (map[norm.id]) {
      map[norm.id].lastText = norm.lastText
      if (norm.name && norm.name !== norm.to) map[norm.id].name = norm.name
    } else {
      map[norm.id] = norm
    }
  }
  convList.value = Object.values(map)
  if (!activeConvId.value && convList.value.length) activeConvId.value = convList.value[0].id
}

function onMessageReceived(event) {
  for (const m of event.data) {
    const convId = m.conversationID
    let conv = convList.value.find((c) => c.id === convId)
    if (!conv) {
      conv = {
        id: convId,
        name: m.from,
        avatar: convId.indexOf('GROUP') === 0 ? '👥' : '👤',
        to: m.from,
        type: convId.indexOf('GROUP') === 0 ? 'GROUP' : 'C2C',
        lastText: '',
        sub: '',
        messages: [],
      }
      convList.value.push(conv)
    }
    conv.messages.push(normMsg(m))
    conv.lastText = preview(m)
    if (convId === activeConvId.value) {
      scrollToBottom()
      tim.setMessageRead({ conversationID: convId }).catch(() => {})
    }
  }
}

function onPeerRead(event) {
  for (const m of event.data) {
    const conv = convList.value.find((c) => c.id === m.conversationID)
    if (conv) {
      const mm = conv.messages.find((x) => x.id === m.ID)
      if (mm) mm.isRead = true
    }
  }
}

// —— 初始化 ——
async function initTim(sdkAppId, userSig) {
  if (tim) {
    // 已创建：仅确保已登录
    if (sdkReady && !connected.value) {
      try {
        await tim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) })
      } catch (e) {}
    }
    return
  }
  // 动态导入 tim-wx-sdk（避免在未打开 IM 页面时加载 SDK 抛 addListener 错误）
  const TIM = (await import('tim-wx-sdk')).default || (await import('tim-wx-sdk'))
  const TIMUploadPlugin = (await import('tim-upload-plugin')).default || (await import('tim-upload-plugin'))
  tim = TIM.create({ SDKAppID: Number(sdkAppId) })
  tim.setLogLevel(1)
  tim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin })
  tim.on(TIM.EVENT.SDK_READY, onSdkReady)
  tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived)
  tim.on(TIM.EVENT.MESSAGE_READ_BY_PEER, onPeerRead)
  tim.on(TIM.EVENT.ERROR, (e) => console.error('[IM] error', e))
  try {
    await tim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) })
  } catch (e) {
    uni.showToast({ title: 'IM 登录失败，请检查密钥', icon: 'none' })
  }
}

function seedDemo() {
  convList.value = JSON.parse(JSON.stringify(demoSeed))
  activeConvId.value = convList.value[0] ? convList.value[0].id : ''
}

async function openConv(id) {
  activeConvId.value = id
  if (demoMode.value) return
  const conv = convList.value.find((c) => c.id === id)
  if (!conv) return
  try {
    const res = await tim.getMessageList({ conversationID: id })
    conv.messages = res.data.messageList.map(normMsg)
  } catch (e) {}
  try {
    await tim.setMessageRead({ conversationID: id })
  } catch (e) {}
  scrollToBottom()
}

async function openByTo(to, name, type, sub = '') {
  const id = type + to
  let conv = convList.value.find((c) => c.id === id)
  if (!conv) {
    conv = { id, name, avatar: type === 'GROUP' ? '👥' : '👤', to, type, lastText: '', sub, messages: [] }
    convList.value.push(conv)
  }
  activeConvId.value = id
  if (!demoMode.value) {
    try {
      await tim.getConversationProfile({ conversationID: id })
    } catch (e) {}
    try {
      const res = await tim.getMessageList({ conversationID: id })
      conv.messages = res.data.messageList.map(normMsg)
    } catch (e) {}
    try {
      await tim.setMessageRead({ conversationID: id })
    } catch (e) {}
  }
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    const list = activeConv.value.messages
    if (list && list.length) scrollTarget.value = list[list.length - 1].id
  })
}

// —— 发送 ——
async function send() {
  const text = draft.value.trim()
  if (!text) return
  const conv = convList.value.find((c) => c.id === activeConvId.value)
  if (!conv) return
  draft.value = ''
  if (demoMode.value) {
    const id = 'l' + Date.now()
    conv.messages.push({ id, me: true, type: 'text', text, isRead: false })
    conv.lastText = text
    scrollToBottom()
    setTimeout(() => {
      const rid = 'r' + Date.now()
      conv.messages.push({ id: rid, me: false, type: 'text', text: '（演示自动回复）收到，谢谢老师！', isRead: true })
      conv.lastText = '（演示自动回复）收到，谢谢老师！'
      scrollToBottom()
    }, 800)
    return
  }
  try {
    const msg = tim.createTextMessage({
      to: conv.to,
      conversationType: conv.type,
      payload: { text },
    })
    await tim.sendMessage(msg)
    conv.messages.push(normMsg(msg))
    conv.lastText = text
    scrollToBottom()
  } catch (e) {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function sendImage() {
  if (demoMode.value) {
    uni.showToast({ title: '演示模式不支持图片', icon: 'none' })
    return
  }
  const conv = convList.value.find((c) => c.id === activeConvId.value)
  if (!conv) return
  try {
    const pickRes = await pickAndCompressImage({ count: 1 })
    const fileRes = {
      tempFilePaths: pickRes.tempFiles.map((f) => f.tempFilePath),
      tempFiles: pickRes.tempFiles,
    }
    const msg = tim.createImageMessage({
      to: conv.to,
      conversationType: conv.type,
      payload: { file: fileRes },
      onProgress: () => {},
    })
    await tim.sendMessage(msg)
    conv.messages.push(normMsg(msg))
    conv.lastText = '[图片]'
    scrollToBottom()
  } catch (e) {
    uni.showToast({ title: '图片发送失败', icon: 'none' })
  }
}

function previewImg(url) {
  if (!url) return
  uni.previewImage({ urls: [url], current: url })
}

// —— 新建会话 ——
// —— 班级 / 家长花名册 ——
async function loadClasses() {
  if (classes.value.length) return classes.value
  try {
    classes.value = (await api.getList('/classes', { silent: true })) || []
  } catch (e) {
    classes.value = []
  }
  return classes.value
}

function classLabel(c) {
  return c && (c.name || `${c.grade || ''}（${c.classNo || ''}）班`)
}

function pickClass() {
  return new Promise((resolve) => {
    loadClasses().then((list) => {
      if (!list.length) {
        uni.showToast({ title: '暂无班级', icon: 'none' })
        return resolve(null)
      }
      if (list.length === 1) return resolve(list[0])
      uni.showActionSheet({
        itemList: list.map(classLabel),
        success: (r) => resolve(list[r.tapIndex]),
        fail: () => resolve(null),
      })
    })
  })
}

async function pickParentFromRoster() {
  const cls = await pickClass()
  if (!cls) return
  let roster = []
  try {
    roster = (await api.get('/im/parents?classId=' + cls.id)) || []
  } catch (e) {
    roster = []
  }
  if (!roster.length) {
    uni.showToast({ title: '该班暂无家长联系记录', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: roster.map((p) => `${p.parentName}（${p.studentName} ${p.relation}）`),
    success: (r) => {
      const p = roster[r.tapIndex]
      openByTo(p.imUserId, p.parentName, 'C2C', `${classLabel(cls)}·${p.studentName}`)
    },
  })
}

async function createClassGroup() {
  const cls = await pickClass()
  if (!cls) return
  // 已建群：直接打开
  if (cls.imGroupId) {
    openByTo(cls.imGroupId, classLabel(cls), 'GROUP')
    return
  }
  if (demoMode.value) {
    openByTo('demo_group_' + cls.id, classLabel(cls), 'GROUP')
    return
  }
  let roster = []
  try {
    roster = (await api.get('/im/parents?classId=' + cls.id)) || []
  } catch (e) {
    roster = []
  }
  const members = roster.map((p) => ({ userID: p.imUserId }))
  try {
    const res = await tim.createGroup({
      name: classLabel(cls),
      type: TIM.TYPES.GRP_PUBLIC,
      memberList: members,
    })
    const gid = res.data.group.groupID
    uni.showToast({ title: '班级群已创建', icon: 'success' })
    try {
      await api.post('/im/class-group', { classId: cls.id, groupId: gid })
    } catch (e) {}
    const idx = classes.value.findIndex((c) => c.id === cls.id)
    if (idx >= 0) classes.value[idx].imGroupId = gid
    openByTo(gid, classLabel(cls), 'GROUP')
  } catch (e) {
    uni.showToast({ title: '建群失败，请检查 IM 配置', icon: 'none' })
  }
}

function newConv() {
  uni.showActionSheet({
    itemList: ['从花名册选家长', '一键全班群', '发起单聊（输入账号）', '进入班级群（输入群号）', '示例：张三妈妈'],
    success: (r) => {
      if (r.tapIndex === 0) pickParentFromRoster()
      else if (r.tapIndex === 1) createClassGroup()
      else if (r.tapIndex === 2) promptC2C()
      else if (r.tapIndex === 3) promptGroup()
      else if (r.tapIndex === 4) openByTo('parent_zhang', '张三妈妈', 'C2C', '示例')
    },
  })
}

function promptC2C() {
  uni.showModal({
    title: '发起单聊',
    editable: true,
    placeholderText: '输入对方 IM 账号',
    success: (r) => {
      if (r.confirm && r.content && r.content.trim()) {
        const id = r.content.trim()
        openByTo(id, id, 'C2C')
      }
    },
  })
}

function promptGroup() {
  uni.showModal({
    title: '进入班级群',
    editable: true,
    placeholderText: '输入群号 GROUP ID',
    success: (r) => {
      if (r.confirm && r.content && r.content.trim()) {
        const id = r.content.trim()
        openByTo(id, id, 'GROUP')
      }
    },
  })
}

async function createGroup() {
  uni.showModal({
    title: '创建班级群',
    editable: true,
    placeholderText: '群名称，如：三年级2班',
    success: (r) => {
      if (!r.confirm || !r.content) return
      uni.showModal({
        title: '添加成员',
        editable: true,
        placeholderText: '成员 IM 账号，逗号分隔',
        success: async (r2) => {
          const members = (r2.content || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((userID) => ({ userID }))
          try {
            const res = await tim.createGroup({
              name: r.content.trim(),
              type: TIM.TYPES.GRP_PUBLIC,
              memberList: members,
            })
            const gid = res.data.group.groupID
            uni.showToast({ title: '群已创建', icon: 'success' })
            openByTo(gid, r.content.trim(), 'GROUP')
          } catch (e) {
            uni.showToast({ title: '创建失败', icon: 'none' })
          }
        },
      })
    },
  })
}

onShow(async () => {
  if (!auth.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (demoMode.value && convList.value.length === 0) seedDemo()
  try {
    const userId = (auth.user && auth.user.id) || 'teacher'
    const r = await api.post('/im/user-sig', { userId })
    if (r && r.sdkAppId && r.userSig) {
      loginUser.value = userId
      await initTim(r.sdkAppId, r.userSig)
    } else {
      demoMode.value = true
    }
  } catch (e) {
    demoMode.value = true
  }
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.status { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; background: #f3f3f3; color: #9aa0a6; }
.status.on { background: #e8f9e8; color: #07c160; }
.add { font-size: 40rpx; color: #07c160; width: 56rpx; text-align: center; }
.hint { font-size: 22rpx; color: #bbb; background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 18rpx; margin-bottom: 14rpx; line-height: 1.5; }
.chats { white-space: nowrap; margin-bottom: 14rpx; }
.chat { display: inline-block; width: 200rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; margin-right: 14rpx; vertical-align: top; }
.chat.on { outline: 2rpx solid var(--c-accent); }
.ava { font-size: 48rpx; text-align: center; }
.nm { font-size: 24rpx; text-align: center; color: var(--c-title); font-weight: 700; margin-top: 6rpx; }
.last { font-size: 20rpx; color: var(--c-sub); margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.convhead { display: flex; align-items: baseline; gap: 14rpx; padding: 4rpx 6rpx 12rpx; }
.convhead .cn { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.convhead .cs { font-size: 22rpx; color: var(--c-sub); }
.msgs { flex: 1; background: var(--c-card2); border-radius: 16rpx; padding: 18rpx; margin-bottom: 14rpx; }
.row { display: flex; margin-bottom: 16rpx; }
.row.me { justify-content: flex-end; }
.col { display: flex; flex-direction: column; align-items: flex-start; max-width: 72%; }
.row.me .col { align-items: flex-end; }
.bubble { max-width: 100%; background: #fff; color: #4a3f35; padding: 16rpx 22rpx; border-radius: 16rpx; font-size: 26rpx; line-height: 1.5; }
.img { width: 280rpx; border-radius: 14rpx; }
.row.me .bubble { background: #07c160; color: #fff; }
.read { font-size: 18rpx; color: #9aa0a6; margin-top: 4rpx; }
.inputbar { display: flex; gap: 14rpx; align-items: center; }
.imgbtn { font-size: 40rpx; padding: 0 6rpx; color: var(--c-sub); }
.inp { flex: 1; background: var(--c-card); border: 1px solid var(--c-input-border); border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; color: var(--c-text); }
.send { background: #07c160; color: #fff; padding: 0 36rpx; border-radius: 40rpx; display: flex; align-items: center; font-size: 28rpx; height: 72rpx; }
.dark .t { color: var(--c-title); }
.dark .page { background: var(--c-bg); }
.dark .chat, .dark .msgs { background: var(--c-card); }
.dark .bubble { background: var(--c-input); color: var(--c-text); }
</style>
