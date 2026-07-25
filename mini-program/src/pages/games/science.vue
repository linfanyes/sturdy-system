<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 科学知识</view>
      <view class="score">{{ idx+1 }}/{{ QUESTIONS.length }}</view>
    </view>
    <block v-if="!finished">
      <view class="q-card"><view class="question">{{ QUESTIONS[idx].q }}</view></view>
      <view class="opts">
        <button class="opt" v-for="opt in QUESTIONS[idx].opts" :key="opt"
          :class="[feedback ? (opt===QUESTIONS[idx].a ? 'correct' : 'wrong') : '']"
          :disabled="!!feedback" @click="answer(opt)">{{ opt }}</button>
      </view>
      <view class="fb" v-if="feedback==='correct'">✅ 正确！</view>
      <view class="fb err" v-else-if="feedback==='wrong'">❌ 正确答案：{{ QUESTIONS[idx].a }}</view>
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
  { q:'太阳系最大的行星？', a:'木星', opts:['土星','木星','海王星','地球'] },
  { q:'水在标准气压下多少度沸腾？', a:'100°C', opts:['90°C','100°C','80°C','110°C'] },
  { q:'人体最长的骨骼？', a:'股骨', opts:['胫骨','肱骨','股骨','脊柱'] },
  { q:'植物光合作用需要什么气体？', a:'二氧化碳', opts:['氧气','氮气','二氧化碳','氢气'] },
  { q:'地球表面多少被水覆盖？', a:'71%', opts:['51%','61%','71%','81%'] },
  { q:'声音在真空中能传播吗？', a:'不能', opts:['能','不能','看情况','有时能'] },
  { q:'伏特是测量什么？', a:'电压', opts:['电流','电阻','电压','功率'] },
  { q:'月球绕地球一周约几天？', a:'约27天', opts:['约7天','约14天','约27天','约30天'] },
  { q:'人的心脏有几个腔室？', a:'4个', opts:['2个','3个','4个','5个'] },
  { q:'沙盐混合物如何分离？', a:'过滤+蒸发', opts:['磁选','过滤+蒸发','蒸馏','沉降'] },
]
const idx=ref(0); const score=ref(0); const finished=ref(false); const feedback=ref('')
function answer(opt){if(feedback.value)return;if(opt===QUESTIONS[idx.value].a){score.value++;feedback.value='correct'}else{feedback.value='wrong'};setTimeout(()=>{feedback.value='';if(idx.value+1>=QUESTIONS.length)finished.value=true;else idx.value++},800)}
function restart(){idx.value=0;score.value=0;finished.value=false;feedback.value=''}
function goBack(){uni.navigateBack()}
</script>
<style scoped>
.page{ padding:20rpx; min-height:100vh; background:var(--c-bg); }
.top-bar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:30rpx; }
.title{ font-size:32rpx; font-weight:700; color:var(--c-title); }
.score{ font-size:24rpx; color:var(--c-sub); }
.q-card{ background:var(--c-card); border-radius:20rpx; padding:40rpx; text-align:center; margin-bottom:30rpx; }
.question{ font-size:32rpx; font-weight:600; color:var(--c-title); line-height:1.5; }
.opts{ display:flex; flex-direction:column; gap:12rpx; }
.opt{ padding:28rpx; border-radius:16rpx; font-size:28rpx; font-weight:500; text-align:left; border:2rpx solid var(--c-border); background:var(--c-card); color:var(--c-title); }
.opt.correct{ border-color:#07c160; background:#f0faf0; color:#07c160; }
.opt.wrong{ border-color:#e64340; background:#fdf0f0; }
.fb{ text-align:center; margin-top:20rpx; font-size:28rpx; font-weight:600; color:#07c160; }
.fb.err{ color:#e64340; }
.result{ text-align:center; padding-top:100rpx; }
.emoji{ font-size:80rpx; margin-bottom:20rpx; }
.r-score{ font-size:36rpx; font-weight:700; color:var(--c-title); margin-bottom:30rpx; }
.restart{ background:var(--c-accent); color:#fff; border-radius:50rpx; padding:20rpx 60rpx; font-size:28rpx; }
</style>
