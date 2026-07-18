<template>
  <view class="page">
    <view class="card">
      <view class="card-title">个人资料</view>
      <view class="field">
        <text class="label">称呼</text>
        <input v-model="profile.name" placeholder="如 王老师" />
      </view>
      <view class="field">
        <text class="label">学校</text>
        <input v-model="profile.school" placeholder="如 阳光小学" />
      </view>
      <button class="save" @click="saveProfile">保存资料</button>
    </view>

    <view class="card">
      <view class="card-title">AI 配置（密钥仅存后端）</view>
      <view class="field">
        <text class="label">接口地址</text>
        <input v-model="ai.baseUrl" placeholder="AI 接口地址" />
      </view>
      <view class="field">
        <text class="label">密钥</text>
        <input v-model="ai.apiKey" placeholder="AI 密钥" password />
      </view>
      <view class="field">
        <text class="label">文本模型</text>
        <input v-model="ai.textModel" placeholder="文本模型" />
      </view>
      <view class="field">
        <text class="label">多模态模型</text>
        <input v-model="ai.visionModel" placeholder="多模态模型" />
      </view>
      <view class="field">
        <text class="label">AI 名字</text>
        <input v-model="ai.aiName" placeholder="AI 名字" />
      </view>
      <view class="hint">文本模型默认 qwen3.7-plus，多模态默认 qwen3-vl-plus，系统会按消息是否含图自动切换。</view>
      <button class="save" @click="saveAi">保存 AI 配置</button>
    </view>

    <view class="card">
      <view class="card-title">平台配置（来自后端）</view>
      <view v-for="c in app" :key="c.key" class="kv">
        <text class="k">{{ c.key }}</text>
        <text class="v">{{ c.value }}</text>
      </view>
    </view>

    <button class="logout" @click="doLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, setUser, logout } from '../../common/store'

const profile = ref({ name: '', school: '', subjects: [] })
const ai = ref({})
const app = ref([])

async function load() {
  const me = await api.get('/users/me')
  profile.value = { name: me.name, school: me.school, subjects: me.subjects || [] }
  ai.value = await api.get('/config/ai')
  app.value = await api.get('/config/app')
}
onShow(load)

async function saveProfile() {
  await api.put('/users/me', { name: profile.value.name, school: profile.value.school })
  setUser({ ...auth.user, name: profile.value.name, school: profile.value.school })
  uni.showToast({ title: '已保存' })
}
async function saveAi() {
  await api.put('/config/ai', ai.value)
  uni.showToast({ title: 'AI 配置已保存' })
}
function doLogout() {
  logout()
  uni.reLaunch({ url: '/pages/login/login' })
}
</script>

<style scoped>
.page { padding: 30rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: #4a3f35; margin-bottom: 20rpx; }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: #9aa0a6; margin-bottom: 8rpx; }
.field input { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.hint { font-size: 24rpx; color: #9aa0a6; line-height: 1.6; margin: 6rpx 0 18rpx; word-break: break-word; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 8rpx; }
.kv { display: flex; justify-content: space-between; align-items: flex-start; padding: 14rpx 0; border-bottom: 1px solid #f5f5f5; gap: 20rpx; }
.k { color: #9aa0a6; font-size: 26rpx; flex-shrink: 0; }
.v { color: #4a3f35; font-size: 26rpx; flex: 1; text-align: right; word-break: break-all; }
.logout { background: #f56c6c; color: #fff; border-radius: 50rpx; margin-top: 10rpx; }
</style>
