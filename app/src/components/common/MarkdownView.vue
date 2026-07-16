<script setup lang="ts">
/**
 * Markdown 渲染公共组件
 *
 * 统一处理 Markdown → HTML 的渲染与 XSS 消毒, 替代散落各处的
 * `v-html="renderMarkdownToHtml(...)"` 调用, 同时提供:
 *  - 流式渲染时的节流 (避免每个 token 都重渲染整段 HTML)
 *  - 空内容占位 (可选 slot)
 *  - 统一的排版样式 (.md-body)
 *
 * 安全: 内部仍走 utils/download.ts 的 sanitizeHtml 白名单净化, 不引入新风险。
 */
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { renderMarkdownToHtml } from '../../utils/download'

const props = withDefaults(
  defineProps<{
    /** Markdown 源文本 */
    md?: string
    /** 是否处于流式输出中 (true 时启用节流, false 时立即同步) */
    streaming?: boolean
    /** 节流间隔毫秒, 默认 80ms */
    throttleMs?: number
  }>(),
  { md: '', streaming: false, throttleMs: 80 },
)

// 流式时对 HTML 计算做节流, 避免每个 token 触发一次 marked.parse + sanitize
const throttledHtml = ref('')
let rafId: number | null = null
let lastRun = 0
let pending = false

function run() {
  lastRun = Date.now()
  pending = false
  throttledHtml.value = renderMarkdownToHtml(props.md || '')
}

function schedule() {
  if (!props.streaming) {
    // 非流式: 立即同步
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    run()
    return
  }
  const elapsed = Date.now() - lastRun
  const wait = Math.max(0, props.throttleMs - elapsed)
  if (pending) return
  pending = true
  setTimeout(() => {
    rafId = requestAnimationFrame(run)
  }, wait)
}

watch(
  () => props.md,
  () => schedule(),
  { immediate: true },
)
watch(
  () => props.streaming,
  (s) => {
    // 流式结束时立即冲一次最终结果, 防止最后一段被节流丢弃
    if (!s) run()
  },
)

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})

const html = computed(() => throttledHtml.value)
</script>

<template>
  <div
    class="md-body"
    v-html="html"
  />
</template>

<style scoped>
.md-body {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}
.md-body :deep(p) {
  margin: 0.4em 0;
}
.md-body :deep(p:first-child) {
  margin-top: 0;
}
.md-body :deep(p:last-child) {
  margin-bottom: 0;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3),
.md-body :deep(h4),
.md-body :deep(h5),
.md-body :deep(h6) {
  font-weight: 600;
  margin: 0.6em 0 0.3em;
  line-height: 1.3;
}
.md-body :deep(h1) { font-size: 1.3em; }
.md-body :deep(h2) { font-size: 1.2em; }
.md-body :deep(h3) { font-size: 1.1em; }
.md-body :deep(h4),
.md-body :deep(h5),
.md-body :deep(h6) { font-size: 1em; }
.md-body :deep(ul),
.md-body :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
.md-body :deep(li) {
  margin: 0.15em 0;
}
.md-body :deep(li > p) {
  margin: 0;
}
.md-body :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
.md-body :deep(strong),
.md-body :deep(b) {
  font-weight: 600;
}
.md-body :deep(blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 0.8em;
  margin: 0.5em 0;
  color: #4b5563;
}
.md-body :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.md-body :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.6em 0.8em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}
.md-body :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.85em;
}
.md-body :deep(table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  font-size: 0.92em;
  display: block;
  overflow-x: auto;
}
.md-body :deep(th),
.md-body :deep(td) {
  border: 1px solid #d1d5db;
  padding: 0.35em 0.6em;
  text-align: left;
}
.md-body :deep(th) {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}
.md-body :deep(hr) {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 0.6em 0;
}
.md-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
</style>
