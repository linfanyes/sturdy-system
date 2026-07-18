<template>
  <view class="page" :class="{ dark }">
    <view class="hd">口算答题卡</view>
    <view class="cfg">
      <view class="field-label">题目数量</view>
      <picker :range="countOpts" @change="e => countIndex = e.detail.value">
        <view class="picker">{{ countOpts[countIndex] }} 题</view>
      </picker>
      <view class="field-label">最大数值</view>
      <picker :range="maxOpts" @change="e => maxIndex = e.detail.value">
        <view class="picker">{{ maxOpts[maxIndex] }} 以内</view>
      </picker>
      <view class="field-label">运算</view>
      <view class="ops">
        <view v-for="o in allOps" :key="o" class="op" :class="{ on: ops.includes(o) }" @click="toggleOp(o)">{{ o }}</view>
      </view>
    </view>
    <view class="row">
      <button class="btn" @click="gen">生成答题卡</button>
      <button class="btn ghost" v-if="list.length && !checked" @click="check">批改</button>
      <button class="btn ghost" v-if="checked" @click="gen">再来一组</button>
    </view>

    <view v-if="checked" class="score">正确 {{ correct }}/{{ list.length }} · 正确率 {{ rate }}%</view>

    <view v-if="list.length" class="grid">
      <view v-for="(q, i) in list" :key="i" class="item" :class="checked ? (isRight(i) ? 'ok' : 'bad') : ''">
        <text class="q">{{ q.text }} =</text>
        <input v-if="!checked" v-model="answers[i]" type="number" class="in" />
        <text v-else class="myans">{{ answers[i] === '' ? '-' : answers[i] }}<text v-if="!isRight(i)" class="right">({{ q.ans }})</text></text>
      </view>
    </view>

    <view v-if="list.length" class="export">
      <view class="exp-title">导出 / 打印</view>
      <view class="exp-tip">小程序无 window.print，可「复制文本」粘贴到文档打印，或「保存图片」到相册后打印。</view>
      <view class="exp-row">
        <text class="exp-sw">含答案</text>
        <switch :checked="exportAns" @change="e => exportAns = e.detail.value" color="#07c160" />
      </view>
      <view class="exp-btns">
        <button class="ebtn" @click="copyPaper">📋 复制文本</button>
        <button class="ebtn alt" @click="savePaper" :disabled="saving">{{ saving ? '生成中…' : '🖼 保存图片' }}</button>
      </view>
    </view>

    <canvas type="2d" id="acCanvas" class="offscreen"></canvas>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
import { drawAndSave, saveToAlbum, copyText } from '../../common/print'
const dark = computed(() => theme.mode === 'dark')

const countOpts = [10, 20, 30, 50]
const countIndex = ref(1)
const maxOpts = [10, 20, 50, 100]
const maxIndex = ref(1)
const allOps = ['+', '−', '×', '÷']
const ops = ref(['+', '−'])
const list = ref([])
const answers = ref([])
const checked = ref(false)
const exportAns = ref(false)
const saving = ref(false)

function toggleOp(o) {
  const i = ops.value.indexOf(o)
  if (i >= 0) { if (ops.value.length > 1) ops.value.splice(i, 1) } else ops.value.push(o)
}
function rnd(n) { return Math.floor(Math.random() * (n + 1)) }
function gen() {
  const max = maxOpts[maxIndex.value]
  const count = countOpts[countIndex.value]
  const arr = []
  for (let i = 0; i < count; i++) {
    const op = ops.value[Math.floor(Math.random() * ops.value.length)]
    let a = rnd(max), b = rnd(max), ans, text
    if (op === '+') { ans = a + b; text = `${a} + ${b}` }
    else if (op === '−') { if (b > a) [a, b] = [b, a]; ans = a - b; text = `${a} − ${b}` }
    else if (op === '×') { a = rnd(Math.min(max, 9)); b = rnd(Math.min(max, 9)); ans = a * b; text = `${a} × ${b}` }
    else { b = rnd(8) + 1; ans = rnd(Math.floor(max / b)); a = ans * b; text = `${a} ÷ ${b}` }
    arr.push({ text, ans })
  }
  list.value = arr
  answers.value = new Array(count).fill('')
  checked.value = false
}
function isRight(i) { return answers.value[i] !== '' && Number(answers.value[i]) === list.value[i].ans }
function check() { checked.value = true }
const correct = computed(() => list.value.reduce((s, _, i) => s + (isRight(i) ? 1 : 0), 0))
const rate = computed(() => list.value.length ? Math.round(correct.value / list.value.length * 100) : 0)

function paperLines() {
  return list.value.map((q, i) => `${i + 1}. ${q.text} = ${exportAns.value ? q.ans : '______'}`)
}
function copyPaper() {
  copyText(paperLines().join('\n'))
}
async function savePaper() {
  saving.value = true
  try {
    const fp = await drawAndSave('acCanvas', paperLines(), `口算答题卡（${list.value.length}题）`)
    await saveToAlbum(fp)
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '生成失败，已改为复制文本', icon: 'none' })
    copyPaper()
  }
  saving.value = false
}
gen()
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; }
.cfg { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin: 20rpx 0; }
.field-label { font-size: 26rpx; color: var(--c-accent); margin: 10rpx 0; }
.picker { background: var(--c-card2); border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; }
.ops { display: flex; gap: 16rpx; margin-top: 6rpx; }
.op { width: 80rpx; height: 80rpx; border-radius: 14rpx; background: #f3e2c0; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: #bbb; }
.op.on { background: #e6a23c; color: #fff; }
.row { display: flex; gap: 20rpx; margin: 16rpx 0; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 40rpx; flex: 1; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.score { background: var(--c-card2); border-radius: 12rpx; padding: 20rpx; text-align: center; color: var(--c-accent); font-weight: 700; margin-bottom: 16rpx; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.item { display: flex; align-items: center; gap: 10rpx; background: var(--c-card); border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; }
.item.ok { background: #f0f9eb; }
.item.bad { background: #fef0f0; }
.q { color: var(--c-title); }
.in { flex: 1; min-width: 80rpx; text-align: center; background: var(--c-input); border: 2rpx solid var(--c-input-border); border-radius: 8rpx; padding: 8rpx; height: 64rpx; min-height: 64rpx; line-height: 44rpx; box-sizing: border-box; color: var(--c-title); }
.myans { font-weight: 700; }
.right { color: #07c160; margin-left: 6rpx; font-size: 24rpx; }
.export { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-top: 24rpx; }
.exp-title { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.exp-tip { font-size: 22rpx; color: var(--c-sub); line-height: 1.6; margin: 10rpx 0; }
.exp-row { display: flex; align-items: center; justify-content: space-between; margin: 14rpx 0; }
.exp-sw { font-size: 26rpx; color: var(--c-title); }
.exp-btns { display: flex; gap: 20rpx; }
.ebtn { flex: 1; background: #e6a23c; color: #fff; border-radius: 40rpx; font-size: 26rpx; }
.ebtn.alt { background: var(--c-accent); }
.ebtn[disabled] { opacity: 0.6; }
.offscreen { position: fixed; left: -9999rpx; top: -9999rpx; width: 720px; height: 2000px; }
</style>
