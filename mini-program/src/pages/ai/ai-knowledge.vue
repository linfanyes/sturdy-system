<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">📚 知识点生成</view>
        <view class="sub">根据教材章节生成知识点讲解</view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">输入内容</view>
      <view class="form-row">
        <view class="form-label">年级</view>
        <input v-model="form.grade" class="inp" placeholder="如：三年级" />
      </view>
      <view class="form-row">
        <view class="form-label">学科</view>
        <picker :range="subjects" @change="e => form.subject = subjects[e.detail.value]">
          <view class="picker-btn">{{ form.subject || '选择学科' }} ▾</view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-label">章节/主题</view>
        <input v-model="form.topic" class="inp" placeholder="如：分数的认识" />
      </view>
      <view class="form-row">
        <view class="form-label">要求</view>
        <textarea v-model="form.requirement" class="inp area" placeholder="可选：重点、难点、教学建议等" />
      </view>
      <button class="submit-btn" :disabled="loading" @click="generate">{{ loading ? '生成中…' : '生成知识点' }}</button>
    </view>

    <view class="card" v-if="loading">
      <view class="loading-box">
        <text class="loading-dot">●</text><text class="loading-dot">●</text><text class="loading-dot">●</text>
        <text class="loading-text">AI 正在生成知识点讲解…</text>
      </view>
    </view>

    <view class="card" v-if="result">
      <view class="card-title">📋 生成结果</view>
      <view class="result-box">
        <rich-text class="result-text" :nodes="formatMd(result)"></rich-text>
      </view>
      <view class="result-acts">
        <text class="act-btn" @click="copyResult">📋 复制</text>
        <text class="act-btn" @click="saveToNotes">📝 存笔记</text>
        <text class="act-btn primary" @click="reGenerate">🔄 重新生成</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import api from '../../common/request'
import { theme } from '../../common/store'

marked.setOptions({ gfm: true, breaks: true })

const subjects = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术']
const form = ref({ grade: '', subject: '', topic: '', requirement: '' })
const loading = ref(false)
const result = ref('')

function formatMd(md) {
  try { return marked.parse(md || '') } catch { return md || '' }
}

async function generate() {
  if (!form.value.topic.trim()) return uni.showToast({ title: '请输入章节/主题', icon: 'none' })
  loading.value = true
  result.value = ''
  try {
    const prompt = `请根据以下信息生成详细的知识点讲解：
年级：${form.value.grade || '未指定'}
学科：${form.value.subject || '未指定'}
章节/主题：${form.value.topic}
要求：${form.value.requirement || '包含知识点概述、重点难点、典型例题、教学建议'}

请用清晰的 Markdown 格式输出。`
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }]
    })
    result.value = res.content || '生成失败'
  } catch (e) {
    uni.showToast({ title: '生成失败：' + (e.message || ''), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function reGenerate() { generate() }

function copyResult() {
  if (!result.value) return
  uni.setClipboardData({
    data: result.value,
    success: () => uni.showToast({ title: '已复制', icon: 'none' })
  })
}

async function saveToNotes() {
  if (!result.value) return
  try {
    await api.post('/notes', {
      title: `知识点：${form.value.topic}`,
      content: result.value,
      category: 'AI 生成'
    })
    uni.showToast({ title: '已存到笔记', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

onMounted(() => {})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }

.card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }

.form-row { margin-bottom: 14rpx; }
.form-label { font-size: 24rpx; color: var(--c-sub); margin-bottom: 6rpx; }
.inp { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.area { height: 120rpx; }
.picker-btn { background: var(--c-card2); border-radius: 12rpx; padding: 18rpx; font-size: 28rpx; color: var(--c-text); }

.submit-btn { width: 100%; background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 30rpx; padding: 20rpx; margin-top: 10rpx; }
.submit-btn[disabled] { opacity: 0.5; }

.loading-box { display: flex; align-items: center; gap: 12rpx; padding: 30rpx; justify-content: center; flex-wrap: wrap; }
.loading-dot { font-size: 30rpx; color: var(--c-primary); animation: blink 1.2s infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
.loading-text { font-size: 26rpx; color: var(--c-sub); margin-left: 12rpx; }

.result-box { background: var(--c-card2); border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.result-text { font-size: 26rpx; color: var(--c-text); line-height: 1.7; }

.result-acts { display: flex; gap: 12rpx; flex-wrap: wrap; }
.act-btn { font-size: 24rpx; padding: 10rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-text); }
.act-btn.primary { background: var(--c-primary); color: #fff; }
</style>
