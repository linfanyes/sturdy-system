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
        <input v-model="ai.baseUrl" placeholder="AI 接口地址（可由服务商自动填充）" />
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
      <view class="hint">当前服务商：{{ PROVIDER_NAMES[providerIdx] || '自定义' }}（列表来自后端 AI 服务商表，Web 端新增/修改后此处可见）。切换服务商将自动更新接口地址与默认模型。{{ providerIdx === 1 ? 'DeepSeek v4 为原生多模态模型，文本与视觉使用同一模型名。' : '' }}</view>
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
import { auth, setUser, logout, theme, setTheme, cycleColorScheme, SCHEMES, flushTabBarStyle } from '../../common/store'
import { inRange, isUrl, clip, MAX_LEN } from '../../common/validators'
import { getAiSettings, updateAppConfig, getAiProviders, saveAiConfig } from '@/api/config'
import { patchMe } from '@/api/user'

// ==================== AI 服务商：以「后端 ai_providers 表」为准，内置预设仅作兜底 ====================
const PROVIDER_FALLBACK = [
  {
    code: 'ali-qwen',
    name: '阿里百炼（通义千问）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    imageModels: [],
    videoModels: [],
    isDefault: true,
    enabled: true,
    sortOrder: 1,
  },
  {
    code: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    visionModels: ['deepseek-v4-pro'],
    imageModels: [],
    videoModels: [],
    isDefault: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    code: 'glm',
    name: '智谱GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    textModels: ['GLM-4.7-Flash'],
    visionModels: ['GLM-4.6V-Flash'],
    imageModels: ['GLM-4.6V-Flash'],
    videoModels: ['CogVideoX-Flash'],
    isDefault: false,
    enabled: true,
    sortOrder: 3,
  },
  {
    code: 'custom',
    name: '自定义',
    baseUrl: '',
    textModels: [],
    visionModels: [],
    imageModels: [],
    videoModels: [],
    isDefault: false,
    enabled: true,
    sortOrder: 99,
  },
]

// 当前服务商列表（后端 ai_providers → 兜底预设）
const providers = ref([])

function getProviderIdx(code) {
  if (!code) return 0
  const i = providers.value.findIndex((p) => p.code === code)
  return i >= 0 ? i : 0
}

function detectProviderIdx(baseUrl) {
  if (!baseUrl) return 0
  const i = providers.value.findIndex((p) => p.baseUrl && baseUrl.indexOf(p.baseUrl) === 0)
  return i >= 0 ? i : 0
}

const PROVIDER_NAMES = computed(() => providers.value.map((p) => p.name))

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_AI_NAME = '小林子'
const DEFAULT_SYSTEM_PROMPT =
  '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。'

const RESOURCE_MAP = {
  'exam-analysis': '考试分析',
  'student-diagnose': '学生诊断',
  'parse': 'AI解析',
}

const showResourceModels = ref(false)

const ai = ref({})
const app = ref([])
const appMap = ref({})
const savingAi = ref(false)
const providerIdx = ref(0)
const providerCode = ref('')

const curScheme = computed(() => SCHEMES.find((s) => s.value === theme.colorScheme) || SCHEMES[0])

function onTheme(e) {
  const mode = e.detail.value ? 'dark' : 'light'
  setTheme(mode)
  // 持久化到后端：Web 与小程序共享主题偏好
  try {
    updateAppConfig({ theme: mode }).catch(() => {})
    patchMe({ theme: mode }).catch(() => {})
  } catch {
    // ignore
  }
}

function cycle() {
  const next = cycleColorScheme()
  try {
    updateAppConfig({ colorScheme: next }).catch(() => {})
    patchMe({ colorScheme: next }).catch(() => {})
  } catch {
    // ignore
  }
  uni.showToast({ title: '主题色：' + (SCHEMES.find((s) => s.value === next) || {}).label, icon: 'none' })
}

// 当前选中服务商
const currentProvider = computed(() => providers.value[providerIdx.value] || providers.value[0] || {})

const currentTextModels = computed(() => currentProvider.value.textModels || [])
const currentVisionModels = computed(() => currentProvider.value.visionModels || [])
const currentImageModels = computed(() => currentProvider.value.imageModels || [])
const currentVideoModels = computed(() => currentProvider.value.videoModels || [])

const hasImageModels = computed(() => currentImageModels.value.length > 0)
const hasVideoModels = computed(() => currentVideoModels.value.length > 0)

const textModelOpts = computed(() => [...currentTextModels.value, '自定义'])
const visionModelOpts = computed(() => [...currentVisionModels.value, '自定义'])
const imageModelOpts = computed(() => [...currentImageModels.value, '自定义'])
const videoModelOpts = computed(() => [...currentVideoModels.value, '自定义'])

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

function onProviderChange(e) {
  const idx = Number(e.detail.value)
  if (idx === providerIdx.value) return
  providerIdx.value = idx
  const p = providers.value[idx]
  providerCode.value = p.code || ''
  if (p.baseUrl) ai.value.baseUrl = p.baseUrl
  if (p.textModels && p.textModels.length) ai.value.textModel = p.textModels[0]
  if (p.visionModels && p.visionModels.length) ai.value.visionModel = p.visionModels[0]
  if (p.imageModels && p.imageModels.length) ai.value.imageModel = p.imageModels[0]
  if (p.videoModels && p.videoModels.length) ai.value.videoModel = p.videoModels[0]
}

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

function resetAiDefaults() {
  const p = providers.value[providerIdx.value] || providers.value[0]
  ai.value = {
    baseUrl: p.baseUrl || '',
    apiKey: ai.value.apiKey,
    textModel: (p.textModels && p.textModels[0]) || '',
    visionModel: (p.visionModels && p.visionModels[0]) || '',
    imageModel: (p.imageModels && p.imageModels[0]) || '',
    videoModel: (p.videoModels && p.videoModels[0]) || '',
    temperature: DEFAULT_TEMPERATURE,
    aiName: DEFAULT_AI_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    resourceModels: {},
  }
}

/** 从后端加载 AI 服务商列表，失败时回退到本地兜底预设 */
async function loadProviders() {
  try {
    const res = await getAiProviders()
    const list = (res && res.items) || (Array.isArray(res) ? res : [])
    if (list && list.length) {
      providers.value = list
      return
    }
  } catch (e) {
    console.warn('[config] 加载 AI 服务商失败，使用本地兜底预设：', e && e.message)
  }
  // 兜底：使用本地预设（保证无后端时依然可用）
  providers.value = PROVIDER_FALLBACK.filter((p) => p.enabled).map((p) => ({ ...p }))
}

async function load() {
  try {
    await loadProviders()
    // 读取教师个人 AI 设置（已从平台默认 + 教师自定义合并）
    const a = await getAiSettings().catch(() => ({}))
    // 匹配 provider
    if (a && a.providerCode) {
      providerCode.value = a.providerCode
      providerIdx.value = getProviderIdx(a.providerCode)
    } else if (a && a.baseUrl) {
      providerIdx.value = detectProviderIdx(a.baseUrl)
      const p = providers.value[providerIdx.value]
      providerCode.value = p ? p.code : ''
    } else {
      // 未配置时，优先默认服务商
      const defIdx = providers.value.findIndex((p) => p.isDefault)
      providerIdx.value = defIdx >= 0 ? defIdx : 0
      const p = providers.value[providerIdx.value]
      providerCode.value = p ? p.code : ''
    }
    const current = providers.value[providerIdx.value] || providers.value[0] || {}
    ai.value = {
      baseUrl: a.baseUrl || current.baseUrl || '',
      apiKey: a.apiKey || '',
      textModel: a.textModel || (current.textModels && current.textModels[0]) || '',
      visionModel: a.visionModel || (current.visionModels && current.visionModels[0]) || '',
      imageModel: a.imageModel || (current.imageModels && current.imageModels[0]) || '',
      videoModel: a.videoModel || (current.videoModels && current.videoModels[0]) || '',
      temperature:
        typeof a.temperature === 'number' && !isNaN(a.temperature)
          ? a.temperature
          : DEFAULT_TEMPERATURE,
      aiName: a.aiName || DEFAULT_AI_NAME,
      systemPrompt: a.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      resourceModels: a.resourceModels || {},
    }
    // 加载平台公开配置（主题、学期、颜色等）
    try {
      const cfg = await getAppConfig().catch(() => null)
      if (cfg) {
        // 兼容 { items: [...], ...map } 结构
        if (Array.isArray(cfg)) {
          app.value = cfg
          const map = {}
          for (const it of cfg) map[it.key] = it.value
          appMap.value = map
        } else if (Array.isArray(cfg.items)) {
          app.value = cfg.items
          appMap.value = { ...cfg }
        } else {
          app.value = Object.keys(cfg).map((k) => ({ key: k, value: cfg[k] }))
          appMap.value = { ...cfg }
        }
        // 主题同步：后端 theme/colorScheme 覆盖本地（跨端一致）
        if (appMap.value.theme) {
          theme.mode = appMap.value.theme
        }
        if (appMap.value.colorScheme) {
          theme.colorScheme = appMap.value.colorScheme
        }
      }
    } catch (e) {
      console.warn('[config] 加载平台配置失败：', e && e.message)
    }
  } catch (e) {
    console.warn('[config] 配置加载失败，已静默兜底：', e && e.message)
  }
}

const defaultModelName = (key) => ai.value.textModel || 'qwen-plus'

onShow(async () => {
  await load()
  flushTabBarStyle()
})

async function saveAi() {
  if (savingAi.value) return
  if (ai.value.baseUrl && !isUrl(ai.value.baseUrl)) return uni.showToast({ title: '接口地址格式错误，需 http/https 开头', icon: 'none' })
  if (ai.value.temperature && !inRange(ai.value.temperature, 0, 2)) return uni.showToast({ title: '温度值应在 0-2 之间', icon: 'none' })
  savingAi.value = true
  try {
    const payload = {
      providerCode: providerCode.value || '',
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
    // 兼容后端 @Put('ai') 与 @Patch('ai-settings') 两条路径，优先新端点
    await saveAiConfig(payload)
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
