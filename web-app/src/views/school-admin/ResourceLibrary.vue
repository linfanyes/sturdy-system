<script setup lang="ts">
/**
 * 校管教学资源库管理：古诗词 / 数学公式 / 英语单词 三类 CRUD + 一键初始化
 */
import { ref, onMounted } from 'vue'
import { BookOpen, Calculator, Languages, FlaskConical, Scale, Plus, Edit2, Trash2, Search, Loader2, X, Database, Copy, Printer } from 'lucide-vue-next'
import {
  adminListPoems, adminCreatePoem, adminUpdatePoem, adminDeletePoem,
  adminListFormulas, adminCreateFormula, adminUpdateFormula, adminDeleteFormula,
  adminListWords, adminCreateWord, adminUpdateWord, adminDeleteWord,
  adminListScience, adminCreateScience, adminUpdateScience, adminDeleteScience,
  adminListMoral, adminCreateMoral, adminUpdateMoral, adminDeleteMoral,
  seedDefaultResources,
  type Poem, type MathFormula, type EnglishWord, type ScienceResource, type MoralResource,
} from '@/api/resource-library'
import { copyText, printHtml, notify, escapeHtml } from '@/utils/copyPrint'
import { toast } from '@/utils/feedback'

type Tab = 'poems' | 'formulas' | 'words' | 'science' | 'moral'
const tab = ref<Tab>('poems')
const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'poems', label: '古诗词', icon: BookOpen },
  { key: 'formulas', label: '数学公式', icon: Calculator },
  { key: 'words', label: '英语单词', icon: Languages },
  { key: 'science', label: '科学', icon: FlaskConical },
  { key: 'moral', label: '道德与法治', icon: Scale },
]

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const DYNASTIES = ['唐', '宋', '元', '明', '清', '汉', '南北朝', '魏晋', '先秦', '近现代']
const FORMULA_CATEGORIES = ['运算定律', '几何公式', '单位换算', '分数小数', '比例百分数', '思维方法']
const WORD_CATEGORIES = ['季节', '食物', '水果', '数字', '颜色', '动物', '身体', '家庭', '衣物', '交通']
const SCIENCE_CATEGORIES = ['物质科学', '生命科学', '地球与宇宙', '技术与工程']
const MORAL_CATEGORIES = ['个人品德', '家庭美德', '社会公德', '国家情怀']

// ============ 一键初始化 ============
const seeding = ref(false)
async function doSeedDefaults() {
  if (!await confirm('将初始化预置资源库（含古诗词、数学公式、英语分类单词）。已存在的同标题条目将自动跳过。是否继续？')) return
  seeding.value = true
  try {
    const res = await seedDefaultResources()
    toast.success(`初始化完成：古诗词新增 ${res.poems.created}（跳过 ${res.poems.skipped}），数学公式新增 ${res.formulas.created}（跳过 ${res.formulas.skipped}），英语单词新增 ${res.words.created}（跳过 ${res.words.skipped}），科学新增 ${res.science.created}（跳过 ${res.science.skipped}），道德与法治新增 ${res.moral.created}（跳过 ${res.moral.skipped}）。`)
    await reloadCurrent()
  } catch (e: any) {
    toast.error(e?.message || '初始化失败')
  } finally {
    seeding.value = false
  }
}

// ============ 古诗词 ============
const poems = ref<Poem[]>([])
const poemsLoading = ref(false)
const poemKeyword = ref('')

async function loadPoems() {
  poemsLoading.value = true
  try {
    poems.value = await adminListPoems({ keyword: poemKeyword.value.trim() || undefined })
  } catch { poems.value = [] }
  finally { poemsLoading.value = false }
}

// ============ 数学公式 ============
const formulas = ref<MathFormula[]>([])
const formulasLoading = ref(false)
const formulaKeyword = ref('')

async function loadFormulas() {
  formulasLoading.value = true
  try {
    formulas.value = await adminListFormulas({ keyword: formulaKeyword.value.trim() || undefined })
  } catch { formulas.value = [] }
  finally { formulasLoading.value = false }
}

// ============ 英语单词 ============
const words = ref<EnglishWord[]>([])
const wordsLoading = ref(false)
const wordKeyword = ref('')

async function loadWords() {
  wordsLoading.value = true
  try {
    words.value = await adminListWords({ keyword: wordKeyword.value.trim() || undefined })
  } catch { words.value = [] }
  finally { wordsLoading.value = false }
}

// ============ 科学资源 ============
const sciences = ref<ScienceResource[]>([])
const sciencesLoading = ref(false)
const scienceKeyword = ref('')

async function loadSciences() {
  sciencesLoading.value = true
  try {
    sciences.value = await adminListScience({ keyword: scienceKeyword.value.trim() || undefined })
  } catch { sciences.value = [] }
  finally { sciencesLoading.value = false }
}

// ============ 道德与法治资源 ============
const morals = ref<MoralResource[]>([])
const moralsLoading = ref(false)
const moralKeyword = ref('')

async function loadMorals() {
  moralsLoading.value = true
  try {
    morals.value = await adminListMoral({ keyword: moralKeyword.value.trim() || undefined })
  } catch { morals.value = [] }
  finally { moralsLoading.value = false }
}

// ============ 标签页切换 ============
const loadedTabs = ref<Set<Tab>>(new Set())
async function switchTab(t: Tab) {
  tab.value = t
  if (loadedTabs.value.has(t)) return
  loadedTabs.value.add(t)
  if (t === 'poems') await loadPoems()
  else if (t === 'formulas') await loadFormulas()
  else if (t === 'words') await loadWords()
  else if (t === 'science') await loadSciences()
  else await loadMorals()
}

async function reloadCurrent() {
  if (tab.value === 'poems') await loadPoems()
  else if (tab.value === 'formulas') await loadFormulas()
  else if (tab.value === 'words') await loadWords()
  else if (tab.value === 'science') await loadSciences()
  else await loadMorals()
}

onMounted(() => { loadedTabs.value.add('poems'); loadPoems() })

// ============ 编辑弹窗：通用 ============
const editing = ref<{ kind: Tab; mode: 'create' | 'edit'; data: any } | null>(null)

function editPoem(p?: Poem) {
  editing.value = {
    kind: 'poems',
    mode: p ? 'edit' : 'create',
    data: p ? { ...p } : { title: '', dynasty: '唐', author: '', content: '', translation: '', appreciation: '', grade: '三年级', keywords: '', sortOrder: 0, status: 'published' },
  }
}

function editFormula(f?: MathFormula) {
  editing.value = {
    kind: 'formulas',
    mode: f ? 'edit' : 'create',
    data: f ? { ...f } : { title: '', category: '运算定律', formula: '', explanation: '', example: '', grade: '三年级', keywords: '', sortOrder: 0, status: 'published' },
  }
}

function editWord(w?: EnglishWord) {
  editing.value = {
    kind: 'words',
    mode: w ? 'edit' : 'create',
    data: w ? { ...w } : { word: '', phonetic: '', meaning: '', category: '季节', example: '', grade: '三年级', sortOrder: 0, status: 'published' },
  }
}

function editScience(s?: ScienceResource) {
  editing.value = {
    kind: 'science',
    mode: s ? 'edit' : 'create',
    data: s ? { ...s } : { title: '', category: '物质科学', content: '', grade: '三年级', keywords: '', sortOrder: 0, status: 'published' },
  }
}

function editMoral(m?: MoralResource) {
  editing.value = {
    kind: 'moral',
    mode: m ? 'edit' : 'create',
    data: m ? { ...m } : { title: '', category: '个人品德', content: '', grade: '三年级', keywords: '', sortOrder: 0, status: 'published' },
  }
}

async function saveEdit() {
  if (!editing.value) return
  const { kind, mode, data } = editing.value
  try {
    if (kind === 'poems') {
      if (mode === 'create') await adminCreatePoem(data)
      else await adminUpdatePoem(data.id, data)
      await loadPoems()
    } else if (kind === 'formulas') {
      if (mode === 'create') await adminCreateFormula(data)
      else await adminUpdateFormula(data.id, data)
      await loadFormulas()
    } else if (kind === 'words') {
      if (mode === 'create') await adminCreateWord(data)
      else await adminUpdateWord(data.id, data)
      await loadWords()
    } else if (kind === 'science') {
      if (mode === 'create') await adminCreateScience(data)
      else await adminUpdateScience(data.id, data)
      await loadSciences()
    } else {
      if (mode === 'create') await adminCreateMoral(data)
      else await adminUpdateMoral(data.id, data)
      await loadMorals()
    }
    editing.value = null
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
}

async function removePoem(id: string) {
  if (!await confirm('确定删除该诗词？')) return
  try { await adminDeletePoem(id); await loadPoems() }
  catch (e: any) { toast.error(e?.message || '删除失败') }
}
async function removeFormula(id: string) {
  if (!await confirm('确定删除该公式？')) return
  try { await adminDeleteFormula(id); await loadFormulas() }
  catch (e: any) { toast.error(e?.message || '删除失败') }
}
async function removeWord(id: string) {
  if (!await confirm('确定删除该单词？')) return
  try { await adminDeleteWord(id); await loadWords() }
  catch (e: any) { toast.error(e?.message || '删除失败') }
}
async function removeScience(id: string) {
  if (!await confirm('确定删除该科学资源？')) return
  try { await adminDeleteScience(id); await loadSciences() }
  catch (e: any) { toast.error(e?.message || '删除失败') }
}
async function removeMoral(id: string) {
  if (!await confirm('确定删除该道德与法治资源？')) return
  try { await adminDeleteMoral(id); await loadMorals() }
  catch (e: any) { toast.error(e?.message || '删除失败') }
}

const inputCls = 'w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400'

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

function wordText(w: EnglishWord) {
  let t = `${w.word}${w.phonetic ? ' /' + w.phonetic + '/' : ''}  ${w.meaning}`
  if (w.example) t += `\n  e.g. ${w.example}`
  return t
}
function wordHtml(w: EnglishWord) {
  return `<div class="item"><span class="word">${escapeHtml(w.word)}</span>${w.phonetic ? `<span class="ph">/${escapeHtml(w.phonetic)}/</span>` : ''}<div class="mean">${escapeHtml(w.meaning)}</div>${w.example ? `<div class="ex">e.g. ${escapeHtml(w.example)}</div>` : ''}</div>`
}
async function copyWord(w: EnglishWord) {
  const ok = await copyText(wordText(w))
  notify(ok ? '已复制该单词' : '复制失败', ok ? 'success' : 'error')
}
function printWord(w: EnglishWord) {
  printHtml(`英语单词 · ${w.word}`, wordHtml(w))
}

// 科学
function scienceText(s: ScienceResource) {
  let t = `${s.title}（${s.category}）${s.grade ? ' · ' + s.grade : ''}`
  if (s.keywords) t += `\n关键词：${s.keywords}`
  t += `\n\n${s.content}`
  return t
}
function scienceHtml(s: ScienceResource) {
  return `<div class="item"><div><strong>${escapeHtml(s.title)}</strong> <span class="meta">${escapeHtml(s.category)}</span></div>${s.keywords ? `<div class="ex">关键词：${escapeHtml(s.keywords)}</div>` : ''}<div class="ex">${escapeHtml(s.content)}</div></div>`
}
async function copyScience(s: ScienceResource) {
  const ok = await copyText(scienceText(s))
  notify(ok ? '已复制该科学资源' : '复制失败', ok ? 'success' : 'error')
}
function printScience(s: ScienceResource) {
  printHtml(`科学 · ${s.title}`, scienceHtml(s))
}

// 道德与法治
function moralText(m: MoralResource) {
  let t = `${m.title}（${m.category}）${m.grade ? ' · ' + m.grade : ''}`
  if (m.keywords) t += `\n关键词：${m.keywords}`
  t += `\n\n${m.content}`
  return t
}
function moralHtml(m: MoralResource) {
  return `<div class="item"><div><strong>${escapeHtml(m.title)}</strong> <span class="meta">${escapeHtml(m.category)}</span></div>${m.keywords ? `<div class="ex">关键词：${escapeHtml(m.keywords)}</div>` : ''}<div class="ex">${escapeHtml(m.content)}</div></div>`
}
async function copyMoral(m: MoralResource) {
  const ok = await copyText(moralText(m))
  notify(ok ? '已复制该道德与法治资源' : '复制失败', ok ? 'success' : 'error')
}
function printMoral(m: MoralResource) {
  printHtml(`道德与法治 · ${m.title}`, moralHtml(m))
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BookOpen class="w-6 h-6 text-butter-500" /> 专项资源库
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-600 hover:bg-mint-200 disabled:opacity-60"
        :disabled="seeding"
        title="一键初始化古诗词 / 数学公式 / 英语单词 预置数据"
        @click="doSeedDefaults"
      >
        <component :is="seeding ? Loader2 : Database" class="w-4 h-4" :class="seeding ? 'animate-spin' : ''" />
        {{ seeding ? '初始化中…' : '初始化资源库' }}
      </button>
    </div>

    <!-- 标签页 -->
    <div class="flex gap-2 border-b border-cream-200">
      <button
        v-for="t in tabs" :key="t.key"
        :class="['flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 transition-colors', tab === t.key ? 'border-butter-500 text-butter-600 font-medium' : 'border-transparent text-cocoa-500 hover:text-cocoa-700']"
        @click="switchTab(t.key)"
      >
        <component :is="t.icon" class="w-4 h-4" /> {{ t.label }}
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">
          {{ tab === t.key ? (t.key === 'poems' ? poems.length : t.key === 'formulas' ? formulas.length : t.key === 'words' ? words.length : t.key === 'science' ? sciences.length : morals.length) : '' }}
        </span>
      </button>
    </div>

    <!-- ============ 古诗词 ============ -->
    <template v-if="tab === 'poems'">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="poemKeyword" @keyup.enter="loadPoems" placeholder="搜索诗词标题、作者或关键字" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="poemKeyword = ''; loadPoems()" v-if="poemKeyword"><X class="w-4 h-4" /></button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editPoem()"><Plus class="w-4 h-4" /> 新建</button>
      </div>

      <div v-if="poemsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!poems.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无古诗词，点击「新建」或「初始化资源库」开始</p>
      </div>

      <div v-else class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-for="(p, idx) in poems" :key="p.id" :class="['flex items-start gap-3 p-4', idx > 0 ? 'border-t border-cream-100' : '', 'hover:bg-cream-50']">
          <div class="text-lg">📜</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-medium text-cocoa-900">{{ p.title }}</div>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-butter-50 text-butter-700 border border-butter-100">{{ p.dynasty }}</span>
              <span class="text-xs text-cocoa-500">{{ p.author }}</span>
              <span v-if="p.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ p.grade }}</span>
              <span v-if="p.status !== 'published'" class="text-xs px-1.5 py-0.5 rounded-full bg-sakura-50 text-sakura-500">{{ p.status }}</span>
            </div>
            <div class="text-sm text-cocoa-700 mt-1 line-clamp-2 whitespace-pre-line">{{ p.content }}</div>
            <div v-if="p.translation" class="text-xs text-cocoa-500 mt-1 line-clamp-1">📖 {{ p.translation }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="复制" @click="copyPoem(p)"><Copy class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="打印" @click="printPoem(p)"><Printer class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editPoem(p)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500 shrink-0" title="删除" @click="removePoem(p.id)"><Trash2 class="w-4 h-4" /></button>
        </div>
      </div>
    </template>

    <!-- ============ 数学公式 ============ -->
    <template v-if="tab === 'formulas'">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="formulaKeyword" @keyup.enter="loadFormulas" placeholder="搜索公式标题或关键字" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="formulaKeyword = ''; loadFormulas()" v-if="formulaKeyword"><X class="w-4 h-4" /></button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editFormula()"><Plus class="w-4 h-4" /> 新建</button>
      </div>

      <div v-if="formulasLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!formulas.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Calculator class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无数学公式，点击「新建」或「初始化资源库」开始</p>
      </div>

      <div v-else class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-for="(f, idx) in formulas" :key="f.id" :class="['flex items-start gap-3 p-4', idx > 0 ? 'border-t border-cream-100' : '', 'hover:bg-cream-50']">
          <div class="text-lg">🔢</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-medium text-cocoa-900">{{ f.title }}</div>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600 border border-sky2-100">{{ f.category }}</span>
              <span v-if="f.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ f.grade }}</span>
              <span v-if="f.status !== 'published'" class="text-xs px-1.5 py-0.5 rounded-full bg-sakura-50 text-sakura-500">{{ f.status }}</span>
            </div>
            <div class="mt-1.5 px-2.5 py-1 rounded-lg bg-cream-50 border border-cream-100 text-cocoa-900 font-mono text-sm inline-block">{{ f.formula }}</div>
            <div v-if="f.explanation" class="text-xs text-cocoa-600 mt-1.5 leading-relaxed">{{ f.explanation }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="复制" @click="copyFormula(f)"><Copy class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="打印" @click="printFormula(f)"><Printer class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editFormula(f)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500 shrink-0" title="删除" @click="removeFormula(f.id)"><Trash2 class="w-4 h-4" /></button>
        </div>
      </div>
    </template>

    <!-- ============ 英语单词 ============ -->
    <template v-if="tab === 'words'">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="wordKeyword" @keyup.enter="loadWords" placeholder="搜索单词或释义" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="wordKeyword = ''; loadWords()" v-if="wordKeyword"><X class="w-4 h-4" /></button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editWord()"><Plus class="w-4 h-4" /> 新建</button>
      </div>

      <div v-if="wordsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!words.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Languages class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无英语单词，点击「新建」或「初始化资源库」开始</p>
      </div>

      <div v-else class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-for="(w, idx) in words" :key="w.id" :class="['flex items-start gap-3 p-4', idx > 0 ? 'border-t border-cream-100' : '', 'hover:bg-cream-50']">
          <div class="text-lg">🔤</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-medium text-cocoa-900">{{ w.word }}</div>
              <span v-if="w.phonetic" class="text-xs text-mint-600 font-mono">/{{ w.phonetic }}/</span>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-butter-50 text-butter-700 border border-butter-100">{{ w.category }}</span>
              <span v-if="w.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ w.grade }}</span>
              <span v-if="w.status !== 'published'" class="text-xs px-1.5 py-0.5 rounded-full bg-sakura-50 text-sakura-500">{{ w.status }}</span>
            </div>
            <div class="text-sm text-cocoa-700 mt-0.5">{{ w.meaning }}</div>
            <div v-if="w.example" class="text-xs text-cocoa-500 mt-0.5 italic">e.g. {{ w.example }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="复制" @click="copyWord(w)"><Copy class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="打印" @click="printWord(w)"><Printer class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editWord(w)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500 shrink-0" title="删除" @click="removeWord(w.id)"><Trash2 class="w-4 h-4" /></button>
        </div>
      </div>
    </template>

    <!-- ============ 科学资源 ============ -->
    <template v-if="tab === 'science'">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="scienceKeyword" @keyup.enter="loadSciences" placeholder="搜索科学标题或关键字" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="scienceKeyword = ''; loadSciences()" v-if="scienceKeyword"><X class="w-4 h-4" /></button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editScience()"><Plus class="w-4 h-4" /> 新建</button>
      </div>

      <div v-if="sciencesLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!sciences.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <FlaskConical class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无科学资源，点击「新建」或「初始化资源库」开始</p>
      </div>

      <div v-else class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-for="(s, idx) in sciences" :key="s.id" :class="['flex items-start gap-3 p-4', idx > 0 ? 'border-t border-cream-100' : '', 'hover:bg-cream-50']">
          <div class="text-lg">🔬</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-medium text-cocoa-900">{{ s.title }}</div>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ s.category }}</span>
              <span v-if="s.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ s.grade }}</span>
              <span v-if="s.status !== 'published'" class="text-xs px-1.5 py-0.5 rounded-full bg-sakura-50 text-sakura-500">{{ s.status }}</span>
            </div>
            <div class="text-sm text-cocoa-700 mt-1 line-clamp-2 whitespace-pre-line">{{ s.content }}</div>
            <div v-if="s.keywords" class="text-xs text-cocoa-500 mt-1 line-clamp-1">🏷 {{ s.keywords }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="复制" @click="copyScience(s)"><Copy class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="打印" @click="printScience(s)"><Printer class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editScience(s)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500 shrink-0" title="删除" @click="removeScience(s.id)"><Trash2 class="w-4 h-4" /></button>
        </div>
      </div>
    </template>

    <!-- ============ 道德与法治资源 ============ -->
    <template v-if="tab === 'moral'">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="moralKeyword" @keyup.enter="loadMorals" placeholder="搜索标题或关键字" class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 hover:bg-cream-200" @click="moralKeyword = ''; loadMorals()" v-if="moralKeyword"><X class="w-4 h-4" /></button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editMoral()"><Plus class="w-4 h-4" /> 新建</button>
      </div>

      <div v-if="moralsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!morals.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Scale class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无道德与法治资源，点击「新建」或「初始化资源库」开始</p>
      </div>

      <div v-else class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-for="(m, idx) in morals" :key="m.id" :class="['flex items-start gap-3 p-4', idx > 0 ? 'border-t border-cream-100' : '', 'hover:bg-cream-50']">
          <div class="text-lg">⚖️</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-medium text-cocoa-900">{{ m.title }}</div>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ m.category }}</span>
              <span v-if="m.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ m.grade }}</span>
              <span v-if="m.status !== 'published'" class="text-xs px-1.5 py-0.5 rounded-full bg-sakura-50 text-sakura-500">{{ m.status }}</span>
            </div>
            <div class="text-sm text-cocoa-700 mt-1 line-clamp-2 whitespace-pre-line">{{ m.content }}</div>
            <div v-if="m.keywords" class="text-xs text-cocoa-500 mt-1 line-clamp-1">🏷 {{ m.keywords }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="复制" @click="copyMoral(m)"><Copy class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="打印" @click="printMoral(m)"><Printer class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editMoral(m)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500 shrink-0" title="删除" @click="removeMoral(m.id)"><Trash2 class="w-4 h-4" /></button>
        </div>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="editing = null">
      <div class="bg-surface rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-cocoa-900">
            {{ editing.mode === 'create' ? '新建' : '编辑' }}{{ editing.kind === 'poems' ? '古诗词' : editing.kind === 'formulas' ? '数学公式' : editing.kind === 'words' ? '英语单词' : editing.kind === 'science' ? '科学资源' : '道德与法治资源' }}
          </h3>
          <button @click="editing = null"><X class="w-5 h-5 text-cocoa-400" /></button>
        </div>
        <div class="space-y-3">
          <!-- 古诗词 -->
          <template v-if="editing.kind === 'poems'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">标题</label>
                <input v-model="editing.data.title" placeholder="如：静夜思" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">作者</label>
                <input v-model="editing.data.author" placeholder="如：李白" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">朝代</label>
                <select v-model="editing.data.dynasty" :class="inputCls">
                  <option v-for="d in DYNASTIES" :key="d" :value="d">{{ d }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" :class="inputCls">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select></div>
            </div>
            <div><label class="text-sm text-cocoa-500">正文</label>
              <textarea v-model="editing.data.content" rows="4" placeholder="诗词正文，可换行" :class="inputCls + ' resize-none'" /></div>
            <div><label class="text-sm text-cocoa-500">译文</label>
              <textarea v-model="editing.data.translation" rows="3" :class="inputCls + ' resize-none'" /></div>
            <div><label class="text-sm text-cocoa-500">赏析</label>
              <textarea v-model="editing.data.appreciation" rows="3" :class="inputCls + ' resize-none'" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">关键字（逗号分隔）</label>
                <input v-model="editing.data.keywords" placeholder="如：思乡,月亮" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">排序</label>
                <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
            </div>
          </template>
          <!-- 数学公式 -->
          <template v-else-if="editing.kind === 'formulas'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">标题</label>
                <input v-model="editing.data.title" placeholder="如：加法交换律" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">类别</label>
                <select v-model="editing.data.category" :class="inputCls">
                  <option v-for="c in FORMULA_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" :class="inputCls">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">排序</label>
                <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
            </div>
            <div><label class="text-sm text-cocoa-500">公式</label>
              <input v-model="editing.data.formula" placeholder="如：a + b = b + a" :class="inputCls + ' font-mono'" /></div>
            <div><label class="text-sm text-cocoa-500">说明</label>
              <textarea v-model="editing.data.explanation" rows="3" :class="inputCls + ' resize-none'" /></div>
            <div><label class="text-sm text-cocoa-500">示例</label>
              <input v-model="editing.data.example" placeholder="如：3 + 5 = 5 + 3" :class="inputCls" /></div>
            <div><label class="text-sm text-cocoa-500">关键字（逗号分隔）</label>
              <input v-model="editing.data.keywords" :class="inputCls" /></div>
          </template>
          <!-- 英语单词 -->
          <template v-else-if="editing.kind === 'science'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">标题</label>
                <input v-model="editing.data.title" placeholder="如：水的三态变化" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">分类</label>
                <select v-model="editing.data.category" :class="inputCls">
                  <option v-for="c in SCIENCE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                  <option value="其他">其他</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" :class="inputCls">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">排序</label>
                <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
            </div>
            <div><label class="text-sm text-cocoa-500">内容 / 实验说明</label>
              <textarea v-model="editing.data.content" rows="5" placeholder="知识内容、实验步骤或观察记录，可换行" :class="inputCls + ' resize-none'" /></div>
            <div><label class="text-sm text-cocoa-500">关键字（逗号分隔）</label>
              <input v-model="editing.data.keywords" placeholder="如：水,三态,熔化" :class="inputCls" /></div>
          </template>
          <template v-else-if="editing.kind === 'moral'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">标题</label>
                <input v-model="editing.data.title" placeholder="如：诚实的花盆" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">主题</label>
                <select v-model="editing.data.category" :class="inputCls">
                  <option v-for="c in MORAL_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                  <option value="其他">其他</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" :class="inputCls">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">排序</label>
                <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
            </div>
            <div><label class="text-sm text-cocoa-500">案例 / 讨论 / 价值观内容</label>
              <textarea v-model="editing.data.content" rows="5" placeholder="案例描述、讨论问题或价值观内容，可换行" :class="inputCls + ' resize-none'" /></div>
            <div><label class="text-sm text-cocoa-500">关键字（逗号分隔）</label>
              <input v-model="editing.data.keywords" placeholder="如：诚实,守信" :class="inputCls" /></div>
          </template>
          <template v-else>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">单词</label>
                <input v-model="editing.data.word" placeholder="如：apple" :class="inputCls" /></div>
              <div><label class="text-sm text-cocoa-500">音标</label>
                <input v-model="editing.data.phonetic" placeholder="如：ˈæpl" :class="inputCls + ' font-mono'" /></div>
              <div><label class="text-sm text-cocoa-500">分类</label>
                <select v-model="editing.data.category" :class="inputCls">
                  <option v-for="c in WORD_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                  <option value="其他">其他</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" :class="inputCls">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select></div>
            </div>
            <div><label class="text-sm text-cocoa-500">释义</label>
              <input v-model="editing.data.meaning" placeholder="如：n. 苹果" :class="inputCls" /></div>
            <div><label class="text-sm text-cocoa-500">例句</label>
              <input v-model="editing.data.example" placeholder="如：I like apples." :class="inputCls" /></div>
            <div><label class="text-sm text-cocoa-500">排序</label>
              <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
          </template>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="editing = null">取消</button>
          <button class="px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
