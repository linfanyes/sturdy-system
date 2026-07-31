<script setup lang="ts">
/**
 * 通用 AI 生成器：教案 / 知识点 / 试卷
 * 通过路由 prop type 区分，调用 /ai/chat-sync 同步生成
 * 生成结果保存到对应的 generated/* 表
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/api/request'
import { Sparkles, Save, Copy, FileText, Download } from 'lucide-vue-next'
import { downloadDoc } from '@/utils/download'

const props = defineProps<{
  /** 'lesson' | 'knowledge' | 'paper' */
  type: 'lesson' | 'knowledge' | 'paper'
}>()

const route = useRoute()

const TYPE_CONFIG = {
  lesson: {
    title: '优质教案生成',
    savePath: 'generated/lesson-plans',
    prompt: (input: string) => `请为以下内容生成一份完整的小学教案，包含教学目标、教学重难点、教学准备、教学过程、板书设计、作业布置等部分：\n${input}`,
    fields: [
      { key: 'subject', label: '学科', placeholder: '如：语文' },
      { key: 'grade', label: '年级', placeholder: '如：三年级' },
      { key: 'topic', label: '课题', placeholder: '如：荷花' },
    ],
  },
  knowledge: {
    title: '知识点生成',
    savePath: 'generated/knowledges',
    prompt: (input: string) => `请为以下内容生成详细的知识点解析，包含知识结构、重点讲解、易错点、典型例题、拓展知识等：\n${input}`,
    fields: [
      { key: 'subject', label: '学科', placeholder: '如：数学' },
      { key: 'grade', label: '年级', placeholder: '如：五年级' },
      { key: 'topic', label: '知识点', placeholder: '如：分数加减法' },
    ],
  },
  paper: {
    title: '优选试卷生成',
    savePath: 'generated/papers',
    prompt: (input: string) => `请为以下内容生成一份完整试卷，包含听力/选择题/填空题/判断题/解答题等题型，附参考答案与评分标准：\n${input}`,
    fields: [
      { key: 'subject', label: '学科', placeholder: '如：英语' },
      { key: 'grade', label: '年级', placeholder: '如：六年级' },
      { key: 'topic', label: '单元/范围', placeholder: '如：Unit 1-3' },
    ],
  },
} as const

const cfg = computed(() => TYPE_CONFIG[props.type])
const form = ref<Record<string, string>>({})
const result = ref('')
const generating = ref(false)
const saving = ref(false)

watch(() => props.type, () => { result.value = ''; form.value = {} }, { immediate: true })

async function generate() {
  const input = cfg.value.fields.map(f => `${f.label}：${form.value[f.key] || ''}`).join('\n')
  if (!input.trim()) { alert('请填写至少一项内容'); return }
  generating.value = true
  result.value = ''
  try {
    const res = await request.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: cfg.value.prompt(input) }],
    })
    result.value = res?.content || '（无内容返回）'
  } catch (e: any) {
    result.value = `生成失败：${e?.message || '未知错误'}`
  } finally {
    generating.value = false
  }
}

async function saveResult() {
  if (!result.value) return
  saving.value = true
  try {
    await request.post(cfg.value.savePath, {
      title: cfg.value.fields.map(f => form.value[f.key]).filter(Boolean).join('-') || cfg.value.title,
      subject: form.value.subject || '',
      grade: form.value.grade || '',
      topic: form.value.topic || '',
      content: result.value,
    })
    alert('已保存到历史记录')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败，请手动选择文本')
  }
}

/** 下载生成结果为 Word 文档（.doc），含学科/年级/课题表头 */
function downloadResult() {
  if (!result.value) return
  const fields: Record<string, string> = {}
  for (const f of cfg.value.fields) {
    const label = f.label
    const val = form.value[f.key] || ''
    if (val) fields[label] = val
  }
  const name = cfg.value.fields.map(f => form.value[f.key]).filter(Boolean).join('-') || cfg.value.title
  downloadDoc(fields, result.value, name)
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> {{ cfg.title }}
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-3 gap-4">
        <div v-for="f in cfg.fields" :key="f.key">
          <label class="text-sm text-cocoa-500">{{ f.label }}</label>
          <input v-model="form[f.key]" :placeholder="f.placeholder" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button
          class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="generating"
          @click="generate"
        >
          <Sparkles class="w-4 h-4" /> {{ generating ? '生成中…' : '生成' }}
        </button>
      </div>
    </div>

    <!-- 结果区 -->
    <div v-if="result || generating" class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-cocoa-700">
          <FileText class="w-4 h-4" />
          <span class="text-sm font-medium">生成结果</span>
          <span v-if="generating" class="text-xs text-butter-500 animate-pulse">生成中…</span>
        </div>
        <div class="flex gap-2" v-if="result && !generating">
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="copyResult">
            <Copy class="w-3.5 h-3.5" /> 复制
          </button>
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky2-100 text-sky2-600 hover:bg-sky2-200" @click="downloadResult">
            <Download class="w-3.5 h-3.5" /> 下载
          </button>
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-60" :disabled="saving" @click="saveResult">
            <Save class="w-3.5 h-3.5" /> {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
      <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ result }}</div>
    </div>
  </div>
</template>
