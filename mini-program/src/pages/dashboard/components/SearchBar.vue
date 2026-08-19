<template>
  <view>
    <view class="search-bar" :class="query && 'focused'">
      <text class="search-icon">🔍</text>
      <input v-model="query" class="search-inp" placeholder="搜索学生、教师、班级…" confirm-type="search" @confirm="$emit('search')" @focus="focusing = true" @blur="focusing = false" />
      <text v-if="query" class="search-clear press-feedback" @click="clear">×</text>
    </view>
    <view v-if="results" class="search-results">
      <view v-if="results.students?.length" class="search-section">
        <text class="search-section-title">学生（{{ results.students.length }}）</text>
        <view class="search-item slide-in" v-for="(s, i) in results.students" :key="s.id" :style="{ '--i': i }" @click="$emit('goStudent', s)">
          <view class="search-avatar" style="background:linear-gradient(135deg,#e8f9e8,#d4f5d4)">🧒</view>
          <view class="search-info">
            <text class="search-name">{{ s.name }}</text>
            <text class="search-meta">{{ s.studentNo }} · {{ s.className || '' }}</text>
          </view>
        </view>
      </view>
      <view v-if="results.teachers?.length" class="search-section">
        <text class="search-section-title">教师（{{ results.teachers.length }}）</text>
        <view class="search-item slide-in" v-for="(t, i) in results.teachers" :key="t.id" :style="{ '--i': i }">
          <view class="search-avatar" style="background:linear-gradient(135deg,#e8f1fb,#d0e8fb)">👨‍🏫</view>
          <view class="search-info">
            <text class="search-name">{{ t.name }}</text>
            <text class="search-meta">{{ t.username }} · {{ t.subject || '' }}</text>
          </view>
        </view>
      </view>
      <view v-if="results.classes?.length" class="search-section">
        <text class="search-section-title">班级（{{ results.classes.length }}）</text>
        <view class="search-item slide-in" v-for="(c, i) in results.classes" :key="c.id" :style="{ '--i': i }" @click="$emit('goCrud', 'students')">
          <view class="search-avatar" style="background:linear-gradient(135deg,#fff3d6,#ffe0a0)">🏫</view>
          <view class="search-info">
            <text class="search-name">{{ c.name }}</text>
            <text class="search-meta">{{ c.grade || '' }}</text>
          </view>
        </view>
      </view>
      <view v-if="!results.students?.length && !results.teachers?.length && !results.classes?.length" class="search-empty">
        <text class="search-empty-icon">🔍</text>
        <text>没有找到匹配结果</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  searchQuery: { type: String, default: '' },
  searchResults: { type: Object, default: null },
})
const emit = defineEmits(['update:searchQuery', 'search', 'goStudent', 'goCrud'])

const query = ref(props.searchQuery)
const focusing = ref(false)
watch(() => props.searchQuery, (v) => { query.value = v })
watch(query, (v) => { emit('update:searchQuery', v) })

function clear() { query.value = ''; emit('update:searchQuery', '') }
</script>

<style scoped>
.search-bar { position: relative; margin-bottom: 12rpx; display: flex; align-items: center; background: var(--c-input); border: 2rpx solid var(--c-border); border-radius: 40rpx; padding: 0 24rpx; transition: all 0.2s; }
.search-bar.focused { border-color: var(--c-primary); box-shadow: 0 0 0 4rpx rgba(245,179,66,0.15); }
.search-icon { font-size: 26rpx; margin-right: 10rpx; }
.search-inp { flex: 1; padding: 16rpx 0; font-size: 26rpx; color: var(--c-text); }
.search-clear { font-size: 32rpx; color: var(--c-sub); width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--c-border); }
.search-results { background: var(--c-card); border-radius: 20rpx; padding: 14rpx 20rpx; margin-bottom: 14rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.search-section { margin-bottom: 10rpx; }
.search-section-title { font-size: 22rpx; font-weight: 600; color: var(--c-sub); margin-bottom: 6rpx; display: block; }
.search-item { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.search-item:last-child { border-bottom: none; }
.search-avatar { width: 48rpx; height: 48rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; flex-shrink: 0; }
.search-info { flex: 1; }
.search-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.search-meta { font-size: 22rpx; color: var(--c-sub); }
.search-empty { text-align: center; padding: 30rpx 0; font-size: 24rpx; color: var(--c-sub); display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.search-empty-icon { font-size: 40rpx; opacity: 0.4; }
.slide-in { animation: slide-right 0.3s ease-out both; animation-delay: calc(var(--i, 0) * 0.06s); }
.press-feedback { transition: transform 0.15s; }
.press-feedback:active { transform: scale(0.9); }
@keyframes slide-right { from { opacity: 0; transform: translateX(-15rpx); } to { opacity: 1; transform: translateX(0); } }
</style>
