<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">📊 数据看板</view>
      <picker :range="classOpts" :value="classIdx" @change="onClassChange">
        <view class="pkr">{{ classOpts[classIdx] || '选班级' }}</view>
      </picker>
    </view>

    <view class="cards">
      <view class="card c1"><view class="cv">{{ stats.studentCount }}</view><view class="cl">学生人数</view></view>
      <view class="card c2"><view class="cv">{{ stats.attendRate }}%</view><view class="cl">出勤率</view></view>
      <view class="card c3"><view class="cv">{{ stats.avgScore }}</view><view class="cl">均分</view></view>
      <view class="card c4"><view class="cv">{{ stats.noticeCount }}</view><view class="cl">通知数</view></view>
    </view>

    <view class="sec" v-if="stats.classId">
      <view class="st">📚 各科平均分</view>
      <view class="bar-item" v-for="s in stats.subjects" :key="s.name">
        <view class="bl">{{ s.name }}</view>
        <view class="bbar"><view class="bfill" :style="{width:s.pct+'%',background:s.color}"></view></view>
        <view class="bv">{{ s.avg }}</view>
      </view>
    </view>

    <view class="sec" v-if="stats.attendDays">
      <view class="st">📅 近期出勤</view>
      <view class="bar-item" v-for="d in stats.attendDays" :key="d.label">
        <view class="bl">{{ d.label }}</view>
        <view class="bbar"><view class="bfill" :style="{width:d.rate+'%',background:'#07c160'}"></view></view>
        <view class="bv">{{ d.rate }}%</view>
      </view>
    </view>

    <view class="empty" v-if="!stats.classId">请选择班级查看数据</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import api from '../../common/request'

const dark = computed(() => theme.mode === 'dark')
const classes = ref([])
const classIdx = ref(-1)
const stats = ref({})
const colors = ['#e6a23c','#409eff','#67c23a','#e06c75','#9b59b6','#1abc9c']

const classOpts = computed(() => classes.value.map(c => c.name || `${c.grade||''}(${c.classNo||''})班`))

async function loadStats(classId) {
  const c = classes.value.find(x => x.id === classId)
  const name = c ? (c.name || '') : ''
  const [students, attends, grades, notices] = await Promise.all([
    api.getList('/students?classId=' + classId, { silent: true }),
    api.getList('/attendances?classId=' + classId, { silent: true }),
    api.getList('/grades?classId=' + classId, { silent: true }),
    api.getList('/notices?classId=' + classId, { silent: true }),
  ])
  const attTotal = attends.length ? (attends.filter(a => a.status==='出勤'||a.status==='正常').length / attends.length * 100).toFixed(0) : 0
  let avgScore = '--'
  let subjects = []
  if (grades.length) {
    const bySubject = {}
    for (const g of grades) {
      if (!g.scores || !g.scores.length) continue
      const scs = g.scores.filter(s => s.score != null).map(s => s.score)
      if (!scs.length) continue
      const avg = scs.reduce((a,b)=>a+b,0)/scs.length
      if (!bySubject[g.subject]) bySubject[g.subject] = {total:0,count:0}
      bySubject[g.subject].total += avg; bySubject[g.subject].count++
    }
    const allAvgs = []
    let ci = 0
    for (const [subj, v] of Object.entries(bySubject)) {
      const a = +(v.total/v.count).toFixed(1)
      allAvgs.push(a)
      subjects.push({ name:subj, avg:a, pct:Math.min(100, Math.round(a)), color:colors[ci%colors.length] })
      ci++
    }
    avgScore = allAvgs.length ? (allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(1) : '--'
  }
  // 出勤率模拟最近几天
  const attendDays = attends.length ? [{label:'出勤',rate:Math.round(attTotal)},{label:'缺勤',rate:Math.round(100-attTotal)}] : []
  stats.value = {
    classId, className: name,
    studentCount: students.length,
    attendRate: attTotal,
    avgScore,
    noticeCount: notices.length,
    subjects,
    attendDays,
  }
}

function onClassChange(e) {
  const idx = e.detail.value
  classIdx.value = idx
  const cls = classes.value[idx]
  if (cls) loadStats(cls.id)
}

onShow(async () => {
  classes.value = await api.getList('/classes', { silent: true }) || []
  if (classes.value.length === 1) {
    classIdx.value = 0
    loadStats(classes.value[0].id)
  }
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.pkr { font-size: 26rpx; color: var(--c-accent); padding: 10rpx 20rpx; background: var(--c-card2); border-radius: 20rpx; }
.cards { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.card { flex: 1; border-radius: 16rpx; padding: 20rpx 14rpx; text-align: center; }
.c1 { background: #fef3e6; } .c2 { background: #ecf5ff; } .c3 { background: #eff9f0; } .c4 { background: #fef0f5; }
.cv { font-size: 44rpx; font-weight: 800; color: var(--c-title); }
.cl { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.sec { margin-bottom: 20rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.bar-item { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.bl { width: 80rpx; font-size: 24rpx; color: var(--c-text); text-align: right; }
.bbar { flex: 1; height: 28rpx; background: var(--c-card2); border-radius: 14rpx; overflow: hidden; }
.bfill { height: 100%; border-radius: 14rpx; transition: width 0.5s; }
.bv { width: 80rpx; font-size: 22rpx; color: var(--c-sub); text-align: left; }
.empty { text-align: center; color: var(--c-sub); padding-top: 120rpx; font-size: 28rpx; }
.dark .page { background: var(--c-bg); }
</style>
