<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 头部：考试名称 + 班级 + 日期 -->
    <view class="hd">
      <view class="hd-name">{{ exam?.name || '考试详情' }}</view>
      <view class="hd-meta">
        {{ className }} · {{ exam?.date || '-' }}<text v-if="exam?.term"> · {{ exam.term }}</text>
      </view>
      <view v-if="classId && examId" class="hd-actions">
        <view class="btn-sm mint" @click="goCompare">对比其他考试</view>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中…</view>

    <template v-else>
      <!-- 统计卡片 2x3 网格 -->
      <view class="grid">
        <view class="stat">
          <text class="st-label">班级均分</text>
          <text class="st-val">{{ fmt1(analysis?.classAvg) }}</text>
        </view>
        <view class="stat">
          <text class="st-label">参考人数</text>
          <text class="st-val">{{ analysis?.totalStudents ?? 0 }}</text>
        </view>
        <view class="stat">
          <text class="st-label">及格率</text>
          <text class="st-val">{{ pct(avgPassRate) }}</text>
        </view>
        <view class="stat">
          <text class="st-label">优秀率</text>
          <text class="st-val">{{ pct(avgExcellentRate) }}</text>
        </view>
        <view class="stat">
          <text class="st-label">优势学科</text>
          <view class="st-tags">
            <text v-if="!strongNames.length" class="st-none">-</text>
            <text v-for="s in strongNames" :key="'s' + s" class="tag strong">{{ s }}</text>
          </view>
        </view>
        <view class="stat">
          <text class="st-label">薄弱学科</text>
          <view class="st-tags">
            <text v-if="!weakNames.length" class="st-none">-</text>
            <text v-for="s in weakNames" :key="'w' + s" class="tag weak">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 各科统计列表 -->
      <view class="sec-title">📊 各科统计</view>
      <view v-if="!subjects.length" class="empty">暂无数据</view>
      <view v-else class="list">
        <view v-for="s in subjects" :key="s.subject" class="item">
          <view class="it-top">
            <text class="name">{{ s.subject }}</text>
            <text class="avg">均分 {{ fmt1(s.avg) }}</text>
          </view>
          <view class="it-row">
            <view class="cell"><text class="cl">最高</text><text class="cv max">{{ fmt1(s.max) }}</text></view>
            <view class="cell"><text class="cl">最低</text><text class="cv min">{{ fmt1(s.min) }}</text></view>
            <view class="cell"><text class="cl">及格率</text><text class="cv">{{ pct(s.passRate) }}</text></view>
            <view class="cell"><text class="cl">优秀率</text><text class="cv">{{ pct(s.excellentRate) }}</text></view>
          </view>
        </view>
      </view>

      <!-- 分数分布（view 柱状图） -->
      <view class="sec-title">📈 分数分布</view>
      <picker v-if="subjectNames.length" :range="subjectNames" :value="distIdx" @change="onDistChange">
        <view class="picker">科目：{{ distSubject || '请选择' }}</view>
      </picker>
      <view v-if="!subjectNames.length" class="empty">暂无数据</view>
      <view v-else-if="!distBars.length" class="empty">暂无数据</view>
      <view v-else class="chart item">
        <view class="bars">
          <view class="bar-col" v-for="(b, i) in distBars" :key="i">
            <text class="bv">{{ b.value }}</text>
            <view class="bar" :style="{ height: b.h + 'rpx' }"></view>
            <text class="bx">{{ b.label }}</text>
          </view>
        </view>
      </view>

      <!-- 排名表 -->
      <view class="sec-title">
        🏆 成绩排名<text v-if="ranks.length" class="sec-sub">共 {{ ranks.length }} 人</text>
      </view>
      <view v-if="!ranks.length" class="empty">暂无数据</view>
      <view v-else class="tbl item">
        <view class="tr th">
          <text class="td rk">排名</text>
          <text class="td nm">姓名</text>
          <text class="td sc">分数</text>
          <text class="td pc">百分位</text>
        </view>
        <view
          class="tr"
          v-for="(r, i) in ranks"
          :key="(r.studentId || '') + (r.subject || '') + i"
          :class="rankClass(r.rank)"
        >
          <text class="td rk">{{ r.rank }}</text>
          <text class="td nm" @click="goStudentGrades(r.studentId)">{{ r.studentName || '—' }}</text>
          <text class="td sc">{{ fmt1(r.score) }}</text>
          <text class="td pc">{{ pctNum(r.percentile) }}</text>
        </view>
      </view>

      <!-- 前5名 / 后5名 -->
      <view class="dual">
        <view class="item mini">
          <view class="mini-t">🏆 前 5 名</view>
          <view v-if="!top5.length" class="empty sm">暂无数据</view>
          <view v-else class="mini-list">
            <view class="mini-row" v-for="(r, i) in top5" :key="'t' + i">
              <text class="mini-rk" :class="rankClass(r.rank)">{{ r.rank }}</text>
              <text class="mini-nm" @click="goStudentGrades(r.studentId)">{{ r.studentName || '—' }}</text>
              <text class="mini-sc">{{ fmt1(r.score) }}</text>
            </view>
          </view>
        </view>
        <view class="item mini">
          <view class="mini-t">⚠️ 后 5 名</view>
          <view v-if="!bottom5.length" class="empty sm">暂无数据</view>
          <view v-else class="mini-list">
            <view class="mini-row" v-for="(r, i) in bottom5" :key="'b' + i">
              <text class="mini-rk">{{ r.rank }}</text>
              <text class="mini-nm" @click="goStudentGrades(r.studentId)">{{ r.studentName || '—' }}</text>
              <text class="mini-sc low">{{ fmt1(r.score) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 薄弱学生预警 -->
      <view class="sec-title">⚠️ 薄弱学生预警<text v-if="weakStudents.length" class="sec-sub">共 {{ weakStudents.length }} 人</text></view>
      <view v-if="!weakStudents.length" class="empty sm">暂无薄弱学生数据</view>
      <view v-else class="tbl item">
        <view class="tr th">
          <text class="td nm">姓名</text>
          <text class="td sc">薄弱科目</text>
          <text class="td sc">该科分数</text>
          <text class="td pc">班级均分</text>
        </view>
        <view class="tr" v-for="(w, i) in weakStudents" :key="'w' + i">
          <text class="td nm" @click="goStudentGrades(w.studentId || w.id)">{{ w.studentName || w.name || '—' }}</text>
          <text class="td sc">
            <text v-if="w.weakSubjects?.length" v-for="s in w.weakSubjects" :key="s" class="tag weak">{{ s }}</text>
            <text v-else>-</text>
          </text>
          <text class="td sc" style="color:#e64340">{{ fmt1(w.score || w.subjectScore) }}</text>
          <text class="td pc">{{ fmt1(w.classAvg || w.subjectAvg) }}</text>
        </view>
      </view>

      <!-- 教师评析 -->
      <view class="sec-title">📝 教师评析</view>
      <view v-if="exam?.analysisNote" class="item note">{{ exam.analysisNote }}</view>
      <view v-else class="empty sm">暂无评析</view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { getExam, listClasses, getGradesAnalysisExam, getGradesAnalysisRank } from '@/api/teaching'
import { getWeakStudents } from '@/api/grades'
import { theme } from '../../common/store'
import { fmt1, pct, pctNum } from '@gardener/shared/utils/format'
import { normalizeDistribution, toSubjectNames } from '@gardener/shared/utils/score'

const examId = ref('')
const classId = ref('')
const loading = ref(false)
const exam = ref(null)
const analysis = ref(null)
const ranks = ref([])
const weakStudents = ref([])
const classes = ref([])
const distSubject = ref('')

const subjects = computed(() => analysis.value?.subjects || [])
const subjectNames = computed(() => subjects.value.map((s) => s.subject))
const distIdx = computed(() => {
  const i = subjectNames.value.indexOf(distSubject.value)
  return i >= 0 ? i : 0
})

const className = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c?.name || classId.value || '-'
})

// weakSubjects / strongSubjects 兼容字符串数组与对象数组两种形式（复用 shared toSubjectNames）
const strongNames = computed(() => toSubjectNames(analysis.value?.strongSubjects))
const weakNames = computed(() => toSubjectNames(analysis.value?.weakSubjects))

const avgPassRate = computed(() => {
  const s = subjects.value
  if (!s.length) return 0
  return s.reduce((a, b) => a + (Number(b.passRate) || 0), 0) / s.length
})
const avgExcellentRate = computed(() => {
  const s = subjects.value
  if (!s.length) return 0
  return s.reduce((a, b) => a + (Number(b.excellentRate) || 0), 0) / s.length
})

/* ============ 格式化 / 分布归一化（复用 shared） ============ */
const curDist = computed(() => {
  const subj = subjects.value.find((s) => s.subject === distSubject.value)
  return normalizeDistribution(subj?.distribution)
})

const distBars = computed(() => {
  const data = curDist.value
  if (!data.length) return []
  const max = Math.max(1, ...data.map((d) => d.value))
  const MAX_H = 260
  return data.map((d) => ({
    label: d.label,
    value: d.value,
    h: Math.max(d.value > 0 ? 10 : 4, Math.round((d.value / max) * MAX_H)),
  }))
})

/* ============ 排名 ============ */
const top5 = computed(() => [...ranks.value].sort((a, b) => a.rank - b.rank).slice(0, 5))
const bottom5 = computed(() => [...ranks.value].sort((a, b) => b.rank - a.rank).slice(0, 5))

function rankClass(rank) {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  return ''
}

function goStudentGrades(studentId) {
  if (!classId.value) return
  uni.navigateTo({ url: '/pages/teaching/student-grades?studentId=' + encodeURIComponent(studentId) + '&classId=' + encodeURIComponent(classId.value) })
}

function goCompare() {
  if (!classId.value || !examId.value) return
  uni.navigateTo({ url: '/pages/teaching/exam-compare?classId=' + encodeURIComponent(classId.value) + '&examId=' + encodeURIComponent(examId.value) })
}

function onDistChange(e) {
  distSubject.value = subjectNames.value[e.detail.value] || ''
}

/* ============ 数据加载 ============ */
async function load() {
  if (!examId.value) { loading.value = false; return }
  loading.value = true
  try {
    // 若未传 classId，先取考试信息回填
    if (!classId.value) {
      const ex = await getExam(examId.value).catch(() => null)
      exam.value = ex
      if (ex?.classId) classId.value = ex.classId
    }

    const tasks = [
      getExam(examId.value).catch(() => null),
      listClasses().catch(() => []),
    ]
    if (classId.value) {
      tasks.push(
        getGradesAnalysisExam(classId.value, examId.value).catch(() => null),
      )
      tasks.push(
        getGradesAnalysisRank(classId.value, examId.value).catch(() => null),
      )
    } else {
      tasks.push(Promise.resolve(null))
      tasks.push(Promise.resolve(null))
    }

    const [ex, cls, an, rk] = await Promise.all(tasks)
    exam.value = ex
    analysis.value = an
    ranks.value = (rk && rk.ranks) || []
    classes.value = Array.isArray(cls) ? cls : cls?.items || []

    if (!distSubject.value && subjectNames.value.length) {
      distSubject.value = subjectNames.value[0]
    }

    // 薄弱学生
    if (classId.value && examId.value) {
      getWeakStudents(classId.value, examId.value)
        .then((r) => { weakStudents.value = (r && r.weakList) || [] })
        .catch(() => { weakStudents.value = [] })
    }
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  examId.value = options?.examId || ''
  classId.value = options?.classId || ''
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.loading, .empty { text-align: center; padding: 60rpx 0; font-size: 28rpx; color: var(--c-sub); }
.empty.sm { padding: 30rpx 0; font-size: 24rpx; }

/* 头部 */
.hd { background: var(--c-card); border-radius: 20rpx; padding: 28rpx 30rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.hd-name { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.hd-meta { font-size: 26rpx; color: var(--c-sub); margin-top: 10rpx; }
.hd-actions { display: flex; gap: 12rpx; margin-top: 16rpx; }
.btn-sm { font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 12rpx; background: rgba(103,194,58,0.12); color: #67c23a; }
.btn-sm.mint { background: rgba(103,194,58,0.12); color: #67c23a; }

/* 统计卡片 2x3 */
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 20rpx; }
.stat { width: calc(50% - 8rpx); background: var(--c-card); border-radius: 16rpx; padding: 22rpx; box-sizing: border-box; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.st-label { font-size: 24rpx; color: var(--c-sub); }
.st-val { display: block; font-size: 38rpx; font-weight: 800; color: var(--c-accent); margin-top: 8rpx; }
.st-tags { margin-top: 10rpx; display: flex; flex-wrap: wrap; gap: 8rpx; align-items: center; }
.st-none { font-size: 30rpx; color: var(--c-sub); }
.tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.tag.strong { background: rgba(245,179,66, 0.14); color: var(--c-primary); }
.tag.weak { background: rgba(230, 67, 64, 0.12); color: #e64340; }

/* 区块标题 */
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 10rpx 0 16rpx; }
.sec-sub { font-size: 22rpx; color: var(--c-sub); font-weight: 400; margin-left: 10rpx; }

/* 通用卡片 */
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }

/* 各科统计 */
.it-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.avg { font-size: 26rpx; color: var(--c-accent); font-weight: 600; }
.it-row { display: flex; margin-top: 14rpx; }
.cell { flex: 1; min-width: 0; }
.cl { display: block; font-size: 22rpx; color: var(--c-sub); }
.cv { display: block; font-size: 28rpx; font-weight: 600; color: var(--c-title); margin-top: 4rpx; }
.cv.max { color: var(--c-primary); }
.cv.min { color: #e64340; }

/* picker */
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); margin-bottom: 16rpx; }

/* 分数分布柱状图（view 绘制） */
.chart { }
.bars { display: flex; align-items: flex-end; gap: 12rpx; height: 320rpx; padding: 10rpx 4rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; min-width: 0; }
.bar { width: 70%; border-radius: 8rpx 8rpx 0 0; min-height: 4rpx; background: var(--c-accent); }
.bv { font-size: 22rpx; color: var(--c-title); margin-bottom: 6rpx; }
.bx { font-size: 18rpx; color: var(--c-sub); margin-top: 8rpx; text-align: center; line-height: 1.3; max-width: 130rpx; word-break: break-all; }

/* 排名表 */
.tbl { padding: 6rpx 20rpx; }
.tr { display: flex; padding: 16rpx 0; border-bottom: 1px solid var(--c-input-border); align-items: center; }
.tr.th { color: var(--c-sub); font-weight: 700; font-size: 24rpx; border-bottom: 2rpx solid var(--c-accent); }
.tr:last-child { border-bottom: none; }
.td { font-size: 26rpx; color: var(--c-title); }
.td.rk { width: 90rpx; text-align: center; }
.td.nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td.sc { width: 120rpx; text-align: right; color: var(--c-accent); font-weight: 600; }
.td.pc { width: 120rpx; text-align: right; color: var(--c-sub); }
.tr.r1 .td.rk { color: #e6a23c; font-weight: 800; font-size: 30rpx; }
.tr.r2 .td.rk { color: #9a9a9a; font-weight: 800; font-size: 30rpx; }
.tr.r3 .td.rk { color: #cd7f32; font-weight: 700; font-size: 28rpx; }
.tr.r1 .td.nm { font-weight: 700; }

/* 前5 / 后5 */
.dual { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.mini { flex: 1; padding: 20rpx; min-width: 0; }
.mini-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.mini-list { }
.mini-row { display: flex; align-items: center; padding: 10rpx 0; border-bottom: 1px solid var(--c-input-border); }
.mini-row:last-child { border-bottom: none; }
.mini-rk { width: 60rpx; text-align: center; font-size: 24rpx; color: var(--c-sub); }
.mini-nm { flex: 1; font-size: 26rpx; color: var(--c-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-sc { width: 90rpx; text-align: right; font-size: 26rpx; font-weight: 600; color: var(--c-accent); }
.mini-sc.low { color: #e64340; }
.mini-rk.r1 { color: #e6a23c; font-weight: 800; }
.mini-rk.r2 { color: #9a9a9a; font-weight: 800; }
.mini-rk.r3 { color: #cd7f32; font-weight: 700; }

/* 教师评析 */
.note { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); font-size: 28rpx; color: var(--c-title); line-height: 1.6; white-space: pre-wrap; }
</style>
