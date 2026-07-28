<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🎤 演讲稿生成</text></view>
    <view class="card">
      <view class="sec-title">场景演讲稿</view>
      <input v-model="form.scene" class="ctrl" placeholder="场景（如：国旗下讲话、家长会）" />
      <input v-model="form.topic" class="ctrl" placeholder="演讲主题（如：节约粮食，从我做起）" />
      <input v-model="form.duration" class="ctrl" placeholder="时长（约3分钟/约5分钟/约10分钟，默认约5分钟）" />
      <button class="gen" :disabled="loading || !form.topic" @click="generate">{{ loading ? '生成中…' : '生成演讲稿' }}</button>
      <view v-if="result" class="result-box">
        <text class="result-text">{{ result }}</text>
        <button class="copy" @click="copy">📋 复制</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'
import api from '../../common/request'
const form = ref({ scene: '', topic: '', duration: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请写一篇${form.value.scene || '班会'}演讲稿，主题「${form.value.topic}」，篇幅${form.value.duration || '约5分钟'}。\n要求：开头亲切有感染力，主体分 2-3 个论点，结尾升华号召；口语化、适合朗读。`
    const r = await api.post('/ai/chat-sync', { messages: [{ role: 'user', content: prompt }] })
    result.value = r.content || r.message || '生成失败'
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
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; }
.result-text { font-size: 28rpx; color: var(--c-text); line-height: 1.6; white-space: pre-wrap; }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
