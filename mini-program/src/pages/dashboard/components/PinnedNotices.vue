<template>
  <view class="card" v-if="pinnedNotices.length">
    <view class="card-h" @click="$emit('goCrud', 'notices')">
      <text class="ch-t">📢 班级公告</text><text class="ch-m">全部 ›</text>
    </view>
    <view v-for="n in pinnedNotices" :key="n.id" class="li col bord">
      <text class="li-t">{{ n.title }}</text>
      <text class="li-s clamp">{{ n.content }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  pinnedNotices: { type: Array, default: () => [] },
})
defineEmits(['goCrud'])
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-t { flex: 1; color: var(--c-title); }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bord { border-left: 6rpx solid var(--c-danger); padding-left: 14rpx; }
</style>
