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

    <view class="chart" v-if="points.length">
      <view class="chart-title">{{ mode === 'trend' ? selSubject + ' · 历次考试平均分' : selSubject + ' · 各班最新平均分' }}</view>
      <!-- 折线 + 柱：用纯 CSS 柱状表现趋势 -->
      <view class="bars">
        <view class="bar-col" v-for="(p, i) in points" :key="i">
          <view class="bar" :style="{ height: p.h + 'rpx', background: p.color }"></view>
          <text class="bv">{{ p.value }}</text>
          <text class="bx">{{ p.label }}</text>
        </view>
      </view>
      <view class="legend-min" v-if="mode === 'trend' && minMax.max > minMax.min">
        最高 {{ minMax.max }} · 最低 {{ minMax.min }} · 平均 {{ avg }}
      </view>
    </view>
    <view v-else class="empty">暂无数据（请先在该班录入成绩）</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const mode = ref('trend')
const classes = ref([])
const classId = ref('')
const subjectsAll = ref([])
const selSubject = ref('')
const grades = ref([])

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const subjectOpts = computed(() => {
  const set = new Set()
  grades.value.forEach((g) => set.add(g.subject))
  return [...set]
})

function avgScore(g) {
  if (!g.scores || !g.scores.length) return 0
  const sum = g.scores.reduce((s, x) => s + (Number(x.score) || 0), 0)
  return Math.round((sum / g.scores.length) * 10) / 10
}

const points = computed(() => {
  if (!selSubject.value) return []
  let arr = []
  if (mode.value === 'trend') {
    const list = grades.value
      .filter((g) => g.classId === classId.value && g.subject === selSubject.value)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    arr = list.map((g, i) => ({
      label: (g.examName || g.date || '考试' + (i + 1)).slice(0, 6),
      value: avgScore(g),
    }))
  } else {
    arr = classes.value.map((c) => {
      const list = grades.value.filter((g) => g.classId === c.id && g.subject === selSubject.value)
      const vals = list.map(avgScore).filter((v) => v > 0)
      const v = vals.length ? Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10 : 0
      return { label: c.name.slice(0, 4), value: v }
    })
  }
  const max = Math.max(10, ...arr.map((a) => a.value))
  const palette = ['#e6a23c', '#07c160', '#409eff', '#a07b3b', '#9b59b6', '#e06c75']
  return arr.map((a, i) => ({
    ...a,
    h: Math.round((a.value / max) * 320),
    color: palette[i % palette.length],
  }))
})
const minMax = computed(() => {
  const vs = points.value.map((p) => p.value).filter((v) => v > 0)
  return { max: vs.length ? Math.max(...vs) : 0, min: vs.length ? Math.min(...vs) : 0 }
})
const avg = computed(() => {
  const vs = points.value.map((p) => p.value).filter((v) => v > 0)
  return vs.length ? Math.round((vs.reduce((s, x) => s + x, 0) / vs.length) * 10) / 10 : 0
})

async function load() {
  classes.value = await api.get('/classes')
  grades.value = await api.get('/grades')
  if (!selSubject.value && subjectOpts.value.length) selSubject.value = subjectOpts.value[0]
}
onShow(load)

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.seg { display: flex; background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 20rpx; }
.seg-i { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #9aa0a6; }
.seg-i.on { background: #e6a23c; color: #fff; font-weight: 600; }
.chart { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.chart-title { font-size: 26rpx; color: #4a3f35; margin-bottom: 20rpx; font-weight: 600; }
.bars { display: flex; align-items: flex-end; gap: 14rpx; height: 360rpx; padding: 10rpx 0; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar { width: 60%; border-radius: 10rpx 10rpx 0 0; min-height: 4rpx; transition: height .3s; }
.bv { font-size: 22rpx; color: #5a5048; margin-top: 8rpx; }
.bx { font-size: 20rpx; color: #9aa0a6; margin-top: 4rpx; }
.legend-min { font-size: 24rpx; color: #9aa0a6; margin-top: 14rpx; text-align: center; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 0; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .seg, .dark .chart { background: var(--c-card); }
.dark .seg-i { color: var(--c-sub); }
.dark .chart-title { color: var(--c-title); }
.dark .bv { color: var(--c-sub); }
.dark .bx { color: var(--c-sub); }
</style>
