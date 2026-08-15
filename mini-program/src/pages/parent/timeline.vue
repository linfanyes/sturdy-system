<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <text class="back" @tap="back">‹ 返回</text>
      <text class="title">🌈 成长时光机</text>
      <text class="export" @tap="exportBook">纪念册</text>
    </view>

    <view class="sub">孩子成长的每一步，都在这里留下痕迹</view>

    <view v-if="loading" class="loading">
      <view class="spinner"></view><text>加载中…</text>
    </view>

    <EmptyState v-else-if="!items.length" text="还没有成长记录，先从心情打卡或作业开始吧～" />

    <view v-else class="timeline">
      <view class="day-group" v-for="g in grouped" :key="g.date">
        <view class="day-label">{{ g.dateLabel }}</view>
        <view class="line">
          <view class="node" :style="{ background: g.color }"></view>
          <view class="events">
            <view class="event" v-for="(it, i) in g.items" :key="i">
              <view class="ev-icon" :style="{ background: it.color }">{{ it.icon }}</view>
              <view class="ev-body">
                <view class="ev-title">{{ it.title }}</view>
                <view class="ev-desc" v-if="it.desc">{{ it.desc }}</view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-pad"></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { parentApi } from '../../common/request'

const dark = computed(() => theme.dark)
const loading = ref(true)
const raw = ref([])

const ICONS = {
  exam: { icon: '📊', color: '#4f86ff', label: '考试' },
  notice: { icon: '📢', color: '#fa8c16', label: '公告' },
  homework: { icon: '📝', color: '#52c41a', label: '作业' },
  mood: { icon: '🌤️', color: '#eb2f96', label: '心情' },
}

async function load() {
  loading.value = true
  try {
    const [exams, notices, homework, mood] = await Promise.allSettled([
      parentApi.get('/parent-auth/exams'),
      parentApi.get('/parent-auth/notices'),
      parentApi.get('/parent-auth/homework'),
      parentApi.get('/parent/mood/mine'),
    ])
    const list = []
    if (exams.status === 'fulfilled') {
      const arr = (exams.value && exams.value.exams) || []
      for (const e of arr) {
        const pct = e.totalScore != null && e.totalFullScore ? Math.round((e.totalScore / e.totalFullScore) * 1000) / 10 + '%' : ''
        const rank = e.classRank ? `班级第${e.classRank}名` : (e.gradeRank ? `年级第${e.gradeRank}名` : '')
        list.push({ type: 'exam', date: e.date, title: `${e.examName || '考试'} · ${pct}`, desc: rank })
      }
    }
    if (notices.status === 'fulfilled') {
      const arr = Array.isArray(notices.value) ? notices.value : []
      for (const n of arr) list.push({ type: 'notice', date: n.date || n.createdAt, title: n.title || '学校公告', desc: n.content ? String(n.content).slice(0, 40) : '' })
    }
    if (homework.status === 'fulfilled') {
      const arr = Array.isArray(homework.value) ? homework.value : []
      for (const h of arr) list.push({ type: 'homework', date: h.dueDate || h.date, title: `作业：${h.title || h.subject || ''}`, desc: h.status ? `状态：${h.status}` : '' })
    }
    if (mood.status === 'fulfilled') {
      const arr = Array.isArray(mood.value) ? mood.value : []
      for (const m of arr) list.push({ type: 'mood', date: m.date, title: `今日心情 ${m.emoji || ''}`, desc: m.note || '' })
    }
    raw.value = list
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function fmtDate(d) {
  if (!d) return ''
  return String(d).slice(0, 10)
}
const items = computed(() => {
  return raw.value
    .filter(it => fmtDate(it.date))
    .map(it => {
      const meta = ICONS[it.type] || { icon: '•', color: '#999', label: '' }
      return { ...it, date: fmtDate(it.date), icon: meta.icon, color: meta.color, label: meta.label }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
})

// 按日期分组（最多展示近 60 条）
const grouped = computed(() => {
  const map = {}
  for (const it of items.value.slice(0, 60)) {
    if (!map[it.date]) map[it.date] = []
    map[it.date].push(it)
  }
  return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(date => ({
    date,
    dateLabel: date,
    color: map[date][0].color,
    items: map[date],
  }))
})

function back() { uni.navigateBack() }

// 生成期末成长纪念册（文本摘要，复制到剪贴板可分享）
async function exportBook() {
  if (!items.value.length) return uni.showToast({ title: '暂无记录', icon: 'none' })
  const examsC = items.value.filter(i => i.type === 'exam').length
  const hwC = items.value.filter(i => i.type === 'homework').length
  const moodC = items.value.filter(i => i.type === 'mood').length
  const noticesC = items.value.filter(i => i.type === 'notice').length
  const lines = [
    '🌟 我的成长纪念册',
    `记录区间：${grouped.value.length ? grouped.value[grouped.value.length - 1].date : '—'} ~ ${grouped.value.length ? grouped.value[0].date : '—'}`,
    '',
    `📊 考试 ${examsC} 次 · 📝 作业 ${hwC} 条 · 🌤️ 心情打卡 ${moodC} 天 · 📢 公告 ${noticesC} 条`,
    '',
    '近况一览：',
    ...items.value.slice(0, 10).map(i => `· ${i.date} ${i.icon} ${i.title}`),
    '',
    '—— 园丁工作台 · 成长时光机',
  ]
  const text = lines.join('\n')
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '纪念册已复制，去分享吧', icon: 'none' }),
  })
}

onShow(() => load())
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; padding: 0 0 40rpx; }
.page.dark { background: #15171c; }
.hd { display: flex; align-items: center; padding: 28rpx 28rpx 8rpx; }
.back { font-size: 30rpx; color: #4f86ff; width: 120rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; flex: 1; text-align: center; }
.page.dark .title { color: #e8e8e8; }
.export { font-size: 28rpx; color: #4f86ff; width: 120rpx; text-align: right; }
.sub { text-align: center; font-size: 24rpx; color: #9aa0a6; margin-bottom: 16rpx; }
.loading { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; color: #999; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #eee; border-top-color: #4f86ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
.timeline { padding: 12rpx 28rpx; }
.day-group { margin-bottom: 24rpx; }
.day-label { font-size: 26rpx; color: #4f86ff; font-weight: 700; margin-bottom: 10rpx; }
.line { position: relative; padding-left: 40rpx; }
.node { position: absolute; left: 12rpx; top: 6rpx; width: 20rpx; height: 20rpx; border-radius: 50%; }
.line::before { content: ''; position: absolute; left: 21rpx; top: 20rpx; bottom: -24rpx; width: 2rpx; background: #e3e7ee; }
.event { display: flex; align-items: flex-start; background: #fff; border-radius: 16rpx; padding: 18rpx 20rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 10rpx rgba(0,0,0,.04); }
.page.dark .event { background: #23262e; }
.ev-icon { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; margin-right: 16rpx; flex-shrink: 0; }
.ev-title { font-size: 28rpx; color: #1a1a1a; font-weight: 600; }
.page.dark .ev-title { color: #e8e8e8; }
.ev-desc { font-size: 24rpx; color: #9aa0a6; margin-top: 6rpx; line-height: 1.4; }
.bottom-pad { height: 20rpx; }
</style>
