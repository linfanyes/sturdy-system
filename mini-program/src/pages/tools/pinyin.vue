<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">拼音标注</view>
    <view class="sub">输入中文文本，自动标注拼音</view>

    <textarea
      v-model="input"
      class="textarea"
      placeholder="输入中文文本，如：你好世界"
      maxlength="100"
    />
    <view class="count">{{ input.length }}/100</view>

    <button class="btn" :disabled="loading || !input.trim()" @click="gen">
      {{ loading ? '标注中…' : '标注拼音' }}
    </button>

    <view v-if="result" class="result">
      <view v-for="(it, i) in result" :key="i" class="char-box">
        <text class="py">{{ it.pinyin }}</text>
        <text class="ch">{{ it.char }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'

const input = ref('')
const loading = ref(false)
const result = ref(null)

// 常用汉字拼音映射（简化版）
const PINYIN_MAP = {
  '你': 'nǐ', '好': 'hǎo', '世': 'shì', '界': 'jiè',
  '我': 'wǒ', '们': 'men', '是': 'shì', '的': 'de',
  '在': 'zài', '有': 'yǒu', '这': 'zhè', '那': 'nà',
  '不': 'bù', '了': 'le', '人': 'rén', '大': 'dà',
  '小': 'xiǎo', '中': 'zhōng', '上': 'shàng', '下': 'xià',
  '来': 'lái', '去': 'qù', '说': 'shuō', '看': 'kàn',
  '想': 'xiǎng', '能': 'néng', '会': 'huì', '要': 'yào',
  '对': 'duì', '也': 'yě', '就': 'jiù', '都': 'dōu',
  '和': 'hé', '与': 'yǔ', '或': 'huò', '但': 'dàn',
  '学': 'xué', '生': 'shēng', '老': 'lǎo', '师': 'shī',
  '书': 'shū', '字': 'zì', '写': 'xiě', '读': 'dú',
  '一': 'yī', '二': 'èr', '三': 'sān', '四': 'sì', '五': 'wǔ',
  '六': 'liù', '七': 'qī', '八': 'bā', '九': 'jiǔ', '十': 'shí',
}

function gen() {
  loading.value = true
  const chars = input.value.trim().split('')
  result.value = chars.map((c) => ({
    char: c,
    pinyin: PINYIN_MAP[c] || (c.trim() ? '?' : ''),
  }))
  loading.value = false
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.textarea { width: 100%; background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; min-height: 160rpx; box-sizing: border-box; }
.count { text-align: right; font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; margin-bottom: 24rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.btn[disabled] { opacity: 0.6; }
.result { margin-top: 24rpx; display: flex; flex-wrap: wrap; gap: 16rpx; }
.char-box { display: flex; flex-direction: column; align-items: center; background: var(--c-card); border-radius: 12rpx; padding: 16rpx 20rpx; }
.py { font-size: 22rpx; color: var(--c-primary); margin-bottom: 4rpx; }
.ch { font-size: 36rpx; font-weight: 600; color: var(--c-title); }
</style>
