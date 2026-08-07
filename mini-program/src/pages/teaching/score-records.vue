<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">积分记录</view>
    <view class="bar">
      <text class="bar-text">管理学生积分记录</text>
      <text class="act" @click="openAdd">＋ 添加</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无积分记录，点击添加</view>
    <view v-else class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="it-top">
          <text class="name">{{ it.studentName }}</text>
          <text class="score">{{ it.score }} 分</text>
        </view>
        <view class="meta">
          <text>{{ it.className || it.classId }}</text>
          <text>{{ it.subject }}</text>
          <text>{{ it.source }}</text>
          <text>{{ it.date }}</text>
        </view>
        <view v-if="it.note" class="desc">{{ it.note }}</view>
        <view class="ops">
          <text class="op" @click="openEdit(it)">编辑</text>
          <text class="op del" @click="remove(it)">删除</text>
        </view>
      </view>
    </view>

    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ editing ? '编辑' : '新增' }}积分记录</view>
        <view class="field">
          <text class="label">班级 *</text>
          <picker :range="classOpts" range-key="name" :value="classIdx" @change="onClassChange">
            <view class="picker">{{ form.className || '请选择班级' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">学生 *</text>
          <input v-model="form.studentName" class="inp" placeholder="学生姓名" />
        </view>
        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="form.date" @change="onDateChange">
            <view class="picker">{{ form.date || '请选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">科目</text>
          <input v-model="form.subject" class="inp" placeholder="如：数学" />
        </view>
        <view class="field">
          <text class="label">积分 *</text>
          <input v-model.number="form.score" class="inp" type="number" placeholder="输入积分" />
        </view>
        <view class="field">
          <text class="label">来源</text>
          <picker :range="sources" :value="sourceIdx" @change="onSourceChange">
            <view class="picker">{{ form.source || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">备注</text>
          <textarea v-model="form.note" class="inp area" placeholder="备注" />
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
import { listClasses } from '@/api/teaching'
import { listScoreRecords, createScoreRecord, updateScoreRecord, removeScoreRecord } from '@/api/scores'
import { theme } from '../../common/store'

const list = ref([])
const loading = ref(false)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const classes = ref([])
const classOpts = ref([])
const classIdx = ref(0)
const sources = ['课堂', '作业', '考试', '行为', '其他']
const sourceIdx = ref(0)
const form = ref({ classId: '', className: '', studentName: '', date: '', subject: '', score: 1, source: '课堂', note: '' })

function onClassChange(e) {
  classIdx.value = e.detail.value
  const c = classes.value[e.detail.value]
  if (c) { form.value.classId = c.id; form.value.className = c.name }
}

function onDateChange(e) { form.value.date = e.detail.value }

function onSourceChange(e) {
  sourceIdx.value = e.detail.value
  form.value.source = sources[e.detail.value]
}

async function loadClasses() {
  try {
    const res = await listClasses({ take: 200 })
    classes.value = Array.isArray(res) ? res : (res.items || [])
    classOpts.value = classes.value.map(c => c.name)
  } catch (e) { classes.value = [] }
}

async function load() {
  loading.value = true
  try {
    const res = await listScoreRecords({ take: 200 })
    list.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.value = { classId: '', className: '', studentName: '', date: '', subject: '', score: 1, source: '课堂', note: '' }
  classIdx.value = 0; sourceIdx.value = 0
  if (classes.value[0]) { form.value.classId = classes.value[0].id; form.value.className = classes.value[0].name }
  showForm.value = true
}

function openEdit(it) {
  editing.value = it
  form.value = { ...it }
  classIdx.value = classes.value.findIndex(c => c.id === it.classId); if (classIdx.value < 0) classIdx.value = 0
  sourceIdx.value = sources.indexOf(it.source); if (sourceIdx.value < 0) sourceIdx.value = 0
  showForm.value = true
}

async function submit() {
  if (!form.value.studentName.trim()) return uni.showToast({ title: '请填写学生姓名', icon: 'none' })
  saving.value = true
  try {
    if (editing.value) {
      await updateScoreRecord(editing.value.id, form.value)
    } else {
      await createScoreRecord(form.value)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
  finally { saving.value = false }
}

async function remove(it) {
  uni.showModal({
    title: '删除确认', content: '确定删除该积分记录？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await removeScoreRecord(it.id)
        list.value = list.value.filter(x => x.id !== it.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}

onShow(async () => { await loadClasses(); load() })
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.bar-text { font-size: 24rpx; color: var(--c-sub); }
.act { font-size: 26rpx; color: var(--c-blue); padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.score { font-size: 28rpx; font-weight: 700; color: #e6a23c; }
.meta { display: flex; gap: 12rpx; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; flex-wrap: wrap; }
.desc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; }
.ops { display: flex; gap: 20rpx; margin-top: 12rpx; }
.op { font-size: 24rpx; color: var(--c-blue); }
.op.del { color: #e64340; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.area { height: 150rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
</style>