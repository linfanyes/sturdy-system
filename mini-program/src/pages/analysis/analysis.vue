<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <text class="ht">数据统计</text>
      <view class="hdr">
        <picker v-if="semesterList.length" :range="semesterList" range-key="name" :value="semesterIdx" @change="onSemesterChange">
          <text class="filter-btn">{{ semesterList[semesterIdx]?.name || '全部学期' }} ▾</text>
        </picker>
        <text class="export-btn" @click="doExport">📥 导出</text>
        <text class="refresh" @click="load">↻ 刷新</text>
      </view>
    </view>

    <view class="cards">
      <view class="card c1">
        <text class="n">{{ stat.classes }}</text><text class="l">班级数</text>
      </view>
      <view class="card c2">
        <text class="n">{{ stat.students }}</text><text class="l">学生数</text>
      </view>
      <view class="card c3">
        <text class="n">{{ stat.attRate }}%</text><text class="l">平均出勤率</text>
      </view>
      <view class="card c4">
        <text class="n">{{ stat.hwDone }}%</text><text class="l">作业完成率</text>
      </view>
      <view class="card c5">
        <text class="n">{{ stat.avgScore }}</text><text class="l">考试均分</text>
      </view>
      <view class="card c6">
        <text class="n">{{ stat.todoDone }}%</text><text class="l">待办完成率</text>
      </view>
      <view class="card c7">
        <text class="n">{{ stat.notes }}</text><text class="l">笔记数</text>
      </view>
      <view class="card c8">
        <text class="n">{{ stat.notices }}</text><text class="l">未结束公告</text>
      </view>
    </view>

    <view class="block">
      <view class="bt">各班级学生数</view>
      <view v-for="c in classRows" :key="c.id" class="row">
        <text class="rn">{{ c.name }}</text>
        <view class="bar"><view class="fill" :style="{ width: c.pct + '%' }"></view></view>
        <text class="rc">{{ c.count }}</text>
      </view>
      <view v-if="!classRows.length" class="empty">暂无班级数据</view>
    </view>

    <view class="block" v-if="examTrend && examTrend.labels && examTrend.labels.length > 1">
      <view class="bt">📈 考试均分趋势</view>
      <canvas type="2d" canvas-id="examTrendCanvas" id="examTrendCanvas" class="chart-canvas"></canvas>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { exportXlsx } from '../../common/exporter'
import uCharts from '@qiun/ucharts'

const stat = ref({
  classes: 0,
  students: 0,
  attRate: 0,
  hwDone: 0,
  avgScore: 0,
  todoDone: 0,
  notes: 0,
  notices: 0,
})
const classRows = ref([])
const semesterList = ref([])
const semesterIdx = ref(0)
const examTrend = ref(null)
let trendChart = null

// 学期筛选
async function loadSemesters() {
  try { semesterList.value = await api.get('/semesters') || []; semesterIdx.value = 0 }
  catch { semesterList.value = [] }
}
function onSemesterChange(e) { semesterIdx.value = e.detail.value; load() }

async function load() {
  uni.showLoading({ title: '统计中…', mask: false })
  try {
    const res = await Promise.allSettled([
      api.get('/classes'),
      api.get('/students'),
      api.get('/attendances'),
      api.get('/grades'),
      api.get('/homework'),
      api.get('/notes'),
      api.get('/todos'),
      api.get('/notices'),
    ])
    const [classes, students, atts, grades, homework, notes, todos, notices] = res.map((r) =>
      r.status === 'fulfilled' ? r.value || [] : [],
    )

    // 出勤率
    let atTotal = 0
    let atPresent = 0
    ;(atts || []).forEach((a) => {
      const recs = typeof a.records === 'string' ? safeParse(a.records) : a.records || []
      recs.forEach((r) => {
        atTotal++
        if (r.status === '出勤' || r.status === '迟到' || r.status === '请假') atPresent++
      })
    })
    const attRate = atTotal ? Math.round((atPresent / atTotal) * 100) : 0

    // 作业完成率（已批改 + 已发还）
    const hw = homework || []
    const hwDone = hw.length ? Math.round((hw.filter((h) => h.status === '已批改' || h.status === '已发还').length / hw.length) * 100) : 0

    // 考试均分
    const sc = []
    ;(grades || []).forEach((g) => (g.scores || []).forEach((x) => { if (x.score != null) sc.push(Number(x.score)) }))
    const avgScore = sc.length ? Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10 : 0

    // 待办完成率
    const td = todos || []
    const todoDone = td.length ? Math.round((td.filter((t) => t.done).length / td.length) * 100) : 0

    // 未结束公告
    const nt = (notices || []).filter((n) => !n.ended).length

    stat.value = {
      classes: (classes || []).length,
      students: (students || []).length,
      attRate,
      hwDone,
      avgScore,
      todoDone,
      notes: (notes || []).length,
      notices: nt,
    }

    // 各班学生数
    const map = {}
    ;(students || []).forEach((s) => { map[s.classId] = (map[s.classId] || 0) + 1 })
    const max = Math.max(1, ...Object.values(map))
    classRows.value = (classes || []).map((c) => ({
      id: c.id,
      name: c.name,
      count: map[c.id] || 0,
      pct: Math.round(((map[c.id] || 0) / max) * 100),
    }))

    const failed = res.filter((r) => r.status === 'rejected').length
    if (failed) uni.showToast({ title: `有 ${failed} 项数据获取失败`, icon: 'none' })
    loadExamTrend() // 不阻塞主流程
  } catch (e) {
    uni.showToast({ title: '统计加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch (e) {
    return []
  }
}
onShow(() => { loadSemesters(); load() })
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

// 考试均分趋势
async function loadExamTrend() {
  try {
    const semester = semesterList.value.length ? semesterList.value[semesterIdx.value]?.name : ''
    let exams = await api.getList('/exams', { silent: true }) || []
    if (semester) exams = exams.filter(e => e.term === semester)
    if (!exams.length) return
    exams.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const labels = [], data = []
    for (const exam of exams.slice(-12)) { // 最近12次
      const grades = await api.getList('/grades?examId=' + exam.id, { silent: true }) || []
      const scs = []
      grades.forEach(g => (g.scores || []).forEach(s => { if (s.score != null) scs.push(+s.score) }))
      if (scs.length) {
        labels.push((exam.name || '').slice(0, 6))
        data.push(+(scs.reduce((a, b) => a + b, 0) / scs.length).toFixed(1))
      }
    }
    if (labels.length > 1) {
      examTrend.value = { labels, data }
      nextTick(() => drawTrend(labels, data))
    }
  } catch {}
}

function drawTrend(labels, data) {
  const query = uni.createSelectorQuery()
  query.select('#examTrendCanvas').fields({ node: true, size: true }).exec(res => {
    if (!res || !res[0] || !res[0].node) return
    const canvas = res[0].node
    const ctx = canvas.getContext('2d')
    const dpr = uni.getSystemInfoSync().pixelRatio
    canvas.width = res[0].width * dpr
    canvas.height = res[0].height * dpr
    ctx.scale(dpr, dpr)
    if (trendChart) {
      trendChart.updateData({ categories: labels, series: [{ name: '均分', data, color: '#e6a23c', index: 0 }] })
    } else {
      trendChart = new uCharts({
        type: 'line', context: ctx, width: res[0].width, height: res[0].height,
        categories: labels, series: [{ name: '均分', data, color: '#e6a23c', index: 0 }],
        yAxis: { disabled: false }, xAxis: { disableGrid: true, fontSize: 10 },
        extra: { line: { type: 'straight', width: 2 } }, colors: ['#e6a23c'],
      })
    }
  })
}

// 导出
async function doExport() {
  const s = stat.value
  const rows = [['指标', '数值']]
  rows.push(['班级数', s.classes], ['学生数', s.students], ['平均出勤率', s.attRate + '%'],
    ['作业完成率', s.hwDone + '%'], ['考试均分', s.avgScore], ['待办完成率', s.todoDone + '%'],
    ['笔记数', s.notes], ['未结束公告', s.notices])
  if (classRows.value.length) {
    rows.push([])
    rows.push(['班级', '学生数'])
    classRows.value.forEach(r => rows.push([r.name, r.count + '']))
  }
  try {
    await exportXlsx(['指标', '数值'], rows.slice(1), '数据统计导出')
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch { uni.showToast({ title: '导出失败', icon: 'none' }) }
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.ht { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.hdr { display: flex; align-items: center; gap: 16rpx; }
.filter-btn { font-size: 24rpx; color: var(--c-accent); padding: 10rpx 18rpx; background: var(--c-card2); border-radius: 20rpx; }
.export-btn { font-size: 24rpx; color: #fff; background: var(--c-accent); padding: 8rpx 20rpx; border-radius: 20rpx; }
.refresh { font-size: 26rpx; color: var(--c-accent); }
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; margin-bottom: 30rpx; }
.card { border-radius: 20rpx; padding: 30rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.c1 { background: #fff7ec; } .c2 { background: #e8f1fb; } .c3 { background: #e8f9e8; }
.c4 { background: #fdeef0; } .c5 { background: #eef0fb; } .c6 { background: #f3eefb; }
.c7 { background: #fff3e0; } .c8 { background: #eafaf3; }
.n { font-size: 48rpx; font-weight: 800; color: #4a3f35; }
.l { font-size: 24rpx; color: #8a7f74; margin-top: 8rpx; }
.block { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.bt { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 18rpx; }
.rn { width: 180rpx; font-size: 26rpx; color: var(--c-title); }
.bar { flex: 1; height: 20rpx; background: var(--c-card2); border-radius: 10rpx; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%); border-radius: 10rpx; }
.rc { width: 60rpx; text-align: right; font-size: 26rpx; color: var(--c-accent); font-weight: 700; }
.empty { text-align: center; color: var(--c-sub); padding: 40rpx 0; }
.chart-canvas { width: 100%; height: 360rpx; margin-top: 16rpx; }
.dark .ht, .dark .bt, .dark .rn { color: var(--c-title); }
.dark .n { color: var(--c-title); }
.dark .l { color: var(--c-sub); }
.dark .block { background: var(--c-card); }
.dark .c1, .dark .c2, .dark .c3, .dark .c4, .dark .c5, .dark .c6, .dark .c7, .dark .c8 { background: var(--c-card2); }
.dark .bar { background: var(--c-input); }
</style>
