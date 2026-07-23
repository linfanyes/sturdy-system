<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">🎯 互动答疑</view>
        <view class="sub">学生提问，AI 辅助回答</view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">学生问题</view>
      <view class="form-row">
        <view class="form-label">年级</view>
        <input v-model="form.grade" class="inp" placeholder="如：五年级" />
      </view>
      <view class="form-row">
        <view class="form-label">学科</view>
        <picker :range="subjects" @change="e => form.subject = subjects[e.detail.value]">
          <view class="picker-btn">{{ form.subject || '选择学科' }} ▾</view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-label">学生问题</view>
        <textarea v-model="form.question" class="inp area" placeholder="输入学生提出的问题…" />
      </view>
      <button class="submit-btn" :disabled="loading" @click="ask">{{ loading ? '回答中…' : '获取回答' }}</button>
    </view>

    <view class="card" v-if="loading">
      <view class="loading-box">
        <text class="loading-dot">●</text><text class="loading-dot">●</text><text class="loading-dot">●</text>
        <text class="loading-text">AI 正在思考…</text>
      </view>
    </view>

    <view class="card" v-if="result">
      <view class="card-title">💡 AI 回答</view>
      <view class="result-box">
        <rich-text class="result-text" :nodes="formatMd(result)"></rich-text>
      </view>
      <view class="result-acts">
        <text class="act-btn" @click="copyResult">📋 复制</text>
        <text class="act-btn primary" @click="reAsk">🔄 换个问法</text>
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

const subjects = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术']
const form = ref({ grade: '', subject: '', question: '' })
const loading = ref(false)
const result = ref('')

function formatMd(md) {
  try { return marked.parse(md || '') } catch { return md || '' }
}

async function ask() {
  if (!form.value.question.trim()) return uni.showToast({ title: '请输入问题', icon: 'none' })
  loading.value = true
  result.value = ''
  try {
    const prompt = `你是一位耐心、专业的${form.value.subject || '各学科'}老师，面向${form.value.grade || '小学'}学生答疑。
请用通俗易懂、生动有趣的语言回答以下学生问题，必要时举例说明。

学生问题：${form.value.question}

要求：
1. 回答要符合学生的认知水平
2. 多用生活中的例子帮助理解
3. 语气亲切、鼓励思考
4. 如果问题较复杂，分步骤解答`
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }]
    })
    result.value = res.content || '回答失败'
  } catch (e) {
    uni.showToast({ title: '回答失败：' + (e.message || ''), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function reAsk() { ask() }

function copyResult() {
  if (!result.value) return
  uni.setClipboardData({
    data: result.value,
    success: () => uni.showToast({ title: '已复制', icon: 'none' })
  })
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
.form-label { font-size: 24rpx; color: var(--c-sub); margin-bottom: 6rpx; }
.inp { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.area { height: 150rpx; }
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
