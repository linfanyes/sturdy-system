<template>
  <view class="page" :class="{ dark }">
    <view class="hd">乘法口诀</view>
    <view class="tabs">
      <view class="tab" :class="{ on: mode === 'table' }" @click="mode = 'table'">口诀表</view>
      <view class="tab" :class="{ on: mode === 'practice' }" @click="startPractice">练习模式</view>
    </view>

    <!-- 口诀表 -->
    <view v-if="mode === 'table'" class="table">
      <view v-for="a in 9" :key="a" class="trow">
        <view v-for="b in a" :key="b" class="tcell">{{ b }}×{{ a }}={{ a * b }}</view>
      </view>
    </view>

    <!-- 练习 -->
    <view v-else class="practice">
      <view v-if="cur" class="q">{{ cur.a }} × {{ cur.b }} = ?</view>
      <input v-model="input" type="number" class="in" placeholder="输入答案" @confirm="submit" />
      <button class="btn" @click="submit">确定</button>
      <view class="stat">已答 {{ done }} · 正确 {{ right }} · 正确率 {{ done ? Math.round(right / done * 100) : 0 }}%</view>
      <view v-if="feedback" class="fb" :class="feedbackOk ? 'ok' : 'bad'">{{ feedback }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const mode = ref('table')
const cur = ref(null)
const input = ref('')
const done = ref(0)
const right = ref(0)
const feedback = ref('')
const feedbackOk = ref(false)

function next() {
  const a = Math.floor(Math.random() * 8) + 2
  const b = Math.floor(Math.random() * 8) + 2
  cur.value = { a, b }
  input.value = ''
}
function startPractice() {
  mode.value = 'practice'
  done.value = 0; right.value = 0; feedback.value = ''
  next()
}
function submit() {
  if (input.value === '' || !cur.value) return
  const ok = Number(input.value) === cur.value.a * cur.value.b
  done.value++
  if (ok) { right.value++; feedback.value = '✅ 答对了！'; feedbackOk.value = true }
  else { feedback.value = `❌ 正确答案是 ${cur.value.a * cur.value.b}`; feedbackOk.value = false }
  setTimeout(() => { feedback.value = ''; next() }, 900)
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; }
.tabs { display: flex; gap: 20rpx; margin: 24rpx 0; }
.tab { flex: 1; text-align: center; padding: 20rpx; background: var(--c-card); border-radius: 40rpx; color: var(--c-accent); font-size: 28rpx; }
.tab.on { background: #e6a23c; color: #fff; }
.table { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.trow { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 10rpx; }
.tcell { background: var(--c-card2); border-radius: 8rpx; padding: 12rpx 14rpx; font-size: 24rpx; color: var(--c-title); }
.practice { background: var(--c-card); border-radius: 16rpx; padding: 40rpx; text-align: center; }
.q { font-size: 60rpx; font-weight: 800; color: var(--c-title); margin-bottom: 30rpx; }
.in { border: 2rpx solid var(--c-input-border); border-radius: 12rpx; padding: 20rpx; font-size: 36rpx; text-align: center; margin-bottom: 20rpx; height: 88rpx; min-height: 88rpx; line-height: 48rpx; box-sizing: border-box; color: var(--c-title); background: var(--c-input); }
.btn { background: #e6a23c; color: #fff; border-radius: 50rpx; }
.stat { margin-top: 24rpx; color: var(--c-accent); font-size: 26rpx; }
.fb { margin-top: 20rpx; font-size: 30rpx; font-weight: 700; }
.fb.ok { color: #07c160; }
.fb.bad { color: #e64340; }
</style>
