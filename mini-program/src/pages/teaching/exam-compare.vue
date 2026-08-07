<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="header">
      <view class="title">📊 考试进退步对比</view>
      <view class="sub">选择两次考试，对比学生总分变化</view>
    </view>

    <view class="sel">
      <view class="field">
        <text class="label">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClass">
          <view class="picker">{{ classOpts[classIdx] || '请选择班级' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">考试 A（基准）</text>
        <picker :range="examOpts" :value="examAIdx" @change="onExamA">
          <view class="picker">{{ examOpts[examAIdx] || '请选择考试' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">考试 B（对比）</text>
        <picker :range="examOpts" :value="examBIdx" @change="onExamB">
          <view class="picker">{{ examOpts[examBIdx] || '请选择考试' }}</view>
        </picker>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="!classId" class="empty">请先选择班级</view>
    <view v-else-if="!examAId || !examBId" class="empty">请选择两次考试</view>
    <view v-else-if="!comparison.length" class="empty">暂无对比数据</view>
    <view v-else class="list">
      <view class="card" v-for="r in comparison" :key="r.studentId">
        <view class="row name-row" @click="goGrades(r.studentId)">
          <text class="name">{{ r.name }}</text>
          <text class="arrow">→</text>
        </view>
        <view class="row">
          <text class="lbl">考试 A</text>
          <text class="val">{{ r.scoreA }}分 · 第{{ r.rankA }}名</text>
        </view>
        <view class="row">
          <text class="lbl">考试 B</text>
          <text class="val">{{ r.scoreB }}分 · 第{{ r.rankB }}名</text>
        </view>
        <view class="row delta">
          <text class="lbl">变化</text>
          <text class="val" :class="r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : 'same'">
            <text v-if="r.delta > 0">↑</text><text v-else-if="r.delta < 0">↓</text><text v-else>→</text>
            {{ r.delta > 0 ? '+' : '' }}{{ r.delta.toFixed(1) }}分
            <text class="rank-delta" :class="r.rankDelta > 0 ? 'up' : r.rankDelta < 0 ? 'down' : 'same'">
              <text v-if="r.rankDelta > 0">↑</text><text v-else-if="r.rankDelta < 0">↓</text><text v-else>→</text>
              {{ r.rankDelta > 0 ? '+' : '' }}{{ r.rankDelta }}名
            </text>
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { auth, theme } from '../../common/store'
import { listClasses, listExams, getGradesAnalysisRank } from '@/api/teaching'

const classes = ref([])
const exams = ref([])
const classId = ref('')
const examAId = ref('')
const examBId = ref('')
const classIdx = ref(-1)
const examAIdx = ref(-1)
const examBIdx = ref(-1)
const loading = ref(false)
const comparison = ref([])

const classOpts = computed(() => classes.value.map(c => c.name))
const examOpts = computed(() => {
  if (!classId.value) return exams.value.map(e => e.name + '（' + e.date + '）')
  return exams.value.filter(e => e.classId === classId.value).map(e => e.name + '（' + e.date + '）')
})

async function loadClasses() {
  classes.value = await listClasses()
}
async function loadExams() {
  exams.value = await listExams()
}

function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id
  examAId.value = ''
  examBId.value = ''
  examAIdx.value = -1
  examBIdx.value = -1
  comparison.value = []
}
function onExamA(e) {
  examAIdx.value = +e.detail.value
  const list = exams.value.filter(x => !classId.value || x.classId === classId.value)
  examAId.value = list[examAIdx.value]?.id || ''
  runCompare()
}
function onExamB(e) {
  examBIdx.value = +e.detail.value
  const list = exams.value.filter(x => !classId.value || x.classId === classId.value)
  examBId.value = list[examBIdx.value]?.id || ''
  runCompare()
}

async function runCompare() {
  if (!classId.value || !examAId.value || !examBId.value) {
    comparison.value = []
    return
  }
  loading.value = true
  try {
    const [rankA, rankB] = await Promise.all([
      getGradesAnalysisRank(classId.value, examAId.value),
      getGradesAnalysisRank(classId.value, examBId.value),
    ])
    const mapA = new Map((rankA?.ranks || []).map(r => [r.studentId, r]))
    const mapB = new Map((rankB?.ranks || []).map(r => [r.studentId, r]))
    const ids = new Set([...mapA.keys(), ...mapB.keys()])
    const rows = []
    for (const sid of ids) {
      const a = mapA.get(sid)
      const b = mapB.get(sid)
      if (!a || !b) continue
      const delta = (b.score || 0) - (a.score || 0)
      const rankDelta = (a.rank || 0) - (b.rank || 0)
      rows.push({
        studentId: sid,
        name: a.studentName || b.studentName || '—',
        scoreA: a.score,
        rankA: a.rank,
        scoreB: b.score,
        rankB: b.rank,
        delta,
        rankDelta,
      })
    }
    rows.sort((a, b) => b.delta - a.delta)
    comparison.value = rows
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goGrades(studentId) {
  uni.navigateTo({ url: '/pages/teaching/student-grades?studentId=' + encodeURIComponent(studentId) + '&classId=' + encodeURIComponent(classId.value || '') })
}

onMounted(() => {
  loadClasses()
  loadExams()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: 700; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.sel { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 16rpx; }
.field:last-child { margin-bottom: 0; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); min-height: 80rpx; line-height: 44rpx; background: var(--c-input); box-sizing: border-box; }
.loading, .empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.row { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0; }
.name-row { cursor: pointer; }
.name { font-size: 30rpx; font-weight: 600; color: var(--c-primary); }
.arrow { font-size: 28rpx; color: var(--c-sub); }
.lbl { font-size: 24rpx; color: var(--c-sub); }
.val { font-size: 26rpx; color: var(--c-title); }
.delta { margin-top: 8rpx; padding-top: 8rpx; border-top: 1px dashed var(--c-border); }
.up { color: var(--c-success); }
.down { color: var(--c-danger); }
.same { color: var(--c-sub); }
.rank-delta { margin-left: 12rpx; font-size: 22rpx; opacity: 0.8; }
</style>
