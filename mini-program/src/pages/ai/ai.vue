<template>
  <view class="page">
    <scroll-view class="box" scroll-y :scroll-into-view="scrollId">
      <view v-for="(m, i) in messages" :key="i" :id="'m' + i" :class="['msg', m.role]">
        <view class="bubble">{{ m.content || '…' }}</view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <input v-model="input" placeholder="问问 AI 助手…" @confirm="send" />
      <button class="send" @click="send">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth } from '../../common/store'

const messages = ref([])
const input = ref('')
const loading = ref(false)
const scrollId = ref('')

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1
  await nextTick()
  scrollId.value = 'm' + idx
  try {
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: text }],
    })
    messages.value[idx].content = res.content
  } catch (e) {
    messages.value[idx].content = '调用失败，请检查后端 AI 配置。'
  }
  loading.value = false
  await nextTick()
  scrollId.value = 'm' + messages.value.length
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 20rpx; box-sizing: border-box; }
.box { flex: 1; }
.msg { display: flex; margin-bottom: 20rpx; }
.msg.user { justify-content: flex-end; }
.bubble { max-width: 76%; padding: 20rpx 26rpx; border-radius: 20rpx; font-size: 30rpx; line-height: 1.5; white-space: pre-wrap; }
.msg.user .bubble { background: #e6a23c; color: #fff; }
.msg.assistant .bubble { background: #fff; color: #4a3f35; }
.input-bar { display: flex; gap: 16rpx; padding-top: 16rpx; }
.input-bar input { flex: 1; background: #fff; border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; }
.send { background: #07c160; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>
