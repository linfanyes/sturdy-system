<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <picker :range="subjectOpts" @change="(e)=>selSubject = subjectOpts[e.detail.value]">
      <view class="picker">科目：{{ selSubject || '请选择' }}</view>
    </picker>

    <view class="seg">
      <text class="seg-i" :class="mode === 'trend' && 'on'" @click="mode = 'trend'">班级趋势</text>
      <text class="seg-i" :class="mode === 'compare' && 'on'" @click="mode = 'compare'">跨班对比</text>
    </view>

    <!-- 趋势模式：均分折线 + 个人折线 -->
    <template v-if="mode === 'trend'">
      <view v-if="!trendData.length" class="empty">暂无数据（请先在该班录入成绩）</view>
      <template v-else>
        <picker v-if="students.length" :range="studentOpts" @change="(e)=>selStudent = studentOpts[e.detail.value]">
          <view class="picker sm">查看个人：{{ selStudent || '全班均分' }}</view>
        </picker>

        <view class="chart">
          <view class="chart-title">{{ lineTitle }}</view>
          <canvas type="2d" id="trendCanvas" class="cv"></canvas>
          <view class="legend-min" v-if="lineStats.max > lineStats.min">
            最高 {{ lineStats.max }} · 最低 {{ lineStats.min }} · 平均 {{ lineStats.avg }}
          </view>
        </view>

        <!-- 数据表 -->
        <view class="tbl">
          <view class="tr th">
            <text class="td">考试</text><text class="td r">均分</text><text class="td r">最高</text>
            <text class="td r">最低</text><text class="td r">中位数</text><text class="td r">及格率</text><text class="td r">优秀率</text>
          </view>
          <view class="tr" v-for="d in trendData" :key="d.examName">
            <text class="td">{{ d.examName }}</text>
            <text class="td r">{{ d.avg }}</text>
            <text class="td r g">{{ d.max }}</text>
            <text class="td r r">{{ d.min }}</text>
            <text class="td r">{{ d.median }}</text>
            <text class="td r">{{ d.passRate }}%</text>
            <text class="td r">{{ d.excellentRate }}%</text>
          </view>
        </view>
      </template>
    </template>

    <!-- 对比模式 -->
    <template v-if="mode === 'compare'">
      <view v-if="!compareData.length" class="empty">暂无对比数据（多个班级录入同科目后可对比）</view>
      <view v-else class="chart">
        <view class="chart-title">{{ selSubject }} · 各班最新平均分</view>
        <view class="bars">
          <view class="bar-col" v-for="(d, i) in compareData" :key="d.classId">
            <view class="bar" :style="{ height: barH(d.avg) + 'rpx', background: d.color }"></view>
            <text class="bv">{{ d.avg }}</text>
            <text class="bx">{{ d.className }}</text>
          </view>
        </view>
        <view class="cmp-meta" v-for="d in compareData" :key="d.classId">
          <text>{{ d.className }} · {{ d.latestExam }}</text>
          <text class="sub">及格 {{ d.passRate }}% · 优秀 {{ d.excellentRate }}% · {{ d.count }}人</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const mode = ref('trend')
const classes = ref([])
const classId = ref('')
const grades = ref([])
const selSubject = ref('')
const selStudent = ref('')

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const subjectsOf = (cid) => {
  const set = new Set()
  grades.value.filter((g) => !cid || g.classId === cid).forEach((g) => set.add(g.subject))
  return [...set]
}
const subjectOpts = computed(() => subjectsOf(mode.value === 'compare' ? '' : classId.value))
const studentOpts = ref(['全班均分'])

function avgScore(g) {
  if (!g.scores || !g.scores.length) return 0
  const sum = g.scores.reduce((s, x) => s + (Number(x.score) || 0), 0)
  return Math.round((sum / g.scores.length) * 10) / 10
}
function calcStat(scores, fullScore) {
  const arr = scores.map((x) => Number(x.score) || 0).filter((v) => v > 0)
  if (!arr.length) return { avg: 0, max: 0, min: 0, median: 0, passRate: 0, excellentRate: 0 }
  arr.sort((a, b) => a - b)
  const sum = arr.reduce((s, x) => s + x, 0)
  const avg = Math.round((sum / arr.length) * 10) / 10
  const max = arr[arr.length - 1]
  const min = arr[0]
  const mid = arr.length % 2 ? arr[(arr.length - 1) / 2] : Math.round((arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2)
  const fs = fullScore || 100
  const passLine = fs * 0.6
  const excLine = fs * 0.85
  const pass = arr.filter((v) => v >= passLine).length
  const exc = arr.filter((v) => v >= excLine).length
  return {
    avg, max, min, median: mid,
    passRate: Math.round((pass / arr.length) * 100),
    excellentRate: Math.round((exc / arr.length) * 100),
  }
}

const trendData = computed(() => {
  if (mode.value !== 'trend' || !selSubject.value || !classId.value) return []
  return grades.value
    .filter((g) => g.classId === classId.value && g.subject === selSubject.value)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((g) => ({ examName: g.examName || g.date, ...calcStat(g.scores, g.fullScore) }))
})

const lineStats = computed(() => {
  const vs = trendData.value.map((d) => d.avg).filter((v) => v > 0)
  return {
    max: vs.length ? Math.max(...vs) : 0,
    min: vs.length ? Math.min(...vs) : 0,
    avg: vs.length ? Math.round((vs.reduce((s, x) => s + x, 0) / vs.length) * 10) / 10 : 0,
  }
})
const lineTitle = computed(() => {
  const cn = selName.value
  if (selStudent.value && selStudent.value !== '全班均分')
    return cn + ' · ' + selSubject.value + ' · ' + selStudent.value + ' 成绩趋势'
  return cn + ' · ' + selSubject.value + ' 均分趋势'
})

const compareData = computed(() => {
  if (mode.value !== 'compare' || !selSubject.value) return []
  const palette = ['#e6a23c', '#07c160', '#409eff', '#a07b3b', '#9b59b6', '#e06c75']
  return classes.value.map((c, i) => {
    const list = grades.value.filter((g) => g.classId === c.id && g.subject === selSubject.value)
    if (!list.length) return null
    const latest = list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
    const st = calcStat(latest.scores, latest.fullScore)
    return { classId: c.id, className: c.name, avg: st.avg, passRate: st.passRate, excellentRate: st.excellentRate, count: (latest.scores || []).length, latestExam: latest.examName, color: palette[i % palette.length] }
  }).filter(Boolean)
})
function barH(v) {
  const max = Math.max(10, ...compareData.value.map((d) => d.avg))
  return Math.round((v / max) * 300)
}

// 个人折线点
const studentTrend = computed(() => {
  if (!selStudent.value || selStudent.value === '全班均分' || !selSubject.value || !classId.value) return null
  const stu = (studentList.value.find((s) => s.name === selStudent.value) || {})
  if (!stu.id) return null
  return grades.value
    .filter((g) => g.classId === classId.value && g.subject === selSubject.value)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((g) => {
      const s = (g.scores || []).find((x) => x.studentId === stu.id)
      return { examName: g.examName || g.date, value: s ? Number(s.score) || 0 : null }
    }).filter((d) => d.value !== null)
})

const studentList = ref([])

// canvas 折线绘制
function drawLine() {
  if (mode.value !== 'trend' || !trendData.value.length) return
  nextTick(() => {
    uni.createSelectorQuery().select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = (uni.getSystemInfoSync().pixelRatio) || 2
      const W = res[0].width, H = res[0].height
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)

      const padL = 38, padR = 14, padT = 18, padB = 34
      const pts = studentTrend.value || trendData.value.map((d) => ({ examName: d.examName, value: d.avg }))
      const vals = pts.map((p) => p.value)
      const maxV = Math.max(...vals, 100)
      const minV = Math.min(...vals, 0)
      const range = maxV - minV || 1
      const stepX = pts.length > 1 ? (W - padL - padR) / (pts.length - 1) : 0
      const color = studentTrend.value ? '#409eff' : '#07c160'

      // 网格
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1
      for (let i = 0; i <= 3; i++) {
        const y = padT + (i * (H - padT - padB)) / 3
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
      }
      // 折线
      ctx.beginPath()
      pts.forEach((p, i) => {
        const x = padL + i * stepX
        const y = padT + (1 - (p.value - minV) / range) * (H - padT - padB)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
      // 点 + 标注
      ctx.fillStyle = color
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      pts.forEach((p, i) => {
        const x = padL + i * stepX
        const y = padT + (1 - (p.value - minV) / range) * (H - padT - padB)
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#5a5048'
        ctx.fillText(String(p.value), x, y - 8)
        ctx.fillStyle = '#bbb'
        ctx.fillText((p.examName || '').slice(0, 6), x, H - 12)
        ctx.fillStyle = color
      })
    })
  })
}

watch([mode, selSubject, classId, selStudent], () => { drawLine() }, { deep: false })

async function load() {
  classes.value = await api.get('/classes')
  const [g, st] = await Promise.all([api.get('/grades'), api.get('/students')])
  grades.value = g || []
  studentList.value = st || []
  studentOpts.value = ['全班均分', ...studentList.value.filter((s) => s.classId === classId.value).map((s) => s.name)]
  if (!selSubject.value) {
    const opts = subjectsOf(classId.value)
    if (opts.length) selSubject.value = opts[0]
  }
  drawLine()
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  selStudent.value = '全班均分'
  studentOpts.value = ['全班均分', ...studentList.value.filter((s) => s.classId === classId.value).map((s) => s.name)]
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.picker.sm { font-size: 24rpx; padding: 16rpx 20rpx; }
.seg { display: flex; background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 20rpx; }
.seg-i { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #9aa0a6; }
.seg-i.on { background: #e6a23c; color: #fff; font-weight: 600; }
.chart { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.chart-title { font-size: 26rpx; color: #4a3f35; margin-bottom: 16rpx; font-weight: 600; }
.cv { width: 100%; height: 380rpx; }
.legend-min { font-size: 22rpx; color: #9aa0a6; margin-top: 12rpx; text-align: center; }
.tbl { margin-top: 18rpx; background: #fff; border-radius: 16rpx; padding: 6rpx 16rpx; }
.tr { display: flex; padding: 14rpx 0; border-bottom: 1px solid #f3f3f3; font-size: 22rpx; }
.tr.th { color: #9aa0a6; font-weight: 600; }
.tr:last-child { border-bottom: none; }
.td { flex: 1; color: #4a3f35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td.r { text-align: right; flex: 0 0 78rpx; }
.td.g { color: #07c160; }
.td.r { color: #e06c75; }
.bars { display: flex; align-items: flex-end; gap: 14rpx; height: 340rpx; padding: 10rpx 0; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar { width: 60%; border-radius: 10rpx 10rpx 0 0; min-height: 4rpx; }
.bv { font-size: 22rpx; color: #5a5048; margin-top: 8rpx; }
.bx { font-size: 20rpx; color: #9aa0a6; margin-top: 4rpx; }
.cmp-meta { display: flex; justify-content: space-between; font-size: 22rpx; color: #4a3f35; padding: 10rpx 0; border-bottom: 1px solid #f3f3f3; }
.cmp-meta .sub { color: #9aa0a6; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 0; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .seg, .dark .chart, .dark .tbl { background: var(--c-card); }
.dark .seg-i { color: var(--c-sub); }
.dark .chart-title, .dark .td, .dark .cmp-meta, .dark .li { color: var(--c-title); }
.dark .td.r { color: var(--c-danger); }
.dark .td.g { color: var(--c-primary); }
</style>
