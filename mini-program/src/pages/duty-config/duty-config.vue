<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">值日配置</view>
    <view class="bar">
      <picker :range="classOpts" range-key="name" :value="classIdx" @change="onClassChange">
        <view class="sel">{{ classes[classIdx]?.name || '请选择班级' }} ▾</view>
      </picker>
      <text class="act" @click="openAdd">＋ 新增</text>
    </view>

    <view v-if="!classId" class="empty">请先选择班级</view>
    <view v-else-if="loading" class="loading">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无值日配置，点击新增</view>
    <view v-else class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="it-top">
          <text class="name">{{ it.duties?.length || 0 }} 个职务</text>
          <view class="ops">
            <text class="op" @click="openEdit(it)">编辑</text>
            <text class="op del" @click="remove(it)">删除</text>
          </view>
        </view>
        <view class="duties">
          <view v-for="d in it.duties" :key="d" class="duty">
            <text class="d-name">{{ d }}</text>
            <view class="d-students">
              <text v-for="s in (it.assignments?.[d] || [])" :key="s" class="d-stu">{{ s }}</text>
              <text v-if="!(it.assignments?.[d] || []).length" class="d-none">未分配</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ editing ? '编辑' : '新增' }}值日配置</view>
        <view class="field">
          <text class="label">职务列表</text>
          <view class="add-row">
            <input v-model="newDuty" class="inp" placeholder="如：值日生、组长" @confirm="addDuty" />
            <text class="add-btn" @click="addDuty">添加</text>
          </view>
          <view class="tag-list">
            <text v-for="d in form.duties" :key="d" class="tag" @click="removeDuty(d)">{{ d }} ✕</text>
            <text v-if="!form.duties.length" class="hint">暂未添加职务</text>
          </view>
        </view>
        <view v-if="form.duties.length" class="field">
          <text class="label">学生分配</text>
          <view v-for="d in form.duties" :key="d" class="duty-edit">
            <text class="d-name">{{ d }}</text>
            <view class="stu-list">
              <text
                v-for="s in students"
                :key="s.id"
                :class="['stu', (form.assignments[d] || []).includes(s.name) ? 'on' : '']"
                @click="toggleStudent(d, s.name)"
              >{{ s.name }}</text>
              <text v-if="!students.length" class="hint">该班级暂无学生</text>
            </view>
          </view>
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
import api from '../../common/request'
import { theme } from '../../common/store'

const loading = ref(false)
const list = ref([])
const classId = ref('')
const classIdx = ref(0)
const classes = ref([])
const classOpts = ref([])
const students = ref([])
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const newDuty = ref('')
const form = ref({ duties: [], assignments: {} })

function onClassChange(e) {
  classIdx.value = e.detail.value
  const c = classes.value[e.detail.value]
  if (c) { classId.value = c.id; load(); loadStudents() }
}

async function loadClasses() {
  try {
    const res = await api.get('/classes?take=200')
    classes.value = Array.isArray(res) ? res : (res.items || [])
    classOpts.value = classes.value.map(c => c.name)
  } catch (e) { classes.value = [] }
}

async function loadStudents() {
  if (!classId.value) { students.value = []; return }
  try {
    const res = await api.get('/students?classId=' + classId.value + '&take=200')
    students.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { students.value = [] }
}

async function load() {
  if (!classId.value) { list.value = []; return }
  loading.value = true
  try {
    const res = await api.get('/class-duty-configs?classId=' + classId.value)
    list.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  if (!classId.value) return uni.showToast({ title: '请先选择班级', icon: 'none' })
  editing.value = null
  form.value = { duties: [], assignments: {} }
  newDuty.value = ''
  showForm.value = true
}

function openEdit(it) {
  editing.value = it
  form.value = { duties: [...(it.duties || [])], assignments: JSON.parse(JSON.stringify(it.assignments || {})) }
  newDuty.value = ''
  showForm.value = true
}

function addDuty() {
  const d = newDuty.value.trim()
  if (!d) return
  if (form.value.duties.includes(d)) return uni.showToast({ title: '职务已存在', icon: 'none' })
  form.value.duties.push(d)
  if (!form.value.assignments[d]) form.value.assignments[d] = []
  newDuty.value = ''
}

function removeDuty(d) {
  form.value.duties = form.value.duties.filter(x => x !== d)
  delete form.value.assignments[d]
}

function toggleStudent(duty, name) {
  if (!form.value.assignments[duty]) form.value.assignments[duty] = []
  const i = form.value.assignments[duty].indexOf(name)
  if (i >= 0) form.value.assignments[duty].splice(i, 1)
  else form.value.assignments[duty].push(name)
}

async function submit() {
  if (!form.value.duties.length) return uni.showToast({ title: '请至少添加一个职务', icon: 'none' })
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    if (editing.value) {
      await api.patch('/class-duty-configs/' + editing.value.id, payload)
    } else {
      await api.post('/class-duty-configs', payload)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
  finally { saving.value = false }
}

async function remove(it) {
  uni.showModal({
    title: '删除确认', content: '确定删除该值日配置？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/class-duty-configs/' + it.id)
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
.sel { font-size: 26rpx; color: #409eff; padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.act { font-size: 26rpx; color: #409eff; padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.name { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ops { display: flex; gap: 20rpx; }
.op { font-size: 24rpx; color: #409eff; }
.op.del { color: #e64340; }
.duties { display: flex; flex-wrap: wrap; gap: 12rpx; }
.duty { background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 18rpx; flex: 1; min-width: 200rpx; }
.d-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 8rpx; }
.d-students { display: flex; flex-wrap: wrap; gap: 6rpx; }
.d-stu { font-size: 22rpx; color: #67c23a; background: #f0f9eb; padding: 2rpx 12rpx; border-radius: 20rpx; }
.d-none { font-size: 22rpx; color: var(--c-sub); }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.add-row { display: flex; gap: 12rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; flex: 1; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.add-btn { font-size: 26rpx; color: #67c23a; padding: 14rpx 24rpx; background: #f0f9eb; border-radius: 12rpx; white-space: nowrap; }
.tag-list { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.tag { font-size: 24rpx; color: #e6a23c; background: #fdf6ec; padding: 4rpx 16rpx; border-radius: 20rpx; }
.hint { font-size: 24rpx; color: var(--c-sub); }
.duty-edit { background: var(--c-card2); padding: 14rpx; border-radius: 12rpx; margin-bottom: 10rpx; }
.stu-list { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx; }
.stu { font-size: 22rpx; color: var(--c-sub); padding: 4rpx 14rpx; border: 1px solid var(--c-input-border); border-radius: 20rpx; }
.stu.on { color: #e6a23c; background: #fdf6ec; border-color: #e6a23c; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
</style>