<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { toast } from '@/utils/feedback'
import { Settings, Save, Loader2, Bot, MessageCircle, Boxes, RefreshCw, Plus, X, Check } from 'lucide-vue-next'
import request from '@/api/request'

interface ConfigItem { key: string; value: string }
interface ConfigResp { items?: ConfigItem[]; [k: string]: any }

// ==================== 服务商预设（与小程序 config.vue 对齐） ====================
const PROVIDER_PRESETS: Record<string, {
  baseUrl: string
  textModels: string[]
  visionModels: string[]
  imageModels: string[]
  videoModels: string[]
}> = {
  '阿里百炼（通义千问）': {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    imageModels: [],
    videoModels: [],
  },
  DeepSeek: {
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
    imageModels: ['GLM-4.6V-Flash'],
    videoModels: ['CogVideoX-Flash'],
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

const RESOURCE_MAP: Record<string, string> = {
  'exam-analysis': '考试分析',
  'student-diagnose': '学生诊断',
  'parse': 'AI 解析',
}

function detectProvider(baseUrl?: string): string {
  if (baseUrl) {
    if (baseUrl.includes('dashscope.aliyuncs.com') || baseUrl.includes('maas.aliyuncs.com')) return '阿里百炼（通义千问）'
    if (baseUrl.includes('api.deepseek.com')) return 'DeepSeek'
    if (baseUrl.includes('open.bigmodel.cn')) return '智谱GLM'
  }
  return '自定义'
}

// ==================== 状态 ====================
const loading = ref(false)
const saving = ref(false)
const loadingModels = ref(false)
const modelSource = ref<'live' | 'fallback' | ''>('')

/** 服务商（UI 态，由 baseUrl 推导，不入库） */
const providerName = ref<string>('阿里百炼（通义千问）')

/** 实时/回退的模型列表 */
const models = reactive<Record<'text' | 'vision' | 'image' | 'video', string[]>>({
  text: [],
  vision: [],
  image: [],
  video: [],
})

/** 表单字段 */
const form = reactive({
  aiProvider: '阿里百炼（通义千问）',
  aiBaseUrl: '',
  aiApiKey: '',
  aiTextModel: '',
  aiVisionModel: '',
  aiImageModel: '',
  aiVideoModel: '',
  aiTemperature: '0.7',
  aiName: '小林子',
  aiSystemPrompt: '',
  aiResourceModels: '{}',
  wxAppId: '',
  wxAppSecret: '',
  wxSubscribeMsgTemplateId: '',
  imSdkAppId: '',
  imSecretKey: '',
  defaultSubjects: '',
  jwtExpiresIn: '',
})

/** 密钥类字段：GET 返回脱敏值（含 ****），未手动修改则不回写，避免清空真实密钥 */
const SECRET_KEYS = ['aiApiKey', 'wxAppSecret', 'imSecretKey'] as const
const secretMasked = reactive<Record<string, boolean>>({})

const keyMap: Record<string, string> = {
  aiBaseUrl: 'aiBaseUrl',
  aiApiKey: 'aiApiKey',
  aiTextModel: 'aiTextModel',
  aiVisionModel: 'aiVisionModel',
  aiImageModel: 'aiImageModel',
  aiVideoModel: 'aiVideoModel',
  aiTemperature: 'aiTemperature',
  aiName: 'aiName',
  aiSystemPrompt: 'aiSystemPrompt',
  aiResourceModels: 'aiResourceModels',
  wxAppId: 'wxAppId',
  wxAppSecret: 'wxAppSecret',
  wxSubscribeMsgTemplateId: 'wxSubscribeMsgTemplateId',
  imSdkAppId: 'imSdkAppId',
  imSecretKey: 'imSecretKey',
  defaultSubjects: 'defaultSubjects',
  jwtExpiresIn: 'jwtExpiresIn',
}

// ==================== 模型下拉辅助 ====================
const CUSTOM = '__custom__'
function modelField(kind: 'text' | 'vision' | 'image' | 'video'): string {
  return { text: 'aiTextModel', vision: 'aiVisionModel', image: 'aiImageModel', video: 'aiVideoModel' }[kind]
}
function modelOptions(kind: 'text' | 'vision' | 'image' | 'video'): string[] {
  return [...models[kind], CUSTOM]
}
function isCustom(kind: 'text' | 'vision' | 'image' | 'video'): boolean {
  const v = (form as any)[modelField(kind)] as string
  return !v || !models[kind].includes(v)
}
function onModelPick(kind: 'text' | 'vision' | 'image' | 'video', e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (val !== CUSTOM) (form as any)[modelField(kind)] = val
}
function hasImageModels() { return models.image.length > 0 }
function hasVideoModels() { return models.video.length > 0 }

// ==================== 服务商切换 ====================
function applyProvider(name: string) {
  providerName.value = name
  form.aiProvider = name
  const preset = PROVIDER_PRESETS[name]
  if (preset.baseUrl) form.aiBaseUrl = preset.baseUrl
  if (preset.textModels.length && !form.aiTextModel) form.aiTextModel = preset.textModels[0]
  if (preset.visionModels.length && !form.aiVisionModel) form.aiVisionModel = preset.visionModels[0]
  if (preset.imageModels.length && !form.aiImageModel) form.aiImageModel = preset.imageModels[0]
  if (preset.videoModels.length && !form.aiVideoModel) form.aiVideoModel = preset.videoModels[0]
  refreshModels()
}

// ==================== 实时查询模型列表 ====================
async function refreshModels() {
  loadingModels.value = true
  try {
    const res = await request.post<any, any>('/config/ai/models', {
      provider: providerName.value,
      baseUrl: form.aiBaseUrl,
      apiKey: form.aiApiKey,
    })
    models.text = res?.textModels || []
    models.vision = res?.visionModels || []
    models.image = res?.imageModels || []
    models.video = res?.videoModels || []
    modelSource.value = res?.source || 'fallback'
  } catch {
    // 接口不可达：本地回退到预设默认，保证下拉可用
    const p = PROVIDER_PRESETS[providerName.value] || PROVIDER_PRESETS['自定义']
    models.text = p.textModels
    models.vision = p.visionModels
    models.image = p.imageModels
    models.video = p.videoModels
    modelSource.value = 'fallback'
  } finally {
    loadingModels.value = false
  }
}

// baseUrl 变化自动重新查询（防抖）
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(() => form.aiBaseUrl, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => refreshModels(), 600)
})

// ==================== 加载 / 保存 ====================
async function load() {
  loading.value = true
  try {
    const res = await request.get<unknown, ConfigResp>('/config/app')
    const items: ConfigItem[] = (res?.items || []).filter(Boolean)
    const map: Record<string, string> = {}
    for (const it of items) {
      if (it && it.key) map[it.key] = it.value ?? ''
    }
    for (const k of Object.keys(keyMap)) {
      const cfgKey = keyMap[k]
      const v = map[cfgKey]
      if (v === undefined) continue
      // 密钥类：脱敏值不填入输入框，避免误清
      if ((SECRET_KEYS as readonly string[]).includes(k)) {
        if (v.includes('****')) {
          secretMasked[k] = true
          ;(form as any)[k] = ''
          continue
        }
      }
      ;(form as any)[k] = v
    }
    // 学科默认全选（首次加载或后端未配置时，默认勾选全部预设学科）
    if (!form.defaultSubjects || !form.defaultSubjects.trim()) {
      form.defaultSubjects = ALL_PRESET_SUBJECTS.join(',')
    }
    // 推导服务商
    providerName.value = detectProvider(form.aiBaseUrl)
    form.aiProvider = providerName.value
    await refreshModels()
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  saving.value = true
  try {
    const items: ConfigItem[] = []
    for (const k of Object.keys(keyMap)) {
      // 密钥未被手动修改且为脱敏态：跳过，保留后端原值
      if ((SECRET_KEYS as readonly string[]).includes(k) && secretMasked[k]) {
        if (!(form as any)[k]) continue
      }
      items.push({ key: keyMap[k], value: (form as any)[k] ?? '' })
    }
    await request.put('/config/app', { items })
    // 保存后把已填写的密钥标记为已修改（不再视为脱敏跳过）
    for (const k of SECRET_KEYS) if ((form as any)[k]) secretMasked[k] = false
    toast.success('保存成功')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400'
const labelCls = 'text-sm text-cocoa-500'
const sourceBadge = computed(() =>
  modelSource.value === 'live'
    ? { text: '实时', cls: 'bg-green-100 text-green-700' }
    : modelSource.value === 'fallback'
    ? { text: '默认（接口不可达）', cls: 'bg-amber-100 text-amber-700' }
    : { text: '', cls: '' },
)

// ==================== 学科管理（小学/初中/高中预设 + 自定义添加） ====================
const SUBJECT_STAGES: Record<string, string[]> = {
  '小学': ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术', '综合实践', '劳动', '书法', '心理健康'],
  '初中': ['语文', '数学', '英语', '物理', '化学', '生物', '道德与法治', '历史', '地理', '音乐', '美术', '体育', '信息技术', '综合实践'],
  '高中': ['语文', '数学', '英语', '物理', '化学', '生物', '思想政治', '历史', '地理', '通用技术', '信息技术', '音乐', '美术', '体育', '心理健康'],
}
const ALL_PRESET_SUBJECTS = [...new Set(Object.values(SUBJECT_STAGES).flat())]

const selectedSubjects = computed<string[]>(() => {
  const raw = form.defaultSubjects || ''
  if (!raw.trim()) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
})

const customSubjects = computed<string[]>(() =>
  selectedSubjects.value.filter(s => !ALL_PRESET_SUBJECTS.includes(s)),
)

function isSubjectSelected(name: string): boolean {
  return selectedSubjects.value.includes(name)
}

function toggleSubject(name: string) {
  const list = new Set(selectedSubjects.value)
  if (list.has(name)) list.delete(name)
  else list.add(name)
  form.defaultSubjects = [...list].join(',')
}

function toggleStage(stage: string) {
  const stageSubjects = SUBJECT_STAGES[stage]
  const allSelected = stageSubjects.every(s => isSubjectSelected(s))
  const list = new Set(selectedSubjects.value)
  if (allSelected) {
    stageSubjects.forEach(s => list.delete(s))
  } else {
    stageSubjects.forEach(s => list.add(s))
  }
  form.defaultSubjects = [...list].join(',')
}

function isStageAllSelected(stage: string): boolean {
  return SUBJECT_STAGES[stage].every(s => isSubjectSelected(s))
}

function isAllSelected(): boolean {
  return ALL_PRESET_SUBJECTS.every(s => isSubjectSelected(s))
}

function selectAllSubjects() {
  form.defaultSubjects = ALL_PRESET_SUBJECTS.join(',')
}

const newCustomSubject = ref('')
function addCustomSubject() {
  const name = newCustomSubject.value.trim()
  if (!name) return
  if (ALL_PRESET_SUBJECTS.includes(name) || selectedSubjects.value.includes(name)) {
    toast.warning('该学科已存在')
    return
  }
  const list = new Set(selectedSubjects.value)
  list.add(name)
  form.defaultSubjects = [...list].join(',')
  newCustomSubject.value = ''
}

function removeCustomSubject(name: string) {
  const list = new Set(selectedSubjects.value)
  list.delete(name)
  form.defaultSubjects = [...list].join(',')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Settings class="w-6 h-6 text-butter-500" /> 平台配置
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
        :disabled="saving || loading"
        @click="save"
      >
        <Save class="w-4 h-4" />
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </div>

    <div v-if="loading" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-400">
      <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
    </div>

    <template v-else>
      <form @submit.prevent="save" novalidate>
        <!-- AI 配置 -->
      <div class="bg-surface rounded-2xl shadow-softer p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Bot class="w-5 h-5 text-butter-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">AI 配置</h2>
          </div>
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50 disabled:opacity-60"
            :disabled="loadingModels"
            @click="refreshModels"
          >
            <RefreshCw class="w-4 h-4" :class="loadingModels ? 'animate-spin' : ''" />
            {{ loadingModels ? '查询中…' : '刷新模型列表' }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">服务商</label>
            <select v-model="form.aiProvider" :class="inputCls" class="mt-1" @change="applyProvider(form.aiProvider)">
              <option v-for="n in PROVIDER_NAMES" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div>
            <label :class="labelCls">接口地址</label>
            <input v-model="form.aiBaseUrl" :class="inputCls" class="mt-1" placeholder="如 https://dashscope.aliyuncs.com/compatible-mode/v1" />
          </div>
          <div class="col-span-2">
            <label :class="labelCls">API Key</label>
            <input v-model="form.aiApiKey" type="password" :class="inputCls" class="mt-1" placeholder="留空则不修改已保存的密钥" autocomplete="off" />
          </div>

          <!-- 模型列表来源徽标 -->
          <div class="col-span-2 flex items-center gap-2" v-if="sourceBadge.text">
            <span class="text-xs px-2 py-0.5 rounded-full" :class="sourceBadge.cls">{{ sourceBadge.text }}</span>
            <span class="text-xs text-cocoa-400">模型列表由服务商 /models 接口实时查询，失败则回退默认预设</span>
          </div>

          <!-- 文本模型 -->
          <div>
            <label :class="labelCls">文本模型</label>
            <select :value="isCustom('text') ? CUSTOM : form.aiTextModel" :class="inputCls" class="mt-1" @change="onModelPick('text', $event)">
              <option v-for="o in modelOptions('text')" :key="o" :value="o">{{ o === CUSTOM ? '自定义' : o }}</option>
            </select>
            <input v-if="isCustom('text')" v-model="form.aiTextModel" :class="inputCls" class="mt-2" placeholder="输入模型名，如 qwen-plus" />
          </div>
          <!-- 多模态模型 -->
          <div>
            <label :class="labelCls">多模态模型</label>
            <select :value="isCustom('vision') ? CUSTOM : form.aiVisionModel" :class="inputCls" class="mt-1" @change="onModelPick('vision', $event)">
              <option v-for="o in modelOptions('vision')" :key="o" :value="o">{{ o === CUSTOM ? '自定义' : o }}</option>
            </select>
            <input v-if="isCustom('vision')" v-model="form.aiVisionModel" :class="inputCls" class="mt-2" placeholder="自定义模型名称" />
          </div>
          <!-- 文生图模型 -->
          <div v-if="hasImageModels()">
            <label :class="labelCls">文生图模型</label>
            <select :value="isCustom('image') ? CUSTOM : form.aiImageModel" :class="inputCls" class="mt-1" @change="onModelPick('image', $event)">
              <option v-for="o in modelOptions('image')" :key="o" :value="o">{{ o === CUSTOM ? '自定义' : o }}</option>
            </select>
            <input v-if="isCustom('image')" v-model="form.aiImageModel" :class="inputCls" class="mt-2" placeholder="自定义模型名称" />
          </div>
          <!-- 文生视频模型 -->
          <div v-if="hasVideoModels()">
            <label :class="labelCls">文生视频模型</label>
            <select :value="isCustom('video') ? CUSTOM : form.aiVideoModel" :class="inputCls" class="mt-1" @change="onModelPick('video', $event)">
              <option v-for="o in modelOptions('video')" :key="o" :value="o">{{ o === CUSTOM ? '自定义' : o }}</option>
            </select>
            <input v-if="isCustom('video')" v-model="form.aiVideoModel" :class="inputCls" class="mt-2" placeholder="自定义模型名称" />
          </div>

          <!-- 温度 / 名字 -->
          <div>
            <label :class="labelCls">温度（0–2）</label>
            <input v-model="form.aiTemperature" :class="inputCls" class="mt-1" placeholder="0.7" />
          </div>
          <div>
            <label :class="labelCls">AI 名字</label>
            <input v-model="form.aiName" :class="inputCls" class="mt-1" placeholder="小林子" />
          </div>
          <div class="col-span-2">
            <label :class="labelCls">系统提示词</label>
            <textarea v-model="form.aiSystemPrompt" :class="inputCls" class="mt-1 min-h-[100px]" placeholder="系统提示词（描述 AI 角色与回答风格）" />
          </div>

          <!-- 场景模型覆盖 -->
          <div class="col-span-2 border-t border-cream-100 pt-4">
            <p class="text-sm font-medium text-cocoa-700 mb-2">场景模型覆盖（留空则使用上方默认文本模型）</p>
            <div class="grid grid-cols-1 gap-3" v-for="(label, key) in RESOURCE_MAP" :key="key">
              <div class="flex items-center gap-3">
                <span class="text-sm text-cocoa-500 w-24 shrink-0">{{ label }}</span>
                <input
                  :value="(JSON.parse(form.aiResourceModels || '{}'))[key] || ''"
                  @input="(e) => {
                    const obj = JSON.parse(form.aiResourceModels || '{}')
                    obj[key] = (e.target as HTMLInputElement).value
                    form.aiResourceModels = JSON.stringify(obj)
                  }"
                  :class="inputCls" placeholder="如 qwen-max"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 微信配置 -->
      <div class="bg-surface rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <MessageCircle class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">微信配置</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">小程序 AppId</label>
            <input v-model="form.wxAppId" :class="inputCls" class="mt-1" placeholder="wx..." />
          </div>
          <div>
            <label :class="labelCls">小程序 AppSecret</label>
            <input v-model="form.wxAppSecret" type="password" :class="inputCls" class="mt-1" placeholder="留空则不修改" autocomplete="off" />
          </div>
          <div class="col-span-2">
            <label :class="labelCls">订阅消息模板 ID</label>
            <input v-model="form.wxSubscribeMsgTemplateId" :class="inputCls" class="mt-1" placeholder="订阅消息模板 ID" />
          </div>
        </div>
      </div>

      <!-- IM 配置 -->
      <div class="bg-surface rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <MessageCircle class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">IM 配置</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">IM SDK AppId</label>
            <input v-model="form.imSdkAppId" :class="inputCls" class="mt-1" placeholder="IM SDK AppId" />
          </div>
          <div>
            <label :class="labelCls">IM SecretKey</label>
            <input v-model="form.imSecretKey" type="password" :class="inputCls" class="mt-1" placeholder="留空则不修改" autocomplete="off" />
          </div>
        </div>
      </div>

      <!-- 其他 -->
      <div class="bg-surface rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <Boxes class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">其他</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label :class="labelCls">默认学科（勾选启用，默认全选）</label>
              <button
                type="button"
                class="text-xs text-butter-600 hover:text-butter-700 underline"
                @click="selectAllSubjects"
                v-if="!isAllSelected()"
              >全选</button>
            </div>
            <!-- 按学段分组的学科勾选网格 -->
            <div class="space-y-3 mt-1">
              <div v-for="(subjects, stage) in SUBJECT_STAGES" :key="stage" class="border border-cream-200 rounded-xl p-3">
                <div class="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    class="flex items-center gap-2 text-sm font-medium text-cocoa-700 hover:text-cocoa-900"
                    @click="toggleStage(stage as string)"
                  >
                    <span
                      class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
                      :class="isStageAllSelected(stage as string) ? 'bg-butter-500 border-butter-500 text-white' : 'border-cream-300 bg-surface'"
                    >
                      <Check v-if="isStageAllSelected(stage as string)" class="w-3.5 h-3.5" />
                    </span>
                    {{ stage }}
                  </button>
                  <span class="text-xs text-cocoa-400">{{ subjects.filter(s => isSubjectSelected(s)).length }}/{{ subjects.length }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="subj in subjects"
                    :key="subj"
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-sm transition-all border"
                    :class="isSubjectSelected(subj)
                      ? 'bg-butter-100 border-butter-300 text-butter-700 font-medium'
                      : 'bg-surface border-cream-200 text-cocoa-400 hover:border-cream-300'"
                    @click="toggleSubject(subj)"
                  >
                    {{ subj }}
                  </button>
                </div>
              </div>
            </div>
            <!-- 自定义学科 -->
            <div class="mt-3 border border-dashed border-cream-300 rounded-xl p-3">
              <div class="text-sm font-medium text-cocoa-700 mb-2">自定义学科</div>
              <div v-if="customSubjects.length" class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="cs in customSubjects"
                  :key="cs"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-mint-100 border border-mint-300 text-mint-700 font-medium"
                >
                  {{ cs }}
                  <button type="button" class="text-mint-500 hover:text-rose-500" @click="removeCustomSubject(cs)">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newCustomSubject"
                  class="flex-1 px-3 py-1.5 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-butter-400"
                  placeholder="输入自定义学科名称"
                  @keydown.enter.prevent="addCustomSubject"
                />
                <button
                  type="button"
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
                  :disabled="!newCustomSubject.trim()"
                  @click="addCustomSubject"
                >
                  <Plus class="w-4 h-4" /> 添加
                </button>
              </div>
            </div>
            <p class="text-xs text-cocoa-400 mt-2">已选 {{ selectedSubjects.length }} 个学科：{{ selectedSubjects.join('、') || '无' }}</p>
          </div>
          <div>
            <label :class="labelCls">JWT 过期时间</label>
            <input v-model="form.jwtExpiresIn" :class="inputCls" class="mt-1" placeholder="如 7d" />
          </div>
        </div>
      </div>
      </form>
    </template>
  </div>
</template>
