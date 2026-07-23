<!--
  AIImportPanel.vue
  通用 AI 智能识别导入面板
  - 接收 AISchema (字段说明 + 示例)
  - 用户粘贴任意格式文本, 点击「AI 智能识别」后调用 AI 解析
  - 流式输出 AI 思考过程, 解析完毕回传 records
-->
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Sparkles, Loader2, AlertCircle, CheckCircle2, X, Wand2, Copy } from 'lucide-vue-next'
import { parseByAI, type AISchema, type AIParseResult } from '../../utils/aiParse'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'

const props = defineProps<{
  /** 期望输出的结构 (字段说明 + 示例) */
  schema: AISchema
  /** 文本框占位提示 */
  placeholder?: string
  /** 文本框高度 (像素) */
  textareaMinHeight?: number
  /** AI 解析完成后的回调, 接收 records 数组 */
  onParsed?: (records: Record<string, unknown>[]) => void
}>()

const emit = defineEmits<{
  /** 当 records 变化时通知父组件 */
  (e: 'records', records: Record<string, unknown>[]): void
}>()

const ai = useAIStore()
const toast = useToastStore()

const text = ref('')
const isParsing = ref(false)
const progressRaw = ref('')
const errorMsg = ref('')
const records = ref<Record<string, unknown>[]>([])
let abortCtrl: AbortController | null = null

const hasApiKey = computed(() => !!ai.settings.apiKey?.trim())

async function startParse() {
  const t = text.value.trim()
  if (!t) {
    toast.warning('请先粘贴文本')
    return
  }
  if (!hasApiKey.value) {
    toast.warning('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  isParsing.value = true
  errorMsg.value = ''
  records.value = []
  progressRaw.value = ''
  abortCtrl = new AbortController()
  const res = await parseByAI({
    text: t,
    schema: props.schema,
    onProgress: (raw) => {
      progressRaw.value = raw
    },
    signal: abortCtrl.signal,
  })
  isParsing.value = false
  abortCtrl = null
  if (!res.ok) {
    errorMsg.value = res.error || '解析失败'
    return
  }
  records.value = res.data
  emit('records', res.data)
  props.onParsed?.(res.data)
  toast.success('AI 解析完成, 共 ' + res.data.length + ' 条')
}

function stopParse() {
  abortCtrl?.abort()
  isParsing.value = false
}

function clearAll() {
  text.value = ''
  records.value = []
  progressRaw.value = ''
  errorMsg.value = ''
  emit('records', [])
}

function copyPromptTip() {
  const tpl = `将以下非结构化文本解析为 ${props.schema.name} 数组, 每条包含字段: ${Object.keys(
    props.schema.fields,
  ).join(', ')}.
示例: ${JSON.stringify(props.schema.example)}

【原始文本开始】
${text.value}
【原始文本结束】

直接输出 JSON 数组, 不要多余文字.`
  navigator.clipboard.writeText(tpl).then(() => {}).catch(() => {})
  toast.success('已复制提示词, 可到 AI 对话中调试')
}

// 组件卸载时中止未完成的解析请求
onUnmounted(() => {
  if (abortCtrl) abortCtrl.abort()
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2 text-sm text-cocoa-700">
      <Wand2
        :size="14"
        class="text-butter-500"
      />
      <span class="font-medium">AI 智能识别</span>
      <span class="text-[10px] text-cocoa-400">
        粘贴任意格式文本 (Excel 复制 / Word / 聊天记录 / 手敲), AI 自动解析为标准数据
      </span>
    </div>

    <!-- API Key 提示 -->
    <div
      v-if="!hasApiKey"
      class="card-flat p-2.5 text-xs text-sakura-500 flex items-center gap-2"
    >
      <AlertCircle :size="12" />
      <span>请先在「AI 对话 → 设置」中配置 API Key 才能使用智能识别.</span>
    </div>

    <!-- 文本框 -->
    <div>
      <textarea
        v-model="text"
        :placeholder="placeholder || '把任意格式的文本粘贴到此处, AI 会自动识别...'"
        :style="{ minHeight: (textareaMinHeight || 140) + 'px' }"
        class="input-soft font-mono text-xs leading-relaxed"
        :disabled="isParsing"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-1.5">
        <button
          v-if="!isParsing"
          class="btn-primary !py-1.5 !px-3 text-xs"
          :disabled="!text.trim()"
          @click="startParse"
        >
          <Sparkles :size="12" /> AI 智能识别
        </button>
        <button
          v-else
          class="btn-secondary !py-1.5 !px-3 text-xs"
          @click="stopParse"
        >
          <Loader2
            :size="12"
            class="animate-spin"
          /> 停止
        </button>
        <button
          v-if="text || records.length"
          class="btn-secondary !py-1.5 !px-3 text-xs"
          :disabled="isParsing"
          @click="clearAll"
        >
          <X :size="12" /> 清空
        </button>
        <button
          class="text-[10px] text-cocoa-400 hover:text-cocoa-600 flex items-center gap-0.5"
          :disabled="!text.trim()"
          @click="copyPromptTip"
        >
          <Copy :size="10" /> 复制提示词
        </button>
      </div>
      <div
        v-if="records.length"
        class="flex items-center gap-2 text-xs"
      >
        <span class="chip bg-mint-100 text-mint-500">
          <CheckCircle2 :size="10" /> 解析 {{ records.length }} 条
        </span>
      </div>
    </div>

    <!-- 错误 -->
    <div
      v-if="errorMsg"
      class="card-flat p-2.5 text-xs text-sakura-500 flex items-start gap-2"
    >
      <AlertCircle
        :size="12"
        class="mt-0.5 shrink-0"
      />
      <span class="break-all">{{ errorMsg }}</span>
    </div>

    <!-- 流式进度 (AI 思考中显示) -->
    <div
      v-if="isParsing && progressRaw"
      class="card-flat p-3"
    >
      <div class="text-[10px] text-cocoa-400 mb-1 flex items-center gap-1">
        <Loader2
          :size="10"
          class="animate-spin"
        /> AI 思考中...
      </div>
      <pre class="text-[11px] text-cocoa-600 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{{ progressRaw }}</pre>
    </div>

    <!-- 解析结果预览 -->
    <div
      v-if="!isParsing && records.length"
      class="card-flat p-3"
    >
      <div class="text-[10px] text-cocoa-400 mb-2 flex items-center justify-between">
        <span>解析结果预览 (可在下方表格中编辑后再导入)</span>
        <span class="text-mint-500">{{ records.length }} 条</span>
      </div>
      <div class="overflow-x-auto max-h-60 overflow-y-auto">
        <table class="w-full text-xs">
          <thead class="bg-butter-50/60 sticky top-0">
            <tr>
              <th class="px-2 py-1 text-left text-cocoa-500 font-medium">
                #
              </th>
              <th
                v-for="(label, key) in schema.fields"
                :key="key"
                class="px-2 py-1 text-left text-cocoa-500 font-medium whitespace-nowrap"
              >
                {{ key }}<span class="text-cocoa-300 ml-1">({{ label }})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in records.slice(0, 50)"
              :key="i"
              class="border-t border-cocoa-100/40 hover:bg-butter-50/30"
            >
              <td class="px-2 py-1 text-cocoa-400">
                {{ i + 1 }}
              </td>
              <td
                v-for="(_, key) in schema.fields"
                :key="key"
                class="px-2 py-1 text-cocoa-700 max-w-[160px] truncate"
                :title="String(r[key] ?? '')"
              >
                {{ r[key] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="records.length > 50"
          class="text-[10px] text-cocoa-400 text-center py-1"
        >
          仅显示前 50 条, 共 {{ records.length }} 条
        </div>
      </div>
    </div>
  </div>
</template>
