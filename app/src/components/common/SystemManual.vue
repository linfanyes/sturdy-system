<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { X, BookOpen, Download, Copy, Check } from 'lucide-vue-next'
// @ts-ignore - Vite raw import
import MANUAL_TEXT from '../../assets/SYSTEM_MANUAL.md?raw'
import { renderMarkdownToHtml } from '../../utils/download'

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
  manualEl.value.innerHTML = renderMarkdownToHtml(MANUAL_TEXT)
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
