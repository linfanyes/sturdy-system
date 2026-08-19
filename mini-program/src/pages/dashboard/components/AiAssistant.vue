<template>
  <view class="card">
    <view class="card-h">
      <text class="ch-t">🤖 AI 教务助手</text>
      <text class="ch-m" @click="showAiHelper = !showAiHelper">{{ showAiHelper ? '收起' : '展开' }}</text>
    </view>
    <view v-if="showAiHelper">
      <view class="ai-msgs" v-if="aiHistory.length">
        <view v-for="(msg, i) in aiHistory" :key="i" class="ai-msg" :class="msg.role">
          <text class="ai-role">{{ msg.role === 'user' ? '🧑‍🏫 我' : '🤖 助手' }}</text>
          <text class="ai-text">{{ msg.text }}</text>
        </view>
      </view>
      <view class="ai-input-row">
        <input v-model="aiQuery" class="ai-inp" placeholder="如：分析本班最近一次考试情况" @confirm="askAi" />
        <text class="ai-send" @click="askAi">发送</text>
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
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.ai-msgs { max-height: 400rpx; overflow-y: auto; margin-bottom: 12rpx; }
.ai-msg { padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.ai-role { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 4rpx; }
.ai-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; white-space: pre-wrap; }
.ai-input-row { display: flex; gap: 10rpx; margin-bottom: 8rpx; }
.ai-inp { flex: 1; border: 1px solid var(--c-border); border-radius: 30rpx; padding: 14rpx 20rpx; font-size: 24rpx; background: var(--c-input); color: var(--c-text); }
.ai-send { flex-shrink: 0; background: var(--c-primary); color: #fff; border-radius: 30rpx; padding: 0 24rpx; font-size: 24rpx; display: flex; align-items: center; }
.ai-hints { display: flex; gap: 8rpx; flex-wrap: wrap; }
.ai-hint { font-size: 20rpx; color: var(--c-blue); background: rgba(64,158,255,.1); padding: 6rpx 14rpx; border-radius: 20rpx; }
</style>
