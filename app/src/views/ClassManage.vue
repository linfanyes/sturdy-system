<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClassStore } from '../stores/class'
import { useSchoolStore } from '../stores/school'
import { useTeacherStore } from '../stores/teacher'
import { useGradeStore } from '../stores/grade'
import { useRewardStore } from '../stores/reward'
import { useExamStore } from '../stores/exam'
import { useUserStore, termOptions, normalizeTerm } from '../stores/user'
import type { ClassItem, Student } from '../types'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import ClassScheduleGrid from '../components/common/ClassScheduleGrid.vue'
import { Plus, Edit, Trash2, Users, BookOpen, Quote, School, X, Save, AlertCircle, UserPlus, Hash, GraduationCap, ChevronDown, Calendar, ArrowRightLeft, Move, Printer, Megaphone, Award } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'

import { generateAutoSchedule, formatShort } from '../utils'
import { getStorageKey, onUserChange } from '../utils/storage'
import { printHtml } from '../utils/download'
import { useRouter } from 'vue-router'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const teacherStore = useTeacherStore()
const gradeStore = useGradeStore()
const rewardStore = useRewardStore()
const examStore = useExamStore()
const userStore = useUserStore()
const toast = useToastStore()
const router = useRouter()

const allSubjects = [
  '语文',
  '数学',
  '英语',
  '科学',
  '品德',
  '音乐',
  '美术',
  '体育',
  '综合实践',
  '信息技术',
]

const modalOpen = ref(false)
const editing = ref<ClassItem | null>(null)
const draft = ref<Omit<ClassItem, 'id' | 'createdAt'>>({
  name: '',
  grade: '三年级',
  classNo: '1',
  slogan: '',
  headTeacher: '',
  teachers: [],
  color: 'butter',
  term: '',
  subjects: [],
})

const colorOptions = [
  { name: 'butter', bg: 'bg-butter-300', ring: 'ring-butter-400' },
  { name: 'mint', bg: 'bg-mint-300', ring: 'ring-mint-400' },
  { name: 'sakura', bg: 'bg-sakura-300', ring: 'ring-sakura-400' },
  { name: 'sky2', bg: 'bg-sky2-300', ring: 'ring-sky2-400' },
]

const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

// 班级下拉：默认 5 个 + 用户自定义
const defaultClassNos = ['一班', '二班', '三班', '四班', '五班']
const extraClassNos = ref<string[]>([])
// 自定义班号按登录人隔离: trace.{userId}.custom-classnos
const CLASSNO_KEY = () => getStorageKey('custom-classnos')
function loadClassNos() {
  try {
    const raw = localStorage.getItem(CLASSNO_KEY())
    extraClassNos.value = raw ? JSON.parse(raw) || [] : []
  } catch (e) {
    extraClassNos.value = []
  }
}
loadClassNos()
// 切换账号时重新加载
onUserChange(() => loadClassNos())
const classNoOptions = computed(() => [...defaultClassNos, ...extraClassNos.value])
const newClassNoInput = ref('')

function addClassNo() {
  const v = newClassNoInput.value.trim()
  if (!v) return
  // 兼容"1"/"一班"等，自动补"班"
  let normalized = v
  if (!/班$/.test(normalized)) normalized = normalized + '班'
  if (!classNoOptions.value.includes(normalized)) {
    extraClassNos.value.push(normalized)
    localStorage.setItem(CLASSNO_KEY(), JSON.stringify(extraClassNos.value))
  }
  draft.value.classNo = normalized
  newClassNoInput.value = ''
  recomputeName()
}

function recomputeName() {
  if (draft.value.grade && draft.value.classNo) {
    draft.value.name = `${draft.value.grade}${draft.value.classNo}`
  } else {
    draft.value.name = ''
  }
}

const activeId = ref<string | null>(classStore.classes[0]?.id ?? null)
const activeClass = computed(() => classStore.classes.find((c) => c.id === activeId.value))

// 同步当前选中班级，供工作台公告按班级过滤
watch(activeId, (id) => classStore.setCurrentClass(id), { immediate: true })

// 班级公告
const classNotices = computed(() =>
  activeId.value
    ? schoolStore.notices
        .filter((n) => n.classId === activeId.value)
        .sort((a, b) => b.createdAt - a.createdAt)
    : [],
)
const classNoticeOpen = ref(false)
const noticeDraft = ref({ title: '', content: '', pinned: false })
function openAddClassNotice() {
  noticeDraft.value = { title: '', content: '', pinned: false }
  classNoticeOpen.value = true
}
function saveClassNotice() {
  if (!noticeDraft.value.title.trim()) {
    toast.warning('请填写公告标题')
    return
  }
  if (!activeId.value) return
  schoolStore.addNotice({
    classId: activeId.value,
    title: noticeDraft.value.title.trim(),
    content: noticeDraft.value.content.trim(),
    pinned: noticeDraft.value.pinned,
  })
  toast.success('已发布班级公告')
  classNoticeOpen.value = false
}
const studentsInActive = computed(() =>
  activeId.value ? classStore.studentsOf(activeId.value) : [],
)

// ============ 花名册排布 ============
// 座位编排后：所有学生都有 seatRow/seatCol，按座位网格分布显示
const seatArranged = computed(
  () =>
    studentsInActive.value.length > 0 &&
    studentsInActive.value.every(
      (s) => s.seatRow != null && s.seatCol != null,
    ),
)
// 座位网格：row/col 定位，空格留空
const seatGrid = computed<(Student | null)[][]>(() => {
  const list = studentsInActive.value
  let maxRow = 0
  let maxCol = 0
  for (const s of list) {
    if (s.seatRow != null) maxRow = Math.max(maxRow, s.seatRow)
    if (s.seatCol != null) maxCol = Math.max(maxCol, s.seatCol)
  }
  const grid: (Student | null)[][] = []
  for (let r = 0; r < maxRow; r++) grid.push(new Array(maxCol).fill(null))
  for (const s of list) {
    if (s.seatRow != null && s.seatCol != null)
      grid[s.seatRow - 1][s.seatCol - 1] = s
  }
  return grid
})
// 座位未编排：按学号排序，5 列铺开
const rosterDefault = computed<Student[]>(() =>
  [...studentsInActive.value].sort((a, b) =>
    (a.studentNo || '').localeCompare(b.studentNo || ''),
  ),
)

// 教师选择下拉
const showHeadPicker = ref(false)
const showTeacherPicker = ref(false)
const teacherList = computed(() => teacherStore.teachers)

function toggleTeacher(name: string) {
  const i = draft.value.teachers.indexOf(name)
  if (i >= 0) draft.value.teachers.splice(i, 1)
  else draft.value.teachers.push(name)
}

/** 同步任课老师到教师通讯录的任教分配 */
function syncTeacherTeachings(classId: string) {
  const defaultSubject = userStore.user?.subjects?.[0] || ''
  if (!defaultSubject) return
  for (const t of teacherStore.teachers) {
    if (draft.value.teachers.includes(t.name)) {
      const hasEntry = (t.teachings || []).some((e) => e.classId === classId)
      if (!hasEntry) {
        teacherStore.updateTeacher(t.id, {
          teachings: [...(t.teachings || []), { classId, subject: defaultSubject }],
        })
      }
    }
  }
}

function gotoAddTeacher() {
  sessionStorage.setItem('trace-open-add-teacher', '1')
  modalOpen.value = false
  router.push('/teachers')
}

function openCreate() {
  editing.value = null
  const grade = '三年级'
  // 默认找一个未占用的班号
  const used = new Set(classStore.classes.filter(c => c.grade === grade).map(c => c.classNo))
  const classNo = classNoOptions.value.find(n => !used.has(n)) || '一班'
  // 自动继承用户设置的默认学期和学科
  const defaultTerm = userStore.user?.term || ''
  const defaultSubjects = userStore.user?.subjects || []
  draft.value = {
    name: `${grade}${classNo}`,
    grade,
    classNo,
    slogan: '',
    headTeacher: '',
    teachers: [],
    color: 'butter',
    term: defaultTerm,
    subjects: defaultSubjects,
  }
  modalOpen.value = true
}

function openEdit(c: ClassItem) {
  editing.value = c
  draft.value = { ...c }
  modalOpen.value = true
}

function save() {
  if (!draft.value.grade || !draft.value.classNo) {
    toast.warning('请选择完整的年级和班级')
    return
  }
  // 重新计算一次名称，确保最终保存
  recomputeName()
  if (editing.value) {
    syncTeacherTeachings(editing.value.id)
    classStore.updateClass(editing.value.id, draft.value)
    toast.success('已更新班级信息')
  } else {
    const c = classStore.addClass(draft.value)
    activeId.value = c.id
    syncTeacherTeachings(c.id)
    // 默认生成课表: 1-7 节随机安排学科, 午自习/课后服务 = 班主任
    autoScheduleNewClass(c.id, c.headTeacher)
    toast.success('已创建班级, 已自动生成默认课表')
  }
  modalOpen.value = false
}

/** 为新班级默认生成课表 */
function autoScheduleNewClass(classId: string, headTeacher: string) {
  // 收集: 学科 -> 老师列表 (从 teacherStore)
  const teacherBySubject: Record<string, string[]> = {}
  for (const t of teacherStore.teachers) {
    for (const teach of t.teachings || []) {
      if (teach.classId === classId) {
        if (!teacherBySubject[teach.subject]) teacherBySubject[teach.subject] = []
        teacherBySubject[teach.subject].push(t.name)
      }
    }
  }
  const arr = generateAutoSchedule({
    classId,
    headTeacher: headTeacher || '班主任',
    teacherBySubject,
  })
  for (let i = 0; i < arr.length; i++) {
    schoolStore.updateSchedule(
      classId,
      arr[i].dayOfWeek,
      arr[i].period,
      arr[i].subject,
      '',
      arr[i].teacher,
    )
  }
}

function remove(c: ClassItem) {
  const stuCount = classStore.studentsOf(c.id).length
  const gradeCount = gradeStore.gradesOfClass(c.id).length
  const examCount = examStore.exams.filter((e) => e.classId === c.id).length
  if (
    !confirm(
      `确定删除「${c.name}」吗？\n\n` +
        `将同时级联清理：\n` +
        `  · ${stuCount} 名学生\n` +
        `  · ${gradeCount} 场成绩记录\n` +
        `  · ${examCount} 场考试计划\n` +
        `  · 该班课表 / 作业 / 考勤 / 奖惩 / 点名历史 / 教师任教分配\n\n` +
        `该操作不可撤销。`,
    )
  )
    return
  // 级联清理
  schoolStore.clearByClass(c.id)
  gradeStore.clearByClass(c.id)
  examStore.clearByClass(c.id)
  rewardStore.clearByClass(c.id)
  teacherStore.clearByClass?.(c.id)
  // 再删班级本身 (同时会删学生)
  classStore.removeClass(c.id)
  if (activeId.value === c.id)
    activeId.value = classStore.classes[0]?.id ?? null
  toast.info(`已删除「${c.name}」及其全部关联数据`)
}

// ============== 全局学期设置 (批量应用到所有班级) ==============
const termModalOpen = ref(false)
const termDraft = ref({ term: '', subjects: [] as string[] })
const termList = computed(() => termOptions())

function openTermSetting() {
  // 默认取当前用户学期, 或者第一个已设置学期的班级
  const firstTerm = classStore.classes.find((c) => c.term)?.term || ''
  termDraft.value = {
    term: firstTerm || userStore.user?.term || '',
    subjects: [],
  }
  termModalOpen.value = true
}

function toggleTermSubject(s: string) {
  const i = termDraft.value.subjects.indexOf(s)
  if (i >= 0) termDraft.value.subjects.splice(i, 1)
  else termDraft.value.subjects.push(s)
}

function saveTerm() {
  if (!termDraft.value.term.trim()) {
    toast.warning('请选择或填写学期')
    return
  }
  const term = normalizeTerm(termDraft.value.term.trim())
  const subjects = [...termDraft.value.subjects]
  const count = classStore.classes.length

  // 同步更新当前用户的默认学期（用于新建班级/首次登录等场景）
  userStore.update({ term, subjects })

  if (count) {
    for (const c of classStore.classes) {
      classStore.updateClass(c.id, { term, subjects })
    }
    termModalOpen.value = false
    toast.success(`已为 ${count} 个班级统一设置学期为「${term}」`)
  } else {
    termModalOpen.value = false
    toast.success(`已设置默认学期为「${term}」，新建班级时将自动沿用`)
  }
}

function clearTerm() {
  userStore.update({ term: '', subjects: [] })
  if (!classStore.classes.length) {
    termModalOpen.value = false
    toast.info('已清空默认学期设置')
    return
  }
  for (const c of classStore.classes) {
    classStore.updateClass(c.id, { term: '', subjects: [] })
  }
  termModalOpen.value = false
  toast.info('已清空所有班级的学期设置')
}

// ============== 班级整体同步到其他班级 ==============
const moveModalOpen = ref(false)
const moveFrom = ref<ClassItem | null>(null)
const moveToId = ref('')
const moveDeleteSource = ref(true)

function openMove(c: ClassItem) {
  moveFrom.value = c
  // 默认选第一个非自身的班级
  const target = classStore.classes.find((x) => x.id !== c.id)
  moveToId.value = target?.id || ''
  moveDeleteSource.value = true
  moveModalOpen.value = true
}

const moveToClass = computed(() => classStore.classes.find((c) => c.id === moveToId.value))
const moveTargetStudentsCount = computed(() =>
  moveToId.value ? classStore.studentsOf(moveToId.value).length : 0,
)
const moveSourceStudentsCount = computed(() =>
  moveFrom.value ? classStore.studentsOf(moveFrom.value.id).length : 0,
)

function confirmMove() {
  if (!moveFrom.value) return
  if (!moveToId.value) {
    toast.warning('请选择目标班级')
    return
  }
  if (moveFrom.value.id === moveToId.value) {
    toast.warning('源班级与目标班级相同')
    return
  }
  const fromName = moveFrom.value.name
  const toName = moveToClass.value?.name || ''
  // 1. 同步学生
  const studentCount = classStore.reassignStudents(moveFrom.value.id, moveToId.value)
  // 2. 同步其他关联数据
  schoolStore.reassignClass(moveFrom.value.id, moveToId.value)
  gradeStore.reassignClass(moveFrom.value.id, moveToId.value)
  rewardStore.reassignClass(moveFrom.value.id, moveToId.value)
  examStore.reassignClass(moveFrom.value.id, moveToId.value)
  teacherStore.reassignClass(moveFrom.value.id, moveToId.value)
  // 3. 是否删除源班级
  if (moveDeleteSource.value) {
    classStore.removeClass(moveFrom.value.id)
  }
  moveModalOpen.value = false
  if (moveDeleteSource.value) {
    if (activeId.value === moveFrom.value.id) {
      activeId.value = moveToId.value
    }
    toast.success(`已将「${fromName}」的 ${studentCount} 名学生同步到「${toName}」，并删除源班级`)
  } else {
    toast.success(`已将「${fromName}」的 ${studentCount} 名学生同步到「${toName}」（源班级保留为 0 人）`)
  }
}

const teacherInput = ref('')
function addTeacher() {
  const t = teacherInput.value.trim()
  if (t && !draft.value.teachers.includes(t)) {
    draft.value.teachers.push(t)
    teacherInput.value = ''
  }
}
function removeTeacher(i: number) {
  draft.value.teachers.splice(i, 1)
}

const dayLabels = ['周一', '周二', '周三', '周四', '周五']
const periodLabels = ['', '第1节', '第2节', '第3节', '第4节', '午自习', '第6节', '第7节', '课后服务']
const fixedSubjects: Record<number, string> = { 5: '午自习', 8: '课后服务' }

/** 学科 -> 打印用背景色 (hex) */
const SUBJECT_HEX: Record<string, string> = {
  语文: '#FCE7F3', 数学: '#DBEAFE', 英语: '#DCFCE7', 音乐: '#FEF9C3',
  美术: '#EDE9FE', 体育: '#CFFAFE', 品德: '#FFEDD5', 科学: '#DCFCE7',
  午自习: '#F1F5F9', 课后服务: '#F1F5F9', 综合实践: '#FCE7F3',
  信息技术: '#E0E7FF', 劳动: '#FEF3C7', 阅读: '#FDE68A',
}

/** 打印 / 导出 PDF：将当前班级课程表渲染为独立页面 */
function printSchedule() {
  const cls = activeClass.value
  if (!cls) return
  const days = ['一', '二', '三', '四', '五']
  const periodLabels = [
    '', '第 1 节', '第 2 节', '第 3 节', '第 4 节',
    '午自习', '第 6 节', '第 7 节', '课后服务',
  ]
  const getCell = (day: number, period: number) =>
    schoolStore.schedules.find(
      (s) => s.classId === cls.id && s.dayOfWeek === day && s.period === period,
    )

  let rows = ''
  for (let p = 1; p <= 8; p++) {
    let cells = `<td style="padding:8px;text-align:center;color:#8a7866;font-size:13px;white-space:nowrap;">${periodLabels[p]}</td>`
    for (let d = 1; d <= 5; d++) {
      const c = getCell(d, p)
      if (c && c.subject) {
        const bg = SUBJECT_HEX[c.subject] || '#F3F4F6'
        cells += `<td style="border:1px solid #e4d8c8;padding:8px;text-align:center;background:${bg};vertical-align:middle;">
          <div style="font-weight:600;color:#4a3a2e;font-size:14px;">${c.subject}</div>
          <div style="font-size:12px;color:#6b5a48;margin-top:2px;">${c.teacher && c.teacher !== '未知' ? c.teacher : ''}</div>
        </td>`
      } else {
        cells += `<td style="border:1px solid #e4d8c8;padding:8px;"></td>`
      }
    }
    rows += `<tr>${cells}</tr>`
  }

  const head = days
    .map((d) => `<th style="border:1px solid #e4d8c8;padding:8px;background:#f7f0e6;color:#5b4636;">周${d}</th>`)
    .join('')

  const html = `
    <h2 style="text-align:center;font-size:22px;margin:0 0 4px;color:#4a3a2e;">${cls.name} · 课程表</h2>
    <p style="text-align:center;color:#8a7866;font-size:13px;margin:0 0 16px;">班主任：${cls.headTeacher || '—'} · 共 5 天 8 节</p>
    <table style="border-collapse:collapse;width:100%;font-family:-apple-system,'Microsoft YaHei',sans-serif;">
      <thead><tr>
        <th style="border:1px solid #e4d8c8;padding:8px;background:#f7f0e6;color:#5b4636;width:90px;">节次</th>
        ${head}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:center;color:#a89a88;font-size:12px;margin-top:14px;">由「园丁工作台」生成</p>
  `
  printHtml(`${cls.name} 课程表`, html)
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-sm text-cocoa-500 flex items-center gap-2">
        <School :size="14" /> 共 {{ classStore.classes.length }} 个班级
        <span
          v-if="classStore.classes.length"
          class="text-cocoa-300"
        >
          ·
          <template v-if="classStore.classes.every((c) => c.term === classStore.classes[0].term) && classStore.classes[0].term">
            统一学期：{{ classStore.classes[0].term }}
          </template>
          <template v-else-if="classStore.classes.some((c) => c.term)">
            学期不一致
          </template>
          <template v-else>
            未设置学期
          </template>
        </span>
      </div>
      <div class="flex gap-2">
        <button
          class="btn-secondary"
          @click="openTermSetting"
        >
          <Calendar :size="16" /> 学期设置
        </button>
        <button
          class="btn-primary"
          @click="openCreate"
        >
          <Plus :size="16" /> 新建班级
        </button>
      </div>
    </div>

    <div
      v-if="classStore.classes.length"
      class="grid lg:grid-cols-3 gap-5"
    >
      <!-- 班级列表 -->
      <div class="lg:col-span-1 space-y-3">
        <button
          v-for="c in classStore.classes"
          :key="c.id"
          class="card-soft p-4 w-full text-left hover:-translate-y-0.5 transition relative"
          :class="activeId === c.id ? 'ring-2 ring-butter-400' : ''"
          @click="activeId = c.id"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              :class="`bg-${c.color}-300/80`"
            >
              🏫
            </div>
            <div class="flex-1 min-w-0">
              <div class="title-display text-lg truncate">
                {{ c.name }}
              </div>
              <div class="text-xs text-cocoa-500 flex items-center gap-1">
                <Users :size="12" /> {{ classStore.studentsOf(c.id).length }} 人
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                @click.stop="openEdit(c)"
                aria-label="编辑"
                title="编辑"
              >
                <Edit :size="14" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-mint-100"
                @click.stop="router.push({ name: 'tool-class-duty', query: { classId: c.id } })"
                aria-label="班级职务设置"
                title="班级职务设置"
              >
                <Award :size="14" />
              </button>
              <button
                v-if="classStore.classes.length > 1"
                class="p-1.5 rounded-full hover:bg-sky2-100"
                @click.stop="openMove(c)"
                aria-label="同步到其他班级"
                title="同步到其他班级"
              >
                <Move :size="14" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                @click.stop="remove(c)"
                aria-label="删除"
                title="删除"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div
            v-if="c.term || (c.subjects && c.subjects.length)"
            class="mt-2 flex flex-wrap gap-1"
          >
            <span
              v-if="c.term"
              class="chip bg-butter-100 text-butter-600 text-[10px] !py-0.5"
            >
              <Calendar
                :size="9"
                class="inline"
              /> {{ c.term }}
            </span>
            <span
              v-if="c.subjects && c.subjects.length"
              class="chip bg-mint-100 text-mint-500 text-[10px] !py-0.5"
            >
              {{ c.subjects.length }} 个学科
            </span>
          </div>
          <div
            v-if="c.slogan"
            class="mt-3 text-xs hand text-cocoa-700 italic flex items-start gap-1"
          >
            <Quote
              :size="12"
              class="mt-0.5 shrink-0"
            />
            <span class="line-clamp-2">"{{ c.slogan }}"</span>
          </div>
        </button>
      </div>

      <!-- 班级详情 -->
      <div class="lg:col-span-2 space-y-5">
        <div
          v-if="activeClass"
          class="card-soft p-6"
        >
          <div class="flex items-center gap-4 flex-wrap">
            <div
              class="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              :class="`bg-${activeClass.color}-300/80`"
            >
              🏫
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="title-display text-2xl">
                {{ activeClass.name }}
              </h2>
              <div class="text-sm text-cocoa-500 mt-1">
                {{ activeClass.grade }}（{{ activeClass.classNo }}）· 班主任：{{ activeClass.headTeacher || '未设置' }}
              </div>
              <div
                v-if="activeClass.term || (activeClass.subjects && activeClass.subjects.length)"
                class="mt-2 flex flex-wrap gap-1.5"
              >
                <span
                  v-if="activeClass.term"
                  class="chip bg-butter-100 text-butter-600"
                >
                  <Calendar
                    :size="11"
                    class="inline"
                  /> {{ activeClass.term }}
                </span>
                <span
                  v-if="activeClass.subjects && activeClass.subjects.length"
                  class="chip bg-mint-100 text-mint-500"
                >
                  本学期 {{ activeClass.subjects.length }} 个学科
                </span>
                <span
                  v-else
                  class="chip bg-cocoa-100 text-cocoa-500"
                >
                  不限制学科
                </span>
              </div>
            </div>
          </div>
          <div
            v-if="activeClass.slogan"
            class="mt-4 p-4 rounded-2xl bg-butter-100/60 hand text-lg"
          >
            "{{ activeClass.slogan }}"
          </div>
          <div
            v-if="activeClass.subjects && activeClass.subjects.length"
            class="mt-4"
          >
            <div class="text-xs text-cocoa-500 mb-2">
              本学期涉及学科
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="s in activeClass.subjects"
                :key="s"
                class="chip bg-mint-100 text-mint-500"
              >
                {{ s }}
              </span>
            </div>
          </div>
          <div class="mt-5 grid sm:grid-cols-2 gap-4">
            <div class="card-flat p-4">
              <div class="text-xs text-cocoa-500 mb-1">
                学生人数
              </div>
              <div class="number text-3xl">
                {{ studentsInActive.length }}
              </div>
            </div>
            <div class="card-flat p-4">
              <div class="text-xs text-cocoa-500 mb-1">
                任课老师
              </div>
              <div class="number text-3xl">
                {{ activeClass.teachers.length }}
              </div>
            </div>
          </div>
          <div class="mt-5">
            <div class="text-xs text-cocoa-500 mb-2">
              任课老师
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="t in activeClass.teachers"
                :key="t"
                class="chip bg-mint-100 text-mint-500"
              >
                {{ t }}
              </span>
              <span
                v-if="!activeClass.teachers.length"
                class="text-xs text-cocoa-300"
              >
                暂无
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="activeClass"
          class="card-soft p-6"
        >
          <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 class="title-display text-lg flex items-center gap-2">
              <BookOpen :size="18" /> 班级花名册
            </h3>
            <span
              class="text-[11px] px-2 py-0.5 rounded-full"
              :class="seatArranged ? 'bg-mint-100 text-mint-500' : 'bg-butter-100 text-butter-700'"
            >
              {{ seatArranged ? '座位已编排 · 按座位分布' : '座位未编排 · 按学号 5 列' }}
            </span>
          </div>

          <div
            v-if="studentsInActive.length"
            class="max-h-[440px] overflow-y-auto pr-1"
          >
            <!-- 座位已编排：按 seatRow/seatCol 在教室网格中定位 -->
            <template v-if="seatArranged">
              <div class="text-center text-[10px] text-cocoa-400 py-1 bg-cocoa-50 rounded mb-2">
                讲台
              </div>
              <div
                v-for="(row, ri) in seatGrid"
                :key="'r' + ri"
                class="mb-2"
              >
                <div class="text-[10px] text-cocoa-300 mb-1">
                  第 {{ ri + 1 }} 排
                </div>
                <div
                  class="grid gap-2"
                  :style="{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }"
                >
                  <template
                    v-for="(s, ci) in row"
                    :key="'c' + ri + '-' + ci"
                  >
                    <div
                      v-if="s"
                      class="card-flat p-3 flex items-center gap-2"
                    >
                      <div class="w-8 h-8 rounded-full bg-butter-300/80 flex items-center justify-center text-sm shrink-0">
                        {{ s.gender === '女' ? '👧' : '👦' }}
                      </div>
                      <div class="text-sm min-w-0">
                        <div class="truncate">{{ s.name }}</div>
                        <span v-if="s.duty" class="text-xs text-sky2-500">{{ s.duty }}</span>
                        <span v-else class="text-xs text-cocoa-300">#{{ s.studentNo }}</span>
                      </div>
                    </div>
                    <div
                      v-else
                      class="card-flat p-3 border border-dashed border-cocoa-100 opacity-40"
                    />
                  </template>
                </div>
              </div>
            </template>

            <!-- 座位未编排：按学号排序，5 列铺开 -->
            <template v-else>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                <div
                  v-for="s in rosterDefault"
                  :key="s.id"
                  class="card-flat p-3 flex items-center gap-2"
                >
                  <div class="w-8 h-8 rounded-full bg-butter-300/80 flex items-center justify-center text-sm shrink-0">
                    {{ s.gender === '女' ? '👧' : '👦' }}
                  </div>
                  <div class="text-sm min-w-0">
                    <div class="truncate">{{ s.name }}</div>
                    <span v-if="s.duty" class="text-xs text-sky2-500">{{ s.duty }}</span>
                    <span v-else class="text-xs text-cocoa-300">#{{ s.studentNo }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div
            v-if="!studentsInActive.length"
            class="text-center text-cocoa-500 py-4"
          >
            还没有学生
          </div>
        </div>

        <div
          v-if="activeClass"
          class="card-soft p-6"
        >
          <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 class="title-display text-lg flex items-center gap-2">
              <BookOpen :size="18" /> 班级课程表
            </h3>
            <button
              class="btn-secondary !py-1.5 !px-3 text-xs"
              @click="printSchedule"
            >
              <Printer :size="12" /> 打印
            </button>
          </div>
          <p class="text-xs text-cocoa-500 mb-3">
            点击单元格编辑科目；双击老师一栏快速修改执教老师（默认「未知」）
          </p>
          <ClassScheduleGrid
            :class-id="activeId ?? undefined"
            mode="single"
          />
        </div>

        <!-- 班级公告 -->
        <div
          v-if="activeClass"
          class="card-soft p-6"
        >
          <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 class="title-display text-lg flex items-center gap-2">
              <Megaphone :size="18" /> 班级公告
            </h3>
            <button
              class="btn-secondary !py-1.5 !px-3 text-xs"
              @click="openAddClassNotice"
            >
              <Plus :size="12" /> 发布公告
            </button>
          </div>
          <div
            v-if="classNotices.length"
            class="space-y-2.5"
          >
            <div
              v-for="n in classNotices"
              :key="n.id"
              class="card-flat p-3 border-l-4 border-butter-400"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="font-medium truncate">
                  {{ n.title }}
                </div>
                <button
                  class="text-xs text-sakura-400 hover:text-sakura-500 shrink-0"
                  @click="schoolStore.removeNotice(n.id)"
                >
                  删除
                </button>
              </div>
              <div class="text-xs text-cocoa-500 mt-1 line-clamp-2">
                {{ n.content }}
              </div>
              <div class="text-[10px] text-cocoa-300 mt-1.5">
                {{ n.pinned ? '已置顶 · ' : '' }}{{ formatShort(n.createdAt) }}
              </div>
            </div>
          </div>
          <div
            v-else
            class="text-center text-cocoa-500 py-4"
          >
            本班还没有公告
          </div>
        </div>

        <!-- 发布班级公告弹窗 -->
        <Modal
          :open="classNoticeOpen"
          title="发布班级公告"
          width="480px"
          @close="classNoticeOpen = false"
        >
          <div class="space-y-3">
            <div>
              <label class="text-sm text-cocoa-600 block mb-1.5">标题</label>
              <input
                v-model="noticeDraft.title"
                class="input-soft w-full"
                placeholder="如：本周家长开放日"
              >
            </div>
            <div>
              <label class="text-sm text-cocoa-600 block mb-1.5">内容</label>
              <textarea
                v-model="noticeDraft.content"
                class="input-soft w-full min-h-[80px]"
                placeholder="公告详情..."
              />
            </div>
            <label class="flex items-center gap-2 text-sm text-cocoa-600 cursor-pointer">
              <input
                v-model="noticeDraft.pinned"
                type="checkbox"
                class="rounded accent-butter-500"
              >
              置顶显示
            </label>
          </div>
          <template #footer>
            <button
              class="btn-secondary"
              @click="classNoticeOpen = false"
            >
              <X :size="14" /> 取消
            </button>
            <button
              class="btn-primary"
              @click="saveClassNotice"
            >
              <Save :size="14" /> 发布
            </button>
          </template>
        </Modal>

        <div
          v-if="!activeClass"
          class="text-center text-cocoa-500 py-8"
        >
          请在左侧选择一个班级
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      title="还没有班级"
      desc="先创建你的第一个班级吧"
      icon="🏫"
    >
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="16" /> 新建班级
      </button>
    </EmptyState>

    <Modal
      :open="modalOpen"
      :title="editing ? '编辑班级' : '新建班级'"
      width="560px"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班级名称（自动生成）</label>
          <div class="input-soft mt-1 flex items-center gap-1 text-cocoa-700">
            <School
              :size="14"
              class="text-cocoa-500"
            />
            <span class="font-medium">{{ draft.name || '请选择年级与班级' }}</span>
          </div>
        </div>
        <!-- 第二行：年级（下拉）+ 班级号 -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              <GraduationCap :size="11" /> 年级
            </label>
            <select
              v-model="draft.grade"
              class="input-soft mt-1"
              @change="recomputeName"
            >
              <option
                v-for="g in gradeOptions"
                :key="g"
                :value="g"
              >
                {{ g }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              <Hash :size="11" /> 班级
            </label>
            <select
              v-model="draft.classNo"
              class="input-soft mt-1"
              @change="recomputeName"
            >
              <option
                v-for="n in classNoOptions"
                :key="n"
                :value="n"
              >
                {{ n }}
              </option>
              <option
                v-if="!classNoOptions.includes(draft.classNo) && draft.classNo"
                :value="draft.classNo"
              >
                {{ draft.classNo }}（自定义）
              </option>
            </select>
            <div class="flex gap-2 mt-1">
              <input
                v-model="newClassNoInput"
                class="input-soft !py-1.5 !text-xs flex-1"
                placeholder="新增班级（如：六班）"
                @keyup.enter="addClassNo"
              >
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                @click="addClassNo"
              >
                <Plus :size="12" /> 添加
              </button>
            </div>
            <div
              v-if="extraClassNos.length"
              class="text-[10px] text-cocoa-500 mt-1"
            >
              已自定义：{{ extraClassNos.join('、') }}
            </div>
          </div>
        </div>
        <!-- 班主任（从通讯录单选） -->
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班主任（从教师通讯录选择）</label>
          <div class="relative">
            <button
              class="input-soft mt-1 flex items-center justify-between w-full text-left"
              @click="showHeadPicker = !showHeadPicker"
              type="button"
            >
              <span :class="draft.headTeacher ? '' : 'text-cocoa-300'">
                {{ draft.headTeacher || '点击选择老师…' }}
              </span>
              <ChevronDown
                :size="14"
                class="text-cocoa-500"
              />
            </button>
            <div
              v-if="showHeadPicker"
              class="absolute z-10 mt-1 w-full max-h-[200px] overflow-y-auto card-soft p-2"
            >
              <button
                class="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-butter-100 flex items-center gap-2"
                @click="draft.headTeacher = ''; showHeadPicker = false"
              >
                <span class="text-cocoa-300">— 清除选择 —</span>
              </button>
              <button
                v-for="t in teacherList"
                :key="t.id"
                class="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-butter-100 flex items-center gap-2"
                :class="draft.headTeacher === t.name ? 'bg-butter-100' : ''"
                @click="draft.headTeacher = t.name; showHeadPicker = false"
              >
                <span class="text-lg">{{ t.avatar }}</span>
                <span class="flex-1">{{ t.name }}</span>
                <span class="text-[10px] text-cocoa-500">{{ t.position }}</span>
              </button>
              <button
                v-if="!teacherList.length"
                class="w-full text-left px-2 py-1.5 text-sm text-cocoa-500 flex items-center gap-1"
                @click="gotoAddTeacher"
              >
                <UserPlus :size="12" /> 暂无老师，点此去添加 →
              </button>
            </div>
          </div>
          <div
            v-if="!draft.headTeacher"
            class="text-[11px] text-cocoa-300 mt-1"
          >
            <button
              class="text-sky2-500 hover:underline"
              @click="gotoAddTeacher"
            >
              <UserPlus
                :size="10"
                class="inline"
              /> 通讯录中还没有老师？点此去添加
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班级口号</label>
          <input
            v-model="draft.slogan"
            class="input-soft mt-1"
            placeholder="一句让孩子们记住的话"
            maxlength="60"
          >
        </div>
        <!-- 任课老师（从通讯录多选） -->
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-cocoa-500 ml-1">任课老师（可多选）</label>
            <button
              class="text-[11px] text-sky2-500 hover:underline"
              @click="showTeacherPicker = !showTeacherPicker"
            >
              {{ showTeacherPicker ? '收起 ▲' : '从通讯录勾选 ▼' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2 min-h-[32px]">
            <span
              v-for="t in draft.teachers"
              :key="t"
              class="chip bg-mint-100 text-mint-500"
            >
              {{ t }}
              <button
                class="hover:text-cocoa-900"
                @click="draft.teachers.splice(draft.teachers.indexOf(t), 1)"
              >
                <X :size="10" />
              </button>
            </span>
            <span
              v-if="!draft.teachers.length"
              class="text-xs text-cocoa-300"
            >暂未选择任课老师</span>
          </div>
          <div
            v-if="showTeacherPicker"
            class="mt-2 card-flat p-2 max-h-[200px] overflow-y-auto"
          >
            <div
              v-if="!teacherList.length"
              class="text-center py-2 text-xs text-cocoa-500"
            >
              <button
                class="text-sky2-500 hover:underline"
                @click="gotoAddTeacher"
              >
                <UserPlus
                  :size="10"
                  class="inline"
                /> 通讯录中还没有老师，点此去添加 →
              </button>
            </div>
            <div
              v-else
              class="grid grid-cols-2 gap-1"
            >
              <button
                v-for="t in teacherList"
                :key="t.id"
                class="text-left px-2 py-1.5 text-sm rounded-lg flex items-center gap-2 border transition"
                :class="
                  draft.teachers.includes(t.name)
                    ? 'bg-butter-200 border-butter-400 text-cocoa-900'
                    : 'bg-white/70 border-transparent hover:border-butter-200'
                "
                @click="toggleTeacher(t.name)"
              >
                <input
                  type="checkbox"
                  :checked="draft.teachers.includes(t.name)"
                  class="accent-butter-500"
                >
                <span class="text-lg">{{ t.avatar }}</span>
                <span class="flex-1 truncate">{{ t.name }}</span>
              </button>
            </div>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">卡片颜色</label>
          <div class="flex gap-2 mt-1">
            <button
              v-for="c in colorOptions"
              :key="c.name"
              class="w-9 h-9 rounded-2xl"
              :class="[c.bg, draft.color === c.name ? `ring-2 ${c.ring}` : '']"
              @click="draft.color = c.name"
            />
          </div>
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

    <!-- 学期设置弹框 (批量应用到所有班级) -->
    <Modal
      :open="termModalOpen"
      title="学期设置（应用到所有班级）"
      width="560px"
      @close="termModalOpen = false"
    >
      <div class="space-y-3">
        <div class="text-xs text-cocoa-500 bg-butter-100/40 p-2.5 rounded-2xl">
          将统一设置当前用户的默认学期，并同步应用到全部 {{ classStore.classes.length }} 个班级。设置后，各班级的成绩录入、考试计划、作业布置等位置默认只展示已勾选的学科。
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <Calendar :size="11" /> 本学期
          </label>
          <div class="mt-1 flex gap-2">
            <select
              v-model="termDraft.term"
              class="input-soft flex-1"
            >
              <option value="">
                — 不设置 —
              </option>
              <option
                v-for="t in termList"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
            <input
              v-model="termDraft.term"
              class="input-soft flex-1"
              placeholder="或自定义, 如 2026春季学期"
            >
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-cocoa-500 ml-1">本学期涉及学科（可多选）</label>
            <div class="flex gap-1.5">
              <button
                class="text-[10px] text-sky2-500 hover:underline"
                type="button"
                @click="termDraft.subjects = [...allSubjects]"
              >
                全选
              </button>
              <button
                class="text-[10px] text-sky2-500 hover:underline"
                type="button"
                @click="termDraft.subjects = []"
              >
                清空
              </button>
            </div>
          </div>
          <div class="mt-1.5 flex flex-wrap gap-2">
            <button
              v-for="s in allSubjects"
              :key="s"
              type="button"
              class="chip border transition"
              :class="
                termDraft.subjects.includes(s)
                  ? 'bg-mint-300 border-mint-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-mint-100'
              "
              @click="toggleTermSubject(s)"
            >
              {{ termDraft.subjects.includes(s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
          <div class="text-[10px] text-cocoa-500 mt-1.5">
            {{ termDraft.subjects.length ? `已选 ${termDraft.subjects.length} 个学科` : '未勾选时，各班级位置展示所有学科' }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="clearTerm"
        >
          <X :size="14" /> 清空所有
        </button>
        <button
          class="btn-secondary"
          @click="termModalOpen = false"
        >
          取消
        </button>
        <button
          class="btn-primary"
          @click="saveTerm"
        >
          <Save :size="14" /> 应用到所有班级
        </button>
      </template>
    </Modal>

    <!-- 班级整体同步弹框 -->
    <Modal
      :open="moveModalOpen"
      :title="`同步到其他班级 - ${moveFrom?.name || ''}`"
      width="560px"
      @close="moveModalOpen = false"
    >
      <div class="space-y-3">
        <div class="bg-sakura-100/40 p-2.5 rounded-2xl text-xs text-sakura-500 flex items-start gap-1.5">
          <AlertCircle
            :size="14"
            class="mt-0.5 shrink-0"
          />
          <div>
            该操作会同步班级下所有学生、课表、作业、考勤、成绩、奖惩、考试计划等到目标班级。
            <span
              v-if="moveDeleteSource"
              class="font-medium"
            >默认同时删除源班级。</span>
            <span v-else>源班级将保留为空班级。</span>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <ArrowRightLeft :size="11" /> 源班级
          </label>
          <div class="input-soft mt-1 flex items-center gap-1 text-cocoa-700">
            <School
              :size="14"
              class="text-cocoa-500"
            />
            <span class="font-medium">{{ moveFrom?.name }}</span>
            <span class="text-xs text-cocoa-500 ml-2">
              {{ moveSourceStudentsCount }} 名学生
            </span>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <Move :size="11" /> 目标班级
          </label>
          <select
            v-model="moveToId"
            class="input-soft mt-1"
          >
            <option value="">
              — 请选择目标班级 —
            </option>
            <option
              v-for="c in classStore.classes.filter((x) => x.id !== moveFrom?.id)"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}（{{ c.grade }} · 班主任 {{ c.headTeacher || '未设置' }}）
            </option>
          </select>
          <div
            v-if="moveToClass"
            class="text-[10px] text-cocoa-500 mt-1"
          >
            目标班级目前 {{ moveTargetStudentsCount }} 名学生，迁移后将变为 {{ moveTargetStudentsCount + moveSourceStudentsCount }} 名
          </div>
        </div>
        <div class="card-flat p-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="moveDeleteSource"
              type="checkbox"
              class="accent-sakura-500"
            >
            <span class="text-sm">迁移完成后，删除源班级「{{ moveFrom?.name }}」</span>
          </label>
          <div class="text-[10px] text-cocoa-500 mt-1 ml-6">
            取消勾选：源班级保留为 0 人空班级，可稍后手动删除
          </div>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="moveModalOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          :disabled="!moveToId || moveFrom?.id === moveToId"
          @click="confirmMove"
        >
          <ArrowRightLeft :size="14" /> 确认迁移
        </button>
      </template>
    </Modal>
  </div>
</template>
