<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">🏡 家长中心</view>
      <view class="status" :class="connected ? 'on' : ''">{{ statusText }}</view>
      <view class="out" @click="logout">退出</view>
    </view>

    <view class="kids" v-if="kids.length">
      <view class="kid" v-for="k in kids" :key="k.studentId">
        <view class="kn">{{ k.studentName }}</view>
        <view class="kc">{{ k.parentName }} · 班级 {{ k.classId }}</view>
      </view>
    </view>

    <view class="sec" v-if="notices.length">
      <view class="st">📢 班级通知</view>
      <view class="nitem" v-for="n in notices" :key="n.id">
        <view class="nt">{{ n.title }}<text v-if="n.pinned" class="npin">置顶</text></view>
        <view class="nc">{{ n.content }}</view>
      </view>
    </view>

    <view class="sec" v-if="exams.length">
      <view class="st">📊 考试成绩</view>
      <view v-if="analysis" class="abox">
        <view class="arow" v-if="analysis.overallAverage">
          学期总平均分 <text class="av">{{ analysis.overallAverage }}</text>
        </view>
        <view class="arow" v-if="analysis.trend">
          最近趋势
          <text :class="analysis.trend.direction === 'up' ? 'up' : 'down'">
            {{ analysis.trend.direction === 'up' ? '↑' : '↓' }} {{ analysis.trend.diff }}%
          </text>
        </view>
        <view class="arow" v-if="analysis.bestSubject">
          优势学科 <text class="av">{{ analysis.bestSubject }}（均 {{ analysis.bestAvg }}）</text>
        </view>
        <view class="arow" v-if="analysis.worstSubject">
          薄弱学科 <text class="av2">{{ analysis.worstSubject }}（均 {{ analysis.worstAvg }}）</text>
        </view>
      </view>
      <view class="nitem" v-for="e in exams" :key="e.examId">
        <view class="nt">
          {{ e.examName }}
          <text class="ndate">{{ e.date }}</text>
          <text v-if="e.totalScore !== null" class="etotal">综合 {{ e.totalScore }}%</text>
        </view>
        <view class="nc">
          <view v-for="s in e.subjects" :key="s.subject" class="srow">
            <text class="ssubject">{{ s.subject }}</text>
            <text class="sscore">
              {{ s.score !== null ? s.score + ' / ' + s.fullScore : '暂未录入' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view class="hint" v-if="demoMode">
      演示模式：未配置腾讯云 IM。在后端配置 IM_SDK_APP_ID / IM_SECRET_KEY 后即可与老师真实收发。
    </view>

    <scroll-view scroll-x class="chats" v-if="convList.length">
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
import TIM from 'tim-wx-sdk'
import TIMUploadPlugin from 'tim-upload-plugin'
import { theme, parent, logoutParent } from '../../common/store'
import { parentApi } from '../../common/request'

const dark = computed(() => theme.mode === 'dark')

const demoMode = ref(true)
const connected = ref(false)
const loginUser = ref('')
const kids = ref([])
const notices = ref([])
const exams = ref([])
const analysis = ref(null)
const convList = ref([])
const activeConvId = ref('')
const draft = ref('')
const scrollTarget = ref('')

const demoSeed = [
  {
    id: 'C2Cteacher',
    name: '老师',
    avatar: '🧑‍🏫',
    to: 'teacher',
    type: 'C2C',
    lastText: '',
    sub: '',
    messages: [
      { id: 'd1', me: false, type: 'text', text: '家长您好，小明今天课堂表现很积极，作业也完成了 👍', isRead: true },
    ],
  },
]

const activeConv = computed(
  () =>
    convList.value.find((c) => c.id === activeConvId.value) ||
    convList.value[0] || { id: '', name: '', avatar: '', to: '', type: '', lastText: '', sub: '', messages: [] },
)

const statusText = computed(() => {
  if (demoMode.value) return '演示模式'
  return connected.value ? '已接入腾讯云 IM' : '连接中…'
})

let ptim = null
let sdkReady = false

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
  const type = c.type
  const to = c.to
  let name = to
  let avatar = '👤'
  if (type === 'GROUP') {
    name = (c.groupProfile && c.groupProfile.name) || to
    avatar = '👥'
  } else if (type === 'C2C') {
    name = (c.userProfile && (c.userProfile.nick || c.userProfile.userID)) || to
    avatar = to === 'teacher' || to.indexOf('teacher') === 0 ? '🧑‍🏫' : '👤'
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

function onSdkReady() {
  sdkReady = true
  connected.value = true
  demoMode.value = false
  ptim.getConversationList().then((res) => applyConvList(res.data.conversationList)).catch(() => {})
}

function applyConvList(list) {
  const map = {}
  convList.value.forEach((c) => (map[c.id] = c))
  for (const c of list) {
    const norm = normConv(c)
    if (map[norm.id]) map[norm.id].lastText = norm.lastText
    else map[norm.id] = norm
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
      ptim.setMessageRead({ conversationID: convId }).catch(() => {})
    }
  }
}

async function initTim(sdkAppId, userSig) {
  if (ptim) {
    if (sdkReady && !connected.value) {
      try {
        await ptim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) })
      } catch (e) {}
    }
    return
  }
  ptim = TIM.create({ SDKAppID: Number(sdkAppId) })
  ptim.setLogLevel(1)
  ptim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin })
  ptim.on(TIM.EVENT.SDK_READY, onSdkReady)
  ptim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived)
  ptim.on(TIM.EVENT.ERROR, (e) => console.error('[ParentIM] error', e))
  try {
    await ptim.login({ userID: loginUser.value, userSig: decodeURIComponent(userSig) })
  } catch (e) {
    uni.showToast({ title: 'IM 登录失败，请检查密钥', icon: 'none' })
  }
}

function scrollToBottom() {
  nextTick(() => {
    const list = activeConv.value.messages
    if (list && list.length) scrollTarget.value = list[list.length - 1].id
  })
}

async function openConv(id) {
  activeConvId.value = id
  if (demoMode.value) return
  const conv = convList.value.find((c) => c.id === id)
  if (!conv) return
  try {
    const res = await ptim.getMessageList({ conversationID: id })
    conv.messages = res.data.messageList.map(normMsg)
  } catch (e) {}
  try {
    await ptim.setMessageRead({ conversationID: id })
  } catch (e) {}
  scrollToBottom()
}

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
      conv.messages.push({ id: rid, me: false, type: 'text', text: '（老师演示回复）收到，谢谢家长配合！', isRead: true })
      conv.lastText = '（老师演示回复）收到，谢谢家长配合！'
      scrollToBottom()
    }, 800)
    return
  }
  try {
    const msg = ptim.createTextMessage({ to: conv.to, conversationType: conv.type, payload: { text } })
    await ptim.sendMessage(msg)
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
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      try {
        const msg = ptim.createImageMessage({
          to: conv.to,
          conversationType: conv.type,
          payload: { file: res },
          onProgress: () => {},
        })
        await ptim.sendMessage(msg)
        conv.messages.push(normMsg(msg))
        conv.lastText = '[图片]'
        scrollToBottom()
      } catch (e) {
        uni.showToast({ title: '图片发送失败', icon: 'none' })
      }
    },
  })
}

function previewImg(url) {
  if (!url) return
  uni.previewImage({ urls: [url], current: url })
}

function logout() {
  logoutParent()
  uni.reLaunch({ url: '/pages/login/login' })
}

onShow(async () => {
  if (!parent.token) {
    uni.reLaunch({ url: '/pages/parent-login/parent-login' })
    return
  }
  loginUser.value = (parent.user && parent.user.imUserId) || ''
  if (demoMode.value && convList.value.length === 0) {
    convList.value = JSON.parse(JSON.stringify(demoSeed))
    activeConvId.value = convList.value[0] ? convList.value[0].id : ''
  }
  try {
    const me = await parentApi.get('/parent-auth/me')
    kids.value = (me && me.kids) || []
    const ns = await parentApi.get('/parent-auth/notices')
    notices.value = Array.isArray(ns) ? ns : []
    const edata = await parentApi.get('/parent-auth/exams')
    exams.value = (edata && edata.exams) || []
    analysis.value = (edata && edata.analysis) || null
  } catch (e) {}
  try {
    const r = await parentApi.get('/parent-auth/im-user-sig')
    if (r && r.sdkAppId && r.userSig) {
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
.out { font-size: 24rpx; color: #9aa0a6; }
.kids { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.kid { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; }
.kn { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.kc { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.abox { background: var(--c-input); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; }
.arow { font-size: 24rpx; color: var(--c-sub); line-height: 1.8; }
.av { color: #07c160; font-weight: 700; }
.av2 { color: #e06c75; font-weight: 700; }
.up { color: #07c160; }
.down { color: #e06c75; }
.ndate { font-size: 20rpx; color: var(--c-sub); margin-left: 12rpx; font-weight: 400; }
.etotal { font-size: 22rpx; color: #07c160; margin-left: 12rpx; }
.srow { display: flex; justify-content: space-between; padding: 6rpx 0; }
.ssubject { color: var(--c-title); }
.sscore { color: var(--c-sub); }
.hint { font-size: 22rpx; color: #bbb; background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 18rpx; margin-bottom: 14rpx; line-height: 1.5; }
.chats { white-space: nowrap; margin-bottom: 14rpx; }
.chat { display: inline-block; width: 200rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; margin-right: 14rpx; vertical-align: top; }
.chat.on { outline: 2rpx solid var(--c-accent); }
.ava { font-size: 48rpx; text-align: center; }
.nm { font-size: 24rpx; text-align: center; color: var(--c-title); font-weight: 700; margin-top: 6rpx; }
.last { font-size: 20rpx; color: var(--c-sub); margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.convhead { display: flex; align-items: baseline; gap: 14rpx; padding: 4rpx 6rpx 12rpx; }
.convhead .cn { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.msgs { flex: 1; background: var(--c-card2); border-radius: 16rpx; padding: 18rpx; margin-bottom: 14rpx; }
.row { display: flex; margin-bottom: 16rpx; }
.row.me { justify-content: flex-end; }
.col { display: flex; flex-direction: column; align-items: flex-start; max-width: 72%; }
.row.me .col { align-items: flex-end; }
.bubble { max-width: 100%; background: #fff; color: #4a3f35; padding: 16rpx 22rpx; border-radius: 16rpx; font-size: 26rpx; line-height: 1.5; }
.img { width: 280rpx; border-radius: 14rpx; }
.row.me .bubble { background: #07c160; color: #fff; }
.inputbar { display: flex; gap: 14rpx; align-items: center; }
.imgbtn { font-size: 40rpx; padding: 0 6rpx; color: var(--c-sub); }
.inp { flex: 1; background: var(--c-card); border: 1px solid var(--c-input-border); border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; color: var(--c-text); }
.send { background: #07c160; color: #fff; padding: 0 36rpx; border-radius: 40rpx; display: flex; align-items: center; font-size: 28rpx; height: 72rpx; }
.dark .t { color: var(--c-title); }
.dark .page { background: var(--c-bg); }
.dark .chat, .dark .msgs, .dark .kid { background: var(--c-card); }
.dark .bubble { background: var(--c-input); color: var(--c-text); }
</style>
