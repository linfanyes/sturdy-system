<template>
  <view class="page">
    <view class="bar">{{ className }}</view>

    <view class="list">
      <view v-for="s in list" :key="s.id" class="item">
        <view class="top">
          <text class="name">{{ s.name }}</text>
          <text class="no">学号 {{ s.studentNo }}</text>
        </view>
        <view class="meta">
          <text>{{ s.gender }}</text>
          <text v-if="s.duty" class="duty">· {{ s.duty }}</text>
          <text v-if="s.seatRow" class="seat">· 第{{ s.seatRow }}行第{{ s.seatCol }}列</text>
          <text v-else class="seat">· 未排座</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无学生，点下方添加</view>
    </view>

    <button class="add" @click="showForm = !showForm">{{ showForm ? '收起' : '＋ 添加学生' }}</button>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="姓名" />
      <picker :range="['男', '女']" @change="(e) => (form.gender = ['男', '女'][e.detail.value])">
        <view class="picker">性别：{{ form.gender }}</view>
      </picker>
      <input v-model="form.studentNo" placeholder="学号" />
      <input v-model="form.parentName" placeholder="家长姓名" />
      <input v-model="form.parentPhone" placeholder="家长电话" />
      <button class="save" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import api from '../../common/request'

const classId = ref('')
const className = ref('')
const list = ref([])
const showForm = ref(false)
const form = ref({ name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' })

onLoad((q) => {
  classId.value = q.classId
  className.value = q.name || '学生管理'
})

async function load() {
  const all = await api.get('/students')
  list.value = all.filter((s) => s.classId === classId.value)
}
onShow(load)

async function save() {
  if (!form.value.name) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  await api.post('/students', {
    ...form.value,
    classId: classId.value,
    seatNo: list.value.length + 1,
    tags: [],
  })
  showForm.value = false
  form.value = { name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' }
  load()
}
</script>

<style scoped>
.page { padding: 30rpx; }
.bar { font-size: 34rpx; font-weight: 700; color: #4a3f35; margin-bottom: 20rpx; }
.item { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; }
.no { color: #9aa0a6; font-size: 24rpx; }
.meta { color: #9aa0a6; font-size: 26rpx; margin-top: 8rpx; }
.duty { color: #409eff; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
.add { margin-top: 16rpx; background: #e6a23c; color: #fff; border-radius: 50rpx; }
.form { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 30rpx; }
.form input, .picker { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 18rpx; font-size: 28rpx; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; }
</style>
