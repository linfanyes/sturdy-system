<script setup lang="ts">
// 英语口语练习工具：AI 生成场景化口语练习，支持范读、跟读录音对比与问答示范
import { ref, onUnmounted } from 'vue'
import { Sparkles, RefreshCw, Volume2, Square, Mic, Lightbulb } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const toast = useToastStore()
const ai = useAIStore()

interface SpeakQuestion {
  q: string
  sampleAnswer: string
}
interface SpeakingResult {
  topic: string
  passage: string
  questions: SpeakQuestion[]
  tips: string[]
}

const scenes = ['日常问候', '自我介绍', '描述图片', '复述故事', '看图说话']
const grades = ['三年级', '四年级', '五年级', '六年级']
const difficulties = ['入门', '进阶']

const scene = ref(scenes[0])
const grade = ref(grades[0])
const difficulty = ref(difficulties[0])

const generating = ref(false)
const result = ref<SpeakingResult | null>(null)

// 朗读状态：'idle' | 'passage'（范读）| 'shadowing'（跟读中的范读阶段）
const speakingMode = ref<'idle' | 'passage' | 'shadowing'>('idle')
let stopRequested = false

// 录音状态
const isRecording = ref(false)
const recordUrl = ref<string>('')
let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let audioChunks: Blob[] = []

// 浏览器录音能力检测
const recordingSupported = ref(true)
try {
  recordingSupported.value = !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    (window as any).MediaRecorder
  )
} catch {
  recordingSupported.value = false
}

function speakText(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

async function playPassage() {
  if (!result.value) return
  if (speakingMode.value !== 'idle') {
    stopRequested = true
    speechSynthesis.cancel()
    speakingMode.value = 'idle'
    return
  }
  speechSynthesis.cancel()
  speakingMode.value = 'passage'
  stopRequested = false
  await speakText(result.value.passage, 0.9)
  if (speakingMode.value === 'passage') speakingMode.value = 'idle'
}

async function startShadowing() {
  if (!result.value) return
  if (!recordingSupported.value) {
    toast.warning('当前浏览器不支持录音功能')
    return
  }
  if (isRecording.value) {
    stopRecording()
    return
  }
  if (speakingMode.value === 'shadowing') {
    stopRequested = true
    speechSynthesis.cancel()
    speakingMode.value = 'idle'
    return
  }
  // 开始跟读：先范读一遍，再录音
  speechSynthesis.cancel()
  speakingMode.value = 'shadowing'
  toast.info('范读中，请仔细听...')
  stopRequested = false
  await speakText(result.value.passage, 0.9)
  speakingMode.value = 'idle'
  if (stopRequested) return
  startRecording()
}

function speakSample(text: string) {
  speechSynthesis.cancel()
  speakingMode.value = 'idle'
  stopRequested = true
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

function stopAll() {
  stopRequested = true
  speechSynthesis.cancel()
  speakingMode.value = 'idle'
  if (isRecording.value) stopRecording()
}

async function startRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    mediaRecorder = new MediaRecorder(mediaStream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      if (recordUrl.value) URL.revokeObjectURL(recordUrl.value)
      recordUrl.value = URL.createObjectURL(blob)
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop())
        mediaStream = null
      }
      toast.success('录音完成，可点击播放对比')
    }
    mediaRecorder.start()
    isRecording.value = true
    toast.info('开始录音，请大声跟读...')
  } catch (e: any) {
    toast.error('录音启动失败：' + (e?.message || '无法访问麦克风'))
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    try {
      mediaRecorder.stop()
    } catch {
      /* noop */
    }
    isRecording.value = false
  }
}

function buildPrompt() {
  const sys =
    '你是一位资深小学英语口语教学教师。请根据用户给定的场景、年级和难度，生成一段适合小学生练习的口语材料。' +
    '内容应贴近学生生活，句型地道自然，难度贴合所选年级。'
  const usr =
    `场景：${scene.value}\n年级：${grade.value}\n难度：${difficulty.value}\n\n` +
    `请严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），格式如下：\n` +
    `{\n` +
    `  "topic": "本次练习主题（中英文均可）",\n` +
    `  "passage": "适合朗读的英文段落，5~8 句，难度贴合所选年级",\n` +
    `  "questions": [\n` +
    `    { "q": "英文提问", "sampleAnswer": "英文示范回答" }\n` +
    `  ],\n` +
    `  "tips": ["口语技巧1", "口语技巧2", "口语技巧3"]\n` +
    `}\n` +
    `要求：\n` +
    `- questions 数量 3~5 个；\n` +
    `- tips 数量 3~5 条，用中文表达；\n` +
    `- 难度为"入门"时使用简单句，"进阶"时可加入从句与连接词；\n` +
    `- passage 与 sampleAnswer 必须为纯英文。`
  return { sys, usr }
}

function parseJSON(text: string): SpeakingResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const tryParse = (s: string): SpeakingResult | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object' && typeof obj.passage === 'string') {
        return {
          topic: String(obj.topic || ''),
          passage: String(obj.passage || ''),
          questions: Array.isArray(obj.questions)
            ? obj.questions.map((q: any) => ({
                q: String(q?.q || ''),
                sampleAnswer: String(q?.sampleAnswer || ''),
              }))
            : [],
          tips: Array.isArray(obj.tips) ? obj.tips.map((t: any) => String(t || '')) : [],
        }
      }
    } catch {
      /* noop */
    }
    return null
  }
  let parsed = tryParse(t)
  if (parsed) return parsed
  const m = t.match(/\{[\s\S]*\}/)
  if (m) parsed = tryParse(m[0])
  return parsed
}

async function generate() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  generating.value = true
  result.value = null
  stopRequested = true
  speechSynthesis.cancel()
  speakingMode.value = 'idle'
  if (isRecording.value) stopRecording()
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
    const parsed = parseJSON(text)
    if (!parsed) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    result.value = parsed
    toast.success('口语练习已生成')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

onUnmounted(() => {
  stopRequested = true
  speechSynthesis.cancel()
  if (isRecording.value && mediaRecorder) {
    try { mediaRecorder.stop() } catch { /* noop */ }
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
  if (recordUrl.value) {
    URL.revokeObjectURL(recordUrl.value)
    recordUrl.value = ''
  }
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-mint-100 to-butter-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-mint-300 flex items-center justify-center text-2xl shadow-softer">
          🎤
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">口语练习</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            按场景、年级、难度生成口语练习，支持范读、跟读录音对比与问答示范。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">场景</label>
          <select v-model="scene" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="s in scenes" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select v-model="grade" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">难度</label>
          <select v-model="difficulty" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="mt-4">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="generating"
          @click="generate"
        >
          <Sparkles v-if="!generating" :size="16" />
          <RefreshCw v-else :size="16" class="animate-spin" />
          {{ generating ? '生成中...' : '生成练习' }}
        </button>
      </div>
    </section>

    <template v-if="result">
      <!-- 控制条 -->
      <section class="card-flat p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="btn-primary flex items-center gap-2 !py-2"
            :disabled="speakingMode === 'shadowing' || isRecording"
            @click="playPassage"
          >
            <Square v-if="speakingMode === 'passage'" :size="16" />
            <Volume2 v-else :size="16" />
            {{ speakingMode === 'passage' ? '停止范读' : '范读' }}
          </button>
          <button
            class="btn-primary flex items-center gap-2 !py-2"
            :disabled="speakingMode === 'passage'"
            @click="startShadowing"
          >
            <Mic :size="16" />
            {{ isRecording ? '停止录音' : (speakingMode === 'shadowing' ? '范读中...' : '跟读') }}
          </button>
          <button
            v-if="speakingMode !== 'idle' || isRecording"
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            @click="stopAll"
          >
            <Square :size="14" /> 停止
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            :disabled="generating"
            @click="generate"
          >
            <RefreshCw :size="14" /> 重新生成
          </button>
        </div>
      </section>

      <!-- 主题 -->
      <section class="card-soft p-4 bg-gradient-to-br from-sky2-50 to-mint-50">
        <div class="flex items-center gap-2 text-sm text-cocoa-600">
          <span class="text-base">🎯</span>
          <span>{{ result.topic }}</span>
        </div>
      </section>

      <!-- 朗读文本 -->
      <section class="card-flat p-5">
        <div class="flex items-center gap-2 mb-3">
          <Volume2 :size="16" class="text-sky2-500" />
          <h3 class="title-display text-base text-cocoa-900">朗读文本</h3>
        </div>
        <p class="text-lg leading-relaxed text-cocoa-800 whitespace-pre-line">{{ result.passage }}</p>
      </section>

      <!-- 录音中提示 -->
      <section v-if="isRecording" class="card-soft p-4 bg-gradient-to-br from-sakura-50 to-butter-50">
        <div class="flex items-center gap-2 text-sm text-sakura-600">
          <span class="w-2 h-2 rounded-full bg-sakura-500 animate-pulse" />
          正在录音...请大声跟读
        </div>
      </section>

      <!-- 录音回放 -->
      <section v-if="recordUrl" class="card-flat p-4">
        <div class="flex items-center gap-2 mb-2">
          <Mic :size="16" class="text-mint-500" />
          <h3 class="title-display text-base text-cocoa-900">我的录音</h3>
        </div>
        <audio :src="recordUrl" controls class="w-full" />
      </section>

      <!-- 问答区 -->
      <section v-if="result.questions.length" class="card-flat p-4">
        <div class="flex items-center gap-2 mb-3">
          <Sparkles :size="16" class="text-sky2-500" />
          <h3 class="title-display text-base text-cocoa-900">问答练习</h3>
        </div>
        <div class="space-y-3">
          <div
            v-for="(q, qi) in result.questions"
            :key="qi"
            class="card-flat !bg-cream-50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <span class="text-xs text-sky2-600 font-medium">Q{{ qi + 1 }}</span>
                <p class="text-sm text-cocoa-800 mt-1">{{ q.q }}</p>
                <p class="text-xs text-cocoa-500 mt-1.5 pt-1.5 border-t border-cream-200">
                  <span class="text-cocoa-400">示范：</span>{{ q.sampleAnswer }}
                </p>
              </div>
              <button
                class="btn-ghost flex items-center gap-1 !px-2.5 !py-1.5 text-xs shrink-0"
                @click="speakSample(q.sampleAnswer)"
              >
                <Volume2 :size="12" /> 听示范
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 技巧提示 -->
      <section v-if="result.tips.length" class="card-soft p-5 bg-gradient-to-br from-mint-50 to-sky2-50">
        <div class="flex items-center gap-2 mb-3">
          <Lightbulb :size="18" class="text-butter-500" />
          <h3 class="title-display text-lg text-cocoa-900">口语技巧</h3>
        </div>
        <ul class="space-y-2">
          <li
            v-for="(tip, ti) in result.tips"
            :key="ti"
            class="flex items-start gap-2 text-sm text-cocoa-700"
          >
            <span class="shrink-0 w-5 h-5 rounded-full bg-butter-100 text-butter-600 text-xs flex items-center justify-center mt-0.5">
              {{ ti + 1 }}
            </span>
            <span>{{ tip }}</span>
          </li>
        </ul>
      </section>
    </template>

    <section
      v-else-if="!generating"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <Mic :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择场景、年级、难度后点击「生成练习」</p>
      <p class="text-xs mt-1">AI 将生成朗读文本、问答示范与口语技巧，支持跟读录音对比</p>
    </section>
  </div>
</template>
