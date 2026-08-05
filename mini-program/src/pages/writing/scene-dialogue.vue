<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">情景对话</view>
    <view class="panel">
      <view class="field">
        <text class="label">场景</text>
        <input v-model="form.scene" class="inp" placeholder="如：购物、问路、看医生" />
      </view>
      <view class="field">
        <text class="label">年级</text>
        <picker :range="grades" :value="gradeIdx" @change="onGradeChange">
          <view class="picker">{{ form.grade || '请选择年级' }}</view>
        </picker>
      </view>
      <button class="btn send" :disabled="generating" @click="generate">
        {{ generating ? '生成中…' : 'AI 生成对话' }}
      </button>
    </view>

    <view v-if="result" class="result">
      <view class="res-top">
        <text class="res-title">生成结果</text>
        <text class="act" @click="copyResult">复制</text>
      </view>
      <view class="res-content">{{ result }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../../common/request'
import { theme } from '../../common/store'

const grades = ['三年级', '四年级', '五年级', '六年级']
const gradeIdx = ref(0)
const form = ref({ scene: '', grade: '三年级' })
const generating = ref(false)
const result = ref('')

function onGradeChange(e) { gradeIdx.value = e.detail.value; form.value.grade = grades[e.detail.value] }

async function generate() {
  if (!form.value.scene.trim()) return uni.showToast({ title: '请填写场景', icon: 'none' })
  generating.value = true
  result.value = ''
  try {
    const prompt = `请生成一段${form.value.grade}英语情景对话，场景：${form.value.scene}。包含6-8轮对话、中文翻译、重点句型标注、角色扮演建议。`
    const res = await api.post('/ai/generate', { prompt, type: 'scene-dialogue' })
    result.value = typeof res === 'string' ? res : (res?.result || res?.content || '生成失败')
  } catch (e) { uni.showToast({ title: '生成失败', icon: 'none' }) }
  finally { generating.value = false }
}

function copyResult() {
  uni.setClipboardData({ data: result.value, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.panel { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.btn { border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.send { background: var(--c-primary); color: #fff; margin-top: 10rpx; }
.btn.send[disabled] { opacity: 0.6; }
.result { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-top: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.res-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.res-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.act { font-size: 24rpx; color: var(--c-blue); }
.res-content { font-size: 28rpx; line-height: 1.8; color: var(--c-title); white-space: pre-wrap; }
</style>