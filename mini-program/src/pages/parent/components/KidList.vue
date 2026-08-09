<template>
  <view>
    <!-- 孩子选择条（多娃时显示） -->
    <view class="kid-selector" v-if="me?.kids && me.kids.length > 1">
      <view class="kid-chips">
        <view
          v-for="kid in me.kids" :key="kid.studentId"
          class="kid-chip"
          :class="{ active: kid.studentId === activeKidId }"
          @tap="emit('switch-kid', kid.studentId)"
        >
          {{ kid.studentName }}
        </view>
        <view class="compare-btn" @tap="emit('go-compare')" v-if="me.kids.length > 1">📊 跨娃比对</view>
      </view>
    </view>

    <view class="kids" v-if="kids.length">
      <view class="kid" v-for="k in kids" :key="k.studentId">
        <view class="kn">{{ k.studentName }}<text v-if="k.studentNo" class="sno"> · {{ k.studentNo }}</text></view>
        <view class="kc">{{ k.parentName ? k.parentName + ' · ' : '' }}{{ k.className || '班级 ' + k.classId }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  me: { type: Object, default: null },
  kids: { type: Array, default: () => [] },
  activeKidId: { type: String, default: '' },
})
defineEmits(['switch-kid', 'go-compare'])
</script>

<style scoped>
.kid-selector { padding: 8rpx 0 8rpx 16rpx; background: var(--c-card); border-bottom: 1rpx solid #f0f0f0; border-radius: 14rpx; margin-bottom: 10rpx; }
.kid-chips { display: flex; gap: 12rpx; overflow-x: auto; white-space: nowrap; align-items: center; }
.kid-chip { padding: 6rpx 20rpx; border-radius: 100rpx; font-size: 26rpx; background: #f5f5f5; color: #666; flex-shrink: 0; }
.kid-chip.active { background: var(--c-primary); color: #fff; }
.compare-btn { padding: 6rpx 20rpx; border-radius: 100rpx; font-size: 26rpx; background: #E6A23C; color: #fff; margin-left: auto; flex-shrink: 0; }
.kids { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.kid { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; }
.kn { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.sno { font-size: 22rpx; font-weight: 400; color: var(--c-sub); }
.kc { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
</style>
