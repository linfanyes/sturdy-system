<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="top3" v-if="top3.length">
      <view class="podium" v-for="(s, i) in top3" :key="s.id" :class="'p' + (i + 1)">
        <view class="p-avatar">{{ s.avatar }}</view>
        <view class="p-name">{{ s.name }}</view>
        <view class="p-pts">{{ s.total }} 分</view>
        <view class="p-badge">{{ ['🥇', '🥈', '🥉'][i] }}</view>
      </view>
    </view>

    <canvas canvas-id="barCanvas" class="bar-canvas"></canvas>

    <view class="list">
      <view class="row head">
        <text class="c rk">#</text>
        <text class="c nm">姓名</text>
        <text class="c pt">积分</text>
        <text class="c cnt">次数</text>
      </view>
      <view class="row" v-for="(s, i) in ranked" :key="s.id">
        <text class="c rk">{{ i + 1 }}</text>
        <text class="c nm">{{ s.avatar }} {{ s.name }}</text>
        <text class="c pt" :class="{ hot: s.total >= topScore }">{{ s.total }}</text>
        <text class="c cnt">{{ s.count }}</text>
      </view>
      <view class="empty" v-if="!ranked.length">暂无积分数据，去「奖励兑换」为学生加分吧</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const classes = ref([])
const classId = ref('')
const students = ref([])
const records = ref([])

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})

// 按学生聚合积分
const scoreMap = computed(() => {
  const m = {}
  ;(records.value || []).forEach((r) => {
    if (!m[r.studentId]) m[r.studentId] = { total: 0, count: 0 }
    m[r.studentId].total += Number(r.points) || 0
    m[r.studentId].count++
  })
  return m
})
const ranked = computed(() => {
  const sMap = {}
  students.value.forEach((s) => { sMap[s.id] = s })
  return Object.entries(scoreMap.value)
    .map(([id, v]) => ({ id, ...v, name: (sMap[id] || {}).name || '未知', avatar: (sMap[id] || {}).gender === '女' ? '👧' : '👦' }))
    .sort((a, b) => b.total - a.total)
})
const top3 = computed(() => ranked.value.slice(0, 3))
const topScore = computed(() => ranked.value[0]?.total || 1)

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (!classId.value && classes.value.length) classId.value = classes.value[0].id
  if (classId.value) {
    students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
    records.value = await api.getList('/reward-records', { silent: true })
  }
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; load() }

// canvas 柱状图（前 5 名）
watch(ranked, () => nextTick(drawBars), { immediate: true })
function drawBars() {
  const top = ranked.value.slice(0, 5)
  if (!top.length) return
  const ctx = uni.createCanvasContext('barCanvas')
  const W = 680, H = 340, pad = 40, bottom = 60, topPad = 20
  const barW = (W - pad * 2) / top.length * 0.6
  const gap = (W - pad * 2) / top.length
  const max = Math.max(...top.map((s) => s.total), 1)
  ctx.clearRect(0, 0, W, H)
  // 背景
  ctx.setFillStyle(theme.mode === 'dark' ? '#1f232b' : '#f8f4ec')
  ctx.fillRect(0, 0, W, H)
  const colors = ['#e6a23c', '#07c160', '#409eff', '#e06c75', '#9b59b6']
  top.forEach((s, i) => {
    const h = ((s.total / max) * (H - bottom - topPad))
    const x = pad + i * gap + (gap - barW) / 2
    const y = H - bottom - h
    // 圆角柱
    ctx.setFillStyle(colors[i % colors.length])
    ctx.fillRect(x, y + 6, barW, h - 6) // 直角主体
    // 圆角顶
    ctx.beginPath()
    ctx.arc(x + barW / 2, y + 6, 6, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(x, y, barW, 6)
    // 分数
    ctx.setFillStyle(theme.mode === 'dark' ? '#f2f2f2' : '#4a3f35')
    ctx.setFontSize(22)
    ctx.setTextAlign('center')
    ctx.fillText(String(s.total), x + barW / 2, y - 8)
    // 姓名
    ctx.setFontSize(20)
    ctx.setFillStyle(theme.mode === 'dark' ? '#9aa0a6' : '#8a8a8a')
    ctx.fillText(s.name, x + barW / 2, H - bottom + 30)
    // 头像 emoji
    ctx.setFontSize(26)
    ctx.fillText(s.avatar, x + barW / 2, H - bottom + 58)
  })
  ctx.draw()
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.picker { background: var(--c-card); border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.top3 { display: flex; gap: 16rpx; margin-bottom: 10rpx; padding: 20rpx 0; }
.podium { flex: 1; text-align: center; padding: 20rpx 10rpx; border-radius: 20rpx; position: relative; }
.p1 { background: linear-gradient(135deg, #fff8e1, #ffe082); transform: scale(1.05); }
.p2 { background: #f5f5f5; }
.p3 { background: #fff3e0; }
.p-avatar { font-size: 40rpx; }
.p-name { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-top: 6rpx; }
.p-pts { font-size: 30rpx; font-weight: 800; color: var(--c-accent); }
.p-badge { font-size: 36rpx; margin-top: 4rpx; }
.bar-canvas { width: 680rpx; height: 340rpx; margin: 10rpx auto; display: block; border-radius: 16rpx; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 20rpx; margin-top: 14rpx; }
.row { display: flex; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); align-items: center; }
.row.head { border-bottom: 2px solid var(--c-accent); font-weight: 700; }
.c { display: block; }
.rk { width: 60rpx; font-size: 24rpx; color: var(--c-sub); text-align: center; }
.nm { flex: 1; font-size: 28rpx; color: var(--c-title); }
.pt { width: 100rpx; text-align: right; font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.pt.hot { color: var(--c-danger); font-size: 32rpx; }
.cnt { width: 80rpx; text-align: right; font-size: 24rpx; color: var(--c-sub); }
.empty { text-align: center; color: var(--c-sub); padding: 40rpx 0; }
</style>
