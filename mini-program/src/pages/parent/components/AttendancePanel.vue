<template>
  <scroll-view scroll-y class="tab-body">
    <view class="sec">
      <view class="st">📈 考勤看板</view>
      <view v-if="!attendance" class="empty-card">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无考勤数据</text>
      </view>
      <template v-else>
        <view class="att-chips">
          <view v-for="c in attendanceChips" :key="c.type" class="att-chip" :class="c.cls">
            <text class="att-ico">{{ c.icon }}</text>
            <text class="att-num">{{ c.count }}</text>
            <text class="att-lbl">{{ c.label }}</text>
          </view>
        </view>
        <view v-if="attendanceByMonth.length" class="att-trend">
          <text class="att-trend-title">近 6 个月打卡趋势</text>
          <view v-for="m in attendanceByMonth" :key="m.month" class="att-trend-row">
            <text class="att-trend-month">{{ m.month }}</text>
            <view class="att-trend-bar-bg"><view class="att-trend-bar" :style="{ width: Math.max(4, m.pct) + '%' }"></view></view>
            <text class="att-trend-count">{{ m.count }}次</text>
          </view>
        </view>
        <view v-if="attendanceRecent.length" class="att-recent">
          <text class="att-recent-title">最近打卡</text>
          <view v-for="r in attendanceRecent.slice(0, 8)" :key="r.id" class="att-rec">
            <text class="att-rec-ico" :class="(attMeta[r.type] || {}).cls || 'att-default'">{{ (attMeta[r.type] || {}).icon || '📌' }}</text>
            <view class="att-rec-main">
              <text class="att-rec-lbl">{{ (attMeta[r.type] || {}).label || r.type }} · {{ r.count }} 次</text>
              <text v-if="r.note" class="att-rec-note">{{ r.note }}</text>
            </view>
            <text class="att-rec-date">{{ r.date }}</text>
          </view>
        </view>
        <view v-else class="att-empty">暂无打卡记录</view>
      </template>
    </view>

    <!-- 行为表现 -->
    <view class="sec">
      <view class="st">⚖️ 行为表现</view>
      <view v-if="!behavior" class="empty-card">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无行为数据</text>
      </view>
      <template v-else>
        <view class="att-chips">
          <view v-for="c in behaviorChips" :key="c.label" class="beh-chip" :class="c.cls">
            <text class="att-num">{{ c.count }}</text>
            <text class="att-lbl">{{ c.label }}</text>
          </view>
        </view>
        <view v-if="behaviorByMonth.length" class="att-trend">
          <text class="att-trend-title">近 6 月趋势</text>
          <view v-for="m in behaviorByMonth" :key="m.month" class="att-trend-row">
            <text class="att-trend-month">{{ m.month }}</text>
            <view class="att-trend-bar-bg"><view class="att-trend-bar" :class="m.max ? 'bmax' : 'bmuted'" :style="{ width: Math.max(4, m.pct) + '%' }"></view></view>
            <text class="att-trend-count">{{ m.count }}</text>
          </view>
        </view>
        <view class="att-recent">
          <text class="att-recent-title">最近记录</text>
          <view v-if="!behaviorRecent.length" class="att-empty" style="margin-top:0">暂无行为记录</view>
          <view v-for="r in behaviorRecent" :key="r.id" class="beh-rec">
            <view class="beh-dot" :class="'beh-' + r.category"></view>
            <view class="att-rec-main">
              <text class="att-rec-lbl">{{ r.behavior }}</text>
              <text v-if="r.note" class="att-rec-note">{{ r.note }}</text>
            </view>
            <text class="att-rec-date">{{ r.date }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 课表 & 值日 -->
    <view class="sec">
      <view class="st">🗓️ 课表 & 值日</view>
      <view v-if="!schedule" class="empty-card">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无课表数据</text>
      </view>
      <template v-else>
        <view class="sch-strip">
          <view v-for="d in weekDays" :key="d.dow" class="sch-day" :class="{ on: d.dow === todayDow }">
            <text class="sch-dow">{{ d.label }}</text>
          </view>
        </view>
        <view class="att-trend">
          <text class="att-trend-title">今日课表</text>
          <view v-if="!todaySchedule.length" class="att-empty" style="margin-top:0">今天没有排课</view>
          <view v-for="(it, i) in todaySchedule" :key="i" class="sch-item">
            <text class="sch-period">{{ it.section || ('第' + (i + 1) + '节') }}</text>
            <text class="sch-subject">{{ it.subject }}</text>
            <text v-if="it.teacher" class="sch-teacher">{{ it.teacher }}</text>
          </view>
        </view>
        <view class="att-recent">
          <text class="att-recent-title">本周值日</text>
          <view v-if="!(schedule.upcomingDuty && schedule.upcomingDuty.length)" class="att-empty" style="margin-top:0">近期没有值日安排</view>
          <view v-for="(d, i) in (schedule.upcomingDuty || [])" :key="i" class="sch-duty">
            <text class="sch-duty-ico">🧹</text>
            <text class="sch-duty-text">{{ d.date }} · {{ d.name }} · {{ d.type === 'weekly' ? '每周' : '日常' }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 家校沟通 -->
    <view class="sec">
      <view class="st">💬 家校沟通</view>
      <view v-if="!communications" class="empty-card">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无沟通数据</text>
      </view>
      <template v-else>
        <view class="comm-chip">
          <text class="comm-chip-text">沟通 {{ communications.total || 0 }} 次</text>
        </view>
        <view class="att-recent">
          <text class="att-recent-title">最近沟通</text>
          <view v-if="!(communications.recent && communications.recent.length)" class="att-empty" style="margin-top:0">暂无沟通记录</view>
          <view v-for="r in (communications.recent || [])" :key="r.id" class="comm-rec">
            <view class="comm-rec-head">
              <text class="comm-date">{{ r.date }}</text>
              <text v-if="r.method" class="comm-badge">{{ r.method }}</text>
            </view>
            <text class="comm-content">{{ r.content }}</text>
            <text v-if="r.followUp" class="comm-follow">跟进：{{ r.followUp }}</text>
            <text v-if="r.parentName || r.relation" class="comm-meta">{{ r.parentName }}{{ r.relation ? ' · ' + r.relation : '' }}</text>
          </view>
        </view>
        <view class="comm-btn" @click="contactTeacher">💬 联系老师</view>
      </template>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  attendance: { type: Object, default: null },
  behavior: { type: Object, default: null },
  schedule: { type: Object, default: null },
  communications: { type: Object, default: null },
})

const emit = defineEmits(['contact-teacher'])

const attMeta = {
  reading: { label: '阅读', icon: '📚', cls: 'att-reading' },
  sport: { label: '运动', icon: '🏃', cls: 'att-sport' },
  behavior: { label: '行为', icon: '⭐', cls: 'att-behavior' },
  homework: { label: '作业', icon: '📝', cls: 'att-homework' },
}

const attendanceChips = computed(() => {
  const s = props.attendance && props.attendance.summary
  return ['reading', 'sport', 'behavior', 'homework'].map(t => ({ ...attMeta[t], type: t, count: s ? s[t] : 0 }))
})

const attendanceByMonth = computed(() => {
  const list = (props.attendance && props.attendance.byMonth) || []
  const max = Math.max(1, ...list.map(m => m.count))
  return list.map(m => ({ ...m, pct: Math.round((m.count / max) * 100) }))
})

const attendanceRecent = computed(() => (props.attendance && props.attendance.recent) || [])

const todayDow = computed(() => ((new Date().getDay() + 6) % 7) + 1)

const weekDays = [
  { dow: 1, label: '一' }, { dow: 2, label: '二' }, { dow: 3, label: '三' },
  { dow: 4, label: '四' }, { dow: 5, label: '五' }, { dow: 6, label: '六' }, { dow: 7, label: '日' },
]

const todaySchedule = computed(() => {
  const w = ((props.schedule && props.schedule.week) || []).find(d => d.dayOfWeek === todayDow.value)
  return (w && w.items) || []
})

const behaviorChips = computed(() => {
  const s = props.behavior && props.behavior.summary
  return [
    { label: '表扬', count: s ? s.praise : 0, cls: 'beh-green' },
    { label: '违纪', count: s ? s.violation : 0, cls: 'beh-red' },
    { label: '其他', count: s ? s.other : 0, cls: 'beh-amber' },
  ]
})

const behaviorRecent = computed(() => (props.behavior && props.behavior.recent) || [])

const behaviorByMonth = computed(() => {
  const list = (props.behavior && props.behavior.byMonth) || []
  const max = Math.max(0, ...list.map(m => m.count))
  return list.map(m => ({ ...m, pct: max ? Math.round((m.count / max) * 100) : 0, max: m.count === max && max > 0 }))
})

function contactTeacher() {
  emit('contact-teacher')
}
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.att-chips { display: flex; gap: 12rpx; margin-bottom: 14rpx; }
.att-chip { flex: 1; border-radius: 14rpx; padding: 18rpx 0; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.att-ico { font-size: 36rpx; line-height: 1; }
.att-num { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.att-lbl { font-size: 22rpx; color: var(--c-sub); }
.att-reading { background: #e3f2fd; }
.att-sport { background: #e8f5e9; }
.att-behavior { background: #fef3e0; }
.att-homework { background: #fde8ef; }
.att-trend { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; }
.att-trend-title, .att-recent-title { font-size: 26rpx; font-weight: 700; color: var(--c-title); display: block; margin-bottom: 10rpx; }
.att-trend-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.att-trend-month { font-size: 20rpx; color: var(--c-sub); width: 110rpx; flex-shrink: 0; }
.att-trend-bar-bg { flex: 1; height: 18rpx; background: var(--c-input); border-radius: 10rpx; overflow: hidden; }
.att-trend-bar { height: 100%; border-radius: 10rpx; background: var(--c-primary); }
.att-trend-count { font-size: 20rpx; color: var(--c-sub); width: 80rpx; text-align: right; flex-shrink: 0; }
.att-recent { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; }
.att-rec { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.att-rec:last-child { border-bottom: none; }
.att-rec-ico { width: 64rpx; height: 64rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.att-rec-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.att-rec-lbl { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.att-rec-note { font-size: 22rpx; color: var(--c-sub); white-space: pre-wrap; }
.att-rec-date { font-size: 20rpx; color: var(--c-sub); flex-shrink: 0; }
.att-default { background: var(--c-input); }
.att-empty { background: var(--c-card); border-radius: 14rpx; padding: 28rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); margin-top: 12rpx; }
.beh-chip { flex: 1; border-radius: 14rpx; padding: 18rpx 0; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.beh-green { background: #e8f5e9; }
.beh-red { background: #fde8e8; }
.beh-amber { background: #fef3e0; }
.att-trend-bar.bmax { background: var(--c-primary); }
.att-trend-bar.bmuted { background: #c8e6c9; }
.beh-rec { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.beh-rec:last-child { border-bottom: none; }
.beh-dot { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; }
.beh-praise { background: var(--c-primary); }
.beh-violation { background: #f56c6c; }
.beh-other { background: #E6A23C; }
.sch-strip { display: flex; gap: 8rpx; margin-bottom: 14rpx; }
.sch-day { flex: 1; text-align: center; padding: 10rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-size: 24rpx; }
.sch-day.on { background: var(--c-primary); color: #fff; font-weight: 700; }
.sch-item { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.sch-item:last-child { border-bottom: none; }
.sch-period { width: 130rpx; font-size: 24rpx; font-weight: 600; color: var(--c-title); flex-shrink: 0; }
.sch-subject { flex: 1; font-size: 26rpx; color: var(--c-title); }
.sch-teacher { font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; }
.sch-duty { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.sch-duty:last-child { border-bottom: none; }
.sch-duty-ico { font-size: 28rpx; flex-shrink: 0; }
.sch-duty-text { font-size: 24rpx; color: var(--c-title); flex: 1; }
.comm-chip { background: #e8f1fb; border-radius: 14rpx; padding: 18rpx 20rpx; margin-bottom: 14rpx; display: flex; }
.comm-chip-text { font-size: 26rpx; font-weight: 700; color: #1C6FB3; }
.comm-rec { padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.comm-rec:last-child { border-bottom: none; }
.comm-rec-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.comm-date { font-size: 20rpx; color: var(--c-sub); }
.comm-badge { font-size: 20rpx; color: #1C6FB3; background: #e8f1fb; padding: 2rpx 10rpx; border-radius: 8rpx; }
.comm-content { font-size: 26rpx; color: var(--c-title); line-height: 1.5; white-space: pre-wrap; display: block; }
.comm-follow { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.comm-meta { font-size: 20rpx; color: #9aa0a6; margin-top: 6rpx; display: block; }
.comm-btn { margin-top: 14rpx; background: #1C6FB3; color: #fff; font-size: 28rpx; font-weight: 600; text-align: center; padding: 20rpx; border-radius: 14rpx; }
</style>
