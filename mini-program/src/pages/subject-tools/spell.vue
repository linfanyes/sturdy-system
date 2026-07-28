<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🔤 单词拼写</text></view>
    <view class="card">
      <view class="sec-title">英语单词拼写练习</view>
      <input v-model="form.topic" class="ctrl" placeholder="主题（如：动物、水果、颜色）" />
      <input v-model="form.count" class="ctrl" type="number" placeholder="单词数量（默认 10 个）" />
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
const form = ref({ topic: '', count: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请生成${form.value.count || 10}个关于「${form.value.topic}」的英语单词拼写练习（给出中文，填写英文），附答案。`
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
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; font-size: 26rpx; line-height: 1.8; color: var(--c-text); }
.copy { margin-top: 12rpx; background: var(--c-border); color: var(--c-text); border-radius: 50rpx; font-size: 26rpx; height: 64rpx; line-height: 64rpx; }
</style>
