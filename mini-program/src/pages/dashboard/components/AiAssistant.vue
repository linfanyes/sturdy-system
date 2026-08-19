<template>
  <view class="card ai-card">
    <view class="card-h">
      <view class="ai-title-row">
        <view class="ai-avatar">🤖</view>
        <text class="ch-t">AI 教务助手</text>
      </view>
      <text class="ch-m toggle-btn" @click="showAiHelper = !showAiHelper">{{ showAiHelper ? '收起' : '展开' }}</text>
    </view>
    <view v-if="showAiHelper" class="ai-body">
      <view v-if="!aiHistory.length" class="ai-welcome">
        <text class="ai-welcome-text">有什么可以帮您的？试试下面的快捷问题 ✨</text>
      </view>
      <view class="ai-msgs" v-else>
        <view v-for="(msg, i) in aiHistory" :key="i" class="ai-msg" :class="msg.role" :style="{ '--i': i }">
          <text class="ai-role">{{ msg.role === 'user' ? '🧑‍🏫 我' : '🤖 助手' }}</text>
          <text class="ai-text">{{ msg.text }}</text>
        </view>
        <view v-if="aiLoading" class="ai-msg assistant">
          <text class="ai-role">🤖 助手</text>
          <view class="ai-typing">
            <view class="ai-dot" style="--d:0"></view>
            <view class="ai-dot" style="--d:0.15s"></view>
            <view class="ai-dot" style="--d:0.3s"></view>
          </view>
        </view>
      </view>
      <view class="ai-input-row">
        <input v-model="aiQuery" class="ai-inp" placeholder="如：分析本班最近一次考试情况" @confirm="askAi" />
        <text class="ai-send" :class="aiQuery.trim() && 'active'" @click="askAi">发送</text>
      </view>
      <view class="ai-hints">
        <text class="ai-hint" @click="quickAsk('分析本班近7日出勤率变化')">📊 出勤分析</text>
        <text class="ai-hint" @click="quickAsk('列出待批改作业最多的3个科目')">📝 作业情况</text>
        <text class="ai-hint" @click="quickAsk('对本次考试成绩做简要分析')">📈 成绩分析</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { chatSync } from '@/api/dashboard'

const showAiHelper = ref(false)
const aiQuery = ref('')
const aiHistory = ref([])
const aiLoading = ref(false)

async function askAi() {
  const q = aiQuery.value.trim()
  if (!q || aiLoading.value) return
  aiHistory.value.push({ role: 'user', text: q })
  aiQuery.value = ''
  aiLoading.value = true
  try {
    const r = await chatSync({
      messages: [{ role: 'user', content: '你是小学班主任的AI助手，请用中文简要回答：' + q }],
    })
    aiHistory.value.push({ role: 'assistant', text: r.content || '抱歉，我暂时无法回答这个问题。' })
  } catch {
    aiHistory.value.push({ role: 'assistant', text: 'AI 服务暂时不可用，请稍后再试。' })
  }
  aiLoading.value = false
}
function quickAsk(q) { aiQuery.value = q; askAi() }
</script>

<style scoped>
.ai-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.ai-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(245,179,66,0.5), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ai-title-row { display: flex; align-items: center; gap: 12rpx; }
.ai-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #fff3d6, #ffe0a0); display: flex; align-items: center; justify-content: center; font-size: 28rpx; box-shadow: 0 2rpx 8rpx rgba(245,179,66,0.2); }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.toggle-btn { background: var(--c-input); padding: 6rpx 16rpx; border-radius: 20rpx; transition: all 0.2s; }
.toggle-btn:active { transform: scale(0.95); }
.ai-body { animation: fade-in 0.3s ease both; }
.ai-welcome { text-align: center; padding: 20rpx 0; }
.ai-welcome-text { font-size: 24rpx; color: var(--c-sub); }
.ai-msgs { max-height: 400rpx; overflow-y: auto; margin-bottom: 12rpx; }
.ai-msg { padding: 12rpx 0; border-bottom: 1rpx solid var(--c-border); animation: slide-up 0.3s ease both; animation-delay: calc(var(--i, 0) * 0.05s); }
.ai-role { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 4rpx; }
.ai-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; white-space: pre-wrap; }
.ai-typing { display: flex; gap: 6rpx; padding: 8rpx 0; }
.ai-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: var(--c-accent); animation: dot-pulse 1s ease-in-out infinite; animation-delay: var(--d, 0); }
.ai-input-row { display: flex; gap: 10rpx; margin-bottom: 12rpx; }
.ai-inp { flex: 1; border: 2rpx solid var(--c-border); border-radius: 30rpx; padding: 14rpx 20rpx; font-size: 24rpx; background: var(--c-input); color: var(--c-text); transition: border-color 0.2s; }
.ai-inp:focus { border-color: var(--c-primary); }
.ai-send { flex-shrink: 0; background: var(--c-input); color: var(--c-sub); border-radius: 30rpx; padding: 0 24rpx; font-size: 24rpx; display: flex; align-items: center; transition: all 0.2s; }
.ai-send.active { background: linear-gradient(135deg, #f5b342, #d69426); color: #fff; box-shadow: 0 4rpx 12rpx rgba(214,148,38,0.3); }
.ai-send.active:active { transform: scale(0.95); }
.ai-hints { display: flex; gap: 8rpx; flex-wrap: wrap; }
.ai-hint { font-size: 20rpx; color: var(--c-blue); background: rgba(64,158,255,.1); padding: 8rpx 16rpx; border-radius: 20rpx; transition: all 0.2s; }
.ai-hint:active { transform: scale(0.95); background: rgba(64,158,255,.2); }
@keyframes slide-up { from { opacity: 0; transform: translateY(10rpx); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes dot-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
</style>
