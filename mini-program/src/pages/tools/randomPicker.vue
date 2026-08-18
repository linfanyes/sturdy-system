<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">随机点名</view>
    <view class="sub">滚动动画抽取学生</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">抽取模式</text>
        <picker :range="modeOptions" :value="modeIdx" @change="modeIdx = +$event.detail.value">
          <view class="form-pk">{{ modeOptions[modeIdx] }}</view>
        </picker>
      </view>
      <view v-if="modeIdx === 1" class="form-row">
        <text class="form-lb">抽取人数</text>
        <input v-model.number="pickCount" class="form-ipt" type="number" min="1" maxlength="2" />
      </view>
    </view>

    <!-- 名单输入 -->
    <view class="label">学生名单（每行一个名字）</view>
    <textarea v-model="namesText" class="textarea" placeholder="输入学生名字，每行一个" maxlength="500" />
    <view class="count">共 {{ namesList.length }} 人</view>

    <!-- 结果展示 -->
    <view class="display" :class="{ rolling }">
      <text class="display-text">{{ displayText }}</text>
    </view>

    <button class="btn" :disabled="rolling || !namesList.length" @click="startRoll">
      {{ rolling ? '抽取中…' : '开始抽取' }}
    </button>

    <!-- 历史记录 -->
    <view v-if="history.length" class="history">
      <view class="history-hd">历史记录</view>
      <view v-for="(h, i) in history" :key="i" class="history-item">
        <text class="h-mode">{{ modeLabel(h.mode) }}</text>
        <text class="h-result">{{ h.result.join('、') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses, listStudents } from '../../api/students'

const classes = ref([])
const classIdx = ref(-1)
const modeIdx = ref(0)
const pickCount = ref(3)
const namesText = ref('')
const rolling = ref(false)
const displayText = ref('点击开始抽取')
const finalResult = ref([])
const history = ref([])
const remaining = ref([])

const modeOptions = ['单人', '多人', '去重抽签']

const classOpts = computed(() => classes.value.map((c) => c.name))
const namesList = computed(() => namesText.value.split('\n').map((s) => s.trim()).filter(Boolean))

async function loadClasses() {
  try {
    classes.value = await listClasses({ silent: true })
    if (classes.value.length) {
      classIdx.value = 0
      await loadStudents()
    }
  } catch {
    classes.value = []
  }
}

async function loadStudents() {
  if (classIdx.value < 0) return
  const cls = classes.value[classIdx.value]
  if (!cls) return
  try {
    const list = await listStudents(cls.id, { silent: true })
    if (list.length) {
      namesText.value = list.map((s) => s.name).join('\n')
      remaining.value = list.map((s) => s.name)
    }
  } catch {
    // ignore
  }
}

async function onClassChange(e) {
  classIdx.value = +e.detail.value
  await loadStudents()
}

let timer = null
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function startRoll() {
  const pool = remaining.value.length && modeIdx.value === 2 ? remaining.value : namesList.value
  if (!pool.length) {
    return uni.showToast({ title: '请先输入学生名单', icon: 'none' })
  }
  if (modeIdx.value === 1 && pool.length < pickCount.value) {
    return uni.showToast({ title: `名单不足 ${pickCount.value} 人`, icon: 'none' })
  }
  rolling.value = true
  finalResult.value = []
  stopTimer()
  timer = setInterval(() => {
    displayText.value = pool[Math.floor(Math.random() * pool.length)]
  }, 50)
  setTimeout(() => {
    stopTimer()
    rolling.value = false
    settle(pool)
  }, 2000)
}

function settle(pool) {
  let result = []
  if (modeIdx.value === 0) {
    result = [pool[Math.floor(Math.random() * pool.length)]]
  } else if (modeIdx.value === 1) {
    const copy = [...pool].sort(() => Math.random() - 0.5)
    result = copy.slice(0, Math.min(pickCount.value, copy.length))
  } else {
    const idx = Math.floor(Math.random() * pool.length)
    result = [pool[idx]]
    remaining.value = pool.filter((_, i) => i !== idx)
  }
  finalResult.value = result
  displayText.value = result.join('、')
  history.value.unshift({ mode: modeOptions[modeIdx.value], result })
  if (history.value.length > 10) history.value.length = 10
}

function modeLabel(m) {
  return m || '抽取'
}

onMounted(loadClasses)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.label { font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.textarea { width: 100%; background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; min-height: 160rpx; box-sizing: border-box; }
.count { text-align: right; font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; margin-bottom: 24rpx; }
.display { background: var(--c-card); border-radius: 16rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; min-height: 120rpx; display: flex; align-items: center; justify-content: center; }
.display.rolling { background: var(--c-primary-light, #fff8e0); }
.display-text { font-size: 48rpx; font-weight: 700; color: var(--c-title); }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; margin-bottom: 24rpx; }
.btn[disabled] { opacity: 0.6; }
.history { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.history-hd { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.history-item { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-border, #eee); }
.history-item:last-child { border-bottom: none; }
.h-mode { font-size: 22rpx; color: var(--c-primary); background: var(--c-input); border-radius: 8rpx; padding: 4rpx 12rpx; margin-right: 16rpx; }
.h-result { font-size: 26rpx; color: var(--c-text); flex: 1; }
</style>
