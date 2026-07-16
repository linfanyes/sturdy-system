<!--
  Pinyin.vue
  拼音标注：教师输入汉字文本（如课文段落），由 AI 为每个字生成拼音并标记生僻字，
  支持上方注音（ruby）、逐字注音、仅生僻字三种展示模式，并可朗读原文、复制结果。
  适合低年级语文识字教学与课文展示。
-->
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  Sparkles, Loader2, AlertCircle, RotateCcw, Copy, Volume2, Type,
} from 'lucide-vue-next'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const ai = useAIStore()
const toast = useToastStore()

const hasApiKey = computed(() => !!ai.settings.apiKey?.trim())

// ============ 选项 ============
type AnnotateMode = 'ruby' | 'inline' | 'rare'
const modes: { value: AnnotateMode; label: string; desc: string }[] = [
  { value: 'ruby', label: '上方注音', desc: '每个字上方显示拼音' },
  { value: 'inline', label: '逐字注音', desc: '字后括号标注拼音' },
  { value: 'rare', label: '仅生僻字', desc: '只标注生僻字' },
]
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] as const

const selectedMode = ref<AnnotateMode>('ruby')
const selectedGrade = ref<string>(grades[0])
const inputText = ref('')

// ============ 状态 ============
type Status = 'idle' | 'generating' | 'done' | 'error'
const status = ref<Status>('idle')
const errorMsg = ref('')
let abortCtrl: AbortController | null = null

// ============ 数据结构 ============
interface PinyinItem {
  char: string
  pinyin: string
  isRare: boolean
}
const items = ref<PinyinItem[]>([])

// ============ 生成 ============
function buildPrompt() {
  const sys =
    '你是一位汉语拼音专家，熟悉小学语文识字教学与生字标注。' +
    '请准确为汉字标注拼音（带声调），并依据学生年级判断生僻字。' +
    '严格只输出 JSON，不要 markdown 代码块，不要任何解释文字。'
  const rareHint =
    selectedMode.value === 'rare'
      ? `判定"生僻字"的标准：对${selectedGrade.value}学生而言不常见、易读错的字。`
      : `判定"生僻字"的标准：对${selectedGrade.value}学生而言不常见、易读错的字。`
  const usr =
    `请为以下汉字文本逐字标注拼音，并判断每个字对${selectedGrade.value}学生是否为生僻字。\n\n` +
    `【文本】\n${inputText.value.trim()}\n\n` +
    `${rareHint}\n` +
    `严格只输出如下 JSON：\n` +
    `{"items":[{"char":"单个字符","pinyin":"带声调拼音(无空格)","isRare":true/false},...]}\n` +
    `要求：\n` +
    `1. 每个汉字字符对应一个 item，标点符号也保留为 item（pinyin 为空字符串，isRare 为 false）；\n` +
    `2. 拼音必须带声调（如 nǐ hǎo），多音字按文本语境选择正确读音；\n` +
    `3. 换行符用 char="\\n" 表示，pinyin 为空，isRare 为 false；\n` +
    `4. 不要遗漏任何字符，顺序与原文一致。`
  return { sys, usr }
}

function parseResult(text: string): PinyinItem[] | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) t = m[0]
  }
  try {
    const obj = JSON.parse(t)
    if (!obj || !Array.isArray(obj.items)) return null
    const list = obj.items
      .filter((it: any) => it && typeof it.char === 'string')
      .map((it: any) => ({
        char: String(it.char),
        pinyin: String(it.pinyin || ''),
        isRare: !!it.isRare,
      }))
    if (!list.length) return null
    return list
  } catch {
    return null
  }
}

async function generate() {
  if (status.value === 'generating') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  if (!inputText.value.trim()) {
    toast.warning('请先输入汉字文本')
    return
  }
  status.value = 'generating'
  errorMsg.value = ''
  items.value = []
  abortCtrl = new AbortController()
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.2,
      stream: false,
      signal: abortCtrl.signal,
    })
    const payload = parseResult(text)
    if (!payload) {
      status.value = 'error'
      errorMsg.value = 'AI 返回的内容无法解析为拼音结果，请重试'
      toast.error('生成失败，请重试')
      return
    }
    items.value = payload
    status.value = 'done'
    toast.success(`已为 ${payload.length} 个字符标注拼音`)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      status.value = 'idle'
      toast.info('已取消生成')
      return
    }
    status.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      errorMsg.value = e.message
      toast.error(e.message)
    } else {
      errorMsg.value = '生成失败：' + (e?.message || '未知错误')
      toast.error('生成失败，请稍后重试')
    }
  } finally {
    abortCtrl = null
  }
}

function stopGenerate() {
  abortCtrl?.abort()
}

function reset() {
  stopGenerate()
  items.value = []
  status.value = 'idle'
  errorMsg.value = ''
}

// ============ 展示辅助 ============
/** 是否还有需要展示的字（含生僻字或标点/换行） */
const hasContent = computed(() => items.value.length > 0)

/** 判断字符是否为汉字 */
function isHan(ch: string): boolean {
  return /[\u4e00-\u9fff]/.test(ch)
}

/** 在仅生僻字模式下，该字是否需要显示拼音 */
function showPinyinInRareMode(it: PinyinItem): boolean {
  return it.isRare && !!it.pinyin
}

// ============ 复制结果 ============
function buildPlainText(): string {
  if (!items.value.length) return ''
  if (selectedMode.value === 'ruby') {
    // 上方注音的纯文本版：拼音在上，字在下
    return items.value
      .map((it) => {
        if (it.char === '\n') return '\n'
        if (isHan(it.char) && it.pinyin) {
          return `${it.pinyin} ${it.char}\n`
        }
        return it.char
      })
      .join('')
  }
  if (selectedMode.value === 'inline') {
    // 逐字注音：字(拼音)
    return items.value
      .map((it) => {
        if (it.char === '\n') return '\n'
        if (isHan(it.char) && it.pinyin) {
          return `${it.char}(${it.pinyin})`
        }
        return it.char
      })
      .join('')
  }
  // 仅生僻字：只在生僻字后加括号拼音
  return items.value
    .map((it) => {
      if (it.char === '\n') return '\n'
      if (it.isRare && it.pinyin) {
        return `${it.char}(${it.pinyin})`
      }
      return it.char
    })
    .join('')
}

function copyResult() {
  if (!items.value.length) return
  const text = buildPlainText()
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制拼音结果'),
    () => toast.error('复制失败'),
  )
}

// ============ 朗读 ============
const speaking = ref(false)

function speakText() {
  try {
    if (speaking.value) {
      window.speechSynthesis.cancel()
      speaking.value = false
      return
    }
    if (!inputText.value.trim()) {
      toast.warning('没有可朗读的文本')
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(inputText.value)
    u.lang = 'zh-CN'
    u.rate = 0.85
    u.onend = () => {
      speaking.value = false
    }
    u.onerror = () => {
      speaking.value = false
    }
    speaking.value = true
    window.speechSynthesis.speak(u)
  } catch {
    speaking.value = false
    toast.error('朗读功能不可用')
  }
}

const rareCount = computed(() => items.value.filter((it) => it.isRare).length)
const hanCount = computed(() => items.value.filter((it) => isHan(it.char)).length)

onUnmounted(() => {
  if (abortCtrl) abortCtrl.abort()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-pink-50 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-2xl shadow-softer">
          🔤
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">拼音标注</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            输入汉字文本，AI 逐字标注拼音并判定生僻字，支持上方注音、逐字注音、仅生僻字三种模式。
          </p>
        </div>
      </div>
    </section>

    <!-- 输入区 -->
    <section class="card-flat p-4">
      <label class="text-xs text-cocoa-500 ml-1">汉字文本（如课文段落）</label>
      <textarea
        v-model="inputText"
        rows="5"
        placeholder="在此输入需要标注拼音的汉字文本，例如：&#10;春天来了，万物复苏，小草从泥土里探出头来。"
        class="w-full mt-1 card-flat px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
        :disabled="status === 'generating'"
      />

      <!-- 选项 -->
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div class="sm:col-span-2 lg:col-span-2">
          <label class="text-xs text-cocoa-500 ml-1">标注模式</label>
          <div class="mt-1 grid grid-cols-3 gap-1.5">
            <button
              v-for="m in modes"
              :key="m.value"
              class="px-2 py-2 rounded-xl text-xs transition-all text-center"
              :class="selectedMode === m.value
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
              :disabled="status === 'generating'"
              :title="m.desc"
              @click="selectedMode = m.value"
            >
              {{ m.label }}
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级（影响生僻字判定）</label>
          <select
            v-model="selectedGrade"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'generating'"
          >
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </div>

      <!-- API Key 缺失提示 -->
      <div
        v-if="!hasApiKey"
        class="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2"
      >
        <AlertCircle :size="12" />
        <span>请先在「AI 对话 → 设置」中配置 API Key 才能使用本工具</span>
      </div>

      <!-- 操作按钮 -->
      <div class="mt-3 flex items-center justify-end gap-2 flex-wrap">
        <button
          v-if="status === 'generating'"
          class="btn-secondary px-4 py-2 flex items-center gap-1.5"
          @click="stopGenerate"
        >
          <Loader2 :size="14" class="animate-spin" /> 停止
        </button>
        <button
          v-else-if="status === 'done'"
          class="btn-secondary px-4 py-2 flex items-center gap-1.5"
          :disabled="!hasApiKey || !inputText.trim()"
          @click="generate"
        >
          <RotateCcw :size="14" /> 重新生成
        </button>
        <button
          v-else
          class="btn-primary px-5 py-2 flex items-center gap-1.5"
          :disabled="!hasApiKey || !inputText.trim()"
          @click="generate"
        >
          <Sparkles :size="14" /> 生成拼音
        </button>
      </div>
    </section>

    <!-- 生成中 -->
    <section v-if="status === 'generating'" class="card-flat p-8 text-center">
      <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
      <p class="text-cocoa-700 text-sm">生成中...</p>
      <p class="text-cocoa-400 text-xs mt-1">{{ selectedGrade }} · {{ modes.find((m) => m.value === selectedMode)?.label }}</p>
    </section>

    <!-- 错误 -->
    <section v-else-if="status === 'error'" class="card-flat p-6 text-center">
      <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
      <p class="text-cocoa-700 text-sm">{{ errorMsg }}</p>
      <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="generate">重新生成</button>
    </section>

    <!-- 结果展示 -->
    <template v-else-if="status === 'done' && hasContent">
      <!-- 工具栏 -->
      <section class="card-flat p-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3 text-xs text-cocoa-500">
            <span class="flex items-center gap-1">
              <Type :size="12" class="text-rose-500" />
              共 {{ hanCount }} 字
            </span>
            <span v-if="rareCount" class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              生僻字 {{ rareCount }}
            </span>
            <span v-if="speaking" class="flex items-center gap-1 text-rose-500">
              <Volume2 :size="12" class="animate-pulse" /> 朗读中
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
              :class="speaking ? 'bg-rose-100 text-rose-600' : ''"
              @click="speakText"
            >
              <Volume2 :size="12" /> {{ speaking ? '停止' : '朗读原文' }}
            </button>
            <button
              class="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
              @click="copyResult"
            >
              <Copy :size="12" /> 复制结果
            </button>
          </div>
        </div>
      </section>

      <!-- 上方注音模式 (ruby) -->
      <section v-if="selectedMode === 'ruby'" class="card-flat p-5">
        <h3 class="text-sm font-medium text-rose-600 mb-3 flex items-center gap-1.5">
          <Type :size="14" /> 上方注音
        </h3>
        <div class="text-2xl leading-loose font-serif flex flex-wrap items-end">
          <template v-for="(it, i) in items" :key="i">
            <span v-if="it.char === '\n'" class="w-full" />
            <ruby v-else class="mr-0.5">
              <span :class="it.isRare ? 'text-rose-600 font-semibold' : 'text-cocoa-900'">{{ it.char }}</span>
              <rt v-if="isHan(it.char) && it.pinyin" class="text-xs text-rose-500 font-sans not-italic">{{ it.pinyin }}</rt>
            </ruby>
          </template>
        </div>
      </section>

      <!-- 逐字注音模式 (inline) -->
      <section v-else-if="selectedMode === 'inline'" class="card-flat p-5">
        <h3 class="text-sm font-medium text-rose-600 mb-3 flex items-center gap-1.5">
          <Type :size="14" /> 逐字注音
        </h3>
        <div class="text-xl leading-loose font-serif flex flex-wrap">
          <template v-for="(it, i) in items" :key="i">
            <span v-if="it.char === '\n'" class="w-full" />
            <span v-else class="mr-1">
              <span :class="it.isRare ? 'text-rose-600 font-semibold' : 'text-cocoa-900'">{{ it.char }}</span>
              <span v-if="isHan(it.char) && it.pinyin" class="text-xs text-rose-500 align-top ml-0.5">({{ it.pinyin }})</span>
            </span>
          </template>
        </div>
      </section>

      <!-- 仅生僻字模式 (rare) -->
      <section v-else class="card-flat p-5">
        <h3 class="text-sm font-medium text-rose-600 mb-3 flex items-center gap-1.5">
          <Type :size="14" /> 仅生僻字标注
          <span v-if="!rareCount" class="text-xs text-cocoa-400 font-normal">（无生僻字）</span>
        </h3>
        <div class="text-2xl leading-loose font-serif flex flex-wrap items-end">
          <template v-for="(it, i) in items" :key="i">
            <span v-if="it.char === '\n'" class="w-full" />
            <ruby v-else-if="showPinyinInRareMode(it)" class="mr-0.5">
              <span class="text-rose-600 font-semibold underline decoration-rose-300 underline-offset-4">{{ it.char }}</span>
              <rt class="text-xs text-rose-500 font-sans not-italic">{{ it.pinyin }}</rt>
            </ruby>
            <span v-else class="text-cocoa-900 mr-0.5">{{ it.char }}</span>
          </template>
        </div>
      </section>

      <!-- 生僻字列表 -->
      <section v-if="rareCount" class="card-flat p-5">
        <h3 class="text-sm font-medium text-cocoa-900 mb-3 flex items-center gap-1.5">
          <Sparkles :size="14" class="text-amber-500" /> 生僻字列表（{{ rareCount }} 字）
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <div
            v-for="(it, i) in items.filter((x) => x.isRare)"
            :key="i"
            class="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-2"
          >
            <span class="text-xl font-semibold text-rose-600 font-serif w-6 text-center">{{ it.char }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-rose-500">{{ it.pinyin }}</div>
              <div class="text-[10px] text-amber-600">生僻字</div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- 空状态 -->
    <section v-else class="card-flat p-10 text-center">
      <div class="text-5xl mb-3">🔤</div>
      <p class="text-cocoa-700 text-sm">输入汉字文本，选择标注模式与年级，点击"生成拼音"开始</p>
      <p class="text-cocoa-400 text-xs mt-1">AI 将为每个字标注拼音并判定生僻字</p>
    </section>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：上方注音适合课堂展示，逐字注音适合打印练习，仅生僻字适合高年级课文
    </div>
  </div>
</template>
