<template>
  <scroll-view scroll-y class="tab-body">
    <!-- 班级作业 -->
    <view class="sec">
      <view class="st">📝 待完成作业 <text v-if="homework.length" class="sc-badge">{{ homework.length }}项</text></view>
      <view v-if="!homework.length" class="empty-card">
        <text class="empty-icon">🎉</text>
        <text class="empty-text">暂无待完成作业</text>
      </view>
      <view class="nitem" :class="{ 'nitem-overdue': isHwOverdue(h) }" v-for="h in visibleHomework" :key="h.id">
        <view class="nt">{{ h.subject }} · {{ h.title }}
          <text v-if="deadlineChip(h)" class="dl-chip" :class="deadlineChip(h).cls">{{ deadlineChip(h).text }}</text>
          <text class="hwstatus" :class="hwStatusCls(h)">{{ h.status }}</text>
        </view>
        <view class="nc">{{ h.content }}</view>
        <view class="ndate-line">截止：{{ h.deadline || '未设置' }}</view>
      </view>
      <view v-if="homework.length > 5" class="att-empty" @click="showAllHomework = !showAllHomework">{{ showAllHomework ? '收起' : ('查看全部 ' + homework.length + ' 条作业') }}</view>
    </view>

    <!-- 班级通知 -->
    <view class="sec">
      <view class="st">📢 班级公告 <text v-if="notices.length" class="sc-badge">{{ notices.length }}条</text></view>
      <view v-if="!notices.length" class="empty-card">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无班级公告</text>
      </view>
      <view class="nitem" v-for="n in visibleNotices" :key="n.id">
        <view class="nt">{{ n.title }}<text v-if="n.pinned" class="npin">置顶</text></view>
        <view class="nc">{{ n.content }}</view>
      </view>
      <view v-if="notices.length > 5" class="att-empty" @click="showAllNotices = !showAllNotices">{{ showAllNotices ? '收起' : ('查看全部 ' + notices.length + ' 条公告') }}</view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  homework: { type: Array, default: () => [] },
  notices: { type: Array, default: () => [] },
})

const showAllHomework = ref(false)
const showAllNotices = ref(false)
const visibleHomework = computed(() => showAllHomework.value ? props.homework : props.homework.slice(0, 5))
const visibleNotices = computed(() => showAllNotices.value ? props.notices : props.notices.slice(0, 5))

// 作业状态口径与 Web 端一致
const DONE_HW_STATUSES = ['已完成', '已批改', '已发还']
function dayStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function diffDays(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10))
  if (isNaN(d.getTime())) return null
  return Math.round((dayStart(d) - dayStart(new Date())) / 86400000)
}
function isHwOverdue(h) {
  if (h.status === '逾期' || h.status === '已逾期') return true
  if (DONE_HW_STATUSES.includes(h.status) || !h.deadline) return false
  const diff = diffDays(h.deadline)
  return diff != null && diff < 0
}
function hwStatusCls(h) {
  if (isHwOverdue(h)) return 'hw-overdue'
  if (DONE_HW_STATUSES.includes(h.status)) return 'hw-done'
  return 'hw-pending'
}
function deadlineChip(h) {
  if (DONE_HW_STATUSES.includes(h.status) || !h.deadline) return null
  const diff = diffDays(h.deadline)
  if (diff == null) return null
  if (isHwOverdue(h) || diff < 0) return { text: '已逾期', cls: 'dl-overdue' }
  if (diff === 0) return { text: '今天截止', cls: 'dl-today' }
  if (diff <= 3) return { text: `${diff} 天后截止`, cls: 'dl-soon' }
  return null
}
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.sc-badge { font-size: 20rpx; color: #fff; background: var(--c-primary); padding: 2rpx 12rpx; border-radius: 20rpx; font-weight: 400; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nitem-overdue { border-left: 6rpx solid #f56c6c; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.ndate-line { font-size: 20rpx; color: var(--c-sub); margin-top: 8rpx; }
.dl-chip { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 20rpx; margin-left: 10rpx; }
.dl-overdue { color: #f56c6c; background: #fdecec; }
.dl-today { color: #e6a23c; background: #fef3e6; font-weight: 600; }
.dl-soon { color: #b88230; background: #fdf7ec; }
.hwstatus { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 20rpx; margin-left: 10rpx; }
.hw-overdue { color: #f56c6c; background: #fdecec; }
.hw-done { color: #07c160; background: #e8f7ef; }
.hw-pending { color: #e6a23c; background: #fef3e6; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.att-empty { background: var(--c-card); border-radius: 14rpx; padding: 28rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); margin-top: 12rpx; }
</style>
