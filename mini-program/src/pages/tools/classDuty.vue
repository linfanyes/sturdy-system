<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">班级值日</view>
    <view class="sub">管理每日值日安排</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
    </view>

    <!-- 星期选择 -->
    <view class="week">
      <view
        v-for="(d, i) in weekDays"
        :key="i"
        class="day"
        :class="{ active: dayIdx === i }"
        @click="dayIdx = i"
      >
        <text>{{ d }}</text>
      </view>
    </view>

    <!-- 值日表 -->
    <view v-if="classIdx >= 0" class="duty-list">
      <view v-for="(item, i) in dutyList" :key="i" class="duty-item">
        <view class="duty-info">
          <text class="duty-name">{{ item.task }}</text>
          <text class="duty-student">{{ item.student }}</text>
        </view>
        <view class="duty-actions">
          <text class="edit" @click="editItem(i)">编辑</text>
          <text class="del" @click="removeItem(i)">删除</text>
        </view>
      </view>
    </view>

    <button class="btn" @click="openForm">
      {{ editingIdx >= 0 ? '保存修改' : '+ 添加值日' }}
    </button>

    <!-- 编辑弹窗 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="modal" @click.stop>
        <view class="modal-hd">{{ editingIdx >= 0 ? '编辑值日' : '添加值日' }}</view>
        <view class="modal-body">
          <view class="m-row">
            <text class="m-lb">任务</text>
            <input v-model="form.task" class="m-ipt" placeholder="如：擦黑板、扫地" maxlength="20" />
          </view>
          <view class="m-row">
            <text class="m-lb">学生</text>
            <picker :range="studentOpts" :value="studentIdx" @change="studentIdx = +$event.detail.value">
              <view class="m-pk">{{ studentOpts[studentIdx] || '请选择' }}</view>
            </picker>
          </view>
        </view>
        <view class="modal-ft">
          <button class="m-btn cancel" @click="showForm = false">取消</button>
          <button class="m-btn ok" @click="saveItem">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses, listStudents } from '../../api/students'

const STORAGE_PREFIX = 'mini_class_duty_'

const classes = ref([])
const students = ref([])
const classIdx = ref(-1)
const dayIdx = ref(0)
const showForm = ref(false)
const editingIdx = ref(-1)
const form = ref({ task: '', student: '' })
const studentIdx = ref(0)
const dutyData = ref({})

const weekDays = ['周一', '周二', '周三', '周四', '周五']

const classOpts = computed(() => classes.value.map((c) => c.name))
const studentOpts = computed(() => students.value.map((s) => s.name))

const storageKey = computed(() => `${STORAGE_PREFIX}${classes.value[classIdx.value]?.id || 'none'}_${dayIdx.value}`)

const dutyList = computed(() => dutyData.value[storageKey.value] || [])

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
  await loadStudents()
  loadDuty()
}

function loadDuty() {
  try {
    const raw = uni.getStorageSync(storageKey.value)
    dutyData.value[storageKey.value] = raw ? JSON.parse(raw) : []
  } catch {
    dutyData.value[storageKey.value] = []
  }
}

function saveDuty() {
  const list = dutyData.value[storageKey.value] || []
  uni.setStorageSync(storageKey.value, JSON.stringify(list))
}

function openForm() {
  editingIdx.value = -1
  form.value = { task: '', student: '' }
  studentIdx.value = 0
  showForm.value = true
}

function editItem(i) {
  const item = dutyList.value[i]
  editingIdx.value = i
  form.value = { task: item.task, student: item.student }
  const idx = studentOpts.value.indexOf(item.student)
  studentIdx.value = idx >= 0 ? idx : 0
  showForm.value = true
}

function saveItem() {
  if (!form.value.task.trim()) {
    return uni.showToast({ title: '请输入任务', icon: 'none' })
  }
  const student = studentOpts.value[studentIdx.value] || ''
  if (!student) {
    return uni.showToast({ title: '请选择学生', icon: 'none' })
  }
  const list = [...(dutyData.value[storageKey.value] || [])]
  const item = { task: form.value.task.trim(), student }
  if (editingIdx.value >= 0) {
    list[editingIdx.value] = item
  } else {
    list.push(item)
  }
  dutyData.value[storageKey.value] = list
  saveDuty()
  showForm.value = false
}

function removeItem(i) {
  uni.showModal({
    title: '确认删除',
    content: '确定删除这条值日安排？',
    success: (res) => {
      if (res.confirm) {
        const list = [...(dutyData.value[storageKey.value] || [])]
        list.splice(i, 1)
        dutyData.value[storageKey.value] = list
        saveDuty()
      }
    },
  })
}

onMounted(() => {
  loadClasses()
  // 监听 dayIdx 变化自动加载
  watch(dayIdx, () => {
    if (classIdx.value >= 0) loadDuty()
  })
})

import { watch } from 'vue'
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.week { display: flex; gap: 8rpx; margin-bottom: 24rpx; }
.day { flex: 1; text-align: center; background: var(--c-card); border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; color: var(--c-text); }
.day.active { background: var(--c-primary); color: #fff; }
.duty-list { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.duty-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid var(--c-border, #eee); }
.duty-item:last-child { border-bottom: none; }
.duty-info { flex: 1; }
.duty-name { font-size: 28rpx; color: var(--c-title); font-weight: 600; }
.duty-student { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }
.duty-actions { display: flex; gap: 16rpx; }
.edit { font-size: 24rpx; color: var(--c-primary); }
.del { font-size: 24rpx; color: #ff4d4f; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { width: 80%; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.modal-hd { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.modal-body { margin-bottom: 20rpx; }
.m-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.m-row:last-child { margin-bottom: 0; }
.m-lb { width: 100rpx; font-size: 26rpx; color: var(--c-sub); }
.m-ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.m-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.modal-ft { display: flex; gap: 16rpx; justify-content: flex-end; }
.m-btn { border-radius: 10rpx; font-size: 26rpx; padding: 12rpx 24rpx; }
.m-btn.cancel { background: var(--c-input); color: var(--c-text); }
.m-btn.ok { background: var(--c-primary); color: #fff; }
</style>
