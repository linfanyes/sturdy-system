<script setup lang="ts">
// 演讲稿生成：AI 根据场景、角色、时长、主题、风格生成演讲稿（Markdown），支持朗读、复制、下载、打印
import { ref, computed, onUnmounted } from 'vue'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import { copyText, downloadMarkdown, renderMarkdownToHtml, printHtml } from '../../utils/download'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import { Sparkles, Copy, Download, Printer, RefreshCw, Volume2, Square, Mic } from 'lucide-vue-next'

const ai = useAIStore()
const toast = useToastStore()

const scenes = ['国旗下讲话', '班会发言', '家长会发言', '竞选演讲', '毕业致辞', '教师节发言']
const roles = ['教师', '学生', '家长代表', '班干部']
const durations = [
  { value: 3, words: 500, label: '3 分钟（约 500 字）' },
  { value: 5, words: 800, label: '5 分钟（约 800 字）' },
  { value: 8, words: 1200, label: '8 分钟（约 1200 字）' },
  { value: 10, words: 1500, label: '10 分钟（约 1500 字）' },
]
const styles = ['激情', '温情', '幽默', '庄重']

const scene = ref(scenes[0])
const role = ref(roles[0])
const duration = ref(durations[0].value)
const topic = ref('')
const style = ref('温情')

const generating = ref(false)
const result = ref('')
const speaking = ref(false)

const noApiKey = computed(() => !ai.settings.apiKey)
const selectedDuration = computed(
  () => durations.find((d) => d.value === duration.value) || durations[0],
)

function buildPrompt() {
  const sys =
    '你是一位资深的演讲稿撰写专家，深谙各类校园场景的演讲套路。请根据给定的场景、角色、时长、主题与风格，' +
    '撰写一篇适合朗读、有感染力、结构清晰的演讲稿。输出为 Markdown 格式，可用适当的二级标题分段，但不要过度使用列表。'
  const usr =
    `请生成一篇演讲稿：\n` +
    `- 场景：${scene.value}\n` +
    `- 角色：${role.value}\n` +
    `- 时长：${selectedDuration.value.value} 分钟（约 ${selectedDuration.value.words} 字）\n` +
    `- 主题：${topic.value.trim() || '（由你自由发挥，贴合场景）'}\n` +
    `- 风格：${style.value}\n\n` +
    `要求：\n` +
    `- 字数约 ${selectedDuration.value.words} 字\n` +
    `- 开头要有吸引人的称呼与引入，结尾要有力的升华\n` +
    `- 适合口语表达，避免书面化长句\n` +
    `- 输出 Markdown 格式`
  return { sys, usr }
}

async function generate() {
  if (generating.value) return
  if (noApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  generating.value = true
  result.value = ''
  stopSpeak()
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
    })
    result.value = text || ''
    if (!result.value) toast.warning('AI 未返回内容，请重试')
    else toast.success('演讲稿已生成')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

/** 朗读：使用浏览器 speechSynthesis，lang=zh-CN，rate=0.9 */
function startSpeak() {
  if (!result.value) return
  if (speaking.value) {
    stopSpeak()
    return
  }
  speechSynthesis.cancel()
  // 移除 Markdown 标记，朗读纯文本
  const plain = result.value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
  const u = new SpeechSynthesisUtterance(plain)
  u.lang = 'zh-CN'
  u.rate = 0.9
  u.onend = () => {
    speaking.value = false
  }
  u.onerror = () => {
    speaking.value = false
  }
  speaking.value = true
  speechSynthesis.speak(u)
  toast.info('开始朗读...')
}

function stopSpeak() {
  speechSynthesis.cancel()
  speaking.value = false
}

const exportName = computed(() => {
  const t = topic.value.trim() || scene.value
  return `演讲稿-${t}`.replace(/[\\/:*?"<>|]/g, '_')
})

async function doCopy() {
  if (!result.value) return
  ;(await copyText(result.value)) ? toast.success('已复制全文') : toast.error('复制失败')
}
function doDownload() {
  if (!result.value) return
  downloadMarkdown(exportName.value + '.md', result.value)
  toast.success('Markdown 已下载')
}
function doPrint() {
  if (!result.value) return
  printHtml('演讲稿', renderMarkdownToHtml(result.value))
}

onUnmounted(() => {
  speechSynthesis.cancel()
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-cream-50 to-mint-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-mint-400 flex items-center justify-center text-2xl shadow-softer"
        >
          🎤
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            演讲稿生成
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            按场景、角色、时长、主题、风格生成演讲稿，支持朗读、复制、下载与打印。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">场景</label>
          <select
            v-model="scene"
            class="input-soft mt-1"
          >
            <option
              v-for="s in scenes"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">角色</label>
          <select
            v-model="role"
            class="input-soft mt-1"
          >
            <option
              v-for="r in roles"
              :key="r"
              :value="r"
            >
              {{ r }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">时长</label>
          <select
            v-model.number="duration"
            class="input-soft mt-1"
          >
            <option
              v-for="d in durations"
              :key="d.value"
              :value="d.value"
            >
              {{ d.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">主题</label>
          <input
            v-model="topic"
            class="input-soft mt-1"
            placeholder="如：感恩、新学期新气象"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">风格</label>
          <select
            v-model="style"
            class="input-soft mt-1"
          >
            <option
              v-for="s in styles"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
            :disabled="generating || noApiKey"
            @click="generate"
          >
            <Sparkles v-if="!generating" :size="16" />
            <RefreshCw v-else :size="16" class="animate-spin" />
            {{ generating ? '生成中...' : '生成演讲稿' }}
          </button>
        </div>
      </div>
      <div
        v-if="noApiKey"
        class="mt-3 text-xs text-sakura-500"
      >
        请先在「AI 对话 → 设置」中配置 API Key
      </div>
    </section>

    <section class="card-soft p-5">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 class="title-display text-lg flex items-center gap-2">
          <Mic
            :size="16"
            class="text-mint-500"
          /> 演讲稿
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            class="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
            :disabled="!result || generating"
            @click="startSpeak"
          >
            <Square v-if="speaking" :size="12" />
            <Volume2 v-else :size="12" />
            {{ speaking ? '停止朗读' : '朗读' }}
          </button>
          <button
            class="btn-secondary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doCopy"
          >
            <Copy :size="12" /> 复制
          </button>
          <button
            class="btn-secondary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doDownload"
          >
            <Download :size="12" /> 下载
          </button>
          <button
            class="btn-primary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doPrint"
          >
            <Printer :size="12" /> 打印
          </button>
        </div>
      </div>
      <MarkdownView
        v-if="result"
        class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed overflow-y-auto max-h-[70vh]"
        :md="result"
      />
      <div
        v-else-if="generating"
        class="min-h-[300px] flex items-center justify-center text-cocoa-400 text-sm"
      >
        <RefreshCw
          :size="20"
          class="animate-spin mr-2"
        /> 正在生成演讲稿...
      </div>
      <div
        v-else
        class="min-h-[300px] flex flex-col items-center justify-center text-cocoa-400"
      >
        <Mic
          :size="40"
          class="mb-2 opacity-40"
        />
        <p class="text-sm">
          选择场景、角色、时长后点击「生成演讲稿」
        </p>
        <p class="text-xs mt-1">
          支持朗读、复制、下载 Markdown、打印
        </p>
      </div>
    </section>
  </div>
</template>
