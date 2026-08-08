<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">班级职务</view>
    <view class="bar">
      <picker :range="classOpts" range-key="name" :value="classIdx" @change="onClassChange">
        <view class="sel">{{ classes[classIdx]?.name || '请选择班级' }} ▾</view>
      </picker>
      <text class="act" @click="openAdd">＋ 新增</text>
    </view>

    <view v-if="!classId" class="empty">请先选择班级</view>
    <view v-else-if="loading" class="loading">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无职务，点击新增</view>
    <view v-else class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="it-top">
          <text class="name">{{ it.dutyName }}</text>
          <text class="stu">{{ it.studentName }}</text>
        </view>
        <view class="meta">
          <text>{{ it.term || '--' }}</text>
        </view>
        <view class="ops">
          <text class="op" @click="openEdit(it)">编辑</text>
          <text class="op del" @click="remove(it)">删除</text>
        </view>
      </view>
    </view>

    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ editing ? '编辑' : '新增' }}职务</view>
        <view class="field">
          <text class="label">职务名 *</text>
          <input v-model="form.dutyName" class="inp" placeholder="如：班长、学习委员" />
        </view>
        <view class="field">
          <text class="label">学生 *</text>
          <picker :range="studentOpts" :value="studentIdx" @change="onStudentChange">
            <view class="picker">{{ form.studentName || '请选择学生' }}</view>
          </picker>
          <text v-if="!students.length" class="hint">该班级暂无学生</text>
        </view>
        <view class="field">
          <text class="label">任期</text>
          <input v-model="form.term" class="inp" placeholder="如：2024-2025学年第一学期" />
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showForm = false">取消</button>
          <button class="btn send" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listClasses, listStudents } from '@/api/teaching'
import { listDutyConfigs, createDutyConfig, updateDutyConfig, removeDutyConfig } from '@/api/duty'
import { theme } from '../../common/store'
import { getCurrentTerm } from '@gardener/shared/utils/date'

const loading = ref(false)
const list = ref([])
const classId = ref('')
const classIdx = ref(0)
const classes = ref([])
const classOpts = ref([])
const students = ref([])
const studentOpts = ref([])
const studentIdx = ref(0)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({ dutyName: '', studentName: '', term: '' })

function onClassChange(e) {
  classIdx.value = e.detail.value
  const c = classes.value[e.detail.value]
  if (c) { classId.value = c.id; load(); loadStudents() }
}

function onStudentChange(e) {
  studentIdx.value = e.detail.value
  form.value.studentName = students.value[e.detail.value]?.name || ''
}

async function loadClasses() {
  try {
    const res = await listClasses({ take: 200 })
    classes.value = Array.isArray(res) ? res : (res.items || [])
    classOpts.value = classes.value.map(c => c.name)
  } catch (e) { classes.value = [] }
}

async function loadStudents() {
  if (!classId.value) { students.value = []; return }
  try {
    const res = await listStudents({ classId: classId.value, take: 200 })
    students.value = Array.isArray(res) ? res : (res.items || [])
    studentOpts.value = students.value.map(s => s.name)
  } catch (e) { students.value = [] }
}

async function load() {
  if (!classId.value) { list.value = []; return }
  loading.value = true
  try {
    const res = await listDutyConfigs(classId.value)
    list.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  if (!classId.value) return uni.showToast({ title: '请先选择班级', icon: 'none' })
  editing.value = null
  form.value = { dutyName: '', studentName: '', term: currentTerm() }
  studentIdx.value = 0
  showForm.value = true
}

function openEdit(it) {
  editing.value = it
  form.value = { dutyName: it.dutyName || '', studentName: it.studentName || '', term: it.term || '' }
  studentIdx.value = students.value.findIndex(s => s.name === it.studentName)
  if (studentIdx.value < 0) studentIdx.value = 0
  showForm.value = true
}

function currentTerm() {
  return getCurrentTerm()
}

async function submit() {
  if (!form.value.dutyName.trim()) return uni.showToast({ title: '请填写职务名', icon: 'none' })
  if (!form.value.studentName) return uni.showToast({ title: '请选择学生', icon: 'none' })
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    if (editing.value) {
      await updateDutyConfig(editing.value.id, payload)
    } else {
      await createDutyConfig(payload)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
  finally { saving.value = false }
}

async function remove(it) {
  uni.showModal({
    title: '删除确认', content: '确定删除该职务？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await removeDutyConfig(it.id)
        list.value = list.value.filter(x => x.id !== it.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}

onShow(async () => {
  await loadClasses()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
    classIdx.value = 0
    await Promise.all([load(), loadStudents()])
  }
})
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sel { font-size: 26rpx; color: var(--c-blue); padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.act { font-size: 26rpx; color: var(--c-blue); padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.stu { font-size: 26rpx; color: #67c23a; background: #f0f9eb; padding: 2rpx 16rpx; border-radius: 20rpx; }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.ops { display: flex; gap: 20rpx; margin-top: 12rpx; }
.op { font-size: 24rpx; color: var(--c-blue); }
.op.del { color: #e64340; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.hint { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
</style>