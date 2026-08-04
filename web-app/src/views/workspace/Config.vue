<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Save, Bot, Settings, RefreshCw, Loader2 } from 'lucide-vue-next'
import request from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { ROLE_PROMPTS, DEFAULT_TEACHER_PROMPT } from '@/constants/teacher-prompts'

const auth = useAuthStore()

const tab = ref<'ai' | 'app'>('ai')
const loading = ref(false)
const saving = ref(false)

// ==================== 服务商（从后端 ai_providers 表加载） ====================
interface ProviderItem {
  code: string
  name: string
  baseUrl: string
  textModels: string[]
  visionModels: string[]
  imageModels: string[]
  videoModels: string[]
  isDefault: boolean
  enabled: boolean
  sortOrder: number
}

const providers = ref<ProviderItem[]>([])
const providerLoading = ref(false)

async function loadProviders() {
  providerLoading.value = true
  try {
    providers.value = await request.get('/ai-providers')
  } catch {
    providers.value = []
  } finally {
    providerLoading.value = false
  }
}

const PROVIDER_NAMES = computed(() =>
  providers.value.filter((p) => p.enabled).map((p) => p.name),
)

function getProviderByName(name: string): ProviderItem | undefined {
  return providers.value.find((p) => p.name === name)
}

function getProviderByCode(code: string): ProviderItem | undefined {
  return providers.value.find((p) => p.code === code)
}

function detectProvider(baseUrl?: string): string {
  if (!baseUrl && providers.value.length) {
    const def = providers.value.find((p) => p.isDefault && p.enabled) || providers.value.find((p) => p.enabled)
    return def?.name || ''
  }
  const found = providers.value.find((p) => p.baseUrl === baseUrl)
  return found?.name || ''
}

const RESOURCE_SCENES: Record<string, string> = {
  'exam-analysis': '考试分析',
  'student-diagnose': '学生诊断',
  'parse': 'AI 解析',
}

// ==================== 教师 AI 配置表单 ====================
const aiForm = reactive({
  provider: '',
  _providerCode: '',
  baseUrl: '',
  apiKey: '',
  textModel: '',
  visionModel: '',
  imageModel: '',
  videoModel: '',
  temperature: 0.7,
  aiName: '小林子',
  systemPrompt: '',
  resourceModels: {} as Record<string, string>,
})

// 模型列表（来自后端查询）
const models = reactive<Record<'text' | 'vision' | 'image' | 'video', string[]>>({
  text: [],
  vision: [],
  image: [],
  video: [],
})
const loadingModels = ref(false)
const modelSource = ref<'live' | 'fallback' | ''>('')

const CUSTOM = '__custom__'

function applyProvider(name: string) {
  aiForm.provider = name
  const p = getProviderByName(name)
  if (p) {
    aiForm.baseUrl = p.baseUrl
    if (!aiForm.textModel || !p.textModels.includes(aiForm.textModel)) {
      aiForm.textModel = p.textModels[0] || ''
    }
    if (!aiForm.visionModel || !p.visionModels.includes(aiForm.visionModel)) {
      aiForm.visionModel = p.visionModels[0] || ''
    }
    if (!aiForm.imageModel || !p.imageModels.includes(aiForm.imageModel)) {
      aiForm.imageModel = p.imageModels[0] || ''
    }
    if (!aiForm.videoModel || !p.videoModels.includes(aiForm.videoModel)) {
      aiForm.videoModel = p.videoModels[0] || ''
    }
    aiForm._providerCode = p.code
  }
  refreshModels()
}

function modelOptions(kind: 'text' | 'vision' | 'image' | 'video'): string[] {
  return [...models[kind], CUSTOM]
}

function isCustom(kind: 'text' | 'vision' | 'image' | 'video'): boolean {
  const v = (aiForm as any)[kind + 'Model'] as string
  return !v || !models[kind].includes(v)
}

function onModelPick(kind: 'text' | 'vision' | 'image' | 'video', value: string) {
  if (value !== CUSTOM) (aiForm as any)[kind + 'Model'] = value
}

function hasImageModels() { return models.image.length > 0 || aiForm.imageModel }
function hasVideoModels() { return models.video.length > 0 || aiForm.videoModel }

// ==================== 实时查询模型列表 ====================
async function refreshModels() {
  loadingModels.value = true
  try {
    const res = await request.post<any, any>('/config/ai/models', {
      providerCode: aiForm._providerCode,
      baseUrl: aiForm.baseUrl,
      apiKey: aiForm.apiKey,
    })
    models.text = res?.textModels || []
    models.vision = res?.visionModels || []
    models.image = res?.imageModels || []
    models.video = res?.videoModels || []
    modelSource.value = res?.source || 'fallback'
  } catch {
    const p = getProviderByName(aiForm.provider)
    models.text = p?.textModels || []
    models.vision = p?.visionModels || []
    models.image = p?.imageModels || []
    models.video = p?.videoModels || []
    modelSource.value = 'fallback'
  } finally {
    loadingModels.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(() => aiForm.baseUrl, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => refreshModels(), 600)
})

// ==================== 加载配置（先平台默认，再教师自定义覆盖） ====================
async function load() {
  loading.value = true
  try {
    await loadProviders()
    // 同时加载平台默认配置和教师个人配置
    const [platformRes, teacherRes] = await Promise.all([
      request.get('/config/teacher/ai-defaults').catch(() => null),
      request.get('/config/ai-settings').catch(() => null),
    ])
    // 先用平台默认填充
    if (platformRes) {
      aiForm.baseUrl = platformRes.baseUrl || platformRes.aiBaseUrl || ''
      aiForm.textModel = platformRes.textModel || platformRes.aiTextModel || ''
      aiForm.visionModel = platformRes.visionModel || platformRes.aiVisionModel || ''
      aiForm.imageModel = platformRes.imageModel || platformRes.aiImageModel || ''
      aiForm.videoModel = platformRes.videoModel || platformRes.aiVideoModel || ''
      aiForm.temperature = platformRes.temperature ?? platformRes.aiTemperature ?? 0.7
      aiForm.aiName = platformRes.aiName || '小林子'
      aiForm.systemPrompt = platformRes.systemPrompt || platformRes.aiSystemPrompt || ''
      if (platformRes.resourceModels) {
        aiForm.resourceModels = typeof platformRes.resourceModels === 'string'
          ? JSON.parse(platformRes.resourceModels)
          : platformRes.resourceModels
      }
      // 从 providerCode 匹配服务商名
      if (platformRes.providerCode) {
        const p = getProviderByCode(platformRes.providerCode)
        aiForm.provider = p?.name || detectProvider(aiForm.baseUrl)
        aiForm._providerCode = platformRes.providerCode
      } else {
        aiForm.provider = detectProvider(aiForm.baseUrl)
        const found = getProviderByName(aiForm.provider)
        aiForm._providerCode = found?.code || ''
      }
    }
    // 再用教师个人配置覆盖（优先级更高）
    if (teacherRes) {
      Object.assign(aiForm, teacherRes)
      // 重新匹配 providerCode
      if (teacherRes.providerCode) {
        const p = getProviderByCode(teacherRes.providerCode)
        aiForm.provider = p?.name || aiForm.provider
        aiForm._providerCode = teacherRes.providerCode
      } else if (teacherRes.baseUrl) {
        aiForm.provider = detectProvider(teacherRes.baseUrl)
        const found = getProviderByName(aiForm.provider)
        aiForm._providerCode = found?.code || ''
      }
    }
    // 默认服务商
    if (!aiForm.provider && PROVIDER_NAMES.value.length) {
      aiForm.provider = PROVIDER_NAMES.value[0]
      aiForm._providerCode = providers.value[0]?.code || ''
      aiForm.baseUrl = providers.value[0]?.baseUrl || ''
    }
    // 如果 systemPrompt 仍为空，根据教师岗位自动填充默认提示词
    if (!aiForm.systemPrompt && auth.user?.position) {
      const matched = ROLE_PROMPTS[auth.user.position] || ROLE_PROMPTS[auth.user.position.replace(/教师$/, '')]
      aiForm.systemPrompt = matched?.prompt || DEFAULT_TEACHER_PROMPT
    } else if (!aiForm.systemPrompt) {
      aiForm.systemPrompt = DEFAULT_TEACHER_PROMPT
    }
    refreshModels()
  } finally {
    loading.value = false
  }
}

function onProviderChange(e: Event) {
  const idx = (e.target as HTMLSelectElement).selectedIndex
  applyProvider(PROVIDER_NAMES.value[idx])
}

async function saveAi() {
  saving.value = true
  try {
    await request.patch('/config/ai-settings', {
      providerCode: aiForm._providerCode,
      baseUrl: aiForm.baseUrl,
      apiKey: aiForm.apiKey,
      textModel: aiForm.textModel,
      visionModel: aiForm.visionModel,
      imageModel: aiForm.imageModel,
      videoModel: aiForm.videoModel,
      temperature: Number(aiForm.temperature),
      aiName: aiForm.aiName,
      systemPrompt: aiForm.systemPrompt,
      resourceModels: JSON.stringify(aiForm.resourceModels),
    })
    alert('AI 配置已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 恢复平台默认：重新加载平台配置但不保存教师个人覆盖 */
async function resetAiDefaults() {
  if (!await confirm('恢复默认将丢弃你的自定义 AI 配置，确定吗？')) return
  saving.value = true
  try {
    const res = await request.get('/config/teacher/ai-defaults').catch(() => null)
    if (res) {
      aiForm.baseUrl = res.baseUrl || res.aiBaseUrl || ''
      aiForm.apiKey = ''
      aiForm.textModel = res.textModel || res.aiTextModel || ''
      aiForm.visionModel = res.visionModel || res.aiVisionModel || ''
      aiForm.imageModel = res.imageModel || res.aiImageModel || ''
      aiForm.videoModel = res.videoModel || res.aiVideoModel || ''
      aiForm.temperature = res.temperature ?? res.aiTemperature ?? 0.7
      aiForm.aiName = res.aiName || '小林子'
      aiForm.systemPrompt = res.systemPrompt || res.aiSystemPrompt || ''
      if (res.resourceModels) {
        aiForm.resourceModels = typeof res.resourceModels === 'string'
          ? JSON.parse(res.resourceModels)
          : res.resourceModels
      }
      if (res.providerCode) {
        const p = getProviderByCode(res.providerCode)
        aiForm.provider = p?.name || ''
        aiForm._providerCode = res.providerCode
      } else {
        aiForm.provider = detectProvider(aiForm.baseUrl)
        const found = getProviderByName(aiForm.provider)
        aiForm._providerCode = found?.code || ''
      }
      refreshModels()
    }
    alert('已恢复平台默认配置，请点击「保存」以生效')
  } catch (e: any) {
    alert(e?.message || '加载默认配置失败')
  } finally {
    saving.value = false
  }
}

// ==================== 应用配置 ====================
const appForm = reactive({ theme: 'light', semester: '', schoolYear: '', colorScheme: 'butter' })

const SEMESTER_OPTIONS = (() => {
  const y = new Date().getFullYear()
  const opts: string[] = []
  for (let i = y - 2; i <= y + 1; i++) { opts.push(`${i}春季`); opts.push(`${i}秋季`) }
  return opts
})()

/** 当前学期默认值：9-12月为秋季，其余为春季 */
function currentSemester(): string {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 8 ? `${y}秋季` : `${y}春季`
}

/** 应用主题到 document，实现深色/浅色即时切换 */
function applyTheme(theme: string) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.remove('dark')
  }
}

async function loadApp() {
  try {
    const app = await request.get('/config/app-config').catch(() => null)
    if (app) {
      // 兼容 map 形态（{theme, semester, ...}）与 items 形态（[{key,value}]）
      if (app && Array.isArray(app.items)) {
        const map: Record<string, any> = {}
        for (const it of app.items) map[it.key] = it.value
        Object.assign(appForm, map)
      } else if (app && typeof app === 'object') {
        Object.assign(appForm, app)
      }
    }
    // 当前学期默认显示本学期
    if (!appForm.semester) appForm.semester = currentSemester()
    // 即时应用主题
    applyTheme(appForm.theme)
  } catch { /* ignore */ }
}

/** 主题改变即时应用 */
watch(() => appForm.theme, (t) => applyTheme(t))

onMounted(() => {
  loadApp()
  load() // 加载 AI 配置（修复：原先未调用 load）
})

async function saveApp() {
  saving.value = true
  try {
    await request.patch('/config/app-config', appForm)
    // 同步主题/配色到用户档案，跨端可见
    await request.patch('/users/me', {
      theme: appForm.theme,
      colorScheme: appForm.colorScheme,
    }).catch(() => {})
    applyTheme(appForm.theme)
    alert('应用配置已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function resourceKeyLabel(key: string) { return RESOURCE_SCENES[key] || key }
function defaultModelName(key: string) { return aiForm.textModel || '默认文本模型' }
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">配置中心</h1>

    <div class="flex gap-2 flex-wrap">
      <button
        :class="['flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'ai' ? 'bg-butter-500 text-white' : 'bg-white text-cocoa-500 hover:bg-cream-100']"
        @click="tab = 'ai'"
      ><Bot class="w-4 h-4" /> AI 配置</button>
      <button
        :class="['flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'app' ? 'bg-butter-500 text-white' : 'bg-white text-cocoa-500 hover:bg-cream-100']"
        @click="tab = 'app'"
      ><Settings class="w-4 h-4" /> 应用配置</button>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 flex items-center gap-2">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中…
    </div>

    <!-- ==================== AI 配置 ==================== -->
    <div v-else-if="tab === 'ai'" class="bg-white rounded-2xl p-6 shadow-softer max-w-4xl space-y-4">
      <div class="text-xs text-butter-600 bg-butter-100/50 rounded-lg px-3 py-2">
        ⚠️ API Key 属敏感信息，请勿在公共环境泄露；仅保存在你自己的账号下。
        默认继承管理员的平台配置，你可在本页按需自定义。
      </div>

      <!-- 服务商 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">服务商</label>
          <select v-model="aiForm.provider" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" @change="onProviderChange">
            <option v-for="p in PROVIDER_NAMES" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">接口地址</label>
          <input v-model="aiForm.baseUrl" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="AI 接口地址" />
        </div>
      </div>

      <!-- API Key -->
      <div>
        <label class="text-sm text-cocoa-500">API Key</label>
        <input v-model="aiForm.apiKey" type="password" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="sk-..." />
      </div>

      <!-- 模型选择 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">文本模型</label>
          <select class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" :value="isCustom('text') ? CUSTOM : aiForm.textModel" @change="onModelPick('text', ($event.target as HTMLSelectElement).value)">
            <option v-for="m in modelOptions('text')" :key="m" :value="m === CUSTOM ? CUSTOM : m">{{ m === CUSTOM ? '自定义…' : m }}</option>
          </select>
          <input v-if="isCustom('text')" v-model="aiForm.textModel" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="输入模型名" />
          <div v-if="loadingModels" class="text-xs text-cocoa-400 mt-1 flex items-center gap-1"><Loader2 class="w-3 h-3 animate-spin" /> 刷新中…</div>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">多模态模型</label>
          <select class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" :value="isCustom('vision') ? CUSTOM : aiForm.visionModel" @change="onModelPick('vision', ($event.target as HTMLSelectElement).value)">
            <option v-for="m in modelOptions('vision')" :key="m" :value="m === CUSTOM ? CUSTOM : m">{{ m === CUSTOM ? '自定义…' : m }}</option>
          </select>
          <input v-if="isCustom('vision')" v-model="aiForm.visionModel" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="自定义模型名" />
        </div>
      </div>

      <!-- 文生图 + 文生视频 -->
      <div class="grid grid-cols-2 gap-4">
        <div v-if="hasImageModels()">
          <label class="text-sm text-cocoa-500">文生图模型</label>
          <select class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" :value="isCustom('image') ? CUSTOM : aiForm.imageModel" @change="onModelPick('image', ($event.target as HTMLSelectElement).value)">
            <option v-for="m in modelOptions('image')" :key="m" :value="m === CUSTOM ? CUSTOM : m">{{ m === CUSTOM ? '自定义…' : m }}</option>
          </select>
          <input v-if="isCustom('image')" v-model="aiForm.imageModel" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="自定义模型名" />
        </div>
        <div v-if="hasVideoModels()">
          <label class="text-sm text-cocoa-500">文生视频模型</label>
          <select class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" :value="isCustom('video') ? CUSTOM : aiForm.videoModel" @change="onModelPick('video', ($event.target as HTMLSelectElement).value)">
            <option v-for="m in modelOptions('video')" :key="m" :value="m === CUSTOM ? CUSTOM : m">{{ m === CUSTOM ? '自定义…' : m }}</option>
          </select>
          <input v-if="isCustom('video')" v-model="aiForm.videoModel" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="自定义模型名" />
        </div>
      </div>

      <!-- 温度 -->
      <div>
        <label class="text-sm text-cocoa-500">温度（{{ aiForm.temperature }}）</label>
        <div class="flex items-center gap-3 mt-1">
          <input v-model.number="aiForm.temperature" type="range" min="0" max="2" step="0.1" class="flex-1 accent-butter-500" />
          <input v-model.number="aiForm.temperature" type="number" step="0.1" min="0" max="2" class="w-20 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 text-sm" />
        </div>
      </div>

      <!-- AI 名字 -->
      <div>
        <label class="text-sm text-cocoa-500">AI 名字</label>
        <input v-model="aiForm.aiName" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="AI 名字" />
      </div>

      <!-- 系统提示词 -->
      <div>
        <label class="text-sm text-cocoa-500">系统提示词</label>
        <textarea v-model="aiForm.systemPrompt" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 min-h-[80px]" placeholder="系统提示词（描述 AI 角色与回答风格）" />
      </div>

      <!-- 场景模型覆盖 -->
      <div>
        <details class="group">
          <summary class="text-sm text-cocoa-500 cursor-pointer list-none flex items-center gap-1 select-none">
            <span class="transition-transform group-open:rotate-90">▶</span> 场景模型覆盖
          </summary>
          <div class="mt-2 space-y-2 pl-4">
            <div v-for="(label, key) in RESOURCE_SCENES" :key="key" class="flex items-center gap-3">
              <span class="text-sm text-cocoa-500 w-24 shrink-0">{{ label }}</span>
              <input v-model="aiForm.resourceModels[key]" class="flex-1 px-3 py-1.5 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 text-sm" :placeholder="'默认: ' + defaultModelName(key)" />
            </div>
          </div>
        </details>
        <div class="text-xs text-cocoa-400 mt-1">每个场景可单独指定模型名，不填则使用上方默认文本模型</div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between pt-2 border-t border-cream-200">
        <button class="text-sm text-cocoa-400 hover:text-cocoa-600 flex items-center gap-1" @click="resetAiDefaults">
          <RefreshCw class="w-3.5 h-3.5" /> 恢复默认
        </button>
        <button class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="saveAi">
          <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存 AI 配置' }}
        </button>
      </div>
    </div>

    <!-- ==================== 应用配置 ==================== -->
    <div v-else class="bg-white rounded-2xl p-6 shadow-softer max-w-4xl space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">主题</label>
          <select v-model="appForm.theme" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">当前学期</label>
          <select v-model="appForm.semester" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">未设置</option>
            <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end">
        <button class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="saveApp">
          <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
