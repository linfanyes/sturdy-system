<template>
  <view class="page">
    <view class="list">
      <view
        v-for="c in list"
        :key="c.id"
        class="item"
        @click="open(c)"
      >
        <view class="name">{{ c.name }}</view>
        <view class="meta">{{ c.grade }} · {{ c.term || '未设学期' }}</view>
      </view>
      <view v-if="!list.length" class="empty">还没有班级，点下方按钮新建</view>
    </view>

    <button class="add" @click="showForm = !showForm">{{ showForm ? '收起' : '＋ 新建班级' }}</button>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="班级名称，如 三年级二班" />
      <input v-model="form.grade" placeholder="年级，如 三年级" />
      <input v-model="form.classNo" placeholder="班号，如 2" />
      <input v-model="form.term" placeholder="学期，如 2026春季学期" />
      <input v-model="form.headTeacher" placeholder="班主任姓名" />
      <button class="save" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth } from '../../common/store'

const list = ref([])
const showForm = ref(false)
const form = ref({ name: '', grade: '', classNo: '', term: '', headTeacher: '' })

async function load() {
  list.value = await api.get('/classes')
}
onShow(load)

function open(c) {
  uni.navigateTo({ url: `/pages/students/students?classId=${c.id}&name=${encodeURIComponent(c.name)}` })
}

async function save() {
  if (!form.value.name) return uni.showToast({ title: '请填写班级名称', icon: 'none' })
  await api.post('/classes', { ...form.value, subjects: [] })
  showForm.value = false
  form.value = { name: '', grade: '', classNo: '', term: '', headTeacher: '' }
  load()
}
</script>

<style scoped>
.page { padding: 30rpx; }
.item {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
.name { font-size: 34rpx; font-weight: 600; color: #4a3f35; }
.meta { color: #9aa0a6; font-size: 26rpx; margin-top: 8rpx; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
.add {
  margin-top: 20rpx;
  background: #e6a23c;
  color: #fff;
  border-radius: 50rpx;
}
.form {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}
.form input {
  border: 1px solid #eee;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 18rpx;
  font-size: 28rpx;
}
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 10rpx; }
</style>
