<template>
  <view>
    <!-- Tab 切换：成绩审计 / 审计日志 -->
    <view class="sub-tabs">
      <view class="stab" :class="{ on: mode === 'grade' }" @click="mode = 'grade'">成绩审计</view>
      <view class="stab" :class="{ on: mode === 'log' }" @click="mode = 'log'">审计日志</view>
    </view>

    <!-- ===== 成绩审计 ===== -->
    <view v-if="mode === 'grade'">
      <view class="filter-bar">
        <picker class="audit-picker" mode="selector" :range="schoolOptions" range-key="label" @change="onSchoolPick">
          <view class="picker-inp">{{ schoolLabel }}</view>
        </picker>
      </view>

      <!-- 汇总分析 -->
      <view class="audit-section">
        <view class="audit-hd">
          <text class="audit-title">学科汇总分析</text>
          <text class="audit-count">共 {{ summary.totalGrades }} 条成绩</text>
        </view>
        <view v-if="loading" class="audit-empty">加载中…</view>
        <view v-else-if="!summary.subjects || !summary.subjects.length" class="audit-empty">暂无成绩数据</view>
        <view v-else class="audit-grid">
          <view class="audit-card" v-for="s in summary.subjects" :key="s.subject">
            <text class="audit-card-title">{{ s.subject }}</text>
            <view class="audit-line"><text class="audit-k">样本</text><text class="audit-v">{{ s.count }}</text></view>
            <view class="audit-line"><text class="audit-k">平均分</text><text class="audit-v ac">{{ s.avg }}</text></view>
            <view class="audit-line"><text class="audit-k">及格率</text><text class="audit-v ag">{{ s.passRate }}%</text></view>
            <view class="audit-line"><text class="audit-k">最高/最低</text><text class="audit-v">{{ s.max }} / {{ s.min }}</text></view>
          </view>
        </view>
      </view>

      <!-- 考试列表 -->
      <view class="audit-section">
        <view class="audit-hd">
          <text class="audit-title">考试列表</text>
          <text class="audit-count">共 {{ exams.length }} 场</text>
        </view>
        <view v-if="!exams.length" class="audit-empty">暂无考试</view>
        <view v-else class="audit-list">
          <view class="audit-row" v-for="e in exams" :key="e.id">
            <view class="audit-row-hd">
              <text class="audit-nm">{{ e.name }}</text>
              <text class="audit-date">{{ e.date || '-' }}</text>
            </view>
            <text class="audit-meta">学校：{{ e.schoolName || '-' }} · 班级：{{ e.className || '-' }}</text>
            <text class="audit-meta">科目：{{ (e.subjects || []).join('、') || '-' }} · 学期：{{ e.term || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 成绩列表 -->
      <view class="audit-section">
        <view class="audit-hd">
          <text class="audit-title">成绩列表</text>
          <text class="audit-count">共 {{ grades.length }} 条</text>
        </view>
        <view v-if="!grades.length" class="audit-empty">暂无成绩记录</view>
        <view v-else class="audit-list">
          <view class="audit-row" v-for="g in grades" :key="g.id">
            <view class="audit-row-hd">
              <text class="audit-nm">{{ g.examName }}</text>
              <text class="audit-subject">{{ g.subject }}</text>
            </view>
            <text class="audit-meta">学校：{{ g.schoolName || '-' }} · 班级：{{ g.className || '-' }}</text>
            <text class="audit-meta">日期：{{ g.date || '-' }}</text>
            <text class="audit-meta audit-score">{{ scoreSummary(g) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 审计日志 ===== -->
    <view v-if="mode === 'log'">
      <view class="filter-bar">
        <picker class="audit-picker" mode="selector" :range="logSchoolOptions" range-key="label" @change="onLogSchoolPick">
          <view class="picker-inp">{{ logSchoolLabel }}</view>
        </picker>
        <view class="filter-count">共 {{ logTotal }} 条</view>
      </view>

      <view class="audit-section">
        <view v-if="logLoading" class="audit-empty">加载中…</view>
        <view v-else-if="!logItems.length" class="audit-empty">暂无审计日志</view>
        <view v-else class="audit-list">
          <view class="audit-row" v-for="l in logItems" :key="l.id || l.createdAt">
            <view class="audit-row-hd">
              <text class="audit-nm">{{ formatLogAction(l.action) }}</text>
              <text class="audit-date">{{ formatLogTime(l.createdAt || l.created_at) }}</text>
            </view>
            <text class="audit-meta">操作人：{{ l.operator || '-' }}</text>
            <text class="audit-meta">目标：{{ l.target || '-' }}</text>
            <text class="audit-meta" v-if="l.detail">详情：{{ l.detail }}</text>
          </view>
        </view>
      </view>

      <view class="pager" v-if="logTotal > logPageSize">
        <view class="pg-btn" :class="{ dis: logSkip <= 0 }" @click="emit('prev-page')">‹ 上一页</view>
        <text class="pg-info">{{ logPage }} / {{ logTotalPages }} 页</text>
        <view class="pg-btn" :class="{ dis: logSkip + logPageSize >= logTotal }" @click="emit('next-page')">下一页 ›</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // 成绩审计
  auditSummary: { type: Object, default: () => ({ subjects: [], totalGrades: 0 }) },
  auditExams: { type: Array, default: () => [] },
  auditGrades: { type: Array, default: () => [] },
  auditLoading: { type: Boolean, default: false },
  auditSchoolId: { type: String, default: '' },
  auditSchools: { type: Array, default: () => [] },
  // 审计日志
  logItems: { type: Array, default: () => [] },
  logTotal: { type: Number, default: 0 },
  logSkip: { type: Number, default: 0 },
  logPageSize: { type: Number, default: 50 },
  logLoading: { type: Boolean, default: false },
  logSchoolId: { type: String, default: '' },
  logSchools: { type: Array, default: () => [] },
})
const emit = defineEmits([
  'audit-school-change', 'log-school-change', 'prev-page', 'next-page',
  'load-audit', 'load-logs',
])

const mode = ref('grade')

// 成绩审计
const summary = computed(() => props.auditSummary)
const exams = computed(() => props.auditExams)
const grades = computed(() => props.auditGrades)
const loading = computed(() => props.auditLoading)

const schoolOptions = computed(() => [
  { id: '', label: '全部学校' },
  ...props.auditSchools.map(s => ({ id: s.id, label: s.name })),
])
const schoolLabel = computed(() => {
  const cur = schoolOptions.value.find(o => o.id === props.auditSchoolId)
  return cur ? cur.label : '全部学校'
})
function onSchoolPick(e) {
  const opt = schoolOptions.value[e.detail.value]
  emit('audit-school-change', opt ? opt.id : '')
}
function scoreSummary(g) {
  if (!g.scores || !g.scores.length) return '暂无'
  const valid = (g.scores || []).filter(s => s && s.score != null).map(s => Number(s.score))
  if (!valid.length) return '暂无'
  const avg = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
  return `${valid.length}人 均${avg} 最高${Math.max(...valid)} 最低${Math.min(...valid)}`
}

// 审计日志
const LOG_ACTION_LABELS = {
  create_teacher: '创建教师', delete_teacher: '删除教师', reset_password: '重置密码',
  create_class: '创建班级', delete_class: '删除班级', promote_class: '班级升级',
  create_school_admin: '创建校管', delete_school_admin: '删除校管',
  batch_create_classes: '批量建班', batch_create_students: '批量导入学生',
  delete_student: '删除学生', create_student: '创建学生',
  toggle_parent_login: '开关家长登录', reset_parent_password: '重置家长密码',
  batch_toggle_school: '批量启停学校', batch_toggle_admin: '批量启停校管',
  bind_parent: '绑定家长微信', login: '登录', logout: '登出',
  system_reset_all: '全量重置系统', clear_teacher_data: '清理教师业务数据',
  deactivate_all_teachers: '批量停用教师',
}
function formatLogAction(action) { return LOG_ACTION_LABELS[action] || action || '-' }
function formatLogTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const logSchoolOptions = computed(() => [
  { id: '', label: '全部学校' },
  ...props.logSchools.map(s => ({ id: s.id, label: s.name })),
])
const logSchoolLabel = computed(() => {
  const cur = logSchoolOptions.value.find(o => o.id === props.logSchoolId)
  return cur ? cur.label : '全部学校'
})
function onLogSchoolPick(e) {
  const opt = logSchoolOptions.value[e.detail.value]
  emit('log-school-change', opt ? opt.id : '')
}
const logPage = computed(() => Math.floor(props.logSkip / props.logPageSize) + 1)
const logTotalPages = computed(() => Math.max(1, Math.ceil(props.logTotal / props.logPageSize)))

watch(() => mode.val, (v) => {
  if (v === 'grade') emit('load-audit')
  else emit('load-logs')
})
</script>

<style scoped>
.sub-tabs { display: flex; gap: 8rpx; margin-bottom: 20rpx; padding: 8rpx; background: var(--c-card2); border-radius: 22rpx; }
.stab { flex: 1; text-align: center; font-size: 26rpx; padding: 16rpx 0; border-radius: 16rpx; background: transparent; color: var(--c-sub); font-weight: 600; }
.stab.on { background: var(--c-primary); color: #fff; }
.filter-bar { margin-bottom: 16rpx; }
.audit-picker { width: 100%; }
.picker-inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.filter-count { font-size: 24rpx; color: var(--c-sub); margin-top: 12rpx; }
.audit-section { background: var(--c-card); border-radius: 20rpx; padding: 26rpx 24rpx; margin-top: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.audit-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.audit-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.audit-count { font-size: 22rpx; color: var(--c-sub); }
.audit-empty { font-size: 24rpx; color: var(--c-sub); text-align: center; padding: 48rpx 0; }
.audit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.audit-card { background: var(--c-card2); border-radius: 16rpx; padding: 20rpx; }
.audit-card-title { font-size: 26rpx; font-weight: 700; color: var(--c-title); display: block; margin-bottom: 12rpx; }
.audit-line { display: flex; justify-content: space-between; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.audit-k { color: var(--c-sub); }
.audit-v { color: var(--c-title); font-weight: 600; }
.audit-v.ac { color: var(--c-accent); }
.audit-v.ag { color: var(--c-primary); }
.audit-list { display: flex; flex-direction: column; gap: 12rpx; }
.audit-row { background: var(--c-card2); border-radius: 14rpx; padding: 18rpx 20rpx; }
.audit-row-hd { display: flex; justify-content: space-between; align-items: center; gap: 12rpx; }
.audit-nm { font-size: 27rpx; font-weight: 700; color: var(--c-title); }
.audit-subject { font-size: 22rpx; color: var(--c-accent); font-weight: 600; flex-shrink: 0; }
.audit-date { font-size: 22rpx; color: var(--c-sub2); flex-shrink: 0; }
.audit-meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; line-height: 1.5; }
.audit-score { color: var(--c-primary); }
.pager { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; }
.pg-btn { background: var(--c-card2); border-radius: 14rpx; padding: 14rpx 26rpx; font-size: 26rpx; color: var(--c-title); font-weight: 600; }
.pg-btn.dis { opacity: 0.4; pointer-events: none; }
.pg-info { font-size: 24rpx; color: var(--c-sub); }
</style>
