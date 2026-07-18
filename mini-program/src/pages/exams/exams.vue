<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="list">
      <view v-for="e in list" :key="e.id" class="item">
        <view class="info">
          <view class="name">{{ e.name }}</view>
          <view class="meta">{{ e.date }} · {{ (e.subjects || []).join('、') }}</view>
        </view>
        <view class="ops">
          <text class="op ana" @click.stop="analyze(e)">分析</text>
          <text class="op del" @click.stop="remove(e)">删除</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无考试，点下方新建</view>
    </view>

    <button class="add" :disabled="loading" @click="showForm = !showForm">{{ showForm ? '收起' : '＋ 新建考试' }}</button>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="考试名称，如 期中考试" />
      <picker :range="classOpts" @change="(ev) => { const c = classes[ev.detail.value]; form.classId = c.id; form.term = c.term || '' }">
        <view class="picker">班级：{{ selClassName }}</view>
      </picker>
      <view class="sub-label">学期（自动取所选班级）</view>
      <view class="readonly">{{ form.term || '所选班级未设学期' }}</view>
      <input v-model="form.date" placeholder="日期，如 2026-05-12" />
      <view class="sub-label">考试科目（可多选）</view>
      <view class="chips">
        <view
          v-for="s in subjects"
          :key="s"
          :class="['chip', form.subjects.includes(s) ? 'on' : '']"
          @click="toggle(s)"
        >{{ s }}</view>
      </view>
      <button class="save" :disabled="loading" @click="save">{{ loading ? '保存中…' : '保存（自动建成绩表）' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const classes = ref([])
const subjects = ref([])
const showForm = ref(false)
const loading = ref(false)
const form = ref({ name: '', classId: '', date: '', subjects: [] })

const classOpts = computed(() => classes.value.map((c) => c.name))
const selClassName = computed(() => {
  const c = classes.value.find((x) => x.id === form.value.classId)
  return c ? c.name : '请选择'
})

async function load() {
  list.value = await api.get('/exams')
  classes.value = await api.get('/classes')
  const pub = await api.get('/config/public')
  subjects.value = pub.defaultSubjects || []
}
onShow(load)

function toggle(s) {
  const arr = form.value.subjects
  form.value.subjects = arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]
}

function analyze(e) {
  uni.navigateTo({ url: '/pages/ai-exam/ai-exam?examId=' + encodeURIComponent(e.id) })
}

async function save() {
  if (loading.value) return
  if (!form.value.name || !form.value.classId || !form.value.subjects.length) {
    return uni.showToast({ title: '请完善考试信息', icon: 'none' })
  }
  loading.value = true
  try {
    await api.post('/exams', { ...form.value })
    uni.showToast({ title: '考试已创建', icon: 'success' })
    showForm.value = false
    form.value = { name: '', classId: '', date: '', subjects: [], term: '' }
    await load()
  } catch (err) {
    uni.showToast({ title: '保存失败：' + (err.message || '请重试'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function remove(e) {
  uni.showModal({
    title: '删除考试',
    content: `确定删除「${e.name}」吗？将一并删除其成绩记录，操作不可恢复。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/exams/' + e.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (err) {
        uni.showToast({ title: '删除失败：' + (err.message || '请重试'), icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.item { background: var(--c-card); border-radius: 20rpx; padding: 26rpx 30rpx; margin-bottom: 16rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-title); }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.ops { display: flex; gap: 20rpx; flex-shrink: 0; }
.op { font-size: 26rpx; padding: 8rpx 16rpx; border-radius: 24rpx; }
.ana { color: var(--c-accent); background: rgba(230, 162, 60, 0.14); }
.del { color: #e64340; background: rgba(230, 67, 64, 0.12); }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.add { margin-top: 16rpx; background: var(--c-accent); color: #fff; border-radius: 50rpx; }
.add[disabled] { opacity: 0.6; }
.form { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.form input, .picker, .readonly { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; color: var(--c-text); background: var(--c-input); }
.readonly { color: var(--c-sub); }
.sub-label { color: var(--c-sub); font-size: 26rpx; margin: 10rpx 0; line-height: 1.6; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 20rpx; }
.chip { padding: 12rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); font-size: 26rpx; }
.chip.on { background: var(--c-accent); color: #fff; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.save[disabled] { opacity: 0.6; }
</style>
