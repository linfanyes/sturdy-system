<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getParentAssignments } from '../../api/assignment'

const items = ref([])

async function load() {
  try {
    const res = await getParentAssignments()
    items.value = (res && res.items) || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
onShow(load)
</script>

<template>
  <view class="page">
    <view class="hd">📚 分层作业</view>
    <view v-if="!items.length" class="empty">暂无作业</view>
    <view v-for="it in items" :key="it.id" class="card">
      <view class="top">
        <text class="subj">{{ it.subject }}</text>
        <text class="title">{{ it.title }}</text>
      </view>
      <view v-if="it.dueDate" class="due">截止：{{ it.dueDate }}</view>
      <view v-if="it.content" class="desc">{{ it.content }}</view>
      <view class="layers">
        <view class="layer base">
          <view class="lh">基础层</view>
          <view class="lc">{{ it.contentBasic || '—' }}</view>
        </view>
        <view class="layer up">
          <view class="lh">提高层</view>
          <view class="lc">{{ it.contentImprove || '—' }}</view>
        </view>
        <view class="layer ext">
          <view class="lh">拓展层</view>
          <view class="lc">{{ it.contentExtend || '—' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; background: #f7f8fa; min-height: 100vh; }
.hd { font-size: 34rpx; font-weight: 700; color: #1f2937; margin: 12rpx 8rpx 20rpx; }
.empty { text-align: center; color: #9ca3af; padding: 80rpx 0; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.top { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.subj { font-size: 22rpx; color: #fff; background: #2563eb; border-radius: 8rpx; padding: 4rpx 12rpx; }
.title { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.due { font-size: 22rpx; color: #d97706; margin-bottom: 6rpx; }
.desc { font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; }
.layers { display: flex; flex-direction: column; gap: 10rpx; }
.layer { border-radius: 12rpx; padding: 14rpx; }
.layer.base { background: #ecfdf5; }
.layer.up { background: #fffbeb; }
.layer.ext { background: #f5f3ff; }
.lh { font-size: 22rpx; font-weight: 600; margin-bottom: 4rpx; }
.layer.base .lh { color: #059669; }
.layer.up .lh { color: #d97706; }
.layer.ext .lh { color: #7c3aed; }
.lc { font-size: 24rpx; color: #374151; }
</style>
