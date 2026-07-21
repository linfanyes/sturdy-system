<template>
  <view class="page" :class="{ dark }">
    <view class="card">
      <view class="sec-title">🎯 AI 互动讲义</view>
      <view class="hint">
        输入知识点，AI 生成可直接用于课堂的互动素材：师生问答 + 讨论题 + 随堂小测（含答案）。
        作为实时互动直播（腾讯云 LCIC，按量收费）的免费替代方案。
      </view>
      <input v-model="form.title" class="ctrl" placeholder="知识点主题（必填），如：小数的加减法" />
      <input v-model="form.grade" class="ctrl" placeholder="年级，如：三年级" />
      <input v-model="form.subject" class="ctrl" placeholder="科目，如：数学" />
      <button class="gen" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '🤖 生成互动讲义' }}</button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">生成结果</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="saveNote">💾 存为笔记</button>
      <button class="copy" @click="copy">📋 复制</button>
      <button class="copy docx" @click="exportAsDocx">📄 导出 Word</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'
import { exportDocx } from '../../common/exporter'

const dark = computed(() => theme.mode === 'dark')

const form = ref({ title: '', grade: '', subject: '' })
const content = ref('')
const loading = ref(false)

async function gen() {
  if (loading.value) return
  if (!form.value.title.trim()) {
    return uni.showToast({ title: '请填写知识点主题', icon: 'none' })
  }
  const f = form.value
  const prompt =
    `请作为一名经验丰富的中小学教师，围绕「${f.title}」（年级：${f.grade || '未指定'}，` +
    `科目：${f.subject || '未指定'}）生成一份可直接用于课堂的互动讲义。要求包含三部分：\n` +
    `1) 互动问答：设计 4-5 组师生问答（Q 为学生可能的问题或教师提问，A 为答案），用于课堂即时互动；\n` +
    `2) 课堂讨论题：给出 2-3 个开放式讨论题，引导学生思考与小组交流；\n` +
    `3) 随堂小测：出 3-5 道选择题或填空题（含答案与简要解析），用于当堂检测。\n` +
    `使用中文，条理分明，标注清晰。`
  loading.value = true
  content.value = ''
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

async function saveNote() {
  if (!content.value) return
  try {
    await api.post('/notes', {
      title: form.value.title + '（互动讲义）',
      category: '学习资料',
      content: content.value,
    })
    uni.showToast({ title: '已存为笔记', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
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
  const title = form.value.title || '互动讲义'
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
</style>
