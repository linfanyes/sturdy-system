<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="sec-title">知识点生成</view>
      <view class="hint">填写信息，AI 生成结构化的知识点讲解，可一键存入知识库。</view>
      <input v-model="form.title" class="ctrl" placeholder="知识点主题（必填），如：小数的加减法" />
      <input v-model="form.grade" class="ctrl" placeholder="年级，如：三年级" />
      <input v-model="form.subject" class="ctrl" placeholder="科目，如：数学" />
      <input v-model="form.textbook" class="ctrl" placeholder="教材，如：人教版" />
      <input v-model="form.term" class="ctrl" placeholder="学期，如：上学期" />
      <button class="gen" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '🤖 生成知识点' }}</button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">生成结果</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="save">💾 存入知识库</button>
      <button class="copy" @click="copy">📋 复制结果</button>
      <button class="copy docx" @click="exportAsDocx">📄 导出 Word</button>
      <button v-if="saved" class="link" @click="goLib">查看知识库 →</button>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'
import { exportDocx } from '../../common/exporter'

const form = ref({ title: '', grade: '', subject: '', textbook: '', term: '' })
const content = ref('')
const lastPrompt = ref('')
const loading = ref(false)
const saved = ref(false)

async function gen() {
  if (loading.value) return
  if (!form.value.title.trim()) {
    return uni.showToast({ title: '请填写知识点主题', icon: 'none' })
  }
  const f = form.value
  const prompt =
    `请作为一名经验丰富的中小学教师，围绕「${f.title}」（年级：${f.grade || '未指定'}，` +
    `科目：${f.subject || '未指定'}，教材：${f.textbook || '通用'}，学期：${f.term || '未指定'}）` +
    `生成一份结构清晰的知识点讲解。要求包含：1) 核心定义；2) 重点与难点；3) 常见易错点；` +
    `4) 典型例题（含解析）；5) 记忆与复习建议。使用中文，条理分明，可直接用于备课。`
  loading.value = true
  content.value = ''
  lastPrompt.value = prompt
  saved.value = false
  try {
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }],
    })
    content.value = res.content || ''
    if (!content.value) uni.showToast({ title: '生成内容为空', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败，请检查后端 AI 配置', icon: 'none' })
  }
  loading.value = false
  await nextTick()
}

async function save() {
  if (!content.value) return
  const f = form.value
  try {
    await api.post('/generated/knowledges', {
      title: f.title,
      grade: f.grade,
      subject: f.subject,
      textbook: f.textbook,
      term: f.term,
      prompt: lastPrompt.value,
      content: content.value,
    })
    saved.value = true
    uni.showToast({ title: '已存入知识库', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function goLib() {
  uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent('generated/knowledges') })
}

function copy() {
  if (!content.value) return
  uni.setClipboardData({
    data: content.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}
async function exportAsDocx() {
  if (!content.value) return
  const title = form.value.title || '知识点'
  await exportDocx(title, content.value, title)
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.hint { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; line-height: 1.5; }
.ctrl { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.gen { background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; }
.gen[disabled] { opacity: 0.6; }
.result-text { font-size: 28rpx; line-height: 1.7; color: var(--c-title); white-space: pre-wrap; margin-bottom: 20rpx; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; }
.copy { background: var(--c-card2); color: var(--c-title); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; }
.copy.docx { background: #409eff; color: #fff; border-color: #409eff; }
.link { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; font-size: 26rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; }
</style>
