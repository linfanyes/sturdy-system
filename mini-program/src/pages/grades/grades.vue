<template>
  <view class="page">
    <view class="list">
      <view v-for="g in list" :key="g.id" class="item">
        <view class="top">
          <text class="name">{{ g.examName }} · {{ g.subject }}</text>
          <text class="avg">均分 {{ avg(g) }}</text>
        </view>
        <view class="meta">已录 {{ doneCount(g) }} / {{ g.scores.length }} 人</view>
      </view>
      <view v-if="!list.length" class="empty">暂无成绩记录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'

const list = ref([])
async function load() {
  list.value = await api.get('/grades')
}
onShow(load)

function scores(g) {
  return (g.scores || []).filter((x) => x.score != null).map((x) => x.score)
}
function avg(g) {
  const s = scores(g)
  return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '-'
}
function doneCount(g) {
  return (g.scores || []).filter((x) => x.score != null).length
}
</script>

<style scoped>
.page { padding: 30rpx; }
.item { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; }
.avg { color: #e6a23c; font-size: 28rpx; }
.meta { color: #9aa0a6; font-size: 26rpx; margin-top: 8rpx; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
</style>
