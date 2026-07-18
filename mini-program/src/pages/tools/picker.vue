<template>
  <view class="page">
    <view class="hd">随机点名</view>
    <view class="stage" @click="roll">
      <text class="name" :class="{ spin: spinning }">{{ picked || '点击开始' }}</text>
    </view>
    <view class="row">
      <button class="btn" @click="roll">{{ spinning ? '…' : '开始点名' }}</button>
      <button class="btn ghost" @click="loadStudents">导入学生</button>
    </view>
    <view class="list-box">
      <view class="lb-title">名单（每行一个，可编辑）</view>
      <textarea class="ta" v-model="namesText" :placeholder="ph" />
    </view>
    <view class="hist" v-if="history.length">最近：{{ history.slice(-5).join('、') }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { api } from '../../common/request'

const namesText = ref('')
const ph = '张三\n李四\n王五'
const names = computed(() => namesText.value.split('\n').map((s) => s.trim()).filter(Boolean))
const picked = ref('')
const spinning = ref(false)
const history = ref([])
let timer = null

function roll() {
  if (spinning.value) return
  if (!names.value.length) { uni.showToast({ title: '请先输入名单', icon: 'none' }); return }
  spinning.value = true
  let n = 0
  timer = setInterval(() => {
    picked.value = names.value[n % names.value.length]
    n++
  }, 70)
  setTimeout(() => {
    clearInterval(timer)
    spinning.value = false
    const final = names.value[Math.floor(Math.random() * names.value.length)]
    picked.value = final
    history.value.push(final)
    uni.vibrateShort()
  }, 1500)
}
async function loadStudents() {
  try {
    const res = await api.get('students?pageSize=200')
    const list = res?.items || res?.data || res || []
    const ns = (Array.isArray(list) ? list : []).map((s) => s.name || s.studentName || s).filter(Boolean)
    if (ns.length) { namesText.value = ns.join('\n'); uni.showToast({ title: '已导入 ' + ns.length + ' 人', icon: 'success' }) }
    else uni.showToast({ title: '未获取到学生', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '导入失败，请手动输入', icon: 'none' })
  }
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => { namesText.value = '' })
onUnload(() => stop())
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.stage { width: 600rpx; height: 240rpx; margin: 30rpx 0; background: #fff; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 20rpx rgba(160,123,59,.15); }
.name { font-size: 64rpx; font-weight: 800; color: #e6a23c; }
.name.spin { color: #bbb; }
.row { display: flex; gap: 20rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 50rpx; }
.btn.ghost { background: #fff; color: #a07b3b; border: 2rpx solid #e6a23c; }
.list-box { width: 600rpx; margin-top: 30rpx; }
.lb-title { font-size: 24rpx; color: #8a6d3b; margin-bottom: 10rpx; }
.ta { width: 100%; height: 220rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; }
.hist { margin-top: 16rpx; font-size: 24rpx; color: #999; }
</style>
