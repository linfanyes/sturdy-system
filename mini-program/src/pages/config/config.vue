<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
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
    <button class="save" :disabled="savingProfile" @click="saveProfile">{{ savingProfile ? '保存中…' : '保存资料' }}</button>
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
      <button class="save" :disabled="savingAi" @click="saveAi">{{ savingAi ? '保存中…' : '保存 AI 配置' }}</button>
    </view>

    <view class="card">
      <view class="card-title">外观</view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">深色模式</text>
          <text class="row-sub">切换后全应用深色配色（含导航栏与底栏）</text>
        </view>
        <switch :checked="theme.mode === 'dark'" color="#07c160" @change="onTheme" />
      </view>
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
import { auth, setUser, logout, theme, setTheme } from '../../common/store'

const profile = ref({ name: '', school: '', subjects: [] })
const ai = ref({})
const app = ref([])
const savingProfile = ref(false)
const savingAi = ref(false)

async function load() {
  const me = await api.get('/users/me')
  profile.value = { name: me.name, school: me.school, subjects: me.subjects || [] }
  ai.value = await api.get('/config/ai')
  app.value = await api.get('/config/app')
}
onShow(load)

function onTheme(e) {
  setTheme(e.detail.value ? 'dark' : 'light')
}
async function saveProfile() {
  if (savingProfile.value) return
  savingProfile.value = true
  try {
    await api.put('/users/me', { name: profile.value.name, school: profile.value.school })
    setUser({ ...auth.user, name: profile.value.name, school: profile.value.school })
    uni.showToast({ title: '资料已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingProfile.value = false
  }
}
async function saveAi() {
  if (savingAi.value) return
  savingAi.value = true
  try {
    await api.put('/config/ai', ai.value)
    uni.showToast({ title: 'AI 配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingAi.value = false
  }
}
function doLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmColor: '#e64340',
    success: (r) => {
      if (!r.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 24rpx; padding-bottom: 16rpx; border-bottom: 1px solid var(--c-border); }
.field { margin-bottom: 20rpx; }
.label { display: block; font-size: 26rpx; color: var(--c-sub); margin-bottom: 10rpx; }
.field input {
  width: 100%; height: 80rpx; min-height: 80rpx; line-height: 44rpx;
  border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: var(--c-text); background: var(--c-input);
  box-sizing: border-box;
}
.hint { display: block; font-size: 24rpx; color: var(--c-sub); line-height: 1.8; margin: 6rpx 0 18rpx; word-break: break-word; padding: 10rpx 0; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 8rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.kv { display: flex; justify-content: space-between; align-items: flex-start; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); gap: 20rpx; }
.k { color: var(--c-sub); font-size: 26rpx; flex-shrink: 0; line-height: 1.6; }
.v { color: var(--c-title); font-size: 26rpx; flex: 1; text-align: right; word-break: break-all; line-height: 1.6; }
.row { display: flex; align-items: center; justify-content: space-between; }
.row-text { flex: 1; padding-right: 20rpx; }
.row-name { display: block; font-size: 28rpx; color: var(--c-text); font-weight: 600; }
.row-sub { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; line-height: 1.5; }
.logout { background: var(--c-danger); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
