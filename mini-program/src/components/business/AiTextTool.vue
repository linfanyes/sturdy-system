<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">{{ title }}</view>
    <view class="sub">{{ desc }}</view>

    <!-- 输入字段 -->
    <view class="form">
      <view v-for="f in fields" :key="f.key" class="form-row">
        <text class="form-lb">{{ f.label }}</text>
        <input
          v-if="!f.options"
          v-model="form[f.key]"
          class="form-ipt"
          :placeholder="f.placeholder || ''"
          maxlength="50"
        />
        <picker
          v-else
          :range="f.options"
          :value="fieldIdx[f.key] || 0"
          @change="fieldIdx[f.key] = +$event.detail.value; form[f.key] = f.options[$event.detail.value]"
        >
          <view class="form-pk">{{ form[f.key] || f.options[0] }}</view>
        </picker>
      </view>
    </view>

    <button class="btn" :disabled="loading" @click="generate">
      {{ loading ? '生成中…' : 'AI 生成' }}
    </button>

    <!-- 结果展示 -->
    <view v-if="result" class="result">
      <view class="result-hd">生成结果</view>
      <scroll-view scroll-y class="result-body">
        <text class="result-text" selectable>{{ result }}</text>
      </scroll-view>
      <view class="result-actions">
        <button class="btn-copy" @click="copy">复制</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { theme } from '../../common/store'
import { chatSync } from '../../api/ai'

const props = defineProps({
  title: { type: String, default: 'AI 工具' },
  desc: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  buildPrompt: { type: Function, required: true },
})

const form = reactive({})
const fieldIdx = reactive({})
const loading = ref(false)
const result = ref('')

// 初始化默认值
props.fields.forEach((f) => {
  if (f.options?.length) {
    form[f.key] = f.options[0]
    fieldIdx[f.key] = 0
  } else {
    form[f.key] = ''
  }
})

async function generate() {
  loading.value = true
  result.value = ''
  try {
    const prompt = props.buildPrompt(form)
    const res = await chatSync([{ role: 'user', content: prompt }])
    result.value = res?.content || res?.data?.content || '（生成失败，请重试）'
  } catch (e) {
    result.value = '生成失败：' + (e?.message || '未知错误')
  } finally {
    loading.value = false
  }
}

function copy() {
  uni.setClipboardData({
    data: result.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.btn[disabled] { opacity: 0.6; }
.result { margin-top: 24rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.result-hd { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.result-body { max-height: 600rpx; }
.result-text { font-size: 26rpx; color: var(--c-text); line-height: 1.8; white-space: pre-wrap; }
.result-actions { margin-top: 16rpx; display: flex; justify-content: flex-end; }
.btn-copy { background: var(--c-input); border-radius: 10rpx; font-size: 24rpx; padding: 10rpx 24rpx; color: var(--c-text); }
</style>
