<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🌐 翻译助手</text></view>
    <view class="card">
      <view class="sec-title">中英互译</view>
      <textarea v-model="text" class="ctrl area" placeholder="输入要翻译的文本（支持中英互译）" />
      <view class="lang-row">
        <button class="lang-btn" :class="{on: lang==='zh'}" @click="lang='zh'">中→英</button>
        <button class="lang-btn" :class="{on: lang==='en'}" @click="lang='en'">英→中</button>
      </view>
      <button class="gen" :disabled="loading || !text" @click="translate">{{ loading ? '翻译中…' : '翻译' }}</button>
      <view v-if="result" class="result-box">
        <text class="result-text">{{ result }}</text>
        <button class="copy" @click="copy">📋 复制</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
import api from '../../common/request'
const text = ref('')
const result = ref('')
const loading = ref(false)
const lang = ref('zh')
async function translate() {
  loading.value = true
  try {
    const r = await api.post('/ai/chat-sync', { messages: [{ role: 'user', content: `请将以下文本${lang.value==='zh'?'翻译成英文':'翻译成中文'}：\n${text.value}` }] })
    result.value = r.content || r.message || '翻译失败'
  } catch (e) { result.value = '翻译失败：' + (e.message || '') }
  loading.value = false
}
function copy() { uni.setClipboardData({ data: result.value }) }
</script>
<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.topbar { margin-bottom: 20rpx; }
.mtitle { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.ctrl { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.area { min-height: 200rpx; margin-bottom: 16rpx; }
.lang-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.lang-btn { flex: 1; font-size: 26rpx; padding: 12rpx; border-radius: 12rpx; background: var(--c-card); color: var(--c-text); border: 1px solid var(--c-border); }
.lang-btn.on { background: var(--c-primary); color: #fff; border-color: var(--c-primary); }
.gen { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 72rpx; line-height: 72rpx; }
.result-box { margin-top: 20rpx; padding: 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 12rpx; }
.result-text { font-size: 28rpx; color: var(--c-text); line-height: 1.6; }
.copy { margin-top: 12rpx; font-size: 24rpx; color: var(--c-accent); }
</style>
