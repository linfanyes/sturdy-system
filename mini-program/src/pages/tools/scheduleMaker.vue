<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">课程表</view>
    <view class="sub">编辑班级周课表</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
    </view>

    <!-- 课表网格 -->
    <view v-if="classIdx >= 0" class="schedule">
      <view class="row header">
        <text class="cell corner">节次</text>
        <text v-for="(d, i) in days" :key="i" class="cell day">{{ d }}</text>
      </view>
      <view v-for="(row, ri) in rows" :key="ri" class="row">
        <text class="cell label">{{ row.label }}</text>
        <view
          v-for="(d, di) in days"
          :key="di"
          class="cell editable"
          :class="{ conflict: isConflict(ri, di) }"
          @click="openEdit(ri, di)"
        >
          <text v-if="grid[ri][di]" class="subject">{{ grid[ri][di] }}</text>
          <text v-else class="placeholder">点击编辑</text>
        </view>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view v-if="showEdit" class="mask" @click="showEdit = false">
      <view class="modal" @click.stop>
        <view class="modal-hd">{{ editLabel }}</view>
        <view class="modal-body">
          <view class="subject-grid">
            <text
              v-for="s in subjects"
              :key="s"
              class="subject-tag"
              :class="{ active: editForm.subject === s }"
              @click="editForm.subject = s"
            >{{ s }}</text>
          </view>
          <view class="m-row">
            <text class="m-lb">自定义科目</text>
            <input v-model="editForm.subject" class="m-ipt" placeholder="输入科目名" maxlength="10" />
          </view>
        </view>
        <view class="modal-ft">
          <button class="m-btn del" @click="clearCell">清空</button>
          <button class="m-btn cancel" @click="showEdit = false">取消</button>
          <button class="m-btn ok" @click="saveCell">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses } from '../../api/students'

const STORAGE_PREFIX = 'mini_schedule_'

const classes = ref([])
const classIdx = ref(-1)
const grid = ref([])
const showEdit = ref(false)
const editRow = ref(0)
const editCol = ref(0)
const editForm = ref({ subject: '' })

const days = ['周一', '周二', '周三', '周四', '周五']
const rows = [
  { label: '早读' },
  { label: '第1节' },
  { label: '第2节' },
  { label: '第3节' },
  { label: '第4节' },
  { label: '第5节' },
  { label: '第6节' },
  { label: '第7节' },
  { label: '第8节' },
]
const subjects = ['语文', '数学', '英语', '科学', '道法', '体育', '音乐', '美术', '劳动', '信息']

const classOpts = computed(() => classes.value.map((c) => c.name))
const storageKey = computed(() => `${STORAGE_PREFIX}${classes.value[classIdx.value]?.id || 'none'}`)
const editLabel = computed(() => `${days[editCol.value]} · ${rows[editRow.value].label}`)

function initGrid() {
  grid.value = Array.from({ length: rows.length }, () => Array(days.length).fill(''))
}

function loadGrid() {
  try {
    const raw = uni.getStorageSync(storageKey.value)
    const saved = raw ? JSON.parse(raw) : null
    if (saved && Array.isArray(saved) && saved.length === rows.length) {
      grid.value = saved
    } else {
      initGrid()
    }
  } catch {
    initGrid()
  }
}

function saveGrid() {
  uni.setStorageSync(storageKey.value, JSON.stringify(grid.value))
}

function isConflict(ri, di) {
  const subj = grid.value[ri][di]
  if (!subj) return false
  // 检查相邻节次是否同科
  if (ri > 0 && grid.value[ri - 1][di] === subj) return true
  if (ri < rows.length - 1 && grid.value[ri + 1][di] === subj) return true
  return false
}

function openEdit(ri, di) {
  editRow.value = ri
  editCol.value = di
  editForm.value.subject = grid.value[ri][di] || ''
  showEdit.value = true
}

function saveCell() {
  const subj = editForm.value.subject.trim()
  grid.value[editRow.value][editCol.value] = subj
  saveGrid()
  showEdit.value = false
}

function clearCell() {
  grid.value[editRow.value][editCol.value] = ''
  saveGrid()
  showEdit.value = false
}

async function loadClasses() {
  try {
    classes.value = await listClasses({ silent: true })
    if (classes.value.length) {
      classIdx.value = 0
      loadGrid()
    }
  } catch {
    classes.value = []
  }
}

async function onClassChange(e) {
  classIdx.value = +e.detail.value
  loadGrid()
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
.form-row { display: flex; align-items: center; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.schedule { background: var(--c-card); border-radius: 16rpx; overflow: hidden; margin-bottom: 24rpx; }
.row { display: flex; border-bottom: 1rpx solid var(--c-border, #eee); }
.row:last-child { border-bottom: none; }
.row.header { background: var(--c-input); }
.cell { flex: 1; padding: 16rpx 8rpx; text-align: center; font-size: 24rpx; min-height: 60rpx; display: flex; align-items: center; justify-content: center; border-right: 1rpx solid var(--c-border, #eee); }
.cell:last-child { border-right: none; }
.cell.corner, .cell.day, .cell.label { font-weight: 600; color: var(--c-sub); font-size: 22rpx; }
.cell.editable { cursor: pointer; }
.cell.editable:active { background: var(--c-input); }
.cell.conflict { background: #fff0f0; }
.subject { font-size: 24rpx; color: var(--c-text); font-weight: 600; }
.placeholder { font-size: 20rpx; color: var(--c-sub); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { width: 80%; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.modal-hd { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.modal-body { margin-bottom: 20rpx; }
.subject-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.subject-tag { font-size: 24rpx; padding: 10rpx 20rpx; border-radius: 30rpx; background: var(--c-input); color: var(--c-text); }
.subject-tag.active { background: var(--c-primary); color: #fff; }
.m-row { margin-bottom: 16rpx; }
.m-lb { font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; display: block; }
.m-ipt { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.modal-ft { display: flex; gap: 12rpx; justify-content: flex-end; }
.m-btn { border-radius: 10rpx; font-size: 26rpx; padding: 12rpx 24rpx; }
.m-btn.del { background: #fff0f0; color: #ff4d4f; }
.m-btn.cancel { background: var(--c-input); color: var(--c-text); }
.m-btn.ok { background: var(--c-primary); color: #fff; }
</style>
