<template>
  <view>
    <!-- 综合分析弹层 -->
    <view v-if="showAnalysis" class="mask" @click="$emit('close-analysis')">
      <view class="modal" @click.stop>
        <view class="m-h">{{ examName }} · {{ subject }} 综合分析</view>

        <view class="stat-grid">
          <view class="st"><view class="st-n">{{ analysis.avg }}</view><view class="st-l">平均分</view></view>
          <view class="st"><view class="st-n">{{ analysis.max }}</view><view class="st-l">最高分</view></view>
          <view class="st"><view class="st-n">{{ analysis.min }}</view><view class="st-l">最低分</view></view>
          <view class="st"><view class="st-n">{{ analysis.median }}</view><view class="st-l">中位数</view></view>
          <view class="st"><view class="st-n" style="color:var(--c-primary)">{{ analysis.passRate }}%</view><view class="st-l">及格率</view></view>
          <view class="st"><view class="st-n" style="color:var(--c-accent)">{{ analysis.excellentRate }}%</view><view class="st-l">优秀率</view></view>
        </view>

        <view class="dist">
          <view class="dh">分数段分布（每 10 分一段）</view>
          <view class="bar-chart">
            <view v-for="(d, i) in analysis.dist" :key="i" class="bar-col">
              <text class="bar-num">{{ d.count }}</text>
              <view class="bar-track">
                <view class="bar-fill" :class="'bar-c' + d.colorIdx" :style="{ height: (d.heightPct || 4) + '%' }"></view>
              </view>
              <text class="bar-label">{{ d.label }}</text>
              <text class="bar-pct">{{ d.pct }}%</text>
            </view>
          </view>
          <view class="bar-legend">
            <view class="lg-item"><view class="lg-c bar-c0"></view><text>极低/不及格 (&lt;60)</text></view>
            <view class="lg-item"><view class="lg-c bar-c1"></view><text>及格 (60-69)</text></view>
            <view class="lg-item"><view class="lg-c bar-c2"></view><text>良好 (70-89)</text></view>
            <view class="lg-item"><view class="lg-c bar-c3"></view><text>优秀 (90+)</text></view>
          </view>
        </view>

        <!-- 各科对比雷达图 -->
        <view class="radar" v-if="radarData.subjects && radarData.subjects.length">
          <view class="dh">📊 各科对比雷达图</view>
          <canvas canvas-id="radarChart" id="radarChart" class="radar-cv"></canvas>
          <view class="radar-legend">
            <view v-for="(s, i) in radarData.subjects" :key="s.name" class="rl-item">
              <view class="rl-c" :style="{ background: radarData.colors[i % radarData.colors.length] }"></view>
              <text>{{ s.name }}</text>
            </view>
          </view>
        </view>

        <view class="rank" v-if="analysis.rank && analysis.rank.length">
          <view class="rh">名次（前 20）</view>
          <view v-for="(r, i) in analysis.rank.slice(0, 20)" :key="r.id" class="rk">
            <text class="rk-no">{{ i + 1 }}</text>
            <text class="rk-n">{{ r.name }}</text>
            <text class="rk-s">{{ r.score }}</text>
          </view>
        </view>

        <button class="m-close" @click="$emit('close-analysis')">关闭</button>
      </view>
    </view>

    <!-- 学生成绩单 -->
    <view class="mask" v-if="scoreCard" @click="$emit('close-score-card')">
      <view class="card" @click.stop>
        <view class="card-h">{{ scoreCard.className }} · {{ scoreCard.examName }}</view>
        <view class="card-stu">学生：{{ scoreCard.studentName }}<text v-if="scoreCard.rank" class="card-rank"> · 总分排名第 {{ scoreCard.rank }} 名</text></view>
        <view v-for="(row, i) in scoreCard.subjects" :key="i" class="card-row">
          <text class="c-subject">{{ row.subject }}</text>
          <text class="c-score">{{ row.score }}<text class="c-unit">分</text></text>
          <text class="c-full">满分 {{ row.fullScore }}</text>
          <text class="c-rank">第{{ row.rank }}/{{ row.totalCount }}名</text>
          <text class="c-avg">均分 {{ row.avg }}</text>
        </view>
        <view class="card-total" v-if="scoreCard.totalScore != null">
          总分：<text class="c-total-val">{{ scoreCard.totalScore }}</text> / {{ scoreCard.totalFull }}
        </view>
        <view class="card-btns">
          <button class="card-copy" @click="copyScoreCard">📋 复制成绩单</button>
          <button class="card-history" @click="goStudentGrades">📈 历次成绩</button>
          <button class="card-close" @click="$emit('close-score-card')">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { listGrades, getGrades } from '@/api/grades'

const props = defineProps({
  showAnalysis: { type: Boolean, default: false },
  examName: { type: String, default: '' },
  subject: { type: String, default: '' },
  examId: { type: String, default: '' },
  classId: { type: String, default: '' },
  existing: { type: Object, default: null },
  students: { type: Array, default: () => [] },
})

const emit = defineEmits(['close-analysis', 'close-score-card'])

/* ===== 成绩分析计算 ===== */
const analysis = computed(() => {
  const empty = { avg: '-', max: '-', min: '-', median: '-', passRate: 0, excellentRate: 0, segs: [], rank: [], dist: [], distMax: 1, count: 0 }
  if (!props.existing) return empty
  const all = (props.existing.scores || []).filter((x) => x.score != null)
  const sc = all.map((x) => Number(x.score))
  if (!sc.length) return empty
  const sorted = sc.slice().sort((a, b) => a - b)
  const avg = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)
  const max = sorted[sorted.length - 1]
  const min = sorted[0]
  const mid = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
  const fs1 = props.existing.fullScore || 100
  const passLine1 = fs1 * 0.6
  const excLine1 = fs1 * 0.85
  const pass = sc.filter((s) => s >= passLine1).length
  const excellent = sc.filter((s) => s >= excLine1).length
  const passRate = Math.round((pass / sc.length) * 100)
  const excellentRate = Math.round((excellent / sc.length) * 100)
  const segments = [
    { label: '<60', min: 0, max: 59.999 },
    { label: '60-69', min: 60, max: 69.999 },
    { label: '70-79', min: 70, max: 79.999 },
    { label: '80-89', min: 80, max: 89.999 },
    { label: '90-100', min: 90, max: 100 },
  ]
  const segs = segments.map((s) => {
    const c = sc.filter((x) => x >= s.min && x <= s.max).length
    return { label: s.label, count: c, pct: Math.round((c / sc.length) * 100) }
  })
  const bands = 10
  const distLabels = []
  for (let b = 0; b < bands; b++) {
    const lo = b * 10
    const hi = (b + 1) * 10
    distLabels.push(b === bands - 1 ? `${lo}-${hi}` : `${lo}-${hi - 1}`)
  }
  const dist = new Array(bands).fill(0)
  sc.forEach((n) => {
    let idx = Math.floor(n / 10)
    if (idx < 0) idx = 0
    if (idx > bands - 1) idx = bands - 1
    dist[idx]++
  })
  const distMax = Math.max.apply(null, dist.concat([1]))
  const distWithMeta = dist.map((c, i) => ({
    label: distLabels[i],
    count: c,
    pct: Math.round((c / sc.length) * 100),
    colorIdx: i < 6 ? 0 : i === 6 ? 1 : i < 9 ? 2 : 3,
    heightPct: Math.round((c / distMax) * 100),
  }))
  const nameMap = {}
  props.students.forEach((s) => (nameMap[s.id] = s.name))
  const rank = all
    .map((x) => ({ id: x.studentId, name: nameMap[x.studentId] || '—', score: x.score }))
    .sort((a, b) => b.score - a.score)
  return { avg, max, min, median: Number(mid), passRate, excellentRate, segs, rank, dist: distWithMeta, distMax, count: sc.length }
})

/* ===== 雷达图 ===== */
const RADAR_COLORS = ['#e6a23c', '#07c160', 'var(--c-blue)', '#e06c75', '#9b59b6', '#1abc9c', '#f39c12', '#34495e']

const grades = ref([])

const radarData = computed(() => {
  const result = { subjects: [], colors: RADAR_COLORS }
  if (!props.existing || !props.examName || !props.classId) return result
  const list = grades.value.filter(
    (g) => g.classId === props.classId && g.examName === props.examName,
  )
  list.forEach((g) => {
    const sc = (g.scores || []).map((x) => Number(x.score)).filter((n) => !isNaN(n))
    if (!sc.length) return
    const fs2 = g.fullScore || 100
    const passLine2 = fs2 * 0.6
    const excLine2 = fs2 * 0.85
    const pass = sc.filter((s) => s >= passLine2).length
    const excellent = sc.filter((s) => s >= excLine2).length
    result.subjects.push({
      name: g.subject || '—',
      avg: +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1),
      passRate: Math.round((pass / sc.length) * 100),
      excellentRate: Math.round((excellent / sc.length) * 100),
      max: sorted[sorted.length - 1],
      min: sorted[0],
    })
  })
  return result
})

// 加载成绩数据（用于雷达图）
watch(() => props.showAnalysis, async (v) => {
  if (v && props.classId) {
    try { grades.value = await getGrades() } catch {}
    nextTick(() => { setTimeout(renderRadar, 120) })
  }
})

function hexToRgba(hex, alpha) {
  const h = (hex || '#999').replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) || 0
  const g = parseInt(h.substring(2, 4), 16) || 0
  const b = parseInt(h.substring(4, 6), 16) || 0
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

function renderRadar() {
  const data = radarData.value
  if (!data.subjects || !data.subjects.length) return
  const ctx = uni.createCanvasContext('radarChart')
  const W = 300; const H = 300; const cx = W / 2; const cy = H / 2; const R = 100
  const dims = ['均分', '及格率', '优秀率', '最高', '最低']
  const n = dims.length
  ctx.setStrokeStyle('#dcdfe6'); ctx.setLineWidth(1)
  for (let k = 1; k <= 5; k++) {
    const r = (R * k) / 5
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + r * Math.cos(a); const y = cy + r * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath(); ctx.stroke()
  }
  ctx.setStrokeStyle('#e4e7ed')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke()
  }
  ctx.setFillStyle('#909399'); ctx.setFontSize(11); ctx.setTextAlign('center'); ctx.setTextBaseline('middle')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const lx = cx + (R + 18) * Math.cos(a); const ly = cy + (R + 18) * Math.sin(a)
    ctx.fillText(dims[i], lx, ly)
  }
  data.subjects.forEach((s, idx) => {
    const vals = [s.avg, s.passRate, s.excellentRate, s.max, s.min]
    const color = data.colors[idx % data.colors.length]
    ctx.setStrokeStyle(color); ctx.setFillStyle(hexToRgba(color, 0.15)); ctx.setLineWidth(2)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a); const y = cy + R * v * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.setFillStyle(color)
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a); const y = cy + R * v * Math.sin(a)
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill()
    }
  })
  ctx.draw()
}

/* ===== 成绩单 ===== */
const scoreCard = ref(null)

function showScoreCard(s, classes, exams, parentStudents, parentExamId, parentExamName) {
  const className = (classes.find((c) => c.id === props.classId) || {}).name || ''
  const allSubjects = grades.value.filter((g) => g.examName === parentExamName && g.classId === props.classId)
  let totalScore = 0; let totalFull = 0; let totalCount = 0
  const exam = exams.find((e) => e.id === parentExamId)
  const subjects = allSubjects.map((g) => {
    const sc = (g.scores || []).find((x) => x.studentId === s.id)
    const score = sc && sc.score != null ? Number(sc.score) : null
    const fullScore = g.fullScore || (exam && (exam.subjectFullScores || {})[g.subject]) || (exam && exam.fullScore) || 100
    if (score != null) { totalScore += score; totalFull += fullScore; totalCount++ }
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    const avg = allSc.length ? (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1) : '—'
    const ranked = allSc.slice().sort((a, b) => b - a)
    const rank = score != null ? ranked.indexOf(score) + 1 : '—'
    return { subject: g.subject, score: score != null ? Math.round(score * 10) / 10 : '—', fullScore, avg, rank, totalCount: allSc.length }
  })
  const allStudents = parentStudents.map((stu) => {
    let total = 0
    allSubjects.forEach((g) => {
      const sc = (g.scores || []).find((x) => x.studentId === stu.id)
      if (sc && sc.score != null) total += Number(sc.score)
    })
    return { id: stu.id, total: Math.round(total * 10) / 10 }
  }).sort((a, b) => b.total  - a.total)
  const rank = allStudents.findIndex((x) => x.id === s.id) + 1
  scoreCard.value = { className, examName: parentExamName, studentName: s.name, subjects, totalScore: Math.round(totalScore * 10) / 10, totalFull, rank, studentId: s.id }
}

function copyScoreCard() {
  const c = scoreCard.value
  if (!c) return
  const lines = c.subjects.map((r) => `  ${r.subject}：${r.score} 分（满分 ${r.fullScore}，${r.avg} 均分，第 ${r.rank}/${r.totalCount} 名）`)
  const text = `📚 ${c.className} · ${c.examName}\n学生：${c.studentName}${c.rank ? ' · 第' + c.rank + '名' : ''}\n${lines.join('\n')}\n总分：${c.totalScore} / ${c.totalFull}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '成绩单已复制', icon: 'success' }), fail: () => uni.showToast({ title: '复制失败', icon: 'none' }) })
}

function goStudentGrades() {
  const c = scoreCard.value
  if (!c || !c.studentId) return
  scoreCard.value = null
  uni.navigateTo({ url: '/pages/teaching/student-grades?studentId=' + encodeURIComponent(c.studentId) + '&classId=' + encodeURIComponent(props.classId || '') })
}

defineExpose({ showScoreCard })
</script>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { width: 640rpx; max-height: 86vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 32rpx; box-sizing: border-box; }
.m-h { font-size: 30rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 22rpx; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-bottom: 22rpx; }
.st { background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 6rpx; text-align: center; }
.st-n { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.st-l { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.dh { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin: 10rpx 0; }
.bar-chart { display: flex; align-items: flex-end; gap: 6rpx; height: 280rpx; padding: 12rpx 4rpx 0; margin-bottom: 14rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4rpx; }
.bar-num { font-size: 20rpx; color: var(--c-title); line-height: 1; }
.bar-track { width: 100%; flex: 1; display: flex; align-items: flex-end; min-height: 8rpx; }
.bar-fill { width: 100%; border-radius: 8rpx 8rpx 0 0; transition: height 0.3s; }
.bar-label { font-size: 18rpx; color: var(--c-sub); line-height: 1.2; white-space: nowrap; }
.bar-pct { font-size: 18rpx; color: var(--c-sub); opacity: 0.7; line-height: 1.2; }
.bar-c0 { background: linear-gradient(180deg, #ff8a8a 0%, #ffd1d1 100%); }
.bar-c1 { background: linear-gradient(180deg, #ffc14e 0%, #ffe7b3 100%); }
.bar-c2 { background: linear-gradient(180deg, #5ed8a6 0%, #b8f0d4 100%); }
.bar-c3 { background: linear-gradient(180deg, #5aa9ff 0%, #b8d9ff 100%); }
.dark .bar-num { color: var(--c-title); }
.dark .bar-label, .dark .bar-pct { color: var(--c-sub); }
.bar-legend { display: flex; flex-wrap: wrap; gap: 12rpx 18rpx; justify-content: center; margin-top: 10rpx; }
.lg-item { display: flex; align-items: center; gap: 6rpx; font-size: 20rpx; color: var(--c-sub); }
.lg-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
.rh { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin: 10rpx 0; }
.rk { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.rk-no { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--c-accent); color: #fff; text-align: center; line-height: 44rpx; font-size: 22rpx; flex-shrink: 0; }
.rk-n { flex: 1; font-size: 26rpx; color: var(--c-title); }
.rk-s { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.m-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 24rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.radar { margin-top: 22rpx; padding-top: 14rpx; border-top: 1px dashed var(--c-border); }
.radar-cv { width: 100%; height: 520rpx; margin: 0 auto; display: block; }
.radar-legend { display: flex; flex-wrap: wrap; gap: 10rpx 18rpx; justify-content: center; margin-top: 6rpx; }
.rl-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: var(--c-sub); }
.rl-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
.card { width: 86%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.card-h { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 6rpx; }
.card-stu { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; }
.card-rank { color: var(--c-accent); font-weight: 600; }
.card-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.c-subject { width: 100rpx; font-weight: 600; color: var(--c-title); }
.c-score { width: 80rpx; text-align: right; color: var(--c-primary); font-weight: 700; }
.c-unit { font-size: 20rpx; font-weight: 400; color: var(--c-sub); }
.c-full { width: 90rpx; text-align: center; color: var(--c-sub); }
.c-rank { width: 100rpx; text-align: center; color: var(--c-accent); font-weight: 600; }
.c-avg { width: 80rpx; text-align: right; color: var(--c-sub); }
.card-total { margin-top: 16rpx; font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.c-total-val { color: var(--c-primary); font-weight: 700; }
.card-btns { display: flex; gap: 16rpx; margin-top: 24rpx; }
.card-copy { flex: 1; background: var(--c-accent); color: #fff; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.card-history { flex: 1; background: var(--c-blue); color: #fff; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.card-close { flex: 1; background: #f0f0f0; color: #666; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
</style>
