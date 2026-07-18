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
      <view class="field">
        <text class="label">年级</text>
        <picker :range="grades" :value="form.gradeIdx" @change="(e) => (form.gradeIdx = +e.detail.value)">
          <view class="picker">{{ grades[form.gradeIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">班级</text>
        <picker :range="classOpts" :value="form.classIdx" @change="(e) => (form.classIdx = +e.detail.value)">
          <view class="picker">{{ classOpts[form.classIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">班级名称（自动生成）</text>
        <view class="readonly">{{ className }}</view>
      </view>

      <view class="field">
        <text class="label">年度</text>
        <picker :range="years" :value="form.yearIdx" @change="(e) => (form.yearIdx = +e.detail.value)">
          <view class="picker">{{ years[form.yearIdx] }} 年</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">季度</text>
        <picker :range="quarters" :value="form.quarterIdx" @change="(e) => (form.quarterIdx = +e.detail.value)">
          <view class="picker">{{ quarters[form.quarterIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">学期（自动生成）</text>
        <view class="readonly">{{ term }}</view>
      </view>

      <view class="field">
        <text class="label">班主任姓名</text>
        <input v-model="form.headTeacher" placeholder="班主任姓名" />
      </view>

      <button class="save" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'

const list = ref([])
const showForm = ref(false)

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const classOpts = ['一班', '二班', '三班', '四班', '五班', '六班', '七班', '八班', '九班', '十班']
const quarters = ['春季', '秋季']

const thisYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i)) // 当前年前5年 + 当年

const form = ref({
  gradeIdx: 0,
  classIdx: 0,
  yearIdx: years.length - 1, // 默认当年
  quarterIdx: 0,
  headTeacher: '',
})

const className = computed(() => grades[form.value.gradeIdx] + classOpts[form.value.classIdx])
const term = computed(() => years[form.value.yearIdx] + quarters[form.value.quarterIdx] + '学期')

async function load() {
  list.value = await api.get('/classes')
}
onShow(load)

function open(c) {
  uni.navigateTo({ url: `/pages/students/students?classId=${c.id}&name=${encodeURIComponent(c.name)}` })
}

async function save() {
  if (!form.value.headTeacher.trim()) {
    return uni.showToast({ title: '请填写班主任姓名', icon: 'none' })
  }
  await api.post('/classes', {
    name: className.value,
    grade: grades[form.value.gradeIdx],
    classNo: classOpts[form.value.classIdx],
    term: term.value,
    headTeacher: form.value.headTeacher,
    subjects: [],
  })
  showForm.value = false
  form.value = { gradeIdx: 0, classIdx: 0, yearIdx: years.length - 1, quarterIdx: 0, headTeacher: '' }
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
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: #9aa0a6; margin-bottom: 8rpx; }
.picker, .readonly {
  border: 1px solid #e5e5e5;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: #4a3f35;
  min-height: 80rpx;
  line-height: 44rpx;
  box-sizing: border-box;
}
.readonly { background: #f7f7f7; color: #8a6d3b; }
.field input {
  width: 100%; height: 80rpx; min-height: 80rpx; line-height: 44rpx;
  border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: #333; background: #fff;
  box-sizing: border-box;
}
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
