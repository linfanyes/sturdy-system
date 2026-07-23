<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClassStore } from '../stores/class'
import { useExamStore } from '../stores/exam'
import { useGradeStore, calcStat } from '../stores/grade'
import { useUserStore, currentTermStr, termOptions, normalizeTerm } from '../stores/user'
import type { Exam, Grade, RewardType } from '../types'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  FileText,
  ClipboardList,
  Calendar,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Hash,
  Sparkles,
  Square,
} from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { subjectPalette } from '../seed'
import { classSubjects } from '../utils'
import { aiChat, AIError } from '../utils/aiCall'
import { fmtScore } from '../utils/format'

const classStore = useClassStore()
const examStore = useExamStore()
const gradeStore = useGradeStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const FALLBACK_SUBJECTS = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育']

/** 新建考试时默认勾选的科目（其余默认不勾选、不参与考试） */
const DEFAULT_EXAM_SUBJECTS = ['语文', '数学', '英语', '科学', '品德']

/** 学科默认满分: 语文/数学/英语 100, 其他 50 */
function defaultFullScore(subject: string): number {
  if (subject === '语文' || subject === '数学' || subject === '英语') return 100
  return 50
}

/** 根据当前选中的班级动态展示可选学科 */
const subjects = computed<string[]>(() => {
  const cid = edit.value?.classId || filterClass.value
  if (!cid || cid === 'all') return FALLBACK_SUBJECTS
  const c = classStore.getClass(cid)
  return classSubjects(c, FALLBACK_SUBJECTS)
})

// 学期切换 - 统一用 'YYYY春季学期' / 'YYYY秋季学期' 格式
const termList = computed<string[]>(() => {
  const set = new Set<string>(termOptions())
  set.add(examStore.currentTermName)
  // 包含历史上出现过的学期
  for (const e of examStore.exams) set.add(normalizeTerm(e.term))
  return Array.from(set).sort().reverse()
})
const activeTerm = computed({
  get: () => examStore.currentTermName,
  set: (v) => examStore.setCurrentTerm(v),
})

const termExams = computed(() =>
  examStore.exams
    .filter((e) => e.term === activeTerm.value)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
)

// 班级筛选
const filterClass = ref<string>('all')
const filterList = computed(() =>
  filterClass.value === 'all'
    ? termExams.value
    : termExams.value.filter((e) => e.classId === filterClass.value),
)

// ============ 双击查看成绩分析 ============
const analysisOpen = ref(false)
const analysisExam = ref<Exam | null>(null)
const analysisNoteDraft = ref('')
const analysisGrades = computed(() => {
  if (!analysisExam.value) return []
  const ex = analysisExam.value
  return gradeStore.grades.filter((g) =>
    ex.id
      ? g.examId === ex.id
      : g.classId === ex.classId &&
        g.examName.trim() === ex.name.trim() &&
        g.date === ex.date,
  )
})
function analysisFullScore(subject: string): number {
  if (!analysisExam.value) return defaultFullScore(subject)
  const v = analysisExam.value.subjectFullScores?.[subject]
  return typeof v === 'number' && v > 0 ? v : defaultFullScore(subject)
}
function analysisStat(g: Grade) {
  return calcStat(g.scores, analysisFullScore(g.subject))
}
function openExamAnalysis(e: Exam) {
  analysisExam.value = e
  analysisNoteDraft.value = e.analysisNote || ''
  analysisOpen.value = true
}

function saveAnalysisNote() {
  const exam = analysisExam.value
  if (!exam) return
  examStore.updateExam(exam.id, { analysisNote: analysisNoteDraft.value })
  toast.success('已保存分析描述')
}

// 一键生成「本次考试分析情况描述」：由 AI 根据本次考试数据自动总结
const genAnalysising = ref(false)
const genAbort = ref<AbortController | null>(null)

async function generateAnalysisNote() {
  if (genAnalysising.value) return
  if (!analysisExam.value) return
  if (!analysisGrades.value.length) {
    toast.warning('该考试尚未录入成绩，无法生成分析')
    return
  }
  genAnalysising.value = true
  analysisNoteDraft.value = ''
  genAbort.value = new AbortController()
  const cls = classStore.getClass(analysisExam.value.classId)?.name || ''
  const subjectLines = analysisGrades.value
    .map((g) => {
      const s = analysisStat(g)
      const top = s.ranking
        .slice(0, 3)
        .map((r) => {
          const st = classStore.students.find((x) => x.id === r.studentId)
          return `${st?.name || '?'} ${fmtScore(r.score)}`
        })
        .join('、')
      return `【${g.subject}】满分${analysisFullScore(g.subject)}，参考${s.count}人，平均${s.avg}，最高${s.max}，最低${s.min}，及格率${s.passRate}%，优秀率${s.excellentRate}%；前三名：${top}`
    })
    .join('\n')
  const sys =
    '你是一位经验丰富的班主任，擅长根据考试成绩数据撰写客观、有针对性的考试质量分析。'
  const usr =
    `班级：${cls}\n考试：${analysisExam.value.name}（${analysisExam.value.date}）\n\n` +
    `各科数据：\n${subjectLines}\n\n` +
    `请基于以上数据，生成一段「本次考试分析情况描述」，包含整体情况、各学科亮点与不足、需关注的学生群体、改进建议。300字左右，客观务实。`
  try {
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.6,
      stream: true,
      signal: genAbort.value.signal,
      onDelta: (t) => {
        analysisNoteDraft.value += t
      },
    })
    toast.success('已生成分析，可编辑后点「保存描述」')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name !== 'AbortError') toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    genAnalysising.value = false
    genAbort.value = null
  }
}

// ============ 新建/编辑考试 ============
const editOpen = ref(false)
const editId = ref<string | null>(null)
const edit = ref<{
  term: string
  name: string
  classId: string
  subjects: string[]
  subjectFullScores: Record<string, number>
  date: string
  note: string
} | null>(null)

/** 获取某科目当前满分（从 edit 中读取，若缺失则返回默认） */
function getFullScore(subject: string): number {
  if (!edit.value) return defaultFullScore(subject)
  const v = edit.value.subjectFullScores[subject]
  return typeof v === 'number' && v > 0 ? v : defaultFullScore(subject)
}

/** 设置某科目满分（确保正数） */
function setFullScore(subject: string, value: number | string) {
  if (!edit.value) return
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  edit.value.subjectFullScores[subject] = isNaN(n) || n <= 0 ? defaultFullScore(subject) : n
}

// 当考试编辑中切换班级时，剔除不在新班级学科范围内的已选科目
watch(
  () => edit.value?.classId,
  (cid) => {
    if (!edit.value || !cid) return
    const c = classStore.getClass(cid)
    const allowed = classSubjects(c, FALLBACK_SUBJECTS)
    edit.value.subjects = edit.value.subjects.filter((s) => allowed.includes(s))
    // 清理不在允许范围内的满分
    const next: Record<string, number> = {}
    for (const s of edit.value.subjects) {
      next[s] = edit.value.subjectFullScores[s] || defaultFullScore(s)
    }
    edit.value.subjectFullScores = next
  },
)

// 当选中的科目变化时, 新加的科目自动补上默认满分, 移除的科目自动剔除
watch(
  () => edit.value?.subjects,
  (subs) => {
    if (!edit.value || !subs) return
    const next: Record<string, number> = {}
    for (const s of subs) {
      next[s] = edit.value.subjectFullScores[s] || defaultFullScore(s)
    }
    edit.value.subjectFullScores = next
  },
  { deep: true },
)

function openCreate() {
  editId.value = null
  const classId = classStore.classes[0]?.id || ''
  const cls = classId ? classStore.getClass(classId) : null
  const defaultSubjects = classSubjects(cls, FALLBACK_SUBJECTS).filter((s) =>
    DEFAULT_EXAM_SUBJECTS.includes(s),
  )
  const fullScores: Record<string, number> = {}
  for (const s of defaultSubjects) fullScores[s] = defaultFullScore(s)
  edit.value = {
    term: activeTerm.value,
    name: '',
    classId,
    subjects: [...defaultSubjects],
    subjectFullScores: fullScores,
    date: new Date().toISOString().slice(0, 10),
    note: '',
  }
  editOpen.value = true
}

function openEdit(e: Exam) {
  editId.value = e.id
  const fullScores: Record<string, number> = {}
  for (const s of e.subjects) {
    const v = e.subjectFullScores?.[s]
    fullScores[s] = typeof v === 'number' && v > 0 ? v : defaultFullScore(s)
  }
  edit.value = {
    term: e.term,
    name: e.name,
    classId: e.classId,
    subjects: [...e.subjects],
    subjectFullScores: fullScores,
    date: e.date,
    note: e.note,
  }
  editOpen.value = true
}

function toggleSubject(s: string) {
  if (!edit.value) return
  const i = edit.value.subjects.indexOf(s)
  if (i >= 0) {
    edit.value.subjects.splice(i, 1)
    delete edit.value.subjectFullScores[s]
  } else {
    edit.value.subjects.push(s)
    edit.value.subjectFullScores[s] = defaultFullScore(s)
  }
}

function saveEdit() {
  if (!edit.value) return
  if (!edit.value.name.trim()) {
    toast.warning('请填写考试名称')
    return
  }
  if (!edit.value.classId) {
    toast.warning('请选择班级')
    return
  }
  if (!edit.value.subjects.length) {
    toast.warning('请至少选择一个科目')
    return
  }
  if (!edit.value.date) {
    toast.warning('请选择考试日期')
    return
  }
  // 清理掉 subjectFullScores 中不在 subjects 列表里的条目
  const cleanedFullScores: Record<string, number> = {}
  for (const s of edit.value.subjects) {
    cleanedFullScores[s] = edit.value.subjectFullScores[s] || defaultFullScore(s)
  }
  // 统一学期格式
  const normalizedTerm = normalizeTerm(edit.value.term || activeTerm.value)
  if (editId.value) {
    examStore.updateExam(editId.value, {
      ...edit.value,
      term: normalizedTerm,
      subjectFullScores: cleanedFullScores,
    })
    toast.success('已更新')
  } else {
    examStore.addExam({
      ...edit.value,
      term: normalizedTerm,
      subjectFullScores: cleanedFullScores,
    })
    toast.success('已新增考试计划')
  }
  editOpen.value = false
}

function removeExam(e: Exam) {
  if (
    !confirm(
      `确定删除「${e.name}」吗？\n\n` +
        `将同时级联清理 ${e.subjects.join('、')} 的成绩数据。`,
    )
  )
    return
  // 级联清理相关成绩
  gradeStore.clearByExam({
    examId: e.id,
    classId: e.classId,
    subjects: e.subjects,
    examName: e.name,
    date: e.date,
  })
  examStore.removeExam(e.id)
  toast.success(`已删除「${e.name}」及其全部成绩`)
}

// 跳转到成绩管理并预填
function goEnterGrade(e: Exam) {
  const subj = encodeURIComponent(e.subjects.join(','))
  router.push({
    name: 'grades',
    query: {
      classId: e.classId,
      examName: e.name,
      subjects: subj,
      date: e.date,
    },
  })
}

// 支持从 URL 直接进入「预填新建」模式（来自其它页面跳转）
onMounted(() => {
  // 进入考试管理时，默认选中「当前设定的学期」，并展示该学期的考试列表
  const wantTerm = normalizeTerm(userStore.user?.term || currentTermStr())
  if (wantTerm) examStore.setCurrentTerm(wantTerm)
  if (route.query.action === 'create') {
    openCreate()
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- 顶部统计 + 操作 -->
    <div class="card-soft p-5 bg-gradient-to-br from-butter-100 via-cream-50 to-mint-100 relative overflow-hidden">
      <div class="absolute -top-8 -right-6 text-7xl opacity-15 select-none">
        📝
      </div>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-xs text-cocoa-500">
            本学期
          </div>
          <div class="flex items-center gap-2 mt-1">
            <select
              v-model="activeTerm"
              class="input-soft !py-2 text-base font-medium w-auto"
            >
              <option
                v-for="t in termList"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
            <span class="chip bg-butter-200 text-cocoa-900">
              <Calendar :size="12" /> 共 {{ termExams.length }} 场考试
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="filterClass"
            class="input-soft !py-2 text-sm w-auto"
          >
            <option value="all">
              全部班级
            </option>
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
          <button
            class="btn-primary"
            @click="openCreate"
          >
            <Plus :size="14" /> 新建考试
          </button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div
      v-if="filterList.length"
      class="card-soft p-5"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="title-display text-lg flex items-center gap-2">
          <GraduationCap :size="16" /> {{ activeTerm }} 学期考试计划
        </h3>
        <div class="text-[11px] text-cocoa-500">
          共 {{ filterList.length }} 场
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-cocoa-500 border-b border-cocoa-100/60">
              <th class="py-2 pr-2 text-left font-normal">
                考试名称
              </th>
              <th class="py-2 pr-2 text-left font-normal">
                班级
              </th>
              <th class="py-2 pr-2 text-left font-normal">
                科目
              </th>
              <th class="py-2 pr-2 text-left font-normal whitespace-nowrap">
                考试日期
              </th>
              <th class="py-2 pr-2 text-left font-normal">
                备注
              </th>
              <th class="py-2 text-right font-normal whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in filterList"
              :key="e.id"
              class="border-b border-cocoa-100/40 last:border-b-0 hover:bg-butter-50/40 cursor-pointer"
              @dblclick="openExamAnalysis(e)"
              title="双击查看该次考试的成绩分析"
            >
              <td class="py-2.5 pr-2">
                <div class="flex items-center gap-1.5">
                  <BookOpen
                    :size="14"
                    class="text-butter-500"
                  />
                  <span class="font-medium text-cocoa-900">{{ e.name }}</span>
                </div>
              </td>
              <td class="py-2.5 pr-2 text-cocoa-700">
                {{ classStore.getClass(e.classId)?.name || '已删除' }}
              </td>
              <td class="py-2.5 pr-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="s in e.subjects"
                    :key="s"
                    class="chip text-[10px]"
                    :class="subjectPalette[s]?.bg || 'bg-butter-100'"
                    :title="`满分 ${e.subjectFullScores?.[s] || defaultFullScore(s)} 分`"
                  >
                    {{ s }} · {{ e.subjectFullScores?.[s] || defaultFullScore(s) }}
                  </span>
                </div>
              </td>
              <td class="py-2.5 pr-2 text-cocoa-700 whitespace-nowrap">
                {{ e.date }}
              </td>
              <td
                class="py-2.5 pr-2 text-cocoa-500 text-xs max-w-[200px] truncate"
                :title="e.note"
              >
                {{ e.note || '—' }}
              </td>
              <td class="py-2.5 text-right whitespace-nowrap">
                <button
                  class="btn-secondary !py-1 !px-2.5 text-xs mr-1"
                  @click="goEnterGrade(e)"
                >
                  <ClipboardList :size="12" /> 录入成绩
                </button>
                <button
                  class="p-1.5 rounded-full hover:bg-butter-100"
                  @click="openEdit(e)"
                >
                  <Edit :size="14" />
                </button>
                <button
                  class="p-1.5 rounded-full hover:bg-sakura-100"
                  @click="removeExam(e)"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <EmptyState
      v-else
      title="本学期还没有考试计划"
      desc="先建一场考试安排，到时直接录入成绩"
      icon="📝"
    >
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 立即新建
      </button>
    </EmptyState>

    <!-- 新建/编辑弹框 -->
    <Modal
      :open="editOpen"
      :title="editId ? '编辑考试' : '新建考试'"
      width="640px"
      @close="editOpen = false"
    >
      <div
        v-if="edit"
        class="space-y-3"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">学期</label>
            <input
              v-model="edit.term"
              class="input-soft mt-1"
              placeholder="如 2026春季学期"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">考试日期</label>
            <input
              v-model="edit.date"
              type="date"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">考试名称</label>
          <input
            v-model="edit.name"
            class="input-soft mt-1"
            placeholder="如：第一单元测试、期中考试"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班级</label>
          <select
            v-model="edit.classId"
            class="input-soft mt-1"
          >
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">考试科目（可多选）</label>
          <div class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="s in subjects"
              :key="s"
              class="chip border transition"
              :class="
                edit.subjects.includes(s)
                  ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleSubject(s)"
            >
              {{ edit.subjects.includes(s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
          <div
            v-if="edit.subjects.length"
            class="text-[10px] text-cocoa-500 mt-1.5 flex items-center gap-1"
          >
            <CheckCircle2 :size="10" /> 已选 {{ edit.subjects.length }} 个科目
          </div>
        </div>

        <!-- 各科目满分 -->
        <div v-if="edit.subjects.length">
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <Hash :size="10" /> 各科目满分（语数英默认 100, 其他默认 50, 可自定义）
          </label>
          <div class="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div
              v-for="s in edit.subjects"
              :key="s"
              class="card-flat p-2.5 flex items-center gap-2"
            >
              <span
                class="chip text-[10px] !py-0.5"
                :class="subjectPalette[s]?.bg || 'bg-butter-100'"
              >
                {{ s }}
              </span>
              <input
                type="number"
                :value="getFullScore(s)"
                min="1"
                max="999"
                class="input-soft !py-1 !px-2 !text-sm flex-1 w-0"
                @input="setFullScore(s, ($event.target as HTMLInputElement).value)"
              >
              <span class="text-[10px] text-cocoa-400 shrink-0">分</span>
            </div>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">备注（可选）</label>
          <textarea
            v-model="edit.note"
            class="input-soft mt-1 min-h-[60px]"
            placeholder="如：闭卷、范围为前三章"
          />
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="editOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveEdit"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>

    <!-- 成绩分析弹窗 -->
    <Modal
      :open="analysisOpen"
      :title="`成绩分析 · ${analysisExam?.name || ''}`"
      width="640px"
      @close="analysisOpen = false"
    >
      <div class="space-y-4">
        <div
          v-if="analysisGrades.length"
          class="space-y-3"
        >
          <div
            v-for="g in analysisGrades"
            :key="g.id"
            class="card-flat p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-cocoa-800">{{ g.subject }}</span>
              <span class="text-xs text-cocoa-400">
                满分 {{ analysisFullScore(g.subject) }} · {{ analysisStat(g).count }} 人参考
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <div class="text-lg font-bold text-butter-500">{{ analysisStat(g).avg }}</div>
                <div class="text-[10px] text-cocoa-400">平均分</div>
              </div>
              <div>
                <div class="text-lg font-bold text-mint-500">{{ analysisStat(g).max }}</div>
                <div class="text-[10px] text-cocoa-400">最高分</div>
              </div>
              <div>
                <div class="text-lg font-bold text-sakura-500">{{ analysisStat(g).min }}</div>
                <div class="text-[10px] text-cocoa-400">最低分</div>
              </div>
              <div>
                <div class="text-lg font-bold text-sky2-500">{{ analysisStat(g).passRate }}%</div>
                <div class="text-[10px] text-cocoa-400">及格率</div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-center text-cocoa-500 py-8"
        >
          <div class="text-4xl mb-3">📊</div>
          该考试尚未录入成绩
        </div>

        <!-- 本次考试分析情况描述 -->
        <div
          v-if="analysisExam"
          class="mt-4 pt-4 border-t border-cocoa-100"
        >
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-cocoa-700 flex items-center gap-1.5">
              <FileText :size="14" /> 本次考试分析情况描述
            </label>
            <div class="flex items-center gap-2">
              <button
                v-if="!genAnalysising"
                class="btn-soft text-xs"
                @click="generateAnalysisNote"
              >
                <Sparkles :size="12" /> 一键生成
              </button>
              <button
                v-else
                class="btn-soft text-xs"
                @click="genAbort?.abort()"
              >
                <Square :size="12" /> 停止
              </button>
              <button
                class="btn-soft text-xs"
                @click="saveAnalysisNote"
              >
                <Save :size="12" /> 保存描述
              </button>
            </div>
          </div>
          <textarea
            v-model="analysisNoteDraft"
            class="input-soft min-h-[90px] text-sm w-full"
            placeholder="记录本次考试的整体情况、亮点与改进建议…"
          />
        </div>
      </div>
      <template #footer>
        <button
          class="btn-primary"
          @click="analysisOpen = false"
        >
          关闭
        </button>
      </template>
    </Modal>
  </div>
</template>
