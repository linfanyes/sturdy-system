<template>
  <view class="page" :class="{ dark }">
    <view class="hd">随机点名</view>

    <view class="cls-row">
      <picker :range="classNames" @change="onClass"><view class="picker">{{ curClass || '选择班级（绑定真实名单）' }}</view></picker>
      <view class="switch-box">
        <text class="sw-label">排除已点</text>
        <switch :checked="excludePicked" @change="e => excludePicked = e.detail.value" color="#07c160" />
      </view>
    </view>

    <view class="stage" @click="roll">
      <text class="name" :class="{ spin: spinning }">{{ picked || '点击开始' }}</text>
    </view>
    <view class="row">
      <button class="btn" @click="roll">{{ spinning ? '…' : '开始点名' }}</button>
      <button class="btn ghost" @click="clearClass">清空名单</button>
    </view>

    <view class="list-box">
      <view class="lb-title">名单（每行一个，可手动编辑）</view>
      <textarea class="ta" v-model="namesText" :placeholder="ph" />
    </view>
    <view class="hist" v-if="history.length">最近点过：{{ history.slice(-6).join('、') }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { api } from '../../common/request'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const classes = ref([])
const classNames = computed(() => classes.value.map((c) => c.name))
const curClass = ref('')
const curClassId = ref('')
const namesText = ref('')
const ph = '张三\n李四\n王五'
const names = computed(() => namesText.value.split('\n').map((s) => s.trim()).filter(Boolean))
const picked = ref('')
const spinning = ref(false)
const history = ref([])
const excludePicked = ref(false)
let timer = null

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    const list = res?.items || res?.data || res || []
    classes.value = Array.isArray(list) ? list : []
  } catch (e) { /* 忽略 */ }
}
function onClass(e) {
  const c = classes.value[e.detail.value]
  if (!c) return
  curClass.value = c.name
  curClassId.value = c.id
  loadStudents(c.id)
}
async function loadStudents(classId) {
  try {
    const res = await api.get('/students?pageSize=1000')
    const list = res?.items || res?.data || res || []
    const ns = (Array.isArray(list) ? list : [])
      .filter((s) => s.classId === classId)
      .map((s) => s.name || s.studentName || s)
      .filter(Boolean)
    if (ns.length) { namesText.value = ns.join('\n'); history.value = []; uni.showToast({ title: '已导入 ' + ns.length + ' 人', icon: 'success' }) }
    else uni.showToast({ title: '该班暂无学生，可手动输入', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '导入失败，请手动输入', icon: 'none' })
  }
}
function clearClass() { namesText.value = ''; curClass.value = ''; curClassId.value = ''; history.value = []; picked.value = '' }

function roll() {
  if (spinning.value) return
  let pool = names.value
  if (excludePicked.value && history.value.length) pool = pool.filter((n) => !history.value.includes(n))
  if (!pool.length) { uni.showToast({ title: '名单为空', icon: 'none' }); return }
  spinning.value = true
  let n = 0
  timer = setInterval(() => {
    picked.value = pool[n % pool.length]
    n++
  }, 70)
  setTimeout(() => {
    clearInterval(timer)
    spinning.value = false
    const final = pool[Math.floor(Math.random() * pool.length)]
    picked.value = final
    history.value.push(final)
    uni.vibrateShort({ fail() {} })
  }, 1500)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(loadClasses)
onUnload(stop)
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.cls-row { width: 600rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 20rpx 0; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; color: var(--c-title); min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; flex: 1; }
.switch-box { display: flex; align-items: center; gap: 8rpx; }
.sw-label { font-size: 22rpx; color: var(--c-sub); }
.stage { width: 600rpx; height: 240rpx; margin: 20rpx 0; background: var(--c-card); border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 20rpx var(--c-shadow); }
.name { font-size: 64rpx; font-weight: 800; color: #e6a23c; }
.name.spin { color: var(--c-sub); }
.row { display: flex; gap: 20rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 50rpx; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.list-box { width: 600rpx; margin-top: 30rpx; }
.lb-title { font-size: 24rpx; color: var(--c-accent); margin-bottom: 10rpx; }
.ta { width: 100%; height: 220rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; color: var(--c-title); }
.hist { margin-top: 16rpx; font-size: 24rpx; color: var(--c-sub); }
</style>
