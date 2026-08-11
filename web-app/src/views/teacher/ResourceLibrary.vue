<script setup lang="ts">
/**
 * 教师端教学资源库浏览：古诗词 / 数学公式 / 英语单词 三类
 * - 古诗词：卡片列表，按年级/朝代筛选 + 关键词搜索，点击展开看译文与赏析
 * - 数学公式：按类别筛选，展示公式与说明
 * - 英语单词：按分类分组展示，每个单词显示音标与释义
 */
import { ref, computed, onMounted } from 'vue'
import { BookOpen, Calculator, Languages, FlaskConical, Scale, Search, Loader2, X, ChevronDown, Filter, Copy, Printer, Edit2 } from 'lucide-vue-next'
import {
  listPoems, listFormulas, listWords, listWordCategories,
  listScience, searchScience, listMoral, searchMoral,
  teacherUpdateScience, teacherUpdateMoral,
  type Poem, type MathFormula, type EnglishWord, type ScienceResource, type MoralResource,
} from '@/api/resource-library'
import { useAuthStore } from '@/stores/auth'
import { parseSubjectLeader } from '@gardener/shared/constants'
import BackBar from '@/components/BackBar.vue'
import { copyText, printHtml, notify, escapeHtml } from '@/utils/copyPrint'
import { toast } from '@/utils/feedback'

const auth = useAuthStore()

type Tab = 'poems' | 'formulas' | 'words' | 'science' | 'moral'
const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'poems', label: '古诗词', icon: BookOpen },
  { key: 'formulas', label: '数学公式', icon: Calculator },
  { key: 'words', label: '英语单词', icon: Languages },
  { key: 'science', label: '科学', icon: FlaskConical },
  { key: 'moral', label: '道德与法治', icon: Scale },
]
// 按教师任课学科过滤可见 tab：语文→古诗词，数学→公式，英语→单词，科学→科学，道德与法治→道德与法治无关；
// 多学科教师显示多个对应 tab；未匹配语数外的教师展示全部（兼容）。
const teacherSubjects: string[] = Array.isArray(auth.user?.subjects) && auth.user.subjects.length
  ? auth.user.subjects
  : auth.user?.subject ? [auth.user.subject] : []
const SUBJECT_TAB: Record<string, Tab> = { 语文: 'poems', 数学: 'formulas', 英语: 'words', 科学: 'science', '道德与法治': 'moral' }
// 学科组长：即使未列入任课学科，也应对其负责的资源库可见并可编辑
const teacherPosition = auth.user?.position || ''
const leaderSubject = parseSubjectLeader(teacherPosition).subject || ''
const isScienceLeader = leaderSubject === '科学'
const isMoralLeader = leaderSubject === '道德与法治'
const visibleTabs = computed(() => {
  let result = tabs
  if (teacherSubjects.length) {
    const matched = teacherSubjects.map((s) => SUBJECT_TAB[s]).filter(Boolean) as Tab[]
    result = tabs.filter((t) => matched.includes(t.key))
    if (!result.length) result = tabs
  }
  // 学科组长额外补齐对应 tab
  const keys = result.map((t) => t.key)
  if (isScienceLeader && !keys.includes('science')) result = [...result, tabs.find((t) => t.key === 'science')!]
  if (isMoralLeader && !keys.includes('moral')) result = [...result, tabs.find((t) => t.key === 'moral')!]
  return result
})
// 默认选中第一个可见 tab（即教师主学科对应的资源）
const tab = ref<Tab>(visibleTabs.value[0]?.key || 'poems')

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const DYNASTIES = ['唐', '宋', '元', '明', '清', '汉', '南北朝', '魏晋', '先秦', '近现代']
const FORMULA_CATEGORIES = ['运算定律', '几何公式', '单位换算', '分数小数', '比例百分数', '思维方法']
const SCIENCE_CATEGORIES = ['物质科学', '生命科学', '地球与宇宙', '技术与工程']
const MORAL_CATEGORIES = ['个人品德', '家庭美德', '社会公德', '国家情怀']

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
  // 若用户未指定分类，按 listWordCategories 顺序排列，避免分组乱序
  if (!wordCategory.value && wordCategories.value.length) {
    const ordered: Record<string, EnglishWord[]> = {}
    for (const c of wordCategories.value) if (map[c]) ordered[c] = map[c]
    for (const k of Object.keys(map)) if (!ordered[k]) ordered[k] = map[k]
    return ordered
  }
  return map
})

// ============ 科学资源（只读 + 科学组长可编辑） ============
const sciences = ref<ScienceResource[]>([])
const sciencesLoading = ref(false)
const scienceCategory = ref('')
const scienceKeyword = ref('')
// 科学组长的可编辑副本（仅复制可编辑字段）
const scienceCats = [...SCIENCE_CATEGORIES]

async function loadSciences() {
  sciencesLoading.value = true
  try {
    sciences.value = await listScience({
      category: scienceCategory.value || undefined,
      keyword: scienceKeyword.value.trim() || undefined,
    })
  } catch { sciences.value = [] }
  finally { sciencesLoading.value = false }
}

// ============ 道德与法治资源（只读 + 道德与法治组长可编辑） ============
const morals = ref<MoralResource[]>([])
const moralsLoading = ref(false)
const moralCategory = ref('')
const moralKeyword = ref('')

async function loadMorals() {
  moralsLoading.value = true
  try {
    morals.value = await listMoral({
      category: moralCategory.value || undefined,
      keyword: moralKeyword.value.trim() || undefined,
    })
  } catch { morals.value = [] }
  finally { moralsLoading.value = false }
}

// ============ 切换标签页时按需加载 ============
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

onMounted(() => {
  const t = tab.value
  loadedTabs.value.add(t)
  if (t === 'poems') loadPoems()
  else if (t === 'formulas') loadFormulas()
  else if (t === 'words') loadWords()
  else if (t === 'science') loadSciences()
  else if (t === 'moral') loadMorals()
})

// 朝代颜色映射，让卡片更有诗意
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
// 古诗词
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

// 数学公式
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

// 英语单词（按分类小类，如「交通」）
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

// ============ 学科组长编辑（科学 / 道德与法治） ============
const editing = ref<{ kind: 'science' | 'moral'; data: any } | null>(null)
const inputCls = 'w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400'

function editScienceItem(s: ScienceResource) {
  if (!isScienceLeader) return
  editing.value = { kind: 'science', data: { ...s } }
}
function editMoralItem(m: MoralResource) {
  if (!isMoralLeader) return
  editing.value = { kind: 'moral', data: { ...m } }
}

async function saveLeaderEdit() {
  if (!editing.value) return
  const { kind, data } = editing.value
  try {
    if (kind === 'science') {
      await teacherUpdateScience(data.id, {
        title: data.title, category: data.category, content: data.content,
        grade: data.grade, keywords: data.keywords, sortOrder: data.sortOrder,
      })
      await loadSciences()
    } else {
      await teacherUpdateMoral(data.id, {
        title: data.title, category: data.category, content: data.content,
        grade: data.grade, keywords: data.keywords, sortOrder: data.sortOrder,
      })
      await loadMorals()
    }
    editing.value = null
    toast.success('已保存修改')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <BackBar fallback="/teacher" />
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BookOpen class="w-6 h-6 text-butter-500" /> 专项资源库
    </h1>

    <!-- 标签页 -->
    <div class="flex gap-2 border-b border-cream-200">
      <button
        v-for="t in visibleTabs" :key="t.key"
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

    <!-- ============ 科学资源 ============ -->
    <template v-if="tab === 'science'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="scienceKeyword" @keyup.enter="loadSciences" placeholder="搜索科学标题或关键字" class="w-full pl-9 pr-9 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          <button v-if="scienceKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-300 hover:text-cocoa-500" @click="scienceKeyword = ''; loadSciences()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />分类</span>
          <button v-for="c in ['', ...scienceCats]" :key="c"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', scienceCategory === c ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="scienceCategory = c; loadSciences()">{{ c || '全部' }}</button>
        </div>
      </div>

      <div v-if="sciencesLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!sciences.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <FlaskConical class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无科学资源</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="s in sciences" :key="s.id" class="bg-surface rounded-2xl border border-cream-200 shadow-softer p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-medium text-cocoa-900">{{ s.title }}</div>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ s.category }}</span>
                <span v-if="s.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ s.grade }}</span>
              </div>
              <div class="mt-2 text-sm text-cocoa-700 leading-relaxed whitespace-pre-line">{{ s.content }}</div>
              <div v-if="s.keywords" class="text-xs text-cocoa-400 mt-2">🏷 {{ s.keywords }}</div>
            </div>
            <button v-if="isScienceLeader" class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editScienceItem(s)"><Edit2 class="w-4 h-4" /></button>
          </div>
          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-cream-100">
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="copyScience(s)"><Copy class="w-3.5 h-3.5" /> 复制</button>
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="printScience(s)"><Printer class="w-3.5 h-3.5" /> 打印</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 道德与法治资源 ============ -->
    <template v-if="tab === 'moral'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input v-model="moralKeyword" @keyup.enter="loadMorals" placeholder="搜索标题或关键字" class="w-full pl-9 pr-9 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          <button v-if="moralKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-300 hover:text-cocoa-500" @click="moralKeyword = ''; loadMorals()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-cocoa-400 flex items-center gap-1"><Filter class="w-3 h-3" />主题</span>
          <button v-for="c in ['', ...MORAL_CATEGORIES]" :key="c"
            :class="['px-2.5 py-1 rounded-full text-xs border transition-colors', moralCategory === c ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
            @click="moralCategory = c; loadMorals()">{{ c || '全部' }}</button>
        </div>
      </div>

      <div v-if="moralsLoading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2"><Loader2 class="w-4 h-4 animate-spin" /> 加载中…</div>
      <div v-else-if="!morals.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
        <Scale class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
        <p>暂无道德与法治资源</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="m in morals" :key="m.id" class="bg-surface rounded-2xl border border-cream-200 shadow-softer p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-medium text-cocoa-900">{{ m.title }}</div>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ m.category }}</span>
                <span v-if="m.grade" class="text-xs px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ m.grade }}</span>
              </div>
              <div class="mt-2 text-sm text-cocoa-700 leading-relaxed whitespace-pre-line">{{ m.content }}</div>
              <div v-if="m.keywords" class="text-xs text-cocoa-400 mt-2">🏷 {{ m.keywords }}</div>
            </div>
            <button v-if="isMoralLeader" class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500 shrink-0" title="编辑" @click="editMoralItem(m)"><Edit2 class="w-4 h-4" /></button>
          </div>
          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-cream-100">
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="copyMoral(m)"><Copy class="w-3.5 h-3.5" /> 复制</button>
            <button class="flex items-center gap-1 text-xs text-cocoa-500 hover:text-butter-600 transition-colors" @click="printMoral(m)"><Printer class="w-3.5 h-3.5" /> 打印</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 学科组长编辑弹窗 -->
    <div v-if="editing" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="editing = null">
      <div class="bg-surface rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-cocoa-900">
            编辑{{ editing.kind === 'science' ? '科学资源' : '道德与法治资源' }}
          </h3>
          <button @click="editing = null"><X class="w-5 h-5 text-cocoa-400" /></button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-sm text-cocoa-500">标题</label>
              <input v-model="editing.data.title" :class="inputCls" /></div>
            <div><label class="text-sm text-cocoa-500">{{ editing.kind === 'science' ? '分类' : '主题' }}</label>
              <select v-model="editing.data.category" :class="inputCls">
                <option v-for="c in (editing.kind === 'science' ? SCIENCE_CATEGORIES : MORAL_CATEGORIES)" :key="c" :value="c">{{ c }}</option>
                <option value="其他">其他</option>
              </select></div>
            <div><label class="text-sm text-cocoa-500">年级</label>
              <select v-model="editing.data.grade" :class="inputCls">
                <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
              </select></div>
            <div><label class="text-sm text-cocoa-500">排序</label>
              <input v-model.number="editing.data.sortOrder" type="number" :class="inputCls" /></div>
          </div>
          <div><label class="text-sm text-cocoa-500">内容</label>
            <textarea v-model="editing.data.content" rows="5" :class="inputCls + ' resize-none'" /></div>
          <div><label class="text-sm text-cocoa-500">关键字（逗号分隔）</label>
            <input v-model="editing.data.keywords" :class="inputCls" /></div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="editing = null">取消</button>
          <button class="px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="saveLeaderEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
