<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 成语填空</view>
      <view class="score">第 {{ idx+1 }}/{{ QUESTIONS.length }}</view>
    </view>
    <block v-if="!finished">
      <view class="q-card">
        <view class="question">{{ QUESTIONS[idx].q }}</view>
      </view>
      <view class="opts">
        <button class="opt" v-for="opt in QUESTIONS[idx].opts" :key="opt"
          :class="[feedback ? (opt===QUESTIONS[idx].a ? 'correct' : 'wrong') : '']"
          :disabled="!!feedback"
          @click="answer(opt)">{{ opt }}</button>
      </view>
      <view class="fb" v-if="feedback==='correct'">✅ 正确！</view>
      <view class="fb err" v-else-if="feedback==='wrong'">❌ 正确答案：{{ QUESTIONS[idx].a }}</view>
    </block>
    <block v-else>
      <view class="result">
        <view class="emoji">🎉</view>
        <view class="r-score">{{ score }} / {{ QUESTIONS.length }} 正确</view>
        <button class="restart" @click="restart">再来一次</button>
      </view>
    </block>
  </view>
</template>
<script setup>
import { ref } from 'vue'
const QUESTIONS = [
  { q: '画蛇添（  ）', a: '足', opts: ['足','脚','尾','爪'] },
  { q: '守株待（  ）', a: '兔', opts: ['兔','猪','鹿','鸟'] },
  { q: '亡（  ）补牢', a: '羊', opts: ['羊','牛','马','狗'] },
  { q: '掩耳（  ）铃', a: '盗', opts: ['盗','偷','响','敲'] },
  { q: '刻舟求（  ）', a: '剑', opts: ['剑','刀','箭','枪'] },
  { q: '叶公好（  ）', a: '龙', opts: ['龙','虎','凤','马'] },
  { q: '对（  ）弹琴', a: '牛', opts: ['牛','马','猪','狗'] },
  { q: '胸有成（  ）', a: '竹', opts: ['竹','树','花','林'] },
  { q: '画龙点（  ）', a: '睛', opts: ['睛','眼','目','珠'] },
  { q: '狐假（  ）威', a: '虎', opts: ['虎','狮','狼','豹'] },
]
const idx = ref(0); const score = ref(0); const finished = ref(false); const feedback = ref('')
function answer(opt) {
  if (feedback.value) return
  if (opt === QUESTIONS[idx.value].a) { score.value++; feedback.value = 'correct' }
  else { feedback.value = 'wrong' }
  setTimeout(() => { feedback.value = ''
    if (idx.value+1 >= QUESTIONS.length) finished.value = true; else idx.value++ }, 800)
}
function restart() { idx.value=0; score.value=0; finished.value=false; feedback.value='' }
function goBack() { uni.navigateBack() }
</script>
<style scoped>
.page { padding: 20rpx; min-height:100vh; background: var(--c-bg); }
.top-bar { display:flex; justify-content:space-between; align-items:center; margin-bottom:30rpx; }
.title { font-size:32rpx; font-weight:700; color:var(--c-title); }
.score { font-size:24rpx; color:var(--c-sub); }
.q-card { background:var(--c-card); border-radius:20rpx; padding:40rpx; text-align:center; margin-bottom:30rpx; }
.question { font-size:40rpx; font-weight:700; color:var(--c-title); letter-spacing:6rpx; line-height:1.6; }
.opts { display:grid; grid-template-columns:1fr 1fr; gap:16rpx; }
.opt { padding:28rpx; border-radius:16rpx; font-size:30rpx; font-weight:600; text-align:center; border:2rpx solid var(--c-border); background:var(--c-card); color:var(--c-title); }
.opt.correct { border-color:#07c160; background:#f0faf0; color:#07c160; }
.opt.wrong { border-color:#e64340; background:#fdf0f0; color:#cocoa-400; }
.fb { text-align:center; margin-top:20rpx; font-size:28rpx; font-weight:600; color:#07c160; }
.fb.err { color:#e64340; }
.result { text-align:center; padding-top:100rpx; }
.emoji { font-size:80rpx; margin-bottom:20rpx; }
.r-score { font-size:36rpx; font-weight:700; color:var(--c-title); margin-bottom:30rpx; }
.restart { background:var(--c-accent); color:#fff; border-radius:50rpx; padding:20rpx 60rpx; font-size:28rpx; }
</style>
