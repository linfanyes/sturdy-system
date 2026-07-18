<template>
  <view class="page">
    <scroll-view class="box" scroll-y :scroll-into-view="scrollId">
      <view v-for="(m, i) in messages" :key="i" :id="'m' + i" :class="['msg', m.role]">
        <view class="bubble">{{ m.content || '…' }}</view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <button class="img-btn" @click="chooseImage">{{ imageData ? '换图' : '图片' }}</button>
      <input v-model="input" placeholder="问问 AI 助手…（带图自动用多模态模型）" @confirm="send" />
      <button class="send" @click="send">发送</button>
    </view>
    <view v-if="imageData" class="img-preview">
      <image :src="imageData" class="thumb" mode="aspectFill" />
      <text class="clear" @click="imageData = ''">×</text>
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
const imageData = ref('') // 选中的图片（base64 data url）

/** 选图：压缩后读为 base64，随消息以 OpenAI 视觉格式上传 */
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      const path = res.tempFilePaths[0]
      uni.getFileSystemManager().readFile({
        filePath: path,
        encoding: 'base64',
        success: (r) => {
          imageData.value = 'data:image/jpeg;base64,' + r.data
        },
        fail: () => uni.showToast({ title: '图片读取失败', icon: 'none' }),
      })
    },
  })
}

async function send() {
  const text = input.value.trim()
  if ((!text && !imageData.value) || loading.value) return
  // 展示用消息
  messages.value.push({ role: 'user', content: text || '[图片]' })
  // 实际发送给后端的消息（OpenAI 视觉格式）
  const content = []
  if (text) content.push({ type: 'text', text })
  if (imageData.value)
    content.push({ type: 'image_url', image_url: { url: imageData.value } })
  const userMsg = {
    role: 'user',
    content:
      content.length === 1 && content[0].type === 'text'
        ? text
        : content,
  }
  input.value = ''
  imageData.value = ''
  loading.value = true
  messages.value.push({ role: 'assistant', content: '' })
  const idx = messages.value.length - 1
  await nextTick()
  scrollId.value = 'm' + idx
  try {
    const res = await api.post('/ai/chat-sync', { messages: [userMsg] })
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
.img-btn { background: #fff; color: #4a3f35; border: 1px solid #eee; border-radius: 40rpx; font-size: 26rpx; padding: 0 24rpx; }
.input-bar input { flex: 1; background: #fff; border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; }
.send { background: #07c160; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.img-preview { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 12rpx; }
.clear { color: #f56c6c; font-size: 40rpx; padding: 0 10rpx; }
</style>
