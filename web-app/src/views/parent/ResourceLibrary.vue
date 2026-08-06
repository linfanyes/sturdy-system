<script setup lang="ts">
/**
 * 家长端专项资源库浏览：古诗词 / 数学公式 / 英语单词 三类
 * - 与教师端同一套 /resource-library 只读接口
 * - 家长按孩子学习需求展示全部三类（不按教师任课学科过滤）
 */
import { ref, computed, onMounted } from 'vue'
import { BookOpen, Calculator, Languages, Search, Loader2, X, ChevronDown, Filter, Copy, Printer } from 'lucide-vue-next'
import {
  listPoems, listFormulas, listWords, listWordCategories,
  type Poem, type MathFormula, type EnglishWord,
} from '@/api/resource-library'
import { useAuthStore } from '@/stores/auth'
import { copyText, printHtml, notify, escapeHtml } from '@/utils/copyPrint'

const auth = useAuthStore()

type Tab = 'poems' | 'formulas' | 'words'
const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'poems', label: '古诗词', icon: BookOpen },
  { key: 'formulas', label: '数学公式', icon: Calculator },
  { key: 'words', label: '英语单词', icon: Languages },
]
const tab = ref<Tab>('poems')

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const DYNASTIES = ['唐', '宋', '元', '明', '清', '汉', '南北朝', '魏晋', '先秦', '近现代']
const FORMULA_CATEGORIES = ['运算定律', '几何公式', '单位换算', '分数小数', '比例百分数', '思维方法']

// ============ 古诗词 ============
const poems = ref<Poem[]>([])
const poemsLoading = ref(false)
const poemGrade = ref('')
const poemDynasty = ref('')
const poemKeyword = ref('')
const expandedPoems = ref<Set<string>>(new Set())

async function loadPoems() {
  poemsLoading.value = true
  try {
    poems.value = await listPoems({
      grade: poemGrade.value || undefined,
      dynasty: poemDynasty.value || undefined,
      keyword: poemKeyword.value.trim() || undefined,
    })
  } catch { poems.value = [] }
  finally { poemsLoading.value = false }
}

function togglePoem(id: string) {
  const s = new Set(expandedPoems.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedPoems.value = s
}

// ============ 数学公式 ============
const formulas = ref<MathFormula[]>([])
const formulasLoading = ref(false)
const formulaCategory = ref('')
const formulaKeyword = ref('')

async function loadFormulas() {
  formulasLoading.value = true
  try {
    formulas.value = await listFormulas({
      category: formulaCategory.value || undefined,
      keyword: formulaKeyword.value.trim() || undefined,
    })
  } catch { formulas.value = [] }
  finally { formulasLoading.value = false }
}

// ============ 英语单词 ============
const words = ref<EnglishWord[]>([])
const wordCategories = ref<string[]>([])
const wordsLoading = ref(false)
const wordCategory = ref('')
const wordKeyword = ref('')

async function loadWords() {
  wordsLoading.value = true
  try {
    const [list, cats] = await Promise.all([
      listWords({
        category: wordCategory.value || undefined,
        keyword: wordKeyword.value.trim() || undefined,
      }),
      listWordCategories(),
    ])
    words.value = list
    wordCategories.value = cats?.length ? cats : []
  } catch {
    words.value = []
    wordCategories.value = []
  }
  finally { wordsLoading.value = false }
}

// 单词按分类分组
const groupedWords = computed(() => {
  const map: Record<string, EnglishWord[]> = {}
  for (const w of words.value) {
    const k = w.category || '其他'
    ;(map[k] ||= []).push(w)
  }
  if (!wordCategory.value && wordCategories.value.length) {
    const ordered: Record<string, EnglishWord[]> = {}
    for (const c of wordCategories.value) if (map[c]) ordered[c] = map[c]
    for (const k of Object.keys(map)) if (!ordered[k]) ordered[k] = map[k]
    return ordered
  }
  return map
})

// ============ 切换标签页时按需加载 ============
const loadedTabs = ref<Set<Tab>>(new Set())
async function switchTab(t: Tab) {
  tab.value = t
  if (loadedTabs.value.has(t)) return
  loadedTabs.value.add(t)
  if (t === 'poems') await loadPoems()
  else if (t === 'formulas') await loadFormulas()
  else await loadWords()
}

onMounted(() => {
  const t = tab.value
  loadedTabs.value.add(t)
  if (t === 'poems') loadPoems()
  else if (t === 'formulas') loadFormulas()
  else loadWords()
})

// 朝代颜色映射
const dynastyColor: Record<string, string> = {
  '唐': 'bg-butter-50 border-butter-200',
  '宋': 'bg-mint-50 border-mint-200',
  '元': 'bg-cream-100 border-cream-200',
  '明': 'bg-sky2-50 border-sky2-100',
  '清': 'bg-sakura-50 border-sakura-100',
}
function dynastyTag(d: string) {
  return dynastyColor[d] || 'bg-cream-100 border-cream-200'
}

// ============ 复制 / 打印 ============
function poemText(p: Poem) {
  let t = `《${p.title}》[${p.dynasty}] ${p.author}${p.grade ? ' · ' + p.grade : ''}\n\n${p.content}`
  if (p.translation) t += `\n\n译文：\n${p.translation}`
  if (p.appreciation) t += `\n\n赏析：\n${p.appreciation}`
  return t
}
function poemHtml(p: Poem) {
  const br = (s: string) => escapeHtml(s).replace(/\n/g, '<br>')
  return `<div class="item"><div class="poem"><strong>《${escapeHtml(p.title)}》</strong> [${escapeHtml(p.dynasty)}] ${escapeHtml(p.author)}${p.grade ? ' · ' + escapeHtml(p.grade) : ''}<br>${br(p.content)}</div>${p.translation ? `<div class="ex">译文：${br(p.translation)}</div>` : ''}${p.appreciation ? `<div class="ex">赏析：${br(p.appreciation)}</div>` : ''}</div>`
}
async function copyPoem(p: Poem) {
  const ok = await copyText(poemText(p))
  notify(ok ? '已复制该诗词' : '复制失败', ok ? 'success' : 'error')
}
function printPoem(p: Poem) {
  printHtml(`古诗词 · ${p.title}`, poemHtml(p))
}

function formulaText(f: MathFormula) {
  let t = `${f.title}（${f.category}）\n${f.formula}`
  if (f.explanation) t += `\n说明：${f.explanation}`
  if (f.example) t += `\n例：${f.example}`
  return t
}
function formulaHtml(f: MathFormula) {
  return `<div class="item"><div><strong>${escapeHtml(f.title)}</strong> <span class="meta">${escapeHtml(f.category)}</span></div><div class="formula">${escapeHtml(f.formula)}</div>${f.explanation ? `<div class="ex">${escapeHtml(f.explanation)}</div>` : ''}${f.example ? `<div class="meta">例：${escapeHtml(f.example)}</div>` : ''}</div>`
}
async function copyFormula(f: MathFormula) {
  const ok = await copyText(formulaText(f))
  notify(ok ? '已复制该公式' : '复制失败', ok ? 'success' : 'error')
}
function printFormula(f: MathFormula) {
  printHtml(`数学公式 · ${f.title}`, formulaHtml(f))
}

function categoryText(cat: string, list: EnglishWord[]) {
  let t = `英语单词 · ${cat}\n`
  for (const w of list) {
    t += `\n${w.word}${w.phonetic ? ' /' + w.phonetic + '/' : ''}  ${w.meaning}`
    if (w.example) t += `\n  e.g. ${w.example}`
  }
  return t
}
function categoryHtml(cat: string, list: EnglishWord[]) {
  const items = list
    .map((w) => `<div class="item"><span class="word">${escapeHtml(w.word)}</span>${w.phonetic ? `<span class="ph">/${escapeHtml(w.phonetic)}/</span>` : ''}<div class="mean">${escapeHtml(w.meaning)}</div>${w.example ? `<div class="ex">e.g. ${escapeHtml(w.example)}</div>` : ''}</div>`)
    .join('')
  return `<h1>英语单词 · ${escapeHtml(cat)}</h1><div class="grp">${items}</div>`
}
async function copyCategory(cat: string, list: EnglishWord[]) {
  const ok = await copyText(categoryText(cat, list))
  notify(ok ? `已复制「${cat}」全部单词` : '复制失败', ok ? 'success' : 'error')
}
function printCategory(cat: string, list: EnglishWord[]) {
  printHtml(`英语单词 · ${cat}`, categoryHtml(cat, list))
}

const studentName = computed(() => auth.user?.studentName || '')
</script>

<template>
  <div class="space-y-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BookOpen class="w-6 h-6 text-butter-500" /> 专项资源库
      <span v-if="studentName" class="text-base font-normal text-cocoa-400">{{ studentName }}同学家长</span>
    </h1>

    <!-- 标签页 -->
    <div class="flex gap-2 border-b border-cream-200">
      <button
        v-for="t in tabs" :key="t.key"
        :class="['flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 transition-colors', tab === t.key ? 'border-butter-500 text-butter-600 font-medium' : 'border-transparent text-cocoa-500 hover:text-cocoa-700']"
        @click="switchTab(t.key)"
      >
        <component :is="t.icon" class="w-4 h-4" /> {{ t.label }}
      </button>
    </div>

    <!-- ============ 古诗词 ============ -->
    <template v-if="tab === 'poems'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="poemKeyword" @keyup.enter="loadPoems" placeholder="搜索诗词标题、作者或关键字" class="w-full pl-9 pr-9 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          <button v-if="poemKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-300 hover:text-cocoa-500" @click="poemKeyword = ''; loadPoems()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />年级</span>
          <button v-for="g in ['', ...GRADES]" :key="g"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', poemGrade === g ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="poemGrade = g; loadPoems()">{{ g || '全部' }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />朝代</span>
          <button v-for="d in ['', ...DYNASTIES]" :key="d"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', poemDynasty === d ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="poemDynasty = d; loadPoems()">{{ d || '全部' }}</button>
        </div>
      </div>

      <div v-if="poemsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!poems.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无古诗词</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="p in poems" :key="p.id"
          class="bg-gradient-to-br from-cream-50 to-white rounded-2xl border border-cream-200 shadow-softer overflow-hidden hover:shadow-md transition-shadow">
          <div class="p-4 cursor-pointer" @click="togglePoem(p.id)">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-cocoa-900 text-lg leading-tight">{{ p.title }}</div>
                <div class="text-xs text-cocoa-500 mt-1 flex items-center gap-2">
                  <span :class="['px-1.5 py-0.5 rounded-full text-xs border', dynastyTag(p.dynasty)]">{{ p.dynasty }}</span>
                  <span>{{ p.author }}</span>
                  <span v-if="p.grade" class="text-cocoa-400">· {{ p.grade }}</span>
                </div>
              </div>
              <ChevronDown class="w-4 h-4 text-cocoa-300 shrink-0 transition-transform" :class="expandedPoems.has(p.id) ? 'rotate-180' : ''" />
            </div>
            <div class="mt-3 text-sm text-cocoa-700 leading-relaxed whitespace-pre-line font-serif">{{ p.content }}</div>
          </div>
          <div v-if="expandedPoems.has(p.id)" class="border-t border-cream-100 bg-cream-50/40 px-4 py-3 space-y-2">
            <div v-if="p.translation">
              <div class="text-xs font-medium text-mint-600 mb-0.5">📖 译文</div>
              <div class="text-sm text-cocoa-700 leading-relaxed whitespace-pre-line">{{ p.translation }}</div>
            </div>
            <div v-if="p.appreciation">
              <div class="text-xs font-medium text-butter-600 mb-0.5">💡 赏析</div>
              <div class="text-sm text-cocoa-600 leading-relaxed whitespace-pre-line">{{ p.appreciation }}</div>
            </div>
            <div v-if="p.keywords" class="text-xs text-cocoa-400 pt-1">🏷 {{ p.keywords }}</div>
          </div>
          <div class="flex items-center gap-4 px-4 py-2 border-t border-cream-100 bg-cream-50/40">
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click.stop="copyPoem(p)"><Copy class="w-3.5 h-3.5" /> 复制</button>
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click.stop="printPoem(p)"><Printer class="w-3.5 h-3.5" /> 打印</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 数学公式 ============ -->
    <template v-if="tab === 'formulas'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="formulaKeyword" @keyup.enter="loadFormulas" placeholder="搜索公式标题或关键字" class="w-full pl-9 pr-9 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          <button v-if="formulaKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-300 hover:text-cocoa-500" @click="formulaKeyword = ''; loadFormulas()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />类别</span>
          <button v-for="c in ['', ...FORMULA_CATEGORIES]" :key="c"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', formulaCategory === c ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="formulaCategory = c; loadFormulas()">{{ c || '全部' }}</button>
        </div>
      </div>

      <div v-if="formulasLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!formulas.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Calculator class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无数学公式</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="f in formulas" :key="f.id" class="bg-surface rounded-2xl border border-cream-200 shadow-softer p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-medium text-cocoa-900">{{ f.title }}</div>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600 border border-sky2-100">{{ f.category }}</span>
                <span v-if="f.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ f.grade }}</span>
              </div>
              <div class="mt-2 px-3 py-2 rounded-xl bg-cream-50 border border-cream-100 text-cocoa-900 font-mono text-base tracking-wide">{{ f.formula }}</div>
              <div v-if="f.explanation" class="mt-2 text-sm text-cocoa-600 leading-relaxed">{{ f.explanation }}</div>
              <div v-if="f.example" class="mt-1.5 text-xs text-cocoa-500 leading-relaxed">📝 例：{{ f.example }}</div>
            </div>
          </div>
          <div v-if="f.keywords" class="text-xs text-cocoa-400 mt-2">🏷 {{ f.keywords }}</div>
          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-cream-100">
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="copyFormula(f)"><Copy class="w-3.5 h-3.5" /> 复制</button>
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="printFormula(f)"><Printer class="w-3.5 h-3.5" /> 打印</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 英语单词 ============ -->
    <template v-if="tab === 'words'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="wordKeyword" @keyup.enter="loadWords" placeholder="搜索单词或释义" class="w-full pl-9 pr-9 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          <button v-if="wordKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-300 hover:text-cocoa-500" @click="wordKeyword = ''; loadWords()"><X class="w-4 h-4" /></button>
        </div>
        <div v-if="wordCategories.length" class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />分类</span>
          <button v-for="c in ['', ...wordCategories]" :key="c"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', wordCategory === c ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="wordCategory = c; loadWords()">{{ c || '全部' }}</button>
        </div>
      </div>

      <div v-if="wordsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!words.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Languages class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无英语单词</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="(list, cat) in groupedWords" :key="cat" class="bg-surface rounded-2xl border border-cream-200 shadow-softer overflow-hidden">
          <div class="px-4 py-2.5 bg-cream-50/60 border-b border-cream-100 flex items-center justify-between">
            <div class="font-medium text-cocoa-800 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-butter-400"></span>
              {{ cat }}
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-cocoa-400">{{ list.length }} 词</span>
              <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="copyCategory(cat, list)"><Copy class="w-3.5 h-3.5" /> 复制</button>
              <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="printCategory(cat, list)"><Printer class="w-3.5 h-3.5" /> 打印</button>
            </div>
          </div>
          <div class="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div v-for="w in list" :key="w.id" class="px-3 py-2 rounded-xl border border-cream-100 hover:bg-cream-50 transition-colors">
              <div class="flex items-baseline justify-between gap-2">
                <div class="font-medium text-cocoa-900 text-base">{{ w.word }}</div>
                <div v-if="w.phonetic" class="text-xs text-mint-600 font-mono">/{{ w.phonetic }}/</div>
              </div>
              <div class="text-sm text-cocoa-600 mt-0.5">{{ w.meaning }}</div>
              <div v-if="w.example" class="text-xs text-cocoa-400 mt-1 italic leading-relaxed">e.g. {{ w.example }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>