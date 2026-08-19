<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">汉字听写</view>
    <view class="sub">AI 生成听写题目，支持拼音提示与批改</view>

    <view class="cfg">
      <view class="cfg-row">
        <text class="cfg-lb">年级</text>
        <picker :range="grades" :value="gradeIdx" @change="gradeIdx = +$event.detail.value">
          <view class="pk">{{ grades[gradeIdx] }}</view>
        </picker>
      </view>
      <view class="cfg-row">
        <text class="cfg-lb">题目数</text>
        <picker :range="counts" :value="countIdx" @change="countIdx = +$event.detail.value">
          <view class="pk">{{ counts[countIdx] }} 题</view>
        </picker>
      </view>
    </view>

    <button class="btn" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '生成题目' }}</button>

    <view v-if="list.length" class="list">
      <view v-for="(it, i) in list" :key="i" class="item">
        <text class="idx">{{ i + 1 }}.</text>
        <text class="pinyin">{{ it.pinyin }}</text>
        <input v-model="answers[i]" class="ipt" placeholder="填写汉字" maxlength="1" />
        <text v-if="checked" class="res" :class="answers[i] === it.hanzi ? 'ok' : 'err'">
          {{ answers[i] === it.hanzi ? '✓' : '✗ ' + it.hanzi }}
        </text>
      </view>
    </view>

    <view v-if="list.length && !checked" class="actions">
      <button class="btn check" @click="check">批改</button>
    </view>

    <view v-if="checked" class="score">
      得分：{{ score }}/{{ list.length }}
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const counts = [5, 10, 15, 20]
const gradeIdx = ref(0)
const countIdx = ref(1)
const loading = ref(false)
const list = ref([])
const answers = ref([])
const checked = ref(false)
const score = ref(0)

// 常用听写汉字库（按年级）
const CHAR_LIB = [
  '大小上下左右前后', '天地人口手足日月', '风雨云花鸟鱼虫',
  '春夏秋冬东南西北', '父母儿女兄弟姐妹', '红黄蓝绿白黑紫',
  '读书写字唱歌跳舞', '吃饭睡觉走路跑跳', '老师同学学校教室',
  '铅笔橡皮书包尺子', '眼睛耳朵鼻子嘴巴', '春夏秋冬各不同',
]

// P2修复：Fisher-Yates 洗牌算法，保证均匀分布
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function gen() {
  loading.value = true
  checked.value = false
  answers.value = []
  const chars = CHAR_LIB[gradeIdx.value % CHAR_LIB.length].split('')
  const count = counts[countIdx.value]
  const shuffled = shuffle(chars)
  const selected = shuffled.slice(0, Math.min(count, chars.length))
  list.value = selected.map((c) => ({ hanzi: c, pinyin: '' }))
  loading.value = false
}

function check() {
  let s = 0
  list.value.forEach((it, i) => {
    if (answers.value[i] === it.hanzi) s++
  })
  score.value = s
  checked.value = true
}

onShow(() => {
  if (!list.value.length) gen()
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.cfg { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.cfg-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.cfg-row:last-child { margin-bottom: 0; }
.cfg-lb { width: 120rpx; font-size: 26rpx; color: var(--c-sub); }
.pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.btn[disabled] { opacity: 0.6; }
.list { margin-top: 24rpx; }
.item { display: flex; align-items: center; gap: 16rpx; background: var(--c-card); border-radius: 12rpx; padding: 20rpx; margin-bottom: 12rpx; }
.idx { font-size: 26rpx; color: var(--c-sub); width: 50rpx; }
.pinyin { font-size: 28rpx; color: var(--c-primary); width: 120rpx; }
.ipt { flex: 1; background: var(--c-input); border-radius: 8rpx; padding: 12rpx 16rpx; font-size: 28rpx; }
.res { font-size: 26rpx; }
.res.ok { color: #07c160; }
.res.err { color: #e64340; }
.actions { margin-top: 24rpx; }
.btn.check { background: #07c160; }
.score { margin-top: 24rpx; text-align: center; font-size: 32rpx; font-weight: 700; color: var(--c-accent); }
</style>
