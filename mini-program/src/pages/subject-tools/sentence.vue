<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">💬 句型练习</text></view>
    <view class="card">
      <view class="sec-title">英语句型练习生成</view>
      <input v-model="form.topic" class="ctrl" placeholder="主题（如：购物、问路、自我介绍）" />
      <picker :range="levelOpts" @change="form.level = levelOpts[$event.detail.value]">
        <view class="ctrl pick">难度：{{ form.level || '选择难度' }}</view>
      </picker>
      <button class="gen" :disabled="loading || !form.topic" @click="generate">{{ loading ? '生成中…' : '生成练习' }}</button>
      <view v-if="result" class="result-box">
        <rich-text :nodes="result"></rich-text>
        <button class="copy" @click="copy">📋 复制</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'
import api from '../../common/request'
const levelOpts = ['初级','中级','高级']
const form = ref({ topic: '', level: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请生成关于「${form.value.topic}」的英语句型练习（${form.value.level||'初级'}难度），包含 5 个核心句型、中文释义、例句，以及 3 道填空练习题。`
    const r = await api.post('/ai/chat-sync', { messages: [{ role: 'user', content: prompt }] })
    result.value = (r.content || r.message || '生成失败').replace(/\n/g, '<br/>')
  } catch (e) { result.value = '生成失败：' + (e.message || '') }
  loading.value = false
}
function copy() { uni.setClipboardData({ data: result.value }) }
</script>
<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.topbar { margin-bottom: 20rpx; }
.mtitle { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.ctrl { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); margin-bottom: 12rpx; }
.pick { color: var(--c-text); }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; font-size: 26rpx; line-height: 1.8; color: var(--c-text); }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
