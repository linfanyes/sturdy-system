<template>
  <view class="page">
    <view class="card">
      <view class="sec-title">{{ tool ? tool.icon + ' ' + tool.title : '学科练习' }}</view>
      <view class="hint">填写下方信息，AI 生成贴合年级的练习内容，可复制使用。</view>

      <block v-for="fld in fields" :key="fld.k">
        <view class="field-label">{{ fld.label }}<text v-if="fld.required" class="req">*</text></view>
        <!-- 选项 -->
        <picker
          v-if="fld.type === 'picker'"
          :range="fld.options"
          @change="onPick(fld.k, $event)"
        >
          <view class="picker">{{ form[fld.k] || '请选择' + fld.label }}</view>
        </picker>
        <!-- 多行 -->
        <textarea
          v-else-if="fld.type === 'textarea'"
          v-model="form[fld.k]"
          class="ctrl area"
          :placeholder="fld.placeholder || ''"
        />
        <!-- 数字/文本 -->
        <input
          v-else
          v-model="form[fld.k]"
          class="ctrl"
          :type="fld.type === 'number' ? 'number' : 'text'"
          :placeholder="fld.placeholder || ''"
        />
      </block>

      <button class="gen" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '🤖 生成' }}</button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">生成结果</view>
      <view class="result-text" user-select selectable>{{ content }}</view>
      <button class="copy" @click="copy">📋 复制结果</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth } from '../../common/store'
import { getSubjectTool } from '../../common/subject-schema'

const type = ref('')
const tool = ref(null)
const form = ref({})
const content = ref('')
const loading = ref(false)

const fields = computed(() => (tool.value ? tool.value.fields : []))

onLoad((q) => {
  type.value = q && q.type ? decodeURIComponent(q.type) : ''
  tool.value = getSubjectTool(type.value)
  if (tool.value) {
    uni.setNavigationBarTitle({ title: tool.value.title })
    const init = {}
    tool.value.fields.forEach((f) => { init[f.k] = '' })
    form.value = init
  }
})

function onPick(k, e) {
  const t = tool.value.fields.find((f) => f.k === k)
  form.value[k] = t.options[e.detail.value]
}

async function gen() {
  if (loading.value || !tool.value) return
  const required = tool.value.fields.filter((f) => f.required)
  for (const r of required) {
    if (!String(form.value[r.k] || '').trim()) {
      return uni.showToast({ title: '请填写' + r.label, icon: 'none' })
    }
  }
  const prompt = tool.value.build(form.value)
  loading.value = true
  content.value = ''
  try {
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }],
    })
    content.value = res.content || ''
    if (!content.value) uni.showToast({ title: '生成内容为空', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败，请检查后端 AI 配置', icon: 'none' })
  }
  loading.value = false
}

function copy() {
  uni.setClipboardData({ data: content.value, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: #a07b3b; margin-bottom: 12rpx; }
.hint { font-size: 24rpx; color: #9aa0a6; margin-bottom: 20rpx; line-height: 1.5; }
.field-label { font-size: 26rpx; color: #8a6d3b; margin-bottom: 10rpx; }
.req { color: #e64340; margin-left: 6rpx; }
.ctrl { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.area { min-height: 160rpx; }
.picker { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 18rpx; font-size: 28rpx; color: #4a3f35; }
.gen { background: #e6a23c; color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 6rpx; }
.gen[disabled] { opacity: 0.6; }
.result-text { font-size: 28rpx; line-height: 1.7; color: #4a3f35; white-space: pre-wrap; margin-bottom: 20rpx; }
.copy { background: #07c160; color: #fff; border-radius: 50rpx; font-size: 30rpx; }
</style>
