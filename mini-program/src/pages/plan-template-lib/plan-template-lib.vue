<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">文案模板库</view>
    <view class="bar">
      <text class="bar-text">管理教案模板，支持按学科、年级、课型分类</text>
      <text class="act" @click="openAdd">＋ 添加</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无模板，点击添加</view>
    <view v-else class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="it-top">
          <text class="name">{{ it.title }}</text>
          <text class="cat">{{ it.subject }}</text>
        </view>
        <view class="meta">
          <text>{{ it.grade }}</text>
          <text>{{ it.lessonType }}</text>
        </view>
        <view v-if="it.content" class="desc">{{ it.content }}</view>
        <view class="ops">
          <text class="op" @click="openEdit(it)">编辑</text>
          <text class="op del" @click="remove(it)">删除</text>
        </view>
      </view>
    </view>

    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ editing ? '编辑' : '新增' }}模板</view>
        <view class="field">
          <text class="label">标题 *</text>
          <input v-model="form.title" class="inp" placeholder="如：小学语文《静夜思》教案" />
        </view>
        <view class="field">
          <text class="label">学科</text>
          <picker :range="subjects" :value="subIdx" @change="onSubChange">
            <view class="picker">{{ form.subject || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">年级</text>
          <picker :range="grades" :value="gradeIdx" @change="onGradeChange">
            <view class="picker">{{ form.grade || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">课型</text>
          <picker :range="lessonTypes" :value="lessonIdx" @change="onLessonChange">
            <view class="picker">{{ form.lessonType || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">教案内容</text>
          <textarea v-model="form.content" class="inp area" placeholder="教案内容" />
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

const list = ref([])
const loading = ref(false)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const subjects = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '体育', '美术', '其他']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const lessonTypes = ['新授课', '复习课', '练习课', '讲评课', '活动课', '其他']
const subIdx = ref(0)
const gradeIdx = ref(0)
const lessonIdx = ref(0)
const form = ref({ title: '', subject: '语文', grade: '一年级', lessonType: '新授课', content: '' })

function onSubChange(e) { subIdx.value = e.detail.value; form.value.subject = subjects[e.detail.value] }
function onGradeChange(e) { gradeIdx.value = e.detail.value; form.value.grade = grades[e.detail.value] }
function onLessonChange(e) { lessonIdx.value = e.detail.value; form.value.lessonType = lessonTypes[e.detail.value] }

async function load() {
  loading.value = true
  try {
    const res = await api.get('/lesson-plan-templates?take=200')
    list.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.value = { title: '', subject: '语文', grade: '一年级', lessonType: '新授课', content: '' }
  subIdx.value = 0; gradeIdx.value = 0; lessonIdx.value = 0
  showForm.value = true
}

function openEdit(it) {
  editing.value = it
  form.value = { title: it.title, subject: it.subject || '语文', grade: it.grade || '一年级', lessonType: it.lessonType || '新授课', content: it.content || '' }
  subIdx.value = subjects.indexOf(it.subject) >= 0 ? subjects.indexOf(it.subject) : 0
  gradeIdx.value = grades.indexOf(it.grade) >= 0 ? grades.indexOf(it.grade) : 0
  lessonIdx.value = lessonTypes.indexOf(it.lessonType) >= 0 ? lessonTypes.indexOf(it.lessonType) : 0
  showForm.value = true
}

async function submit() {
  if (!form.value.title.trim()) return uni.showToast({ title: '请填写标题', icon: 'none' })
  saving.value = true
  try {
    if (editing.value) {
      await api.patch('/lesson-plan-templates/' + editing.value.id, form.value)
    } else {
      await api.post('/lesson-plan-templates', form.value)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
  finally { saving.value = false }
}

async function remove(it) {
  uni.showModal({
    title: '删除确认', content: '确定删除"' + it.title + '"？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/lesson-plan-templates/' + it.id)
        list.value = list.value.filter(x => x.id !== it.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.bar-text { font-size: 24rpx; color: var(--c-sub); }
.act { font-size: 26rpx; color: #409eff; padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 700; color: var(--c-title); flex: 1; }
.cat { font-size: 22rpx; color: var(--c-sub); background: var(--c-card2); padding: 2rpx 12rpx; border-radius: 20rpx; }
.meta { display: flex; gap: 16rpx; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.desc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ops { display: flex; gap: 20rpx; margin-top: 12rpx; }
.op { font-size: 24rpx; color: #409eff; }
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