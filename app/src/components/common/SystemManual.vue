<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { X, BookOpen, Download, Copy, Check } from 'lucide-vue-next'
// @ts-ignore - Vite raw import
import MANUAL_TEXT from '../../assets/SYSTEM_MANUAL.md?raw'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const copied = ref(false)
const manualEl = ref<HTMLElement | null>(null)

const stats = computed(() => {
  const lines = MANUAL_TEXT.split('\n').length
  const chars = MANUAL_TEXT.length
  return { lines, chars }
})

function close() {
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

// 预览区位于 v-if="open" 内部, onMounted 时尚未挂载, 必须在打开时渲染
watch(
  () => props.open,
  (open) => {
    if (open) {
      // 等下一帧 DOM 挂载完成后再渲染
      requestAnimationFrame(render)
    }
  },
)
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

function render() {
  if (!manualEl.value) return
  manualEl.value.innerHTML = parseMarkdown(MANUAL_TEXT)
}

// 极简 Markdown 渲染器 (headings / lists / code / tables / bold / inline code)
function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []
  let inTable = false
  let tableBuf: string[] = []
  let listType: 'ul' | 'ol' | null = null

  function flushList() {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }
  function flushTable() {
    if (inTable && tableBuf.length >= 2) {
      const headers = tableBuf[0]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
      const rows = tableBuf
        .slice(2)
        .map((r) =>
          r
            .split('|')
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length)
        )
      out.push('<div class="my-2 overflow-x-auto"><table class="text-xs border-collapse">')
      out.push(
        '<thead><tr>' +
          headers.map((h) => `<th class="border border-cocoa-200 px-2 py-1 bg-cocoa-50 text-left">${inline(h)}</th>`).join('') +
          '</tr></thead>'
      )
      out.push('<tbody>')
      for (const r of rows) {
        out.push(
          '<tr>' +
            r.map((c) => `<td class="border border-cocoa-200 px-2 py-1 align-top">${inline(c)}</td>`).join('') +
            '</tr>'
        )
      }
      out.push('</tbody></table></div>')
    }
    inTable = false
    tableBuf = []
  }

  function inline(s: string): string {
    let r = escapeHtml(s)
    // inline code
    r = r.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-cocoa-100 text-cocoa-700 text-[11px]">$1</code>')
    // bold
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-cocoa-800">$1</strong>')
    return r
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (/^```/.test(line)) {
      if (!inCode) {
        flushList()
        flushTable()
        inCode = true
        codeLang = line.replace(/^```/, '').trim()
        codeBuf = []
      } else {
        out.push(
          `<pre class="my-2 p-3 rounded-lg bg-cocoa-900 text-cocoa-50 text-[11px] overflow-x-auto"><code>${escapeHtml(
            codeBuf.join('\n')
          )}</code></pre>`
        )
        inCode = false
        codeBuf = []
      }
      i++
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      i++
      continue
    }

    // 标题
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      flushList()
      flushTable()
      const level = h[1].length
      const text = inline(h[2])
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs']
      const cls = sizes[level - 1] || 'text-xs'
      const mt = level === 1 ? 'mt-4' : 'mt-3'
      const mb = level <= 2 ? 'mb-2' : 'mb-1'
      const id = text.replace(/<[^>]+>/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 40)
      out.push(
        `<h${level} id="${id}" class="${cls} ${mt} ${mb} font-bold text-cocoa-800 border-b border-cocoa-100 pb-1">${text}</h${level}>`
      )
      i++
      continue
    }

    // 引用
    if (/^>\s+/.test(line)) {
      flushList()
      flushTable()
      out.push(
        `<blockquote class="my-1 pl-3 border-l-2 border-cocoa-300 text-cocoa-600 italic">${inline(
          line.replace(/^>\s+/, '')
        )}</blockquote>`
      )
      i++
      continue
    }

    // 表格
    if (/^\|/.test(line) && /^\|.*\|$/.test(line.trim())) {
      flushList()
      inTable = true
      tableBuf.push(line)
      i++
      continue
    } else if (inTable) {
      flushTable()
    }

    // 无序列表
    const ul = /^[-*]\s+(.*)$/.exec(line)
    if (ul) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
        out.push('<ul class="my-1 ml-4 list-disc">')
      }
      out.push(`<li class="my-0.5">${inline(ul[1])}</li>`)
      i++
      continue
    }

    // 有序列表
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ol) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
        out.push('<ol class="my-1 ml-4 list-decimal">')
      }
      out.push(`<li class="my-0.5">${inline(ol[1])}</li>`)
      i++
      continue
    }

    // 空行
    if (line.trim() === '') {
      flushList()
      i++
      continue
    }

    // 普通段落
    flushList()
    flushTable()
    out.push(`<p class="my-1.5 text-cocoa-700 leading-relaxed">${inline(line)}</p>`)
    i++
  }
  flushList()
  flushTable()
  if (inCode) {
    out.push(
      `<pre class="my-2 p-3 rounded-lg bg-cocoa-900 text-cocoa-50 text-[11px] overflow-x-auto"><code>${escapeHtml(
        codeBuf.join('\n')
      )}</code></pre>`
    )
  }
  return out.join('\n')
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(MANUAL_TEXT)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // ignore
  }
}

function downloadManual() {
  const blob = new Blob([MANUAL_TEXT], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '园丁工作台-系统说明书.md'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          <!-- 头部 -->
          <div class="px-5 py-3 border-b border-cocoa-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-400 to-sky2-400 flex items-center justify-center">
                <BookOpen
                  :size="16"
                  class="text-white"
                />
              </div>
              <div>
                <h2 class="text-base font-bold text-cocoa-800">
                  系统使用说明书
                </h2>
                <p class="text-[10px] text-cocoa-500">
                  共 {{ stats.lines }} 行 · {{ stats.chars }} 字
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="px-2.5 py-1.5 rounded-lg text-xs text-cocoa-600 hover:bg-cocoa-50 flex items-center gap-1"
                @click="copyAll"
              >
                <Check
                  v-if="copied"
                  :size="14"
                  class="text-mint-500"
                />
                <Copy
                  v-else
                  :size="14"
                />
                {{ copied ? '已复制' : '复制' }}
              </button>
              <button
                class="px-2.5 py-1.5 rounded-lg text-xs text-cocoa-600 hover:bg-cocoa-50 flex items-center gap-1"
                @click="downloadManual"
              >
                <Download :size="14" />
                下载
              </button>
              <button
                class="ml-1 p-1.5 rounded-lg text-cocoa-500 hover:bg-cocoa-50 hover:text-cocoa-700"
                @click="close"
                title="关闭 (Esc)"
              >
                <X :size="16" />
              </button>
            </div>
          </div>

          <!-- 内容 -->
          <div
            ref="manualEl"
            class="flex-1 overflow-y-auto px-6 py-4 text-sm"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
:deep(h1) {
  font-size: 1.5rem;
}
:deep(h2) {
  font-size: 1.25rem;
}
:deep(h3) {
  font-size: 1.1rem;
}
:deep(p) {
  margin: 0.5em 0;
}
:deep(ul),
:deep(ol) {
  padding-left: 1.5em;
}
:deep(table) {
  width: 100%;
}
</style>
