<template>
  <view class="page" :class="{ dark }">
    <view class="hd">错题本</view>

    <view class="card">
      <view class="field-label">错题类型</view>
      <view class="cats">
        <view v-for="c in categories" :key="c" class="cat" :class="{ on: form.category === c }" @click="form.category = c">{{ c }}</view>
      </view>
      <view class="field-label">题目</view>
      <textarea v-model="form.question" class="ctrl area" placeholder="录入错题内容" />
      <view class="field-label">错误答案</view>
      <input v-model="form.wrongAnswer" class="ctrl" placeholder="当时写的答案" />
      <view class="field-label">正确答案 / 解析</view>
      <textarea v-model="form.answer" class="ctrl area" placeholder="正确答案与解题思路" />
      <view class="field-label">错误原因（选填）</view>
      <input v-model="form.reason" class="ctrl" placeholder="如：审题失误 / 计算错误" />
      <button class="btn" @click="add">➕ 加入错题本</button>
    </view>

    <view class="filter">
      <view class="chip" :class="{ on: filter === '全部' }" @click="filter = '全部'">全部 {{ items.length }}</view>
      <view v-for="c in categories" :key="c" class="chip" :class="{ on: filter === c }" @click="filter = c">{{ c }} {{ countOf(c) }}</view>
    </view>

    <view v-if="shown.length" class="gen-row">
      <button class="ghost-btn" @click="generate">📋 生成练习（复制）</button>
    </view>

    <view v-if="!shown.length" class="empty">暂无错题，先在上方录入吧</view>
    <view v-for="(m, i) in shown" :key="m.id" class="mitem">
      <view class="mtop">
        <text class="tag">{{ m.category }}</text>
        <text class="del" @click="remove(m.id)">删除</text>
      </view>
      <view class="mq">{{ i + 1 }}. {{ m.question }}</view>
      <view class="mw" v-if="m.wrongAnswer">✏️ 错：{{ m.wrongAnswer }}</view>
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
const categories = ['进位加法', '退位减法', '乘法口诀', '除法', '单位换算', '应用题', '其他']
const form = ref({ category: '进位加法', question: '', wrongAnswer: '', answer: '', reason: '' })
const items = ref([])
const filter = ref('全部')

function load() { items.value = uni.getStorageSync(KEY) || [] }
function persist() { uni.setStorageSync(KEY, items.value) }
function countOf(c) { return items.value.filter((x) => x.category === c).length }

function add() {
  if (!form.value.question.trim()) return uni.showToast({ title: '请输入题目', icon: 'none' })
  items.value.unshift({
    id: Date.now(),
    category: form.value.category,
    question: form.value.question.trim(),
    wrongAnswer: form.value.wrongAnswer.trim(),
    answer: form.value.answer.trim(),
    reason: form.value.reason.trim(),
    time: new Date().toLocaleString(),
  })
  persist()
  form.value = { category: '进位加法', question: '', wrongAnswer: '', answer: '', reason: '' }
  uni.showToast({ title: '已加入', icon: 'success' })
}
function remove(id) {
  uni.showModal({
    title: '删除', content: '确认删除这道错题？',
    success: (r) => { if (r.confirm) { items.value = items.value.filter((x) => x.id !== id); persist() } },
  })
}
const shown = computed(() => filter.value === '全部' ? items.value : items.value.filter((x) => x.category === filter.value))

function generate() {
  if (!shown.value.length) return uni.showToast({ title: '没有可导出的错题', icon: 'none' })
  const lines = ['【错题练习卷】', '']
  shown.value.forEach((m, i) => {
    lines.push((i + 1) + '. ' + m.question)
    lines.push('   答案：' + m.answer + (m.reason ? '（' + m.reason + '）' : ''))
  })
  const text = lines.join('\n')
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制 ' + shown.value.length + ' 道', icon: 'success' }),
  })
}

onShow(load)
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.field-label { font-size: 26rpx; color: var(--c-accent); margin: 10rpx 0; }
.cats { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 10rpx; }
.cat { padding: 10rpx 22rpx; background: var(--c-card2); border-radius: 30rpx; font-size: 24rpx; color: var(--c-sub); }
.cat.on { background: #e6a23c; color: #fff; }
.ctrl { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-title); background: var(--c-input); }
.area { min-height: 110rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 50rpx; margin-top: 20rpx; }
.filter { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 24rpx 0 12rpx; }
.chip { padding: 10rpx 22rpx; background: var(--c-card); border-radius: 40rpx; font-size: 22rpx; color: var(--c-accent); }
.chip.on { background: #e6a23c; color: #fff; }
.gen-row { margin: 6rpx 0 16rpx; }
.ghost-btn { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; border-radius: 40rpx; font-size: 26rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 60rpx 0; font-size: 26rpx; }
.mitem { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.mtop { display: flex; justify-content: space-between; align-items: center; }
.tag { background: var(--c-card2); color: var(--c-accent); border-radius: 8rpx; padding: 4rpx 16rpx; font-size: 22rpx; }
.del { color: #e64340; font-size: 24rpx; }
.mq { font-size: 28rpx; color: var(--c-title); margin: 12rpx 0; }
.mw { font-size: 24rpx; color: var(--c-sub); }
.ma { font-size: 26rpx; color: #07c160; margin-top: 6rpx; }
.mr { font-size: 24rpx; color: var(--c-accent); margin-top: 6rpx; }
.mt { font-size: 22rpx; color: var(--c-sub); margin-top: 10rpx; }
</style>
