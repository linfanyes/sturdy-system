<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { studyBuddy } from '../../api/insight'

const studentName = ref('')
const messages = ref([
  { role: 'assistant', content: '你好呀～我是你的 AI 学习伙伴，课业难题、学习方法、心情小事都可以问我 📚' },
])
const input = ref('')
const sending = ref(false)
const crisisTip = ref(false)

onLoad((q) => {
  if (q && q.name) studentName.value = q.name
})

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  crisisTip.value = false
  sending.value = true
  messages.value.push({ role: 'assistant', content: '正在思考…' })
  try {
    const res = await studyBuddy(
      messages.value.filter((m) => m.content !== '正在思考…').map((m) => ({ role: m.role, content: m.content })),
      studentName.value || undefined,
    )
    messages.value.pop()
    if (res && res.crisis) crisisTip.value = true
    messages.value.push({ role: 'assistant', content: (res && res.reply) || '我好像没连上，稍后再来问我吧～' })
  } catch (e) {
    messages.value.pop()
    messages.value.push({ role: 'assistant', content: '出错了，稍后再试～' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">🤖 孩子专属 AI 学习伙伴</text>
      <text class="sub">解答课业 · 陪伴学习 · 适龄安全</text>
    </view>

    <view v-if="crisisTip" class="crisis">
      如果你或孩子正经历很难过的时刻，请一定告诉信任的大人或老师，也可以拨打心理援助热线 400-161-9995。你很重要。
    </view>

    <scroll-view class="chat" scroll-y :scroll-into-view="'m' + messages.length">
      <view v-for="(m, i) in messages" :key="i" :id="'m' + (i + 1)" class="row" :class="m.role">
        <view class="bubble">{{ m.content }}</view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <input v-model="input" class="ipt" placeholder="问问学习伙伴…" confirm-type="send" @confirm="send" />
      <button class="send" :disabled="sending" @click="send">发送</button>
    </view>
  </view>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #f6f7fb; }
.head { padding: 24rpx 32rpx 16rpx; background: #fff; }
.title { font-size: 34rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #9ca3af; }
.crisis { margin: 16rpx 24rpx; padding: 20rpx; background: #fef2f2; border: 1rpx solid #fecaca; border-radius: 16rpx; color: #b91c1c; font-size: 24rpx; line-height: 1.6; }
.chat { flex: 1; padding: 24rpx; }
.row { display: flex; margin-bottom: 20rpx; }
.row.user { justify-content: flex-end; }
.bubble { max-width: 78%; padding: 18rpx 24rpx; border-radius: 20rpx; font-size: 28rpx; line-height: 1.6; background: #fff; color: #374151; }
.row.user .bubble { background: #4f7cff; color: #fff; }
.input-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.ipt { flex: 1; height: 72rpx; padding: 0 24rpx; background: #f3f4f6; border-radius: 36rpx; font-size: 28rpx; }
.send { height: 72rpx; line-height: 72rpx; padding: 0 32rpx; background: #4f7cff; color: #fff; border-radius: 36rpx; font-size: 28rpx; }
.send[disabled] { opacity: 0.5; }
</style>
