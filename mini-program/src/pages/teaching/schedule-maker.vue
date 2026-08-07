<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">课表排版</view>
    <view class="bar">
      <picker :range="classOpts" range-key="name" :value="classIdx" @change="onClassChange">
        <view class="sel">{{ classes[classIdx]?.name || '请选择班级' }} ▾</view>
      </picker>
      <view class="bar-ops">
        <text class="act" @click="autoArrange">自动排版</text>
        <text class="act" @click="clearAll">清空</text>
        <text class="act save" @click="save">保存</text>
      </view>
    </view>

    <view class="opts">
      <text :class="['opt', dayCount === 5 ? 'on' : '']" @click="dayCount = 5">周一到周五</text>
      <text :class="['opt', dayCount === 6 ? 'on' : '']" @click="dayCount = 6">周一到周六</text>
    </view>

    <view class="table-wrap">
      <view class="t-row head">
        <text class="t-cell period">节次</text>
        <text v-for="d in days" :key="d" class="t-cell">{{ d }}</text>
      </view>
      <view v-for="(row, p) in grid" :key="p" class="t-row">
        <text class="t-cell period">第{{ p + 1 }}节</text>
        <view v-for="(subj, d) in days" :key="d" class="t-cell">
          <input
            v-model="grid[p][d]"
            :class="['cell-inp', subjectClass(grid[p][d])]"
            placeholder="--"
            @click="onCellTap(p, d)"
          />
        </view>
      </view>
    </view>

    <view class="legend">
      <text class="lg-t">科目颜色图例</text>
      <view class="lg-list">
        <text v-for="s in commonSubjects" :key="s" :class="['lg-item', subjectClass(s)]">{{ s }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listClasses } from '@/api/teaching'
import { theme } from '../../common/store'

const PERIODS = 8
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六']

const SUBJECT_COLORS = {
  '语文': 'sakura', '数学': 'sky', '英语': 'mint',
  '科学': 'butter', '体育': 'cocoa', '音乐': 'sakura',
  '美术': 'butter', '道法': 'mint', '劳动': 'cocoa', '信息': 'sky',
}

const commonSubjects = ['语文', '数学', '英语', '科学', '体育', '音乐', '美术', '道法', '劳动', '信息']

const classes = ref([])
const classOpts = ref([])
const classIdx = ref(0)
const classId = ref('')
const dayCount = ref(5)
const grid = ref([])

const days = computed(() => DAY_NAMES.slice(0, dayCount.value))

function initGrid() {
  grid.value = Array.from({ length: PERIODS }, () => Array.from({ length: dayCount.value }, () => ''))
}

function subjectClass(subj) {
  if (!subj) return ''
  return SUBJECT_COLORS[subj.trim()] || 'cocoa'
}

function onClassChange(e) {
  classIdx.value = e.detail.value
  const c = classes.value[e.detail.value]
  if (c) { classId.value = c.id; load() }
}

function onCellTap(p, d) {
  uni.showActionSheet({
    itemList: commonSubjects.concat(['清空']),
    success: (res) => {
      if (res.tapIndex < commonSubjects.length) {
        grid.value[p][d] = commonSubjects[res.tapIndex]
      } else {
        grid.value[p][d] = ''
      }
    }
  })
}

function autoArrange() {
  if (!classId.value) return uni.showToast({ title: '请先选择班级', icon: 'none' })
  initGrid()
  const weeklyHours = {
    '语文': 8, '数学': 6, '英语': 4,
    '科学': 3, '道法': 2, '体育': 3,
    '音乐': 2, '美术': 2, '劳动': 1, '信息': 1,
  }
  const morningSubjects = ['语文', '数学', '英语']
  const afternoonSubjects = ['科学', '道法', '体育', '音乐', '美术', '劳动', '信息']

  const morningPool = []
  for (const subj of morningSubjects) {
    for (let i = 0; i < (weeklyHours[subj] || 0); i++) morningPool.push(subj)
  }
  const afternoonPool = []
  for (const subj of afternoonSubjects) {
    for (let i = 0; i < (weeklyHours[subj] || 0); i++) afternoonPool.push(subj)
  }

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const sm = shuffle(morningPool)
  const sa = shuffle(afternoonPool)
  let mi = 0, ai = 0

  for (let p = 0; p < PERIODS; p++) {
    for (let d = 0; d < dayCount.value; d++) {
      if (p < 4) {
        if (mi < sm.length) {
          grid.value[p][d] = sm[mi]
          mi++
        }
      } else {
        if (ai < sa.length) {
          grid.value[p][d] = sa[ai]
          ai++
        }
      }
    }
  }
  uni.showToast({ title: '已自动排版', icon: 'success' })
}

function clearAll() {
  uni.showModal({
    title: '清空确认', content: '确定清空当前课表？',
    success: (r) => {
      if (r.confirm) initGrid()
    }
  })
}

function save() {
  if (!classId.value) return uni.showToast({ title: '请先选择班级', icon: 'none' })
  try {
    uni.setStorageSync('mp_schedule_' + classId.value, JSON.stringify(grid.value))
    uni.showToast({ title: '已保存到本地', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function load() {
  if (!classId.value) { initGrid(); return }
  try {
    const raw = uni.getStorageSync('mp_schedule_' + classId.value)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data) && data.length) {
        grid.value = data
        dayCount.value = data[0]?.length || dayCount.value
        return
      }
    }
  } catch (e) { /* ignore */ }
  initGrid()
}

async function loadClasses() {
  try {
    const res = await listClasses({ take: 200 })
    classes.value = Array.isArray(res) ? res : (res.items || [])
    classOpts.value = classes.value.map(c => c.name)
  } catch (e) { classes.value = [] }
}

watch(dayCount, () => {
  grid.value = grid.value.map(row => {
    const newRow = row.slice(0, dayCount.value)
    while (newRow.length < dayCount.value) newRow.push('')
    return newRow
  })
})

onShow(async () => {
  await loadClasses()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
    classIdx.value = 0
  }
  initGrid()
  load()
})
</script>

<style scoped>
.page { padding: 20rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 16rpx; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.sel { font-size: 24rpx; color: var(--c-blue); padding: 6rpx 16rpx; background: var(--c-card); border-radius: 30rpx; }
.bar-ops { display: flex; gap: 10rpx; }
.act { font-size: 24rpx; color: var(--c-blue); padding: 6rpx 16rpx; background: var(--c-card); border-radius: 30rpx; }
.act.save { color: #e6a23c; background: #fdf6ec; }
.opts { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.opt { font-size: 24rpx; color: var(--c-sub); padding: 6rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.opt.on { background: #e6a23c; color: #fff; }

.table-wrap { background: var(--c-card); border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.t-row { display: flex; }
.t-row.head { background: #f5f0e8; }
.t-cell { flex: 1; padding: 8rpx 4rpx; text-align: center; font-size: 22rpx; color: var(--c-sub); min-width: 0; }
.t-cell.period { flex: 0.5; font-size: 20rpx; color: var(--c-sub); }
.cell-inp { width: 100%; text-align: center; font-size: 20rpx; padding: 8rpx 0; border-radius: 6rpx; border: 1px solid transparent; background: transparent; }
.cell-inp.sakura { background: #fef0f0; color: #e64340; border-color: #fbc4c4; }
.cell-inp.sky { background: #ecf5ff; color: var(--c-blue); border-color: #b3d8ff; }
.cell-inp.mint { background: #f0f9eb; color: #67c23a; border-color: #c2e7b0; }
.cell-inp.butter { background: #fdf6ec; color: #e6a23c; border-color: #f5dab1; }
.cell-inp.cocoa { background: #f5f0e8; color: #8b7355; border-color: #d4c5b2; }

.legend { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-top: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.lg-t { font-size: 24rpx; color: var(--c-sub); display: block; margin-bottom: 12rpx; }
.lg-list { display: flex; flex-wrap: wrap; gap: 8rpx; }
.lg-item { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.lg-item.sakura { background: #fef0f0; color: #e64340; }
.lg-item.sky { background: #ecf5ff; color: var(--c-blue); }
.lg-item.mint { background: #f0f9eb; color: #67c23a; }
.lg-item.butter { background: #fdf6ec; color: #e6a23c; }
.lg-item.cocoa { background: #f5f0e8; color: #8b7355; }
</style>