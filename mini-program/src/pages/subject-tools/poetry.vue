<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">📜 古诗词助手</text></view>
    <view class="card">
      <view class="sec-title">古诗词查询与赏析</view>
      <input v-model="form.query" class="ctrl" placeholder="输入诗名、作者或诗句（如：静夜思、李白）" />
      <button class="gen" :disabled="loading || !form.query" @click="generate">{{ loading ? '查询中…' : '查询赏析' }}</button>
      <view v-if="result" class="result-box">
        <rich-text :nodes="result"></rich-text>
        <button class="copy" @click="copy">📋 复制</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { chatSync } from '@/api/ai'
import { theme } from '../../common/store'
const form = ref({ query: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请详细介绍古诗词「${form.query.value}」的原文、作者、创作背景、诗句赏析、艺术特色，适合小学教师备课使用。`
    const r = await chatSync({ messages: [{ role: 'user', content: prompt }] })
    result.value = (r.content || r.message || '查询失败').replace(/\n/g, '<br/>')
  } catch (e) { result.value = '查询失败：' + (e.message || '') }
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
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
