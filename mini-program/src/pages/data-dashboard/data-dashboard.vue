<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">📊 数据看板</view>
      <view class="hdr">
        <picker v-if="dimension === 'class'" :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="pkr">{{ classOpts[classIdx] || '选班级' }}</view>
        </picker>
        <view class="export-btn" @click="doExport">📥 导出</view>
      </view>
    </view>

    <!-- 维度切换 tabs -->
    <view class="dim-tabs">
      <view v-for="d in dimensions" :key="d.key" class="dim-tab" :class="dimension===d.key&&'on'" @click="switchDim(d.key)">
        {{ d.label }}
      </view>
    </view>

    <!-- 时间筛选 -->
    <view class="time-row">
      <picker mode="date" fields="month" :value="startMonth" @change="onStartChange">
        <view class="tpick">{{ startMonth || '起始月' }}</view>
      </picker>
      <text class="tsep">至</text>
      <picker mode="date" fields="month" :value="endMonth" @change="onEndChange">
        <view class="tpick">{{ endMonth || '结束月' }}</view>
      </picker>
      <text class="treset" @click="resetTime">重置</text>
    </view>

    <!-- 概览卡片（含异常标记） -->
    <view class="cards">
      <view class="card c1"><view class="cv">{{ stats.studentCount }}</view><view class="cl">学生人数</view></view>
      <view class="card c2" :class="stats.attendRate < 70 && 'alert'">
        <view class="cv">{{ stats.attendRate }}%</view>
        <view class="cl">出勤率<text v-if="stats.attendRate < 70" class="alert-tag">⚠</text></view>
      </view>
      <view class="card c3" :class="+stats.avgScore < 60 && stats.avgScore !== '--' && 'alert'">
        <view class="cv">{{ stats.avgScore }}</view>
        <view class="cl">均分<text v-if="+stats.avgScore < 60 && stats.avgScore !== '--'" class="alert-tag">⚠</text></view>
      </view>
      <view class="card c4"><view class="cv">{{ stats.noticeCount }}</view><view class="cl">通知数</view></view>
    </view>

    <!-- 各科平均分柱状图 -->
    <view class="sec" v-if="stats.subjects && stats.subjects.length">
      <view class="st">📚 各科平均分</view>
      <view class="chart-wrap">
        <canvas type="2d" canvas-id="subjectBarCanvas" id="subjectBarCanvas" class="chart-canvas"></canvas>
      </view>
    </view>

    <!-- 出勤率趋势图 -->
    <view class="sec" v-if="trendDays && trendDays.length > 1">
      <view class="st">📈 {{ dimension === 'class' ? '出勤率趋势' : '各班级出勤率对比' }}</view>
      <view class="chart-wrap">
        <canvas type="2d" canvas-id="trendLineCanvas" id="trendLineCanvas" class="chart-canvas"></canvas>
      </view>
    </view>

    <view class="empty" v-if="loading">加载中…</view>
    <view class="empty" v-else-if="!statsLoaded">请在班级维度选择班级，或切换到年级/全校维度查看数据</view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import api from '../../common/request'
import { exportXlsx } from '../../common/exporter'
import uCharts from '@qiun/ucharts'

const dark = computed(() => theme.mode === 'dark')
const loading = ref(false)
const statsLoaded = ref(false)
const classes = ref([])
const classIdx = ref(-1)
const stats = ref({})
const colors = ['#e6a23c','#409eff','#67c23a','#e06c75','#9b59b6','#1abc9c']
const dimension = ref('class') // class | grade | school
const dimensions = [{key:'class',label:'🏫 班级'},{key:'grade',label:'🎓 年级'},{key:'school',label:'🏢 全校'}]
const startMonth = ref('')
const endMonth = ref('')
const trendDays = ref([]) // 趋势数据

const classOpts = computed(() => classes.value.map(c => c.name || `${c.grade||''}(${c.classNo||''})班`))

let subjectChart = null, trendChart = null

/** 使用 uCharts 绘制柱状图 */
function drawSubjectChart(categories, data) {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#subjectBarCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = uni.getSystemInfoSync().pixelRatio
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)
      if (subjectChart) {
        subjectChart.updateData({ categories, series: [{ name: '平均分', data, color: colors[0], index: 0 }] })
      } else {
        subjectChart = new uCharts({
          type: 'column', context: ctx, width: res[0].width, height: res[0].height,
          categories, series: [{ name: '平均分', data, color: colors[0], index: 0 }],
          yAxis: { disabled: false, min: 0 }, xAxis: { disableGrid: true, fontSize: 11 },
          extra: { column: { type: 'group', width: 30 } },
          colors,
        })
      }
    })
  })
}

/** 使用 uCharts 绘制折线图 */
function drawTrendChart(categories, data) {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#trendLineCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = uni.getSystemInfoSync().pixelRatio
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)
      if (trendChart) {
        trendChart.updateData({ categories, series: [{ name: '出勤率(%)', data, color: '#409eff', index: 0 }] })
      } else {
        trendChart = new uCharts({
          type: 'line', context: ctx, width: res[0].width, height: res[0].height,
          categories, series: [{ name: '出勤率(%)', data, color: '#409eff', index: 0 }],
          yAxis: { disabled: false, min: 0 }, xAxis: { disableGrid: true, fontSize: 11 },
          extra: { line: { type: 'straight', width: 2 } },
          colors: ['#409eff'],
        })
      }
    })
  })
}

function nowMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

async function loadClasses() {
  classes.value = await api.getList('/classes', { silent: true }) || []
}

function isInRange(date) {
  if (!startMonth.value && !endMonth.value) return true
  if (!date) return true
  const m = date.slice(0, 7)
  if (startMonth.value && m < startMonth.value) return false
  if (endMonth.value && m > endMonth.value) return false
  return true
}

async function loadClassStats(classId) {
  loading.value = true
  statsLoaded.value = false
  const c = classes.value.find(x => x.id === classId)
  const name = c ? (c.name || '') : ''
  const [students, attends, grades, notices] = await Promise.all([
    api.getList('/students?classId=' + classId, { silent: true }),
    api.getList('/attendances?classId=' + classId, { silent: true }),
    api.getList('/grades?classId=' + classId, { silent: true }),
    api.getList('/notices?classId=' + classId, { silent: true }),
  ])
  const filteredAtt = attends.filter(a => isInRange(a.date))
  const attTotal = filteredAtt.length
    ? (filteredAtt.filter(a => a.status==='出勤'||a.status==='正常').length / filteredAtt.length * 100).toFixed(0)
    : 0
  let avgScore = '--'
  let subjects = []
  if (grades.length) {
    const filteredGrades = grades.filter(g => isInRange(g.date || g.createdAt))
    const bySubject = {}
    for (const g of filteredGrades) {
      if (!g.scores || !g.scores.length) continue
      const scs = g.scores.filter(s => s.score != null).map(s => s.score)
      if (!scs.length) continue
      const avg = scs.reduce((a,b)=>a+b,0)/scs.length
      if (!bySubject[g.subject]) bySubject[g.subject] = {total:0,count:0}
      bySubject[g.subject].total += avg; bySubject[g.subject].count++
    }
    const allAvgs = []
    let ci = 0
    const cats = [], data = []
    for (const [subj, v] of Object.entries(bySubject)) {
      const a = +(v.total/v.count).toFixed(1)
      allAvgs.push(a)
      subjects.push({ name:subj, avg:a, pct:Math.min(100, Math.round(a)), color:colors[ci%colors.length] })
      cats.push(subj); data.push(a)
      ci++
    }
    if (cats.length) drawSubjectChart(cats, data)
    avgScore = allAvgs.length ? (allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(1) : '--'
  }

  // 出勤率趋势（按日期聚合）
  const dateMap = {}
  attends.forEach(a => {
    const d = a.date || ''
    if (!isInRange(d)) return
    if (!dateMap[d]) dateMap[d] = { total: 0, present: 0 }
    const records = a.records || {}
    const vals = Object.values(records)
    dateMap[d].total += vals.length
    dateMap[d].present += vals.filter(s => s==='出勤'||s==='正常').length
  })
  const ds = Object.entries(dateMap).sort((a,b) => a[0].localeCompare(b[0]))
  trendDays.value = ds.map(([d, v]) => ({ label: d.slice(5), rate: v.total ? Math.round(v.present/v.total*100) : 100 }))
  if (trendDays.value.length > 1) {
    drawTrendChart(trendDays.value.map(d => d.label), trendDays.value.map(d => d.rate))
  }

  statsLoaded.value = true
  loading.value = false
  stats.value = {
    classId, className: name,
    studentCount: students.length,
    attendRate: attTotal,
    avgScore,
    noticeCount: notices.filter(n => isInRange(n.date || n.createdAt)).length,
    subjects,
  }
}

async function loadGradeStats() {
  loading.value = true
  statsLoaded.value = false
  const grades = new Set(classes.value.map(c => c.grade).filter(Boolean))
  const gradeArr = [...grades]
  if (!gradeArr.length) { loading.value = false; return }

  let allStudents = 0, totalAttRate = 0, allNotices = 0
  const gradeData = []

  for (const gr of gradeArr) {
    const clsOfGrade = classes.value.filter(c => c.grade === gr)
    let students = 0, attSum = 0, attCount = 0
    for (const cl of clsOfGrade) {
      const [stu] = await Promise.all([api.getList('/students?classId='+cl.id,{silent:true})])
      students += stu.length
    }
    allStudents += students
    // 简化：取第一个班级的考勤作为年级参考
    if (clsOfGrade.length) {
      const atts = await api.getList('/attendances?classId='+clsOfGrade[0].id,{silent:true})
      const fa = atts.filter(a => isInRange(a.date))
      if (fa.length) {
        attSum += (fa.filter(a => a.status==='出勤'||a.status==='正常').length / fa.length * 100)
        attCount++
      }
    }
    const rate = attCount ? (attSum/attCount).toFixed(0) : 0
    totalAttRate += +rate
    gradeData.push({ label: gr + '年级', rate: +rate, students })
  }

  const nots = await api.getList('/notices',{silent:true})
  allNotices = nots.filter(n => isInRange(n.date || n.createdAt)).length

  stats.value = {
    studentCount: allStudents,
    attendRate: gradeArr.length ? (totalAttRate/gradeArr.length).toFixed(0) : 0,
    avgScore: '--',
    noticeCount: allNotices,
    subjects: [],
  }
  trendDays.value = gradeData
  if (gradeData.length > 1) {
    drawTrendChart(gradeData.map(d => d.label), gradeData.map(d => d.rate))
  }
  statsLoaded.value = true
  loading.value = false
}

async function loadSchoolStats() {
  loading.value = true
  statsLoaded.value = false
  const allStu = await api.getList('/students',{silent:true}) || []
  const allAtt = await api.getList('/attendances',{silent:true}) || []
  const allNoti = await api.getList('/notices',{silent:true}) || []
  const fa = allAtt.filter(a => isInRange(a.date))
  const attRate = fa.length
    ? (fa.filter(a => a.status==='出勤'||a.status==='正常').length / fa.length * 100).toFixed(0)
    : 0
  stats.value = {
    studentCount: allStu.length,
    attendRate: attRate,
    avgScore: '--',
    noticeCount: allNoti.filter(n => isInRange(n.date || n.createdAt)).length,
    subjects: [],
  }
  // 按班级出勤率
  const clsRates = []
  for (const c of classes.value) {
    const ca = allAtt.filter(a => a.classId === c.id)
    const fc = ca.filter(a => isInRange(a.date))
    if (fc.length) {
      const r = (fc.filter(a => a.status==='出勤'||a.status==='正常').length / fc.length * 100).toFixed(0)
      clsRates.push({ label: (c.name || c.id || '').slice(0,6), rate: +r })
    }
  }
  trendDays.value = clsRates
  if (clsRates.length > 1) {
    drawTrendChart(clsRates.map(d => d.label), clsRates.map(d => d.rate))
  }
  statsLoaded.value = true
  loading.value = false
}

function switchDim(key) {
  dimension.value = key
  if (key === 'class' && classIdx.value >= 0) loadClassStats(classes.value[classIdx.value].id)
  else if (key === 'grade') loadGradeStats()
  else if (key === 'school') loadSchoolStats()
}

function onClassChange(e) {
  const idx = e.detail.value
  classIdx.value = idx
  const cls = classes.value[idx]
  if (cls) loadClassStats(cls.id)
}

function onStartChange(e) { startMonth.value = e.detail.value; reloadStats() }
function onEndChange(e) { endMonth.value = e.detail.value; reloadStats() }
function resetTime() { startMonth.value = ''; endMonth.value = ''; reloadStats() }

function reloadStats() {
  if (dimension.value === 'class' && classIdx.value >= 0) loadClassStats(classes.value[classIdx.value].id)
  else if (dimension.value === 'grade') loadGradeStats()
  else if (dimension.value === 'school') loadSchoolStats()
}

async function doExport() {
  if (!statsLoaded.value) return uni.showToast({ title: '请先加载数据', icon: 'none' })
  const s = stats.value
  const rows = [['指标','数值']]
  rows.push(['学生人数', s.studentCount])
  rows.push(['出勤率', s.attendRate + '%'])
  rows.push(['均分', s.avgScore])
  rows.push(['通知数', s.noticeCount])
  if (s.subjects && s.subjects.length) {
    rows.push([])
    rows.push(['科目', '平均分'])
    s.subjects.forEach(sub => rows.push([sub.name, sub.avg+'' ]))
  }
  if (trendDays.value.length) {
    rows.push([])
    rows.push(['日期/班级','出勤率'])
    trendDays.value.forEach(d => rows.push([d.label, d.rate+'%' ]))
  }
  try {
    await exportXlsx(['指标','数值'], rows.slice(1), '数据看板导出')
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

onShow(async () => {
  startMonth.value = nowMonth()
  await loadClasses()
  if (classes.value.length) {
    classIdx.value = 0
    loadClassStats(classes.value[0].id)
  }
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.hdr { display: flex; align-items: center; gap: 16rpx; }
.pkr { font-size: 26rpx; color: var(--c-accent); padding: 10rpx 20rpx; background: var(--c-card2); border-radius: 20rpx; }
.export-btn { font-size: 24rpx; color: #fff; background: var(--c-accent); padding: 10rpx 22rpx; border-radius: 20rpx; }
.dim-tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.dim-tab { font-size: 26rpx; padding: 12rpx 26rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); }
.dim-tab.on { background: var(--c-accent); color: #fff; font-weight: 700; }
.time-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.tpick { font-size: 24rpx; color: var(--c-text); padding: 10rpx 18rpx; background: var(--c-card); border-radius: 14rpx; border: 1px solid var(--c-input-border); }
.tsep { font-size: 24rpx; color: var(--c-sub); }
.treset { font-size: 24rpx; color: #409eff; }
.cards { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.card { flex: 1; border-radius: 16rpx; padding: 20rpx 14rpx; text-align: center; }
.c1 { background: #fef3e6; } .c2 { background: #ecf5ff; } .c3 { background: #eff9f0; } .c4 { background: #fef0f5; }
.card.alert { border: 3rpx solid #e64340; background: #fef0f0; }
.cv { font-size: 44rpx; font-weight: 800; color: var(--c-title); }
.cl { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.alert-tag { font-size: 18rpx; color: #e64340; margin-left: 4rpx; }
.sec { margin-bottom: 20rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.chart-wrap { background: var(--c-card); border-radius: 16rpx; padding: 16rpx 8rpx; }
.chart-canvas { width: 100%; height: 360rpx; }
.empty { text-align: center; color: var(--c-sub); padding-top: 120rpx; font-size: 28rpx; }
.dark .page { background: var(--c-bg); }
</style>
