<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { toast } from '@/utils/feedback'
import { Plus, Save, Trash2, Loader2, Star, Bot, RefreshCw } from 'lucide-vue-next'
import { listAiProviders } from '@/api/teacher'
import { createAiProvider, updateAiProvider, deleteAiProvider } from '@/api/admin'

interface Provider {
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

const list = ref<Provider[]>([])
const loading = ref(false)
const saving = ref(false)
const editing = ref<string | null>(null)
const form = reactive({
  code: '',
  name: '',
  baseUrl: '',
  textModelsText: '',
  visionModelsText: '',
  imageModelsText: '',
  videoModelsText: '',
  isDefault: false,
  enabled: true,
  sortOrder: 0,
})

function parseList(s: string): string[] {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean)
}

async function load() {
  loading.value = true
  try {
    list.value = await listAiProviders()
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startEdit(p: Provider) {
  editing.value = p.code
  form.code = p.code
  form.name = p.name
  form.baseUrl = p.baseUrl
  form.textModelsText = p.textModels.join(', ')
  form.visionModelsText = p.visionModels.join(', ')
  form.imageModelsText = p.imageModels.join(', ')
  form.videoModelsText = p.videoModels.join(', ')
  form.isDefault = p.isDefault
  form.enabled = p.enabled
  form.sortOrder = p.sortOrder
}

function startAdd() {
  editing.value = null
  form.code = ''
  form.name = ''
  form.baseUrl = ''
  form.textModelsText = ''
  form.visionModelsText = ''
  form.imageModelsText = ''
  form.videoModelsText = ''
  form.isDefault = false
  form.enabled = true
  form.sortOrder = list.value.length
}

async function save() {
  if (!form.name || !form.baseUrl) return toast.warning('名称与接口地址必填')
  saving.value = true
  try {
    const body = {
      code: editing.value || form.code || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: form.name,
      baseUrl: form.baseUrl,
      textModels: parseList(form.textModelsText),
      visionModels: parseList(form.visionModelsText),
      imageModels: parseList(form.imageModelsText),
      videoModels: parseList(form.videoModelsText),
      isDefault: form.isDefault,
      enabled: form.enabled,
      sortOrder: form.sortOrder,
    }
    if (editing.value) {
      await updateAiProvider(editing.value, body)
    } else {
      await createAiProvider(body)
    }
    editing.value = null
    await load()
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(p: Provider) {
  if (!await confirm(`确认删除「${p.name}」吗？此操作不可恢复。`)) return
  try {
    await deleteAiProvider(p.code)
    await load()
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}

async function setDefault(p: Provider) {
  try {
    await updateAiProvider(p.code, { isDefault: true })
    await load()
  } catch (e: any) {
    toast.error(e?.message || '设置失败')
  }
}

function cancel() {
  editing.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Bot class="w-6 h-6 text-butter-500" /> AI 服务商管理
      </h1>
      <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="startAdd">
        <Plus class="w-4 h-4" /> 新增服务商
      </button>
    </div>

    <div class="text-xs text-cocoa-500 bg-butter-50 rounded-lg px-4 py-2">
      ⚠️ 管理员统一维护服务商清单（名称、接口地址、模型列表）。API Key 由各教师在个人设置中自行录入，平台不会收集或存储。
    </div>

    <!-- 编辑表单 -->
    <div v-if="editing !== null || editing === null && form.code === '' && form.name === '' && list.length >= 0" class="bg-surface rounded-2xl shadow-softer p-6 space-y-4">
      <h2 class="font-semibold text-cocoa-900">{{ editing ? '编辑服务商' : '新增服务商' }}</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">名称</label>
          <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如 OpenAI" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">接口地址</label>
          <input v-model="form.baseUrl" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-cocoa-500">文本模型（逗号分隔）</label>
          <input v-model="form.textModelsText" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="gpt-4o, gpt-4o-mini" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-cocoa-500">多模态模型（逗号分隔）</label>
          <input v-model="form.visionModelsText" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="gpt-4o" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-cocoa-500">文生图模型（逗号分隔，可空）</label>
          <input v-model="form.imageModelsText" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="dall-e-3" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-cocoa-500">文生视频模型（逗号分隔，可空）</label>
          <input v-model="form.videoModelsText" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="sora" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">排序</label>
          <input v-model.number="form.sortOrder" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-cocoa-700"><input v-model="form.isDefault" type="checkbox" /> 默认</label>
          <label class="flex items-center gap-2 text-sm text-cocoa-700"><input v-model="form.enabled" type="checkbox" /> 启用</label>
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button v-if="editing" class="px-4 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="cancel">取消</button>
        <button class="px-4 py-2 rounded-xl bg-butter-500 text-white text-sm hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="save">
          <Save class="w-4 h-4 inline mr-1" /> {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center text-cocoa-400 py-8"><Loader2 class="w-5 h-5 animate-spin inline mr-2" /> 加载中…</div>

    <div v-else class="bg-surface rounded-2xl shadow-softer divide-y divide-cream-100">
      <div v-for="p in list" :key="p.code" class="p-4 flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-cocoa-900">{{ p.name }}</span>
            <span v-if="p.isDefault" class="text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Star class="w-3 h-3" /> 默认</span>
            <span v-if="!p.enabled" class="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">已禁用</span>
          </div>
          <div class="text-xs text-cocoa-400 mt-1">{{ p.baseUrl }}</div>
          <div class="text-xs text-cocoa-500 mt-1">
            <span v-if="p.textModels.length">文本：{{ p.textModels.join(', ') }}</span>
            <span v-if="p.visionModels.length" class="ml-2">多模态：{{ p.visionModels.join(', ') }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button v-if="!p.isDefault && p.enabled" class="text-xs text-mint-600 hover:text-mint-800 flex items-center gap-1" @click="setDefault(p)"><Star class="w-3 h-3" /> 设为默认</button>
          <button class="text-xs text-butter-600 hover:text-butter-800 flex items-center gap-1" @click="startEdit(p)"><Save class="w-3 h-3" /> 编辑</button>
          <button class="text-xs text-red-500 hover:text-red-700 flex items-center gap-1" @click="remove(p)"><Trash2 class="w-3 h-3" /> 删除</button>
        </div>
      </div>
      <div v-if="!list.length" class="p-6 text-center text-cocoa-400 text-sm">暂无服务商</div>
    </div>
  </div>
</template>
