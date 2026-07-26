<template>
  <view class="page">
    <view class="top-bar">
      <view class="title" @click="goBack">← 故事接龙</view>
      <view class="score">{{ story.length }} 句</view>
    </view>
    <block v-if="story.length===0">
      <view class="start-card">
        <view class="emoji">📚</view>
        <view class="desc">一人一句编故事，发挥想象力！</view>
        <view class="themes">
          <text class="theme" v-for="t in THEMES" :key="t" :class="theme===t?'on':''" @click="theme=t">{{ t }}</text>
        </view>
        <button class="go" @click="startGame">开始接龙</button>
      </view>
    </block>
    <block v-else>
      <view class="story-box">
        <view class="line" v-for="(line,i) in story" :key="i" :class="i===0?'opening':i%2===0?'even':'odd'">{{ line }}</view>
      </view>
      <view class="input-row">
        <input v-model="input" class="inp" placeholder="继续写故事…" @confirm="submitLine" />
        <button class="ok" :disabled="!input.trim()" @click="submitLine">写</button>
      </view>
    </block>
  </view>
</template>
<script setup>
import { ref } from 'vue'
const OPENINGS=['在一个遥远的魔法森林里，有一只小兔子迷路了……','小明今天早上发现书包里多了一封神秘的信……','放学后，教室里突然传出奇怪的音乐声……','数学课上，老师出了一道谁也算不出的难题……']
const THEMES=['友情','勇气','环保','梦想','奇幻']
const story=ref([]); const input=ref(''); const theme=ref('')
const currentOpening=ref(OPENINGS[Math.floor(Math.random()*OPENINGS.length)])
function startGame(){story.value=[currentOpening.value];input.value=''}
function submitLine(){if(!input.value.trim())return;story.value.push(input.value.trim());input.value=''}
function goBack(){uni.navigateBack()}
</script>
<style scoped>
.page{padding:20rpx;min-height:100vh;background:var(--c-bg);}
.top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20rpx;}
.title{font-size:32rpx;font-weight:700;color:var(--c-title);}
.score{font-size:24rpx;color:var(--c-sub);}
.start-card{background:var(--c-card);border-radius:20rpx;padding:60rpx 40rpx;text-align:center;}
.emoji{font-size:80rpx;margin-bottom:20rpx;}
.desc{font-size:28rpx;color:var(--c-sub);margin-bottom:30rpx;}
.themes{display:flex;flex-wrap:wrap;justify-content:center;gap:12rpx;margin-bottom:30rpx;}
.theme{padding:12rpx 28rpx;border-radius:40rpx;font-size:24rpx;background:var(--c-card);border:2rpx solid var(--c-border);color:var(--c-sub);}
.theme.on{background:var(--c-accent);color:#fff;border-color:var(--c-accent);}
.go{background:var(--c-accent);color:#fff;border-radius:50rpx;padding:20rpx 80rpx;font-size:28rpx;font-weight:600;}
.story-box{background:var(--c-card);border-radius:20rpx;padding:30rpx;margin-bottom:20rpx;max-height:70vh;overflow-y:auto;}
.line{padding:16rpx 20rpx;border-radius:12rpx;margin-bottom:10rpx;font-size:26rpx;line-height:1.6;}
.opening{background:#fff3e0;color:#795548;font-style:italic;}.even{background:#e8f5e9;color:#2e7d32;}.odd{background:#e3f2fd;color:#1565c0;}
.input-row{display:flex;gap:12rpx;position:sticky;bottom:20rpx;}
.inp{flex:1;padding:24rpx;border-radius:16rpx;border:2rpx solid var(--c-border);font-size:28rpx;background:var(--c-card);}
.ok{padding:20rpx 40rpx;background:var(--c-accent);color:#fff;border-radius:16rpx;font-size:28rpx;}
.ok:disabled{opacity:0.5;}
</style>
