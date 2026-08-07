<script setup lang="ts">
/**
 * 通用 AI 文本工具：单/多输入 → AI 生成文本 → 复制/保存。
 * 适用于翻译、教育论文、黑板报、演讲稿、评语、期末总结等 AI 驱动工具。
 */
import { ref, computed } from 'vue'
import { Sparkles, Save, Copy, FileText, Loader2, Download } from 'lucide-vue-next'
import { aiChatSync } from '@/api/teacher'
import request from '@/api/request'
import { downloadText } from '@/utils/download'
import { toast } from '@/utils/feedback'

const props = defineProps<{
  /** 工具标题 */
  title: string
  /** 输入字段定义 */
  fields: { key: string; label: string; placeholder?: string; type?: 'input' | 'textarea'; options?: string[] }[]
  /** 生成 prompt 的函数（接收表单对象） */
  buildPrompt: (form: Record<string, string>) => string
  /** 保存路径（可选，不传则不显示保存按钮） */
  savePath?: string
  /** 保存时的字段映射（将表单转为保存 payload） */
  buildSavePayload?: (form: Record<string, string>, result: string) => Record<string, any>
}>()

const form = ref<Record<string, string>>({})
const result = ref('')
const generating = ref(false)
const saving = ref(false)

async function generate() {
  const prompt = props.buildPrompt(form.value)
  if (!prompt.trim()) { toast.warning('请填写必要内容'); return }
  generating.value = true
  result.value = ''
  try {
    const res = await aiChatSync([{ role: 'user', content: prompt }])
    result.value = res?.content || '（无内容返回）'
  } catch (e: any) {
    result.value = `生成失败：${e?.message || '未知错误'}`
  } finally {
    generating.value = false
  }
}

async function saveResult() {
  if (!result.value || !props.savePath) return
  saving.value = true
  try {
    const payload = props.buildSavePayload
      ? props.buildSavePayload(form.value, result.value)
      : { title: props.title, content: result.value }
    await request.post(props.savePath, payload)
    toast.success('已保存')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value)
    toast.success('已复制')
  } catch {
    toast.error('复制失败，请手动选择')
  }
}

/** 下载生成结果为 Word 文档（.doc） */
function downloadResult() {
  if (!result.value) return
  const name = form.value.title || form.value.topic || props.title || 'AI生成内容'
  downloadText(result.value, name, 'doc')
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> {{ title }}
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="space-y-3">
        <div v-for="f in fields" :key="f.key">
          <label class="text-sm text-cocoa-500">{{ f.label }}</label>
          <select
            v-if="f.options"
            v-model="form[f.key]"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          >
            <option value="">请选择</option>
            <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <textarea
            v-else-if="f.type === 'textarea'"
            v-model="form[f.key]"
            :placeholder="f.placeholder"
            rows="4"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none"
          />
          <input
            v-else
            v-model="form[f.key]"
            :placeholder="f.placeholder"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button
          class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="generating"
          @click="generate"
        >
          <component :is="generating ? Loader2 : Sparkles" class="w-4 h-4" :class="generating ? 'animate-spin' : ''" />
          {{ generating ? '生成中…' : '生成' }}
        </button>
      </div>
    </div>

    <div v-if="result || generating" class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-cocoa-700">
          <FileText class="w-4 h-4" />
          <span class="text-sm font-medium">生成结果</span>
          <span v-if="generating" class="text-xs text-butter-500 animate-pulse">生成中…</span>
        </div>
        <div v-if="result && !generating" class="flex gap-2">
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="copyResult">
            <Copy class="w-3.5 h-3.5" /> 复制
          </button>
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky2-100 text-sky2-600 hover:bg-sky2-200" @click="downloadResult">
            <Download class="w-3.5 h-3.5" /> 下载
          </button>
          <button v-if="savePath" class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-60" :disabled="saving" @click="saveResult">
            <Save class="w-3.5 h-3.5" /> {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
      <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ result }}</div>
    </div>
  </div>
</template>
