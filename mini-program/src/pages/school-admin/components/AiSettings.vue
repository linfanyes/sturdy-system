<template>
  <!-- ====== AI 配置 Tab（校管：从超管配置的服务商中选择 + 自填 API Key，可手动切换） ====== -->
  <view>
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
        <button class="ai-save" :disabled="savingAi" @click="$emit('save-ai', { ...ai }, aiProviderCode)">{{ savingAi ? '保存中…' : '保存 AI 配置' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  aiConfig: { type: Object, default: () => ({}) },
  aiProviders: { type: Array, default: () => [] },
  aiProviderCode: { type: String, default: '' },
  aiProviderIdx: { type: Number, default: 0 },
  savingAi: { type: Boolean, default: false },
})

const emit = defineEmits(['save-ai', 'load-ai'])

const AI_DEFAULT_NAME = '小林子'
const AI_DEFAULT_PROMPT = '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。'

const ai = ref({ ...props.aiConfig })
const aiProviderCode = ref(props.aiProviderCode)
const aiProviderIdx = ref(props.aiProviderIdx)

// 兜底服务商列表
const AI_PROVIDER_FALLBACK = [
  { code: 'ali-qwen', name: '阿里百炼（通义千问）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'], visionModels: ['qwen-vl-plus', 'qwen-vl-max'], imageModels: [], videoModels: [], isDefault: true, enabled: true, sortOrder: 1 },
  { code: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'], visionModels: ['deepseek-v4-pro'], imageModels: [], videoModels: [], isDefault: false, enabled: true, sortOrder: 2 },
  { code: 'glm', name: '智谱GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', textModels: ['GLM-4.7-Flash'], visionModels: ['GLM-4.6V-Flash'], imageModels: ['GLM-4.6V-Flash'], videoModels: ['CogVideoX-Flash'], isDefault: false, enabled: true, sortOrder: 3 },
]

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

// Use local providers if provided externally are empty
const aiProviders = ref(props.aiProviders.length ? props.aiProviders : AI_PROVIDER_FALLBACK.filter((p) => p.enabled).map((p) => ({ ...p })))

function aiGetProviderIdx(code) { if (!code) return 0; const i = aiProviders.value.findIndex((p) => p.code === code); return i >= 0 ? i : 0 }
function aiDetectProviderIdx(baseUrl) { if (!baseUrl) return 0; const i = aiProviders.value.findIndex((p) => p.baseUrl && baseUrl.indexOf(p.baseUrl) === 0); return i >= 0 ? i : 0 }

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

// Expose methods to parent
function setAiConfig(cfg) {
  if (cfg && cfg.providerCode) {
    aiProviderCode.value = cfg.providerCode
    aiProviderIdx.value = aiGetProviderIdx(cfg.providerCode)
  } else if (cfg && cfg.baseUrl) {
    aiProviderIdx.value = aiDetectProviderIdx(cfg.baseUrl)
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
    baseUrl: cfg.baseUrl || cur.baseUrl || '',
    apiKey: cfg.apiKey || '',
    textModel: cfg.textModel || (cur.textModels && cur.textModels[0]) || '',
    visionModel: cfg.visionModel || (cur.visionModels && cur.visionModels[0]) || '',
    imageModel: cfg.imageModel || (cur.imageModels && cur.imageModels[0]) || '',
    videoModel: cfg.videoModel || (cur.videoModels && cur.videoModels[0]) || '',
    temperature: typeof cfg.temperature === 'number' && !isNaN(cfg.temperature) ? cfg.temperature : 0.7,
    aiName: cfg.aiName || AI_DEFAULT_NAME,
    systemPrompt: cfg.systemPrompt || AI_DEFAULT_PROMPT,
    resourceModels: cfg.resourceModels || {},
  }
}

function setAiProviders(providers) {
  if (providers && providers.length) {
    aiProviders.value = providers
  }
}

defineExpose({
  setAiConfig,
  setAiProviders,
})
</script>

<style scoped>
.ai-card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.ai-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.ai-hint { display: block; font-size: 22rpx; color: var(--c-sub); line-height: 1.7; margin-bottom: 20rpx; padding: 12rpx 18rpx; background: var(--c-card2); border-radius: 14rpx; }
.ai-field { margin-bottom: 22rpx; }
.ai-label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 10rpx; }
.ai-picker { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.ai-ta { width: 100%; min-height: 200rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; line-height: 1.6; }
.ai-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.ai-ghost { background: transparent; color: var(--c-primary); border: 1px solid var(--c-primary); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save[disabled] { opacity: .6; }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; margin-bottom: 6rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
</style>
