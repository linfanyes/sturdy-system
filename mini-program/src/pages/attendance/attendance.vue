<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <picker mode="date" :value="date" @change="(e)=>{ date = e.detail.value; loadAtt() }">
      <view class="picker">日期：{{ date || '今天' }}</view>
    </picker>

    <!-- 4 色统计卡（对齐 web 图标卡） -->
    <view class="stats">
      <view class="st" v-for="s in statusList" :key="s" :style="{ background: statusMap[s].bg }">
        <view class="ic">{{ statusMap[s].emoji }}</view>
        <view class="num" :style="{ color: statusMap[s].fg }">{{ stats[s] }}</view>
        <view class="lab">{{ s }}</view>
      </view>
    </view>

    <view class="quick">
      <text class="q" v-for="s in statusList" :key="s" @click="markAll(s)">全班{{ s }}</text>
    </view>

    <view class="trend-card" v-if="trendLabels.length">
      <view class="trend-h">📈 本周出勤率趋势</view>
      <canvas canvas-id="trendCanvas" class="trend-canvas"></canvas>
      <view class="trend-legend">
        <text class="tl-i"><text class="tl-dot" style="background:#07c160"></text>出勤</text>
        <text class="tl-i"><text class="tl-dot" style="background:#e06c75"></text>旷课</text>
      </view>
    </view>

    <view class="list">
      <view class="stu" v-for="st in students" :key="st.id">
        <text class="av">{{ st.gender === '女' ? '👧' : '👦' }}</text>
        <view class="info">
          <text class="nm">{{ st.name }}</text>
          <text class="sub">座 {{ st.seatNo || '-' }} · {{ st.studentNo || '无学号' }}</text>
        </view>
        <view class="opts">
          <text
            v-for="s in statusList"
            :key="s"
            class="opt"
            :class="[s, cur(st.id) === s && 'on']"
            :style="cur(st.id) === s ? { background: statusMap[s].fg, color: '#fff' } : {}"
            @click="setStu(st.id, s)"
          >{{ s }}</text>
        </view>
      </view>
    </view>

    <button class="save" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存考勤' }}</button>

    <view class="act-row">
      <text class="act-btn" @click="exportCsv">📋 导出 CSV</text>
      <text class="act-btn" @click="toggleCompare">📊 {{ showCompare ? '收起对比' : '跨班对比' }}</text>
    </view>

    <view v-if="showCompare" class="compare-sec">
      <picker :range="cmpClassOpts" :value="cmpClassIdx" @change="onCmpClass">
        <view class="picker cmp-pick">对比班级：{{ cmpClassOpts[cmpClassIdx] || '请选择' }}</view>
      </picker>
      <view class="cmp-stats" v-if="cmpStats">
        <view class="cmp-side"><text class="cs-lab">{{ selName }}</text>
          <text class="cs-num">出勤 {{ stats['出勤'] || 0 }}</text>
          <text class="cs-num">迟到 {{ stats['迟到'] || 0 }}</text>
          <text class="cs-num">请假 {{ stats['请假'] || 0 }}</text>
          <text class="cs-num">旷课 {{ stats['旷课'] || 0 }}</text>
        </view>
        <view class="cmp-vs">vs</view>
        <view class="cmp-side"><text class="cs-lab">{{ cmpClassName }}</text>
          <text class="cs-num">出勤 {{ cmpStats.出勤 || 0 }}</text>
          <text class="cs-num">迟到 {{ cmpStats.迟到 || 0 }}</text>
          <text class="cs-num">请假 {{ cmpStats.请假 || 0 }}</text>
          <text class="cs-num">旷课 {{ cmpStats.旷课 || 0 }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onShow, onPullDownRefresh, onUnload } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const statusList = ['出勤', '迟到', '请假', '旷课']
const statusMap = {
  '出勤': { bg: '#e8f9e8', fg: '#07c160', emoji: '✅' },
  '迟到': { bg: '#fff3e0', fg: '#e6a23c', emoji: '⏰' },
  '请假': { bg: '#e8f1fb', fg: '#409eff', emoji: '📝' },
  '旷课': { bg: '#fde8ea', fg: '#e06c75', emoji: '❌' },
}

const classes = ref([])
const classId = ref('')
const students = ref([])
const date = ref('')
const map = ref({}) // studentId -> status
const attId = ref('')
const saving = ref(false)
let dirty = false // 是否有未保存的考勤改动

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const stats = computed(() => {
  const o = { '出勤': 0, '迟到': 0, '请假': 0, '旷课': 0 }
  for (const id in map.value) o[map.value[id]]++
  return o
})

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (classId.value) await loadStudents()
}
async function loadStudents() {
  students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
  await loadAtt()
  loadTrend()
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadStudents()
}

async function loadAtt() {
  map.value = {}
  attId.value = ''
  dirty = false
  if (!classId.value) return
  const list = (await api.get('/attendances')).filter(
    (a) => a.classId === classId.value && (date.value ? a.date === date.value : true)
  )
  if (list.length) {
    const rec = list[0]
    attId.value = rec.id
    try {
      const arr = typeof rec.records === 'string' ? JSON.parse(rec.records) : rec.records || []
      for (const r of arr) map.value[r.studentId] = r.status
    } catch (e) {}
  }
  for (const s of students.value) if (!map.value[s.id]) map.value[s.id] = '出勤'
}

// 本周出勤趋势（近7天）
const trendData = ref([])
const trendLabels = computed(() => trendData.value.map((d) => d.label))
const trendPresent = computed(() => trendData.value.map((d) => d.presentRate))
const trendAbsent = computed(() => trendData.value.map((d) => d.absentRate))

async function loadTrend() {
  if (!classId.value || !students.value.length) return
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = (d.getMonth() + 1) + '/' + d.getDate()
    const datestr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const atts = (await api.get('/attendances')).filter((a) => a.classId === classId.value && a.date === datestr)
    if (atts.length) {
      const best = atts[0]
      const recs = typeof best.records === 'string' ? JSON.parse(best.records) : (best.records || [])
      const total = recs.length || 1
      const present = recs.filter((r) => r.status !== '旷课').length
      const absent = recs.filter((r) => r.status === '旷课').length
      days.push({ label, presentRate: Math.round(present / total * 100), absentRate: Math.round(absent / total * 100) })
    } else {
      days.push({ label, presentRate: -1, absentRate: -1 })
    }
  }
  trendData.value = days
  nextTick(drawTrend)
}

function drawTrend() {
  if (!trendLabels.value.length) return
  const ctx = uni.createCanvasContext('trendCanvas')
  const W = 660, H = 260, pad = 40, bottom = 40, top = 20
  const chartW = W - pad * 2, chartH = H - bottom - top
  ctx.clearRect(0, 0, W, H)

  const valid = trendData.value.filter((d) => d.presentRate >= 0)
  if (!valid.length) { ctx.draw(); return }

  const maxY = 100
  const stepX = chartW / (trendLabels.value.length - 1 || 1)

  // 背景网格
  ctx.setStrokeStyle(theme.mode === 'dark' ? '#2c313a' : '#f0eadc')
  ctx.setLineWidth(1)
  for (let y = 0; y <= 100; y += 25) {
    const yy = top + chartH - (y / maxY) * chartH
    ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke()
  }

  // 画折线 - 出勤率
  ctx.setStrokeStyle('#07c160')
  ctx.setLineWidth(3)
  ctx.beginPath()
  trendLabels.value.forEach((_, i) => {
    const d = trendData.value[i]
    const x = pad + i * stepX
    const y = top + chartH - (Math.max(0, d.presentRate) / maxY) * chartH
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()

  // 画折线 - 旷课率
  ctx.setStrokeStyle('#e06c75')
  ctx.setLineWidth(2)
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  trendLabels.value.forEach((_, i) => {
    const d = trendData.value[i]
    const x = pad + i * stepX
    const y = top + chartH - (Math.max(0, d.absentRate) / maxY) * chartH
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.setLineDash([])

  // 标签
  ctx.setFontSize(20)
  ctx.setTextAlign('center')
  ctx.setFillStyle(theme.mode === 'dark' ? '#9aa0a6' : '#8a8a8a')
  trendLabels.value.forEach((label, i) => {
    ctx.fillText(label, pad + i * stepX, H - 10)
  })

  ctx.draw()
}

function cur(id) {
  return map.value[id] || '出勤'
}
async function setStu(id, s) {
  const prev = cur(id)
  map.value[id] = s
  dirty = true
  // 对齐 web：新标记为「旷课」时自动生成班级公告
  if (s === '旷课' && prev !== '旷课') {
    const stu = students.value.find((x) => x.id === id)
    const cls = classes.value.find((x) => x.id === classId.value)
    try {
      await api.post('/notices', {
        classId: classId.value,
        title: (stu ? stu.name : '某同学') + '今日旷课',
        content: (cls ? cls.name : '') + ' ' + (stu ? stu.name : '') + ' 于 ' + (date.value || '今天') + ' 旷课，请家长关注。',
        pinned: false,
      })
      uni.showToast({ title: '已生成旷课通知', icon: 'none' })
    } catch (e) {
      // 公告生成失败：回滚本次状态变更，避免出现「标记旷课但无通知」的不一致
      map.value[id] = prev
      uni.showToast({ title: '旷课通知发送失败，已回滚状态：' + (e.message || ''), icon: 'none' })
    }
  }
}
function markAll(s) {
  for (const st of students.value) map.value[st.id] = s
  dirty = true
}

async function save(silent = false) {
  // 防重入：保存中直接返回
  if (saving.value) return
  if (!classId.value) return
  saving.value = true
  const records = students.value.map((s) => ({ studentId: s.id, status: map.value[s.id] || '出勤' }))
  const payload = { classId: classId.value, date: date.value || undefined, records }
  try {
    if (attId.value) await api.patch('/attendances/' + attId.value, payload)
    else await api.post('/attendances', payload)
    dirty = false
    if (!silent) uni.showToast({ title: '考勤已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
// 离开页面时若有未保存改动，自动落库，避免「已发旷课通知但考勤未保存」的不一致
onUnload(() => {
  if (dirty && classId.value && !saving.value) save(true)
})

// CSV 导出
function exportCsv() {
  if (!students.value.length) return uni.showToast({ title: '无数据可导出', icon: 'none' })
  let csv = '\uFEFF学号,姓名,性别,座号,考勤状态\n'
  for (const s of students.value) {
    csv += [s.studentNo || '', s.name, s.gender || '', s.seatNo || '', map.value[s.id] || '出勤'].join(',') + '\n'
  }
  uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: 'CSV 已复制到剪贴板', icon: 'success' }) })
}

// 跨班对比
const showCompare = ref(false)
const cmpClassIdx = ref(0)
const cmpStats = ref(null)
const cmpClassName = ref('')

const cmpClassOpts = computed(() => {
  return classes.value.filter(c => c.id !== classId.value).map(c => c.name)
})

function toggleCompare() {
  showCompare.value = !showCompare.value
  if (showCompare.value && cmpClassOpts.value.length) {
    cmpClassIdx.value = 0
    loadCmpStats(cmpClassOpts.value[0])
  }
}

function onCmpClass(e) {
  cmpClassIdx.value = e.detail.value
  loadCmpStats(cmpClassOpts.value[e.detail.value])
}

async function loadCmpStats(name) {
  const c = classes.value.find(x => x.name === name)
  if (!c) return
  cmpClassName.value = name
  try {
    const atts = await api.get('/attendances')
    const filtered = atts.filter(a => a.classId === c.id && (!date.value || a.date === date.value))
    const o = { 出勤: 0, 迟到: 0, 请假: 0, 旷课: 0 }
    for (const a of filtered) {
      const recs = typeof a.records === 'string' ? JSON.parse(a.records) : (a.records || [])
      for (const r of recs) {
        if (o[r.status] !== undefined) o[r.status]++
      }
    }
    cmpStats.value = o
  } catch (e) { cmpStats.value = null }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: var(--c-card); border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.stats { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.st { flex: 1; border-radius: 14rpx; padding: 16rpx 0; text-align: center; }
.ic { font-size: 34rpx; }
.num { display: block; font-size: 38rpx; font-weight: 800; margin: 4rpx 0; }
.lab { font-size: 22rpx; color: var(--c-sub); }
.quick { display: flex; gap: 12rpx; margin-bottom: 18rpx; flex-wrap: wrap; }
.q { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-accent); }
.trend-card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 18rpx; }
.trend-h { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.trend-canvas { width: 660rpx; height: 260rpx; margin: 0 auto; display: block; }
.trend-legend { display: flex; gap: 24rpx; justify-content: center; margin-top: 8rpx; }
.tl-i { font-size: 20rpx; color: var(--c-sub); display: flex; align-items: center; gap: 6rpx; }
.tl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 20rpx; margin-bottom: 24rpx; }
.stu { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.stu:last-child { border-bottom: none; }
.av { width: 60rpx; height: 60rpx; border-radius: 50%; background: var(--c-card2); text-align: center; line-height: 60rpx; font-size: 30rpx; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nm { font-size: 28rpx; color: var(--c-title); font-weight: 600; display: block; }
.sub { font-size: 22rpx; color: var(--c-sub); }
.opts { display: flex; gap: 8rpx; }
.opt { font-size: 20rpx; padding: 8rpx 12rpx; border-radius: 20rpx; background: var(--c-card2); color: var(--c-sub); }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; }
.act-row { display: flex; gap: 16rpx; margin-top: 16rpx; justify-content: center; }
.act-btn { font-size: 24rpx; color: var(--c-accent); padding: 12rpx 24rpx; border-radius: 30rpx; background: var(--c-card); border: 1px solid var(--c-input-border); }
.compare-sec { margin-top: 20rpx; }
.cmp-pick { margin-bottom: 14rpx; }
.cmp-stats { display: flex; align-items: stretch; gap: 14rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.cmp-side { flex: 1; }
.cmp-vs { display: flex; align-items: center; font-size: 26rpx; color: var(--c-sub); font-weight: 700; }
.cs-lab { display: block; font-size: 24rpx; font-weight: 700; color: var(--c-title); margin-bottom: 6rpx; }
.cs-num { display: block; font-size: 22rpx; color: var(--c-sub); line-height: 1.7; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .list { background: var(--c-card); }
.dark .nm { color: var(--c-title); }
.dark .sub { color: var(--c-sub); }
.dark .q { background: var(--c-card2); color: var(--c-accent); }
.dark .stu { border-color: var(--c-input-border); }
.dark .opt { background: var(--c-card2); color: var(--c-sub); }
</style>
