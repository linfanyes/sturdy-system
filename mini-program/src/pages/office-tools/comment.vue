<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">💬 评语生成</text></view>
    <view class="card">
      <view class="sec-title">学生评语</view>
      <input v-model="form.name" class="ctrl" placeholder="学生姓名" />
      <picker :range="subjectOpts" @change="form.subject = subjectOpts[$event.detail.value]">
        <view class="ctrl pick">学科：{{ form.subject || '选择学科' }}</view>
      </picker>
      <textarea v-model="form.traits" class="ctrl area" placeholder="学生特点（如：上课积极、字迹工整、需要加强计算）" />
      <button class="gen" :disabled="loading || !form.name" @click="generate">{{ loading ? '生成中…' : '生成评语' }}</button>
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
const subjectOpts = ['语文','数学','英语','科学','道德与法治','音乐','美术','体育']
const form = ref({ name: '', subject: '', traits: '' })
const result = ref('')
const loading = ref(false)
async function generate() {
  loading.value = true
  try {
    const prompt = `请为${form.value.name}同学写一段${form.value.subject||''}课程的期末评语（100字左右），特点：${form.value.traits||'表现良好'}。语气温暖、鼓励为主。`
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
.area { min-height: 120rpx; }
.pick { color: var(--c-text); }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; }
.result-text { font-size: 26rpx; color: var(--c-text); line-height: 1.6; }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
