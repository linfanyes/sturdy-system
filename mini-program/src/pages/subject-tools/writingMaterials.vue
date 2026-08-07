<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">✏️ 作文素材</text></view>
    <view class="card">
      <view class="sec-title">AI 作文素材生成</view>
      <input v-model="form.topic" class="ctrl" placeholder="作文主题（如：我的妈妈）" />
      <picker :range="gradeOpts" @change="form.grade = gradeOpts[$event.detail.value]">
        <view class="ctrl pick">年级：{{ form.grade || '选择年级' }}</view>
      </picker>
      <textarea v-model="form.requirements" class="ctrl area" placeholder="特殊要求（可选）" />
      <button class="gen" :disabled="loading || !form.topic" @click="generate">{{ loading ? '生成中…' : '生成素材' }}</button>
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
const gradeOpts = ['一年级','二年级','三年级','四年级','五年级','六年级']
const form = ref({ topic: '', grade: '', requirements: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请为${form.value.grade||'小学'}学生提供作文《${form.value.topic}》的写作素材（包括好词好句、开头结尾范例、结构提纲）。${form.value.requirements||''}`
    const r = await chatSync({ messages: [{ role: 'user', content: prompt }] })
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
.pick { color: var(--c-text); }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; font-size: 26rpx; line-height: 1.8; color: var(--c-text); }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
