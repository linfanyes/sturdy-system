<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getParentSchedule } from '../../api/parentSchedule'

const items = ref([])
const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function byDay() {
  const g = {}
  items.value.forEach((it) => {
    ;(g[it.dayOfWeek] = g[it.dayOfWeek] || []).push(it)
  })
  return g
}

async function load() {
  try {
    const res = await getParentSchedule()
    items.value = (res && res.items) || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
onShow(load)
</script>

<template>
  <view class="page">
    <view class="hd">🗓️ 本周课表</view>
    <view v-if="!items.length" class="empty">暂无课表</view>
    <view v-for="(d, di) in DAYS" :key="di" class="day-block">
      <view class="day-name">{{ d }}</view>
      <view
        v-for="it in (byDay()[di + 1] || [])"
        :key="it.id"
        class="cell"
        :class="it.status === 'adjusted' ? 'adj' : ''"
      >
        <view class="subj">{{ it.subject }}</view>
        <view class="meta">{{ it.location }} · {{ it.teacherName }}</view>
        <view v-if="it.status === 'adjusted'" class="warn">
          ⚠ 调课：{{ it.adjustReason }}
          <text v-if="it.adjustToDate">（调整至 {{ it.adjustToDate }} 第{{ it.adjustToPeriod }}节）</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; background: #f7f8fa; min-height: 100vh; }
.hd { font-size: 34rpx; font-weight: 700; color: #1f2937; margin: 12rpx 8rpx 20rpx; }
.empty { text-align: center; color: #9ca3af; padding: 80rpx 0; }
.day-block { margin-bottom: 16rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; }
.day-name { font-size: 26rpx; color: #2563eb; font-weight: 600; margin-bottom: 8rpx; }
.cell { background: #eff6ff; border-radius: 12rpx; padding: 14rpx; margin-bottom: 10rpx; }
.cell.adj { background: #fff1f2; border: 1rpx solid #fecdd3; }
.subj { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.meta { font-size: 22rpx; color: #6b7280; margin-top: 4rpx; }
.warn { font-size: 22rpx; color: #e11d48; margin-top: 6rpx; }
</style>
