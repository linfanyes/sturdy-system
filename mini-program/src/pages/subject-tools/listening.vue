<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🎧 英语听力</text></view>
    <view class="card">
      <view class="sec-title">英语听力材料生成</view>
      <input v-model="form.topic" class="ctrl" placeholder="主题（如：日常对话、校园生活）" />
      <button class="gen" :disabled="loading || !form.topic" @click="generate">{{ loading ? '生成中…' : '生成听力材料' }}</button>
      <view v-if="result" class="result-box"><rich-text :nodes="result"></rich-text></view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { chatSync } from '@/api/ai'
import { theme } from '../../common/store'
const form = ref({ topic: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请生成一段英语听力材料（适合小学生），主题：${form.value.topic}。包含：听力原文（5-8句）、3 道理解题（选择题）及答案。`
    const r = await chatSync({ messages: [{ role: 'user', content: prompt }] })
    result.value = (r.content || r.message || '生成失败').replace(/\n/g, '<br/>')
  } catch (e) { result.value = '生成失败：' + (e.message || '') }
  loading.value = false
}
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
</style>
