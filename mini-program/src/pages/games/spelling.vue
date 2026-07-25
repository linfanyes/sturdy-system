<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 单词拼写</view>
      <view class="score">{{ idx+1 }}/{{ QUESTIONS.length }}</view>
    </view>
    <block v-if="!finished">
      <view class="q-card">
        <view class="hint-label">请拼写以下单词</view>
        <view class="question">{{ QUESTIONS[idx].hint }}</view>
      </view>
      <view class="input-row">
        <input v-model="input" class="inp" placeholder="输入英文单词" :disabled="!!feedback" @confirm="check" />
        <button class="ok" :disabled="!input.trim()||!!feedback" @click="check">确认</button>
      </view>
      <view class="fb" v-if="feedback==='correct'">✅ 正确！</view>
      <view class="fb err" v-else-if="feedback==='wrong'">❌ 答案是：{{ QUESTIONS[idx].word }}</view>
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
  { word:'apple', hint:'苹果' }, { word:'banana', hint:'香蕉' }, { word:'school', hint:'学校' },
  { word:'teacher', hint:'老师' }, { word:'student', hint:'学生' }, { word:'family', hint:'家庭' },
  { word:'friend', hint:'朋友' }, { word:'animal', hint:'动物' }, { word:'flower', hint:'花' }, { word:'garden', hint:'花园' },
]
const idx=ref(0); const input=ref(''); const score=ref(0); const finished=ref(false); const feedback=ref('')
function check() {
  if(feedback.value||!input.value.trim()) return
  if(input.value.trim().toLowerCase()===QUESTIONS[idx.value].word){score.value++;feedback.value='correct'}
  else{feedback.value='wrong'}
  setTimeout(()=>{feedback.value='';input.value='';if(idx.value+1>=QUESTIONS.length)finished.value=true;else idx.value++},1200)
}
function restart(){idx.value=0;input.value='';score.value=0;finished.value=false;feedback.value=''}
function goBack(){uni.navigateBack()}
</script>
<style scoped>
.page{ padding:20rpx; min-height:100vh; background:var(--c-bg); }
.top-bar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:30rpx; }
.title{ font-size:32rpx; font-weight:700; color:var(--c-title); }
.score{ font-size:24rpx; color:var(--c-sub); }
.q-card{ background:var(--c-card); border-radius:20rpx; padding:40rpx; text-align:center; margin-bottom:30rpx; }
.hint-label{ font-size:24rpx; color:var(--c-sub); margin-bottom:10rpx; }
.question{ font-size:44rpx; font-weight:700; color:var(--c-title); }
.input-row{ display:flex; gap:12rpx; }
.inp{ flex:1; padding:24rpx; border-radius:16rpx; border:2rpx solid var(--c-border); font-size:28rpx; background:var(--c-card); text-align:center; font-family:monospace; }
.ok{ padding:20rpx 40rpx; background:var(--c-accent); color:#fff; border-radius:16rpx; font-size:28rpx; }
.ok:disabled{ opacity:0.5; }
.fb{ text-align:center; margin-top:20rpx; font-size:28rpx; font-weight:600; color:#07c160; }
.fb.err{ color:#e64340; }
.result{ text-align:center; padding-top:100rpx; }
.emoji{ font-size:80rpx; margin-bottom:20rpx; }
.r-score{ font-size:36rpx; font-weight:700; color:var(--c-title); margin-bottom:30rpx; }
.restart{ background:var(--c-accent); color:#fff; border-radius:50rpx; padding:20rpx 60rpx; font-size:28rpx; }
</style>
