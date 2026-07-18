<template>
  <view class="page">
    <view class="hd">单位换算练习</view>
    <view class="cfg">
      <view class="field-label">换算类型</view>
      <picker :range="typeLabels" @change="e => typeIndex = e.detail.value">
        <view class="picker">{{ typeLabels[typeIndex] }}</view>
      </picker>
      <view class="field-label">题目数量</view>
      <picker :range="countOpts" @change="e => countIndex = e.detail.value">
        <view class="picker">{{ countOpts[countIndex] }} 题</view>
      </picker>
    </view>
    <view class="row">
      <button class="btn" @click="gen">生成题目</button>
      <button class="btn ghost" v-if="list.length && !checked" @click="check">提交答案</button>
      <button class="btn ghost" v-if="checked" @click="gen">重新开始</button>
    </view>

    <view v-if="checked" class="score">正确 {{ correct }}/{{ list.length }} · 正确率 {{ rate }}%</view>

    <view v-if="list.length" class="list">
      <view v-for="(q, i) in list" :key="i" class="item" :class="checked ? (isRight(i) ? 'ok' : 'bad') : ''">
        <text class="no">{{ i + 1 }}.</text>
        <text class="q">{{ q.value }} {{ q.from }} =</text>
        <input v-if="!checked" v-model="answers[i]" type="digit" class="in" placeholder="?" />
        <text v-else class="myans">{{ answers[i] || '-' }}
          <text v-if="!isRight(i)" class="right">({{ q.answer }})</text>
        </text>
        <text class="q">{{ q.to }}</text>
      </view>
    </view>

    <view class="tip">长度 1米=100厘米 1千米=1000米 · 重量 1千克=1000克 1吨=1000千克 · 时间 1分=60秒 1时=60分 · 人民币 1元=10角 1角=10分</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const configs = {
  length: { name: '长度(厘米/米/千米)', units: [['厘米', 1], ['米', 100], ['千米', 100000]] },
  weight: { name: '重量(克/千克/吨)', units: [['克', 1], ['千克', 1000], ['吨', 1000000]] },
  time: { name: '时间(秒/分/时)', units: [['秒', 1], ['分', 60], ['时', 3600]] },
  currency: { name: '人民币(分/角/元)', units: [['分', 1], ['角', 10], ['元', 100]] },
}
const keys = Object.keys(configs)
const typeLabels = keys.map(k => configs[k].name)
const typeIndex = ref(0)
const countOpts = [5, 10, 20]
const countIndex = ref(1)
const list = ref([])
const answers = ref([])
const checked = ref(false)

function gen() {
  const cfg = configs[keys[typeIndex.value]]
  const count = countOpts[countIndex.value]
  const arr = []
  for (let i = 0; i < count; i++) {
    let fi = Math.floor(Math.random() * cfg.units.length)
    let ti = Math.floor(Math.random() * cfg.units.length)
    while (ti === fi) ti = Math.floor(Math.random() * cfg.units.length)
    const value = Math.floor(Math.random() * 99) + 1
    const answer = Number((value * cfg.units[fi][1] / cfg.units[ti][1]).toFixed(2))
    arr.push({ from: cfg.units[fi][0], to: cfg.units[ti][0], value, answer })
  }
  list.value = arr
  answers.value = new Array(count).fill('')
  checked.value = false
}
function isRight(i) {
  return answers.value[i] !== '' && Math.abs(Number(answers.value[i]) - list.value[i].answer) < 0.01
}
function check() { checked.value = true }
const correct = computed(() => list.value.reduce((s, _, i) => s + (isRight(i) ? 1 : 0), 0))
const rate = computed(() => list.value.length ? Math.round(correct.value / list.value.length * 100) : 0)
gen()
</script>

<style scoped>
.page { padding: 30rpx; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; text-align: center; }
.cfg { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 20rpx 0; }
.field-label { font-size: 26rpx; color: #8a6d3b; margin: 10rpx 0; }
.picker { background: #f7f1e3; border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: #4a3f35; min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; }
.row { display: flex; gap: 20rpx; margin: 16rpx 0; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 40rpx; flex: 1; }
.btn.ghost { background: #fff; color: #a07b3b; border: 2rpx solid #e6a23c; }
.score { background: #fff7e6; border-radius: 12rpx; padding: 20rpx; text-align: center; color: #a07b3b; font-weight: 700; margin-bottom: 16rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; border-radius: 10rpx; margin-bottom: 12rpx; background: #faf8f3; font-size: 28rpx; }
.item.ok { background: #f0f9eb; }
.item.bad { background: #fef0f0; }
.no { color: #a07b3b; font-weight: 700; }
.q { color: #4a3f35; }
.in { width: 140rpx; text-align: center; background: #fff; border: 2rpx solid #e6c88a; border-radius: 8rpx; padding: 8rpx; height: 64rpx; min-height: 64rpx; line-height: 44rpx; box-sizing: border-box; color: #333; }
.myans { min-width: 140rpx; text-align: center; font-weight: 700; }
.right { color: #07c160; margin-left: 8rpx; }
.tip { font-size: 22rpx; color: #b0a48a; line-height: 1.6; margin-top: 20rpx; }
</style>
