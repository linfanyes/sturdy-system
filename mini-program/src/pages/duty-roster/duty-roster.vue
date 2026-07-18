<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <view class="seg">
      <text class="seg-i" :class="roster && 'on'" @click="loadRoster">排班表</text>
      <text class="seg-i" @click="goConfig">值日配置</text>
    </view>

    <view class="grid" v-if="assignRows.length">
      <view class="row head">
        <view class="cell col">岗位</view>
        <view class="cell col" v-for="d in days" :key="d">{{ d }}</view>
      </view>
      <view class="row" v-for="(r, ri) in assignRows" :key="ri">
        <view class="cell col idx">{{ r.duty }}</view>
        <view class="cell" v-for="(p, pi) in r.people" :key="pi">{{ p || '—' }}</view>
      </view>
    </view>
    <view v-else class="empty">该班暂无排班，请先配置值日</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const classes = ref([])
const classId = ref('')
const roster = ref(null)

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const assignRows = computed(() => {
  if (!roster.value || !roster.value.assignments) return []
  try {
    const a = typeof roster.value.assignments === 'string'
      ? JSON.parse(roster.value.assignments) : roster.value.assignments
    return a || []
  } catch (e) { return [] }
})

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) await loadRoster()
}
async function loadRoster() {
  if (!classId.value) return
  const list = (await api.get('/duty-rosters')).filter((x) => x.classId === classId.value)
  roster.value = list[0] || null
  if (!roster.value) {
    const conf = (await api.get('/class-duty-configs')).filter((x) => x.classId === classId.value)
    if (conf[0]) {
      try {
        const duties = (typeof conf[0].duties === 'string' ? JSON.parse(conf[0].duties) : conf[0].duties) || []
        roster.value = { name: '自动', assignments: duties.map((d) => ({ duty: d, people: ['', '', '', '', '', '', ''] })) }
      } catch (e) {}
    }
  }
}
onShow(load)
function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; loadRoster() }
function goConfig() { uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent('class-duty-configs') }) }
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.seg { display: flex; background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 18rpx; }
.seg-i { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #9aa0a6; }
.seg-i.on { background: #e6a23c; color: #fff; font-weight: 600; }
.grid { border: 1px solid #eee; border-radius: 12rpx; overflow: hidden; }
.row { display: flex; }
.row.head { background: #f7f1e6; }
.cell { flex: 1; min-height: 70rpx; border: 1px solid #f0f0f0; padding: 8rpx; box-sizing: border-box; font-size: 24rpx; display: flex; align-items: center; justify-content: center; text-align: center; }
.cell.col { flex: 0 0 120rpx; background: #f7f1e6; color: #4a3f35; font-weight: 600; }
.empty { text-align: center; color: #9aa0a6; padding: 60rpx 0; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .seg { background: var(--c-card); }
.dark .row.head, .dark .cell.col { background: var(--c-card2); }
.dark .cell { border-color: var(--c-input-border); }
.dark .seg-i { color: var(--c-sub); }
</style>
