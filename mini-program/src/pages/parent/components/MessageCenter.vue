<template>
  <scroll-view scroll-y class="tab-body">
    <!-- 班级作业 -->
    <view class="sec">
      <view class="st">📝 待完成作业 <text v-if="homework.length" class="sc-badge">{{ homework.length }}项</text></view>
      <view v-if="!homework.length" class="empty-card">
        <text class="empty-icon">🎉</text>
        <text class="empty-text">暂无待完成作业</text>
      </view>
      <view class="nitem" v-for="h in visibleHomework" :key="h.id">
        <view class="nt">{{ h.subject }} · {{ h.title }}
          <text class="ndate">{{ h.deadline || h.startDate }}</text>
          <text class="hwstatus">{{ h.status }}</text>
        </view>
        <view class="nc">{{ h.content }}</view>
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
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.sc-badge { font-size: 20rpx; color: #fff; background: var(--c-primary); padding: 2rpx 12rpx; border-radius: 20rpx; font-weight: 400; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.ndate { font-size: 20rpx; color: var(--c-sub); margin-left: 12rpx; font-weight: 400; }
.hwstatus { font-size: 20rpx; color: #e6a23c; margin-left: 12rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.att-empty { background: var(--c-card); border-radius: 14rpx; padding: 28rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); margin-top: 12rpx; }
</style>
