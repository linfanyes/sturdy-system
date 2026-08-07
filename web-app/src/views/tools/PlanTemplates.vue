<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Copy, Edit3, Trash2, FileText } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'

const router = useRouter()

interface Template {
  id: string
  name: string
  content: string
}

const STORAGE_KEY = 'web_plan_templates'
const list = ref<Template[]>([])
const editing = ref(false)
const draft = ref<{ id: string; name: string; content: string }>({ id: '', name: '', content: '' })

function load() {
  try {
    list.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { list.value = [] }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function startAdd() {
  draft.value = { id: '', name: '', content: '' }
  editing.value = true
}

function editItem(t: Template) {
  draft.value = { ...t }
  editing.value = true
}

function save() {
  if (!draft.value.name.trim()) return
  if (draft.value.id) {
    const idx = list.value.findIndex((i) => i.id === draft.value.id)
    if (idx >= 0) list.value[idx] = { ...draft.value }
  } else {
    list.value.unshift({ ...draft.value, id: uid() })
  }
  persist()
  editing.value = false
}

async function remove(t: Template) {
  if (!await confirm(`确认删除「${t.name}」？`)) return
  list.value = list.value.filter((i) => i.id !== t.id)
  persist()
}

async function copyContent(t: Template) {
  try {
    await navigator.clipboard.writeText(t.content)
    toast.success('已复制到剪贴板')
  } catch { toast.error('复制失败，请手动复制') }
}

load()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/tools')">
      <ArrowLeft class="w-4 h-4" /> 返回工具箱
    </button>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <FileText class="w-6 h-6 text-butter-500" /> 文案模板
      </h1>
      <button v-if="!editing" class="flex items-center gap-1 px-4 py-2 bg-butter-500 text-white rounded-xl text-sm hover:bg-butter-600" @click="startAdd">
        <Plus class="w-4 h-4" /> 新增
      </button>
    </div>

    <p class="text-cocoa-400 text-xs">本地保存，不上云</p>

    <!-- 编辑表单 -->
    <div v-if="editing" class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
      <input v-model="draft.name" placeholder="模板名称" class="w-full px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300" />
      <textarea v-model="draft.content" placeholder="模板内容" rows="6" class="w-full px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300 resize-y"></textarea>
      <div class="flex gap-2">
        <button class="px-4 py-2 bg-butter-500 text-white rounded-lg text-sm hover:bg-butter-600" :disabled="!draft.name.trim()" @click="save">保存</button>
        <button class="px-4 py-2 bg-cream-100 text-cocoa-600 rounded-lg text-sm border border-cocoa-200 hover:bg-cream-200" @click="editing = false">取消</button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="!editing" class="space-y-3">
      <div v-if="list.length === 0" class="text-center py-12 text-cocoa-400 bg-surface rounded-2xl shadow-softer">
        <FileText class="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>暂无文案模板</p>
        <p class="text-xs mt-1">点击「新增」添加模板</p>
      </div>

      <div v-for="t in list" :key="t.id" class="bg-surface rounded-2xl p-4 shadow-softer space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-cocoa-800">{{ t.name }}</h3>
          <div class="flex gap-1">
            <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-400 hover:text-cocoa-600" title="复制" @click="copyContent(t)"><Copy class="w-4 h-4" /></button>
            <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-400 hover:text-cocoa-600" title="编辑" @click="editItem(t)"><Edit3 class="w-4 h-4" /></button>
            <button class="p-1.5 rounded-lg hover:bg-cream-100 text-red-400 hover:text-red-600" title="删除" @click="remove(t)"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <p class="text-sm text-cocoa-600 whitespace-pre-wrap line-clamp-4">{{ t.content }}</p>
      </div>
    </div>
  </div>
</template>
