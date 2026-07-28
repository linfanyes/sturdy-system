<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">📋 期末总结</text></view>
    <view class="card">
      <view class="sec-title">班级期末总结</view>
      <input v-model="form.className" class="ctrl" placeholder="班级名称（如：三年级二班）" />
      <input v-model="form.term" class="ctrl" placeholder="学期（如：2025-2026学年第一学期）" />
      <textarea v-model="form.highlights" class="ctrl area" placeholder="本学期亮点/成果（可选）" />
      <button class="gen" :disabled="loading || !form.className" @click="generate">{{ loading ? '生成中…' : '生成总结' }}</button>
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
const form = ref({ className: '', term: '', highlights: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请以班主任口吻，撰写${form.value.className||'本班'}的期末工作总结（300字左右）。${form.value.term?`学期：${form.value.term}。`:''}${form.value.highlights?`本学期亮点：${form.value.highlights}。`:''}`
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
.area { min-height: 120rpx; }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; font-size: 26rpx; line-height: 1.8; color: var(--c-text); }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
