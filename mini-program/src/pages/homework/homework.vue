<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view class="hleft">
        <text class="emoji">📝</text>
        <view>
          <text class="ht">作业管理</text>
          <view class="stats">
            <text>共 <b>{{ total }}</b></text>
            <text>待批改 <b class="p">{{ pending }}</b></text>
            <text>已完成 <b class="d">{{ done }}</b></text>
          </view>
        </view>
      </view>
      <text class="add" @click="openCreate">+ 布置</text>
    </view>

    <view class="filterbar">
      <label class="chk"><checkbox :checked="onlyMine" @change="(e) => (onlyMine = e.detail.value)" color="#e6a23c" /> 只看我的任课</label>
      <picker :range="classLabels" @change="onClass"><view class="picker sm">{{ classLabel }}</view></picker>
      <picker :range="subLabels" @change="onSub"><view class="picker sm">{{ subLabel }}</view></picker>
      <picker :range="statusOpts" @change="(e) => (filterStatus = statusOpts[e.detail.value])"><view class="picker sm">{{ filterStatus }}</view></picker>
      <picker :range="sortOpts" @change="(e) => (sortBy = sortVals[e.detail.value])"><view class="picker sm">{{ sortLabel }}</view></picker>
    </view>

    <view class="groups">
      <view class="group" v-for="g in grouped" :key="g.classId">
        <view class="ghead" @click="toggle(g.classId)">
          <text class="arr">{{ collapsed.has(g.classId) ? '▶' : '▼' }}</text>
          <text class="gn">{{ g.className }}</text>
          <text class="gc">{{ g.list.length }} 项</text>
          <text class="gadd" @click.stop="quickAssign(g.classId)">+ 布置</text>
        </view>
        <view v-if="!collapsed.has(g.classId)">
          <view class="hw" v-for="h in g.list" :key="h.id">
            <view class="top">
              <text class="badge" :class="badgeCls(h.status)">{{ h.status }}</text>
              <text class="sub">{{ h.subject }}</text>
              <text class="tt">{{ h.title }}</text>
            </view>
            <text class="content" v-if="h.content">{{ h.content }}</text>
            <view class="meta">{{ h.startDate || '—' }} ~ {{ h.deadline || '—' }}</view>
            <view class="acts">
              <text class="a" v-if="h.status === '待批改'" @click="quickDone(h)">标记已批改</text>
              <text class="a" @click="openEdit(h)">编辑</text>
              <text class="a del" @click="del(h)">删除</text>
            </view>
          </view>
        </view>
      </view>
      <EmptyState v-if="!grouped.length" icon="📚" text="暂无作业" hint="点击下方按钮布置第一次作业" />
    </view>

    <view class="sheet" v-if="showAdd">
      <picker :range="classLabels" @change="onClassForm"><view class="picker sm">班级：{{ formClassLabel }}</view></picker>
      <picker :range="subOpts" @change="(e) => (form.subject = subOpts[e.detail.value])"><view class="picker sm">学科：{{ form.subject || '语文' }}</view></picker>
      <picker mode="date" :value="form.startDate" @change="(e) => (form.startDate = e.detail.value)"><view class="picker sm">开始：{{ form.startDate }}</view></picker>
      <picker mode="date" :value="form.deadline" @change="(e) => (form.deadline = e.detail.value)"><view class="picker sm">截止：{{ form.deadline }}</view></picker>
      <input v-model="form.title" class="inp" placeholder="作业标题 *" />
      <textarea v-model="form.content" class="inp area" placeholder="具体内容 *" />
      <view class="status-row">
        <text class="st" v-for="s in ['待批改', '已批改', '已发还']" :key="s" :class="form.status === s && 'on'" @click="form.status = s">{{ s }}</text>
      </view>
      <button class="ok" @click="save">{{ editing ? '保存' : '布置' }}</button>
      <button class="cancel" @click="showAdd = false">取消</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme, auth } from '../../common/store'

const FALLBACK = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '综合实践', '信息技术', '劳动', '阅读', '午自习', '课后服务']
const statusOpts = ['全部', '待批改', '已批改', '已发还']
const sortOpts = ['按截止日期', '按布置时间', '按班级']
const sortVals = ['deadline', 'createdAt', 'classId']

const classes = ref([])
const all = ref([])
const onlyMine = ref(false)
const classFilter = ref('')
const subFilter = ref('所有学科')
const filterStatus = ref('全部')
const sortBy = ref('deadline')
const showAdd = ref(false)
const editing = ref(null)
const collapsed = ref(new Set())
const form = ref({ classId: '', subject: '语文', startDate: '', deadline: '', title: '', content: '', status: '待批改' })

const classLabels = computed(() => ['所有班级', ...classes.value.map((c) => c.name)])
const classValues = computed(() => ['', ...classes.value.map((c) => c.id)])
const classLabel = computed(() => {
  const i = classValues.value.indexOf(classFilter.value)
  return i >= 0 ? classLabels.value[i] : '所有班级'
})
const subs = computed(() => Array.from(new Set(all.value.map((h) => h.subject).filter(Boolean))).concat(FALLBACK).filter((v, i, a) => a.indexOf(v) === i))
const subLabels = computed(() => ['所有学科', ...subs.value])
const subLabel = computed(() => subFilter.value || '所有学科')
const sortLabel = computed(() => sortOpts[sortVals.indexOf(sortBy.value)])
const subOpts = computed(() => subs.value)

const classMap = computed(() => {
  const m = {}
  classes.value.forEach((c) => (m[c.id] = c.name))
  return m
})
const myClassIds = computed(() => {
  const name = auth.user && auth.user.name
  if (!name) return []
  return classes.value.filter((c) => c.headTeacher === name).map((c) => c.id)
})

const filtered = computed(() => {
  let arr = [...all.value]
  if (onlyMine.value && myClassIds.value.length) arr = arr.filter((h) => myClassIds.value.includes(h.classId))
  if (classFilter.value) arr = arr.filter((h) => h.classId === classFilter.value)
  if (subFilter.value !== '所有学科') arr = arr.filter((h) => h.subject === subFilter.value)
  if (filterStatus.value !== '全部') arr = arr.filter((h) => h.status === filterStatus.value)
  arr.sort((a, b) => {
    if (sortBy.value === 'deadline') return (b.deadline || '').localeCompare(a.deadline || '')
    if (sortBy.value === 'createdAt') return (b.createdAt || '').localeCompare(a.createdAt || '')
    return (a.classId + a.subject).localeCompare(b.classId + b.subject)
  })
  return arr
})
const grouped = computed(() => {
  const m = new Map()
  for (const h of filtered.value) {
    if (!m.has(h.classId)) m.set(h.classId, [])
    m.get(h.classId).push(h)
  }
  return Array.from(m.entries()).map(([cid, list]) => ({ classId: cid, className: classMap.value[cid] || '已删除班级', list }))
})
const total = computed(() => filtered.value.length)
const pending = computed(() => filtered.value.filter((h) => h.status === '待批改').length)
const done = computed(() => filtered.value.filter((h) => h.status === '已批改' || h.status === '已发还').length)

function badgeCls(s) {
  return s === '已发还' ? 'b-done' : s === '已批改' ? 'b-ok' : 'b-pen'
}
function onClass(e) {
  classFilter.value = classValues.value[e.detail.value]
}
function onSub(e) {
  subFilter.value = subLabels.value[e.detail.value]
}
function onClassForm(e) {
  form.value.classId = classValues.value[e.detail.value]
}
const formClassLabel = computed(() => {
  const i = classValues.value.indexOf(form.value.classId)
  return i >= 0 ? classLabels.value[i] : '请选择班级'
})
function toggle(cid) {
  const s = new Set(collapsed.value)
  s.has(cid) ? s.delete(cid) : s.add(cid)
  collapsed.value = s
}

async function load() {
  // 并行加载 + 各自兜底，避免 classes 失败导致作业列表也不渲染
  const [cls, hw] = await Promise.all([
    api.getList('/classes', { silent: true }),
    api.getList('/homework', { loading: true, loadingText: '加载作业' }),
  ])
  classes.value = cls
  all.value = hw
  if (!form.value.classId && classes.value[0]) form.value.classId = classes.value[0].id
}
onShow(load)

function openCreate() {
  editing.value = null
  const cid = classFilter.value || (classes.value[0] && classes.value[0].id) || ''
  form.value = {
    classId: cid,
    subject: '语文',
    startDate: today(),
    deadline: after(3),
    title: '',
    content: '',
    status: '待批改',
  }
  showAdd.value = true
}
function quickAssign(cid) {
  editing.value = null
  form.value = { classId: cid, subject: '语文', startDate: today(), deadline: after(3), title: '', content: '', status: '待批改' }
  showAdd.value = true
}
function openEdit(h) {
  editing.value = h
  form.value = { ...h }
  showAdd.value = true
}
async function save() {
  if (!form.value.classId) return uni.showToast({ title: '请选择班级', icon: 'none' })
  if (!form.value.title.trim()) return uni.showToast({ title: '请填标题', icon: 'none' })
  if (!form.value.content.trim()) return uni.showToast({ title: '请填内容', icon: 'none' })
  if (form.value.deadline && form.value.startDate && form.value.deadline < form.value.startDate)
    return uni.showToast({ title: '截止不能早于开始', icon: 'none' })
  try {
    if (editing.value) {
      const prev = editing.value.status
      await api.patch('/homework/' + editing.value.id, { ...form.value })
      if (form.value.status === '已发还' && prev !== '已发还') await makeNotice(form.value)
    } else {
      await api.post('/homework', { ...form.value })
    }
    showAdd.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
    load()
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  }
}
async function makeNotice(h) {
  try {
    const cls = classMap.value[h.classId]
    await api.post('/notices', {
      classId: h.classId,
      title: `${h.title} 已发还`,
      content: `${cls || ''}的「${h.title}」作业已发还，请同学们查收。`,
      pinned: false,
      ended: false,
    })
  } catch (e) {}
}
async function quickDone(h) {
  try {
    await api.patch('/homework/' + h.id, { status: '已批改' })
    h.status = '已批改'
    uni.showToast({ title: '已标记已批改', icon: 'none' })
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
        all.value = all.value.filter((x) => x.id !== h.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
function today() {
  return new Date().toISOString().slice(0, 10)
}
function after(n) {
  const d = new Date(Date.now() + n * 864e5)
  return d.toISOString().slice(0, 10)
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; }
.hleft { display: flex; align-items: center; gap: 16rpx; }
.emoji { font-size: 44rpx; }
.ht { display: block; font-size: 32rpx; font-weight: 800; color: #4a3f35; }
.stats { font-size: 22rpx; color: #9aa0a6; margin-top: 4rpx; display: flex; gap: 14rpx; }
.stats b { color: #e6a23c; }
.stats b.p { color: #e6a23c; }
.stats b.d { color: #07c160; }
.add { font-size: 26rpx; color: #e6a23c; font-weight: 700; background: #fff8ec; padding: 12rpx 22rpx; border-radius: 30rpx; }
.filterbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10rpx; background: #fff; border-radius: 16rpx; padding: 14rpx 18rpx; margin-bottom: 14rpx; }
.chk { font-size: 24rpx; color: #5a5048; display: flex; align-items: center; }
.picker.sm { border: 1px solid #eee; border-radius: 30rpx; padding: 10rpx 20rpx; font-size: 24rpx; background: #fff; }
.groups { background: #fff; border-radius: 16rpx; overflow: hidden; }
.group { border-bottom: 1rpx solid #f3f3f3; }
.group:last-child { border-bottom: none; }
.ghead { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 24rpx; }
.arr { font-size: 22rpx; color: #9aa0a6; }
.gn { font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.gc { font-size: 20rpx; color: #999; background: #f3f3f3; padding: 4rpx 12rpx; border-radius: 16rpx; }
.gadd { margin-left: auto; font-size: 22rpx; color: #e6a23c; }
.hw { padding: 18rpx 24rpx; border-top: 1rpx solid #f6f6f6; }
.top { display: flex; align-items: center; gap: 10rpx; }
.badge { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; }
.b-pen { background: #fff3e0; color: #e6a23c; }
.b-ok { background: #e8f1fb; color: #409eff; }
.b-done { background: #e8f9e8; color: #07c160; }
.sub { font-size: 20rpx; color: #a07b3b; background: #fff3e0; padding: 4rpx 12rpx; border-radius: 16rpx; }
.tt { font-size: 28rpx; font-weight: 700; color: #4a3f35; flex: 1; }
.content { display: block; font-size: 24rpx; color: #5a5048; margin: 8rpx 0; white-space: pre-wrap; }
.meta { font-size: 22rpx; color: #9aa0a6; }
.acts { display: flex; gap: 22rpx; margin-top: 8rpx; }
.a { font-size: 24rpx; color: #409eff; }
.a.del { color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 130rpx; }
.status-row { display: flex; gap: 12rpx; margin-bottom: 14rpx; }
.st { font-size: 24rpx; padding: 12rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.st.on { background: #e6a23c; color: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
.cancel { background: #f3f3f3; color: #666; border-radius: 50rpx; margin-top: 14rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .head, .dark .filterbar, .dark .groups, .dark .sheet { background: var(--c-card); }
.dark .ht { color: var(--c-title); }
.dark .tt { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .meta { color: var(--c-sub); }
.dark .group { border-color: var(--c-input-border); }
.dark .hw { border-color: var(--c-input-border); }
.dark .gc { background: var(--c-card2); color: var(--c-sub); }
.dark .picker.sm, .dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .ok { background: #07c160; }
.dark .cancel { background: var(--c-card2); color: var(--c-sub); }
.dark .st { background: var(--c-card2); color: var(--c-sub); }
</style>
