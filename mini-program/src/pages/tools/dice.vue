<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">随机骰子</view>
    <view class="sub">添加选项，随机决定</view>

    <!-- 选项输入 -->
    <view class="form">
      <view class="label">选项（每行一个）</view>
      <textarea v-model="bulkText" class="textarea" placeholder="输入选项，每行一个" maxlength="300" />
      <view class="row">
        <input v-model="newOption" class="ipt" placeholder="单个添加" maxlength="20" />
        <button class="add-btn" @click="addOne">添加</button>
      </view>
    </view>

    <!-- 已添加选项 -->
    <view v-if="options.length" class="tags">
      <view v-for="(o, i) in options" :key="i" class="tag">
        <text>{{ o.text }}</text>
        <text class="del" @click="removeOption(i)">×</text>
      </view>
    </view>

    <!-- 结果展示 -->
    <view class="display" :class="{ rolling }">
      <text class="display-text">{{ displayText }}</text>
    </view>

    <button class="btn" :disabled="rolling || !options.length" @click="startRoll">
      {{ rolling ? '决定中…' : '开始决定' }}
    </button>

    <!-- 历史记录 -->
    <view v-if="history.length" class="history">
      <view class="history-hd">历史记录</view>
      <view v-for="(h, i) in history" :key="i" class="history-item">
        <text>{{ h }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { theme } from '../../common/store'

const STORAGE_KEY = 'mini_dice_history'

const bulkText = ref('')
const newOption = ref('')
const options = ref([])
const rolling = ref(false)
const displayText = ref('点击下方按钮开始')
const history = ref([])

function addOne() {
  const t = newOption.value.trim()
  if (!t) return
  if (options.value.some((o) => o.text === t)) return
  options.value.push({ text: t, weight: 1 })
  newOption.value = ''
}

function removeOption(i) {
  options.value.splice(i, 1)
}

// 批量添加
function addFromBulk() {
  const lines = bulkText.value.split('\n').map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return
  const existing = new Set(options.value.map((o) => o.text))
  for (const line of lines) {
    if (!existing.has(line)) options.value.push({ text: line, weight: 1 })
  }
  bulkText.value = ''
}

let timer = null
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function startRoll() {
  if (!options.value.length) {
    return uni.showToast({ title: '请先添加选项', icon: 'none' })
  }
  rolling.value = true
  stopTimer()
  timer = setInterval(() => {
    const idx = Math.floor(Math.random() * options.value.length)
    displayText.value = options.value[idx].text
  }, 60)
  setTimeout(() => {
    stopTimer()
    rolling.value = false
    const result = options.value[Math.floor(Math.random() * options.value.length)].text
    displayText.value = result
    recordHistory(result)
  }, 2000)
}

function recordHistory(result) {
  history.value.unshift(result)
  if (history.value.length > 20) history.value.length = 20
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(history.value))
  } catch {
    // ignore
  }
}

onMounted(() => {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) history.value = JSON.parse(raw) || []
  } catch {
    history.value = []
  }
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.label { font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.textarea { width: 100%; background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; min-height: 120rpx; box-sizing: border-box; margin-bottom: 16rpx; }
.row { display: flex; gap: 12rpx; }
.ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.add-btn { background: var(--c-primary); color: #fff; border-radius: 10rpx; font-size: 26rpx; padding: 14rpx 24rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.tag { display: flex; align-items: center; gap: 8rpx; background: var(--c-card); border-radius: 30rpx; padding: 10rpx 20rpx; font-size: 26rpx; color: var(--c-text); }
.del { color: #ff4d4f; font-size: 32rpx; font-weight: bold; }
.display { background: var(--c-card); border-radius: 16rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; min-height: 120rpx; display: flex; align-items: center; justify-content: center; }
.display.rolling { background: var(--c-primary-light, #fff8e0); }
.display-text { font-size: 48rpx; font-weight: 700; color: var(--c-title); }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; margin-bottom: 24rpx; }
.btn[disabled] { opacity: 0.6; }
.history { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.history-hd { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.history-item { padding: 12rpx 0; border-bottom: 1rpx solid var(--c-border, #eee); font-size: 26rpx; color: var(--c-text); }
.history-item:last-child { border-bottom: none; }
</style>
