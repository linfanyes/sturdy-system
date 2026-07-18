<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <picker mode="date" :value="date" @change="(e)=>{ date = e.detail.value; loadAtt() }">
      <view class="picker">日期：{{ date || '今天' }}</view>
    </picker>

    <view class="stats">
      <view class="st" v-for="s in statusList" :key="s" :class="'st-' + s">
        <text class="num">{{ stats[s] }}</text>
        <text class="lab">{{ s }}</text>
      </view>
    </view>

    <view class="quick">
      <text class="q" v-for="s in statusList" :key="s" @click="markAll(s)">全班{{ s }}</text>
    </view>

    <view class="list">
      <view class="stu" v-for="st in students" :key="st.id">
        <text class="nm">{{ st.name }}</text>
        <view class="opts">
          <text
            v-for="s in statusList"
            :key="s"
            class="opt"
            :class="[s, cur(st.id) === s && 'on']"
            @click="set(st.id, s)"
          >{{ s }}</text>
        </view>
      </view>
    </view>

    <button class="save" :disabled="saving" @click="save">保存考勤</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const statusList = ['出勤', '迟到', '请假', '旷课']
const statusMap = {
  '出勤': { bg: '#e8f9e8', fg: '#07c160' },
  '迟到': { bg: '#fff3e0', fg: '#e6a23c' },
  '请假': { bg: '#e8f1fb', fg: '#409eff' },
  '旷课': { bg: '#fde8ea', fg: '#e06c75' },
}

const classes = ref([])
const classId = ref('')
const students = ref([])
const date = ref('')
const map = ref({}) // studentId -> status
const attId = ref('')
const saving = ref(false)

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const stats = computed(() => {
  const o = { '出勤': 0, '迟到': 0, '请假': 0, '旷课': 0 }
  for (const id in map.value) o[map.value[id]]++
  return o
})

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) await loadStudents()
}
async function loadStudents() {
  students.value = (await api.get('/students')).filter((s) => s.classId === classId.value)
}
onShow(load)

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadStudents()
  loadAtt()
}

async function loadAtt() {
  map.value = {}
  attId.value = ''
  if (!classId.value) return
  const list = (await api.get('/attendances')).filter(
    (a) => a.classId === classId.value && (date.value ? a.date === date.value : true)
  )
  if (list.length) {
    const rec = list[0]
    attId.value = rec.id
    try {
      const arr = typeof rec.records === 'string' ? JSON.parse(rec.records) : rec.records || []
      for (const r of arr) map.value[r.studentId] = r.status
    } catch (e) {}
  }
  // 默认出勤
  for (const s of students.value) if (!map.value[s.id]) map.value[s.id] = '出勤'
}

function cur(id) {
  return map.value[id] || '出勤'
}
function set(id, s) {
  map.value[id] = s
}
function markAll(s) {
  for (const st of students.value) map.value[st.id] = s
}

async function save() {
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  saving.value = true
  const records = students.value.map((s) => ({ studentId: s.id, status: map.value[s.id] || '出勤' }))
  const payload = { classId: classId.value, date: date.value || undefined, records }
  try {
    if (attId.value) await api.patch('/attendances/' + attId.value, payload)
    else await api.post('/attendances', payload)
    uni.showToast({ title: '考勤已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.stats { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.st { flex: 1; border-radius: 14rpx; padding: 16rpx 0; text-align: center; }
.st-出勤 { background: #e8f9e8; }
.st-迟到 { background: #fff3e0; }
.st-请假 { background: #e8f1fb; }
.st-旷课 { background: #fde8ea; }
.num { display: block; font-size: 40rpx; font-weight: 800; }
.lab { font-size: 24rpx; color: #666; }
.quick { display: flex; gap: 12rpx; margin-bottom: 18rpx; flex-wrap: wrap; }
.q { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: #f2ead8; color: #a07b3b; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 20rpx; margin-bottom: 24rpx; }
.stu { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1px solid #f3f3f3; }
.nm { font-size: 28rpx; color: #4a3f35; }
.opts { display: flex; gap: 10rpx; }
.opt { font-size: 22rpx; padding: 8rpx 14rpx; border-radius: 20rpx; background: #f3f3f3; color: #999; }
.opt.出勤.on { background: #07c160; color: #fff; }
.opt.迟到.on { background: #e6a23c; color: #fff; }
.opt.请假.on { background: #409eff; color: #fff; }
.opt.旷课.on { background: #e06c75; color: #fff; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .list { background: var(--c-card); }
.dark .nm { color: var(--c-title); }
.dark .q { background: var(--c-card2); color: var(--c-accent); }
.dark .stu { border-color: var(--c-input-border); }
.dark .opt { background: var(--c-card2); color: var(--c-sub); }
.dark .lab { color: var(--c-sub); }
</style>
