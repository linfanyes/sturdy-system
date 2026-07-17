<template>
  <view class="page">
    <view class="card">
      <view class="sec-title">📑 文案模板库</view>
      <view class="hint">收藏常用文案模板（通知、评语、开场白…），随时复制复用。本地保存，不上云。</view>

      <view v-if="!editing">
        <view v-for="t in list" :key="t.id" class="item" @click="copy(t)">
          <view class="item-name">{{ t.name }}</view>
          <view class="item-content">{{ t.content }}</view>
          <view class="item-ops" @click.stop>
            <text class="op" @click="edit(t)">编辑</text>
            <text class="op del" @click="remove(t)">删除</text>
          </view>
        </view>
        <view v-if="list.length === 0" class="empty">还没有模板，点下方「新增」添加一条吧</view>
        <button class="add" @click="startAdd">➕ 新增模板</button>
      </view>

      <view v-else>
        <view class="field-label">模板名称</view>
        <input v-model="draft.name" class="ctrl" placeholder="如：家长会通知" />
        <view class="field-label">模板内容</view>
        <textarea v-model="draft.content" class="ctrl area" placeholder="输入文案内容…" />
        <button class="gen" @click="save">💾 保存</button>
        <button class="cancel" @click="editing = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const KEY = 'tpl_lib'
const list = ref([])
const editing = ref(false)
const draft = ref({ id: '', name: '', content: '' })

function load() {
  try {
    list.value = uni.getStorageSync(KEY) || []
  } catch (e) {
    list.value = []
  }
}

function persist() {
  uni.setStorageSync(KEY, list.value)
}

function startAdd() {
  draft.value = { id: String(Date.now()), name: '', content: '' }
  editing.value = true
}

function edit(t) {
  draft.value = { ...t }
  editing.value = true
}

function save() {
  if (!draft.value.name.trim()) return uni.showToast({ title: '请填名称', icon: 'none' })
  const idx = list.value.findIndex((x) => x.id === draft.value.id)
  if (idx >= 0) list.value[idx] = { ...draft.value }
  else list.value.push({ ...draft.value })
  persist()
  editing.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

function remove(t) {
  uni.showModal({
    title: '删除模板',
    content: '确定删除「' + t.name + '」？',
    success: (r) => {
      if (r.confirm) {
        list.value = list.value.filter((x) => x.id !== t.id)
        persist()
      }
    },
  })
}

function copy(t) {
  uni.setClipboardData({ data: t.content, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

onShow(() => load())
</script>

<style scoped>
.page { padding: 30rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 30rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: #a07b3b; margin-bottom: 12rpx; }
.hint { font-size: 24rpx; color: #9aa0a6; margin-bottom: 20rpx; line-height: 1.5; }
.item { border: 1px solid #f0f0f0; border-radius: 16rpx; padding: 22rpx; margin-bottom: 18rpx; }
.item-name { font-size: 28rpx; font-weight: 600; color: #4a3f35; }
.item-content { font-size: 24rpx; color: #9aa0a6; margin: 10rpx 0; max-height: 120rpx; overflow: hidden; white-space: pre-wrap; }
.item-ops { display: flex; gap: 30rpx; }
.op { font-size: 24rpx; color: #e6a23c; }
.op.del { color: #e64340; }
.empty { font-size: 24rpx; color: #9aa0a6; text-align: center; padding: 30rpx; }
.add { background: #e6a23c; color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 10rpx; }
.field-label { font-size: 26rpx; color: #8a6d3b; margin: 16rpx 0 10rpx; }
.ctrl { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 10rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.area { min-height: 240rpx; }
.gen { background: #07c160; color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 16rpx; }
.cancel { background: #f5f5f5; color: #888; border-radius: 50rpx; font-size: 28rpx; margin-top: 14rpx; }
</style>
