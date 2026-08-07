<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">📝 教育论文</text></view>
    <view class="card">
      <view class="sec-title">AI 论文助手</view>
      <input v-model="form.title" class="ctrl" placeholder="论文题目（必填）" />
      <input v-model="form.keywords" class="ctrl" placeholder="关键词（用逗号分隔，可选）" />
      <textarea v-model="form.outline" class="ctrl area" placeholder="论文大纲（可选，留空自动生成）" />
      <button class="gen" :disabled="loading || !form.title" @click="generate">{{ loading ? '生成中…' : '生成论文' }}</button>
      <view v-if="result" class="result-box">
        <rich-text :nodes="result"></rich-text>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { chatSync } from '@/api/ai'
import { theme } from '../../common/store'
const form = ref({ title: '', keywords: '', outline: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请以教育论文格式，撰写一篇题为《${form.value.title}》的论文。${form.value.keywords?`关键词：${form.value.keywords}。`:''}${form.value.outline?`参考大纲：${form.value.outline}`:'请自动生成完整大纲和内容。'}`
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
.area { min-height: 150rpx; }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; font-size: 26rpx; line-height: 1.8; color: var(--c-text); }
</style>
