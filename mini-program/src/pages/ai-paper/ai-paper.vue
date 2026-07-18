<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="sec-title">优选试卷生成</view>
      <view class="hint">AI 整理贴近真实考纲的优选试卷，含题目、答案与解析，可一键存入试卷库。</view>
      <input v-model="form.grade" class="ctrl" placeholder="年级，如：九年级" />
      <input v-model="form.subject" class="ctrl" placeholder="科目，如：物理" />
      <input v-model="form.year" class="ctrl" placeholder="参考年份，如：2024（可选）" />
      <input v-model="form.keyword" class="ctrl" placeholder="主题/范围（必填），如：力学综合" />
      <input v-model="form.title" class="ctrl" placeholder="试卷标题（可选，留空自动生成）" />
      <button class="gen" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '🤖 生成优选试卷' }}</button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">生成结果</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="save">💾 存入试卷库</button>
      <button v-if="saved" class="link" @click="goLib">查看试卷库 →</button>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'

const form = ref({ grade: '', subject: '', year: '', keyword: '', title: '' })
const content = ref('')
const lastPrompt = ref('')
const loading = ref(false)
const saved = ref(false)

async function gen() {
  if (loading.value) return
  if (!form.value.keyword.trim()) {
    return uni.showToast({ title: '请填写主题/范围', icon: 'none' })
  }
  const f = form.value
  const prompt =
    `请为「${f.grade || '中学'}${f.subject || '学科'}」整理一套优选试卷（主题/范围：${f.keyword}，` +
    `参考年份：${f.year || '近三年'}）。要求：1) 题型与真实考纲一致，不虚构不存在的题型；` +
    `2) 题目尽量贴近真实考点与常见考法；3) 每题给出答案与简要解析；` +
    `4) 若某些题目无法确认为真实原题，请明确标注「（模拟）」并说明依据；` +
    `5) 在开头说明试卷来源与适用说明。请使用中文输出，便于直接打印使用。`
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
  const title = f.title.trim() || `${f.grade || ''}${f.subject || ''}优选试卷(${f.keyword})`
  try {
    await api.post('/generated/papers', {
      title,
      grade: f.grade,
      subject: f.subject,
      prompt: lastPrompt.value,
      content: content.value,
    })
    saved.value = true
    uni.showToast({ title: '已存入试卷库', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function goLib() {
  uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent('generated/papers') })
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
.link { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; font-size: 26rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; }
</style>
