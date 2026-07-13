<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'
import { useNoteStore } from '../stores/note'
import type { NoteItem, NoteCategory } from '../types'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Pin, PinOff, Star, Trash2, Search, Save, X, Eye, Pencil } from 'lucide-vue-next'
import { formatDate } from '../utils'
import { renderMarkdownToHtml } from '../utils/download'
import { useToastStore } from '../stores/toast'

/** 弹窗：true=预览 Markdown，false=编辑 */
const previewMode = ref(false)

const noteStore = useNoteStore()
const toast = useToastStore()

const categories: NoteCategory[] = ['教学反思', '班会记录', '学习资料', '其他']
const activeCat = ref<NoteCategory | '全部' | '收藏'>('全部')
const { search, searchDebounced } = useDebouncedSearch(200)

const modalOpen = ref(false)
const editing = ref<NoteItem | null>(null)
const draft = ref<Pick<NoteItem, 'title' | 'content' | 'category'>>({
  title: '',
  content: '',
  category: '教学反思',
})

const filtered = computed(() => {
  let list = [...noteStore.notes]
  if (activeCat.value === '收藏') list = list.filter((n) => n.favorite)
  else if (activeCat.value !== '全部')
    list = list.filter((n) => n.category === activeCat.value)
  if (searchDebounced.value.trim()) {
    const kw = searchDebounced.value.trim().toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        n.content.toLowerCase().includes(kw),
    )
  }
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
})

function openCreate() {
  editing.value = null
  draft.value = { title: '', content: '', category: '教学反思' }
  modalOpen.value = true
}

function openEdit(n: NoteItem) {
  editing.value = n
  draft.value = { title: n.title, content: n.content, category: n.category }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) {
    toast.warning('请填写标题')
    return
  }
  if (editing.value) {
    noteStore.updateNote(editing.value.id, draft.value)
    toast.success('已保存修改')
  } else {
    noteStore.addNote(draft.value)
    toast.success('新笔记已保存')
  }
  modalOpen.value = false
}

function remove(n: NoteItem) {
  if (!confirm(`确定删除「${n.title}」吗？`)) return
  noteStore.removeNote(n.id)
  toast.info('已删除')
}

function countOf(c: NoteCategory | '全部' | '收藏') {
  if (c === '全部') return noteStore.notes.length
  if (c === '收藏') return noteStore.notes.filter((n) => n.favorite).length
  return noteStore.notes.filter((n) => n.category === c).length
}

const catColor: Record<NoteCategory, string> = {
  教学反思: 'bg-sakura-100 text-sakura-500',
  班会记录: 'bg-mint-100 text-mint-500',
  学习资料: 'bg-sky2-100 text-sky2-500',
  其他: 'bg-butter-100 text-butter-600',
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <Search
          class="absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-300"
          :size="16"
        />
        <input
          v-model="search"
          class="input-soft !pl-10"
          placeholder="搜索笔记标题或内容..."
        >
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn-secondary"
          @click="activeCat = '收藏'"
        >
          <Star :size="16" /> 收藏 ({{ countOf('收藏') }})
        </button>
        <button
          class="btn-primary"
          @click="openCreate"
        >
          <Plus :size="16" /> 新建笔记
        </button>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="c in ['全部', ...categories, '收藏']"
        :key="c"
        class="chip border transition"
        :class="
          activeCat === c
            ? 'bg-cocoa-900 text-cream-50 border-cocoa-900'
            : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
        "
        @click="activeCat = c as any"
      >
        {{ c }} ({{ countOf(c as any) }})
      </button>
    </div>

    <!-- 笔记列表 -->
    <div
      v-if="filtered.length"
      class="grid md:grid-cols-2 gap-4"
    >
      <article
        v-for="n in filtered"
        :key="n.id"
        class="card-soft p-5 group relative hover:-translate-y-0.5 transition cursor-pointer"
        @click="openEdit(n)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="chip text-[10px]"
              :class="catColor[n.category]"
            >
              {{ n.category }}
            </span>
            <span
              v-if="n.pinned"
              class="chip bg-sakura-100 text-sakura-500 text-[10px]"
            >
              <Pin :size="10" /> 已置顶
            </span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              class="p-1.5 rounded-full hover:bg-butter-100"
              :title="n.pinned ? '取消置顶' : '置顶'"
              @click.stop="noteStore.togglePinned(n.id)"
            >
              <component
                :is="n.pinned ? PinOff : Pin"
                :size="14"
              />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-butter-100"
              :title="n.favorite ? '取消收藏' : '收藏'"
              @click.stop="noteStore.toggleFavorite(n.id)"
            >
              <component
                :is="Star"
                :size="14"
                :class="n.favorite ? 'fill-butter-500 text-butter-500' : ''"
              />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-sakura-100"
              title="删除"
              @click.stop="remove(n)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        <h3 class="title-display text-lg mt-2.5 line-clamp-1">
          {{ n.title }}
        </h3>
        <p class="text-sm text-cocoa-500 mt-1.5 line-clamp-3 whitespace-pre-wrap">
          {{ n.content }}
        </p>
        <div class="flex items-center justify-between mt-3 text-[11px] text-cocoa-300">
          <span>更新于 {{ formatDate(n.updatedAt) }}</span>
          <span class="flex items-center gap-1">
            <component
              :is="Star"
              v-if="n.favorite"
              :size="12"
              class="fill-butter-500 text-butter-500"
            />
          </span>
        </div>
      </article>
    </div>
    <EmptyState
      v-else
      title="还没有笔记哦"
      desc="记下每一个让你心动的教学瞬间"
      icon="📒"
    >
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="16" /> 写第一篇
      </button>
    </EmptyState>

    <Modal
      :open="modalOpen"
      :title="editing ? '编辑笔记' : '新建笔记'"
      width="640px"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">标题</label>
          <input
            v-model="draft.title"
            class="input-soft mt-1"
            placeholder="给笔记起个名字"
            maxlength="60"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">分类</label>
          <div class="mt-1 flex gap-2 flex-wrap">
            <button
              v-for="c in categories"
              :key="c"
              class="chip border transition"
              :class="
                draft.category === c
                  ? 'bg-cocoa-900 text-cream-50 border-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="draft.category = c"
            >
              {{ c }}
            </button>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-cocoa-500 ml-1">内容</label>
            <div class="flex items-center gap-1 bg-cream-100 rounded-full p-0.5">
              <button
                class="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition"
                :class="!previewMode ? 'bg-white text-cocoa-900 shadow-sm' : 'text-cocoa-500'"
                @click="previewMode = false"
              >
                <Pencil :size="12" /> 编辑
              </button>
              <button
                class="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition"
                :class="previewMode ? 'bg-white text-cocoa-900 shadow-sm' : 'text-cocoa-500'"
                @click="previewMode = true"
              >
                <Eye :size="12" /> 预览
              </button>
            </div>
          </div>
          <textarea
            v-if="!previewMode"
            v-model="draft.content"
            class="input-soft mt-1 min-h-[260px] leading-relaxed"
            placeholder="把今天想说的写下来吧...（支持 Markdown 语法）"
          />
          <div
            v-else
            class="note-md mt-1 min-h-[260px] max-h-[360px] overflow-y-auto card-flat p-4"
            v-html="renderMarkdownToHtml(draft.content || '')"
          />
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="modalOpen = false"
        >
          <X :size="16" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="save"
        >
          <Save :size="16" /> 保存
        </button>
      </template>
    </Modal>
  </div>
</template>

<style>
/* 笔记 Markdown 预览样式 (非 scoped, 作用于 v-html 内容) */
.note-md {
  line-height: 1.75;
  color: #5b4636;
  font-size: 14px;
  word-break: break-word;
}
.note-md > :first-child { margin-top: 0; }
.note-md > :last-child { margin-bottom: 0; }
.note-md h1 { font-size: 20px; font-weight: 700; margin: 18px 0 10px; }
.note-md h2 { font-size: 17px; font-weight: 700; margin: 16px 0 8px; }
.note-md h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
.note-md p { margin: 8px 0; white-space: pre-wrap; }
.note-md ul { list-style: disc; padding-left: 22px; margin: 8px 0; }
.note-md ol { list-style: decimal; padding-left: 22px; margin: 8px 0; }
.note-md li { margin: 4px 0; }
.note-md a { color: #c2699b; text-decoration: underline; }
.note-md code {
  background: #f3ece2;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 13px;
}
.note-md pre {
  background: #f3ece2;
  padding: 12px 14px;
  border-radius: 8px;
  overflow: auto;
  margin: 10px 0;
}
.note-md pre code { background: none; padding: 0; }
.note-md blockquote {
  border-left: 4px solid #e9d9c3;
  margin: 10px 0;
  padding: 4px 14px;
  color: #8a7866;
  background: #faf6f0;
  border-radius: 0 8px 8px 0;
}
.note-md table { border-collapse: collapse; width: 100%; margin: 10px 0; }
.note-md th, .note-md td { border: 1px solid #e4d8c8; padding: 6px 10px; text-align: left; }
.note-md hr { border: none; border-top: 1px solid #ece3d6; margin: 14px 0; }
.note-md strong { font-weight: 700; color: #4a3a2e; }
</style>
