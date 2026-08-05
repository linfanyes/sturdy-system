<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶栏 -->
    <view class="head">
      <text class="back" @click="goBack">← 返回</text>
      <text class="title">AI 配置</text>
      <text class="placeholder"></text>
    </view>

    <view class="ai-card">
      <view class="ai-title">🤖 AI 配置（密钥仅存后端）</view>
      <view class="ai-hint">从超级管理员配置的服务商中选择，并填写你自己的 API Key；非超管不可新增服务商。切换服务商即可「智能切换」到不同厂商。默认继承平台默认配置，可在此自定义。</view>

      <view class="ai-field">
        <text class="ai-label">服务商</text>
        <picker :range="PROVIDER_NAMES" :value="aiProviderIdx" @change="onAiProviderChange">
          <view class="ai-picker">{{ PROVIDER_NAMES[aiProviderIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="ai-field">
        <text class="ai-label">接口地址</text>
        <input v-model="ai.baseUrl" class="inp" placeholder="AI 接口地址（切换服务商自动填充）" />
      </view>
      <view class="ai-field">
        <text class="ai-label">密钥（API Key）</text>
        <input v-model="ai.apiKey" class="inp" placeholder="AI 密钥" password />
      </view>
      <view class="ai-field">
        <text class="ai-label">文本模型</text>
        <picker :range="aiTextModelOpts" :value="aiTextModelIdx" @change="onAiTextModelPick">
          <view class="ai-picker">{{ aiTextModelOpts[aiTextModelIdx] }}</view>
        </picker>
        <input v-if="aiTextModelIdx === aiTextModelOpts.length - 1" v-model="ai.textModel" class="inp" placeholder="输入模型名，如 qwen-plus" />
      </view>
      <view class="ai-field">
        <text class="ai-label">多模态模型</text>
        <picker :range="aiVisionModelOpts" :value="aiVisionModelIdx" @change="onAiVisionModelPick">
          <view class="ai-picker">{{ aiVisionModelOpts[aiVisionModelIdx] }}</view>
        </picker>
        <input v-if="aiVisionModelIdx === aiVisionModelOpts.length - 1" v-model="ai.visionModel" class="inp" placeholder="自定义模型名称" />
      </view>
      <view class="ai-field" v-if="aiHasImageModels">
        <text class="ai-label">文生图模型</text>
        <picker :range="aiImageModelOpts" :value="aiImageModelIdx" @change="onAiImageModelPick">
          <view class="ai-picker">{{ aiImageModelOpts[aiImageModelIdx] }}</view>
        </picker>
        <input v-if="aiImageModelIdx === aiImageModelOpts.length - 1" v-model="ai.imageModel" class="inp" placeholder="自定义模型名称" />
      </view>
      <view class="ai-field" v-if="aiHasVideoModels">
        <text class="ai-label">文生视频模型</text>
        <picker :range="aiVideoModelOpts" :value="aiVideoModelIdx" @change="onAiVideoModelPick">
          <view class="ai-picker">{{ aiVideoModelOpts[aiVideoModelIdx] }}</view>
        </picker>
        <input v-if="aiVideoModelIdx === aiVideoModelOpts.length - 1" v-model="ai.videoModel" class="inp" placeholder="自定义模型名称" />
      </view>
      <view class="ai-field">
        <text class="ai-label">温度（{{ ai.temperature }}）</text>
        <input type="digit" v-model="ai.temperature" maxlength="5" class="inp" placeholder="0 - 2" />
        <slider :value="ai.temperature" :min="0" :max="2" :step="0.1" @change="e => ai.temperature = e.detail.value" activeColor="#07c160" />
      </view>
      <view class="ai-field">
        <text class="ai-label">AI 名字</text>
        <input v-model="ai.aiName" class="inp" placeholder="AI 名字" />
      </view>
      <view class="ai-field">
        <text class="ai-label">系统提示词</text>
        <textarea v-model="ai.systemPrompt" class="ai-ta" placeholder="系统提示词（描述 AI 角色与回答风格）" />
      </view>

      <view class="ai-actions">
        <button class="ai-ghost" @click="resetAiDefaults">恢复默认</button>
        <button class="ai-save" :disabled="savingAi" @click="saveAi">{{ savingAi ? '保存中…' : '保存 AI 配置' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { CLOUDRUN_ENV, CLOUDRUN_SERVICE } from '../../common/config'

function getToken() { return uni.getStorageSync('sa_token') }

function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url: '/pages/login/login' }); throw new Error('未登录') }
  const cloud = typeof wx !== 'undefined' && wx.cloud
  if (!cloud || typeof cloud.callContainer !== 'function') {
    throw new Error('当前环境不支持云托管私有链路')
  }
  return new Promise((resolve, reject) => {
    const opts = {
      config: { env: CLOUDRUN_ENV },
      path: '/api' + path,
      method,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + token,
      },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          const msg = r.data && (r.data.message || r.data.error)
          uni.removeStorageSync('sa_token')
          uni.removeStorageSync('sa_user')
          uni.removeStorageSync('g_token')
          uni.removeStorageSync('g_user')
          uni.removeStorageSync('g_mock_mode')
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error(msg || '登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else {
          const msg = (r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')
          reject(new Error(msg))
        }
      },
      fail: (e) => {
        const msg = (e && (e.errMsg || e.message)) || '网络异常'
        reject(new Error(msg))
      },
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      opts.data = data
    }
    cloud.callContainer(opts)
  })
}

// 兜底服务商列表：当 /config/ai-providers 不可用时保证可用（不可新增，仅选择）
const AI_PROVIDER_FALLBACK = [
  { code: 'ali-qwen', name: '阿里百炼（通义千问）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'], visionModels: ['qwen-vl-plus', 'qwen-vl-max'], imageModels: [], videoModels: [], isDefault: true, enabled: true, sortOrder: 1 },
  { code: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'], visionModels: ['deepseek-v4-pro'], imageModels: [], videoModels: [], isDefault: false, enabled: true, sortOrder: 2 },
  { code: 'glm', name: '智谱GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', textModels: ['GLM-4.7-Flash'], visionModels: ['GLM-4.6V-Flash'], imageModels: ['GLM-4.6V-Flash'], videoModels: ['CogVideoX-Flash'], isDefault: false, enabled: true, sortOrder: 3 },
]

const aiProviders = ref([])
const aiProviderCode = ref('')
const aiProviderIdx = ref(0)
const ai = ref({})
const savingAi = ref(false)

const PROVIDER_NAMES = computed(() => aiProviders.value.map((p) => p.name))
const aiCurrentProvider = computed(() => aiProviders.value[aiProviderIdx.value] || aiProviders.value[0] || {})
const aiTextModels = computed(() => aiCurrentProvider.value.textModels || [])
const aiVisionModels = computed(() => aiCurrentProvider.value.visionModels || [])
const aiImageModels = computed(() => aiCurrentProvider.value.imageModels || [])
const aiVideoModels = computed(() => aiCurrentProvider.value.videoModels || [])
const aiHasImageModels = computed(() => aiImageModels.value.length > 0)
const aiHasVideoModels = computed(() => aiVideoModels.value.length > 0)
const aiTextModelOpts = computed(() => [...aiTextModels.value, '自定义'])
const aiVisionModelOpts = computed(() => [...aiVisionModels.value, '自定义'])
const aiImageModelOpts = computed(() => [...aiImageModels.value, '自定义'])
const aiVideoModelOpts = computed(() => [...aiVideoModels.value, '自定义'])
const aiTextModelIdx = computed(() => { const i = aiTextModels.value.indexOf(ai.value.textModel); return i >= 0 ? i : aiTextModelOpts.value.length - 1 })
const aiVisionModelIdx = computed(() => { const i = aiVisionModels.value.indexOf(ai.value.visionModel); return i >= 0 ? i : aiVisionModelOpts.value.length - 1 })
const aiImageModelIdx = computed(() => { const i = aiImageModels.value.indexOf(ai.value.imageModel); return i >= 0 ? i : aiImageModelOpts.value.length - 1 })
const aiVideoModelIdx = computed(() => { const i = aiVideoModels.value.indexOf(ai.value.videoModel); return i >= 0 ? i : aiVideoModelOpts.value.length - 1 })

function aiGetProviderIdx(code) { if (!code) return 0; const i = aiProviders.value.findIndex((p) => p.code === code); return i >= 0 ? i : 0 }
function aiDetectProviderIdx(baseUrl) { if (!baseUrl) return 0; const i = aiProviders.value.findIndex((p) => p.baseUrl && baseUrl.indexOf(p.baseUrl) === 0); return i >= 0 ? i : 0 }

const AI_DEFAULT_NAME = '小林子'
const AI_DEFAULT_PROMPT = '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。'

async function loadAiProviders() {
  try {
    const res = await apiCall('GET', '/config/ai-providers')
    const list = (res && res.items) || (Array.isArray(res) ? res : [])
    if (list && list.length) { aiProviders.value = list; return }
  } catch (e) { console.warn('[ai-config] 加载 AI 服务商失败，使用本地兜底', e && e.message) }
  aiProviders.value = AI_PROVIDER_FALLBACK.filter((p) => p.enabled).map((p) => ({ ...p }))
}

async function loadAi() {
  try {
    await loadAiProviders()
    const a = await apiCall('GET', '/config/ai-settings').catch(() => ({}))
    if (a && a.providerCode) {
      aiProviderCode.value = a.providerCode
      aiProviderIdx.value = aiGetProviderIdx(a.providerCode)
    } else if (a && a.baseUrl) {
      aiProviderIdx.value = aiDetectProviderIdx(a.baseUrl)
      const p = aiProviders.value[aiProviderIdx.value]
      aiProviderCode.value = p ? p.code : ''
    } else {
      const defIdx = aiProviders.value.findIndex((p) => p.isDefault)
      aiProviderIdx.value = defIdx >= 0 ? defIdx : 0
      const p = aiProviders.value[aiProviderIdx.value]
      aiProviderCode.value = p ? p.code : ''
    }
    const cur = aiProviders.value[aiProviderIdx.value] || aiProviders.value[0] || {}
    ai.value = {
      baseUrl: a.baseUrl || cur.baseUrl || '',
      apiKey: a.apiKey || '',
      textModel: a.textModel || (cur.textModels && cur.textModels[0]) || '',
      visionModel: a.visionModel || (cur.visionModels && cur.visionModels[0]) || '',
      imageModel: a.imageModel || (cur.imageModels && cur.imageModels[0]) || '',
      videoModel: a.videoModel || (cur.videoModels && cur.videoModels[0]) || '',
      temperature: typeof a.temperature === 'number' && !isNaN(a.temperature) ? a.temperature : 0.7,
      aiName: a.aiName || AI_DEFAULT_NAME,
      systemPrompt: a.systemPrompt || AI_DEFAULT_PROMPT,
      resourceModels: a.resourceModels || {},
    }
  } catch (e) { console.warn('[ai-config] AI 配置加载失败', e && e.message) }
}

function onAiProviderChange(e) {
  const idx = Number(e.detail.value)
  if (idx === aiProviderIdx.value) return
  aiProviderIdx.value = idx
  const p = aiProviders.value[idx]
  aiProviderCode.value = p.code || ''
  if (p.baseUrl) ai.value.baseUrl = p.baseUrl
  if (p.textModels && p.textModels.length) ai.value.textModel = p.textModels[0]
  if (p.visionModels && p.visionModels.length) ai.value.visionModel = p.visionModels[0]
  if (p.imageModels && p.imageModels.length) ai.value.imageModel = p.imageModels[0]
  if (p.videoModels && p.videoModels.length) ai.value.videoModel = p.videoModels[0]
}
function onAiTextModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiTextModelOpts.value.length - 1) ai.value.textModel = aiTextModels.value[idx] }
function onAiVisionModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiVisionModelOpts.value.length - 1) ai.value.visionModel = aiVisionModels.value[idx] }
function onAiImageModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiImageModelOpts.value.length - 1) ai.value.imageModel = aiImageModels.value[idx] }
function onAiVideoModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiVideoModelOpts.value.length - 1) ai.value.videoModel = aiVideoModels.value[idx] }

function resetAiDefaults() {
  const p = aiProviders.value[aiProviderIdx.value] || aiProviders.value[0]
  ai.value = {
    baseUrl: p.baseUrl || '',
    apiKey: ai.value.apiKey,
    textModel: (p.textModels && p.textModels[0]) || '',
    visionModel: (p.visionModels && p.visionModels[0]) || '',
    imageModel: (p.imageModels && p.imageModels[0]) || '',
    videoModel: (p.videoModels && p.videoModels[0]) || '',
    temperature: 0.7,
    aiName: AI_DEFAULT_NAME,
    systemPrompt: AI_DEFAULT_PROMPT,
    resourceModels: {},
  }
}

async function saveAi() {
  if (savingAi.value) return
  if (ai.value.baseUrl && !/^https?:\/\//i.test(ai.value.baseUrl)) return uni.showToast({ title: '接口地址格式错误', icon: 'none' })
  savingAi.value = true
  try {
    const payload = {
      providerCode: aiProviderCode.value || '',
      baseUrl: ai.value.baseUrl || '',
      apiKey: ai.value.apiKey || '',
      textModel: ai.value.textModel || '',
      visionModel: ai.value.visionModel || '',
      imageModel: ai.value.imageModel || '',
      videoModel: ai.value.videoModel || '',
      temperature: Number(ai.value.temperature) || 0.7,
      aiName: ai.value.aiName || '',
      systemPrompt: ai.value.systemPrompt || '',
      resourceModels: ai.value.resourceModels || {},
    }
    await apiCall('PATCH', '/config/ai-settings', payload)
    uni.showToast({ title: 'AI 配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingAi.value = false
  }
}

function goBack() { uni.navigateBack() }

onShow(async () => {
  await loadAi()
})
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: var(--c-bg, #faf7f2); min-height: 100vh; box-sizing: border-box; }
.page.dark { background: var(--c-bg, #1c1b19); }

.head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; margin: -24rpx -24rpx 24rpx; background: #fff; border-bottom: 1rpx solid #f0e9df; }
.dark .head { background: #262421; border-bottom-color: #3a3733; }
.back { font-size: 28rpx; color: #b8894a; }
.title { font-size: 32rpx; font-weight: 600; color: #4a3b2a; }
.dark .title { color: #f0e9df; }
.placeholder { width: 56rpx; }

.ai-card { background: var(--c-card, #fff); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow, rgba(0,0,0,.05)); }
.ai-title { font-size: 30rpx; font-weight: 700; color: var(--c-title, #4a3b2a); margin-bottom: 16rpx; }
.ai-hint { display: block; font-size: 22rpx; color: var(--c-sub, #8a7d6a); line-height: 1.7; margin-bottom: 20rpx; padding: 12rpx 18rpx; background: var(--c-card2, #f6f1e8); border-radius: 14rpx; }
.ai-field { margin-bottom: 22rpx; }
.ai-label { display: block; font-size: 26rpx; color: var(--c-title, #4a3b2a); font-weight: 600; margin-bottom: 10rpx; }
.ai-picker { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border, #e7ddcd); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text, #4a3b2a); background: var(--c-input, #fff); box-sizing: border-box; }
.ai-ta { width: 100%; min-height: 200rpx; border: 1px solid var(--c-input-border, #e7ddcd); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text, #4a3b2a); background: var(--c-input, #fff); box-sizing: border-box; line-height: 1.6; }
.ai-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.ai-ghost { background: transparent; color: var(--c-primary, #07c160); border: 1px solid var(--c-primary, #07c160); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save { background: var(--c-primary, #07c160); color: #fff; border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save[disabled] { opacity: .6; }
</style>
