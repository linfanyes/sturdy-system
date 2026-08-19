<template>
  <view class="card notes-card" v-if="recentNotes.length">
    <view class="card-h press-feedback" @click="$emit('goCrud', 'notes')">
      <view class="notes-title-row">
        <view class="notes-ic">📒</view>
        <text class="ch-t">最近笔记</text>
      </view>
      <text class="ch-m">全部 ›</text>
    </view>
    <view v-for="(n, i) in recentNotes" :key="n.id" class="li col slide-in" :style="{ '--i': i }">
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
.notes-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.notes-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(245,179,66,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.notes-title-row { display: flex; align-items: center; gap: 12rpx; }
.notes-ic { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: linear-gradient(135deg, #fde8ea, #fbd4da); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-top { display: flex; align-items: center; justify-content: space-between; }
.li-t { flex: 1; color: var(--c-title); font-weight: 600; }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.c-reflection { background: #fde8ea; color: #e06c75; }
.c-meeting { background: #e8f9e8; color: #07c160; }
.c-material { background: #e8f1fb; color: var(--c-blue); }
.c-other { background: #f7f1e6; color: #a07b3b; }
.slide-in { animation: slide-right 0.4s ease-out both; animation-delay: calc(var(--i, 0) * 0.08s); }
.press-feedback { transition: transform 0.15s; }
.press-feedback:active { transform: scale(0.98); }
@keyframes slide-right { from { opacity: 0; transform: translateX(-20rpx); } to { opacity: 1; transform: translateX(0); } }
</style>
