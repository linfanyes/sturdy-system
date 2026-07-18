<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <text class="add" @click="showAdd = !showAdd">+ 新增成长记录</text>
    </view>

    <view class="timeline">
      <view class="item" v-for="(g, i) in sorted" :key="g.id">
        <view class="dot"></view>
        <view class="card">
          <view class="top">
            <text class="stu">{{ g.studentName }}</text>
            <text class="type">{{ g.type || '记录' }}</text>
            <text class="date">{{ g.date }}</text>
          </view>
          <view class="tt">{{ g.title }}</view>
          <view class="ct" v-if="g.content">{{ g.content }}</view>
          <text class="del" @click="del(g)">删除</text>
        </view>
      </view>
      <view class="empty" v-if="!sorted.length">暂无成长记录</view>
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.studentName" class="inp" placeholder="学生姓名" />
      <input v-model="form.title" class="inp" placeholder="标题" />
      <input v-model="form.type" class="inp" placeholder="类型（如 获奖/进步/特长）" />
      <picker mode="date" :value="form.date" @change="(e)=>form.date = e.detail.value">
        <view class="picker sm">日期：{{ form.date || '今天' }}</view>
      </picker>
      <textarea v-model="form.content" class="inp area" placeholder="内容（可选）" />
      <button class="ok" @click="add">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const showAdd = ref(false)
const form = ref({ studentName: '', title: '', type: '', date: '', content: '' })

const sorted = computed(() =>
  [...list.value].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

async function load() {
  list.value = await api.get('/growth-entries')
}
onShow(load)

async function add() {
  if (!form.value.studentName || !form.value.title)
    return uni.showToast({ title: '请填学生和标题', icon: 'none' })
  try {
    const r = await api.post('/growth-entries', { ...form.value })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { studentName: '', title: '', type: '', date: '', content: '' }
    uni.showToast({ title: '已添加', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  }
}
async function del(g) {
  uni.showModal({ title: '删除', content: g.title, success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/growth-entries/' + g.id); list.value = list.value.filter((x) => x.id !== g.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { text-align: right; margin-bottom: 16rpx; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.timeline { position: relative; padding-left: 30rpx; }
.item { position: relative; padding-bottom: 24rpx; }
.dot { position: absolute; left: -22rpx; top: 24rpx; width: 18rpx; height: 18rpx; border-radius: 50%; background: #e6a23c; }
.card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; }
.top { display: flex; align-items: center; gap: 12rpx; }
.stu { font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.type { font-size: 22rpx; color: #a07b3b; background: #f7f1e6; padding: 2rpx 12rpx; border-radius: 16rpx; }
.date { font-size: 22rpx; color: #9aa0a6; margin-left: auto; }
.tt { font-size: 30rpx; color: #333; margin: 10rpx 0; font-weight: 600; }
.ct { font-size: 26rpx; color: #5a5048; white-space: pre-wrap; }
.del { font-size: 24rpx; color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 110rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .card, .dark .sheet { background: var(--c-card); }
.dark .stu { color: var(--c-title); }
.dark .tt { color: var(--c-text); }
.dark .ct { color: var(--c-sub); }
.dark .type { background: var(--c-card2); color: var(--c-accent); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
