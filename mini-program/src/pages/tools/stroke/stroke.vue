<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">笔顺演示</view>
    <view class="sub">输入单个汉字，AI 生成拼音 + 笔顺步骤 + 部首结构</view>

    <view class="input-row">
      <input
        v-model="input"
        class="inp"
        maxlength="1"
        placeholder="输入单个汉字"
        @confirm="gen"
      />
      <button class="btn" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '生成' }}</button>
    </view>

    <!-- 历史汉字 -->
    <scroll-view scroll-x class="hist" v-if="history.length">
      <view class="hist-h">最近</view>
      <view class="hist-list">
        <text v-for="h in history" :key="h" class="hist-item" @click="reuse(h)">{{ h }}</text>
      </view>
    </scroll-view>

    <!-- 结果 -->
    <view v-if="result" class="result">
      <view class="hanzi-box">
        <text class="hanzi">{{ result.hanzi }}</text>
      </view>
      <view class="info">
        <view class="info-row" v-if="result.pinyin">
          <text class="i-l">拼音</text>
          <text class="i-v pinyin">{{ result.pinyin }}</text>
          <text class="speak" @click="speak">🔊 朗读</text>
        </view>
        <view class="info-row" v-if="result.totalStrokes">
          <text class="i-l">笔画</text>
          <text class="i-v">{{ result.totalStrokes }} 画</text>
        </view>
        <view class="info-row" v-if="result.radical">
          <text class="i-l">部首</text>
          <text class="i-v">{{ result.radical }}</text>
        </view>
        <view class="info-row" v-if="result.structure">
          <text class="i-l">结构</text>
          <text class="i-v">{{ result.structure }}</text>
        </view>
      </view>

      <view class="strokes" v-if="result.strokes && result.strokes.length">
        <view class="sec-h">笔顺步骤</view>
        <view class="stroke-list">
          <view v-for="(s, i) in result.strokes" :key="i" class="stroke-item">
            <text class="s-no">{{ i + 1 }}</text>
            <view class="s-body">
              <text class="s-name">{{ s.name }}</text>
              <text class="s-desc" v-if="s.desc">{{ s.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="meaning" v-if="result.meaning">
        <view class="sec-h">释义</view>
        <text class="m-text">{{ result.meaning }}</text>
      </view>

      <view class="raw" v-if="result.raw">
        <view class="sec-h">AI 原始输出（参考）</view>
        <text class="raw-text">{{ result.raw }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-tip">AI 生成中，请稍候…</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../../common/request'
import { auth, theme } from '../../../common/store'

const dark = computed(() => theme.mode === 'dark')
const input = ref('')
const loading = ref(false)
const result = ref(null)
const history = ref([])

const HIST_KEY = 'stroke_hist'
const MAX_HIST = 12

function loadHistory() {
  try {
    const raw = uni.getStorageSync(HIST_KEY)
    history.value = raw ? JSON.parse(raw) : []
  } catch (e) {
    history.value = []
  }
}
function saveHistory(hanzi) {
  if (!hanzi) return
  const arr = [hanzi, ...history.value.filter((h) => h !== hanzi)].slice(0, MAX_HIST)
  history.value = arr
  uni.setStorageSync(HIST_KEY, JSON.stringify(arr))
}
loadHistory()

function reuse(h) {
  input.value = h
  gen()
}

async function gen() {
  if (loading.value) return
  const ch = (input.value || '').trim()
  if (!ch) return uni.showToast({ title: '请输入汉字', icon: 'none' })
  // 取首个字符（避免用户输入多个字）
  const hanzi = Array.from(ch)[0]
  if (!/^[\u4e00-\u9fa5]$/.test(hanzi)) {
    return uni.showToast({ title: '请输入单个汉字', icon: 'none' })
  }
  loading.value = true
  result.value = null
  try {
    const prompt =
      `请生成汉字「${hanzi}」的笔顺演示信息。返回严格的 JSON（不要 markdown 代码块、不要解释），结构如下：` +
      `{"hanzi":"${hanzi}","pinyin":"带声调的拼音","totalStrokes":数字,"radical":"部首","structure":"结构",` +
      `"strokes":[{"name":"笔画名称(如 横/竖/撇/捺/点)","desc":"简短描述"}],"meaning":"简短释义"}` +
      `。其中 strokes 按正确书写顺序逐笔列出。`
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (res && res.content) || ''
    const parsed = parseJson(raw)
    if (parsed) {
      result.value = { ...parsed, hanzi: parsed.hanzi || hanzi, raw: '' }
    } else {
      // 解析失败：直接展示原文
      result.value = { hanzi, raw, pinyin: '', strokes: [] }
    }
    saveHistory(hanzi)
  } catch (e) {
    uni.showToast({ title: '生成失败：' + (e?.message || '请检查 AI 配置'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function parseJson(text) {
  if (!text) return null
  // 去除 markdown 代码块
  let t = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  // 先直接尝试解析（最稳）
  try { return JSON.parse(t) } catch (e) {}
  // 退回：非贪婪提取首个 {...}（避免贪婪吞掉 JSON 后噪声的 }）
  const m = t.match(/\{[\s\S]*?\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch (e) {
    return null
  }
}

// 单例 audio context，避免每次朗读创建新实例导致内存泄漏
let audioCtx = null
function speak() {
  if (!result.value || !result.value.hanzi) {
    return uni.showToast({ title: '无内容可朗读', icon: 'none' })
  }
  const text = result.value.hanzi || ''
  if (!text) return
  // 复用单例：先销毁旧实例再创建，避免底层音频对象累积
  if (audioCtx) {
    try { audioCtx.destroy() } catch (e) {}
    audioCtx = null
  }
  // 使用百度 TTS 公共接口（在线）
  const url = 'https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=3&pit=5&vol=9&per=4118&text=' + encodeURIComponent(text)
  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = url
  audioCtx.autoplay = true
  audioCtx.onError(() => {
    uni.showToast({ title: '朗读失败，请检查网络或在小程序后台配置 tts.baidu.com 为合法域名', icon: 'none' })
  })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); margin-bottom: 8rpx; }
.sub { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; }
.input-row { display: flex; gap: 16rpx; margin-bottom: 18rpx; }
.inp { flex: 1; border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 0 24rpx; font-size: 32rpx; min-height: 88rpx; line-height: 88rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; }
.btn { background: var(--c-accent); color: #fff; border-radius: 14rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; padding: 0 36rpx; }

.hist { white-space: nowrap; margin-bottom: 22rpx; }
.hist-h { font-size: 22rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.hist-list { display: inline-flex; gap: 14rpx; padding: 4rpx; }
.hist-item { display: inline-block; width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center; font-size: 32rpx; background: var(--c-card); border-radius: 14rpx; color: var(--c-title); box-shadow: 0 2rpx 6rpx var(--c-shadow); }

.result { background: var(--c-card); border-radius: 24rpx; padding: 30rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.hanzi-box { display: flex; justify-content: center; padding: 30rpx 0 20rpx; }
.hanzi { font-size: 200rpx; font-weight: 800; color: var(--c-title); line-height: 1; padding: 30rpx 50rpx; background: var(--c-card2); border-radius: 24rpx; }
.info { background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; margin-bottom: 24rpx; }
.info-row { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.info-row:last-child { border-bottom: none; }
.i-l { width: 80rpx; font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.i-v { flex: 1; font-size: 28rpx; color: var(--c-title); }
.pinyin { font-size: 34rpx; font-weight: 700; color: var(--c-accent); }
.speak { font-size: 24rpx; color: var(--c-primary); background: rgba(7,193,96,.12); padding: 8rpx 20rpx; border-radius: 30rpx; flex-shrink: 0; }
.sec-h { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin: 16rpx 0 12rpx; }
.stroke-list { display: flex; flex-direction: column; gap: 12rpx; }
.stroke-item { display: flex; align-items: center; gap: 16rpx; background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 20rpx; }
.s-no { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--c-accent); color: #fff; text-align: center; line-height: 44rpx; font-size: 22rpx; flex-shrink: 0; }
.s-body { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.s-name { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.s-desc { font-size: 22rpx; color: var(--c-sub); line-height: 1.5; }
.meaning { margin-top: 20rpx; }
.m-text { display: block; font-size: 26rpx; color: var(--c-title); line-height: 1.7; background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 20rpx; }
.raw { margin-top: 20rpx; }
.raw-text { display: block; font-size: 22rpx; color: var(--c-sub); line-height: 1.6; background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 20rpx; white-space: pre-wrap; }
.loading-tip { text-align: center; color: var(--c-sub); font-size: 26rpx; padding: 40rpx 0; }
</style>
