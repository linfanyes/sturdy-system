<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">📄 试卷查询</view>

    <view class="bar">
      <text class="sc" v-if="list.length">共 {{ list.length }} 份试卷</text>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!list.length" icon="📄" text="暂无试卷" hint="使用 AI 组卷功能生成试卷" />

    <view v-else class="list">
      <view class="item" v-for="it in list" :key="it.id" @click="openDetail(it)">
        <view class="it-top">
          <text class="it-title">{{ it.title || '未命名试卷' }}</text>
          <text class="it-time">{{ fmt(it.createdAt) }}</text>
        </view>
        <view class="it-sub" v-if="it.subject">科目：{{ it.subject }}</view>
        <view class="it-sub" v-if="it.grade">年级：{{ it.grade }}</view>
        <view class="it-sub" v-if="it.totalScore != null">总分：{{ it.totalScore }} 分</view>
      </view>
    </view>

    <!-- 详情弹窗 -->
    <view v-if="detail" class="mask" @click="detail = null">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ detail.title || '未命名试卷' }}</view>
        <view class="sh-meta">
          <text v-if="detail.subject">科目：{{ detail.subject }}</text>
          <text v-if="detail.grade">年级：{{ detail.grade }}</text>
          <text v-if="detail.totalScore != null">总分：{{ detail.totalScore }} 分</text>
          <text>{{ fmt(detail.createdAt) }}</text>
        </view>
        <view class="sh-content" v-if="detail.content">{{ detail.content }}</view>
        <view class="sh-content" v-else style="color:var(--c-sub); text-align:center;">暂无详细内容</view>
        <button class="btn cancel" @click="detail = null">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listPapers } from '@/api/ai-generated'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const list = ref([])
const loading = ref(false)
const detail = ref(null)

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d.getTime())) return ''
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

async function load() {
  loading.value = true
  try {
    const arr = await listPapers().catch(() => [])
    list.value = Array.isArray(arr) ? arr : (arr.items || [])
  } catch (e) { list.value = [] } finally { loading.value = false }
}

function openDetail(it) {
  detail.value = it
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); margin-bottom: 16rpx; }
.bar { margin-bottom: 14rpx; }
.sc { font-size: 24rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; justify-content: space-between; align-items: center; }
.it-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); flex: 1; }
.it-time { font-size: 22rpx; color: var(--c-sub); }
.it-sub { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; }
.loading { text-align: center; padding: 40rpx 0; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 85vh; overflow-y: auto; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 8rpx; text-align: center; }
.sh-meta { display: flex; gap: 20rpx; font-size: 24rpx; color: var(--c-sub); margin-bottom: 16rpx; justify-content: center; flex-wrap: wrap; }
.sh-content { font-size: 28rpx; color: var(--c-title); line-height: 1.8; white-space: pre-wrap; padding: 20rpx; background: var(--c-card2); border-radius: 12rpx; margin-bottom: 16rpx; }
.btn { width: 100%; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>