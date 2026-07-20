<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="sel">
      <view class="field">
        <text class="label">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClass">
          <view class="picker">{{ classOpts[classIdx] || '请选择班级' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">考试</text>
        <picker :range="examOpts" :value="examIdx" @change="onExam">
          <view class="picker">{{ examOpts[examIdx] || '请选择考试' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">科目</text>
        <picker :range="subjectOpts" :value="subjectIdx" @change="onSubject">
          <view class="picker">{{ subjectOpts[subjectIdx] || '请选择科目' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">日期</text>
        <input v-model="date" placeholder="如 2026-05-12" />
      </view>
    </view>

    <view v-if="!classId" class="empty">请先选择班级</view>

    <block v-else>
      <view v-if="existing" class="exist">
        ✅ 已录入 {{ doneCount }} / {{ students.length }} 人（点击「保存」可更新）
        <text class="clear" @click="removeGrade">删除该成绩</text>
      </view>
      <view v-if="existing" class="exp-row">
        <text class="exp-csv" @click="exportCsv">📋 导出 CSV</text>
        <text class="exp-rank" @click="exportRank">🏆 导出名次表</text>
      </view>
      <view v-if="existing" class="oview">
        <view class="ov2"><text class="n">{{ analysis.avg }}</text><text class="l">平均分</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-primary)">{{ analysis.passRate }}%</text><text class="l">及格率</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-accent)">{{ analysis.excellentRate }}%</text><text class="l">优秀率</text></view>
        <view class="ov2"><text class="n">{{ analysis.max }}</text><text class="l">最高</text></view>
        <view class="ov2"><text class="n">{{ analysis.min }}</text><text class="l">最低</text></view>
      </view>
      <button v-if="existing" class="ana" @click="showAnalysis = true">📈 综合分析</button>

      <view class="list">
        <view v-for="s in students" :key="s.id" class="item">
          <text class="name">{{ s.name }}</text>
          <input
            class="score"
            type="digit"
            :value="scores[s.id] || ''"
            :placeholder="s.studentNo ? s.studentNo : '分数'"
            @input="(e) => (scores[s.id] = e.detail.value)"
          />
        </view>
        <view v-if="!students.length" class="empty">该班级还没有学生，请先在「学生管理」添加</view>
      </view>

      <button class="save" :disabled="saving" @click="saveManual">{{ saving ? '保存中…' : '💾 保存成绩' }}</button>
      <button class="imp" @click="showImport = !showImport">{{ showImport ? '收起导入' : '📥 批量导入成绩' }}</button>

      <view v-if="showImport" class="import-box">
        <view class="imp-tip">先选好上方「班级/考试/科目/日期」，再导入 Excel/TXT（列：学号或姓名, 分数）。</view>
        <button class="pick" @click="pickFile">📂 选择文件</button>

        <view v-if="preview" class="preview">
          <view class="pv-sum">
            校验：<text class="ok">有效 {{ preview.validCount }}</text> ·
            <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.total }} 行
          </view>
          <view v-if="preview.errorCount" class="pv-errs">
            <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
              {{ r.name || '(空)' }}：{{ r.error }}
            </view>
          </view>
          <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
        </view>
      </view>
    </block>

    <view v-if="showAnalysis" class="mask" @click="showAnalysis = false">
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
          <!-- 10 段垂直柱状图：对齐 web 端 GradeManage.vue 的分布柱状图 -->
          <view class="bar-chart">
            <view v-for="(d, i) in analysis.dist" :key="i" class="bar-col">
              <text class="bar-num">{{ d.count }}</text>
              <view class="bar-track">
                <view
                  class="bar-fill"
                  :class="'bar-c' + d.colorIdx"
                  :style="{ height: (d.heightPct || 4) + '%' }"
                ></view>
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

        <!-- P1-3: 各科对比雷达图（维度：均分/及格率/优秀率/最高/最低） -->
        <view class="radar" v-if="radarData.subjects.length">
          <view class="dh">📊 各科对比雷达图</view>
          <canvas canvas-id="radarChart" id="radarChart" class="radar-cv"></canvas>
          <view class="radar-legend">
            <view v-for="(s, i) in radarData.subjects" :key="s.name" class="rl-item">
              <view class="rl-c" :style="{ background: radarData.colors[i % radarData.colors.length] }"></view>
              <text>{{ s.name }}</text>
            </view>
          </view>
        </view>

        <view class="rank" v-if="analysis.rank.length">
          <view class="rh">名次（前 20）</view>
          <view v-for="(r, i) in analysis.rank.slice(0, 20)" :key="r.id" class="rk">
            <text class="rk-no">{{ i + 1 }}</text>
            <text class="rk-n">{{ r.name }}</text>
            <text class="rk-s">{{ r.score }}</text>
          </view>
        </view>

        <button class="m-close" @click="showAnalysis = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { isScore } from '../../common/validators'
import { copyText } from '../../common/print'

const classes = ref([])
const exams = ref([])
const students = ref([])
const pubSubjects = ref([])
const grades = ref([])

const classIdx = ref(-1)
const examIdx = ref(-1)
const subjectIdx = ref(-1)
const classId = ref('')
const examId = ref('')
const examName = ref('')
const subject = ref('')
const date = ref('')
const scores = reactive({})
const existing = ref(null)
const doneCount = ref(0)

const showImport = ref(false)
const preview = ref(null)
const showAnalysis = ref(false)
const saving = ref(false)

const analysis = computed(() => {
  const empty = { avg: '-', max: '-', min: '-', median: '-', passRate: 0, excellentRate: 0, segs: [], rank: [], dist: [], distMax: 1, count: 0 }
  if (!existing.value) return empty
  const all = (existing.value.scores || []).filter((x) => x.score != null)
  const sc = all.map((x) => Number(x.score))
  if (!sc.length) return empty
  const sorted = [...sc].sort((a, b) => a - b)
  const avg = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)
  const max = Math.max(...sc)
  const min = Math.min(...sc)
  const mid = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
  const pass = sc.filter((s) => s >= 60).length
  const excellent = sc.filter((s) => s >= 90).length
  const passRate = Math.round((pass / sc.length) * 100)
  const excellentRate = Math.round((excellent / sc.length) * 100)
  // 5 段汇总分布（兼容旧 UI：综合分析弹层下方的水平分布条）
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
  // 10 段细分分布（对齐 web 端 GradeManage.vue：每 10 分一段，垂直柱状图）
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
  const distMax = Math.max(...dist, 1)
  const distWithMeta = dist.map((c, i) => ({
    label: distLabels[i],
    count: c,
    pct: Math.round((c / sc.length) * 100),
    // 4 色梯度：极低(红)/待提高(黄)/中等(绿)/优秀(蓝)
    colorIdx: i < 6 ? 0 : i === 6 ? 1 : i < 9 ? 2 : 3,
    heightPct: Math.round((c / distMax) * 100),
  }))
  const nameMap = {}
  students.value.forEach((s) => (nameMap[s.id] = s.name))
  const rank = all
    .map((x) => ({ id: x.studentId, name: nameMap[x.studentId] || '—', score: x.score }))
    .sort((a, b) => b.score - a.score)
  return { avg, max, min, median: Number(mid), passRate, excellentRate, segs, rank, dist: distWithMeta, distMax, count: sc.length }
})

// P1-3: 各科雷达图数据 - 取当前班级、当前考试所有已录入成绩的科目，每科 5 维
const RADAR_COLORS = ['#e6a23c', '#07c160', '#409eff', '#e06c75', '#9b59b6', '#1abc9c', '#f39c12', '#34495e']
const radarData = computed(() => {
  const result = { subjects: [], colors: RADAR_COLORS }
  if (!existing.value || !examName.value || !classId.value) return result
  const list = grades.value.filter(
    (g) => g.classId === classId.value && g.examName === examName.value,
  )
  list.forEach((g) => {
    const sc = (g.scores || []).map((x) => Number(x.score)).filter((n) => !isNaN(n))
    if (!sc.length) return
    const pass = sc.filter((s) => s >= 60).length
    const excellent = sc.filter((s) => s >= 90).length
    result.subjects.push({
      name: g.subject || '—',
      avg: +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1),
      passRate: Math.round((pass / sc.length) * 100),
      excellentRate: Math.round((excellent / sc.length) * 100),
      max: Math.max(...sc),
      min: Math.min(...sc),
    })
  })
  return result
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
  if (!data.subjects.length) return
  const ctx = uni.createCanvasContext('radarChart')
  const W = 300
  const H = 300
  const cx = W / 2
  const cy = H / 2
  const R = 100
  const dims = ['均分', '及格率', '优秀率', '最高', '最低']
  const n = dims.length
  // 网格 5 圈
  ctx.setStrokeStyle('#dcdfe6')
  ctx.setLineWidth(1)
  for (let k = 1; k <= 5; k++) {
    const r = (R * k) / 5
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  // 轴线
  ctx.setStrokeStyle('#e4e7ed')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a))
    ctx.stroke()
  }
  // 维度标签
  ctx.setFillStyle('#909399')
  ctx.setFontSize(11)
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const lx = cx + (R + 18) * Math.cos(a)
    const ly = cy + (R + 18) * Math.sin(a)
    ctx.fillText(dims[i], lx, ly)
  }
  // 数据多边形
  data.subjects.forEach((s, idx) => {
    const vals = [s.avg, s.passRate, s.excellentRate, s.max, s.min]
    const color = data.colors[idx % data.colors.length]
    ctx.setStrokeStyle(color)
    ctx.setFillStyle(hexToRgba(color, 0.15))
    ctx.setLineWidth(2)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a)
      const y = cy + R * v * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // 顶点
    ctx.setFillStyle(color)
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a)
      const y = cy + R * v * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }
  })
  ctx.draw()
}

watch(showAnalysis, (v) => {
  if (v) {
    nextTick(() => {
      setTimeout(renderRadar, 120)
    })
  }
})

const classOpts = ref([])
const examOpts = ref([])
const subjectOpts = ref([])

async function load() {
  const [cs, es, pub, gs] = await Promise.all([
    api.getList('/classes', { silent: true }),
    api.getList('/exams', { silent: true }),
    api.get('/config/public'),
    api.getList('/grades', { loading: true, loadingText: '加载成绩' }),
  ])
  classes.value = cs
  exams.value = es
  pubSubjects.value = (pub && pub.defaultSubjects) || []
  grades.value = gs
  classOpts.value = cs.map((c) => c.name)
  rebuildExamOpts()
}

onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function rebuildExamOpts() {
  examOpts.value = exams.value
    .filter((e) => !classId.value || e.classId === classId.value)
    .map((e) => e.name + (e.subjects && e.subjects.length ? `（${e.subjects.join('/')}）` : ''))
}

async function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id
  examIdx.value = -1
  examId.value = ''
  examName.value = ''
  subjectIdx.value = -1
  subject.value = ''
  existing.value = null
  rebuildExamOpts()
  await loadStudents()
  await checkExisting()
}

async function onExam(e) {
  examIdx.value = +e.detail.value
  const list = exams.value.filter((x) => x.classId === classId.value)
  const chosen = list[examIdx.value]
  examId.value = chosen.id
  examName.value = chosen.name
  subjectOpts.value = chosen.subjects && chosen.subjects.length ? chosen.subjects : pubSubjects.value
  subjectIdx.value = subjectOpts.value.length ? 0 : -1
  subject.value = subjectOpts.value[0] || ''
  date.value = chosen.date || date.value
  await checkExisting()
}

function onSubject(e) {
  subjectIdx.value = +e.detail.value
  subject.value = subjectOpts.value[subjectIdx.value]
  checkExisting()
}

async function loadStudents() {
  // 服务端按 classId 过滤，避免拉全量再前端 filter
  students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
}

function checkExisting() {
  if (!classId.value || !examName.value || !subject.value) {
    existing.value = null
    return
  }
  const rec = grades.value.find(
    (g) => g.classId === classId.value && g.examName === examName.value && g.subject === subject.value,
  )
  existing.value = rec || null
  // 预填分数
  for (const k in scores) delete scores[k]
  doneCount.value = 0
  if (rec) {
    const map = {}
    ;(rec.scores || []).forEach((x) => (map[x.studentId] = x.score))
    students.value.forEach((s) => {
      scores[s.id] = map[s.id] != null ? String(map[s.id]) : ''
    })
    doneCount.value = (rec.scores || []).filter((x) => x.score != null).length
  }
}

async function saveManual() {
  if (saving.value) return
  if (!classId.value || !examName.value || !subject.value)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  if (!date.value) return uni.showToast({ title: '请填写日期', icon: 'none' })
  const sc = []
  students.value.forEach((s) => {
    const v = (scores[s.id] || '').trim()
    if (v !== '') {
      const n = Number(v)
      if (isNaN(n)) return uni.showToast({ title: `${s.name} 分数不是数字`, icon: 'none' })
      if (!isScore(n, 100)) return uni.showToast({ title: `${s.name} 分数应为 0-100`, icon: 'none' })
      sc.push({ studentId: s.id, score: n })
    }
  })
  if (!sc.length) return uni.showToast({ title: '请至少录入一个分数', icon: 'none' })
  saving.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    const r = await api.post('/grades/merge', {
      classId: classId.value,
      examName: examName.value,
      examId: examId.value,
      subject: subject.value,
      date: date.value,
      scores: sc,
    })
    uni.showToast({ title: r.created ? '成绩已创建' : '成绩已更新', icon: 'success' })
    grades.value = await api.get('/grades')
    checkExisting()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    saving.value = false
    uni.hideLoading()
  }
}

async function removeGrade() {
  if (!existing.value) return
  uni.showModal({
    title: '删除成绩',
    content: `确定删除「${examName.value}·${subject.value}」的成绩记录吗？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…' })
      try {
        await api.del('/grades/' + existing.value.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        grades.value = await api.get('/grades')
        existing.value = null
        for (const k in scores) delete scores[k]
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

// 导出 CSV：含学号、姓名、性别、班级、考试、科目、日期、分数
function exportCsv() {
  if (!existing.value || !students.value.length) {
    return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  }
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const head = '学号,姓名,性别,班级,考试,科目,日期,分数'
  const body = students.value
    .map((s) => {
      const sc = scoreMap[s.id]
      return [s.studentNo || '', s.name, s.gender || '', className, examName.value, subject.value, date.value, sc != null ? sc : '']
        .map((x) => '"' + String(x).replace(/"/g, '""') + '"')
        .join(',')
    })
    .join('\n')
  copyText('\uFEFF' + head + '\n' + body)
}

// 导出名次表：按分数倒序，附名次、平均/及格率等统计
function exportRank() {
  if (!existing.value || !students.value.length) {
    return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  }
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const rows = students.value
    .map((s) => ({ name: s.name, studentNo: s.studentNo || '', score: scoreMap[s.id] }))
    .filter((r) => r.score != null)
    .sort((a, b) => b.score - a.score)
  if (!rows.length) return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  const a = analysis.value
  const lines = []
  lines.push(`班级：${className}`)
  lines.push(`考试：${examName.value}  科目：${subject.value}  日期：${date.value}`)
  lines.push(`应考 ${students.value.length} 人 · 实考 ${rows.length} 人 · 平均 ${a.avg} · 最高 ${a.max} · 最低 ${a.min} · 及格率 ${a.passRate}% · 优秀率 ${a.excellentRate}%`)
  lines.push('')
  lines.push('名次,姓名,学号,分数')
  rows.forEach((r, i) => {
    lines.push(`${i + 1},"${r.name}","${r.studentNo}",${r.score}`)
  })
  copyText('\uFEFF' + lines.join('\n'))
}

function pickFile() {
  if (!classId.value || !examName.value || !subject.value)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const r = await api.post('/grades/import-preview', { classId: classId.value, filename: f.name, data })
        preview.value = r
        if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {},
  })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function commit() {
  const rows = preview.value.rows.filter((r) => r.valid && r.studentId)
  if (!rows.length) return
  for (const r of rows) {
    if (!isScore(r.score, 100)) return uni.showToast({ title: `${r.name || ''} 分数应为 0-100`, icon: 'none' })
  }
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await api.post('/grades/import-commit', {
      classId: classId.value,
      examName: examName.value,
      examId: examId.value,
      subject: subject.value,
      date: date.value,
      rows,
    })
    uni.showToast({ title: `成功导入 ${r.count} 条成绩`, icon: 'success' })
    preview.value = null
    showImport.value = false
    grades.value = await api.get('/grades')
    checkExisting()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.sel { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.picker, .sel input {
  border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: var(--c-title); min-height: 80rpx; line-height: 44rpx;
  box-sizing: border-box; background: var(--c-input);
}
.exist { background: rgba(7,193,96,0.12); color: var(--c-primary); font-size: 26rpx; padding: 18rpx 24rpx; border-radius: 14rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.clear { color: var(--c-danger); font-size: 24rpx; }
.exp-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.exp-csv, .exp-rank { flex: 1; text-align: center; font-size: 26rpx; padding: 16rpx 0; border-radius: 14rpx; background: var(--c-card2); color: var(--c-accent); border: 1px solid var(--c-border); }
.exp-csv:active, .exp-rank:active { opacity: 0.6; }
.item { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 26rpx; margin-bottom: 14rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.name { font-size: 30rpx; color: var(--c-title); }
.score { width: 220rpx; height: 80rpx; min-height: 80rpx; line-height: 44rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; text-align: center; font-size: 28rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.imp { background: #409eff; color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.import-box { margin-top: 16rpx; background: var(--c-card2); border-radius: 20rpx; padding: 24rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 14rpx; }
.pick { background: #409eff; color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.preview { margin-top: 14rpx; border-top: 1px dashed var(--c-border); padding-top: 14rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 8rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.confirm { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.confirm[disabled] { opacity: 0.5; }
.ana { background: var(--c-accent); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.oview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10rpx; margin-bottom: 16rpx; }
.ov2 { background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 4rpx; text-align: center; }
.ov2 .n { display: block; font-size: 30rpx; font-weight: 800; color: var(--c-accent); }
.ov2 .l { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { width: 640rpx; max-height: 86vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 32rpx; box-sizing: border-box; }
.m-h { font-size: 30rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 22rpx; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-bottom: 22rpx; }
.st { background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 6rpx; text-align: center; }
.st-n { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.st-l { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.dh, .rh { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin: 10rpx 0; }
.seg-row { display: flex; align-items: center; gap: 14rpx; margin-bottom: 12rpx; }
.seg-l { width: 100rpx; font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.seg-bar { flex: 1; height: 20rpx; background: var(--c-card2); border-radius: 10rpx; overflow: hidden; }
.seg-fill { height: 100%; background: linear-gradient(90deg,#e6a23c,#07c160); border-radius: 10rpx; }
.seg-c { width: 80rpx; text-align: right; font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; }
/* 10 段垂直柱状图 */
.bar-chart { display: flex; align-items: flex-end; gap: 6rpx; height: 280rpx; padding: 12rpx 4rpx 0; margin-bottom: 14rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4rpx; }
.bar-num { font-size: 20rpx; color: var(--c-title); line-height: 1; }
.bar-track { width: 100%; flex: 1; display: flex; align-items: flex-end; min-height: 8rpx; }
.bar-fill { width: 100%; border-radius: 8rpx 8rpx 0 0; transition: height 0.3s; }
.bar-label { font-size: 18rpx; color: var(--c-sub); line-height: 1.2; white-space: nowrap; }
.bar-pct { font-size: 18rpx; color: var(--c-sub); opacity: 0.7; line-height: 1.2; }
/* 4 色梯度 */
.bar-c0 { background: linear-gradient(180deg, #ff8a8a 0%, #ffd1d1 100%); }
.bar-c1 { background: linear-gradient(180deg, #ffc14e 0%, #ffe7b3 100%); }
.bar-c2 { background: linear-gradient(180deg, #5ed8a6 0%, #b8f0d4 100%); }
.bar-c3 { background: linear-gradient(180deg, #5aa9ff 0%, #b8d9ff 100%); }
.dark .bar-num { color: var(--c-title); }
.dark .bar-label, .dark .bar-pct { color: var(--c-sub); }
.bar-legend { display: flex; flex-wrap: wrap; gap: 12rpx 18rpx; justify-content: center; margin-top: 10rpx; }
.lg-item { display: flex; align-items: center; gap: 6rpx; font-size: 20rpx; color: var(--c-sub); }
.lg-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
.rk { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.rk-no { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--c-accent); color: #fff; text-align: center; line-height: 44rpx; font-size: 22rpx; flex-shrink: 0; }
.rk-n { flex: 1; font-size: 26rpx; color: var(--c-title); }
.rk-s { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.m-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 24rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
/* P1-3: 各科雷达图 */
.radar { margin-top: 22rpx; padding-top: 14rpx; border-top: 1px dashed var(--c-border); }
.radar-cv { width: 600rpx; height: 600rpx; margin: 0 auto; display: block; }
.radar-legend { display: flex; flex-wrap: wrap; gap: 10rpx 18rpx; justify-content: center; margin-top: 6rpx; }
.rl-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: var(--c-sub); }
.rl-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
</style>
