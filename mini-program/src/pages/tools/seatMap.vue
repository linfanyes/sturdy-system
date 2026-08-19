<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">座位表</view>
    <view class="sub">点击格子填入学生，一键排座</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">行×列</text>
        <picker :range="rowOpts" :value="rowIdx" @change="rowIdx = +$event.detail.value; resizeGrid()">
          <view class="form-pk">{{ rowOpts[rowIdx] }}</view>
        </picker>
        <text class="sep">×</text>
        <picker :range="colOpts" :value="colIdx" @change="colIdx = +$event.detail.value; resizeGrid()">
          <view class="form-pk">{{ colOpts[colIdx] }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">排座模式</text>
        <picker :range="arrangeOpts" :value="arrangeIdx" @change="arrangeIdx = +$event.detail.value">
          <view class="form-pk">{{ arrangeOpts[arrangeIdx] }}</view>
        </picker>
      </view>
    </view>

    <view class="actions">
      <button class="btn primary" @click="autoArrange">一键排座</button>
      <button class="btn outline" @click="clearGrid">清空</button>
    </view>

    <!-- 讲台 -->
    <view class="podium">讲台</view>

    <!-- 座位网格 -->
    <view v-if="rows > 0 && cols > 0" class="grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <view
        v-for="(cell, idx) in grid"
        :key="idx"
        class="cell"
        :class="{ empty: !cell }"
        @click="onCellClick(idx)"
      >
        <text v-if="cell" class="cell-name">{{ cell }}</text>
        <text v-else class="cell-empty">空</text>
      </view>
    </view>

    <!-- 未入座学生 -->
    <view v-if="unassigned.length" class="pool">
      <view class="pool-hd">未入座（点击填入）</view>
      <view class="pool-list">
        <text v-for="name in unassigned" :key="name" class="pool-item" @click="selectStudent(name)">{{ name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses, listStudents } from '../../api/students'

const classes = ref([])
const students = ref([])
const classIdx = ref(-1)
const rowIdx = ref(4)
const colIdx = ref(5)
const arrangeIdx = ref(0)
const grid = ref([])
const selectedStudent = ref(null)

const rowOpts = [3, 4, 5, 6, 7, 8]
const colOpts = [4, 5, 6, 7, 8]
const arrangeOpts = ['按学号', '之字形', '随机', '男女交替']

const rows = computed(() => rowOpts[rowIdx.value] || 5)
const cols = computed(() => colOpts[colIdx.value] || 6)

const classOpts = computed(() => classes.value.map((c) => c.name))
const assignedNames = computed(() => new Set(grid.value.filter(Boolean)))
const unassigned = computed(() => students.value.filter((s) => !assignedNames.value.has(s.name)).map((s) => s.name))

async function loadClasses() {
  try {
    classes.value = await listClasses({ silent: true })
    if (classes.value.length) {
      classIdx.value = 0
      await loadStudents()
    }
  } catch {
    classes.value = []
  }
}

async function loadStudents() {
  if (classIdx.value < 0) return
  const cls = classes.value[classIdx.value]
  if (!cls) return
  try {
    students.value = (await listStudents(cls.id, { silent: true })) || []
  } catch {
    students.value = []
  }
}

async function onClassChange(e) {
  classIdx.value = +e.detail.value
  selectedStudent.value = null
  await loadStudents()
  initGrid()
}

// P2修复：Fisher-Yates 洗牌算法，保证均匀分布
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function initGrid() {
  grid.value = new Array(rows.value * cols.value).fill(null)
}

function resizeGrid() {
  const old = grid.value
  const total = rows.value * cols.value
  grid.value = new Array(total).fill(null).map((_, i) => old[i] || null)
}

function selectStudent(name) {
  selectedStudent.value = name
}

function onCellClick(idx) {
  if (selectedStudent.value) {
    grid.value[idx] = selectedStudent.value
    selectedStudent.value = null
  } else if (grid.value[idx]) {
    grid.value[idx] = null
  }
}

function clearGrid() {
  initGrid()
  selectedStudent.value = null
}

function autoArrange() {
  if (!students.value.length) {
    return uni.showToast({ title: '该班级暂无学生', icon: 'none' })
  }
  const names = students.value.map((s) => s.name)
  let ordered = []

  if (arrangeIdx.value === 0) {
    // 按学号
    ordered = [...students.value].sort((a, b) => String(a.studentNo || '').localeCompare(String(b.studentNo || ''), 'zh')).map((s) => s.name)
  } else if (arrangeIdx.value === 1) {
    // 之字形
    const sorted = [...students.value].sort((a, b) => String(a.studentNo || '').localeCompare(String(b.studentNo || ''), 'zh')).map((s) => s.name)
    ordered = []
    const c = cols.value
    for (let r = 0; r < Math.ceil(sorted.length / c); r++) {
      const row = sorted.slice(r * c, (r + 1) * c)
      if (r % 2 === 1) row.reverse()
      ordered.push(...row)
    }
  } else if (arrangeIdx.value === 2) {
    // 随机
    ordered = shuffle(names)
  } else {
    // 男女交替
    const males = students.value.filter((s) => s.gender === '男').map((s) => s.name)
    const females = students.value.filter((s) => s.gender === '女').map((s) => s.name)
    ordered = []
    const max = Math.max(males.length, females.length)
    for (let k = 0; k < max; k++) {
      if (k < males.length) ordered.push(males[k])
      if (k < females.length) ordered.push(females[k])
    }
  }

  initGrid()
  ordered.forEach((name, i) => {
    if (i < grid.value.length) grid.value[i] = name
  })
}

onMounted(() => {
  initGrid()
  loadClasses()
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.sep { margin: 0 12rpx; font-size: 28rpx; color: var(--c-sub); }
.actions { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.btn { flex: 1; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; text-align: center; }
.btn.primary { background: var(--c-primary); color: #fff; }
.btn.outline { background: var(--c-input); color: var(--c-text); }
.podium { text-align: center; background: var(--c-card); border-radius: 12rpx; padding: 16rpx; margin-bottom: 24rpx; font-size: 28rpx; color: var(--c-sub); letter-spacing: 8rpx; }
.grid { display: grid; gap: 8rpx; margin-bottom: 24rpx; }
.cell { background: var(--c-card); border: 2rpx solid var(--c-border, #eee); border-radius: 10rpx; padding: 16rpx 8rpx; text-align: center; min-height: 60rpx; display: flex; align-items: center; justify-content: center; }
.cell.empty { border-style: dashed; }
.cell-name { font-size: 24rpx; color: var(--c-text); font-weight: 600; }
.cell-empty { font-size: 22rpx; color: var(--c-sub); }
.pool { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.pool-hd { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.pool-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.pool-item { font-size: 24rpx; color: var(--c-text); background: var(--c-input); border-radius: 8rpx; padding: 8rpx 16rpx; }
</style>
