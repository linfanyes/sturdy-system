<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">教育论文</view>
    <view class="panel">
      <view class="field">
        <text class="label">论文主题</text>
        <input v-model="form.topic" class="inp" placeholder="如：小学语文阅读教学策略" />
      </view>
      <view class="field">
        <text class="label">学科</text>
        <picker :range="subjects" :value="subjectIdx" @change="onSubjectChange">
          <view class="picker">{{ form.subject || '请选择学科' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">字数要求</text>
        <input v-model="form.wordCount" class="inp" placeholder="如：2000字" />
      </view>
      <view class="field">
        <text class="label">具体要求</text>
        <textarea v-model="form.requirement" class="inp area" placeholder="如：结合新课标，包含理论分析与教学案例" />
      </view>
      <button class="btn send" :disabled="generating" @click="generate">
        {{ generating ? '生成中…' : 'AI 生成论文' }}
      </button>
    </view>

    <view v-if="result" class="result">
      <view class="res-top">
        <text class="res-title">生成结果</text>
        <text class="act" @click="copyResult">复制</text>
      </view>
      <view class="res-content">{{ result }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../../common/request'
import { theme } from '../../common/store'

const subjects = ['语文', '数学', '英语', '科学', '道德与法治', '其他']
const subjectIdx = ref(0)
const form = ref({ topic: '', subject: '语文', wordCount: '', requirement: '' })
const generating = ref(false)
const result = ref('')

function onSubjectChange(e) { subjectIdx.value = e.detail.value; form.value.subject = subjects[e.detail.value] }

async function generate() {
  if (!form.value.topic.trim()) return uni.showToast({ title: '请填写论文主题', icon: 'none' })
  generating.value = true
  result.value = ''
  try {
    const prompt = `请撰写一篇教育论文。主题：${form.value.topic}；学科：${form.value.subject}；字数：${form.value.wordCount || '不限'}；要求：${form.value.requirement || '无'}。论文需包含：摘要、关键词、引言、正文、结论、参考文献。`
    const res = await api.post('/ai/generate', { prompt, type: 'paper' })
    result.value = typeof res === 'string' ? res : (res?.result || res?.content || '生成失败')
  } catch (e) { uni.showToast({ title: '生成失败', icon: 'none' }) }
  finally { generating.value = false }
}

function copyResult() {
  uni.setClipboardData({ data: result.value, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.panel { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.area { height: 150rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.btn { border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.send { background: var(--c-primary); color: #fff; margin-top: 10rpx; }
.btn.send[disabled] { opacity: 0.6; }
.result { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-top: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.res-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.res-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.act { font-size: 24rpx; color: #409eff; }
.res-content { font-size: 28rpx; line-height: 1.8; color: var(--c-title); white-space: pre-wrap; }
</style>