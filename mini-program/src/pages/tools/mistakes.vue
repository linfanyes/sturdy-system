<template>
  <view class="page" :class="{ dark }">
    <view class="hd">错题本</view>
    <view class="card">
      <view class="field-label">科目</view>
      <picker :range="subjects" @change="e => form.subject = subjects[e.detail.value]">
        <view class="picker">{{ form.subject || '请选择科目' }}</view>
      </picker>
      <view class="field-label">题目</view>
      <textarea v-model="form.question" class="ctrl area" placeholder="录入错题内容" />
      <view class="field-label">正确答案 / 解析</view>
      <textarea v-model="form.answer" class="ctrl area" placeholder="正确答案与解题思路" />
      <view class="field-label">错误原因</view>
      <input v-model="form.reason" class="ctrl" placeholder="如：审题失误 / 计算错误" />
      <button class="btn" @click="add">➕ 加入错题本</button>
    </view>

    <view class="filter">
      <view class="chip" :class="{ on: filter === '全部' }" @click="filter = '全部'">全部</view>
      <view v-for="s in subjects" :key="s" class="chip" :class="{ on: filter === s }" @click="filter = s">{{ s }}</view>
    </view>

    <view v-if="!shown.length" class="empty">暂无错题，先在上方录入吧</view>
    <view v-for="(m, i) in shown" :key="m.id" class="mitem">
      <view class="mtop"><text class="tag">{{ m.subject }}</text><text class="del" @click="remove(m.id)">删除</text></view>
      <view class="mq">{{ m.question }}</view>
      <view class="ma">✅ {{ m.answer }}</view>
      <view v-if="m.reason" class="mr">原因：{{ m.reason }}</view>
      <view class="mt">{{ m.time }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const KEY = 'math_mistakes'
const subjects = ['语文', '数学', '英语', '科学', '其他']
const form = ref({ subject: '', question: '', answer: '', reason: '' })
const items = ref([])
const filter = ref('全部')

function load() { items.value = uni.getStorageSync(KEY) || [] }
function persist() { uni.setStorageSync(KEY, items.value) }

function add() {
  if (!form.value.subject) return uni.showToast({ title: '请选择科目', icon: 'none' })
  if (!form.value.question.trim()) return uni.showToast({ title: '请输入题目', icon: 'none' })
  items.value.unshift({
    id: Date.now(),
    subject: form.value.subject,
    question: form.value.question.trim(),
    answer: form.value.answer.trim(),
    reason: form.value.reason.trim(),
    time: new Date().toLocaleString(),
  })
  persist()
  form.value = { subject: '', question: '', answer: '', reason: '' }
  uni.showToast({ title: '已加入', icon: 'success' })
}
function remove(id) {
  uni.showModal({
    title: '删除', content: '确认删除这道错题？',
    success: (r) => { if (r.confirm) { items.value = items.value.filter(x => x.id !== id); persist() } },
  })
}
const shown = computed(() => filter.value === '全部' ? items.value : items.value.filter(x => x.subject === filter.value))

onShow(load)
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.field-label { font-size: 26rpx; color: var(--c-accent); margin: 10rpx 0; }
.picker { background: var(--c-card2); border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; }
.ctrl { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-title); background: var(--c-input); }
.area { min-height: 120rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 50rpx; margin-top: 20rpx; }
.filter { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 24rpx 0 12rpx; }
.chip { padding: 10rpx 26rpx; background: var(--c-card); border-radius: 40rpx; font-size: 24rpx; color: var(--c-accent); }
.chip.on { background: #e6a23c; color: #fff; }
.empty { text-align: center; color: var(--c-sub); padding: 60rpx 0; font-size: 26rpx; }
.mitem { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.mtop { display: flex; justify-content: space-between; align-items: center; }
.tag { background: var(--c-card2); color: var(--c-accent); border-radius: 8rpx; padding: 4rpx 16rpx; font-size: 22rpx; }
.del { color: #e64340; font-size: 24rpx; }
.mq { font-size: 28rpx; color: var(--c-title); margin: 12rpx 0; }
.ma { font-size: 26rpx; color: #07c160; }
.mr { font-size: 24rpx; color: var(--c-accent); margin-top: 6rpx; }
.mt { font-size: 22rpx; color: var(--c-sub); margin-top: 10rpx; }
</style>
