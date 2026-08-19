<template>
  <view>
    <!-- 孩子选择条（多娃时显示） -->
    <view class="kid-selector" v-if="me?.kids && me.kids.length > 1">
      <view class="kid-chips">
        <view
          v-for="(kid, idx) in me.kids" :key="kid.studentId"
          class="kid-chip"
          :class="{ active: kid.studentId === activeKidId }"
          :style="{ animationDelay: (idx * 0.06 + 0.3) + 's' }"
          @tap="emit('switch-kid', kid.studentId)"
        >
          <text class="kid-avatar">{{ (kid.studentName || '?').charAt(0) }}</text>
          <text class="kid-name">{{ kid.studentName }}</text>
        </view>
        <view class="compare-btn" @tap="emit('go-compare')" v-if="me.kids.length > 1">
          <text class="compare-icon">📊</text>
          <text class="compare-label">跨娃比对</text>
        </view>
      </view>
    </view>

    <view class="kids" v-if="kids.length">
      <view
        class="kid"
        v-for="(k, idx) in kids"
        :key="k.studentId"
        :style="{ animationDelay: (idx * 0.08 + 0.4) + 's' }"
      >
        <view class="kid-card-inner">
          <view class="kid-card-left">
            <view class="kid-avatar kid-avatar-lg">{{ (k.studentName || '?').charAt(0) }}</view>
          </view>
          <view class="kid-card-right">
            <text class="kn">{{ k.studentName }}<text v-if="k.studentNo" class="sno"> · {{ k.studentNo }}</text></text>
            <text class="kc">{{ k.parentName ? k.parentName + ' · ' : '' }}{{ k.className || k.classId }}</text>
          </view>
        </view>
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
/* ==================== 孩子选择条 ==================== */
.kid-selector {
  padding: 16rpx 16rpx 16rpx 20rpx;
  background: var(--c-card);
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  box-shadow:
    0 4rpx 16rpx rgba(0, 0, 0, 0.04),
    0 1rpx 4rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.kid-chips {
  display: flex;
  gap: 10rpx;
  overflow-x: auto;
  white-space: nowrap;
  align-items: center;
  -webkit-overflow-scrolling: touch;
}

.kid-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx 10rpx 10rpx;
  border-radius: 100rpx;
  font-size: 26rpx;
  background: var(--c-input);
  color: var(--c-sub);
  flex-shrink: 0;
  transition: all 0.25s ease;
  font-weight: 500;
  animation: chipFadeIn 0.4s ease-out both;
}

@keyframes chipFadeIn {
  from { opacity: 0; transform: translateX(12rpx); }
  to { opacity: 1; transform: translateX(0); }
}

.kid-chip.active {
  background: linear-gradient(135deg, var(--c-primary) 0%, #f0b966 100%);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(230, 162, 60, 0.25);
  font-weight: 700;
}

.kid-chip:active {
  transform: scale(0.95);
}

.kid-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe082 0%, #ffcc02 100%);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(255, 193, 7, 0.2);
}

.kid-chip.active .kid-avatar {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  box-shadow: none;
}

.kid-name {
  font-size: 26rpx;
}

.compare-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border-radius: 100rpx;
  font-size: 24rpx;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
  color: #fff;
  margin-left: auto;
  flex-shrink: 0;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(255, 154, 158, 0.25);
  transition: transform 0.15s;
  animation: chipFadeIn 0.4s ease-out 0.35s both;
}

.compare-btn:active {
  transform: scale(0.95);
}

.compare-icon {
  font-size: 26rpx;
}

.compare-label {
  font-size: 24rpx;
}

/* ==================== 孩子卡片 ==================== */
.kids {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.kid {
  width: 100%;
  background: var(--c-card);
  border-radius: 20rpx;
  box-shadow:
    0 4rpx 16rpx rgba(0, 0, 0, 0.04),
    0 1rpx 4rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: kidCardIn 0.5s ease-out both;
}

@keyframes kidCardIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.kid:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.kid-card-inner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
}

.kid-card-left {
  flex-shrink: 0;
}

.kid-card-right {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  flex: 1;
}

.kid-avatar-lg {
  width: 68rpx;
  height: 68rpx;
  font-size: 30rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #4caf50;
  box-shadow: none;
}

.kn {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sno {
  font-size: 22rpx;
  font-weight: 400;
  color: var(--c-sub);
}

.kc {
  font-size: 22rpx;
  color: var(--c-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================== 暗色模式 ==================== */
.dark .kid-selector {
  background: #2a2420;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.dark .kid-chip {
  background: #1e1915;
  color: #a89f91;
}

.dark .kid-chip.active {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(184, 134, 11, 0.3);
}

.dark .compare-btn {
  background: linear-gradient(135deg, #d4818a 0%, #e8b4b8 100%);
  box-shadow: 0 4rpx 12rpx rgba(212, 129, 138, 0.25);
}

.dark .kid {
  background: #2a2420;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.dark .kid-avatar-lg {
  background: linear-gradient(135deg, #2e3b2e 0%, #3d4f3d 100%);
  color: #81c784;
}

.dark .kn { color: #f5efe6; }
.dark .sno { color: #a89f91; }
.dark .kc { color: #a89f91; }

.dark .kid-avatar {
  background: linear-gradient(135deg, #8d6e63 0%, #a1887f 100%);
  box-shadow: 0 2rpx 6rpx rgba(141, 110, 99, 0.25);
}

.dark .kid-chip.active .kid-avatar {
  background: rgba(255, 255, 255, 0.25);
}
</style>
