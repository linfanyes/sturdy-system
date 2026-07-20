<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">📓 工作日志</view>
        <view class="sub">记录每日教学工作，回顾与反思</view>
      </view>
      <view class="add" @click="openCreate">+ 新增</view>
    </view>

    <view class="stats" v-if="list.length">
      <view class="st"><text class="n">{{ list.length }}</text><text class="l">篇日志</text></view>
      <view class="st"><text class="n">{{ totalClasses }}</text><text class="l">节课</text></view>
      <view class="st"><text class="n">{{ totalHomework }}</text><text class="l">份作业</text></view>
    </view>

    <view class="empty" v-if="!list.length">还没有工作日志，记录每天的教学工作</view>

    <view class="list" v-else>
      <view class="c" v-for="l in list" :key="l.id">
        <view class="top">
          <text class="date">{{ l.date }}</text>
          <view class="acts">
            <text class="a" @click="openEdit(l)">编辑</text>
            <text class="a del" @click="del(l)">删除</text>
          </view>
        </view>
        <view class="tags" v-if="l.classCount || l.homeworkCount">
          <text class="tag" v-if="l.classCount">{{ l.classCount }} 节课</text>
          <text class="tag b" v-if="l.homeworkCount">批改 {{ l.homeworkCount }} 份</text>
        </view>
        <view class="content">{{ l.content }}</view>
        <view class="note" v-if="l.note">💡 {{ l.note }}</view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑工作日志' : '新增工作日志' }}</view>
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <view class="row">
        <view class="col">
          <text class="lab2">上课节数</text>
          <input v-model="form.classCount" type="number" class="inp" />
        </view>
        <view class="col">
          <text class="lab2">批改作业数</text>
          <input v-model="form.homeworkCount" type="number" class="inp" />
        </view>
      </view>
      <textarea v-model="form.content" class="inp area" placeholder="今天的主要工作内容..."></textarea>
      <input v-model="form.note" class="inp" placeholder="备注 / 反思（选填）" />

      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中…' : '保存' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const show = ref(false)
const editing = ref(null)
const form = ref({ date: today(), classCount: 0, homeworkCount: 0, content: '', note: '' })
const saving = ref(false)

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const totalClasses = computed(() => list.value.reduce((s, l) => s + (l.classCount || 0), 0))
const totalHomework = computed(() => list.value.reduce((s, l) => s + (l.homeworkCount || 0), 0))

async function load() {
  const arr = await api.getList('/work-logs', { loading: true, loadingText: '加载工作日志' })
  arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  list.value = arr
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function openCreate() {
  editing.value = null
  form.value = { date: today(), classCount: 0, homeworkCount: 0, content: '', note: '' }
  show.value = true
}
function openEdit(l) {
  editing.value = l
  form.value = { date: l.date, classCount: l.classCount || 0, homeworkCount: l.homeworkCount || 0, content: l.content, note: l.note || '' }
  show.value = true
}
async function save() {
  if (saving.value) return
  if (!form.value.content.trim()) return uni.showToast({ title: '请填写工作内容', icon: 'none' })
  saving.value = true
  const payload = {
    date: form.value.date,
    classCount: Number(form.value.classCount) || 0,
    homeworkCount: Number(form.value.homeworkCount) || 0,
    content: form.value.content,
    note: form.value.note,
  }
  try {
    if (editing.value) {
      const r = await api.patch('/work-logs/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/work-logs', payload)
      list.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
function del(l) {
  uni.showModal({ title: '删除', content: '确定删除此条工作日志？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/work-logs/' + l.id); list.value = list.value.filter((x) => x.id !== l.id) }
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
.stats { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.st { flex: 1; background: #fff; border-radius: 16rpx; padding: 20rpx 0; text-align: center; }
.n { display: block; font-size: 40rpx; font-weight: 800; color: #e6a23c; }
.l { font-size: 22rpx; color: #9aa0a6; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.c { padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; align-items: center; justify-content: space-between; }
.date { font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.acts { display: flex; gap: 28rpx; }
.a { font-size: 26rpx; color: #409eff; }
.a.del { color: #e06c75; }
.tags { display: flex; gap: 12rpx; margin: 10rpx 0; }
.tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; background: #fff3e0; color: #e6a23c; }
.tag.b { background: #e8f1fb; color: #409eff; }
.content { font-size: 27rpx; color: #5a5048; white-space: pre-wrap; }
.note { font-size: 24rpx; color: #a07b3b; margin-top: 8rpx; font-style: italic; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 90vh; overflow-y: auto; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.picker { background: #f6f6f6; border-radius: 12rpx; padding: 18rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.row { display: flex; gap: 16rpx; margin-bottom: 14rpx; }
.col { flex: 1; }
.lab2 { font-size: 24rpx; color: #9aa0a6; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-top: 10rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 200rpx; margin-top: 0; }
.mbtns { display: flex; gap: 20rpx; margin-top: 14rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.mb.disabled { opacity: 0.5; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .st, .dark .list, .dark .modal { background: var(--c-card); }
.dark .date { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .c { border-color: var(--c-input-border); }
.dark .inp, .dark .picker { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
