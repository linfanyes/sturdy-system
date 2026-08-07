<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🎨 黑板报生成</text></view>
    <view class="card">
      <view class="sec-title">按主题生成黑板报方案</view>
      <input v-model="form.theme" class="ctrl" placeholder="主题（如：网络安全教育、学雷锋）" />
      <input v-model="form.grade" class="ctrl" placeholder="年级（小学/初中/高中/通用，默认通用）" />
      <input v-model="form.style" class="ctrl" placeholder="风格（如：安全教育、学习园地）" />
      <button class="gen" :disabled="loading || !form.theme" @click="generate">{{ loading ? '生成中…' : '生成方案' }}</button>
      <view v-if="result" class="result-box">
        <text class="result-text">{{ result }}</text>
        <button class="copy" @click="copy">📋 复制</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { chatSync } from '@/api/ai'
import { theme } from '../../common/store'
const form = ref({ theme: '', grade: '', style: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请生成 3 套黑板报设计方案，主题「${form.value.theme}」，适用${form.value.grade || '通用'}，风格偏向${form.value.style || '学习园地'}。\n每套包含：① 版面布局（分块说明）② 大标题与栏目小标题 ③ 各板块文字内容（可直接抄写）④ 插图 / 花边建议。`
    const r = await chatSync({ messages: [{ role: 'user', content: prompt }] })
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
