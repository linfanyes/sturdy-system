<template>
  <scroll-view scroll-y class="tab-body">
    <view class="sec">
      <view class="st">📝 学生信息</view>
      <view v-if="studentInfo" class="info-card">
        <view class="info-row"><text class="info-label">家长姓名</text><text class="info-val">{{ studentInfo.parentName || '--' }}</text></view>
        <view class="info-row"><text class="info-label">家长电话</text><text class="info-val">{{ studentInfo.parentPhone || '--' }}</text></view>
        <view class="info-row"><text class="info-label">学生电话</text><text class="info-val">{{ studentInfo.studentPhone || '--' }}</text></view>
        <view class="info-row"><text class="info-label">出生日期</text><text class="info-val">{{ studentInfo.birthDate || '--' }}</text></view>
        <view class="info-row"><text class="info-label">地址</text><text class="info-val">{{ studentInfo.address || '--' }}</text></view>
        <view class="info-row" v-if="studentInfo.note"><text class="info-label">备注</text><text class="info-val">{{ studentInfo.note }}</text></view>
        <view class="info-actions">
          <view class="info-btn primary" @click="emit('edit-student-info')">修改信息</view>
          <view class="info-btn" @click="emit('view-requests')">查看申请记录</view>
        </view>
      </view>
      <view v-else class="empty-card">
        <text class="empty-icon">📄</text>
        <text class="empty-text">暂无学生信息</text>
      </view>
    </view>

    <view class="sec" v-if="teachers.length">
      <view class="st">👨‍🏫 科任老师</view>
      <view class="teacher-list">
        <view v-for="t in teachers" :key="t.teacherId" class="teacher-card" @tap="emit('open-teacher', t)">
          <view class="teacher-avatar">{{ t.name ? t.name.charAt(0) : '师' }}</view>
          <view class="teacher-main">
            <view class="teacher-name">
              {{ t.name }}
              <text class="teacher-role" :class="t.role === 'head' ? 'head' : 'subject'">{{ t.roleLabel }}</text>
            </view>
            <view class="teacher-sub">
              <text v-if="t.subjects && t.subjects.length">任教：{{ t.subjects.join('、') }}</text>
              <text v-else-if="t.subject">任教：{{ t.subject }}</text>
              <text v-if="t.phone" class="teacher-phone"> · 📞 {{ t.phone }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="sec">
      <view class="st">💡 孩子在校健康度总览</view>
      <view class="health-grid">
        <view v-for="h in healthOverview" :key="h.key" class="health-item">
          <view class="health-light" :class="'hl-' + h.status"></view>
          <text class="health-ico">{{ h.icon }}</text>
          <text class="health-lbl">{{ h.label }}</text>
          <text class="health-hint">{{ h.hint }}</text>
        </view>
      </view>
      <view class="remind-head">🔔 今日需关注</view>
      <view v-if="!reminders.length" class="empty-card">
        <text class="empty-icon">🎉</text>
        <text class="empty-text">暂无需要关注的事项</text>
      </view>
      <view v-for="(r, i) in reminders" :key="i" class="remind-item" :class="'rm-' + r.level">
        <text class="remind-ico">{{ r.icon }}</text>
        <text class="remind-text">{{ r.text }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  me: { type: Object, default: null },
  attendance: { type: Object, default: null },
  homework: { type: Array, default: () => [] },
  notices: { type: Array, default: () => [] },
  teachers: { type: Array, default: () => [] },
  exams: { type: Array, default: () => [] },
})

const emit = defineEmits(['edit-student-info', 'view-requests', 'open-teacher'])

const studentInfo = computed(() => props.me && props.me.studentInfo)
const latestExam = computed(() => props.exams.length ? props.exams[props.exams.length - 1] : null)

const healthOverview = computed(() => {
  const att = props.attendance
  const attRecent = (att && att.recent) || []
  const attNegative = attRecent.some(r => /旷课|缺勤|违纪|迟到/.test(r.note || ''))
  const attCount = (att && att.total) || 0
  const subs = (latestExam.value && latestExam.value.subjects) || []
  const weak = subs.filter(s => s.score != null && s.fullScore && (s.score / s.fullScore) < 0.6).length
  const strong = subs.filter(s => s.score != null && s.fullScore && (s.score / s.fullScore) >= 0.8).length
  const overdue = props.homework.filter(h => h.status === '逾期' || h.status === '已逾期').length
  const pend = props.homework.filter(h => h.status !== '已完成').length
  const beh = (att && att.summary && att.summary.behavior) || 0
  const urgent = props.notices.filter(n => n.pinned).length
  return [
    { key: 'attendance', label: '考勤', icon: '🕒', status: attNegative ? 'red' : attCount > 0 ? 'green' : 'yellow', hint: attNegative ? '有缺勤/违纪' : attCount > 0 ? '打卡正常' : '暂无打卡' },
    { key: 'exam', label: '成绩', icon: '📈', status: weak >= 2 ? 'red' : weak === 1 ? 'yellow' : strong > 0 ? 'green' : 'yellow', hint: weak >= 2 ? '多科偏弱' : strong > 0 ? '发挥稳定' : '关注薄弱' },
    { key: 'homework', label: '作业', icon: '✅', status: overdue > 0 ? 'red' : pend > 0 ? 'yellow' : 'green', hint: overdue > 0 ? overdue + ' 项逾期' : pend > 0 ? pend + ' 项待完成' : '全部完成' },
    { key: 'behavior', label: '行为', icon: '⚖️', status: beh > 0 ? 'green' : 'yellow', hint: beh > 0 ? '表现良好' : '暂无记录' },
    { key: 'comm', label: '沟通', icon: '💬', status: urgent > 0 ? 'red' : notices.value.length > 0 ? 'green' : 'yellow', hint: urgent > 0 ? urgent + ' 条置顶' : props.notices.length > 0 ? '消息已读' : '暂无消息' },
  ]
})

const reminders = computed(() => {
  const list = []
  props.homework.filter(h => h.status === '逾期' || h.status === '已逾期').forEach(h => list.push({ icon: '⏰', text: '作业逾期：' + h.subject + '·' + h.title, level: 'red' }))
  ;((props.attendance && props.attendance.recent) || []).filter(r => /旷课|缺勤|违纪|迟到/.test(r.note || '')).forEach(r => list.push({ icon: '⚠️', text: '考勤预警：' + r.note, level: 'red' }))
  props.notices.filter(n => n.pinned).forEach(n => list.push({ icon: '📢', text: '置顶通知：' + n.title, level: 'yellow' }))
  const pend = props.homework.filter(h => h.status !== '已完成' && h.status !== '逾期' && h.status !== '已逾期')
  if (pend.length) list.push({ icon: '📝', text: pend.length + ' 项作业待完成', level: 'yellow' })
  return list
})
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.info-card { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; }
.info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.info-row:last-of-type { border-bottom: none; }
.info-label { font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.info-val { font-size: 24rpx; color: var(--c-title); font-weight: 600; text-align: right; flex: 1; margin-left: 16rpx; }
.info-actions { display: flex; gap: 14rpx; margin-top: 20rpx; }
.info-btn { flex: 1; text-align: center; font-size: 26rpx; padding: 18rpx 0; border-radius: 12rpx; background: var(--c-input); color: var(--c-title); font-weight: 600; }
.info-btn.primary { background: var(--c-primary); color: #fff; }
.teacher-list { display: flex; flex-direction: column; gap: 16rpx; }
.teacher-card { display: flex; align-items: center; gap: 18rpx; background: var(--c-card); border-radius: 14rpx; padding: 20rpx; }
.teacher-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #fdf6ec; color: #E6A23C; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 600; flex-shrink: 0; }
.teacher-main { flex: 1; min-width: 0; }
.teacher-name { font-size: 28rpx; font-weight: 600; color: var(--c-title); display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.teacher-role { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 20rpx; }
.teacher-role.head { background: #fdf6ec; color: #E6A23C; }
.teacher-role.subject { background: #e8f4fd; color: #1C6FB3; }
.teacher-sub { font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.teacher-phone { color: var(--c-sub); }
.health-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.health-item { width: calc(50% - 7rpx); background: var(--c-card); border-radius: 16rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 6rpx; position: relative; }
.health-light { position: absolute; top: 16rpx; right: 16rpx; width: 16rpx; height: 16rpx; border-radius: 50%; }
.hl-green { background: var(--c-primary); }
.hl-yellow { background: #E6A23C; }
.hl-red { background: #f56c6c; }
.health-ico { font-size: 36rpx; line-height: 1; }
.health-lbl { font-size: 26rpx; font-weight: 700; color: var(--c-title); }
.health-hint { font-size: 20rpx; color: var(--c-sub); }
.remind-head { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin: 18rpx 0 10rpx; }
.remind-item { display: flex; align-items: center; gap: 12rpx; background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.remind-ico { font-size: 30rpx; }
.remind-text { font-size: 24rpx; color: var(--c-title); flex: 1; }
.rm-red { border-left: 6rpx solid #f56c6c; }
.rm-yellow { border-left: 6rpx solid #E6A23C; }
</style>
