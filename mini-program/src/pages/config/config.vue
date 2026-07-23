<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="card-title">AI 配置（密钥仅存后端）</view>
      <view class="field">
        <text class="label">服务商</text>
        <picker :range="PROVIDER_NAMES" :value="providerIdx" @change="onProviderChange">
          <view class="picker-view">{{ PROVIDER_NAMES[providerIdx] || '请选择' }}</view>
        </picker>
      </view>
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
        <picker :range="textModelOpts" :value="textModelIdx" @change="onTextModelPick">
          <view class="picker-view">{{ textModelOpts[textModelIdx] }}</view>
        </picker>
        <input v-if="textModelIdx === textModelOpts.length - 1" v-model="ai.textModel" placeholder="输入模型名，如 claude-3.5-sonnet" />
      </view>
      <view class="field">
        <text class="label">多模态模型</text>
        <picker :range="visionModelOpts" :value="visionModelIdx" @change="onVisionModelPick">
          <view class="picker-view">{{ visionModelOpts[visionModelIdx] }}</view>
        </picker>
        <input v-if="visionModelIdx === visionModelOpts.length - 1" v-model="ai.visionModel" placeholder="自定义模型名称" />
      </view>
      <view class="field" v-if="hasImageModels">
        <text class="label">文生图模型</text>
        <picker :range="imageModelOpts" :value="imageModelIdx" @change="onImageModelPick">
          <view class="picker-view">{{ imageModelOpts[imageModelIdx] }}</view>
        </picker>
        <input v-if="imageModelIdx === imageModelOpts.length - 1" v-model="ai.imageModel" placeholder="自定义模型名称" />
        <view class="hint" style="margin-top:6rpx">用于「图像创造」的文生图功能（当前服务商：{{ PROVIDER_NAMES[providerIdx] }}）</view>
      </view>
      <view class="field" v-if="hasVideoModels">
        <text class="label">文生视频模型</text>
        <picker :range="videoModelOpts" :value="videoModelIdx" @change="onVideoModelPick">
          <view class="picker-view">{{ videoModelOpts[videoModelIdx] }}</view>
        </picker>
        <input v-if="videoModelIdx === videoModelOpts.length - 1" v-model="ai.videoModel" placeholder="自定义模型名称" />
        <view class="hint" style="margin-top:6rpx">用于「图像创造」的文生视频功能（当前服务商：{{ PROVIDER_NAMES[providerIdx] }}）</view>
      </view>
      <view class="field">
        <text class="label">温度（{{ ai.temperature }}）</text>
        <input type="digit" v-model="ai.temperature" maxlength="5" placeholder="0 - 2" />
        <slider :value="ai.temperature" :min="0" :max="2" :step="0.1" @change="e => ai.temperature = e.detail.value" activeColor="#07c160" />
      </view>
      <view class="field">
        <text class="label">AI 名字</text>
        <input v-model="ai.aiName" placeholder="AI 名字" />
      </view>
      <view class="field">
        <text class="label">系统提示词</text>
        <textarea v-model="ai.systemPrompt" class="ta" placeholder="系统提示词（描述 AI 角色与回答风格）" />
      </view>
      <view class="field">
        <text class="label toggle" @click="showResourceModels = !showResourceModels">{{ showResourceModels ? '▼' : '▶' }} 场景模型覆盖</text>
        <view v-if="showResourceModels" class="rm-box">
          <text class="rm-key">{{ name }}</text>
          <input v-model="ai.resourceModels[key]" class="inp rm-inp" :placeholder="defaultModelName(key)" />
        </view>
        <view class="hint" style="margin-top:4rpx">每个场景可单独指定模型名，不填则使用上方默认文本模型</view>
      </view>
      <view class="hint">当前服务商：{{ PROVIDER_NAMES[providerIdx] || '自定义' }}。切换服务商将自动更新接口地址与默认模型。{{ providerIdx === 1 ? 'DeepSeek v4 为原生多模态模型，文本与视觉使用同一模型名。' : '' }}</view>
      <view class="reset-row">
        <button class="ghost-btn" @click="resetAiDefaults">恢复默认</button>
      </view>
      <button class="save" :disabled="savingAi" @click="saveAi">{{ savingAi ? '保存中…' : '保存 AI 配置' }}</button>
    </view>

    <view class="card">
      <view class="card-title">平台配置（来自后端）</view>
      <view v-for="c in app" :key="c.key" class="kv">
        <text class="k">{{ c.key }}</text>
        <text class="v">{{ c.value }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">外观</view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">深色模式</text>
          <text class="row-sub">切换后全应用深色配色</text>
        </view>
        <switch :checked="theme.mode === 'dark'" color="#07c160" @change="onTheme" />
      </view>
      <view class="row" @click="cycle">
        <view class="row-text">
          <text class="row-name">主题色</text>
          <text class="row-sub">{{ curScheme.label }}</text>
        </view>
        <view class="scheme-group">
          <text v-for="s in SCHEMES" :key="s.value" class="scheme-i" :class="{ on: theme.colorScheme === s.value }" :style="{ background: s.color }" @click="cycle">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <button class="logout" @click="doLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, setUser, logout, theme, setTheme, cycleColorScheme, SCHEMES } from '../../common/store'
import { inRange, isUrl, clip, MAX_LEN } from '../../common/validators'

// ==================== 服务商预设（切换服务商时自动更新接口地址与模型列表） ====================
const PROVIDER_PRESETS = {
  '阿里百炼（通义千问）': {
    baseUrl: 'https://llm-vd2v208bfoq2g7cm.cn-beijing.maas.aliyuncs.com/api/v1',
    textModels: ['qwen3.7-plus', 'qwen3-max', 'qwen3-turbo'],
    visionModels: ['qwen3-vl-plus', 'qwen3-vl-max'],
    imageModels: [],
    videoModels: [],
  },
  'DeepSeek': {
    baseUrl: 'https://api.deepseek.com/v1',
    textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    visionModels: ['deepseek-v4-pro'],
    imageModels: [],
    videoModels: [],
  },
  '智谱GLM': {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    textModels: ['GLM-4.7-Flash'],
    visionModels: ['GLM-4.6V-Flash'],
    imageModels: ['GLM-4.6V-Flash'],   // 文生图
    videoModels: ['CogVideoX-Flash'],  // 文生视频
  },
  '自定义': {
    baseUrl: '',
    textModels: [],
    visionModels: [],
    imageModels: [],
    videoModels: [],
  },
}
const PROVIDER_NAMES = Object.keys(PROVIDER_PRESETS)

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_AI_NAME = '小林子'
const DEFAULT_SYSTEM_PROMPT =
  '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。'

// 场景名映射
const RESOURCE_MAP = {
  'exam-analysis': '考试分析',
  'student-diagnose': '学生诊断',
  'parse': 'AI解析',
}

const showResourceModels = ref(false)

// 根据 baseUrl 反查当前服务商索引
function detectProvider(baseUrl) {
  if (baseUrl && (baseUrl.includes('dashscope.aliyuncs.com') || baseUrl.includes('maas.aliyuncs.com'))) return 0
  if (baseUrl && baseUrl.includes('api.deepseek.com')) return 1
  if (baseUrl && baseUrl.includes('open.bigmodel.cn')) return 2
  return 3
}

const ai = ref({})
const app = ref([])
const savingAi = ref(false)
const providerIdx = ref(0)

const curScheme = computed(() => SCHEMES.find((s) => s.value === theme.colorScheme) || SCHEMES[0])
function onTheme(e) { setTheme(e.detail.value ? 'dark' : 'light') }
function cycle() { const next = cycleColorScheme(); uni.showToast({ title: '主题色：' + (SCHEMES.find((s) => s.value === next) || {}).label, icon: 'none' }) }

// 当前服务商的模型列表（computed）
const currentTextModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].textModels)
const currentVisionModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].visionModels)
const currentImageModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].imageModels)
const currentVideoModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].videoModels)

// 是否支持文生图/文生视频（有预设模型时显示对应字段）
const hasImageModels = computed(() => currentImageModels.value.length > 0)
const hasVideoModels = computed(() => currentVideoModels.value.length > 0)

// 下拉选项 = 当前服务商模型 + "自定义"
const textModelOpts = computed(() => [...currentTextModels.value, '自定义'])
const visionModelOpts = computed(() => [...currentVisionModels.value, '自定义'])
const imageModelOpts = computed(() => [...currentImageModels.value, '自定义'])
const videoModelOpts = computed(() => [...currentVideoModels.value, '自定义'])

// 当前选中索引：命中当前服务商预设返回其索引，否则返回最后一项（自定义）
const textModelIdx = computed(() => {
  const i = currentTextModels.value.indexOf(ai.value.textModel)
  return i >= 0 ? i : textModelOpts.value.length - 1
})
const visionModelIdx = computed(() => {
  const i = currentVisionModels.value.indexOf(ai.value.visionModel)
  return i >= 0 ? i : visionModelOpts.value.length - 1
})
const imageModelIdx = computed(() => {
  const i = currentImageModels.value.indexOf(ai.value.imageModel)
  return i >= 0 ? i : imageModelOpts.value.length - 1
})
const videoModelIdx = computed(() => {
  const i = currentVideoModels.value.indexOf(ai.value.videoModel)
  return i >= 0 ? i : videoModelOpts.value.length - 1
})

// 服务商切换：自动填充接口地址 + 默认模型（含文生图/文生视频）
function onProviderChange(e) {
  const idx = Number(e.detail.value)
  if (idx === providerIdx.value) return
  providerIdx.value = idx
  const preset = PROVIDER_PRESETS[PROVIDER_NAMES[idx]]
  ai.value.baseUrl = preset.baseUrl || ai.value.baseUrl
  if (preset.textModels.length) ai.value.textModel = preset.textModels[0]
  if (preset.visionModels.length) ai.value.visionModel = preset.visionModels[0]
  if (preset.imageModels.length) ai.value.imageModel = preset.imageModels[0]
  if (preset.videoModels.length) ai.value.videoModel = preset.videoModels[0]
}

// 选择预设模型：选"自定义"时不清空（保留当前值方便微调），否则设为对应预设
function onTextModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== textModelOpts.value.length - 1) {
    ai.value.textModel = currentTextModels.value[idx]
  }
}
function onVisionModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== visionModelOpts.value.length - 1) {
    ai.value.visionModel = currentVisionModels.value[idx]
  }
}
function onImageModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== imageModelOpts.value.length - 1) {
    ai.value.imageModel = currentImageModels.value[idx]
  }
}
function onVideoModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== videoModelOpts.value.length - 1) {
    ai.value.videoModel = currentVideoModels.value[idx]
  }
}

// 恢复默认：重置为当前服务商的默认配置
function resetAiDefaults() {
  const preset = PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]]
  ai.value = {
    baseUrl: preset.baseUrl || '',
    apiKey: ai.value.apiKey,
    textModel: preset.textModels[0] || '',
    visionModel: preset.visionModels[0] || '',
    imageModel: preset.imageModels[0] || '',
    videoModel: preset.videoModels[0] || '',
    temperature: DEFAULT_TEMPERATURE,
    aiName: DEFAULT_AI_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
}

async function load() {
  const me = await api.get('/users/me')
  const a = await api.get('/config/ai')
  // 补全 ai 字段：即使后端返回 undefined 也要赋默认值，避免 UI 报错
  const firstProvider = PROVIDER_PRESETS[PROVIDER_NAMES[0]]
  ai.value = {
    baseUrl: a.baseUrl ?? firstProvider.baseUrl,
    apiKey: a.apiKey ?? '',
    textModel: a.textModel ?? firstProvider.textModels[0],
    visionModel: a.visionModel ?? firstProvider.visionModels[0],
    imageModel: a.imageModel ?? (firstProvider.imageModels[0] || ''),
    videoModel: a.videoModel ?? (firstProvider.videoModels[0] || ''),
    temperature:
      typeof a.temperature === 'number' && !isNaN(a.temperature)
        ? a.temperature
        : DEFAULT_TEMPERATURE,
    aiName: a.aiName ?? DEFAULT_AI_NAME,
    systemPrompt: a.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    resourceModels: a.resourceModels || {},
  }
  // 根据已保存的接口地址反查服务商
  providerIdx.value = detectProvider(ai.value.baseUrl)
  app.value = await api.get('/config/app')
}
const defaultModelName = (key) => ai.value.textModel || 'qwen3.7-plus'
onShow(load)
onShow(() => flushTabBarStyle())

async function saveAi() {
  if (savingAi.value) return
  // 校验
  if (ai.value.baseUrl && !isUrl(ai.value.baseUrl)) return uni.showToast({ title: '接口地址格式错误，需 http/https 开头', icon: 'none' })
  if (ai.value.temperature && !inRange(ai.value.temperature, 0, 2)) return uni.showToast({ title: '温度值应在 0-2 之间', icon: 'none' })
  savingAi.value = true
  try {
    // 显式构造纯对象，避免 Vue reactive proxy 序列化异常；temperature 转数字
    const payload = {
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
    await api.put('/config/ai', payload)
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
.picker-view { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.picker-view + input { margin-top: 12rpx; }
.ta { width: 100%; min-height: 220rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; line-height: 1.6; }
.ghost-btn { background: transparent; color: var(--c-primary); border: 1px solid var(--c-primary); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.reset-row { margin-top: 16rpx; margin-bottom: 16rpx; }
.toggle { color: var(--c-primary); cursor: pointer; user-select: none; }
.rm-box { background: var(--c-input); border-radius: 12rpx; padding: 16rpx; margin-top: 8rpx; }
.rm-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 10rpx; }
.rm-key { width: 120rpx; font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.rm-inp { flex: 1; min-height: 60rpx; padding: 8rpx 16rpx; border: 1px solid var(--c-input-border); border-radius: 8rpx; font-size: 24rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; }
.font-group { display: flex; gap: 8rpx; }
.font-i { font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 24rpx; background: var(--c-card2); color: var(--c-sub); }
.font-i.on { background: var(--c-primary); color: #fff; }
.scheme-group { display: flex; gap: 8rpx; }
.scheme-i { font-size: 22rpx; padding: 8rpx 16rpx; border-radius: 24rpx; color: #fff; opacity: 0.55; }
.scheme-i.on { opacity: 1; box-shadow: 0 0 0 4rpx rgba(255,255,255,0.6); }
.logout { background: var(--c-danger); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.help-btn { background: var(--c-card); color: var(--c-accent); border: 1px solid var(--c-accent); border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
/* P2-1: 使用帮助弹层 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.help-modal { width: 640rpx; max-height: 84vh; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; display: flex; flex-direction: column; box-sizing: border-box; }
.hm-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 16rpx; }
.hm-body { flex: 1; max-height: 60vh; }
.hm-sec { margin-bottom: 20rpx; }
.hm-h { font-size: 28rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 8rpx; }
.hm-p { display: block; font-size: 24rpx; color: var(--c-title); line-height: 1.7; margin-bottom: 6rpx; }
.hm-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
