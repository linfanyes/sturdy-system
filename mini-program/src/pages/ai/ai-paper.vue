<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">📝 优选试卷</view>
        <view class="sub">基于知识点智能组卷</view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">组卷参数</view>
      <view class="form-row">
        <view class="form-label">年级</view>
        <input v-model="form.grade" class="inp" placeholder="如：六年级" />
      </view>
      <view class="form-row">
        <view class="form-label">学科</view>
        <picker :range="subjects" @change="e => form.subject = subjects[e.detail.value]">
          <view class="picker-btn">{{ form.subject || '选择学科' }} ▾</view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-label">考试范围</view>
        <input v-model="form.scope" class="inp" placeholder="如：上册全册、第1-4单元" />
      </view>
      <view class="form-row inline">
        <view class="form-label">题量</view>
        <view class="count-ctrl">
          <text class="count-btn" @click="form.questionCount = Math.max(5, form.questionCount - 5)">−</text>
          <text class="count-num">{{ form.questionCount }}</text>
          <text class="count-btn" @click="form.questionCount = Math.min(100, form.questionCount + 5)">+</text>
        </view>
      </view>
      <view class="form-row inline">
        <view class="form-label">难度</view>
        <view class="difficulty-ctrl">
          <text v-for="d in difficulties" :key="d.v" class="diff-btn" :class="form.difficulty === d.v && 'on'" @click="form.difficulty = d.v">{{ d.label }}</text>
        </view>
      </view>
      <button class="submit-btn" :disabled="loading" @click="generate">{{ loading ? '组卷中…' : '智能组卷' }}</button>
    </view>

    <view class="card" v-if="loading">
      <view class="loading-box">
        <text class="loading-dot">●</text><text class="loading-dot">●</text><text class="loading-dot">●</text>
        <text class="loading-text">AI 正在根据知识点智能组卷…</text>
      </view>
    </view>

    <view class="card" v-if="result">
      <view class="card-title">📋 生成的试卷</view>
      <view class="result-box">
        <rich-text class="result-text" :nodes="formatMd(result)"></rich-text>
      </view>
      <view class="result-acts">
        <text class="act-btn" @click="copyResult">📋 复制</text>
        <text class="act-btn" @click="saveToNotes">📝 存笔记</text>
        <text class="act-btn primary" @click="reGenerate">🔄 重新组卷</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { marked } from 'marked'
import api from '../../common/request'
import { theme } from '../../common/store'

marked.setOptions({ gfm: true, breaks: true })

const subjects = ['语文', '数学', '英语', '科学']
const difficulties = [
  { v: 'easy', label: '基础' },
  { v: 'medium', label: '中等' },
  { v: 'hard', label: '较难' },
]
const form = ref({ grade: '', subject: '', scope: '', questionCount: 30, difficulty: 'medium' })
const loading = ref(false)
const result = ref('')

function formatMd(md) {
  try { return marked.parse(md || '') } catch { return md || '' }
}

async function generate() {
  if (!form.value.scope.trim()) return uni.showToast({ title: '请输入考试范围', icon: 'none' })
  loading.value = true
  result.value = ''
  try {
    const diffMap = { easy: '基础题为主（70%基础+20%中等+10%较难）', medium: '基础与中等并重（40%基础+40%中等+20%较难）', hard: '中等与较难并重（20%基础+40%中等+40%较难）' }
    const prompt = `请根据以下参数生成一份${form.value.subject || ''}试卷：
年级：${form.value.grade || '未指定'}
学科：${form.value.subject || '未指定'}
考试范围：${form.value.scope}
题量：约${form.value.questionCount}题
难度分布：${diffMap[form.value.difficulty]}

要求：
1. 试卷结构：填空、选择、判断、解答/应用题（根据学科调整）
2. 每题标注考察知识点
3. 附参考答案与评分标准
4. 排版清晰，方便打印

请用 Markdown 格式输出完整试卷内容。`
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
      title: `${form.value.subject || ''}试卷 - ${form.value.scope}`,
      content: result.value,
      category: 'AI 生成'
    })
    uni.showToast({ title: '已存到笔记', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }

.card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }

.form-row { margin-bottom: 14rpx; }
.form-row.inline { display: flex; align-items: center; gap: 12rpx; }
.form-label { font-size: 24rpx; color: var(--c-sub); margin-bottom: 6rpx; min-width: 100rpx; }
.inp { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.picker-btn { background: var(--c-card2); border-radius: 12rpx; padding: 18rpx; font-size: 28rpx; color: var(--c-text); }

.count-ctrl { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.count-btn { font-size: 36rpx; font-weight: 700; color: var(--c-primary); background: var(--c-card2); width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center; border-radius: 50%; }
.count-num { font-size: 32rpx; font-weight: 700; color: var(--c-title); min-width: 80rpx; text-align: center; }

.difficulty-ctrl { display: flex; gap: 12rpx; flex: 1; }
.diff-btn { flex: 1; text-align: center; padding: 14rpx; font-size: 26rpx; border-radius: 12rpx; background: var(--c-card2); color: var(--c-sub); }
.diff-btn.on { background: var(--c-primary); color: #fff; }

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
