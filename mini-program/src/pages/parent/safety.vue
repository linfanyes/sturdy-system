<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { parentReport, parentCheckin } from '../../api/safety'

const studentName = ref('')
const tab = ref('report')

const type = ref('bullying')
const content = ref('')
const level = ref('medium')
const anonymous = ref(true)
const submitting = ref(false)

const checkinType = ref('leave')
const note = ref('')
const checking = ref(false)

onLoad((q) => {
  if (q && q.name) studentName.value = q.name
})

async function submitReport() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请描述具体情况', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await parentReport({
      type: type.value,
      content: content.value.trim(),
      level: level.value,
      anonymous: anonymous.value,
    })
    uni.showToast({ title: '已提交，谢谢你', icon: 'success' })
    content.value = ''
  } catch (e) {
    uni.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function submitCheckin() {
  checking.value = true
  try {
    await parentCheckin({ type: checkinType.value, note: note.value.trim() || null })
    uni.showToast({ title: checkinType.value === 'leave' ? '已记录离校' : '已记录到家', icon: 'success' })
    note.value = ''
  } catch (e) {
    uni.showToast({ title: '打卡失败，请稍后重试', icon: 'none' })
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">🛡️ 校园安全 · 防欺凌</text>
      <text class="sub">{{ studentName ? studentName + ' · ' : '' }}你我可以一起守护安全</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'report' }" @click="tab = 'report'">匿名举报</view>
      <view class="tab" :class="{ on: tab === 'checkin' }" @click="tab = 'checkin'">安全打卡</view>
    </view>

    <view v-if="tab === 'report'" class="card">
      <text class="label">类型</text>
      <view class="opts">
        <view class="opt" :class="{ on: type === 'bullying' }" @click="type = 'bullying'">校园欺凌</view>
        <view class="opt" :class="{ on: type === 'security' }" @click="type = 'security'">安全隐患</view>
        <view class="opt" :class="{ on: type === 'other' }" @click="type = 'other'">其他</view>
      </view>

      <text class="label">严重程度</text>
      <view class="opts">
        <view class="opt" :class="{ on: level === 'low' }" @click="level = 'low'">低</view>
        <view class="opt" :class="{ on: level === 'medium' }" @click="level = 'medium'">中</view>
        <view class="opt" :class="{ on: level === 'high' }" @click="level = 'high'">高</view>
      </view>

      <text class="label">具体情况（可放心描述）</text>
      <textarea v-model="content" class="area" placeholder="发生了什么？在哪里？有没有人受伤？越具体越便于老师处理。" />
      <view class="anon" @click="anonymous = !anonymous">
        <text>{{ anonymous ? '🔘' : '⚪' }} 匿名提交（默认开启，保护你）</text>
      </view>

      <button class="btn" :disabled="submitting" @click="submitReport">{{ submitting ? '提交中…' : '提交举报' }}</button>
      <text class="tip">你的信息将被严格保密；如遇紧急危险，请立即拨打 110 或告知身边信任的成年人。</text>
    </view>

    <view v-else class="card">
      <text class="label">打卡类型</text>
      <view class="opts">
        <view class="opt" :class="{ on: checkinType === 'leave' }" @click="checkinType = 'leave'">离校</view>
        <view class="opt" :class="{ on: checkinType === 'arrive' }" @click="checkinType = 'arrive'">已到家</view>
      </view>
      <text class="label">备注（选填）</text>
      <input v-model="note" class="inp" placeholder="如：由奶奶接送 / 已安全到家" />
      <button class="btn" :disabled="checking" @click="submitCheckin">{{ checking ? '打卡中…' : '确认打卡' }}</button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx 28rpx; background: #f7f8fa; min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.title { font-size: 38rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #6b7280; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; background: #fff; font-size: 28rpx; color: #6b7280; }
.tab.on { background: #f43f5e; color: #fff; font-weight: 600; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.label { display: block; font-size: 26rpx; color: #374151; margin: 18rpx 0 10rpx; }
.opts { display: flex; flex-wrap: wrap; gap: 14rpx; }
.opt { padding: 14rpx 28rpx; border-radius: 999rpx; background: #f43f5e; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.opt.on { background: #f43f5e; color: #fff; }
.area { width: 100%; height: 180rpx; background: #f9fafb; border-radius: 14rpx; padding: 18rpx; font-size: 26rpx; box-sizing: border-box; }
.anon { margin: 16rpx 0; font-size: 24rpx; color: #6b7280; }
.btn { margin-top: 18rpx; background: #f43f5e; color: #fff; border-radius: 14rpx; font-size: 30rpx; }
.tip { display: block; margin-top: 16rpx; font-size: 22rpx; color: #9ca3af; line-height: 1.6; }
.inp { width: 100%; background: #f9fafb; border-radius: 14rpx; padding: 18rpx; font-size: 26rpx; box-sizing: border-box; }
</style>
