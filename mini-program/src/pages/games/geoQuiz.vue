<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 人文地理</view>
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
  { q:'中国最长的河流？', a:'长江', opts:['黄河','长江','珠江','淮河'] },
  { q:'面积最大的国家？', a:'俄罗斯', opts:['中国','美国','俄罗斯','加拿大'] },
  { q:'日光城是哪个城市？', a:'拉萨', opts:['昆明','拉萨','三亚','兰州'] },
  { q:'泰山位于哪个省？', a:'山东', opts:['河北','山西','山东','河南'] },
  { q:'最高山峰是？', a:'珠穆朗玛峰', opts:['乔戈里峰','干城章嘉峰','珠穆朗玛峰','洛子峰'] },
  { q:'五岳中位于湖南的是？', a:'衡山', opts:['华山','泰山','衡山','嵩山'] },
  { q:'四大文明古国不包括？', a:'古罗马', opts:['古埃及','古巴比伦','古罗马','古印度'] },
  { q:'世界第一大河？', a:'尼罗河', opts:['亚马逊河','长江','尼罗河','密西西比河'] },
  { q:'丝绸之路起点？', a:'西安', opts:['北京','西安','洛阳','兰州'] },
  { q:'中国最大岛屿？', a:'台湾岛', opts:['海南岛','台湾岛','崇明岛','舟山岛'] },
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
