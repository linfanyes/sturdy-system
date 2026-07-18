<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">🎰 抽签历史</view>
        <view class="sub">随机点名记录，按班级分组</view>
      </view>
      <view class="clear" v-if="list.length" @click="clearAll">清空</view>
    </view>

    <view class="empty" v-if="!list.length">还没有抽签记录</view>

    <view class="group" v-for="g in groups" :key="g.classId">
      <view class="gname">{{ g.name }}（{{ g.items.length }}）</view>
      <view class="chips">
        <text v-for="(it, i) in g.items" :key="i" class="chip">{{ it.studentName }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const classMap = ref({})

async function load() {
  const classes = await api.get('/classes')
  classMap.value = {}
  for (const c of classes) classMap.value[c.id] = c.name
  list.value = await api.get('/picker-history')
}
onShow(load)

const groups = computed(() => {
  const m = {}
  for (const it of list.value) {
    const cid = it.classId || 'unknown'
    if (!m[cid]) m[cid] = { classId: cid, name: classMap.value[cid] || '未知班级', items: [] }
    m[cid].items.push(it)
  }
  return Object.values(m)
})

function clearAll() {
  uni.showModal({ title: '清空', content: '确定清空全部抽签历史？', success: async (m) => {
    if (!m.confirm) return
    try {
      for (const it of list.value) await api.del('/picker-history/' + it.id)
      list.value = []
      uni.showToast({ title: '已清空', icon: 'none' })
    } catch (e) { uni.showToast({ title: '清空失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 24rpx; color: #9aa0a6; margin-top: 4rpx; }
.clear { font-size: 26rpx; color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.group { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.gname { font-size: 28rpx; font-weight: 700; color: #4a3f35; margin-bottom: 14rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { font-size: 26rpx; padding: 10rpx 24rpx; border-radius: 30rpx; background: #f3f3f3; color: #6a6058; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .group { background: var(--c-card); }
.dark .gname { color: var(--c-title); }
.dark .chip { background: var(--c-card2); color: var(--c-sub); }
</style>
