<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="filters">
      <text v-for="f in filters" :key="f" class="f" :class="filter === f && 'on'" @click="filter = f">{{ f }}</text>
    </view>

    <view class="stats">
      <text class="s pending">待批改 {{ pending }}</text>
      <text class="s done">已处理 {{ done }}</text>
    </view>

    <view class="list">
      <view class="hw" v-for="h in shown" :key="h.id">
        <view class="top">
          <text class="tt">{{ h.title }}</text>
          <text class="badge" :class="h.status === '已发还' ? 'b-done' : (h.status === '已批改' ? 'b-ok' : 'b-pen')">{{ h.status }}</text>
        </view>
        <view class="meta">{{ h.subject }} · 截止 {{ h.deadline || '—' }}</view>
        <view class="content" v-if="h.content">{{ h.content }}</view>
        <view class="bar">
          <text class="act" @click="setStatus(h, '已批改')" v-if="h.status === '待批改'">标记已批改</text>
          <text class="act" @click="setStatus(h, '已发还')" v-if="h.status !== '已发还'">标记已发还</text>
          <text class="act del" @click="del(h)">删除</text>
        </view>
      </view>
      <view class="empty" v-if="!shown.length">暂无作业</view>
    </view>

    <view class="add" @click="showAdd = !showAdd">+ 新增作业</view>
    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" class="inp" placeholder="作业标题" />
      <input v-model="form.subject" class="inp" placeholder="科目" />
      <textarea v-model="form.content" class="inp area" placeholder="作业内容（可选）" />
      <picker mode="date" :value="form.deadline" @change="(e)=>form.deadline = e.detail.value">
        <view class="picker sm">截止日期：{{ form.deadline || '未设置' }}</view>
      </picker>
      <button class="ok" @click="add">添加</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const filters = ['全部', '待批改', '已批改', '已发还']
const classes = ref([])
const classId = ref('')
const list = ref([])
const filter = ref('全部')
const showAdd = ref(false)
const form = ref({ title: '', subject: '', content: '', deadline: '' })

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const shown = computed(() =>
  list.value.filter((h) => filter.value === '全部' || h.status === filter.value)
)
const pending = computed(() => list.value.filter((h) => h.status === '待批改').length)
const done = computed(() => list.value.filter((h) => h.status === '已批改' || h.status === '已发还').length)

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) await loadList()
}
async function loadList() {
  if (!classId.value) return
  list.value = (await api.get('/homework')).filter((h) => h.classId === classId.value)
}
onShow(load)

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadList()
}

async function setStatus(h, s) {
  try {
    await api.patch('/homework/' + h.id, { status: s })
    h.status = s
    uni.showToast({ title: '已更新', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  }
}
async function del(h) {
  uni.showModal({
    title: '删除作业',
    content: h.title,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/homework/' + h.id)
        list.value = list.value.filter((x) => x.id !== h.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
async function add() {
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  if (!form.value.title) return uni.showToast({ title: '请填标题', icon: 'none' })
  try {
    const r = await api.post('/homework', {
      classId: classId.value,
      title: form.value.title,
      subject: form.value.subject,
      content: form.value.content,
      deadline: form.value.deadline || undefined,
      status: '待批改',
    })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { title: '', subject: '', content: '', deadline: '' }
    uni.showToast({ title: '已添加', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.filters { display: flex; gap: 12rpx; margin-bottom: 14rpx; }
.f { font-size: 26rpx; padding: 10rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.f.on { background: #e6a23c; color: #fff; }
.stats { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.s { font-size: 26rpx; padding: 8rpx 18rpx; border-radius: 20rpx; }
.pending { background: #fff3e0; color: #e6a23c; }
.done { background: #e8f9e8; color: #07c160; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 20rpx; margin-bottom: 20rpx; }
.hw { padding: 18rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; justify-content: space-between; align-items: center; }
.tt { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.badge { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.b-pen { background: #fff3e0; color: #e6a23c; }
.b-ok { background: #e8f1fb; color: #409eff; }
.b-done { background: #e8f9e8; color: #07c160; }
.meta { font-size: 24rpx; color: #9aa0a6; margin: 6rpx 0; }
.content { font-size: 26rpx; color: #5a5048; margin: 6rpx 0; }
.bar { display: flex; gap: 24rpx; margin-top: 8rpx; }
.act { font-size: 26rpx; color: #409eff; }
.act.del { color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.add { text-align: center; color: #e6a23c; font-size: 28rpx; padding: 20rpx; background: #fff8ec; border-radius: 16rpx; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 120rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .list, .dark .sheet, .dark .add { background: var(--c-card); }
.dark .tt { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .meta { color: var(--c-sub); }
.dark .f { background: var(--c-card2); color: var(--c-sub); }
.dark .hw { border-color: var(--c-input-border); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .add { color: var(--c-accent); }
</style>
