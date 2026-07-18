<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="sec-title">考试一键分析</view>
      <picker :range="examNames" @change="onPick">
        <view class="ctrl picker">{{ selExam ? selExam.name + '（' + selExam.date + '）' : '选择考试' }}</view>
      </picker>

      <view v-if="selExam" class="stats">
        <view v-for="s in stats" :key="s.subject" class="stat">
          <view class="st-sub">{{ s.subject }}</view>
          <view class="st-line">人数 {{ s.n }} · 均分 {{ s.avg }} · 最高 {{ s.max }} · 最低 {{ s.min }}</view>
          <view class="st-line">优秀率 {{ s.excellent }}% · 及格率 {{ s.pass }}%</view>
          <view class="st-line">分数段：<text v-for="seg in s.segs" :key="seg.k" class="seg">{{ seg.k }}:{{ seg.v }} </text></view>
        </view>
        <view v-if="!stats.length" class="empty">该考试暂无成绩数据</view>
      </view>

      <button class="gen" :disabled="!selExam || loading || !stats.length" @click="gen">
        {{ loading ? '分析中…' : '🤖 一键生成分析' }}
      </button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">分析情况描述</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="save">💾 保存到考试记录</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'

const exams = ref([])
const grades = ref([])
const selExam = ref(null)
const content = ref('')
const loading = ref(false)

const examNames = computed(() => exams.value.map((e) => `${e.name}（${e.date}）`))

function onPick(e) {
  const i = e.detail.value
  selExam.value = exams.value[i] || null
  content.value = ''
}

const stats = computed(() => {
  if (!selExam.value) return []
  const exam = selExam.value
  const related = grades.value.filter(
    (g) => g.examId === exam.id || g.examName === exam.name,
  )
  return related.map((g) => {
    const arr = (g.scores || []).filter((x) => x.score != null).map((x) => x.score)
    const n = arr.length
    if (!n) {
      return { subject: g.subject, n: 0, avg: '-', max: '-', min: '-', excellent: 0, pass: 0, segs: [] }
    }
    const sum = arr.reduce((a, b) => a + b, 0)
    const avg = (sum / n).toFixed(1)
    const max = Math.max(...arr)
    const min = Math.min(...arr)
    const excellent = arr.filter((x) => x >= 90).length
    const pass = arr.filter((x) => x >= 60).length
    const segs = [
      { k: '<60', v: arr.filter((x) => x < 60).length },
      { k: '60-69', v: arr.filter((x) => x >= 60 && x < 70).length },
      { k: '70-79', v: arr.filter((x) => x >= 70 && x < 80).length },
      { k: '80-89', v: arr.filter((x) => x >= 80 && x < 90).length },
      { k: '90+', v: arr.filter((x) => x >= 90).length },
    ]
    return {
      subject: g.subject,
      n,
      avg,
      max,
      min,
      excellent: ((excellent / n) * 100).toFixed(0),
      pass: ((pass / n) * 100).toFixed(0),
      segs,
    }
  })
})

async function gen() {
  if (loading.value || !selExam.value || !stats.value.length) return
  const exam = selExam.value
  const statText = stats.value
    .map((s) => {
      const seg = s.segs.map((x) => `${x.k}:${x.v}`).join('、')
      return `科目 ${s.subject}：人数 ${s.n}，均分 ${s.avg}，最高 ${s.max}，最低 ${s.min}，优秀率 ${s.excellent}%，及格率 ${s.pass}%；分数段(<60/60-69/70-79/80-89/90+)：${seg}`
    })
    .join('\n')
  const prompt =
    `以下是「${exam.name}」（日期：${exam.date}）的成绩统计，请据此撰写一份面向班主任的「本次考试分析情况描述」。` +
    `要求：1) 总体表现概述；2) 各科亮点与不足；3) 需重点关注的学生方向；4) 后续教学改进建议。` +
    `语言专业、简洁、可直接用于教务汇报。\n\n统计如下：\n${statText}`
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

async function save() {
  if (!content.value || !selExam.value) return
  try {
    await api.patch('/exams/' + selExam.value.id, { analysisNote: content.value })
    uni.showToast({ title: '已保存到考试记录', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function load() {
  try {
    exams.value = await api.get('/exams')
    grades.value = await api.get('/grades')
  } catch (e) {
    exams.value = []
    grades.value = []
  }
}

onShow(() => {
  if (!auth.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  load()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.ctrl { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.picker { color: var(--c-title); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.stats { margin: 10rpx 0 20rpx; }
.stat { background: var(--c-card2); border-radius: 14rpx; padding: 20rpx; margin-bottom: 14rpx; }
.st-sub { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 8rpx; }
.st-line { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; }
.seg { margin-right: 10rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 26rpx; }
.gen { background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 4rpx; height: 84rpx; line-height: 84rpx; }
.gen[disabled] { opacity: 0.6; }
.result-text { font-size: 28rpx; line-height: 1.7; color: var(--c-title); white-space: pre-wrap; margin-bottom: 20rpx; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; }
</style>
