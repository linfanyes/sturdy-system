<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ArrowRightLeft, Globe, Copy, Trash2, Sparkles, AlertCircle, Languages, Check } from 'lucide-vue-next'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, type AIChatMessage } from '../../utils/aiCall'
import { AI_DEEPSEEK_BASE_URL } from '../../utils/aiBase'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const ai = useAIStore()
const toast = useToastStore()

const LANGUAGES = [
  { code: 'en', label: '英语', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日语', flag: '🇯🇵' },
  { code: 'ko', label: '韩语', flag: '🇰🇷' },
  { code: 'fr', label: '法语', flag: '🇫🇷' },
  { code: 'de', label: '德语', flag: '🇩🇪' },
  { code: 'ru', label: '俄语', flag: '🇷🇺' },
  { code: 'es', label: '西班牙语', flag: '🇪🇸' },
  { code: 'pt', label: '葡萄牙语', flag: '🇵🇹' },
  { code: 'it', label: '意大利语', flag: '🇮🇹' },
  { code: 'ar', label: '阿拉伯语', flag: '🇸🇦' },
  { code: 'th', label: '泰语', flag: '🇹🇭' },
]

const sourceText = ref('')
const targetLang = ref('en')
const sourceLang = ref('auto')
const result = ref('')
const loading = ref(false)
const abortCtrl = ref<AbortController | null>(null)
const isStreaming = ref(false)

const charCount = computed(() => sourceText.value.length)
const resultCount = computed(() => result.value.length)

const sourceLabel = computed(() => {
  if (sourceLang.value === 'auto') return '自动检测'
  return LANGUAGES.find((l) => l.code === sourceLang.value)?.label || sourceLang.value
})
const targetLabel = computed(() => {
  return LANGUAGES.find((l) => l.code === targetLang.value)?.label || targetLang.value
})

watch(targetLang, () => {
  // 切换目标语言后清空旧结果
  if (!isStreaming.value) result.value = ''
})

function swap() {
  if (sourceLang.value === 'auto') {
    // 自动检测无法交换
    toast.warning('自动检测不能作为源语言')
    return
  }
  const tmpLang = sourceLang.value
  sourceLang.value = targetLang.value
  targetLang.value = tmpLang
  const tmpText = sourceText.value
  sourceText.value = result.value
  result.value = tmpText
}

function clearAll() {
  sourceText.value = ''
  result.value = ''
}

async function doTranslate() {
  const text = sourceText.value.trim()
  if (!text) {
    toast.warning('请先输入要翻译的内容')
    return
  }
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话」中设置 API Key')
    return
  }
  // 取消上一次
  if (abortCtrl.value) abortCtrl.value.abort()
  abortCtrl.value = new AbortController()
  loading.value = true
  isStreaming.value = true
  result.value = ''

  const targetName = LANGUAGES.find((l) => l.code === targetLang.value)?.label || targetLang.value
  const sourceName = sourceLang.value === 'auto' ? '自动检测' : LANGUAGES.find((l) => l.code === sourceLang.value)?.label || sourceLang.value

  const systemPrompt = `你是一位专业的教师助理翻译。请将用户输入的${sourceName}内容翻译为${targetName}。
要求：
1. 只输出翻译结果，不要添加额外说明、注释或客套话。
2. 保持原文的语气、格式与换行。
3. 遇到专有名词 (如学校名、学生名、学科名) 应保留原样, 不要音译。
4. 如果输入是混合语言, 整体处理为${targetName}。`

  const payload = {
    model: ai.settings.model || 'qwen3.7-plus',
    temperature: 0.3,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
  }
  const baseUrl = (ai.settings.baseUrl || AI_DEEPSEEK_BASE_URL).replace(/\/$/, '')
  try {
    const resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ai.settings.apiKey,
      },
      body: JSON.stringify(payload),
      signal: abortCtrl.value.signal,
    })
    if (!resp.ok) {
      const errText = await resp.text()
      result.value = '❌ 请求失败: ' + resp.status + ' ' + errText.slice(0, 300)
      loading.value = false
      isStreaming.value = false
      return
    }
    const reader = resp.body?.getReader()
    if (!reader) {
      result.value = '❌ 浏览器不支持流式响应'
      loading.value = false
      isStreaming.value = false
      return
    }
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data:')) continue
        const json = trimmed.slice(5).trim()
        try {
          const obj = JSON.parse(json)
          const delta = obj?.choices?.[0]?.delta?.content
          if (delta) result.value += delta
        } catch (e) {
          /* skip */
        }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      result.value = result.value + '\n\n[已取消]'
    } else {
      result.value = '❌ ' + (e?.message || '网络异常')
    }
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

function stopTranslate() {
  if (abortCtrl.value) {
    abortCtrl.value.abort()
    isStreaming.value = false
    loading.value = false
  }
}

function copyResult() {
  if (!result.value) return
  navigator.clipboard.writeText(result.value).then(
    () => toast.success('已复制翻译结果'),
    () => toast.error('复制失败'),
  )
}

function copySource() {
  if (!sourceText.value) return
  navigator.clipboard.writeText(sourceText.value).then(
    () => toast.success('已复制原文'),
    () => toast.error('复制失败'),
  )
}

const sampleText = `Hello, students! Today we are going to learn about photosynthesis.`

function useSample() {
  sourceText.value = sampleText
  result.value = ''
}

// 组件卸载时中止未完成的翻译请求
onUnmounted(() => {
  if (abortCtrl.value) abortCtrl.value.abort()
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <!-- 顶部说明 -->
    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-sky2-100 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-sky2-300 flex items-center justify-center text-2xl shadow-softer"
        >
          🌐
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            多语种翻译
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            基于 AI 的多语种互译工具，支持中英日韩法德俄等 12 种语言。适合英语教研、班级公告、家长沟通。
          </p>
        </div>
        <div
          v-if="!ai.settings.apiKey"
          class="flex items-center gap-1.5 text-xs text-sakura-500"
        >
          <AlertCircle :size="14" />
          请先在「AI 对话」配置 API Key
        </div>
        <div
          v-else
          class="flex items-center gap-1.5 text-xs text-mint-500"
        >
          <Check :size="14" />
          已就绪 · 模型：{{ ai.settings.model || 'qwen3.7-plus' }}
        </div>
      </div>
    </section>

    <!-- 语言选择 -->
    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">源语言</label>
          <div class="flex gap-1.5 mt-1 flex-wrap">
            <button
              class="chip !py-1"
              :class="sourceLang === 'auto' ? 'bg-mint-300 text-cocoa-900' : 'bg-cream-100 text-cocoa-700'"
              @click="sourceLang = 'auto'"
            >
              🔍 自动检测
            </button>
            <button
              v-for="l in LANGUAGES"
              :key="l.code"
              class="chip !py-1"
              :class="sourceLang === l.code ? 'bg-mint-300 text-cocoa-900' : 'bg-cream-100 text-cocoa-700'"
              @click="sourceLang = l.code"
            >
              {{ l.flag }} {{ l.label }}
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">目标语言</label>
          <div class="flex gap-1.5 mt-1 flex-wrap">
            <button
              v-for="l in LANGUAGES"
              :key="l.code"
              class="chip !py-1"
              :class="targetLang === l.code ? 'bg-sky2-300 text-cocoa-900' : 'bg-cream-100 text-cocoa-700'"
              @click="targetLang = l.code"
            >
              {{ l.flag }} {{ l.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 输入与输出 -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 原文 -->
      <div class="card-flat p-4 flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5">
            <Globe :size="14" /> 原文 ({{ sourceLabel }})
          </div>
          <div class="flex items-center gap-1.5">
            <button
              class="text-[11px] text-sky2-500 hover:underline"
              @click="useSample"
            >
              填入示例
            </button>
            <span class="text-[10px] text-cocoa-300">{{ charCount }} 字</span>
          </div>
        </div>
        <textarea
          v-model="sourceText"
          class="flex-1 textarea-soft min-h-[200px] text-sm"
          placeholder="输入要翻译的内容，Ctrl/Cmd + Enter 翻译"
          @keydown.ctrl.enter.prevent="doTranslate"
          @keydown.meta.enter.prevent="doTranslate"
        />
        <div class="mt-2 flex items-center justify-between gap-2">
          <div class="text-[11px] text-cocoa-400 flex items-center gap-1">
            <Languages :size="12" /> 快捷键: Ctrl/⌘ + Enter
          </div>
          <div class="flex gap-1.5">
            <button
              v-if="sourceText"
              class="btn-ghost !px-2 !py-1 text-xs"
              @click="copySource"
            >
              <Copy :size="12" /> 复制
            </button>
            <button
              v-if="sourceText"
              class="btn-ghost !px-2 !py-1 text-xs"
              @click="clearAll"
            >
              <Trash2 :size="12" /> 清空
            </button>
            <button
              v-if="!loading"
              class="btn-primary !px-3 !py-1.5 text-xs"
              @click="doTranslate"
              :disabled="!sourceText.trim()"
            >
              <Sparkles :size="12" /> 翻译
            </button>
            <button
              v-else
              class="btn-secondary !px-3 !py-1.5 text-xs"
              @click="stopTranslate"
            >
              停止
            </button>
          </div>
        </div>
      </div>

      <!-- 译文 -->
      <div class="card-flat p-4 flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5">
            <Languages :size="14" /> 译文 ({{ targetLabel }})
          </div>
          <div class="flex items-center gap-2">
            <span
              v-if="loading"
              class="text-[10px] text-mint-500 flex items-center gap-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" /> 翻译中
            </span>
            <span class="text-[10px] text-cocoa-300">{{ resultCount }} 字</span>
          </div>
        </div>
        <div
          class="flex-1 min-h-[200px] p-3 rounded-2xl bg-cream-50 text-sm whitespace-pre-wrap break-words leading-relaxed"
          :class="result ? 'text-cocoa-900' : 'text-cocoa-300'"
        >
          <span v-if="!result && !loading">译文将显示在这里</span>
          <span v-else>{{ result }}<span
            v-if="loading"
            class="inline-block w-1.5 h-4 align-middle bg-mint-400 ml-0.5 animate-pulse"
          /></span>
        </div>
        <div class="mt-2 flex items-center justify-end gap-1.5">
          <button
            class="btn-ghost !px-2 !py-1 text-xs"
            @click="swap"
            :disabled="!result || loading"
          >
            <ArrowRightLeft :size="12" /> 交换
          </button>
          <button
            v-if="result && !loading"
            class="btn-secondary !px-3 !py-1.5 text-xs"
            @click="copyResult"
          >
            <Copy :size="12" /> 复制
          </button>
        </div>
      </div>
    </section>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：翻译结果会跟随 AI 模型的回复流式显示，可中途停止
    </div>
  </div>
</template>
