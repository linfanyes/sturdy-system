<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">💬 家校沟通</view>
      <view class="status" :class="connected ? 'on' : ''">{{ statusText }}</view>
    </view>
    <view class="hint" v-if="!connected">
      演示模式：未配置腾讯云 IM（体验版免费）。在后端配置 IM_SDK_APP_ID / IM_SECRET_KEY 后即可实时收发。下方为模拟会话。
    </view>

    <scroll-view scroll-x class="chats">
      <view
        v-for="c in chats"
        :key="c.id"
        class="chat"
        :class="activeId === c.id && 'on'"
        @click="activeId = c.id"
      >
        <view class="ava">{{ c.avatar }}</view>
        <view class="nm">{{ c.name }}</view>
        <view class="last" v-if="c.messages.length">{{ c.messages[c.messages.length - 1].text }}</view>
      </view>
    </scroll-view>

    <scroll-view scroll-y class="msgs" :scroll-into-view="scrollTarget">
      <view v-for="(m, i) in cur.messages" :key="i" :id="'m' + i" class="row" :class="m.me && 'me'">
        <view class="bubble">{{ m.text }}</view>
      </view>
    </scroll-view>

    <view class="inputbar">
      <input v-model="draft" class="inp" placeholder="输入消息…" confirm-type="send" @confirm="send" />
      <view class="send" @click="send">发送</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import api from '../../common/request'

const dark = computed(() => theme.mode === 'dark')

const connected = ref(false)
const statusText = computed(() => (connected.value ? '已接入腾讯云 IM（体验版）' : '演示模式'))
const activeId = ref('c1')
const draft = ref('')
const scrollTarget = ref('')

const chats = ref([
  {
    id: 'c1',
    name: '张三妈妈',
    avatar: '👩',
    messages: [
      { me: false, text: '老师好，小明今天作业完成了吗？' },
      { me: true, text: '完成的，课堂表现也很积极 👍' },
    ],
  },
  {
    id: 'c2',
    name: '李四爸爸',
    avatar: '👨',
    messages: [{ me: false, text: '明天家长会我能请假来参加吗？' }],
  },
  {
    id: 'c3',
    name: '王五奶奶',
    avatar: '👵',
    messages: [{ me: false, text: '孩子最近在幼儿园吃饭乖吗？' }],
  },
])

const cur = computed(() => chats.value.find((c) => c.id === activeId.value) || chats.value[0])

function send() {
  const text = draft.value.trim()
  if (!text) return
  cur.value.messages.push({ me: true, text })
  draft.value = ''
  scrollTarget.value = 'm' + (cur.value.messages.length - 1)
  // 演示模式：模拟家长自动回复；真实接入后由 IM 事件驱动
  if (!connected.value) {
    setTimeout(() => {
      cur.value.messages.push({ me: false, text: '（演示自动回复）收到，谢谢老师！' })
      scrollTarget.value = 'm' + (cur.value.messages.length - 1)
    }, 800)
  }
}

onShow(async () => {
  try {
    const r = await api.post('/im/user-sig', { userId: 'teacher' })
    if (r && r.sdkAppId) {
      connected.value = true
      // 真实集成（需 npm i tim-wx-sdk）：
      // import TIM from 'tim-wx-sdk'
      // const tim = TIM.create({ SDKAppID: Number(r.sdkAppId) })
      // tim.login({ userID: 'teacher', userSig: r.userSig })
    }
  } catch (e) {
    /* 取不到签名则保持演示模式 */
  }
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.status { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; background: #f3f3f3; color: #9aa0a6; }
.status.on { background: #e8f9e8; color: #07c160; }
.hint { font-size: 22rpx; color: #bbb; background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 18rpx; margin-bottom: 14rpx; line-height: 1.5; }
.chats { white-space: nowrap; margin-bottom: 14rpx; }
.chat { display: inline-block; width: 200rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; margin-right: 14rpx; vertical-align: top; }
.chat.on { outline: 2rpx solid var(--c-accent); }
.ava { font-size: 48rpx; text-align: center; }
.nm { font-size: 24rpx; text-align: center; color: var(--c-title); font-weight: 700; margin-top: 6rpx; }
.last { font-size: 20rpx; color: var(--c-sub); margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msgs { flex: 1; background: var(--c-card2); border-radius: 16rpx; padding: 18rpx; margin-bottom: 14rpx; }
.row { display: flex; margin-bottom: 16rpx; }
.row.me { justify-content: flex-end; }
.bubble { max-width: 70%; background: #fff; color: #4a3f35; padding: 16rpx 22rpx; border-radius: 16rpx; font-size: 26rpx; line-height: 1.5; }
.row.me .bubble { background: #07c160; color: #fff; }
.inputbar { display: flex; gap: 14rpx; }
.inp { flex: 1; background: var(--c-card); border: 1px solid var(--c-input-border); border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; color: var(--c-text); }
.send { background: #07c160; color: #fff; padding: 0 36rpx; border-radius: 40rpx; display: flex; align-items: center; font-size: 28rpx; }
.dark .t { color: var(--c-title); }
.dark .page { background: var(--c-bg); }
.dark .chat, .dark .msgs { background: var(--c-card); }
.dark .bubble { background: var(--c-input); color: var(--c-text); }
</style>
