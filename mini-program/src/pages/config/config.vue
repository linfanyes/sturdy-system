<template>
  <view class="page">
    <view class="card">
      <view class="card-title">个人资料</view>
      <input v-model="profile.name" placeholder="称呼" />
      <input v-model="profile.school" placeholder="学校" />
      <input v-model="profile.term" placeholder="学期，如 2026春季学期" />
      <button class="save" @click="saveProfile">保存资料</button>
    </view>

    <view class="card">
      <view class="card-title">AI 配置（密钥仅存后端）</view>
      <input v-model="ai.baseUrl" placeholder="AI 接口地址" />
      <input v-model="ai.apiKey" placeholder="AI 密钥" password />
      <input v-model="ai.textModel" placeholder="文本模型" />
      <input v-model="ai.visionModel" placeholder="多模态模型" />
      <input v-model="ai.aiName" placeholder="AI 名字" />
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

const profile = ref({ name: '', school: '', term: '', subjects: [] })
const ai = ref({})
const app = ref([])

async function load() {
  const me = await api.get('/users/me')
  profile.value = { name: me.name, school: me.school, term: me.term, subjects: me.subjects || [] }
  ai.value = await api.get('/config/ai')
  app.value = await api.get('/config/app')
}
onShow(load)

async function saveProfile() {
  await api.put('/users/me', profile.value)
  setUser({ ...auth.user, ...profile.value })
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
.card input { border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; font-size: 28rpx; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 8rpx; }
.kv { display: flex; justify-content: space-between; padding: 14rpx 0; border-bottom: 1px solid #f5f5f5; }
.k { color: #9aa0a6; font-size: 26rpx; }
.v { color: #4a3f35; font-size: 26rpx; max-width: 60%; text-align: right; }
.logout { background: #f56c6c; color: #fff; border-radius: 50rpx; margin-top: 10rpx; }
</style>
