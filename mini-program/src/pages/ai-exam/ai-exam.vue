<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="sec-title">考试一键分析</view>
      <view class="mode-toggle">
        <text class="mt" :class="!compareMode && 'on'" @click="compareMode = false; selExam = exams[0] || null">单次分析</text>
        <text class="mt" :class="compareMode && 'on'" @click="compareMode = true">多考试对比</text>
      </view>

      <!-- 单次模式 -->
      <picker v-if="!compareMode" :range="examNames" @change="onPick">
        <view class="ctrl picker">{{ selExam ? selExam.name + '（' + selExam.date + '）' : '选择考试' }}</view>
      </picker>

      <!-- 对比模式 -->
      <view v-if="compareMode" class="cmp-list">
        <view v-for="e in exams" :key="e.id" class="cmp-chk" @click="toggleCmp(e.id)">
          <text class="cc-dot" :class="cmpIds.includes(e.id) && 'on'"></text>
          <text class="cc-label">{{ e.name }}（{{ e.date || e.term }}）</text>
        </view>
        <text class="cmp-hint">已选 {{ cmpIds.length }} / 3 个考试</text>
      </view>

      <view v-if="selExam" class="stats">
        <view v-for="s in stats" :key="s.subject" class="stat">
          <view class="st-sub">{{ s.subject }}</view>
          <view class="st-line">人数 {{ s.n }} · 均分 {{ s.avg }} · 最高 {{ s.max }} · 最低 {{ s.min }}</view>
          <view class="st-line">优秀率 {{ s.excellent }}% · 及格率 {{ s.pass }}%</view>
          <view class="st-line">分数段：<text v-for="seg in s.segs" :key="seg.k" class="seg">{{ seg.k }}:{{ seg.v }} </text></view>
        </view>
        <view v-if="!stats.length && !compareMode" class="empty">该考试暂无成绩数据</view>
      </view>

      <!-- 多考试对比图表 -->
      <view v-if="compareMode && cmpChart && cmpChart.categories.length > 1" class="cmp-chart-wrap">
        <view class="cmt">📊 各次考试均分对比</view>
        <canvas type="2d" canvas-id="cmpBarCanvas" id="cmpBarCanvas" class="chart-canvas"></canvas>
      </view>

      <button class="gen" :disabled="(!selExam && !compareMode) || loading || (!stats.length && !compareMode)" @click="gen">
        {{ loading ? '分析中…' : '🤖 一键生成分析' }}
      </button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">分析情况描述</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="save">💾 保存到考试记录</button>
      <button class="copy" @click="copyText(content)">📋 复制分析文案</button>
      <button class="copy docx" @click="exportAsDocx">📄 导出 Word</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { copyText } from '../../common/print'
import { exportDocx } from '../../common/exporter'
import { auth, theme } from '../../common/store'
import uCharts from '@qiun/ucharts'

const exams = ref([])
const grades = ref([])
const selExam = ref(null)
const content = ref('')
const loading = ref(false)
const pendingExamId = ref('')
const compareMode = ref(false)
const cmpIds = ref([])
const cmpChart = ref(null)
let cmpChartInstance = null

const examNames = computed(() => exams.value.map((e) => `${e.name}（${e.date}）`))

function onPick(e) {
  const i = e.detail.value
  selExam.value = exams.value[i] || null
  content.value = ''
}

// 多考试对比
function toggleCmp(id) {
  const idx = cmpIds.value.indexOf(id)
  if (idx >= 0) { cmpIds.value.splice(idx, 1) }
  else if (cmpIds.value.length < 3) { cmpIds.value.push(id) }
  else { uni.showToast({ title: '最多选3个考试', icon: 'none' }) }
  updateCmpChart()
}

async function updateCmpChart() {
  if (cmpIds.value.length < 2) { cmpChart.value = null; return }
  const cats = [], data = []
  for (const id of cmpIds.value) {
    const exam = exams.value.find(e => e.id === id)
    if (!exam) continue
    cats.push((exam.name || '').slice(0, 6))
    const related = grades.value.filter(g => g.examId === id || g.examName === exam.name)
    const allScores = []
    related.forEach(g => (g.scores || []).forEach(s => { if (s.score != null) allScores.push(+s.score) }))
    data.push(allScores.length ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0)
  }
  cmpChart.value = { categories: cats, data }
  if (cats.length > 1) nextTick(() => drawCmpChart(cats, data))
}

function drawCmpChart(categories, data) {
  const query = uni.createSelectorQuery()
  query.select('#cmpBarCanvas').fields({ node: true, size: true }).exec(res => {
    if (!res || !res[0] || !res[0].node) return
    const canvas = res[0].node
    const ctx = canvas.getContext('2d')
    const dpr = uni.getSystemInfoSync().pixelRatio
    canvas.width = res[0].width * dpr
    canvas.height = res[0].height * dpr
    ctx.scale(dpr, dpr)
    if (cmpChartInstance) {
      cmpChartInstance.updateData({ categories, series: [{ name: '均分', data, index: 0 }] })
    } else {
      cmpChartInstance = new uCharts({
        type: 'column', context: ctx, width: res[0].width, height: res[0].height,
        categories, series: [{ name: '均分', data, index: 0 }],
        yAxis: { disabled: false }, xAxis: { disableGrid: true, fontSize: 11 },
        extra: { column: { type: 'group', width: 30 } }, colors: ['#409eff'],
      })
    }
  })
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
  if (loading.value) return

  if (compareMode.value) {
    if (cmpIds.value.length < 2) return uni.showToast({ title: '请至少选2个考试', icon: 'none' })
    return genCompare()
  }
  if (!selExam.value || !stats.value.length) return
  return genSingle()
}

async function genSingle() {
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

async function genCompare() {
  loading.value = true
  content.value = ''
  let statText = '以下为多次考试对比数据：\n\n'
  for (const id of cmpIds.value) {
    const exam = exams.value.find(e => e.id === id)
    if (!exam) continue
    const related = grades.value.filter(g => g.examId === id || g.examName === exam.name)
    const allScores = []
    related.forEach(g => (g.scores || []).forEach(s => { if (s.score != null) allScores.push(+s.score) }))
    const avg = allScores.length ? (allScores.reduce((a,b)=>a+b,0)/allScores.length).toFixed(1) : '-'
    statText += `「${exam.name}」(${exam.date})：参考人数 ${allScores.length}，均分 ${avg}\n`
  }
  statText += `\n对比数据：${cmpChart.value ? JSON.stringify(cmpChart.value) : ''}`
  const prompt = `请根据以下多次考试对比数据，撰写考试趋势分析：1) 整体趋势（上升/下降/波动）2) 各次考试间变化幅度 3) 进步或退步的可能原因 4) 后续教学建议。语言简洁专业。\n\n${statText}`
  try {
    const res = await api.post('/ai/chat-sync', { messages: [{ role: 'user', content: prompt }] })
    content.value = res.content || ''
    if (!content.value) uni.showToast({ title: '生成内容为空', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
  loading.value = false
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
    if (pendingExamId.value && exams.value.length) {
      const found = exams.value.find((x) => x.id === pendingExamId.value)
      if (found) {
        selExam.value = found
        content.value = ''
      }
      pendingExamId.value = ''
    }
  } catch (e) {
    exams.value = []
    grades.value = []
  }
}

onLoad((q) => {
  pendingExamId.value = (q && q.examId) ? decodeURIComponent(q.examId) : ''
})

onShow(() => {
  if (!auth.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  load()
})
async function exportAsDocx() {
  if (!content.value) return
  const title = '考试分析_' + (stats.value[0]?.subject || '')
  await exportDocx(title, content.value, title)
}
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
.copy { background: var(--c-card2); color: var(--c-title); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; }
.copy.docx { background: #409eff; color: #fff; border-color: #409eff; }
.mode-toggle { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.mt { font-size: 26rpx; padding: 12rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); }
.mt.on { background: var(--c-accent); color: #fff; font-weight: 700; }
.cmp-list { margin-bottom: 16rpx; }
.cmp-chk { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); }
.cc-dot { width: 32rpx; height: 32rpx; border-radius: 50%; border: 3rpx solid #ccc; flex-shrink: 0; }
.cc-dot.on { background: #07c160; border-color: #07c160; }
.cc-label { font-size: 26rpx; color: var(--c-title); }
.cmp-hint { font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; }
.cmp-chart-wrap { margin-top: 14rpx; }
.cmt { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.chart-canvas { width: 100%; height: 360rpx; }
</style>
