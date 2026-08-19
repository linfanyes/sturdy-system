<template>
  <view class="card" v-if="recentNotes.length">
    <view class="card-h" @click="$emit('goCrud', 'notes')">
      <text class="ch-t">📒 最近笔记</text><text class="ch-m">全部 ›</text>
    </view>
    <view v-for="n in recentNotes" :key="n.id" class="li col">
      <view class="li-top">
        <text class="li-t">{{ n.title }}</text>
        <text class="cat" :class="'c-' + catKey(n.category || '其他')">{{ n.category || '其他' }}</text>
      </view>
      <text class="li-s clamp">{{ n.content }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  recentNotes: { type: Array, default: () => [] },
})
defineEmits(['goCrud'])

const catKeyMap = { '教学反思': 'reflection', '班会记录': 'meeting', '学习资料': 'material' }
function catKey(cat) { return catKeyMap[cat] || 'other' }
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-top { display: flex; align-items: center; justify-content: space-between; }
.li-t { flex: 1; color: var(--c-title); }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.c-reflection { background: #fde8ea; color: #e06c75; }
.c-meeting { background: #e8f9e8; color: #07c160; }
.c-material { background: #e8f1fb; color: var(--c-blue); }
.c-other { background: #f7f1e6; color: #a07b3b; }
</style>
