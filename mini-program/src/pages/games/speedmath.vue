<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 速算挑战</view>
      <view class="score">{{ idx+1 }}/{{ QUESTIONS.length }}</view>
    </view>
    <block v-if="!finished">
      <view class="q-card">
        <view class="question">{{ QUESTIONS[idx].q }}</view>
      </view>
      <view class="opts">
        <button class="opt" v-for="opt in QUESTIONS[idx].opts" :key="opt"
          :class="[feedback ? (opt===QUESTIONS[idx].a ? 'correct' : 'wrong') : '']"
          :disabled="!!feedback" @click="answer(opt)">{{ opt }}</button>
      </view>
      <view class="fb" v-if="feedback==='correct'">✅ 正确！</view>
      <view class="fb err" v-else-if="feedback==='wrong'">❌ 答案：{{ QUESTIONS[idx].a }}</view>
    </block>
    <block v-else>
      <view class="result">
        <view class="emoji">🎉</view>
        <view class="r-score">{{ score }}/{{ QUESTIONS.length }} 正确</view>
        <button class="restart" @click="restart">再来一次</button>
      </view>
    </block>
  </view>
</template>
<script setup>
import { ref } from 'vue'
const QUESTIONS = [
  { q:'34+27=?', a:'61', opts:['51','61','71','57'] }, { q:'15×6=?', a:'90', opts:['80','90','85','100'] },
  { q:'96÷8=?', a:'12', opts:['10','11','12','13'] }, { q:'125-48=?', a:'77', opts:['77','87','73','83'] },
  { q:'7×13=?', a:'91', opts:['81','91','93','87'] }, { q:'200÷25=?', a:'8', opts:['6','7','8','9'] },
  { q:'56+89=?', a:'145', opts:['135','145','155','149'] }, { q:'18×9=?', a:'162', opts:['152','162','158','172'] },
  { q:'360÷12=?', a:'30', opts:['25','28','30','32'] }, { q:'999+1=?', a:'1000', opts:['1000','1001','990','1009'] },
]
const idx = ref(0); const score = ref(0); const finished = ref(false); const feedback = ref('')
function answer(opt) {
  if (feedback.value) return
  if (opt===QUESTIONS[idx.value].a) { score.value++; feedback.value='correct' } else { feedback.value='wrong' }
  setTimeout(()=>{ feedback.value=''; if(idx.value+1>=QUESTIONS.length) finished.value=true; else idx.value++ }, 800)
}
function restart() { idx.value=0; score.value=0; finished.value=false; feedback.value='' }
function goBack() { uni.navigateBack() }
</script>
<style scoped>
.page{ padding:20rpx; min-height:100vh; background:var(--c-bg); }
.top-bar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:30rpx; }
.title{ font-size:32rpx; font-weight:700; color:var(--c-title); }
.score{ font-size:24rpx; color:var(--c-sub); }
.q-card{ background:var(--c-card); border-radius:20rpx; padding:40rpx; text-align:center; margin-bottom:30rpx; }
.question{ font-size:48rpx; font-weight:700; color:var(--c-title); padding:20rpx 0; }
.opts{ display:grid; grid-template-columns:1fr 1fr; gap:16rpx; }
.opt{ padding:28rpx; border-radius:16rpx; font-size:30rpx; font-weight:600; text-align:center; border:2rpx solid var(--c-border); background:var(--c-card); color:var(--c-title); }
.opt.correct{ border-color:#07c160; background:#f0faf0; color:#07c160; }
.opt.wrong{ border-color:#e64340; background:#fdf0f0; }
.fb{ text-align:center; margin-top:20rpx; font-size:28rpx; font-weight:600; color:#07c160; }
.fb.err{ color:#e64340; }
.result{ text-align:center; padding-top:100rpx; }
.emoji{ font-size:80rpx; margin-bottom:20rpx; }
.r-score{ font-size:36rpx; font-weight:700; color:var(--c-title); margin-bottom:30rpx; }
.restart{ background:var(--c-accent); color:#fff; border-radius:50rpx; padding:20rpx 60rpx; font-size:28rpx; }
</style>
