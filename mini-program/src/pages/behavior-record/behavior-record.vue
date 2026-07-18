<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view class="h">👀 行为观察记录</view>
      <view class="sub">课堂行为追踪，及时发现学生的积极表现</view>
    </view>

    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <scroll-view scroll-x class="chips">
      <text v-for="t in ['全部', ...types]" :key="t" class="chip" :class="[filterBehavior === t && 'on']" @click="filterBehavior = t">{{ t }}</text>
    </scroll-view>

    <view class="stats" v-if="stats.length">
      <text v-for="s in stats" :key="s.type" class="sc" :class="'b-' + s.key">{{ s.type }}：{{ s.count }}</text>
    </view>

    <view class="empty" v-if="!filtered.length">还没有行为记录，记录课堂上的积极发言、走神等</view>

    <view class="list" v-else>
      <view class="c" v-for="b in filtered" :key="b.id">
        <view class="ico" :class="'b-' + keyOf(b.behavior)">{{ emoji(b.behavior) }}</view>
        <view class="mid">
          <view class="top">
            <text class="nm">{{ b.studentName }}</text>
            <text class="chip2" :class="'b-' + keyOf(b.behavior)">{{ b.behavior }}</text>
            <text class="date">{{ b.date }}</text>
          </view>
          <view class="note" v-if="b.note">{{ b.note }}</view>
        </view>
        <view class="acts">
          <text class="a" @click="openEdit(b)">编辑</text>
          <text class="a del" @click="del(b)">删除</text>
        </view>
      </view>
    </view>

    <view class="fab" @click="openCreate">+ 新增记录</view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑行为记录' : '新增行为记录' }}</view>
      <picker :range="studentOpts" @change="pickStudent">
        <view class="picker">学生：{{ form.studentName || '请选择' }}</view>
      </picker>
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <view class="lab2">行为类型</view>
      <view class="chips2">
        <text v-for="t in types" :key="t" class="chip2" :class="[keyOf(t), form.behavior === t && 'on']" @click="form.behavior = t">{{ t }}</text>
      </view>
      <textarea v-model="form.note" class="inp area" placeholder="简要描述..."></textarea>
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

const types = ['积极发言', '认真听讲', '走神', '帮助同学', '违纪', '其他']
const keyMap = { 积极发言: 'speak', 认真听讲: 'listen', 走神: 'away', 帮助同学: 'help', 违纪: 'bad', 其他: 'etc' }
const emojiMap = { 积极发言: '🙋', 认真听讲: '👂', 走神: '💭', 帮助同学: '🤝', 违纪: '⚠️', 其他: '📝' }
const keyOf = (t) => keyMap[t] || 'etc'
const emoji = (t) => emojiMap[t] || '📝'

const classes = ref([])
const classId = ref('')
const students = ref([])
const records = ref([])
const filterBehavior = ref('全部')
const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => { const c = classes.value.find((x) => x.id === classId.value); return c ? c.name : '请选择班级' })
const studentOpts = computed(() => students.value.map((s) => s.name))
const studentIds = computed(() => new Set(students.value.map((s) => s.id)))

const classRecords = computed(() => records.value.filter((b) => studentIds.value.has(b.studentId)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')))
const filtered = computed(() => filterBehavior.value === '全部' ? classRecords.value : classRecords.value.filter((b) => b.behavior === filterBehavior.value))
const stats = computed(() => {
  const m = {}
  for (const b of classRecords.value) m[b.behavior] = (m[b.behavior] || 0) + 1
  return Object.keys(m).map((type) => ({ type, key: keyOf(type), count: m[type] }))
})

const show = ref(false)
const editing = ref(null)
const form = ref({ studentId: '', studentName: '', date: today(), behavior: '积极发言', note: '' })

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) await loadStudents()
  records.value = await api.get('/behavior-records')
}
onShow(load)

async function loadStudents() {
  students.value = (await api.get('/students')).filter((s) => s.classId === classId.value)
}
function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadStudents()
}
function pickStudent(ev) {
  const s = students.value[ev.detail.value]
  form.value.studentId = s.id
  form.value.studentName = s.name
}
function openCreate() {
  if (!classId.value) return uni.showToast({ title: '请先选择班级', icon: 'none' })
  editing.value = null
  form.value = { studentId: students.value[0]?.id || '', studentName: students.value[0]?.name || '', date: today(), behavior: '积极发言', note: '' }
  show.value = true
}
function openEdit(b) {
  editing.value = b
  form.value = { studentId: b.studentId, studentName: b.studentName, date: b.date, behavior: b.behavior, note: b.note || '' }
  show.value = true
}
async function save() {
  if (!form.value.studentId) return uni.showToast({ title: '请选择学生', icon: 'none' })
  const payload = { ...form.value }
  try {
    if (editing.value) {
      const r = await api.patch('/behavior-records/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/behavior-records', payload)
      records.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  }
}
function del(b) {
  uni.showModal({ title: '删除', content: '确定删除此条记录？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/behavior-records/' + b.id); records.value = records.value.filter((x) => x.id !== b.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 24rpx; color: #9aa0a6; margin-top: 4rpx; }
.picker { background: #fff; border-radius: 14rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.chips { white-space: nowrap; margin-bottom: 12rpx; }
.chip { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; margin-right: 12rpx; }
.chip.on { background: #07c160; color: #fff; }
.stats { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 14rpx; }
.sc { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; }
.empty { text-align: center; color: #9aa0a6; padding: 60rpx 40rpx; font-size: 26rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 6rpx 24rpx; }
.c { display: flex; align-items: flex-start; gap: 16rpx; padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.ico { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.mid { flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.nm { font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.chip2 { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.date { font-size: 22rpx; color: #9aa0a6; }
.note { font-size: 25rpx; color: #6a6058; margin-top: 6rpx; }
.acts { display: flex; flex-direction: column; gap: 14rpx; }
.a { font-size: 24rpx; color: #409eff; }
.a.del { color: #e06c75; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #07c160; color: #fff; padding: 24rpx 36rpx; border-radius: 50rpx; font-size: 28rpx; box-shadow: 0 8rpx 24rpx rgba(7,193,96,.3); }
/* 行为配色 */
.b-speak { background: #e8f9e8; color: #07c160; }
.b-listen { background: #e8f1fb; color: #409eff; }
.b-away { background: #fff3e0; color: #e6a23c; }
.b-help { background: #e8f9e8; color: #07c160; }
.b-bad { background: #fde8ea; color: #e06c75; }
.b-etc { background: #f3f3f3; color: #999; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 90vh; overflow-y: auto; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.lab2 { font-size: 24rpx; color: #9aa0a6; margin: 10rpx 0; }
.chips2 { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.chips2 .chip2 { background: #f3f3f3; color: #999; }
.chips2 .chip2.on { color: #fff; }
.chips2 .b-speak.on { background: #07c160; }
.chips2 .b-listen.on { background: #409eff; }
.chips2 .b-away.on { background: #e6a23c; }
.chips2 .b-help.on { background: #07c160; }
.chips2 .b-bad.on { background: #e06c75; }
.chips2 .b-etc.on { background: #999; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 120rpx; }
.mbtns { display: flex; gap: 20rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .picker, .dark .list { background: var(--c-card); }
.dark .nm { color: var(--c-title); }
.dark .note { color: var(--c-sub); }
.dark .c { border-color: var(--c-input-border); }
.dark .chip, .dark .chips2 .chip2, .dark .chip2 { background: var(--c-card2); color: var(--c-sub); }
.dark .inp { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
