<template>
  <view class="page">
    <view class="list">
      <view v-for="e in list" :key="e.id" class="item">
        <view class="name">{{ e.name }}</view>
        <view class="meta">{{ e.date }} · {{ (e.subjects || []).join('、') }}</view>
      </view>
      <view v-if="!list.length" class="empty">暂无考试，点下方新建</view>
    </view>

    <button class="add" @click="showForm = !showForm">{{ showForm ? '收起' : '＋ 新建考试' }}</button>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="考试名称，如 期中考试" />
      <picker :range="classOpts" @change="(ev) => (form.classId = classes[ev.detail.value].id)">
        <view class="picker">班级：{{ selClassName }}</view>
      </picker>
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
      <button class="save" @click="save">保存（自动建成绩表）</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'

const list = ref([])
const classes = ref([])
const subjects = ref([])
const showForm = ref(false)
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

async function save() {
  if (!form.value.name || !form.value.classId || !form.value.subjects.length) {
    return uni.showToast({ title: '请完善考试信息', icon: 'none' })
  }
  await api.post('/exams', { ...form.value, term: '' })
  showForm.value = false
  form.value = { name: '', classId: '', date: '', subjects: [] }
  load()
}
</script>

<style scoped>
.page { padding: 30rpx; }
.item { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; }
.name { font-size: 32rpx; font-weight: 600; }
.meta { color: #9aa0a6; font-size: 26rpx; margin-top: 8rpx; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
.add { margin-top: 16rpx; background: #e6a23c; color: #fff; border-radius: 50rpx; }
.form { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 30rpx; }
.form input, .picker { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 18rpx; font-size: 28rpx; }
.sub-label { color: #9aa0a6; font-size: 26rpx; margin: 10rpx 0; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 20rpx; }
.chip { padding: 12rpx 24rpx; border-radius: 30rpx; background: #f5f5f5; color: #666; font-size: 26rpx; }
.chip.on { background: #e6a23c; color: #fff; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; }
</style>
