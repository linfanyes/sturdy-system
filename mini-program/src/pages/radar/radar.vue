<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="filter">
      <picker :range="classOpts" @change="pickClass">
        <view class="picker">班级：{{ selName }}</view>
      </picker>
      <picker :range="studentOpts" @change="pickStudent">
        <view class="picker">学生：{{ selStudentName || '请选择' }}</view>
      </picker>
    </view>

    <view v-if="!selStudentId" class="empty">请先选择班级和学生，查看个人成绩雷达图</view>

    <template v-else>
      <view class="card">
        <view class="ch-t">{{ selStudentName }} 各科成绩雷达图</view>
        <view class="sub">基于最近一次考试数据</view>
        <canvas canvas-id="radarCanvas" class="radar-canvas"></canvas>
        <view class="legend">
          <view class="lg-row"><view class="lg-c" style="background:#e6a23c"></view>该生分数</view>
          <view class="lg-row"><view class="lg-c" style="background:#ccc"></view>班级均分</view>
        </view>
      </view>

      <view class="card">
        <view class="ch-t">分数详情</view>
        <view class="row head">
          <text class="c subj">科目</text>
          <text class="c sc">分数</text>
          <text class="c avg">班级均分</text>
          <text class="c diff">偏差</text>
        </view>
        <view class="row" v-for="s in detailData" :key="s.subject">
          <text class="c subj">{{ s.subject }}</text>
          <text class="c sc" :class="{ up: s.score >= s.avg, down: s.score < s.avg }">{{ s.score }}</text>
          <text class="c avg">{{ s.avg }}</text>
          <text class="c diff" :class="{ up: s.score >= s.avg, down: s.score < s.avg }">{{ s.score >= s.avg ? '+' : '' }}{{ (s.score - s.avg).toFixed(1) }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const classes = ref([])
const classId = ref('')
const students = ref([])
const grades = ref([])
const selStudentId = ref('')

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const studentOpts = computed(() => students.value.map((s) => s.name))
const selStudentName = computed(() => {
  const s = students.value.find((x) => x.id === selStudentId.value)
  return s ? s.name : ''
})

// 取该学生最近一次考试的各科成绩 + 班级均分
const radarData = computed(() => {
  if (!selStudentId.value || !grades.value.length) return { labels: [], myScores: [], avgScores: [], maxScore: 100 }
  // 取最近一次考试的所有科目成绩
  const latest = grades.value.reduce((a, b) => (a.date > b.date ? a : b))
  const sameExam = grades.value.filter((g) => g.examName === latest.examName)
  const labels = sameExam.map((g) => g.subject)
  const myScores = sameExam.map((g) => {
    const sc = (g.scores || []).find((s) => s.studentId === selStudentId.value)
    return sc && sc.score != null ? Number(sc.score) : 0
  })
  const avgScores = sameExam.map((g) => {
    const all = (g.scores || []).filter((s) => s.score != null).map((s) => Number(s.score))
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
  })
  const maxScore = Math.max(100, ...myScores, ...avgScores)
  return { labels, myScores, avgScores, maxScore: Math.ceil(maxScore / 10) * 10 }
})

const detailData = computed(() => {
  const d = radarData.value
  return d.labels.map((label, i) => ({
    subject: label,
    score: d.myScores[i],
    avg: d.avgScores[i].toFixed(1),
  }))
})

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (!classId.value && classes.value.length) classId.value = classes.value[0].id
  if (classId.value) {
    students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
    grades.value = await api.getList('/grades', { silent: true })
  }
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  selStudentId.value = ''
  students.value = []
  grades.value = []
  load()
}
function pickStudent(ev) {
  selStudentId.value = students.value[ev.detail.value].id
}

// canvas 五边形雷达图
watch(radarData, () => nextTick(drawRadar), { immediate: true, deep: true })
function drawRadar() {
  const d = radarData.value
  if (!d.labels.length) return
  const ctx = uni.createCanvasContext('radarCanvas')
  const W = 620, H = 440, cx = W / 2, cy = H / 2 + 10, r = 170
  const n = d.labels.length
  ctx.clearRect(0, 0, W, H)

  // 背景网格（4层同心多边形）
  for (let level = 1; level <= 4; level++) {
    const lr = (r / 4) * level
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const x = cx + lr * Math.cos(angle)
      const y = cy + lr * Math.sin(angle)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.setStrokeStyle(theme.mode === 'dark' ? '#2c313a' : '#e8e0d4')
    ctx.setLineWidth(1)
    ctx.stroke()
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
    ctx.setStrokeStyle(theme.mode === 'dark' ? '#2c313a' : '#e8e0d4')
    ctx.stroke()
  }

  // 标签
  ctx.setFontSize(22)
  ctx.setTextAlign('center')
  ctx.setFillStyle(theme.mode === 'dark' ? '#9aa0a6' : '#8a8a8a')
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const tx = cx + (r + 32) * Math.cos(angle)
    const ty = cy + (r + 32) * Math.sin(angle)
    ctx.fillText(d.labels[i], tx, ty + 7)
  }

  // 绘制分数多边形（该生）
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const idx = i % n
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
    const val = Math.min(1, (d.myScores[idx] || 0) / d.maxScore)
    const px = cx + val * r * Math.cos(angle)
    const py = cy + val * r * Math.sin(angle)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.setFillStyle('rgba(230,162,60,0.2)')
  ctx.setStrokeStyle('#e6a23c')
  ctx.setLineWidth(3)
  ctx.fill()
  ctx.stroke()

  // 绘制班级均分多边形
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const idx = i % n
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2
    const val = Math.min(1, (d.avgScores[idx] || 0) / d.maxScore)
    const px = cx + val * r * Math.cos(angle)
    const py = cy + val * r * Math.sin(angle)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.setFillStyle('rgba(200,200,200,0.15)')
  ctx.setStrokeStyle('#ccc')
  ctx.setLineWidth(2)
  ctx.setLineDash([5, 5])
  ctx.fill()
  ctx.stroke()

  ctx.draw()
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.filter { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.filter .picker { flex: 1; background: var(--c-card); border-radius: 16rpx; padding: 20rpx 18rpx; font-size: 26rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 100rpx 40rpx; font-size: 28rpx; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.ch-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.radar-canvas { width: 620rpx; height: 440rpx; margin: 10rpx auto; display: block; }
.legend { display: flex; gap: 24rpx; justify-content: center; margin-top: 10rpx; }
.lg-row { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: var(--c-sub); }
.lg-c { width: 24rpx; height: 24rpx; border-radius: 4rpx; }
.row { display: flex; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.row.head { font-weight: 700; color: var(--c-sub); font-size: 24rpx; }
.c { display: block; text-align: center; }
.subj { flex: 1; text-align: left; color: var(--c-title); }
.sc { width: 80rpx; }
.avg { width: 100rpx; color: var(--c-sub); }
.diff { width: 100rpx; }
.up { color: #07c160; font-weight: 600; }
.down { color: #e06c75; font-weight: 600; }
</style>
