<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view v-if="loading" class="loading">加载中…</view>

    <template v-else-if="student">
      <!-- 头部：学生姓名 + 学号 -->
      <view class="stu-card">
        <view class="stu-name">{{ student.name || analysis.studentName || '—' }}</view>
        <view class="stu-no">学号：{{ student.studentNo || '—' }}</view>
      </view>

      <!-- 统计卡片 2x2 -->
      <view class="stats">
        <view class="stat">
          <view class="stat-n">{{ examCount }}</view>
          <view class="stat-l">参加考试</view>
        </view>
        <view class="stat">
          <view class="stat-n">{{ n1(avgScore) }}</view>
          <view class="stat-l">平均分</view>
        </view>
        <view class="stat">
          <view class="stat-n sm">{{ bestSubject }}</view>
          <view class="stat-l">最佳科目</view>
        </view>
        <view class="stat">
          <view class="stat-n sm">{{ weakSubject }}</view>
          <view class="stat-l">待提升科目</view>
        </view>
      </view>

      <!-- 各科成绩概览 -->
      <view class="hd">各科成绩概览</view>
      <view v-if="!subjectList.length" class="empty">暂无数据</view>
      <view v-else class="list">
        <view v-for="s in subjectList" :key="s.name" class="item subj-item">
          <view class="subj-info">
            <text class="subj-name">{{ s.name }}</text>
            <text class="subj-avg">均分 {{ n1(s.avg) }}</text>
          </view>
          <text class="trend" :class="trendClass(s.trend)">{{ trendArrow(s.trend) }} {{ trendText(s.trend) }}</text>
        </view>
      </view>

      <!-- 成绩趋势图 -->
      <view class="hd">成绩趋势</view>
      <view class="chart-card">
        <picker :range="subjectOpts" :value="subjectIdx" @change="onPickSubject">
          <view class="picker">科目：{{ subjectOpts[subjectIdx] }}</view>
        </picker>
        <view v-if="!chartPoints.length" class="empty sm">暂无数据</view>
        <template v-else>
          <canvas v-if="!canvasFailed" type="2d" id="gradeChart" class="cv"></canvas>
          <!-- canvas 不可用时降级为纯文字列表 -->
          <view v-else class="fallback">
            <view v-for="(p, i) in chartPoints" :key="i" class="fb-row">
              <text class="fb-exam">{{ p.examName }}</text>
              <text class="fb-val">{{ n1(p.value) }} 分</text>
            </view>
          </view>
          <view v-if="chartPoints.length" class="legend-min">
            最高 {{ n1(chartStats.max) }} · 最低 {{ n1(chartStats.min) }} · 平均 {{ n1(chartStats.avg) }}
          </view>
        </template>
      </view>

      <!-- 历次成绩明细 -->
      <view class="hd">历次成绩明细</view>
      <picker :range="filterOpts" :value="filterIdx" @change="onPickFilter">
        <view class="picker">筛选：{{ filterOpts[filterIdx] }}</view>
      </picker>
      <view v-if="!filteredList.length" class="empty">暂无数据</view>
      <view v-else class="list">
        <view v-for="(h, i) in filteredList" :key="i" class="item">
          <view class="it-top">
            <text class="exam-name">{{ h.examName || '—' }}</text>
            <text class="date">{{ h.date || '' }}</text>
          </view>
          <view class="it-bot">
            <text class="subject-tag">{{ h.subject }}</text>
            <text class="score">{{ n1(h.score) }}<text class="unit">分</text></text>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="empty">暂无数据</view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onLoad, onReady, onPullDownRefresh } from '@dcloudio/uni-app'
import { getStudent, getStudentGradesAnalysis } from '@/api/teaching'
import { theme } from '../../common/store'

const loading = ref(true)
const student = ref(null)
const analysis = ref({ history: [], subjects: {} })

const studentId = ref('')
const classId = ref('')
const canvasFailed = ref(false)

// 趋势图科目选择（含"全部"=总分趋势）
const selSubject = ref('全部')
// 明细列表筛选
const filterSubject = ref('全部')

const subjectNames = computed(() => Object.keys(analysis.value.subjects || {}))
const subjectOpts = computed(() => ['全部', ...subjectNames.value])
const subjectIdx = computed(() => {
  const i = subjectOpts.value.indexOf(selSubject.value)
  return i >= 0 ? i : 0
})
function onPickSubject(e) {
  selSubject.value = subjectOpts.value[e.detail.value]
}

const filterOpts = computed(() => ['全部', ...subjectNames.value])
const filterIdx = computed(() => {
  const i = filterOpts.value.indexOf(filterSubject.value)
  return i >= 0 ? i : 0
})
function onPickFilter(e) {
  filterSubject.value = filterOpts.value[e.detail.value]
}

// 历次成绩按日期降序
const history = computed(() => {
  const h = analysis.value.history || []
  return [...h].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const filteredList = computed(() => {
  if (filterSubject.value === '全部') return history.value
  return history.value.filter((h) => h.subject === filterSubject.value)
})

const subjectList = computed(() => {
  const subs = analysis.value.subjects || {}
  return Object.entries(subs).map(([name, v]) => ({
    name,
    avg: v.avg,
    trend: v.trend || 'flat',
  }))
})

const examCount = computed(() => {
  const ids = new Set()
  ;(analysis.value.history || []).forEach((h) => ids.add(h.examId || h.examName))
  return ids.size
})

const avgScore = computed(() => {
  const h = analysis.value.history || []
  if (!h.length) return 0
  const sum = h.reduce((s, x) => s + (Number(x.score) || 0), 0)
  return sum / h.length
})

const bestSubject = computed(() => {
  const list = subjectList.value
  if (!list.length) return '—'
  return list.reduce((m, x) => (x.avg > m.avg ? x : m)).name
})

const weakSubject = computed(() => {
  const list = subjectList.value
  if (!list.length) return '—'
  return list.reduce((m, x) => (x.avg < m.avg ? x : m)).name
})

// 折线图数据点：单科目为该科分数；"全部"为每次考试总分
const chartPoints = computed(() => {
  const h = analysis.value.history || []
  if (selSubject.value === '全部') {
    const map = {}
    h.forEach((item) => {
      const key = item.examId || item.examName
      if (!map[key]) map[key] = { examName: item.examName, date: item.date, total: 0 }
      map[key].total += Number(item.score) || 0
    })
    return Object.values(map)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((x) => ({ examName: x.examName, value: x.total }))
  }
  return h
    .filter((x) => x.subject === selSubject.value)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((x) => ({ examName: x.examName, value: Number(x.score) || 0 }))
})

const chartStats = computed(() => {
  const vals = chartPoints.value.map((p) => p.value)
  if (!vals.length) return { max: 0, min: 0, avg: 0 }
  return {
    max: Math.max(...vals),
    min: Math.min(...vals),
    avg: vals.reduce((s, x) => s + x, 0) / vals.length,
  }
})

// 保留 1 位小数
function n1(v) {
  const n = Number(v)
  if (isNaN(n)) return '—'
  return (Math.round(n * 10) / 10).toString()
}

function trendArrow(t) {
  if (t === 'up') return '↑'
  if (t === 'down') return '↓'
  return '→'
}
function trendClass(t) {
  if (t === 'up') return 'up'
  if (t === 'down') return 'down'
  return 'flat'
}
function trendText(t) {
  if (t === 'up') return '上升'
  if (t === 'down') return '下降'
  return '平稳'
}

// canvas 2d 折线图绘制
function drawChart() {
  if (canvasFailed.value) return
  const pts = chartPoints.value
  if (!pts.length) return
  nextTick(() => {
    try {
      uni
        .createSelectorQuery()
        .select('#gradeChart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            canvasFailed.value = true
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = (uni.getSystemInfoSync().pixelRatio) || 2
          const W = res[0].width
          const H = res[0].height
          canvas.width = W * dpr
          canvas.height = H * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, W, H)

          const padL = 42, padR = 16, padT = 20, padB = 42
          const plotW = W - padL - padR
          const plotH = H - padT - padB

          const vals = pts.map((p) => p.value)
          let maxV = Math.max(...vals)
          let minV = Math.min(...vals)
          if (maxV === minV) {
            maxV += 10
            minV = Math.max(0, minV - 10)
          }
          const pad = (maxV - minV) * 0.1
          maxV = maxV + pad
          minV = Math.max(0, minV - pad)
          const range = maxV - minV || 1

          const stepX = pts.length > 1 ? plotW / (pts.length - 1) : 0

          const isDark = theme.mode === 'dark'
          const gridColor = isDark ? '#2a2e36' : '#eee'
          const textColor = isDark ? '#8a909a' : '#9aa0a6'
          const labelColor = isDark ? '#c0c4cc' : '#5a5048'
          const lineColor = 'var(--c-blue)'

          // 网格 + Y 轴刻度
          ctx.strokeStyle = gridColor
          ctx.lineWidth = 1
          ctx.fillStyle = textColor
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          const ticks = 4
          for (let i = 0; i <= ticks; i++) {
            const y = padT + (i * plotH) / ticks
            ctx.beginPath()
            ctx.moveTo(padL, y)
            ctx.lineTo(W - padR, y)
            ctx.stroke()
            const v = maxV - (i * range) / ticks
            ctx.fillText(n1(v), padL - 6, y)
          }

          // X 轴考试名称
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = textColor
          pts.forEach((p, i) => {
            const x = padL + i * stepX
            ctx.fillText((p.examName || '').slice(0, 6), x, H - padB + 8)
          })

          // 折线
          ctx.beginPath()
          pts.forEach((p, i) => {
            const x = padL + i * stepX
            const y = padT + (1 - (p.value - minV) / range) * plotH
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
          })
          ctx.strokeStyle = lineColor
          ctx.lineWidth = 2.5
          ctx.lineJoin = 'round'
          ctx.stroke()

          // 数据点 + 分数标注
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          pts.forEach((p, i) => {
            const x = padL + i * stepX
            const y = padT + (1 - (p.value - minV) / range) * plotH
            ctx.beginPath()
            ctx.arc(x, y, 3.5, 0, Math.PI * 2)
            ctx.fillStyle = lineColor
            ctx.fill()
            ctx.fillStyle = labelColor
            ctx.font = '10px sans-serif'
            ctx.fillText(n1(p.value), x, y - 8)
          })
        })
    } catch (e) {
      canvasFailed.value = true
    }
  })
}

watch(chartPoints, () => {
  if (!canvasFailed.value) drawChart()
})

async function load() {
  if (!studentId.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [stu, ana] = await Promise.all([
      getStudent(studentId.value),
      getStudentGradesAnalysis(studentId.value),
    ])
    student.value = Array.isArray(stu) ? stu[0] || null : stu
    const a = ana || {}
    analysis.value = {
      history: a.history || [],
      subjects: a.subjects || {},
      studentId: a.studentId,
      studentName: a.studentName,
    }
  } catch (e) {
    student.value = null
    analysis.value = { history: [], subjects: {} }
  } finally {
    loading.value = false
    nextTick(() => drawChart())
  }
}

onLoad((options) => {
  studentId.value = (options && options.studentId) || ''
  classId.value = (options && options.classId) || ''
  load()
})

onReady(() => {
  // canvas 上下文就绪后尝试绘制（数据可能尚未到达，由 watch 兜底）
  drawChart()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.empty.sm { padding: 40rpx 0; }

/* 学生头部 */
.stu-card {
  background: linear-gradient(135deg, var(--c-accent), var(--c-primary));
  border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx;
  box-shadow: 0 4rpx 14rpx var(--c-shadow);
}
.stu-name { font-size: 38rpx; font-weight: 800; color: #fff; }
.stu-no { font-size: 26rpx; color: rgba(255, 255, 255, 0.85); margin-top: 8rpx; }

/* 统计 2x2 */
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 8rpx; }
.stat {
  background: var(--c-card); border-radius: 16rpx; padding: 24rpx 20rpx;
  box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.stat-n { font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.stat-n.sm { font-size: 32rpx; }
.stat-l { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }

/* 区块标题 */
.hd {
  font-size: 30rpx; font-weight: 700; color: var(--c-title);
  margin: 28rpx 0 16rpx; padding-left: 16rpx; border-left: 6rpx solid var(--c-accent);
}

/* 列表项 */
.list { }
.item {
  background: var(--c-card); border-radius: 16rpx; padding: 22rpx;
  margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.it-top { display: flex; justify-content: space-between; align-items: center; }
.exam-name { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.date { font-size: 22rpx; color: var(--c-sub); }
.it-bot { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; }
.subject-tag {
  font-size: 22rpx; color: var(--c-sub); background: var(--c-card2);
  padding: 4rpx 16rpx; border-radius: 20rpx;
}
.score { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.unit { font-size: 20rpx; font-weight: 400; color: var(--c-sub); margin-left: 4rpx; }

/* 各科概览 */
.subj-item { display: flex; justify-content: space-between; align-items: center; }
.subj-info { display: flex; align-items: baseline; gap: 16rpx; }
.subj-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.subj-avg { font-size: 24rpx; color: var(--c-sub); }
.trend { font-size: 26rpx; font-weight: 600; }
.trend.up { color: var(--c-primary); }
.trend.down { color: #e64340; }
.trend.flat { color: var(--c-sub); }

/* 图表 */
.chart-card {
  background: var(--c-card); border-radius: 16rpx; padding: 22rpx;
  box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.picker {
  border: 1px solid var(--c-input-border); border-radius: 12rpx;
  padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title);
  background: var(--c-input); margin-bottom: 16rpx;
}
.cv { width: 100%; height: 420rpx; }
.legend-min { font-size: 22rpx; color: var(--c-sub); margin-top: 12rpx; text-align: center; }
.fallback { margin-top: 8rpx; }
.fb-row {
  display: flex; justify-content: space-between; padding: 14rpx 0;
  border-bottom: 1px solid var(--c-input-border); font-size: 26rpx;
}
.fb-row:last-child { border-bottom: none; }
.fb-exam { color: var(--c-title); }
.fb-val { color: var(--c-accent); font-weight: 700; }
</style>
