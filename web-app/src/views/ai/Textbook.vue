<script setup lang="ts">
/**
 * 教师端教材知识库浏览：按学科/年级筛选 + 关键词检索 + 树形展开
 * 与家长端类似，但教师无 studentName，且复用学校公共教材库
 */
import { ref, onMounted } from 'vue'
import { BookOpen, ChevronRight, ChevronDown, Search, Loader2, X, Download } from 'lucide-vue-next'
import { getTextbookTree, searchKnowledgePoints, type TextbookTreeNode, type KnowledgePointSearchResult } from '@/api/textbook'
import { downloadText } from '@/utils/download'

const loading = ref(false)
const tree = ref<TextbookTreeNode[]>([])
const expandedTextbooks = ref<Set<string>>(new Set())
const expandedUnits = ref<Set<string>>(new Set())
const filterSubject = ref('')
const filterGrade = ref('')
const searchKeyword = ref('')
const searchResults = ref<KnowledgePointSearchResult[]>([])
const searching = ref(false)

async function load() {
  loading.value = true
  try {
    tree.value = await getTextbookTree({ subject: filterSubject.value || undefined, grade: filterGrade.value || undefined })
  } catch { tree.value = [] }
  finally { loading.value = false }
}
onMounted(load)

function toggleTextbook(id: string) {
  const s = new Set(expandedTextbooks.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedTextbooks.value = s
}
function toggleUnit(id: string) {
  const s = new Set(expandedUnits.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedUnits.value = s
}
async function doSearch() {
  if (!searchKeyword.value.trim()) { searchResults.value = []; return }
  searching.value = true
  try { searchResults.value = await searchKnowledgePoints(searchKeyword.value.trim()) }
  catch { searchResults.value = [] }
  finally { searching.value = false }
}
function clearSearch() { searchKeyword.value = ''; searchResults.value = [] }

const SUBJECTS = ['语文', '数学', '英语']
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

/** 导出整本教材为 Word */
function exportTextbook(t: TextbookTreeNode) {
  const parts: string[] = [t.name, `（${t.publisher} · ${t.grade}${t.subject}${t.term}）`, '']
  for (const u of (t.units || [])) {
    parts.push(`\n【${u.title}】`)
    if (u.summary) parts.push(u.summary)
    for (const p of (u.knowledgePoints || [])) {
      parts.push(`\n  ${p.title} [${p.type}${p.difficulty ? '/' + p.difficulty : ''}]`)
      parts.push(`  ${p.content}`)
    }
  }
  downloadText(parts.join('\n'), t.name, 'doc')
}
</script>

<template>
  <div class="space-y-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BookOpen class="w-6 h-6 text-butter-500" /> 教材知识库
    </h1>

    <div class="bg-white rounded-2xl p-4 shadow-softer">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="searchKeyword" @keyup.enter="doSearch" placeholder="搜索知识点（如：多音字、分数加减）" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="searching" @click="doSearch">
          <component :is="searching ? Loader2 : Search" class="w-4 h-4" :class="searching ? 'animate-spin' : ''" />
        </button>
        <button v-if="searchKeyword" class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="clearSearch"><X class="w-4 h-4" /></button>
      </div>
    </div>

    <div v-if="searchResults.length" class="bg-white rounded-2xl p-5 shadow-softer">
      <div class="text-sm font-medium text-cocoa-700 mb-3">🔍 搜索结果（{{ searchResults.length }} 条）</div>
      <div class="space-y-2">
        <div v-for="r in searchResults" :key="r.id" class="border border-cream-200 rounded-xl p-3">
          <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5 flex-wrap">
            {{ r.title }}
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-butter-100 text-butter-700">{{ r.type }}</span>
            <span v-if="r.difficulty" class="text-[10px] px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600">{{ r.difficulty }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ r.textbookName }}</span>
          </div>
          <div class="text-xs text-cocoa-600 mt-1 whitespace-pre-wrap">{{ r.content }}</div>
        </div>
      </div>
    </div>

    <template v-if="!searchKeyword">
      <div class="flex flex-wrap gap-2">
        <button v-for="s in ['', ...SUBJECTS]" :key="s" :class="['px-3 py-1.5 rounded-full text-sm border transition-colors', filterSubject === s ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']" @click="filterSubject = s; load()">
          {{ s || '全部学科' }}
        </button>
        <span class="w-px bg-cream-200 mx-1"></span>
        <button v-for="g in ['', ...GRADES]" :key="g" :class="['px-3 py-1.5 rounded-full text-sm border transition-colors', filterGrade === g ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']" @click="filterGrade = g; load()">
          {{ g || '全部年级' }}
        </button>
      </div>

      <div v-if="loading" class="text-cocoa-400 py-8 text-center">加载中…</div>
      <div v-else-if="!tree.length" class="bg-white rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无教材知识点，请联系学校管理员导入</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="t in tree" :key="t.id" class="bg-white rounded-2xl shadow-softer overflow-hidden">
          <div class="flex items-center gap-3 p-4 cursor-pointer hover:bg-cream-50" @click="toggleTextbook(t.id)">
            <component :is="expandedTextbooks.has(t.id) ? ChevronDown : ChevronRight" class="w-5 h-5 text-cocoa-400" />
            <div class="text-lg">{{ t.subject === '语文' ? '📜' : t.subject === '数学' ? '🔢' : t.subject === '英语' ? '🔤' : '📚' }}</div>
            <div class="flex-1">
              <div class="font-medium text-cocoa-900">{{ t.name }}</div>
              <div class="text-xs text-cocoa-400">{{ t.publisher }} · {{ t.grade }} · {{ t.term }} · {{ t.units?.length || 0 }} 单元</div>
            </div>
            <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="导出" @click.stop="exportTextbook(t)"><Download class="w-4 h-4" /></button>
          </div>
          <div v-if="expandedTextbooks.has(t.id)" class="border-t border-cream-100 bg-cream-50/50">
            <div v-if="!t.units?.length" class="px-6 py-4 text-sm text-cocoa-400">暂无单元</div>
            <div v-for="u in t.units" :key="u.id">
              <div class="flex items-center gap-3 px-6 py-2.5 cursor-pointer hover:bg-cream-100/50" @click="toggleUnit(u.id)">
                <component :is="expandedUnits.has(u.id) ? ChevronDown : ChevronRight" class="w-4 h-4 text-cocoa-400" />
                <div class="flex-1 text-sm text-cocoa-800">{{ u.title }}</div>
                <span v-if="u.knowledgePoints?.length" class="text-xs text-cocoa-400">{{ u.knowledgePoints.length }} 个知识点</span>
              </div>
              <div v-if="expandedUnits.has(u.id)" class="pl-12 pr-6 pb-3 space-y-1.5">
                <div v-if="!u.knowledgePoints?.length" class="text-xs text-cocoa-400 py-1">暂无知识点</div>
                <div v-for="p in u.knowledgePoints" :key="p.id" class="p-3 rounded-lg bg-white border border-cream-100">
                  <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5 flex-wrap">
                    {{ p.title }}
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-butter-100 text-butter-700">{{ p.type }}</span>
                    <span v-if="p.difficulty" class="text-[10px] px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600">{{ p.difficulty }}</span>
                  </div>
                  <div class="text-xs text-cocoa-600 mt-1 whitespace-pre-wrap leading-relaxed">{{ p.content }}</div>
                  <div v-if="p.keywords" class="text-[10px] text-cocoa-400 mt-1.5">🏷 {{ p.keywords }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
