<script setup lang="ts">
/**
 * 校管教材知识库管理：教材 → 单元 → 知识点 三级树形 CRUD + AI 批量生成
 * 覆盖小学人教版语文、人教版数学、外研版三起英语三科
 */
import { ref, computed, onMounted } from 'vue'
import { BookOpen, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Sparkles, Loader2, Download, X, Database } from 'lucide-vue-next'
import {
  listTextbooks, createTextbook, updateTextbook, deleteTextbook,
  createUnit, updateUnit, deleteUnit,
  createPoint, updatePoint, deletePoint,
  aiGenerateTextbook, seedDefaultTextbooks,
  type Textbook, type TextbookUnit, type TextbookKnowledgePoint,
} from '@/api/textbook'
import { downloadText } from '@/utils/download'
import { SUBJECT_OPTIONS, GRADE_OPTIONS } from '@gardener/shared/constants'

const PUBLISHERS = ['人教版', '外研版', '苏教版', '北师大版', '其他']
const TERMS = ['上册', '下册']
const POINT_TYPES = ['概念', '重点', '例题', '易错点', '拓展']
const DIFFICULTIES = ['简单', '中等', '困难']

const loading = ref(false)
const textbooks = ref<Textbook[]>([])
// 展开的教材/单元 id 集合
const expandedTextbooks = ref<Set<string>>(new Set())
const expandedUnits = ref<Set<string>>(new Set())
// 每本教材的单元缓存（懒加载）
const unitsMap = ref<Record<string, TextbookUnit[]>>({})
// 每个单元的知识点缓存
const pointsMap = ref<Record<string, TextbookKnowledgePoint[]>>({})

async function load() {
  loading.value = true
  try {
    textbooks.value = await listTextbooks()
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ============ 展开/折叠 + 懒加载 ============
async function toggleTextbook(t: Textbook) {
  const set = new Set(expandedTextbooks.value)
  if (set.has(t.id)) {
    set.delete(t.id)
  } else {
    set.add(t.id)
    if (!unitsMap.value[t.id]) {
      try {
        const { listUnits } = await import('@/api/textbook')
        unitsMap.value[t.id] = await listUnits(t.id)
      } catch { unitsMap.value[t.id] = [] }
    }
  }
  expandedTextbooks.value = set
}

async function toggleUnit(u: TextbookUnit) {
  const set = new Set(expandedUnits.value)
  if (set.has(u.id)) {
    set.delete(u.id)
  } else {
    set.add(u.id)
    if (!pointsMap.value[u.id]) {
      try {
        const { listPoints } = await import('@/api/textbook')
        pointsMap.value[u.id] = await listPoints(u.id)
      } catch { pointsMap.value[u.id] = [] }
    }
  }
  expandedUnits.value = set
}

// ============ AI 批量生成 ============
const showAiModal = ref(false)
const aiGenerating = ref(false)
const aiForm = ref({ publisher: '人教版', subject: '语文', grade: '三年级', term: '上册', name: '' })

const aiSubjectOptions = SUBJECT_OPTIONS.filter(s => ['语文', '数学', '英语'].includes(s.value))

function openAiModal() {
  aiForm.value = { publisher: '人教版', subject: '语文', grade: '三年级', term: '上册', name: '' }
  showAiModal.value = true
}

// ============ 一键初始化预置教材 ============
const seeding = ref(false)

async function doSeedDefaults() {
  if (!await confirm('将为本校初始化 32 本预置教材（人教版语文/数学 1-6 年级 + 外研版英语 3-6 年级，含上下册）。已存在的同版本教材将自动跳过。是否继续？')) return
  seeding.value = true
  try {
    const res = await seedDefaultTextbooks()
    alert(`初始化完成：新增 ${res.created} 本教材${res.skipped ? `，跳过 ${res.skipped} 本已存在` : ''}；共 ${res.totalUnits} 个单元、${res.totalPoints} 个知识点。`)
    await load()
  } catch (e: any) {
    alert(e?.message || '初始化失败')
  } finally {
    seeding.value = false
  }
}

async function doAiGenerate() {
  const f = aiForm.value
  if (!f.publisher || !f.subject || !f.grade || !f.term) { alert('请填全出版社、学科、年级、册次'); return }
  aiGenerating.value = true
  try {
    const res = await aiGenerateTextbook(f)
    alert(`生成成功：${res.unitCount} 个单元，${res.pointCount} 个知识点`)
    showAiModal.value = false
    await load()
    expandedTextbooks.value = new Set([res.textbookId])
    const { listUnits } = await import('@/api/textbook')
    unitsMap.value[res.textbookId] = await listUnits(res.textbookId)
  } catch (e: any) {
    alert(e?.message || 'AI 生成失败')
  } finally {
    aiGenerating.value = false
  }
}

// ============ 编辑弹窗：通用 ============
const editing = ref<{ kind: 'textbook' | 'unit' | 'point'; mode: 'create' | 'edit'; data: any; parentId?: string } | null>(null)

function editTextbook(t?: Textbook) {
  editing.value = {
    kind: 'textbook',
    mode: t ? 'edit' : 'create',
    data: t ? { ...t } : { publisher: '人教版', subject: '语文', grade: '三年级', term: '上册', name: '', status: 'published' },
  }
}

function editUnit(textbookId: string, u?: TextbookUnit) {
  editing.value = {
    kind: 'unit',
    mode: u ? 'edit' : 'create',
    parentId: textbookId,
    data: u ? { ...u } : { textbookId, unitOrder: (unitsMap.value[textbookId]?.length || 0) + 1, title: '', summary: '' },
  }
}

function editPoint(unitId: string, p?: TextbookKnowledgePoint) {
  editing.value = {
    kind: 'point',
    mode: p ? 'edit' : 'create',
    parentId: unitId,
    data: p ? { ...p } : { unitId, pointOrder: (pointsMap.value[unitId]?.length || 0) + 1, title: '', type: '重点', content: '', difficulty: '中等', keywords: '' },
  }
}

async function saveEdit() {
  if (!editing.value) return
  const { kind, mode, data, parentId } = editing.value
  try {
    if (kind === 'textbook') {
      if (mode === 'create') await createTextbook(data)
      else await updateTextbook(data.id, data)
    } else if (kind === 'unit') {
      if (mode === 'create') await createUnit(data)
      else await updateUnit(data.id, data)
      if (parentId) unitsMap.value[parentId] = await (await import('@/api/textbook')).listUnits(parentId)
    } else if (kind === 'point') {
      if (mode === 'create') await createPoint(data)
      else await updatePoint(data.id, data)
      if (parentId) pointsMap.value[parentId] = await (await import('@/api/textbook')).listPoints(parentId)
    }
    editing.value = null
    if (kind === 'textbook') await load()
  } catch (e: any) {
    alert(e?.message || '保存失败')
  }
}

async function remove(kind: 'textbook' | 'unit' | 'point', id: string, parentId?: string) {
  if (!await confirm('确定删除？子内容将一并删除。')) return
  try {
    if (kind === 'textbook') {
      await deleteTextbook(id)
      await load()
    } else if (kind === 'unit') {
      await deleteUnit(id)
      if (parentId) unitsMap.value[parentId] = await (await import('@/api/textbook')).listUnits(parentId)
    } else if (kind === 'point') {
      await deletePoint(id)
      if (parentId) pointsMap.value[parentId] = await (await import('@/api/textbook')).listPoints(parentId)
    }
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/** 导出整本教材为 Word（含单元+知识点） */
function exportTextbook(t: Textbook) {
  const units = unitsMap.value[t.id] || []
  const parts: string[] = [`${t.name}`, `（${t.publisher} · ${t.grade}${t.subject}${t.term}）`, '']
  for (const u of units) {
    parts.push(`\n【${u.title}】`)
    if (u.summary) parts.push(u.summary)
    const pts = pointsMap.value[u.id] || []
    for (const p of pts) {
      parts.push(`\n  ${p.title} [${p.type}${p.difficulty ? '/' + p.difficulty : ''}]`)
      parts.push(`  ${p.content}`)
    }
  }
  downloadText(parts.join('\n'), t.name, 'doc')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BookOpen class="w-6 h-6 text-butter-500" /> 教材知识库
      </h1>
      <div class="flex gap-2">
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-600 hover:bg-mint-200 disabled:opacity-60"
          :disabled="seeding"
          title="一键初始化 32 本预置教材（人教版语文/数学 + 外研版英语），已存在的会自动跳过"
          @click="doSeedDefaults"
        >
          <component :is="seeding ? Loader2 : Database" class="w-4 h-4" :class="seeding ? 'animate-spin' : ''" />
          {{ seeding ? '初始化中…' : '初始化教材' }}
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky2-100 text-sky2-600 hover:bg-sky2-200" @click="openAiModal">
          <Sparkles class="w-4 h-4" /> AI 批量生成
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="editTextbook()">
          <Plus class="w-4 h-4" /> 新建教材
        </button>
      </div>
    </div>

    <!-- 教材列表 -->
    <div v-if="loading" class="text-cocoa-400 py-8 text-center">加载中…</div>
    <div v-else-if="!textbooks.length" class="bg-white rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
      <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
      <p>暂无教材，点击「AI 批量生成」快速生成三科教材知识点</p>
    </div>

    <div v-else class="space-y-2">
      <div v-for="t in textbooks" :key="t.id" class="bg-white rounded-2xl shadow-softer overflow-hidden">
        <!-- 教材行 -->
        <div class="flex items-center gap-3 p-4 hover:bg-cream-50">
          <button class="text-cocoa-400" @click="toggleTextbook(t)">
            <component :is="expandedTextbooks.has(t.id) ? ChevronDown : ChevronRight" class="w-5 h-5" />
          </button>
          <div class="text-lg">{{ t.subject === '语文' ? '📜' : t.subject === '数学' ? '🔢' : t.subject === '英语' ? '🔤' : '📚' }}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-cocoa-900">{{ t.name }}</div>
            <div class="text-xs text-cocoa-400">{{ t.publisher }} · {{ t.grade }} · {{ t.term }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="导出" @click="exportTextbook(t)"><Download class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="editTextbook(t)"><Edit2 class="w-4 h-4" /></button>
          <button class="p-1.5 rounded-lg hover:bg-sakura-50 text-sakura-500" title="删除" @click="remove('textbook', t.id)"><Trash2 class="w-4 h-4" /></button>
        </div>

        <!-- 单元列表 -->
        <div v-if="expandedTextbooks.has(t.id)" class="border-t border-cream-100 bg-cream-50/50">
          <div v-if="!unitsMap[t.id]?.length" class="px-6 py-4 text-sm text-cocoa-400">暂无单元</div>
          <div v-else>
            <div v-for="u in unitsMap[t.id]" :key="u.id">
              <div class="flex items-center gap-3 px-6 py-2.5 hover:bg-cream-100/50">
                <button class="text-cocoa-400" @click="toggleUnit(u)">
                  <component :is="expandedUnits.has(u.id) ? ChevronDown : ChevronRight" class="w-4 h-4" />
                </button>
                <div class="flex-1 text-sm text-cocoa-800">{{ u.title }}</div>
                <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="editPoint(u.id)"><Plus class="w-3.5 h-3.5" /></button>
                <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="editUnit(t.id, u)"><Edit2 class="w-3.5 h-3.5" /></button>
                <button class="p-1 rounded hover:bg-sakura-50 text-sakura-500" @click="remove('unit', u.id, t.id)"><Trash2 class="w-3.5 h-3.5" /></button>
              </div>
              <!-- 知识点列表 -->
              <div v-if="expandedUnits.has(u.id)" class="pl-12 pr-6 pb-2 space-y-1.5">
                <div v-if="!pointsMap[u.id]?.length" class="text-xs text-cocoa-400 py-1">暂无知识点</div>
                <div v-for="p in pointsMap[u.id]" :key="p.id" class="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-cream-100">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5 flex-wrap">
                      {{ p.title }}
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-butter-100 text-butter-700">{{ p.type }}</span>
                      <span v-if="p.difficulty" class="text-[10px] px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600">{{ p.difficulty }}</span>
                    </div>
                    <div class="text-xs text-cocoa-600 mt-1 whitespace-pre-wrap">{{ p.content }}</div>
                  </div>
                  <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500 shrink-0" @click="editPoint(u.id, p)"><Edit2 class="w-3.5 h-3.5" /></button>
                  <button class="p-1 rounded hover:bg-sakura-50 text-sakura-500 shrink-0" @click="remove('point', p.id, u.id)"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
          <button class="w-full text-left px-6 py-2 text-sm text-butter-600 hover:bg-cream-100/50 flex items-center gap-1" @click="editUnit(t.id)">
            <Plus class="w-4 h-4" /> 添加单元
          </button>
        </div>
      </div>
    </div>

    <!-- AI 生成弹窗 -->
    <div v-if="showAiModal" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showAiModal = false">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-cocoa-900 flex items-center gap-2"><Sparkles class="w-5 h-5 text-butter-500" /> AI 批量生成教材</h3>
          <button @click="showAiModal = false"><X class="w-5 h-5 text-cocoa-400" /></button>
        </div>
        <p class="text-xs text-cocoa-500 mb-4">选择教材版本，AI 将自动生成全部单元与核心知识点。生成后可在后台精修。</p>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-cocoa-500">出版社</label>
              <select v-model="aiForm.publisher" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                <option v-for="p in PUBLISHERS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-cocoa-500">学科</label>
              <select v-model="aiForm.subject" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                <option v-for="s in aiSubjectOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-cocoa-500">年级</label>
              <select v-model="aiForm.grade" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                <option v-for="g in GRADE_OPTIONS.filter(x => x.includes('年级'))" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-cocoa-500">册次</label>
              <select v-model="aiForm.term" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                <option v-for="t in TERMS" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm text-cocoa-500">教材名称（可选，留空自动生成）</label>
            <input v-model="aiForm.name" placeholder="如：人教版三年级语文上册" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" />
          </div>
        </div>
        <button
          class="w-full mt-5 flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="aiGenerating"
          @click="doAiGenerate"
        >
          <component :is="aiGenerating ? Loader2 : Sparkles" class="w-4 h-4" :class="aiGenerating ? 'animate-spin' : ''" />
          {{ aiGenerating ? 'AI 生成中（约 30-60 秒）…' : '开始生成' }}
        </button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="editing = null">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-cocoa-900">
            {{ editing.mode === 'create' ? '新建' : '编辑' }}{{ editing.kind === 'textbook' ? '教材' : editing.kind === 'unit' ? '单元' : '知识点' }}
          </h3>
          <button @click="editing = null"><X class="w-5 h-5 text-cocoa-400" /></button>
        </div>
        <div class="space-y-3">
          <!-- 教材 -->
          <template v-if="editing.kind === 'textbook'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-cocoa-500">出版社</label>
                <select v-model="editing.data.publisher" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option v-for="p in PUBLISHERS" :key="p" :value="p">{{ p }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">学科</label>
                <select v-model="editing.data.subject" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option v-for="s in SUBJECT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">年级</label>
                <select v-model="editing.data.grade" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">册次</label>
                <select v-model="editing.data.term" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option v-for="t in TERMS" :key="t" :value="t">{{ t }}</option>
                </select></div>
            </div>
            <div><label class="text-sm text-cocoa-500">教材名称</label>
              <input v-model="editing.data.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
          </template>
          <!-- 单元 -->
          <template v-else-if="editing.kind === 'unit'">
            <div><label class="text-sm text-cocoa-500">单元标题</label>
              <input v-model="editing.data.title" placeholder="如：第一单元 秋天" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
            <div><label class="text-sm text-cocoa-500">排序</label>
              <input v-model.number="editing.data.unitOrder" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
            <div><label class="text-sm text-cocoa-500">单元概述</label>
              <textarea v-model="editing.data.summary" rows="3" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 resize-none" /></div>
          </template>
          <!-- 知识点 -->
          <template v-else>
            <div><label class="text-sm text-cocoa-500">知识点标题</label>
              <input v-model="editing.data.title" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
            <div class="grid grid-cols-3 gap-3">
              <div><label class="text-sm text-cocoa-500">类型</label>
                <select v-model="editing.data.type" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option v-for="t in POINT_TYPES" :key="t" :value="t">{{ t }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">难度</label>
                <select v-model="editing.data.difficulty" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200">
                  <option value="">无</option>
                  <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
                </select></div>
              <div><label class="text-sm text-cocoa-500">排序</label>
                <input v-model.number="editing.data.pointOrder" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
            </div>
            <div><label class="text-sm text-cocoa-500">内容</label>
              <textarea v-model="editing.data.content" rows="6" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 resize-none" /></div>
            <div><label class="text-sm text-cocoa-500">关键词（逗号分隔，便于检索）</label>
              <input v-model="editing.data.keywords" placeholder="如：多音字,读音" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200" /></div>
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