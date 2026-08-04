<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Save, Bot, RefreshCw, Loader2 } from 'lucide-vue-next'
import request from '@/api/request'
import { ROLE_PROMPTS, DEFAULT_TEACHER_PROMPT } from '@/constants/teacher-prompts'

const loading = ref(false)
const saving = ref(false)

// ==================== 服务商（从后端 ai_providers 表加载，校管只能选择，不能新增） ====================
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
    providers.value = (await request.get('/config/ai-providers')).items || []
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

// ==================== 校管 AI 配置表单（后端按校管角色隔离存储） ====================
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
// 监听 baseUrl 变化时（手动输入自定义地址）刷新模型列表
const onBaseUrlInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => refreshModels(), 600)
}

// ==================== 加载配置（校管个人配置，无则回退平台默认） ====================
async function load() {
  loading.value = true
  try {
    await loadProviders()
    const res = await request.get('/config/ai-settings').catch(() => null)
    if (res) {
      Object.assign(aiForm, res)
      if (res.providerCode) {
        const p = getProviderByCode(res.providerCode)
        aiForm.provider = p?.name || detectProvider(aiForm.baseUrl)
        aiForm._providerCode = res.providerCode
      } else if (res.baseUrl) {
        aiForm.provider = detectProvider(res.baseUrl)
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
    if (!aiForm.systemPrompt) {
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

/** 恢复平台默认：清空自定义，重新加载默认配置（不立即保存） */
async function resetAiDefaults() {
  if (!await confirm('恢复默认将丢弃你的自定义 AI 配置，确定吗？')) return
  saving.value = true
  try {
    const res = await request.get('/config/ai-settings').catch(() => null)
    // 清空本地自定义：以平台默认重新填充（apiKey 留空，需自行填写）
    aiForm.apiKey = ''
    if (res && res.providerCode) {
      const p = getProviderByCode(res.providerCode)
      aiForm._providerCode = res.providerCode
      aiForm.provider = p?.name || detectProvider(res.baseUrl || aiForm.baseUrl)
    } else {
      aiForm._providerCode = providers.value[0]?.code || ''
      aiForm.provider = PROVIDER_NAMES.value[0] || ''
    }
    const p = getProviderByName(aiForm.provider)
    aiForm.baseUrl = p?.baseUrl || res?.baseUrl || ''
    aiForm.textModel = p?.textModels?.[0] || res?.textModel || ''
    aiForm.visionModel = p?.visionModels?.[0] || res?.visionModel || ''
    aiForm.imageModel = p?.imageModels?.[0] || res?.imageModel || ''
    aiForm.videoModel = p?.videoModels?.[0] || res?.videoModel || ''
    aiForm.temperature = 0.7
    aiForm.aiName = '小林子'
    aiForm.systemPrompt = DEFAULT_TEACHER_PROMPT
    aiForm.resourceModels = {}
    refreshModels()
    alert('已恢复平台默认配置，请点击「保存」以生效')
  } catch (e: any) {
    alert(e?.message || '加载默认配置失败')
  } finally {
    saving.value = false
  }
}

function resourceKeyLabel(key: string) { return RESOURCE_SCENES[key] || key }
function defaultModelName(key: string) { return aiForm.textModel || '默认文本模型' }

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">AI 配置</h1>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 flex items-center gap-2">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中…
    </div>

    <div v-else class="bg-white rounded-2xl p-6 shadow-softer max-w-4xl space-y-4">
      <div class="text-xs text-butter-600 bg-butter-100/50 rounded-lg px-3 py-2">
        ⚠️ 校管 AI 配置：从超级管理员预先配置的 AI 服务商中选择，并填写你自己的 API Key。
        仅校管本账号使用，不影响教师配置；非超管不可新增服务商。默认继承平台默认配置，可在此按需自定义。
      </div>

      <!-- 服务商 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">服务商（由超管配置，仅可选择）</label>
          <select v-model="aiForm.provider" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" @change="onProviderChange">
            <option v-for="p in PROVIDER_NAMES" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">接口地址</label>
          <input v-model="aiForm.baseUrl" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="AI 接口地址（切换服务商自动填充，可手动改）" @input="onBaseUrlInput" />
        </div>
      </div>

      <!-- API Key -->
      <div>
        <label class="text-sm text-cocoa-500">API Key</label>
        <input v-model="aiForm.apiKey" type="password" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="sk-...（仅保存在你自己的账号下）" />
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
  </div>
</template>
