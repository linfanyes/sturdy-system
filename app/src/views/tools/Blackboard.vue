<!-- 黑板报生成：根据主题/年级/风格，用 AI 一次生成 3 个不同版式的黑板报内容，模拟真实绿黑板粉笔字效果 -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'
import { Sparkles, Download, RefreshCw, Wand2 } from 'lucide-vue-next'

interface Section {
  heading: string
  content: string
  layout: 'main' | 'side' | 'bottom'
}
interface Board {
  title: string
  subtitle: string
  sections: Section[]
  slogan: string
  decorations: string[]
}

const ai = useAIStore()
const toast = useToastStore()

const theme = ref('消防安全')
const grade = ref<'低年级' | '中年级' | '高年级'>('中年级')
const style = ref<'活泼' | '庄重' | '科普' | '文艺'>('活泼')
const generating = ref(false)
const boards = ref<Board[]>([])
const activeIdx = ref(0)

const hasKey = computed(() => !!ai.settings.apiKey)

const themeSuggestions = [
  '消防安全',
  '植树节',
  '防溺水',
  '读书月',
  '交通安全',
  '爱国教育',
  '文明礼仪',
  '节约用水',
]

const activeView = computed(() => {
  const b = boards.value[activeIdx.value]
  if (!b) return null
  return {
    board: b,
    main: b.sections.filter((s) => s.layout === 'main'),
    side: b.sections.filter((s) => s.layout === 'side'),
    bottom: b.sections.filter((s) => s.layout === 'bottom'),
  }
})

function isBoard(b: any): b is Board {
  return !!b && typeof b.title === 'string' && Array.isArray(b.sections)
}

function parseBoards(text: string): Board[] {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  try {
    const v = JSON.parse(t)
    if (v && Array.isArray(v.boards)) return v.boards.filter(isBoard)
  } catch {
    /* noop */
  }
  const m = t.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const v = JSON.parse(m[0])
      if (v && Array.isArray(v.boards)) return v.boards.filter(isBoard)
    } catch {
      /* noop */
    }
  }
  return []
}

async function generate() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  if (!theme.value.trim()) {
    toast.warning('请输入黑板报主题')
    return
  }
  generating.value = true
  boards.value = []
  activeIdx.value = 0
  try {
    const sys =
      '你是一位擅长中小学黑板报设计的美术老师，熟悉不同年龄段学生的认知特点，能设计图文并茂、版式丰富的黑板报内容。'
    const styleHint =
      style.value === '活泼'
        ? '生动活泼、童趣盎然'
        : style.value === '庄重'
          ? '庄重严肃、富有教育意义'
          : style.value === '科普'
            ? '通俗易懂、富有科普性'
            : '优美文艺、富有诗意'
    const usr =
      `请为以下需求设计 3 个不同版式的黑板报内容：\n` +
      `- 主题：${theme.value.trim()}\n` +
      `- 年级：${grade.value}\n` +
      `- 风格：${style.value}\n\n` +
      `要求：\n` +
      `1. 3 个黑板报要有明显不同的版式（如左图右文、上图下文、三栏式等）；\n` +
      `2. 每个 sections 中的 layout 标明该板块位置：main(主体居中)、side(侧栏)、bottom(底部)；\n` +
      `3. 内容贴合${grade.value}学生的认知水平，语言${styleHint}；\n` +
      `4. decorations 用 2~5 个 emoji 点缀；\n` +
      `5. 每个 section 的 content 控制在 50~120 字；\n` +
      `6. 严格只输出 JSON，不要任何额外说明或 markdown 代码块标记，格式：\n` +
      `{"boards":[{"title":"主标题","subtitle":"副标题","sections":[{"heading":"小标题","content":"正文内容","layout":"main"}],"slogan":"底部标语","decorations":["🌟","📚"]}]}\n`
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
    })
    const parsed = parseBoards(text)
    if (!parsed.length) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    boards.value = parsed
    activeIdx.value = 0
    toast.success(`已生成 ${parsed.length} 个黑板报方案`)
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function downloadImage() {
  toast.info('请截图保存：右键图片或使用系统截图工具')
}
</script>

<template>
  <div class="space-y-5">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-6 bg-gradient-to-br from-mint-100 via-cream-50 to-butter-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">🎨</div>
      <h2 class="title-display text-2xl">黑板报生成</h2>
      <p class="text-sm text-cocoa-500 mt-1">输入主题，AI 一键生成 3 个不同版式的黑板报内容</p>
    </section>

    <!-- 选项区 -->
    <div class="card-soft p-5">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="lg:col-span-2">
          <label class="text-xs text-cocoa-500">主题</label>
          <input
            v-model="theme"
            class="input-soft mt-1"
            placeholder="如：消防安全、植树节、防溺水"
            @keyup.enter="generate"
          />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">年级</label>
          <select v-model="grade" class="input-soft mt-1">
            <option value="低年级">低年级</option>
            <option value="中年级">中年级</option>
            <option value="高年级">高年级</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">风格</label>
          <select v-model="style" class="input-soft mt-1">
            <option value="活泼">活泼</option>
            <option value="庄重">庄重</option>
            <option value="科普">科普</option>
            <option value="文艺">文艺</option>
          </select>
        </div>
      </div>

      <!-- 主题建议 -->
      <div class="mt-3 flex flex-wrap gap-1.5 items-center">
        <span class="text-xs text-cocoa-400">热门：</span>
        <button
          v-for="t in themeSuggestions"
          :key="t"
          class="chip bg-cocoa-100 text-cocoa-500 text-xs hover:bg-butter-200 transition"
          @click="theme = t"
        >
          {{ t }}
        </button>
      </div>

      <div class="mt-4 flex items-center gap-3 flex-wrap">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="generating || !hasKey"
          @click="generate"
        >
          <Sparkles :size="16" />
          {{ generating ? '生成中...' : '生成黑板报' }}
        </button>
        <button
          v-if="boards.length"
          class="btn-secondary flex items-center gap-2"
          :disabled="generating || !hasKey"
          @click="generate"
        >
          <RefreshCw :size="14" /> 重新生成
        </button>
        <span v-if="!hasKey" class="text-xs text-sakura-500">未配置 API Key，按钮已禁用</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!boards.length && !generating">
      <EmptyState title="还没有黑板报" desc="输入主题后点击「生成黑板报」" icon="🖌️" />
    </div>

    <!-- 生成中 -->
    <div v-if="generating" class="card-soft p-10 text-center text-cocoa-400">
      <Wand2 :size="36" class="mx-auto mb-3 animate-floaty opacity-50" />
      <p class="text-sm">AI 正在构思黑板报版式...</p>
    </div>

    <!-- 黑板报展示 -->
    <div v-if="boards.length && !generating" class="space-y-4">
      <!-- 方案切换 -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="(b, i) in boards"
          :key="i"
          class="chip border transition text-sm"
          :class="
            activeIdx === i
              ? 'bg-butter-300 border-butter-500 text-cocoa-900'
              : 'bg-white/70 border-white/40 text-cocoa-700 hover:bg-butter-100'
          "
          @click="activeIdx = i"
        >
          方案 {{ i + 1 }} · {{ b.title }}
        </button>
      </div>

      <!-- 黑板 -->
      <div v-if="activeView" class="space-y-3">
        <div class="flex justify-end gap-2">
          <button class="btn-ghost text-xs flex items-center gap-1" @click="downloadImage">
            <Download :size="12" /> 下载图片
          </button>
        </div>
        <div
          class="border-8 border-amber-800 rounded-lg bg-gradient-to-br from-green-800 to-green-900 p-5 sm:p-8 shadow-soft relative overflow-hidden"
        >
          <!-- 装饰 -->
          <div
            v-if="activeView.board.decorations[0]"
            class="absolute top-2 left-3 text-2xl opacity-70 select-none"
          >
            {{ activeView.board.decorations[0] }}
          </div>
          <div
            v-if="activeView.board.decorations[1]"
            class="absolute top-3 right-4 text-2xl opacity-70 select-none"
          >
            {{ activeView.board.decorations[1] }}
          </div>

          <!-- 标题 -->
          <div class="text-center mb-4">
            <h3 class="font-hand text-3xl sm:text-4xl text-yellow-200 tracking-wide break-words">
              {{ activeView.board.title }}
            </h3>
            <p
              v-if="activeView.board.subtitle"
              class="font-hand text-base sm:text-lg text-white/80 mt-1 break-words"
            >
              {{ activeView.board.subtitle }}
            </p>
          </div>

          <!-- 内容区：主体 + 侧栏 -->
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- 主体 + 底部 -->
            <div class="flex-1 space-y-3 min-w-0">
              <div v-for="(s, i) in activeView.main" :key="'m' + i" class="font-hand">
                <div class="text-yellow-200 text-lg sm:text-xl mb-1">✦ {{ s.heading }}</div>
                <p class="text-white/90 text-sm sm:text-base leading-relaxed whitespace-pre-line break-words">
                  {{ s.content }}
                </p>
              </div>
            </div>
            <!-- 侧栏 -->
            <div
              v-if="activeView.side.length"
              class="sm:w-1/3 space-y-3 sm:border-l-2 border-white/20 sm:pl-4 min-w-0"
            >
              <div v-for="(s, i) in activeView.side" :key="'s' + i" class="font-hand">
                <div class="text-yellow-200 text-base sm:text-lg mb-1">✧ {{ s.heading }}</div>
                <p class="text-white/80 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words">
                  {{ s.content }}
                </p>
              </div>
            </div>
          </div>

          <!-- 底部板块 -->
          <div
            v-if="activeView.bottom.length"
            class="mt-4 pt-3 border-t border-white/20 space-y-2"
          >
            <div v-for="(s, i) in activeView.bottom" :key="'b' + i" class="font-hand break-words">
              <span class="text-yellow-200 text-sm">❀ {{ s.heading }}：</span>
              <span class="text-white/80 text-xs sm:text-sm">{{ s.content }}</span>
            </div>
          </div>

          <!-- 标语 -->
          <div
            v-if="activeView.board.slogan"
            class="text-center mt-5 pt-3 border-t border-white/15"
          >
            <span class="font-hand text-lg sm:text-xl text-yellow-300 break-words">
              — {{ activeView.board.slogan }} —
            </span>
          </div>

          <!-- 额外装饰 -->
          <div
            v-if="activeView.board.decorations[2]"
            class="absolute bottom-3 left-4 text-2xl opacity-60 select-none"
          >
            {{ activeView.board.decorations[2] }}
          </div>
          <div
            v-if="activeView.board.decorations[3]"
            class="absolute bottom-3 right-4 text-2xl opacity-60 select-none"
          >
            {{ activeView.board.decorations[3] }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
