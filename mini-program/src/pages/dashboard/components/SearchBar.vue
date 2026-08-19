<template>
  <view>
    <view class="search-bar">
      <input v-model="query" class="search-inp" placeholder="🔍 搜索学生、教师、班级…" confirm-type="search" @confirm="$emit('search')" />
      <text v-if="query" class="search-clear" @click="clear">×</text>
    </view>
    <view v-if="results" class="search-results">
      <view v-if="results.students?.length" class="search-section">
        <text class="search-section-title">学生（{{ results.students.length }}）</text>
        <view class="search-item" v-for="s in results.students" :key="s.id" @click="$emit('goStudent', s)">
          <text class="search-name">{{ s.name }}</text>
          <text class="search-meta">{{ s.studentNo }} · {{ s.className || '' }}</text>
        </view>
      </view>
      <view v-if="results.teachers?.length" class="search-section">
        <text class="search-section-title">教师（{{ results.teachers.length }}）</text>
        <view class="search-item" v-for="t in results.teachers" :key="t.id">
          <text class="search-name">{{ t.name }}</text>
          <text class="search-meta">{{ t.username }} · {{ t.subject || '' }}</text>
        </view>
      </view>
      <view v-if="results.classes?.length" class="search-section">
        <text class="search-section-title">班级（{{ results.classes.length }}）</text>
        <view class="search-item" v-for="c in results.classes" :key="c.id" @click="$emit('goCrud', 'students')">
          <text class="search-name">{{ c.name }}</text>
          <text class="search-meta">{{ c.grade || '' }}</text>
        </view>
      </view>
      <view v-if="!results.students?.length && !results.teachers?.length && !results.classes?.length" class="search-empty">
        没有找到匹配结果
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, inject, watch } from 'vue'

const props = defineProps({
  searchQuery: { type: String, default: '' },
  searchResults: { type: Object, default: null },
})
const emit = defineEmits(['update:searchQuery', 'search', 'goStudent', 'goCrud'])

const query = ref(props.searchQuery)
watch(() => props.searchQuery, (v) => { query.value = v })
watch(query, (v) => { emit('update:searchQuery', v) })

function clear() { query.value = ''; emit('update:searchQuery', '') }
</script>

<style scoped>
.search-bar { position: relative; margin-bottom: 12rpx; }
.search-inp { width: 100%; border: 1px solid var(--c-border); border-radius: 40rpx; padding: 16rpx 60rpx 16rpx 30rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; }
.search-clear { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 32rpx; color: var(--c-sub); }
.search-results { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; margin-bottom: 14rpx; }
.search-section { margin-bottom: 10rpx; }
.search-section-title { font-size: 22rpx; font-weight: 600; color: var(--c-sub); margin-bottom: 6rpx; display: block; }
.search-item { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.search-item:last-child { border-bottom: none; }
.search-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.search-meta { font-size: 22rpx; color: var(--c-sub); }
.search-empty { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: var(--c-sub); }
</style>
