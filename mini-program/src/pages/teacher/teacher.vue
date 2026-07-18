<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <input v-model="kw" class="search" placeholder="搜索姓名 / 职务 / 电话" />
    <view class="list">
      <view class="t" v-for="t in shown" :key="t.id">
        <text class="av">{{ t.name? t.name[0] : '?' }}</text>
        <view class="info">
          <view class="top">
            <text class="nm">{{ t.name }}</text>
            <text class="pos" v-if="t.position">{{ t.position }}</text>
            <text class="star" v-if="t.isStarred" @click="star(t, false)">⭐</text>
            <text class="star off" v-else @click="star(t, true)">☆</text>
          </view>
          <text class="meta">{{ t.phone || '' }}{{ t.email ? ' · ' + t.email : '' }}</text>
          <text class="rm" v-if="t.remark">{{ t.remark }}</text>
        </view>
        <text class="call" v-if="t.phone" @click="call(t.phone)">拨打</text>
      </view>
      <view class="empty" v-if="!shown.length">无匹配教师</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const kw = ref('')

const shown = computed(() => {
  const k = kw.value.trim().toLowerCase()
  if (!k) return list.value
  return list.value.filter((t) =>
    (t.name || '').toLowerCase().includes(k) ||
    (t.position || '').toLowerCase().includes(k) ||
    (t.phone || '').includes(k)
  )
})

async function load() { list.value = await api.get('/teachers') }
onShow(load)

function call(p) {
  uni.makePhoneCall({ phoneNumber: p, fail: () => {} })
}
async function star(t, v) {
  try { const r = await api.patch('/teachers/' + t.id, { isStarred: v }); t.isStarred = r.isStarred }
  catch (e) { uni.showToast({ title: '失败', icon: 'none' }) }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.search { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; font-size: 28rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.t { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 0; border-bottom: 1px solid #f3f3f3; }
.av { width: 72rpx; height: 72rpx; border-radius: 50%; background: #f7f1e6; color: #a07b3b; text-align: center; line-height: 72rpx; font-size: 32rpx; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 10rpx; }
.nm { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.pos { font-size: 22rpx; color: #a07b3b; background: #f7f1e6; padding: 2rpx 12rpx; border-radius: 16rpx; }
.star { font-size: 30rpx; margin-left: auto; }
.star.off { color: #ccc; }
.meta { font-size: 24rpx; color: #9aa0a6; display: block; }
.rm { font-size: 24rpx; color: #5a5048; display: block; }
.call { font-size: 26rpx; color: #07c160; flex: 0 0 auto; padding: 8rpx 18rpx; border: 1px solid #07c160; border-radius: 30rpx; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .search, .dark .list { background: var(--c-card); }
.dark .nm { color: var(--c-title); }
.dark .rm { color: var(--c-sub); }
.dark .t { border-color: var(--c-input-border); }
.dark .av { background: var(--c-card2); color: var(--c-accent); }
.dark .pos { background: var(--c-card2); color: var(--c-accent); }
</style>
