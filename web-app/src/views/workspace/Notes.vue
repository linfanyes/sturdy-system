<script setup lang="ts">
/**
 * 笔记页面：支持创建、编辑、删除、搜索、分类筛选。
 */
import { ref, computed, onMounted } from 'vue'
import { StickyNote, Plus, Search, Edit3, Trash2, Loader2, Tag, X } from 'lucide-vue-next'
import request from '@/api/request'

interface Note {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  updatedAt: string
  createdAt: string
}

const CATEGORIES = ['教学反思', '会议记录', '学习笔记', '其他']
const TAG_OPTIONS = ['重要', '待办', '灵感', '复习']

const loading = ref(true)
const notes = ref<Note[]>([])
const errorMsg = ref('')
const keyword = ref('')
const categoryFilter = ref('')

// 编辑/新增表单
const showForm = ref(false)
const editing = ref<Note | null>(null)
const formTitle = ref('')
const formContent = ref('')
const formCategory = ref('')
const formTags = ref<string[]>([])
const formLoading = ref(false)

/** 过滤后的笔记 */
const filteredNotes = computed(() => {
  let list = notes.value
  if (categoryFilter.value) {
    list = list.filter(n => n.category === categoryFilter.value)
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(
      n =>
        n.title.toLowerCase().includes(kw) ||
        (n.content && n.content.toLowerCase().includes(kw)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(kw))),
    )
  }
  return list
})

/** 时间格式化 */
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const dt = new Date(dateStr)
  const diff = Date.now() - dt.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return dt.toLocaleDateString('zh-CN')
}

/** 分类颜色 */
function categoryClass(cat: string): string {
  const map: Record<string, string> = {
    '教学反思': 'bg-sakura-100 text-sakura-600',
    '会议记录': 'bg-sky2-100 text-sky2-600',
    '学习笔记': 'bg-mint-100 text-mint-600',
    '其他': 'bg-cream-200 text-cocoa-600',
  }
  return map[cat] || 'bg-cream-200 text-cocoa-600'
}

/** 加载笔记列表 */
async function loadNotes() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await request.get('/notes', { params: { take: 500 } })
    notes.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    errorMsg.value = e?.message || '加载笔记失败'
    notes.value = []
  } finally {
    loading.value = false
  }
}

/** 打开新增 */
function openCreate() {
  editing.value = null
  formTitle.value = ''
  formContent.value = ''
  formCategory.value = ''
  formTags.value = []
  showForm.value = true
}

/** 打开编辑 */
function openEdit(note: Note) {
  editing.value = note
  formTitle.value = note.title
  formContent.value = note.content || ''
  formCategory.value = note.category || ''
  formTags.value = [...(note.tags || [])]
  showForm.value = true
}

/** 切换标签 */
function toggleTag(tag: string) {
  const idx = formTags.value.indexOf(tag)
  if (idx >= 0) {
    formTags.value.splice(idx, 1)
  } else {
    formTags.value.push(tag)
  }
}

/** 提交表单 */
async function submitForm() {
  if (!formTitle.value.trim()) {
    errorMsg.value = '请输入笔记标题'
    return
  }
  formLoading.value = true
  errorMsg.value = ''
  try {
    const body = {
      title: formTitle.value.trim(),
      content: formContent.value.trim(),
      category: formCategory.value || '其他',
      tags: formTags.value,
    }
    if (editing.value) {
      const res = await request.patch(`/notes/${editing.value.id}`, body)
      const idx = notes.value.findIndex(n => n.id === editing.value!.id)
      if (idx >= 0) notes.value[idx] = { ...notes.value[idx], ...body, ...res }
    } else {
      const res = await request.post('/notes', body)
      if (res?.id) {
        notes.value.unshift(res)
      } else {
        await loadNotes()
      }
    }
    showForm.value = false
  } catch (e: any) {
    errorMsg.value = e?.message || '保存失败'
  } finally {
    formLoading.value = false
  }
}

/** 删除笔记 */
async function deleteNote(note: Note) {
  if (!await confirm('确定删除该笔记？')) return
  try {
    await request.delete(`/notes/${note.id}`)
    notes.value = notes.value.filter(n => n.id !== note.id)
  } catch (e: any) {
    errorMsg.value = e?.message || '删除失败'
  }
}

onMounted(() => {
  loadNotes()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <StickyNote class="w-6 h-6 text-butter-500" /> 笔记
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 transition-colors text-sm font-medium shadow-sm"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" /> 新建笔记
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- 搜索和筛选 -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
        <input
          v-model="keyword"
          placeholder="搜索标题、内容、标签…"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
        />
      </div>
      <div class="flex gap-1.5">
        <button
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !categoryFilter
              ? 'bg-butter-500 text-white'
              : 'bg-white text-cocoa-600 border border-cream-200 hover:bg-cream-50',
          ]"
          @click="categoryFilter = ''"
        >全部</button>
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            categoryFilter === cat
              ? 'bg-butter-500 text-white'
              : 'bg-white text-cocoa-600 border border-cream-200 hover:bg-cream-50',
          ]"
          @click="categoryFilter = categoryFilter === cat ? '' : cat"
        >{{ cat }}</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" />
      加载中…
    </div>

    <!-- 空状态 -->
    <div v-else-if="!filteredNotes.length" class="text-center py-16 text-cocoa-400">
      <StickyNote class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
      <p class="text-lg">{{ keyword || categoryFilter ? '未找到匹配的笔记' : '暂无笔记' }}</p>
      <p v-if="!keyword && !categoryFilter" class="text-sm mt-1">点击"新建笔记"开始记录</p>
    </div>

    <!-- 笔记卡片网格 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="bg-white rounded-2xl p-5 shadow-softer border border-cream-200 hover:shadow-soft transition-all group"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <span :class="['px-2 py-0.5 rounded-md text-xs font-medium shrink-0', categoryClass(note.category)]">
              {{ note.category }}
            </span>
            <h3 class="font-semibold text-cocoa-900 truncate">{{ note.title }}</h3>
          </div>
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="p-1 rounded-lg hover:bg-cream-100 text-cocoa-400 hover:text-butter-500 transition-colors"
              title="编辑"
              @click="openEdit(note)"
            >
              <Edit3 class="w-3.5 h-3.5" />
            </button>
            <button
              class="p-1 rounded-lg hover:bg-red-50 text-cocoa-400 hover:text-red-500 transition-colors"
              title="删除"
              @click="deleteNote(note)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div v-if="note.content" class="text-sm text-cocoa-500 line-clamp-3 mb-3 whitespace-pre-line">
          {{ note.content }}
        </div>
        <div class="flex items-center justify-between">
          <div v-if="note.tags && note.tags.length" class="flex flex-wrap gap-1">
            <span
              v-for="tag in note.tags"
              :key="tag"
              class="px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-500 text-xs flex items-center gap-1"
            >
              <Tag class="w-2.5 h-2.5" /> {{ tag }}
            </span>
          </div>
          <span class="text-xs text-cocoa-400 ml-auto">{{ formatTime(note.updatedAt || note.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑/新增对话框（内联遮罩） -->
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/30 backdrop-blur-sm"
        @click.self="showForm = false"
      >
        <div class="bg-white rounded-2xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-cream-200">
            <h3 class="text-lg font-semibold text-cocoa-900">
              {{ editing ? '编辑笔记' : '新建笔记' }}
            </h3>
            <button class="p-1 rounded-lg hover:bg-cream-100 text-cocoa-400" @click="showForm = false">
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="text-sm text-cocoa-500 font-medium">标题 <span class="text-sakura-500">*</span></label>
              <input
                v-model="formTitle"
                placeholder="笔记标题"
                class="w-full mt-1 px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label class="text-sm text-cocoa-500 font-medium">分类</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <button
                  v-for="cat in CATEGORIES"
                  :key="cat"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    formCategory === cat
                      ? 'bg-butter-500 text-white'
                      : 'bg-white text-cocoa-600 border border-cream-200 hover:bg-cream-50',
                  ]"
                  @click="formCategory = formCategory === cat ? '' : cat"
                >{{ cat }}</button>
              </div>
            </div>
            <div>
              <label class="text-sm text-cocoa-500 font-medium">内容</label>
              <textarea
                v-model="formContent"
                rows="6"
                placeholder="笔记内容…"
                class="w-full mt-1 px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-white transition-colors resize-none"
              />
            </div>
            <div>
              <label class="text-sm text-cocoa-500 font-medium">标签</label>
              <div class="flex flex-wrap gap-2 mt-1">
                <button
                  v-for="tag in TAG_OPTIONS"
                  :key="tag"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    formTags.includes(tag)
                      ? 'bg-butter-500 text-white'
                      : 'bg-white text-cocoa-600 border border-cream-200 hover:bg-cream-50',
                  ]"
                  @click="toggleTag(tag)"
                >{{ tag }}</button>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-cream-200">
            <button
              class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100 text-sm transition-colors"
              @click="showForm = false"
            >取消</button>
            <button
              class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50 text-sm transition-colors"
              :disabled="formLoading"
              @click="submitForm"
            >
              {{ formLoading ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>