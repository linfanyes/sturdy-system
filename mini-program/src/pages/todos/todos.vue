<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">✅ 待办</view>
        <view class="sub">记录今日待办，勾选完成</view>
      </view>
      <view class="add" @click="openCreate">+ 新增</view>
    </view>

    <view class="empty" v-if="!list.length">还没有待办事项</view>

    <view class="list" v-else>
      <view class="c" v-for="t in sorted" :key="t.id">
        <view class="box" :class="t.done && 'on'" @click="toggle(t)">{{ t.done ? '✓' : '' }}</view>
        <view class="mid" @click="openEdit(t)">
          <view class="title" :class="t.done && 'done'">{{ t.title }}</view>
          <view class="meta">{{ t.date }}<text v-if="t.note"> · {{ t.note }}</text></view>
        </view>
        <text class="del" @click="del(t)">🗑</text>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑待办' : '新增待办' }}</view>
      <input v-model="form.title" class="inp" placeholder="待办内容" />
      <input v-model="form.note" class="inp" placeholder="备注（选填）" />
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const show = ref(false)
const editing = ref(null)
const form = ref({ title: '', note: '', date: today() })

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const sorted = computed(() => [...list.value].sort((a, b) => {
  if (a.done !== b.done) return a.done ? 1 : -1
  return (a.date || '').localeCompare(b.date || '')
}))

async function load() { list.value = await api.get('/todos') }
onShow(load)

function openCreate() {
  editing.value = null
  form.value = { title: '', note: '', date: today() }
  show.value = true
}
function openEdit(t) {
  editing.value = t
  form.value = { title: t.title, note: t.note || '', date: t.date }
  show.value = true
}
async function toggle(t) {
  try { const r = await api.patch('/todos/' + t.id, { done: !t.done }); t.done = r.done }
  catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
}
async function save() {
  if (!form.value.title.trim()) return uni.showToast({ title: '请填写待办内容', icon: 'none' })
  const payload = { ...form.value }
  try {
    if (editing.value) {
      const r = await api.patch('/todos/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/todos', payload)
      list.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  }
}
function del(t) {
  uni.showModal({ title: '删除', content: '确定删除此待办？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/todos/' + t.id); list.value = list.value.filter((x) => x.id !== t.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 24rpx; color: #9aa0a6; margin-top: 4rpx; }
.add { font-size: 28rpx; color: #fff; background: #07c160; padding: 12rpx 26rpx; border-radius: 40rpx; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 6rpx 24rpx; }
.c { display: flex; align-items: center; gap: 18rpx; padding: 22rpx 0; border-bottom: 1px solid #f3f3f3; }
.box { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26rpx; flex-shrink: 0; }
.box.on { background: #07c160; border-color: #07c160; }
.mid { flex: 1; min-width: 0; }
.title { font-size: 29rpx; color: #4a3f35; }
.title.done { text-decoration: line-through; color: #bbb; }
.meta { font-size: 23rpx; color: #9aa0a6; margin-top: 6rpx; }
.del { font-size: 30rpx; color: #ccc; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.picker { background: #f6f6f6; border-radius: 12rpx; padding: 18rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.mbtns { display: flex; gap: 20rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .list, .dark .modal { background: var(--c-card); }
.dark .c { border-color: var(--c-input-border); }
.dark .title { color: var(--c-title); }
.dark .inp, .dark .picker { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
