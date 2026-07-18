<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <picker mode="date" :value="date" @change="(e)=>{ date = e.detail.value; loadAtt() }">
      <view class="picker">日期：{{ date || '今天' }}</view>
    </picker>

    <!-- 4 色统计卡（对齐 web 图标卡） -->
    <view class="stats">
      <view class="st" v-for="s in statusList" :key="s" :style="{ background: statusMap[s].bg }">
        <view class="ic">{{ statusMap[s].emoji }}</view>
        <view class="num" :style="{ color: statusMap[s].fg }">{{ stats[s] }}</view>
        <view class="lab">{{ s }}</view>
      </view>
    </view>

    <view class="quick">
      <text class="q" v-for="s in statusList" :key="s" @click="markAll(s)">全班{{ s }}</text>
    </view>

    <view class="list">
      <view class="stu" v-for="st in students" :key="st.id">
        <text class="av">{{ st.gender === '女' ? '👧' : '👦' }}</text>
        <view class="info">
          <text class="nm">{{ st.name }}</text>
          <text class="sub">座 {{ st.seatNo || '-' }} · {{ st.studentNo || '无学号' }}</text>
        </view>
        <view class="opts">
          <text
            v-for="s in statusList"
            :key="s"
            class="opt"
            :class="[s, cur(st.id) === s && 'on']"
            :style="cur(st.id) === s ? { background: statusMap[s].fg, color: '#fff' } : {}"
            @click="setStu(st.id, s)"
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
  '出勤': { bg: '#e8f9e8', fg: '#07c160', emoji: '✅' },
  '迟到': { bg: '#fff3e0', fg: '#e6a23c', emoji: '⏰' },
  '请假': { bg: '#e8f1fb', fg: '#409eff', emoji: '📝' },
  '旷课': { bg: '#fde8ea', fg: '#e06c75', emoji: '❌' },
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
  await loadAtt()
}
onShow(load)

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadStudents()
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
  for (const s of students.value) if (!map.value[s.id]) map.value[s.id] = '出勤'
}

function cur(id) {
  return map.value[id] || '出勤'
}
function setStu(id, s) {
  const prev = cur(id)
  map.value[id] = s
  // 对齐 web：新标记为「旷课」时自动生成班级公告
  if (s === '旷课' && prev !== '旷课') {
    const stu = students.value.find((x) => x.id === id)
    const cls = classes.value.find((x) => x.id === classId.value)
    api.post('/notices', {
      classId: classId.value,
      title: (stu ? stu.name : '某同学') + '今日旷课',
      content: (cls ? cls.name : '') + ' ' + (stu ? stu.name : '') + ' 于 ' + (date.value || '今天') + ' 旷课，请家长关注。',
      pinned: false,
    }).catch(() => {})
    uni.showToast({ title: '已生成旷课通知', icon: 'none' })
  }
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
.ic { font-size: 34rpx; }
.num { display: block; font-size: 38rpx; font-weight: 800; margin: 4rpx 0; }
.lab { font-size: 22rpx; color: #666; }
.quick { display: flex; gap: 12rpx; margin-bottom: 18rpx; flex-wrap: wrap; }
.q { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: #f2ead8; color: #a07b3b; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 20rpx; margin-bottom: 24rpx; }
.stu { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid #f3f3f3; }
.stu:last-child { border-bottom: none; }
.av { width: 60rpx; height: 60rpx; border-radius: 50%; background: #f7f1e6; text-align: center; line-height: 60rpx; font-size: 30rpx; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nm { font-size: 28rpx; color: #4a3f35; font-weight: 600; display: block; }
.sub { font-size: 22rpx; color: #9aa0a6; }
.opts { display: flex; gap: 8rpx; }
.opt { font-size: 20rpx; padding: 8rpx 12rpx; border-radius: 20rpx; background: #f3f3f3; color: #999; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .list { background: var(--c-card); }
.dark .nm { color: var(--c-title); }
.dark .sub { color: var(--c-sub); }
.dark .q { background: var(--c-card2); color: var(--c-accent); }
.dark .stu { border-color: var(--c-input-border); }
.dark .opt { background: var(--c-card2); color: var(--c-sub); }
</style>
