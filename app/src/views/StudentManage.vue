<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useGradeStore } from '../stores/grade'
import { useRewardStore } from '../stores/reward'
import { useSchoolStore } from '../stores/school'
import { useUserStore, currentTermStr } from '../stores/user'
import { useExamStore } from '../stores/exam'
import { useAIStore } from '../stores/ai'
import { useParentContactStore } from '../stores/parentContact'
import { useClassDutyStore } from '../stores/classDuty'
import type { Student, Gender } from '../types'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import AIImportPanel from '../components/common/AIImportPanel.vue'
import { Plus, Edit, Trash2, Search, Download, Upload, Save, X, Phone, Users, Filter, FileText, FileSpreadsheet, AlertCircle, CheckCircle2, Award, BookOpen, ClipboardCheck, Calendar, User, Hash, Home, GraduationCap, TrendingUp, TrendingDown, Heart, BookMarked, Cake, MessageCircle, School, Sparkles, Copy, ChevronDown, ChevronUp, BarChart3, Target, Zap, Activity, Trophy, LineChart, Radar, Sparkle, Check, Grid, FileText as FileTextIcon, Camera, Image as ImageIcon, Loader2 } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { parseTableFile, parsePastedText, downloadTXT, downloadExcel, type FormatType } from '../utils/excel'
import { subjectPalette } from '../seed'
import { fmtScore } from '../utils/format'
import { copyText, downloadBlob } from '../utils/download'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'
import { aiChat, AIError, isVisionModel, type AIChatContentPart } from '../utils/aiCall'
import { readFile, buildUserContent, type AIAttachment } from '../utils/aiAttachment'

const classStore = useClassStore()
const gradeStore = useGradeStore()
const rewardStore = useRewardStore()
const schoolStore = useSchoolStore()
const userStore = useUserStore()
const examStore = useExamStore()
const aiStore = useAIStore()
const parentContactStore = useParentContactStore()
const classDutyStore = useClassDutyStore()
const toast = useToastStore()

const { search, searchDebounced } = useDebouncedSearch(200)
const classFilter = ref<string>('all')
const genderFilter = ref<'all' | Gender>('all')
const selected = ref<string[]>([])

const modalOpen = ref(false)
const editing = ref<Student | null>(null)
const draftSnapshot = ref('')
const draft = ref<Omit<Student, 'id' | 'createdAt'>>({
  classId: '',
  name: '',
  gender: '男',
  studentNo: '',
  seatNo: 1,
  parentName: '',
  parentPhone: '',
  note: '',
  tags: [],
  duty: '',
})

const filtered = computed(() => {
  let list = [...classStore.students]
  if (classFilter.value !== 'all')
    list = list.filter((s) => s.classId === classFilter.value)
  if (genderFilter.value !== 'all')
    list = list.filter((s) => s.gender === genderFilter.value)
  if (searchDebounced.value.trim()) {
    const kw = searchDebounced.value.trim().toLowerCase()
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.studentNo.includes(kw) ||
        s.parentName.toLowerCase().includes(kw),
    )
  }
  return list
})

type SortKey = 'name' | 'gender' | 'studentNo' | 'seat' | 'duty'
const sortKey = ref<SortKey>('studentNo')
const sortOrder = ref<'asc' | 'desc'>('asc')
function toggleSort(k: SortKey) {
  if (sortKey.value === k) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = k
    sortOrder.value = 'asc'
  }
}
function seatSortVal(s: Student): number {
  if (s.seatRow != null && s.seatCol != null) return s.seatRow * 1000 + s.seatCol
  return s.seatNo || 0
}

const grouped = computed(() => {
  const map: Record<string, Student[]> = {}
  for (const s of filtered.value) {
    if (!map[s.classId]) map[s.classId] = []
    map[s.classId].push(s)
  }
  const dir = sortOrder.value === 'asc' ? 1 : -1
  for (const id in map) {
    map[id].sort((a, b) => {
      let r = 0
      switch (sortKey.value) {
        case 'studentNo':
          r = (parseInt(a.studentNo) || 0) - (parseInt(b.studentNo) || 0)
          break
        case 'seat':
          r = seatSortVal(a) - seatSortVal(b)
          break
        case 'duty':
          r = (a.duty || '').localeCompare(b.duty || '', 'zh')
          break
        case 'gender':
          r = a.gender.localeCompare(b.gender, 'zh')
          break
        default:
          r = a.name.localeCompare(b.name, 'zh')
      }
      return r * dir
    })
  }
  return map
})

const dutyOptions = computed(() => {
  if (!draft.value.classId) return []
  return classDutyStore.getDuties(draft.value.classId)
})

const draftDuties = computed(() =>
  (draft.value.duty || '')
    .split('、')
    .map((d) => d.trim())
    .filter(Boolean),
)

function addDraftDuty(duty: string) {
  if (!duty) return
  const list = draftDuties.value
  if (!list.includes(duty)) {
    draft.value.duty = [...list, duty].join('、')
  }
}

function removeDraftDuty(duty: string) {
  draft.value.duty = draftDuties.value.filter((d) => d !== duty).join('、')
}

function openCreate(forClass?: string) {
  editing.value = null
  const targetClass =
    forClass ||
    (classFilter.value !== 'all' ? classFilter.value : classStore.classes[0]?.id) ||
    ''
  draft.value = {
    classId: targetClass,
    name: '',
    gender: '男',
    studentNo: '',
    seatNo: classStore.studentsOf(targetClass).length + 1,
    parentName: '',
    parentPhone: '',
    note: '',
    tags: [],
    duty: '',
  }
  draftSnapshot.value = JSON.stringify(draft.value)
  modalOpen.value = true
}

function openEdit(s: Student) {
  editing.value = s
  draft.value = { ...s }
  draftSnapshot.value = JSON.stringify(draft.value)
  modalOpen.value = true
}

function findStudentDuplicate(): string | null {
  const name = draft.value.name.trim()
  const cid = draft.value.classId
  const seat = draft.value.seatNo
  const others = classStore.students.filter(
    (s) => s.classId === cid && s.id !== (editing.value?.id || ''),
  )
  if (others.some((s) => s.name.trim() === name))
    return `本班已存在同名学生「${name}」`
  if (seat != null && Number.isFinite(seat) && seat > 0) {
    const seatDup = others.find((s) => s.seatNo === seat)
    if (seatDup) return `座位号 ${seat} 已被「${seatDup.name}」占用`
  }
  return null
}

const draftDirty = computed(
  () => modalOpen.value && JSON.stringify(draft.value) !== draftSnapshot.value,
)

function save() {
  if (!draft.value.name.trim()) {
    toast.warning('请填写学生姓名')
    return
  }
  if (!draft.value.classId) {
    toast.warning('请选择班级')
    return
  }
  if (!Number.isInteger(draft.value.seatNo) || draft.value.seatNo < 1) {
    toast.warning('座位号需为正整数')
    return
  }
  const dup = findStudentDuplicate()
  if (dup) {
    toast.warning(dup)
    return
  }
  if (editing.value) {
    classStore.updateStudent(editing.value.id, draft.value)
    toast.success('已保存')
  } else {
    classStore.addStudent(draft.value)
    toast.success('已添加学生')
  }
  modalOpen.value = false
}

function remove(s: Student) {
  if (
    !confirm(
      `确定删除「${s.name}」吗？\n\n将同时级联清理：成绩、奖惩、考勤、点名历史。`,
    )
  )
    return
  // 级联清理
  gradeStore.clearByStudent([s.id])
  rewardStore.clearByStudent(s.classId, s.id)
  schoolStore.clearByStudent([s.id])
  // 再删学生
  classStore.removeStudent(s.id)
  toast.info(`已删除「${s.name}」`)
}

function removeBatch() {
  if (!selected.value.length) return
  if (
    !confirm(
      `确定删除选中的 ${selected.value.length} 名学生吗？\n\n将同时级联清理：成绩、奖惩、考勤、点名历史。`,
    )
  )
    return
  const ids = [...selected.value]
  // 级联清理
  gradeStore.clearByStudent(ids)
  for (const id of ids) {
    const stu = classStore.getStudent(id)
    if (stu) rewardStore.clearByStudent(stu.classId, id)
  }
  schoolStore.clearByStudent(ids)
  // 再删学生
  classStore.removeStudents(ids)
  selected.value = []
  toast.info(`已批量删除 ${ids.length} 名学生`)
}

function toggleSelect(id: string) {
  if (selected.value.includes(id))
    selected.value = selected.value.filter((x) => x !== id)
  else selected.value.push(id)
}

function toggleSelectAllInClass(classId: string) {
  const ids = grouped.value[classId].map((s) => s.id)
  const allSelected = ids.every((id) => selected.value.includes(id))
  if (allSelected) selected.value = selected.value.filter((x) => !ids.includes(x))
  else selected.value = Array.from(new Set([...selected.value, ...ids]))
}

// 批量导入
const importText = ref('')
const importOpen = ref(false)
const importFormat = ref<FormatType>('txt')
const importTargetClass = ref<string>('')
const importFile = ref<File | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
/** 弹框模式: 手动模板导入 / AI 智能识别 / 识图导入 */
const importMode = ref<'manual' | 'ai' | 'image'>('manual')

const importHeaders = ref<string[]>([])
const importRows = ref<string[][]>([])

// 识图导入相关
const importImageInput = ref<HTMLInputElement | null>(null)
const importImageFile = ref<File | null>(null)
const importImageDataUrl = ref<string | null>(null)
const importImageAtt = ref<AIAttachment | null>(null)
const isImageRecognizing = ref(false)

/** AI 智能识别: 接收 AIImportPanel 解析出的 records, 转为表格 rows */
function onAiRecords(records: Record<string, unknown>[]) {
  if (!records.length) {
    importHeaders.value = []
    importRows.value = []
    return
  }
  // 按 schema 字段顺序作为表头
  const headers = ['姓名', '性别', '学号', '家长姓名', '家长电话', '备注']
  const fieldMap: Record<string, string> = {
    姓名: 'name',
    性别: 'gender',
    学号: 'studentNo',
    家长姓名: 'parentName',
    家长电话: 'parentPhone',
    备注: 'note',
    name: 'name',
    gender: 'gender',
    studentNo: 'studentNo',
    parentName: 'parentName',
    parentPhone: 'parentPhone',
    note: 'note',
  }
  const rows = records.map((r) => {
    const row: string[] = []
    for (const h of headers) {
      const key = fieldMap[h] || h
      row.push(String(r[key] ?? ''))
    }
    return row
  })
  importHeaders.value = headers
  importRows.value = rows
  importMode.value = 'manual' // 切回手动模式, 让用户看到预览
  toast.success('已合并到下方预览, 可直接「确认导入」')
}

interface ImportPreview {
  name: string
  gender: Gender
  studentNo: string
  parentName: string
  parentPhone: string
  note: string
  ok: boolean
  reason?: string
}

const importPreview = computed<ImportPreview[]>(() => {
  return importRows.value.map((row) => {
    const [name = '', gender = '', studentNo = '', parentName = '', parentPhone = '', note = ''] = row
    const g: Gender = gender === '女' ? '女' : '男'
    return {
      name: name.trim(),
      gender: g,
      studentNo: studentNo.trim(),
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      note: note.trim(),
      ok: !!name.trim(),
      reason: name.trim() ? undefined : '姓名为空',
    }
  })
})

const importValidCount = computed(() => importPreview.value.filter((r) => r.ok).length)
const importInvalidCount = computed(() => importPreview.value.length - importValidCount.value)

function openImport() {
  importTargetClass.value =
    classFilter.value !== 'all' ? classFilter.value : classStore.classes[0]?.id || ''
  importText.value = ''
  importFile.value = null
  importHeaders.value = []
  importRows.value = []
  importFormat.value = 'txt'
  importMode.value = 'manual'
  clearImportImage()
  importOpen.value = true
}

function pickFile() {
  importFileInput.value?.click()
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFile.value = file
  try {
    const { headers, rows } = await parseTableFile(file)
    importHeaders.value = headers
    importRows.value = rows
    toast.success(`已解析 ${rows.length} 行数据`)
  } catch (err) {
    console.error(err)
    toast.error('文件解析失败：' + (err as Error).message)
    importRows.value = []
  }
  (e.target as HTMLInputElement).value = ''
}

function onTextInput() {
  const { headers, rows } = parsePastedText(importText.value)
  importHeaders.value = headers
  importRows.value = rows
}

function pickImportImage() {
  importImageInput.value?.click()
}

async function onImportImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const att = await readFile(file)
    if (att.kind !== 'image' || !att.dataUrl) {
      toast.warning('请选择图片文件')
      return
    }
    importImageFile.value = file
    importImageAtt.value = att
    importImageDataUrl.value = att.dataUrl
  } catch (err) {
    toast.error((err as Error).message)
  }
  const input = e.target as HTMLInputElement
  input.value = ''
}

function clearImportImage() {
  importImageFile.value = null
  importImageDataUrl.value = null
  importImageAtt.value = null
}

async function recognizeStudentsFromImage() {
  if (!importImageAtt.value?.dataUrl) {
    toast.warning('请先上传学生信息图片')
    return
  }
  if (!isVisionModel(aiStore.settings.visionModel)) {
    toast.warning('当前多模态模型不支持图片识别，请在「AI 对话」设置中切换为视觉模型（如 qwen-vl-plus）')
    return
  }
  isImageRecognizing.value = true
  try {
    const prompt = `请识别这张学生信息图片，提取每位学生的信息。
请按以下 JSON 数组格式返回，不要添加任何额外说明：
[
  {"name":"张三","gender":"男","studentNo":"2025001","parentName":"张先生","parentPhone":"13800001111","note":""},
  {"name":"李四","gender":"女","studentNo":"2025002","parentName":"李女士","parentPhone":"13800002222","note":""}
]
字段说明：
- name: 学生姓名（必填）
- gender: 性别，只能填「男」或「女」，无法判断时填「男」
- studentNo: 学号，没有则空字符串
- parentName: 家长姓名，没有则空字符串
- parentPhone: 家长电话，没有则空字符串
- note: 备注，没有则空字符串
请确保学生姓名保留原始写法，学号保留原始数字。`

    const content = buildUserContent(prompt, [importImageAtt.value]) as string | AIChatContentPart[]
    const res = await aiChat({
      messages: [{ role: 'user', content }],
      modelType: 'vision',
      stream: false,
      temperature: 0.3,
    })
    applyRecognizedStudents(res)
  } catch (e: any) {
    if (e?.name === 'AbortError') return
    const msg = e instanceof AIError ? e.message : e?.message || '识别失败'
    toast.error(msg)
  } finally {
    isImageRecognizing.value = false
  }
}

function applyRecognizedStudents(raw: string) {
  let jsonStr = raw
  const arrMatch = raw.match(/\[[\s\S]*\]/)
  if (arrMatch) jsonStr = arrMatch[0]
  let records: Record<string, unknown>[] = []
  try {
    records = JSON.parse(jsonStr)
  } catch {
    toast.warning('AI 返回无法解析，请重新上传或换一张清晰的图片')
    return
  }
  if (!Array.isArray(records)) {
    toast.warning('AI 返回格式不正确')
    return
  }
  if (!records.length) {
    toast.warning('未识别到学生信息')
    return
  }
  onAiRecords(records)
  toast.success(`已识别 ${records.length} 名学生，请核对后导入`)
}

async function downloadTemplate(fmt: FormatType) {
  if (!importTargetClass.value) {
    toast.warning('请先选择班级')
    return
  }
  const cls = classStore.getClass(importTargetClass.value)
  const filenameBase = `学生导入模板-${cls?.name || '班级'}`
  const headerRow = ['姓名', '性别', '学号', '家长姓名', '家长电话', '备注']
  const dataRows = classStore.studentsOf(importTargetClass.value).map((s) => [
    s.name,
    s.gender,
    s.studentNo,
    s.parentName,
    s.parentPhone,
    s.note,
  ])

  if (fmt === 'xlsx') {
    await downloadExcel(`${filenameBase}.xlsx`, '学生', [headerRow, ...dataRows])
  } else {
    const content = [headerRow.join('\t'), ...dataRows.map((r) => r.join('\t'))].join('\n')
    downloadTXT(`${filenameBase}.txt`, content)
  }
  toast.success(`${fmt === 'xlsx' ? 'Excel' : 'TXT'} 模板已下载`)
}

function parseImport() {
  if (!importTargetClass.value) {
    toast.warning('请选择导入的班级')
    return
  }
  const valid = importPreview.value.filter((r) => r.ok)
  if (!valid.length) {
    toast.error('没有可导入的有效数据')
    return
  }
  let count = 0,
    skipped = 0,
    contactSynced = 0
  const baseSeat = classStore.studentsOf(importTargetClass.value).length
  const existing = new Set(
    classStore.students
      .filter((s) => s.classId === importTargetClass.value)
      .map((s) => s.name.trim()),
  )
  const seen = new Set<string>()
  for (const r of valid) {
    const key = r.name.trim()
    if (existing.has(key) || seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)
    const student = classStore.addStudent({
      classId: importTargetClass.value,
      name: r.name,
      gender: r.gender,
      studentNo: r.studentNo,
      seatNo: baseSeat + count + 1,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
      note: r.note,
      tags: [],
    })
    // 家长信息（姓名/电话任一有值）同步进「家长联系记录」
    const pName = (r.parentName || '').trim()
    const pPhone = (r.parentPhone || '').trim()
    if (pName || pPhone) {
      parentContactStore.addContact({
        studentId: student.id,
        studentName: student.name,
        parentName: pName || '家长',
        relation: '家长',
        phone: pPhone,
        wechat: '',
        method: '电话',
        content: '学生信息导入时自动同步的家长联系方式',
        date: new Date().toISOString().slice(0, 10),
      })
      contactSynced++
    }
    count++
  }
  toast.success(
    `成功导入 ${count} 名学生${skipped ? `，跳过 ${skipped} 个重复` : ''}${contactSynced ? `，同步 ${contactSynced} 条家长联系` : ''}`,
  )
  importText.value = ''
  importFile.value = null
  importHeaders.value = []
  importRows.value = []
  clearImportImage()
  importOpen.value = false
}

function exportCSV() {
  if (!filtered.value.length) {
    toast.warning('当前没有可导出的学生')
    return
  }
  const lines = ['姓名,性别,学号,座位,班级,家长姓名,家长电话,备注']
  for (const s of filtered.value) {
    const c = classStore.getClass(s.classId)
    const seatText =
      s.seatRow != null && s.seatCol != null
        ? `第${s.seatRow}行第${s.seatCol}列`
        : s.seatNo
          ? String(s.seatNo)
          : '-'
    lines.push(
      [
        s.name,
        s.gender,
        s.studentNo,
        seatText,
        c?.name || '',
        s.parentName,
        s.parentPhone,
        (s.note || '').replace(/[,\n]/g, ' '),
      ].join(','),
    )
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '学生花名册.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ============== 双击查看学生本学期情况 ==============
const detailOpen = ref(false)
const detailStudent = ref<Student | null>(null)
const commentDraft = ref('')
const generatingComment = ref(false)

/** 当前学期: 班级学期 > 用户学期 > 默认推断 */
const detailTerm = computed(() => {
  if (!detailStudent.value) return ''
  const cls = classStore.getClass(detailStudent.value.classId)
  return cls?.term || userStore.user?.term || currentTermStr()
})

const detailClass = computed(() => {
  if (!detailStudent.value) return null
  return classStore.getClass(detailStudent.value.classId) || null
})

/** 该学生的成绩: 班级所有场次考试, 包含本学生的得分 */
const detailGrades = computed(() => {
  if (!detailStudent.value) return []
  const sid = detailStudent.value.id
  const cid = detailStudent.value.classId
  // 只遍历本班成绩一次，构建 Map 索引加速查找
  const classGrades = gradeStore.grades.filter((g) => g.classId === cid)
  return classGrades
    .map((g) => {
      const my = g.scores.find((x) => x.studentId === sid)
      // 单次遍历计算 allScores + 排名
      const allScores: number[] = []
      let myScoreNum: number | null = null
      for (const sc of g.scores) {
        const v = Number(sc.score)
        if (sc.score == null || !Number.isFinite(v)) continue
        allScores.push(v)
        if (sc.studentId === sid) myScoreNum = v
      }
      const count = allScores.length
      const avg = count ? allScores.reduce((a, b) => a + b, 0) / count : 0
      const max = count ? Math.max(...allScores) : 0
      const min = count ? Math.min(...allScores) : 0
      // 排名：比我分高的人数 + 1
      let rank: number | string = '-'
      if (myScoreNum != null) {
        let higher = 0
        for (const s of allScores) if (s > myScoreNum) higher++
        rank = higher + 1
      }
      return {
        id: g.id,
        subject: g.subject,
        examName: g.examName,
        date: g.date,
        score: my?.score ?? null,
        avg,
        max,
        min,
        rank,
        missed: myScoreNum == null,
      }
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1))
})

interface StudentExamDetail {
  examName: string
  date: string
  subjects: {
    subject: string
    score: number | null
    rank: number | string
    missed: boolean
  }[]
  total: number
  classRank: number
  gradeRank: number
}

/** 把学生成绩按考试聚合：每场考试一行，含日期、各科成绩+班排、总分、班级排名、年级排名 */
const detailExams = computed<StudentExamDetail[]>(() => {
  if (!detailStudent.value) return []
  const sid = detailStudent.value.id
  const classId = detailStudent.value.classId
  const cls = classStore.getClass(classId)
  const grade = cls?.grade || ''

  // 按 examName + date 分组
  const groups: Record<string, typeof detailGrades.value> = {}
  for (const g of detailGrades.value) {
    const key = `${g.examName}::${g.date}`
    if (!groups[key]) groups[key] = []
    groups[key].push(g)
  }

  // 预计算：同年级所有班级的 ID 列表（只算一次）
  const classesInGrade = grade
    ? classStore.classes.filter((c) => c.grade === grade).map((c) => c.id)
    : [classId]

  // 预计算每场考试每个班级的学生总分（一次性遍历所有成绩，避免 O(n²)）
  // key: examName::date::classId
  const examTotalsCache = new Map<string, Record<string, number>>()
  for (const g of gradeStore.grades) {
    const key = `${g.examName}::${g.date}::${g.classId}`
    let totals = examTotalsCache.get(key)
    if (!totals) {
      totals = {}
      examTotalsCache.set(key, totals)
    }
    for (const sc of g.scores) {
      const v = Number(sc.score)
      if (sc.score == null || !Number.isFinite(v)) continue
      totals[sc.studentId] = (totals[sc.studentId] || 0) + v
    }
  }

  // 获取某场考试某班的总分
  const getClassTotals = (examName: string, date: string, cid: string) => {
    return examTotalsCache.get(`${examName}::${date}::${cid}`) || {}
  }

  // 获取某场考试同年级所有学生总分
  const getGradeTotals = (examName: string, date: string) => {
    const totals: Record<string, number> = {}
    for (const cid of classesInGrade) {
      const classTotals = getClassTotals(examName, date, cid)
      for (const studentId in classTotals) {
        totals[studentId] = classTotals[studentId]
      }
    }
    return totals
  }

  // 计算排名的工具函数：比 target 高的人数 + 1
  const calcRank = (totals: Record<string, number>, target: number | undefined) => {
    if (target == null) return 0
    let higher = 0
    for (const id in totals) {
      if (totals[id] > target) higher++
    }
    return higher + 1
  }

  return Object.values(groups).map((list) => {
    const first = list[0]
    const total = list.reduce((sum, g) => sum + (g.missed ? 0 : Number(g.score || 0)), 0)

    const classTotals = getClassTotals(first.examName, first.date, classId)
    const classRank = calcRank(classTotals, classTotals[sid])

    const gradeTotals = getGradeTotals(first.examName, first.date)
    const gradeRank = calcRank(gradeTotals, gradeTotals[sid])

    return {
      examName: first.examName,
      date: first.date,
      subjects: list.map((g) => ({
        subject: g.subject,
        score: g.score,
        rank: g.rank,
        missed: g.missed,
      })),
      total,
      classRank,
      gradeRank,
    }
  })
})

async function copyExam(exam: StudentExamDetail) {
  const student = detailStudent.value
  if (!student) return
  const cls = classStore.getClass(student.classId)
  const className = cls ? `${cls.grade}${cls.name}` : '班级'
  const lines = [
    `考试：${exam.examName}`,
    `日期：${exam.date}`,
    `学生：${student.name}（${className}）`,
    ...exam.subjects.map((s) => {
      if (s.missed) return `${s.subject}：缺考`
      return `${s.subject}：${fmtScore(s.score)} 分（班排第 ${s.rank} 名）`
    }),
    `总分：${fmtScore(exam.total)} 分`,
    `班级排名：第 ${exam.classRank} 名`,
    `年级排名：第 ${exam.gradeRank} 名`,
  ]
  const ok = await copyText(lines.join('\n'))
  if (ok) toast.success('已复制该次考试成绩')
  else toast.error('复制失败，请手动复制')
}

/** 累计积分: 加分、减分、总分 */
const detailReward = computed(() => {
  if (!detailStudent.value) return { plus: 0, minus: 0, total: 0, recent: [] as any[] }
  const sid = detailStudent.value.id
  const all = rewardStore.records.filter((r) => r.studentId === sid)
  let plus = 0, minus = 0
  for (const r of all) {
    if (r.points >= 0) plus += r.points
    else minus += Math.abs(r.points)
  }
  return {
    plus,
    minus,
    total: plus - minus,
    recent: [...all].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 8),
  }
})

/** 作业概况 */
const detailHomework = computed(() => {
  if (!detailStudent.value) return { total: 0, latest: [] as any[] }
  // 作业本身不绑定到单个学生, 只能展示本班当前作业列表
  // 状态仅按作业整体显示, 因为无单生完成度
  const cid = detailStudent.value.classId
  const list = schoolStore.homework
    .filter((h) => h.classId === cid)
    .sort((a, b) => (a.deadline > b.deadline ? -1 : 1))
    .slice(0, 8)
  return { total: schoolStore.homework.filter((h) => h.classId === cid).length, latest: list }
})

/** 出勤概况: 统计最近 / 全量 */
const detailAttendance = computed(() => {
  if (!detailStudent.value) return { present: 0, late: 0, leave: 0, absent: 0, total: 0, recent: [] as any[] }
  const sid = detailStudent.value.id
  let present = 0, late = 0, leave = 0, absent = 0
  const recent: any[] = []
  const all = schoolStore.attendance
    .filter((a) => a.classId === detailStudent.value!.classId)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  for (const day of all) {
    const r = day.records.find((x) => x.studentId === sid)
    if (!r) continue
    if (r.status === '出勤') present++
    else if (r.status === '迟到') late++
    else if (r.status === '请假') leave++
    else if (r.status === '旷课') absent++
    if (recent.length < 10) recent.push({ date: day.date, status: r.status })
  }
  return { present, late, leave, absent, total: present + late + leave + absent, recent }
})

/** 综合能力分: 依据成绩排名与积分计算 (简单版) */
const detailOverall = computed(() => {
  const grades = detailGrades.value
  if (!grades.length) return { avgRank: '-', bestSubject: '-', weakestSubject: '-', examCount: 0, subjectCount: 0 }
  const valid = grades.filter((g) => !g.missed)
  if (!valid.length) return { avgRank: '-', bestSubject: '-', weakestSubject: '-', examCount: 0, subjectCount: 0 }
  const ranks = valid.map((g) => Number(g.rank)).filter((n) => !isNaN(n))
  const avgRank = ranks.length ? (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1) : '-'
  const sorted = [...valid].sort((a, b) => Number(a.rank) - Number(b.rank))
  const bestSubject = sorted[0]?.subject || '-'
  const weakestSubject = sorted[sorted.length - 1]?.subject || '-'
  // 考试场次数（按 examName+date 去重）
  const examSet = new Set(valid.map((g) => `${g.examName}::${g.date}`))
  return { avgRank, bestSubject, weakestSubject, examCount: examSet.size, subjectCount: valid.length }
})

// ============== 单次考试详细分析 ==============
const expandedExamKey = ref<string>('')

/** 科目默认满分: 语数英 100, 其他 50 */
function defaultFullScore(subject: string): number {
  return ['语文', '数学', '英语'].includes(subject) ? 100 : 50
}

/** 取某科目的满分: 优先读考试计划里配置的 subjectFullScores, 否则用默认 */
function getFullScore(classId: string, examName: string, date: string, subject: string): number {
  const e = examStore.exams.find(
    (x) => x.classId === classId && x.name.trim() === examName.trim() && x.date === date,
  )
  const cfg = e?.subjectFullScores?.[subject]
  return typeof cfg === 'number' && cfg > 0 ? cfg : defaultFullScore(subject)
}

interface ExamAnalysisSubject {
  subject: string
  score: number | null
  fullScore: number
  scoreRate: number
  avg: number
  max: number
  min: number
  rank: number | string
  classTotal: number
  aboveAvg: boolean
  level: 'excellent' | 'good' | 'pass' | 'fail' | 'missed'
  diffFromAvg: number
}

interface ExamAnalysis {
  examName: string
  date: string
  total: number
  totalFull: number
  totalRate: number
  classRank: number
  gradeRank: number
  classTotalStudents: number
  gradeTotalStudents: number
  gradeHasMultipleClasses: boolean
  subjects: ExamAnalysisSubject[]
  bestSubject: string
  weakestSubject: string
  excellentCount: number
  goodCount: number
  passCount: number
  failCount: number
  missedCount: number
  // 与上一次考试对比（仅对比两次考试共有的有效科目）
  prevExamName?: string
  totalDiff?: number
  rankDiff?: number
  improved: boolean
  declined: boolean
  comparedSubjects?: string[]
  comparedSubjectsCount?: number
}

/** 所有考试的分析结果缓存（computed，避免模板中重复计算） */
const detailExamAnalysisMap = computed<Record<string, ExamAnalysis>>(() => {
  const map: Record<string, ExamAnalysis> = {}
  if (!detailStudent.value) return map

  const sid = detailStudent.value.id
  const classId = detailStudent.value.classId
  const cls = classStore.getClass(classId)
  const grade = cls?.grade || ''

  // 年级班级数
  const classesInGrade = grade
    ? classStore.classes.filter((c) => c.grade === grade)
    : cls ? [cls] : []
  const gradeHasMultipleClasses = classesInGrade.length > 1
  const classTotalStudents = classStore.studentsOf(classId).length
  const gradeTotalStudents = classesInGrade.reduce(
    (sum, c) => sum + classStore.studentsOf(c.id).length,
    0,
  )

  // 预构建 detailGrades 的 Map 索引：key = examName::date::subject
  const gradeInfoMap = new Map<string, { avg: number; max: number; min: number; count: number }>()
  for (const g of detailGrades.value) {
    const key = `${g.examName}::${g.date}::${g.subject}`
    gradeInfoMap.set(key, {
      avg: g.avg,
      max: g.max,
      min: g.min,
      count: (g as any).count ?? 0,
    })
  }

  for (let i = 0; i < detailExams.value.length; i++) {
    const exam = detailExams.value[i]
    const examKey = `${exam.examName}::${exam.date}`

    // 各科详细分析
    const subjects: ExamAnalysisSubject[] = exam.subjects.map((s) => {
      const full = getFullScore(classId, exam.examName, exam.date, s.subject)
      const scoreNum = s.score != null ? Number(s.score) : null
      const scoreRate = scoreNum != null && full > 0 ? Math.round((scoreNum / full) * 1000) / 10 : 0

      const gradeInfo = gradeInfoMap.get(`${exam.examName}::${exam.date}::${s.subject}`)
      const avg = gradeInfo?.avg ?? 0
      const max = gradeInfo?.max ?? 0
      const min = gradeInfo?.min ?? 0
      const classTotal = gradeInfo?.count ?? 0

      const aboveAvg = scoreNum != null && scoreNum > avg
      const diffFromAvg = scoreNum != null ? Math.round((scoreNum - avg) * 10) / 10 : 0

      // 等级判定
      let level: ExamAnalysisSubject['level'] = 'missed'
      if (scoreNum != null && full > 0) {
        const rate = scoreNum / full
        if (rate >= 0.9) level = 'excellent'
        else if (rate >= 0.75) level = 'good'
        else if (rate >= 0.6) level = 'pass'
        else level = 'fail'
      }

      return {
        subject: s.subject,
        score: scoreNum,
        fullScore: full,
        scoreRate,
        avg,
        max,
        min,
        rank: s.rank,
        classTotal,
        aboveAvg,
        level,
        diffFromAvg,
      }
    })

    // 总分满分
    const totalFull = subjects.reduce((sum, s) => sum + s.fullScore, 0)
    const totalRate = totalFull > 0 ? Math.round((exam.total / totalFull) * 1000) / 10 : 0

    // 按得分率排序找最强最弱
    const validSubjects = subjects.filter((s) => s.score != null)
    const sortedByRate = [...validSubjects].sort((a, b) => b.scoreRate - a.scoreRate)
    const bestSubject = sortedByRate[0]?.subject || '-'
    const weakestSubject = sortedByRate[sortedByRate.length - 1]?.subject || '-'

    // 各等级数量
    const excellentCount = subjects.filter((s) => s.level === 'excellent').length
    const goodCount = subjects.filter((s) => s.level === 'good').length
    const passCount = subjects.filter((s) => s.level === 'pass').length
    const failCount = subjects.filter((s) => s.level === 'fail').length
    const missedCount = subjects.filter((s) => s.level === 'missed').length

    // 与上一次考试对比（仅对比两次考试共有的有效科目）
    let prevExamName: string | undefined
    let totalDiff: number | undefined
    let rankDiff: number | undefined
    let improved = false
    let declined = false
    let comparedSubjects: string[] = []
    let comparedSubjectsCount = 0

    if (i < detailExams.value.length - 1) {
      const prevExam = detailExams.value[i + 1]
      prevExamName = prevExam.examName

      // 找出两次考试共有的有效科目（该生都有成绩的）
      const currentValid = new Map(exam.subjects.filter((s) => !s.missed && s.score != null).map((s) => [s.subject, Number(s.score)]))
      const prevValid = new Map(prevExam.subjects.filter((s) => !s.missed && s.score != null).map((s) => [s.subject, Number(s.score)]))

      const commonSubjects: string[] = []
      let currentSum = 0
      let prevSum = 0
      for (const [subj, score] of currentValid) {
        if (prevValid.has(subj)) {
          commonSubjects.push(subj)
          currentSum += score
          prevSum += prevValid.get(subj)!
        }
      }

      if (commonSubjects.length > 0) {
        comparedSubjects = commonSubjects
        comparedSubjectsCount = commonSubjects.length
        totalDiff = currentSum - prevSum
        rankDiff = prevExam.classRank - exam.classRank
        improved = rankDiff > 0
        declined = rankDiff < 0
      }
    }

    map[examKey] = {
      examName: exam.examName,
      date: exam.date,
      total: exam.total,
      totalFull,
      totalRate,
      classRank: exam.classRank,
      gradeRank: exam.gradeRank,
      classTotalStudents,
      gradeTotalStudents,
      gradeHasMultipleClasses,
      subjects,
      bestSubject,
      weakestSubject,
      excellentCount,
      goodCount,
      passCount,
      failCount,
      missedCount,
      prevExamName,
      totalDiff,
      rankDiff,
      improved,
      declined,
      comparedSubjects,
      comparedSubjectsCount,
    }
  }

  return map
})

/** 获取某次考试的详细分析（从缓存 Map 中取） */
function getExamAnalysis(examKey: string): ExamAnalysis | null {
  return detailExamAnalysisMap.value[examKey] || null
}

function toggleExamAnalysis(examKey: string) {
  if (expandedExamKey.value === examKey) {
    expandedExamKey.value = ''
  } else {
    expandedExamKey.value = examKey
  }
}

// ============== 成绩趋势数据 ==============
interface TrendPoint {
  examName: string
  date: string
  total: number
  totalFull: number
  totalRate: number
  classRank: number
  classTotal: number
  rankPercent: number // 排名百分比（越小越好，0=第1名，100=最后一名）
}

/** 成绩趋势数据（历次考试，按时间正序） */
const detailTrend = computed<TrendPoint[]>(() => {
  if (!detailExams.value.length) return []
  // detailExams 是按日期倒序的，反转成正序
  return [...detailExams.value].reverse().map((exam) => {
    const analysis = detailExamAnalysisMap.value[`${exam.examName}::${exam.date}`]
    const totalFull = analysis?.totalFull ?? exam.subjects.length * 100
    const totalRate = totalFull > 0 ? Math.round((exam.total / totalFull) * 1000) / 10 : 0
    const classTotal = analysis?.classTotalStudents ?? 1
    const rankPercent = classTotal > 1 ? Math.round(((exam.classRank - 1) / (classTotal - 1)) * 100) : 0
    return {
      examName: exam.examName,
      date: exam.date,
      total: exam.total,
      totalFull,
      totalRate,
      classRank: exam.classRank,
      classTotal,
      rankPercent,
    }
  })
})

// ============== 学科能力雷达图数据 ==============
interface RadarSubject {
  subject: string
  avgRate: number // 平均得分率
  examCount: number
  bestRate: number
  color: string
}

/** 学科能力雷达图数据（各科目平均得分率） */
const detailRadar = computed<RadarSubject[]>(() => {
  if (!detailGrades.value.length) return []

  // 按科目分组
  const subjectMap = new Map<string, { rates: number[]; fullSum: number; scoreSum: number; count: number }>()

  for (const g of detailGrades.value) {
    if (g.missed || g.score == null) continue
    const full = getFullScore(detailStudent.value!.classId, g.examName, g.date, g.subject)
    if (!full) continue
    const rate = (Number(g.score) / full) * 100
    const existing = subjectMap.get(g.subject)
    if (existing) {
      existing.rates.push(rate)
      existing.fullSum += full
      existing.scoreSum += Number(g.score)
      existing.count += 1
    } else {
      subjectMap.set(g.subject, {
        rates: [rate],
        fullSum: full,
        scoreSum: Number(g.score),
        count: 1,
      })
    }
  }

  const result: RadarSubject[] = []
  for (const [subject, data] of subjectMap) {
    const avgRate = data.count > 0 ? Math.round((data.scoreSum / data.fullSum) * 1000) / 10 : 0
    const bestRate = data.rates.length > 0 ? Math.max(...data.rates) : 0
    const palette = subjectPalette[subject]
    result.push({
      subject,
      avgRate,
      examCount: data.count,
      bestRate,
      color: palette?.text || '#8b7355',
    })
  }

  // 按平均得分率降序
  return result.sort((a, b) => b.avgRate - a.avgRate)
})

// ============== 图表辅助函数 ==============
/** 趋势图：计算点的 X 坐标 */
function trendPointX(index: number): number {
  const len = detailTrend.value.length
  if (len <= 1) return 215
  const start = 50
  const end = 380
  return start + (end - start) * (index / (len - 1))
}

/** 趋势图：计算点的 Y 坐标（得分率越高越靠上） */
function trendPointY(rate: number): number {
  const top = 20
  const bottom = 100
  const clamped = Math.max(0, Math.min(100, rate))
  return bottom - (bottom - top) * (clamped / 100)
}

/** 趋势图：折线路径 */
const trendLinePath = computed(() => {
  if (!detailTrend.value.length) return ''
  const points = detailTrend.value.map((p, i) =>
    `${trendPointX(i)},${trendPointY(p.totalRate)}`,
  )
  return 'M' + points.join(' L')
})

/** 趋势图：面积路径 */
const trendAreaPath = computed(() => {
  if (!detailTrend.value.length) return ''
  const len = detailTrend.value.length
  const firstX = trendPointX(0)
  const lastX = trendPointX(len - 1)
  const linePath = trendLinePath.value
  return `${linePath} L${lastX},100 L${firstX},100 Z`
})

/** 雷达图：正多边形顶点坐标 */
function radarPolygonPoints(radius: number): string {
  const n = detailRadar.value.length
  if (n < 3) return ''
  const points: string[] = []
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return points.join(' ')
}

/** 雷达图：轴线端点 X */
function radarAxisX(index: number, radius: number): number {
  const n = detailRadar.value.length
  if (n < 3) return 0
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  return Math.cos(angle) * radius
}

/** 雷达图：轴线端点 Y */
function radarAxisY(index: number, radius: number): number {
  const n = detailRadar.value.length
  if (n < 3) return 0
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  return Math.sin(angle) * radius
}

/** 雷达图：数据点 X */
function radarDataX(index: number): number {
  const subj = detailRadar.value[index]
  if (!subj) return 0
  const radius = (subj.avgRate / 100) * 70
  return radarAxisX(index, radius)
}

/** 雷达图：数据点 Y */
function radarDataY(index: number): number {
  const subj = detailRadar.value[index]
  if (!subj) return 0
  const radius = (subj.avgRate / 100) * 70
  return radarAxisY(index, radius)
}

/** 雷达图：数据多边形 points */
const radarDataPoints = computed(() => {
  const n = detailRadar.value.length
  if (n < 3) return ''
  const points: string[] = []
  for (let i = 0; i < n; i++) {
    points.push(`${radarDataX(i).toFixed(1)},${radarDataY(i).toFixed(1)}`)
  }
  return points.join(' ')
})

/** 雷达图：标签位置 X */
function radarLabelX(index: number): number {
  return radarAxisX(index, 92)
}

/** 雷达图：标签位置 Y */
function radarLabelY(index: number): number {
  return radarAxisY(index, 92)
}

function openDetail(s: Student) {
  detailStudent.value = s
  commentDraft.value = s.comment || ''
  detailOpen.value = true
}

function saveComment() {
  if (!detailStudent.value) return
  classStore.updateStudent(detailStudent.value.id, { comment: commentDraft.value })
  toast.success('评语已保存到该学生档案')
}

// AI 生成单个学生评语
async function generateAComment() {
  if (!detailStudent.value) return
  if (!aiStore.settings.apiKey) {
    toast.error('请先在「AI 对话」右上角设置中配置 API Key')
    return
  }
  generatingComment.value = true
  try {
    const s = detailStudent.value
    const term = userStore.user?.term || currentTermStr()
    const cls = classStore.getClass(s.classId)

    // 收集该生成绩数据
    const examData = detailExams.value.map((e) => {
      const subs = e.subjects
        .map((sub) => `${sub.subject}:${sub.score ?? '缺考'}`)
        .join('、')
      return `${e.examName}（班排${e.classRank}）：${subs}`
    }).join('\n')

    // 出勤奖惩
    const attendance = `出勤${detailAttendance.value.present}、迟到${detailAttendance.value.late}、请假${detailAttendance.value.leave}、旷课${detailAttendance.value.absent}`
    const rewards = detailReward.value.plus > 0 ? `累计加分：${detailReward.value.plus}分` : '无加分记录'
    const punishments = detailReward.value.minus > 0 ? `累计扣分：${detailReward.value.minus}分` : '无扣分记录'

    const sys = '你是一位温柔负责、善于发现孩子闪光点的班主任。请综合学生本学期各科成绩、排名、奖惩与特点，为这位学生撰写一段期末评语。'
    const usr =
      `以下是「${term}」学期「${cls?.name || '本班'}」学生「${s.name}」的整体表现数据：\n` +
      `性别：${s.gender}\n` +
      `个人备注：${s.note || '暂无描述'}\n\n` +
      `成绩情况：\n${examData || '暂无成绩记录'}\n\n` +
      `出勤情况：${attendance}\n` +
      `${rewards}\n${punishments}\n\n` +
      `请为这位学生写一段评语：\n` +
      `- 语气亲切温暖，以鼓励和赞扬为主，先肯定整体亮点，再温和地提出一个期待；\n` +
      `- 结合其本学期整体表现，具体不空泛；\n` +
      `- 3~5 句话，150字左右；\n` +
      `- 直接输出评语内容，不要任何额外说明。`

    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
    })

    commentDraft.value = text.trim()
    toast.success('AI 评语已生成，可编辑后保存')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generatingComment.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300"
            :size="14"
          />
          <input
            v-model="search"
            class="input-soft !pl-9 !py-2 text-sm w-56"
            placeholder="搜索姓名/学号/家长"
          >
        </div>
        <select
          v-model="classFilter"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            所有班级
          </option>
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <select
          v-model="genderFilter"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部
          </option>
          <option value="男">
            男
          </option>
          <option value="女">
            女
          </option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="btn-secondary"
          @click="importOpen = true"
        >
          <Upload :size="14" /> 批量导入
        </button>
        <button
          class="btn-secondary"
          @click="exportCSV"
        >
          <Download :size="14" /> 导出 CSV
        </button>
        <button
          v-if="selected.length"
          class="btn-sakura"
          @click="removeBatch"
        >
          <Trash2 :size="14" /> 删除选中 ({{ selected.length }})
        </button>
        <button
          class="btn-primary"
          @click="openCreate()"
        >
          <Plus :size="14" /> 新增学生
        </button>
      </div>
    </div>

    <div class="text-[11px] text-cocoa-400 -mt-2">
      💡 双击学生行可查看该生本学期的各种情况
    </div>

    <div
      v-if="classStore.students.length"
      class="space-y-5"
    >
      <div
        v-for="(list, cid) in grouped"
        :key="cid"
        class="card-soft p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h3 class="title-display text-lg">
              {{ classStore.getClass(cid)?.name }}
            </h3>
            <span class="chip bg-butter-100 text-butter-600">
              {{ list.length }} 人
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-cocoa-500 hover:text-cocoa-900"
              @click="toggleSelectAllInClass(cid)"
            >
              {{
                list.every((s) => selected.includes(s.id))
                  ? '取消全选'
                  : '全选本班'
              }}
            </button>
            <button
              class="btn-secondary !py-1.5 !px-3 text-xs"
              @click="openCreate(cid)"
            >
              <Plus :size="12" /> 添加
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-cocoa-500 border-b border-cocoa-100/60">
                <th class="py-2 pr-2 w-8" />
                <th
                  class="py-2 pr-2 cursor-pointer select-none hover:text-cocoa-800"
                  @click="toggleSort('name')"
                >
                  姓名
                  <span v-if="sortKey === 'name'" class="text-butter-600">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th
                  class="py-2 pr-2 cursor-pointer select-none hover:text-cocoa-800"
                  @click="toggleSort('gender')"
                >
                  性别
                  <span v-if="sortKey === 'gender'" class="text-butter-600">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th
                  class="py-2 pr-2 cursor-pointer select-none hover:text-cocoa-800"
                  @click="toggleSort('studentNo')"
                >
                  学号
                  <span v-if="sortKey === 'studentNo'" class="text-butter-600">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th
                  class="py-2 pr-2 cursor-pointer select-none hover:text-cocoa-800"
                  @click="toggleSort('seat')"
                >
                  座位
                  <span v-if="sortKey === 'seat'" class="text-butter-600">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th
                  class="py-2 pr-2 cursor-pointer select-none hover:text-cocoa-800"
                  @click="toggleSort('duty')"
                >
                  职务
                  <span v-if="sortKey === 'duty'" class="text-butter-600">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="py-2 pr-2">
                  家长
                </th>
                <th class="py-2 pr-2">
                  联系电话
                </th>
                <th class="py-2 pr-2">
                  备注
                </th>
                <th class="py-2 pr-2 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in list"
                :key="s.id"
                class="border-b border-cocoa-100/40 hover:bg-butter-100/30 transition cursor-pointer"
                title="双击查看本学期情况"
                @dblclick="openDetail(s)"
              >
                <td class="py-2.5 pr-2">
                  <input
                    type="checkbox"
                    :checked="selected.includes(s.id)"
                    class="rounded accent-butter-500"
                    @change="toggleSelect(s.id)"
                  >
                </td>
                <td class="py-2.5 pr-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-7 h-7 rounded-full bg-butter-300/70 flex items-center justify-center text-sm"
                    >
                      {{ s.gender === '女' ? '👧' : '👦' }}
                    </div>
                    <span class="font-medium">{{ s.name }}</span>
                    <span
                      v-for="t in s.tags"
                      :key="t"
                      class="chip bg-sakura-100 text-sakura-500 text-[10px]"
                    >
                      {{ t }}
                    </span>
                  </div>
                </td>
                <td class="py-2.5 pr-2 text-cocoa-500">
                  {{ s.gender }}
                </td>
                <td class="py-2.5 pr-2 text-cocoa-500">
                  {{ s.studentNo || '-' }}
                </td>
                <td class="py-2.5 pr-2">
                  <span
                    v-if="s.seatRow && s.seatCol"
                    class="chip bg-butter-100 text-butter-600 text-[10px]"
                  >
                    第{{ s.seatRow }}行·第{{ s.seatCol }}列
                  </span>
                  <span
                    v-else
                    class="chip bg-cocoa-100 text-cocoa-400 text-[10px]"
                  >
                    未排座
                  </span>
                </td>
                <td class="py-2.5 pr-2">
                  <span v-if="s.duty" class="chip bg-sky2-100 text-sky2-600 text-[10px]">{{ s.duty }}</span>
                  <span v-else class="text-cocoa-300 text-xs">-</span>
                </td>
                <td class="py-2.5 pr-2 text-cocoa-700">
                  {{ s.parentName || '-' }}
                </td>
                <td class="py-2.5 pr-2 text-cocoa-700">
                  <a
                    v-if="s.parentPhone"
                    :href="`tel:${s.parentPhone}`"
                    class="text-sky2-500 hover:underline inline-flex items-center gap-1"
                  >
                    <Phone :size="12" /> {{ s.parentPhone }}
                  </a>
                  <span v-else>-</span>
                </td>
                <td class="py-2.5 pr-2 text-cocoa-500 max-w-[200px] truncate">
                  {{ s.note || '-' }}
                </td>
                <td class="py-2.5 pr-2 text-right">
                  <div class="flex justify-end gap-1">
                    <button
                      class="p-1.5 rounded-full hover:bg-butter-100"
                      @click="openEdit(s)"
                    >
                      <Edit :size="13" />
                    </button>
                    <button
                      class="p-1.5 rounded-full hover:bg-sakura-100"
                      @click="remove(s)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      title="还没有学生数据"
      desc="先在「班级管理」中创建班级，再来添加学生"
      icon="🧒"
    />

    <Modal
      :open="modalOpen"
      :title="editing ? '编辑学生' : '新增学生'"
      width="560px"
      :dirty="draftDirty"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">姓名</label>
            <input
              v-model="draft.name"
              class="input-soft mt-1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">性别</label>
            <div class="flex gap-2 mt-1">
              <button
                v-for="g in ['男', '女']"
                :key="g"
                class="flex-1 chip border"
                :class="
                  draft.gender === g
                    ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                    : 'bg-white/70 border-white/80 hover:bg-butter-100'
                "
                @click="draft.gender = g as Gender"
              >
                {{ g === '女' ? '👧' : '👦' }} {{ g }}
              </button>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">所属班级</label>
            <select
              v-model="draft.classId"
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
            <label class="text-xs text-cocoa-500 ml-1">学号</label>
            <input
              v-model="draft.studentNo"
              class="input-soft mt-1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">座位号</label>
            <input
              v-model.number="draft.seatNo"
              type="number"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">家长姓名</label>
            <input
              v-model="draft.parentName"
              class="input-soft mt-1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">家长电话</label>
            <input
              v-model="draft.parentPhone"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">备注</label>
          <textarea
            v-model="draft.note"
            class="input-soft mt-1 min-h-[80px]"
            placeholder="如：过敏食物、特长等"
          />
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <Award :size="11" /> 班级职务
          </label>
          <div class="mt-1 space-y-2">
            <div class="flex flex-wrap gap-2 min-h-[28px]">
              <span
                v-for="d in draftDuties"
                :key="d"
                class="chip bg-butter-100 text-butter-600 text-xs flex items-center gap-1"
              >
                {{ d }}
                <button
                  class="hover:text-cocoa-900"
                  @click="removeDraftDuty(d)"
                >
                  <X :size="10" />
                </button>
              </span>
              <span
                v-if="!draftDuties.length"
                class="text-xs text-cocoa-400 py-1"
              >
                未分配职务
              </span>
            </div>
            <select
              class="input-soft text-xs max-w-xs"
              @change="(e) => { addDraftDuty((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = '' }"
            >
              <option value="">
                + 添加职务
              </option>
              <option
                v-for="d in dutyOptions.filter((x) => !draftDuties.includes(x))"
                :key="d"
                :value="d"
              >
                {{ d }}
              </option>
            </select>
          </div>
          <div
            v-if="!dutyOptions.length && draft.classId"
            class="text-[11px] text-cocoa-400 mt-1"
          >
            该班级尚未配置职务，请到「班级管理 → 班级职务设置」中添加
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">标签（用逗号分隔）</label>
          <input
            class="input-soft mt-1"
            :value="draft.tags.join('，')"
            placeholder="如：班干部, 数学小组长"
            @blur="(e) => draft.tags = ((e.target as HTMLInputElement).value || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean)"
          >
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="modalOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="save"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>

    <Modal
      :open="importOpen"
      title="批量导入学生"
      width="820px"
      @close="importOpen = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-cocoa-500">
          支持 <b>TXT / Excel 模板</b> 导入、<b class="text-butter-600">AI 智能识别</b> 粘贴文本，或 <b class="text-butter-600">识图导入</b> 上传图片自动识别。
          字段顺序: 姓名、性别、学号、家长姓名、家长电话、备注。
        </p>

        <div>
          <label class="text-xs text-cocoa-500 ml-1">导入到</label>
          <select
            v-model="importTargetClass"
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

        <!-- 模式切换 -->
        <div class="flex items-center gap-1 card-flat p-1 w-fit">
          <button
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
            :class="importMode === 'manual' ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
            @click="importMode = 'manual'"
          >
            <FileText :size="12" /> 模板导入
          </button>
          <button
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
            :class="importMode === 'ai' ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
            @click="importMode = 'ai'"
          >
            <Sparkles :size="12" /> AI 智能识别
          </button>
          <button
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
            :class="importMode === 'image' ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
            @click="importMode = 'image'"
          >
            <Camera :size="12" /> 识图导入
          </button>
        </div>

        <!-- AI 智能识别模式 -->
        <AIImportPanel
          v-if="importMode === 'ai'"
          :schema="{
            name: 'students',
            fields: {
              name: '学生姓名 (必填)',
              gender: '性别 (男/女)',
              studentNo: '学号 (可空)',
              parentName: '家长姓名 (可空)',
              parentPhone: '家长电话 (可空)',
              note: '备注 (可空)',
            },
            example: {
              name: '张三',
              gender: '男',
              studentNo: '2025001',
              parentName: '张先生',
              parentPhone: '13800001111',
              note: '',
            },
            extra:
              '学生姓名一定要保留原始写法 (不要翻译/不要拼音), 学号要保留原始数字, 性别无法判断时填「男」.',
          }"
          :placeholder="
            '把任意格式的文本粘贴到此处, 例如:\n张三 男 2025001 张先生 13800001111\n李四 女 2025002 李女士 13800002222\n或 Excel 直接复制粘贴的整块表格'
          "
          :textarea-min-height="160"
          :on-parsed="onAiRecords"
        />

        <!-- 识图导入模式 -->
        <div
          v-else-if="importMode === 'image'"
          class="space-y-3"
        >
          <div
            class="border-2 border-dashed border-cocoa-100 rounded-2xl p-4 text-center cursor-pointer hover:border-butter-400 transition"
            @click="pickImportImage"
          >
            <div
              v-if="!importImageDataUrl"
              class="text-cocoa-500"
            >
              <ImageIcon
                :size="20"
                class="mx-auto mb-1"
              />
              <div class="text-sm">
                点击上传学生信息图片
              </div>
              <div class="text-[11px] mt-1">
                支持 .png / .jpg / .jpeg / .webp
              </div>
            </div>
            <div
              v-else
              class="relative"
            >
              <img
                :src="importImageDataUrl"
                class="max-h-48 mx-auto rounded-lg border border-cocoa-100"
              >
              <button
                class="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-cocoa-500 hover:text-sakura-500"
                @click.stop="clearImportImage"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
          <input
            ref="importImageInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onImportImageChange"
          >
          <div class="flex items-center gap-2 flex-wrap">
            <button
              class="btn-primary"
              :disabled="!importImageDataUrl || isImageRecognizing"
              @click="recognizeStudentsFromImage"
            >
              <Camera
                v-if="!isImageRecognizing"
                :size="14"
              />
              <Loader2
                v-else
                :size="14"
                class="animate-spin"
              />
              {{ isImageRecognizing ? '识别中...' : '点击识图' }}
            </button>
            <span class="text-[11px] text-cocoa-500">
              多模态模型：{{ aiStore.settings.visionModel || '未设置' }}
              <span
                v-if="!isVisionModel(aiStore.settings.visionModel)"
                class="text-sakura-500"
              >（不支持图片识别）</span>
            </span>
          </div>
          <p class="text-[11px] text-cocoa-500">
            识图结果会自动合并到下方预览，确认无误后再点击「确认导入」。
          </p>
        </div>

        <!-- 模板导入模式 -->
        <template v-else>
          <!-- 模板下载 -->
          <div class="card-flat p-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="text-sm font-medium">
                第一步：下载模板
              </div>
              <div class="flex gap-2">
                <button
                  class="btn-secondary !py-1.5 !px-3 text-xs"
                  @click="downloadTemplate('txt')"
                >
                  <FileText :size="12" /> TXT 模板
                </button>
                <button
                  class="btn-secondary !py-1.5 !px-3 text-xs"
                  @click="downloadTemplate('xlsx')"
                >
                  <FileSpreadsheet :size="12" /> Excel 模板
                </button>
              </div>
            </div>
            <p class="text-[11px] text-cocoa-500 mt-1.5">
              💡 Excel 模板里已自动填入本班现有学生，可直接修改后回传。
            </p>
          </div>

          <!-- 文件上传 -->
          <div class="card-flat p-3">
            <div class="text-sm font-medium mb-2">
              第二步：上传文件
            </div>
            <div
              class="border-2 border-dashed border-cocoa-100 rounded-2xl p-4 text-center cursor-pointer hover:border-butter-400 transition"
              @click="pickFile"
            >
              <div
                v-if="!importFile"
                class="text-cocoa-500"
              >
                <Upload
                  :size="20"
                  class="mx-auto mb-1"
                />
                <div class="text-sm">
                  点击选择 .txt / .xlsx / .xls 文件
                </div>
                <div class="text-[11px] mt-1">
                  或将文件拖到此处
                </div>
              </div>
              <div
                v-else
                class="flex items-center justify-center gap-2 text-sm text-mint-500"
              >
                <FileSpreadsheet :size="16" />
                <span>{{ importFile.name }}</span>
                <button
                  class="text-cocoa-300 hover:text-sakura-500"
                  @click.stop="importFile = null; importRows = []; importHeaders = []"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
            <input
              ref="importFileInput"
              type="file"
              accept=".txt,.csv,.xlsx,.xls"
              class="hidden"
              @change="onFileChange"
            >
            <p class="text-[11px] text-cocoa-500 mt-2">
              不想上传？也可以直接<button
                class="text-sky2-500 hover:underline"
                @click="importFormat = 'txt'"
              >
                切到下方手动输入
              </button>。
            </p>
          </div>

          <!-- 手动输入 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-cocoa-500 ml-1">或者直接粘贴</label>
              <div class="flex gap-1 text-[10px] text-cocoa-500">
                <span>支持 Tab / 空格 / 逗号</span>
              </div>
            </div>
            <textarea
              v-model="importText"
              class="input-soft min-h-[120px] font-mono text-xs"
              placeholder="姓名	性别	学号	家长姓名	家长电话	备注&#10;张三	男	2025001	张先生	13800001111	&#10;李四	女	2025002	李女士	13800002222	"
              @input="onTextInput"
            />
          </div>

        </template>

        <!-- 预览（通用） -->
        <div
          v-if="importRows.length"
          class="card-flat p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium flex items-center gap-2">
              <AlertCircle
                :size="14"
                class="text-cocoa-500"
              />
              解析预览（表头：{{ importHeaders.join(' / ') || '自动识别' }}）
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="chip bg-mint-100 text-mint-500">
                <CheckCircle2 :size="10" /> 有效 {{ importValidCount }}
              </span>
              <span
                v-if="importInvalidCount"
                class="chip bg-sakura-100 text-sakura-500"
              >
                <AlertCircle :size="10" /> 错误 {{ importInvalidCount }}
              </span>
            </div>
          </div>
          <div class="max-h-[200px] overflow-y-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-cocoa-500 border-b border-cocoa-100/60">
                  <th class="py-1.5 pr-2">
                    姓名
                  </th>
                  <th class="py-1.5 pr-2">
                    性别
                  </th>
                  <th class="py-1.5 pr-2">
                    学号
                  </th>
                  <th class="py-1.5 pr-2">
                    家长
                  </th>
                  <th class="py-1.5 pr-2">
                    电话
                  </th>
                  <th class="py-1.5">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in importPreview"
                  :key="i"
                  class="border-b border-cocoa-100/40"
                  :class="r.ok ? '' : 'bg-sakura-100/30'"
                >
                  <td class="py-1.5 pr-2">
                    {{ r.name || '（空）' }}
                  </td>
                  <td class="py-1.5 pr-2">
                    {{ r.gender }}
                  </td>
                  <td class="py-1.5 pr-2 text-cocoa-500">
                    {{ r.studentNo || '-' }}
                  </td>
                  <td class="py-1.5 pr-2 text-cocoa-500">
                    {{ r.parentName || '-' }}
                  </td>
                  <td class="py-1.5 pr-2 text-cocoa-500">
                    {{ r.parentPhone || '-' }}
                  </td>
                  <td class="py-1.5">
                    <span
                      v-if="r.ok"
                      class="text-mint-500 text-xs inline-flex items-center gap-1"
                    >
                      <CheckCircle2 :size="10" /> 就绪
                    </span>
                    <span
                      v-else
                      class="text-sakura-500 text-xs inline-flex items-center gap-1"
                    >
                      <AlertCircle :size="10" /> {{ r.reason }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="importOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          :disabled="!importValidCount"
          @click="parseImport"
        >
          <Upload :size="14" /> 导入 {{ importValidCount }} 名
        </button>
      </template>
    </Modal>

    <!-- 学生本学期情况弹框 (双击行触发) -->
    <Modal
      :open="detailOpen"
      width="900px"
      @close="detailOpen = false"
    >
      <template
        v-if="detailStudent"
        #title
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            :class="detailStudent.gender === '女' ? 'bg-sakura-300/70' : 'bg-mint-300/70'"
          >
            {{ detailStudent.gender === '女' ? '👧' : '👦' }}
          </div>
          <div>
            <div class="title-display text-lg flex items-center gap-2">
              {{ detailStudent.name }}
              <span class="chip bg-butter-100 text-butter-600 text-[10px]">
                <Calendar
                  :size="10"
                  class="inline"
                /> {{ detailTerm }}
              </span>
            </div>
            <div class="text-xs text-cocoa-500 mt-0.5">
              {{ detailClass?.name || '未分班' }} ·
              <template v-if="detailStudent.seatRow && detailStudent.seatCol">第{{ detailStudent.seatRow }}行·第{{ detailStudent.seatCol }}列</template>
              <template v-else>未排座</template>
              <span v-if="detailStudent.studentNo"> · 学号 {{ detailStudent.studentNo }}</span>
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="detailStudent"
        class="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
      >
        <!-- 基本信息 -->
        <section class="card-flat p-4">
          <div class="text-xs text-cocoa-500 mb-2 flex items-center gap-1">
            <User :size="12" /> 基本信息
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div class="text-[10px] text-cocoa-400">
                姓名
              </div>
              <div class="font-medium">
                {{ detailStudent.name }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">
                性别
              </div>
              <div class="font-medium">
                {{ detailStudent.gender }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">
                家长
              </div>
              <div class="font-medium">
                {{ detailStudent.parentName || '-' }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">
                联系电话
              </div>
              <div class="font-medium">
                <a
                  v-if="detailStudent.parentPhone"
                  :href="`tel:${detailStudent.parentPhone}`"
                  class="text-sky2-500 hover:underline"
                >{{ detailStudent.parentPhone }}</a>
                <span v-else>-</span>
              </div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">座次</div>
              <div class="font-medium">
                <template v-if="detailStudent.seatRow && detailStudent.seatCol">第{{ detailStudent.seatRow }}行·第{{ detailStudent.seatCol }}列</template>
                <template v-else>未排座</template>
              </div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">职务</div>
              <div class="font-medium">{{ detailStudent.duty || '无' }}</div>
            </div>
          </div>
          <!-- 班级信息: 班主任 / 所在学校 / 所在班级 同行紧凑展示 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3 pt-3 border-t border-cocoa-100/60">
            <div>
              <div class="text-[10px] text-cocoa-400">班主任</div>
              <div class="font-medium">{{ detailClass?.headTeacher || '-' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400 flex items-center gap-0.5"><School :size="10" /> 所在学校</div>
              <div class="font-medium">{{ userStore.user?.school || '暂未设置' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-cocoa-400">所在班级</div>
              <div class="font-medium">{{ detailClass?.name || '未分班' }}</div>
            </div>
          </div>
          <!-- 标签 / 备注 -->
          <div v-if="detailStudent.tags?.length" class="mt-3">
            <div class="text-[10px] text-cocoa-400">标签</div>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span v-for="t in detailStudent.tags" :key="t" class="chip bg-sakura-100 text-sakura-500 text-[10px]">{{ t }}</span>
            </div>
          </div>
          <div v-if="detailStudent.note" class="mt-3">
            <div class="text-[10px] text-cocoa-400">备注</div>
            <div class="text-cocoa-700">{{ detailStudent.note }}</div>
          </div>
        </section>

        <!-- 综合表现 -->
        <section class="card-flat p-4">
          <div class="text-xs text-cocoa-500 mb-2 flex items-center gap-1">
            <Award :size="12" /> 本学期综合表现
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div class="text-center">
              <div class="text-[10px] text-cocoa-400">
                考试场次
              </div>
              <div class="number text-xl text-butter-600 font-medium">
                {{ detailOverall.examCount }}
              </div>
              <div class="text-[9px] text-cocoa-300">
                共 {{ detailOverall.subjectCount }} 科次
              </div>
            </div>
            <div class="text-center">
              <div class="text-[10px] text-cocoa-400">
                平均名次
              </div>
              <div class="number text-xl text-butter-600 font-medium">
                {{ detailOverall.avgRank }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                <TrendingUp :size="10" /> 最强学科
              </div>
              <div class="text-sm font-medium text-mint-500">
                {{ detailOverall.bestSubject }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                <TrendingDown :size="10" /> 最弱学科
              </div>
              <div class="text-sm font-medium text-sakura-500">
                {{ detailOverall.weakestSubject }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-[10px] text-cocoa-400">
                奖励积分
              </div>
              <div
                class="number text-xl font-medium"
                :class="detailReward.total > 0 ? 'text-mint-500' : detailReward.total < 0 ? 'text-sakura-500' : 'text-cocoa-500'"
              >
                {{ detailReward.total > 0 ? '+' : '' }}{{ detailReward.total }}
              </div>
            </div>
          </div>
        </section>

        <!-- 成绩趋势图 -->
        <section
          v-if="detailTrend.length >= 2"
          class="card-flat p-4"
        >
          <div class="text-xs text-cocoa-500 mb-3 flex items-center gap-1">
            <LineChart :size="12" /> 成绩趋势
          </div>
          <div class="relative">
            <!-- SVG 趋势图 -->
            <svg
              viewBox="0 0 400 140"
              class="w-full h-[140px]"
              preserveAspectRatio="none"
            >
              <!-- 网格线 -->
              <line x1="40" y1="20" x2="390" y2="20" stroke="#f0ebe0" stroke-width="1" />
              <line x1="40" y1="60" x2="390" y2="60" stroke="#f0ebe0" stroke-width="1" />
              <line x1="40" y1="100" x2="390" y2="100" stroke="#f0ebe0" stroke-width="1" />
              <!-- Y轴标签 -->
              <text x="35" y="24" text-anchor="end" font-size="9" fill="#b8a99a">100%</text>
              <text x="35" y="64" text-anchor="end" font-size="9" fill="#b8a99a">60%</text>
              <text x="35" y="104" text-anchor="end" font-size="9" fill="#b8a99a">20%</text>
              <!-- 面积填充 -->
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#f5c542" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#f5c542" stop-opacity="0.05" />
                </linearGradient>
              </defs>
              <path
                :d="trendAreaPath"
                fill="url(#trendGradient)"
              />
              <!-- 折线 -->
              <path
                :d="trendLinePath"
                fill="none"
                stroke="#f5c542"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <!-- 数据点 -->
              <circle
                v-for="(p, i) in detailTrend"
                :key="i"
                :cx="trendPointX(i)"
                :cy="trendPointY(p.totalRate)"
                r="4"
                fill="#fff"
                stroke="#f5c542"
                stroke-width="2"
              />
              <!-- X轴标签 -->
              <text
                v-for="(p, i) in detailTrend"
                :key="'label-' + i"
                :x="trendPointX(i)"
                y="125"
                text-anchor="middle"
                font-size="9"
                fill="#8b7355"
              >
                {{ p.examName.replace('考试', '').replace('测试', '') }}
              </text>
            </svg>
            <!-- 排名趋势（右侧小标签） -->
            <div class="absolute right-0 top-0 text-[9px] text-cocoa-400 space-y-1">
              <div
                v-for="(p, i) in detailTrend"
                :key="'rank-' + i"
                class="flex items-center gap-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-mint-400"></span>
                第{{ p.classRank }}名
              </div>
            </div>
          </div>
          <div class="flex items-center justify-center gap-4 mt-2 text-[10px] text-cocoa-400">
            <span class="flex items-center gap-1">
              <span class="w-3 h-0.5 bg-butter-400 rounded"></span> 得分率
            </span>
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-mint-400"></span> 班级排名
            </span>
          </div>
        </section>

        <!-- 学科能力雷达图 -->
        <section
          v-if="detailRadar.length >= 3"
          class="card-flat p-4"
        >
          <div class="text-xs text-cocoa-500 mb-3 flex items-center gap-1">
            <Radar :size="12" /> 学科能力分析
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <!-- SVG 雷达图 -->
            <div class="flex-shrink-0">
              <svg
                viewBox="0 0 200 200"
                class="w-[180px] h-[180px]"
              >
                <!-- 雷达网格（正多边形） -->
                <g transform="translate(100, 100)">
                  <!-- 4层网格 -->
                  <polygon
                    v-for="layer in [4, 3, 2, 1]"
                    :key="'grid-' + layer"
                    :points="radarPolygonPoints(layer * 20)"
                    fill="none"
                    stroke="#ede5d8"
                    stroke-width="1"
                  />
                  <!-- 轴线 -->
                  <line
                    v-for="(subj, i) in detailRadar"
                    :key="'axis-' + i"
                    x1="0"
                    y1="0"
                    :x2="radarAxisX(i, 80)"
                    :y2="radarAxisY(i, 80)"
                    stroke="#ede5d8"
                    stroke-width="1"
                  />
                  <!-- 数据区域 -->
                  <polygon
                    :points="radarDataPoints"
                    fill="rgba(245, 197, 66, 0.25)"
                    stroke="#f5c542"
                    stroke-width="2"
                  />
                  <!-- 数据点 -->
                  <circle
                    v-for="(subj, i) in detailRadar"
                    :key="'dot-' + i"
                    :cx="radarDataX(i)"
                    :cy="radarDataY(i)"
                    r="3"
                    fill="#f5c542"
                  />
                  <!-- 学科标签 -->
                  <text
                    v-for="(subj, i) in detailRadar"
                    :key="'label-' + i"
                    :x="radarLabelX(i)"
                    :y="radarLabelY(i)"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-size="10"
                    fill="#6b5b4e"
                    font-weight="500"
                  >
                    {{ subj.subject }}
                  </text>
                </g>
              </svg>
            </div>
            <!-- 学科列表 -->
            <div class="flex-1 w-full">
              <div class="space-y-1.5">
                <div
                  v-for="subj in detailRadar"
                  :key="subj.subject"
                  class="flex items-center gap-1.5"
                >
                  <div
                    class="w-11 text-[11px] font-medium shrink-0 truncate"
                    :style="{ color: subj.color }"
                  >
                    {{ subj.subject }}
                  </div>
                  <div class="w-28 shrink-0">
                    <div class="h-2.5 bg-cream-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :style="{
                          width: subj.avgRate + '%',
                          backgroundColor: subj.color,
                          opacity: 0.7,
                        }"
                      />
                    </div>
                  </div>
                  <div class="text-left shrink-0 min-w-[40px]">
                    <span class="text-[11px] font-semibold" :style="{ color: subj.color }">
                      {{ subj.avgRate }}%
                    </span>
                    <span class="text-[9px] text-cocoa-400 ml-0.5">
                      ({{ subj.examCount }}次)
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-2 border-t border-cocoa-100/50 text-[10px] text-cocoa-400">
                💡 基于历次考试得分率平均值，反映各学科的综合掌握程度
              </div>
            </div>
          </div>
        </section>

        <!-- 成绩 -->
        <section class="card-flat p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              <BookOpen :size="12" /> 考试成绩（最近 {{ detailExams.length }} 场）
            </div>
            <div class="text-[10px] text-cocoa-400">
              💡 点击「考试分析」查看详细情况
            </div>
          </div>
          <div
            v-if="detailExams.length"
            class="space-y-3 max-h-[500px] overflow-y-auto pr-1"
          >
            <div
              v-for="exam in detailExams"
              :key="exam.examName + exam.date"
              class="rounded-2xl border border-cocoa-100/60 bg-white/60 dark:bg-cream-200/60 overflow-hidden"
            >
              <div class="p-3">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="font-medium text-cocoa-900">
                      {{ exam.examName }}
                    </div>
                    <div class="text-[10px] text-cocoa-500 flex items-center gap-1">
                      <Calendar :size="10" /> {{ exam.date }}
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      class="btn-ghost !py-1.5 !px-2 text-xs"
                      title="复制该次考试成绩"
                      @click="copyExam(exam)"
                    >
                      <Copy :size="12" /> 复制
                    </button>
                    <button
                      class="btn-secondary !py-1.5 !px-2 text-xs flex items-center gap-1"
                      @click="toggleExamAnalysis(exam.examName + '::' + exam.date)"
                    >
                      <BarChart3 :size="12" />
                      考试分析
                      <ChevronDown
                        v-if="expandedExamKey !== exam.examName + '::' + exam.date"
                        :size="12"
                      />
                      <ChevronUp v-else :size="12" />
                    </button>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 mb-2">
                  <div
                    v-for="s in exam.subjects"
                    :key="s.subject"
                    class="flex items-center gap-1.5 rounded-xl px-2 py-1"
                    :class="subjectPalette[s.subject]?.bg || 'bg-cream-100'"
                  >
                    <span
                      class="text-xs font-medium"
                      :class="subjectPalette[s.subject]?.text || 'text-cocoa-700'"
                    >
                      {{ s.subject }}
                    </span>
                    <span
                      v-if="s.missed"
                      class="text-[10px] text-sakura-500"
                    >缺考</span>
                    <span
                      v-else
                      class="text-sm font-semibold"
                      :class="subjectPalette[s.subject]?.text || 'text-cocoa-900'"
                    >
                      {{ fmtScore(s.score) }}
                    </span>
                    <span
                      v-if="!s.missed"
                      class="text-[10px] text-cocoa-400"
                    >
                      班排{{ s.rank }}
                    </span>
                  </div>
                </div>
                <div
                  class="grid gap-2 text-center text-xs border-t border-cocoa-100/50 pt-2"
                  :class="
                    getExamAnalysis(exam.examName + '::' + exam.date)?.gradeHasMultipleClasses
                      ? 'grid-cols-3'
                      : 'grid-cols-2'
                  "
                >
                  <div>
                    <div class="text-[10px] text-cocoa-500">
                      总分
                    </div>
                    <div class="number font-medium text-cocoa-900">
                      {{ fmtScore(exam.total) }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[10px] text-cocoa-500">
                      班级排名
                    </div>
                    <div class="number font-medium text-mint-500">
                      第 {{ exam.classRank }} 名
                    </div>
                  </div>
                  <div
                    v-if="getExamAnalysis(exam.examName + '::' + exam.date)?.gradeHasMultipleClasses"
                  >
                    <div class="text-[10px] text-cocoa-500">
                      年级排名
                    </div>
                    <div class="number font-medium text-sky2-500">
                      第 {{ exam.gradeRank }} 名
                    </div>
                  </div>
                </div>
              </div>

              <!-- 考试详细分析面板 -->
              <div
                v-if="expandedExamKey === exam.examName + '::' + exam.date && getExamAnalysis(exam.examName + '::' + exam.date)"
                class="border-t border-cocoa-100/60 bg-gradient-to-b from-butter-50/50 to-white/30 p-3 space-y-3"
              >
                <div
                  v-if="getExamAnalysis(exam.examName + '::' + exam.date)"
                  class="space-y-3"
                >
                  <!-- 总体概况 -->
                  <div
                    class="grid grid-cols-2 gap-2"
                    :class="
                      getExamAnalysis(exam.examName + '::' + exam.date)!.gradeHasMultipleClasses
                        ? 'sm:grid-cols-4'
                        : 'sm:grid-cols-3'
                    "
                  >
                    <div class="rounded-xl bg-white/80 p-2.5 text-center">
                      <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                        <Target :size="10" /> 总分得分率
                      </div>
                      <div class="number text-lg font-semibold text-butter-600 mt-0.5">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.totalRate }}%
                      </div>
                      <div class="text-[10px] text-cocoa-400">
                        {{ fmtScore(getExamAnalysis(exam.examName + '::' + exam.date)!.total) }} / {{ getExamAnalysis(exam.examName + '::' + exam.date)!.totalFull }}
                      </div>
                    </div>
                    <div class="rounded-xl bg-white/80 p-2.5 text-center">
                      <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                        <Award :size="10" /> 班级排名
                      </div>
                      <div class="number text-lg font-semibold text-mint-500 mt-0.5">
                        第 {{ getExamAnalysis(exam.examName + '::' + exam.date)!.classRank }} 名
                      </div>
                      <div class="text-[10px] text-cocoa-400">
                        共 {{ getExamAnalysis(exam.examName + '::' + exam.date)!.classTotalStudents }} 人
                      </div>
                    </div>
                    <div
                      v-if="getExamAnalysis(exam.examName + '::' + exam.date)!.gradeHasMultipleClasses"
                      class="rounded-xl bg-white/80 p-2.5 text-center"
                    >
                      <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                        <Trophy :size="10" /> 年级排名
                      </div>
                      <div class="number text-lg font-semibold text-sky2-500 mt-0.5">
                        第 {{ getExamAnalysis(exam.examName + '::' + exam.date)!.gradeRank }} 名
                      </div>
                      <div class="text-[10px] text-cocoa-400">
                        共 {{ getExamAnalysis(exam.examName + '::' + exam.date)!.gradeTotalStudents }} 人
                      </div>
                    </div>
                    <div class="rounded-xl bg-white/80 p-2.5 text-center">
                      <div class="text-[10px] text-cocoa-400 flex items-center justify-center gap-0.5">
                        <Zap :size="10" /> 最强学科
                      </div>
                      <div class="text-sm font-semibold text-mint-500 mt-1">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.bestSubject }}
                      </div>
                      <div class="text-[10px] text-sakura-400 mt-0.5">
                        最弱：{{ getExamAnalysis(exam.examName + '::' + exam.date)!.weakestSubject }}
                      </div>
                    </div>
                  </div>

                  <!-- 进退步对比 -->
                  <div
                    v-if="getExamAnalysis(exam.examName + '::' + exam.date)!.prevExamName && getExamAnalysis(exam.examName + '::' + exam.date)!.comparedSubjectsCount && getExamAnalysis(exam.examName + '::' + exam.date)!.comparedSubjectsCount! > 0"
                    class="rounded-xl bg-white/80 p-2.5"
                  >
                    <div class="text-[10px] text-cocoa-500 mb-1.5 flex items-center gap-1">
                      <Activity :size="10" /> 与上一次考试（{{ getExamAnalysis(exam.examName + '::' + exam.date)!.prevExamName }}）对比
                      <span class="text-cocoa-300">· 共 {{ getExamAnalysis(exam.examName + '::' + exam.date)!.comparedSubjectsCount }} 科对比</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          :class="
                            (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0) >= 0
                              ? 'bg-mint-100'
                              : 'bg-sakura-100'
                          "
                        >
                          <span
                            :class="
                              (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0) >= 0
                                ? 'text-mint-500'
                                : 'text-sakura-500'
                            "
                          >
                            {{ (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0) >= 0 ? '↑' : '↓' }}
                          </span>
                        </div>
                        <div>
                          <div class="text-xs text-cocoa-600">总分变化</div>
                          <div
                            class="text-sm font-semibold"
                            :class="
                              (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0) >= 0
                                ? 'text-mint-500'
                                : 'text-sakura-500'
                            "
                          >
                            {{ (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0) >= 0 ? '+' : '' }}{{ (getExamAnalysis(exam.examName + '::' + exam.date)!.totalDiff ?? 0).toFixed(1) }} 分
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          :class="
                            getExamAnalysis(exam.examName + '::' + exam.date)!.improved
                              ? 'bg-mint-100'
                              : getExamAnalysis(exam.examName + '::' + exam.date)!.declined
                                ? 'bg-sakura-100'
                                : 'bg-cream-100'
                          "
                        >
                          <span
                            :class="
                              getExamAnalysis(exam.examName + '::' + exam.date)!.improved
                                ? 'text-mint-500'
                                : getExamAnalysis(exam.examName + '::' + exam.date)!.declined
                                  ? 'text-sakura-500'
                                  : 'text-cocoa-400'
                            "
                          >
                            {{ getExamAnalysis(exam.examName + '::' + exam.date)!.improved ? '↑' : getExamAnalysis(exam.examName + '::' + exam.date)!.declined ? '↓' : '—' }}
                          </span>
                        </div>
                        <div>
                          <div class="text-xs text-cocoa-600">班排变化</div>
                          <div
                            class="text-sm font-semibold"
                            :class="
                              getExamAnalysis(exam.examName + '::' + exam.date)!.improved
                                ? 'text-mint-500'
                                : getExamAnalysis(exam.examName + '::' + exam.date)!.declined
                                  ? 'text-sakura-500'
                                  : 'text-cocoa-400'
                            "
                          >
                            {{
                              getExamAnalysis(exam.examName + '::' + exam.date)!.improved
                                ? '进步 ' + getExamAnalysis(exam.examName + '::' + exam.date)!.rankDiff + ' 名'
                                : getExamAnalysis(exam.examName + '::' + exam.date)!.declined
                                  ? '退步 ' + Math.abs(getExamAnalysis(exam.examName + '::' + exam.date)!.rankDiff ?? 0) + ' 名'
                                  : '持平'
                            }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="text-[9px] text-cocoa-300 mt-1.5">
                      💡 仅对比两次考试均有成绩的科目，缺考科目不计入
                    </div>
                  </div>

                  <!-- 各科详细分析 -->
                  <div class="rounded-xl bg-white/80 p-2.5">
                    <div class="text-[10px] text-cocoa-500 mb-2 flex items-center gap-1">
                      <BarChart3 :size="10" /> 各科成绩详细分析
                    </div>
                    <div class="space-y-2">
                      <div
                        v-for="sub in getExamAnalysis(exam.examName + '::' + exam.date)!.subjects"
                        :key="sub.subject"
                        class="flex items-center gap-2"
                      >
                        <div
                          class="w-14 text-xs font-medium shrink-0"
                          :class="subjectPalette[sub.subject]?.text || 'text-cocoa-700'"
                        >
                          {{ sub.subject }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <!-- 进度条 -->
                          <div class="h-4 bg-cream-100 rounded-full overflow-hidden relative">
                            <!-- 得分率 -->
                            <div
                              class="h-full rounded-full transition-all"
                              :class="
                                sub.level === 'excellent'
                                  ? 'bg-mint-400'
                                  : sub.level === 'good'
                                    ? 'bg-butter-400'
                                    : sub.level === 'pass'
                                      ? 'bg-sky2-400'
                                      : sub.level === 'fail'
                                        ? 'bg-sakura-400'
                                        : 'bg-cocoa-200'
                              "
                              :style="{ width: sub.scoreRate + '%' }"
                            />
                            <!-- 平均分线 -->
                            <div
                              v-if="sub.fullScore > 0 && sub.score !== null"
                              class="absolute top-0 h-full w-0.5 bg-cocoa-500/60"
                              :style="{ left: (sub.avg / sub.fullScore * 100) + '%' }"
                              title="班级平均分"
                            />
                          </div>
                        </div>
                        <div class="text-right shrink-0 min-w-[60px]">
                          <div class="text-xs font-semibold text-cocoa-800">
                            {{ sub.score !== null ? fmtScore(sub.score) : '缺考' }}
                            <span class="text-[10px] text-cocoa-400 font-normal">/{{ sub.fullScore }}</span>
                          </div>
                        </div>
                        <div class="text-right shrink-0 min-w-[50px]">
                          <div
                            class="text-[10px]"
                            :class="
                              sub.aboveAvg
                                ? 'text-mint-500'
                                : sub.score === null
                                  ? 'text-cocoa-400'
                                  : 'text-sakura-500'
                            "
                          >
                            {{
                              sub.score === null
                                ? '—'
                                : sub.aboveAvg
                                  ? '+' + sub.diffFromAvg
                                  : sub.diffFromAvg
                            }}
                          </div>
                        </div>
                        <div class="text-right shrink-0 min-w-[40px]">
                          <div class="text-[10px] text-cocoa-500">
                            第{{ sub.rank }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 mt-2 pt-2 border-t border-cocoa-100/50 text-[10px] text-cocoa-400 flex-wrap">
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-mint-400"></span> 优秀(≥90%)
                      </span>
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-butter-400"></span> 良好(≥75%)
                      </span>
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-sky2-400"></span> 及格(≥60%)
                      </span>
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-sakura-400"></span> 不及格
                      </span>
                      <span class="flex items-center gap-1 ml-auto">
                        <span class="w-0.5 h-3 bg-cocoa-500/60"></span> 班级平均分
                      </span>
                    </div>
                  </div>

                  <!-- 等级分布 -->
                  <div class="grid grid-cols-5 gap-2 text-center">
                    <div class="rounded-xl bg-mint-100/50 p-2">
                      <div class="number text-lg font-semibold text-mint-500">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.excellentCount }}
                      </div>
                      <div class="text-[10px] text-mint-600">优秀</div>
                    </div>
                    <div class="rounded-xl bg-butter-100/50 p-2">
                      <div class="number text-lg font-semibold text-butter-600">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.goodCount }}
                      </div>
                      <div class="text-[10px] text-butter-600">良好</div>
                    </div>
                    <div class="rounded-xl bg-sky2-100/50 p-2">
                      <div class="number text-lg font-semibold text-sky2-500">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.passCount }}
                      </div>
                      <div class="text-[10px] text-sky2-600">及格</div>
                    </div>
                    <div class="rounded-xl bg-sakura-100/50 p-2">
                      <div class="number text-lg font-semibold text-sakura-500">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.failCount }}
                      </div>
                      <div class="text-[10px] text-sakura-600">不及格</div>
                    </div>
                    <div class="rounded-xl bg-cream-100/50 p-2">
                      <div class="number text-lg font-semibold text-cocoa-400">
                        {{ getExamAnalysis(exam.examName + '::' + exam.date)!.missedCount }}
                      </div>
                      <div class="text-[10px] text-cocoa-500">缺考</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="text-cocoa-400 text-sm text-center py-4"
          >
            本学期暂无成绩记录
          </div>
        </section>

        <!-- 出勤 -->
        <section class="card-flat p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              <ClipboardCheck :size="12" /> 出勤情况
            </div>
            <div class="text-[10px] text-cocoa-400">
              最近 {{ detailAttendance.recent.length }} 条记录
            </div>
          </div>
          <div
            v-if="detailAttendance.total"
            class="space-y-3"
          >
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <div class="number text-xl text-mint-500">
                  {{ detailAttendance.present }}
                </div>
                <div class="text-[10px] text-cocoa-400">
                  出勤
                </div>
              </div>
              <div>
                <div class="number text-xl text-butter-500">
                  {{ detailAttendance.late }}
                </div>
                <div class="text-[10px] text-cocoa-400">
                  迟到
                </div>
              </div>
              <div>
                <div class="number text-xl text-sky2-500">
                  {{ detailAttendance.leave }}
                </div>
                <div class="text-[10px] text-cocoa-400">
                  请假
                </div>
              </div>
              <div>
                <div class="number text-xl text-sakura-500">
                  {{ detailAttendance.absent }}
                </div>
                <div class="text-[10px] text-cocoa-400">
                  旷课
                </div>
              </div>
              <div>
                <div class="number text-xl text-cocoa-700">
                  {{ detailAttendance.total }}
                </div>
                <div class="text-[10px] text-cocoa-400">
                  合计
                </div>
              </div>
            </div>
            <!-- 最近出勤记录 -->
            <div
              v-if="detailAttendance.recent.length"
              class="border-t border-cocoa-100/50 pt-3"
            >
              <div class="text-[10px] text-cocoa-400 mb-2">最近记录</div>
              <div class="space-y-1.5">
                <div
                  v-for="(r, i) in detailAttendance.recent"
                  :key="i"
                  class="flex items-center gap-2 text-xs"
                >
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                    :class="
                      r.status === '出勤'
                        ? 'bg-mint-100 text-mint-500'
                        : r.status === '迟到'
                          ? 'bg-butter-100 text-butter-600'
                          : r.status === '请假'
                            ? 'bg-sky2-100 text-sky2-500'
                            : 'bg-sakura-100 text-sakura-500'
                    "
                  >
                    {{
                      r.status === '出勤'
                        ? '✓'
                        : r.status === '迟到'
                          ? '迟'
                          : r.status === '请假'
                            ? '假'
                            : '旷'
                    }}
                  </div>
                  <div class="flex-1 text-cocoa-600">
                    {{ r.date }}
                  </div>
                  <div
                    class="text-xs font-medium"
                    :class="
                      r.status === '出勤'
                        ? 'text-mint-500'
                        : r.status === '迟到'
                          ? 'text-butter-600'
                          : r.status === '请假'
                            ? 'text-sky2-500'
                            : 'text-sakura-500'
                    "
                  >
                    {{ r.status }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="text-cocoa-400 text-sm text-center py-3"
          >
            暂无出勤记录
          </div>
        </section>

        <!-- 奖惩记录 -->
        <section class="card-flat p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              <Heart :size="12" /> 奖惩记录（最近 {{ detailReward.recent.length }} 条）
            </div>
            <div class="text-xs flex items-center gap-2">
              <span class="text-mint-500">+{{ detailReward.plus }}</span>
              <span class="text-sakura-500">-{{ detailReward.minus }}</span>
            </div>
          </div>
          <div
            v-if="detailReward.recent.length"
            class="space-y-1.5 max-h-[180px] overflow-y-auto"
          >
            <div
              v-for="r in detailReward.recent"
              :key="r.id"
              class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/60 text-sm"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span
                  class="chip text-[10px] !py-0.5"
                  :class="
                    r.type === '表扬' ? 'bg-mint-100 text-mint-500' :
                    r.type === '批评' ? 'bg-butter-100 text-butter-600' :
                    'bg-sakura-100 text-sakura-500'
                  "
                >{{ r.type }}</span>
                <span class="truncate text-cocoa-700">{{ r.reason || '（无说明）' }}</span>
              </div>
              <div class="text-xs flex items-center gap-2 shrink-0">
                <span class="text-cocoa-400">{{ r.date }}</span>
                <span
                  class="font-medium"
                  :class="r.points >= 0 ? 'text-mint-500' : 'text-sakura-500'"
                >{{ r.points >= 0 ? '+' : '' }}{{ r.points }}</span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="text-cocoa-400 text-sm text-center py-3"
          >
            暂无奖惩记录
          </div>
        </section>

        <!-- 作业（仅按班级作业统计, 不区分到该生） -->
        <section class="card-flat p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              <BookMarked :size="12" /> 本班作业概况
            </div>
            <div class="text-[10px] text-cocoa-400">
              共 {{ detailHomework.total }} 条 · 全班统一
            </div>
          </div>
          <div
            v-if="detailHomework.latest.length"
            class="space-y-1.5 max-h-[160px] overflow-y-auto"
          >
            <div
              v-for="h in detailHomework.latest"
              :key="h.id"
              class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/60 text-sm"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span
                  class="chip text-[10px] !py-0.5"
                  :class="subjectPalette[h.subject]?.bg + ' ' + subjectPalette[h.subject]?.text"
                >{{ h.subject }}</span>
                <span class="truncate text-cocoa-700">{{ h.title }}</span>
              </div>
              <div class="text-xs flex items-center gap-2 shrink-0">
                <span class="text-cocoa-400">截止 {{ h.deadline }}</span>
                <span
                  class="chip text-[10px] !py-0.5"
                  :class="
                    h.status === '已发还' ? 'bg-mint-100 text-mint-500' :
                    h.status === '已批改' ? 'bg-butter-100 text-butter-600' :
                    'bg-sakura-100 text-sakura-500'
                  "
                >{{ h.status }}</span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="text-cocoa-400 text-sm text-center py-3"
          >
            暂无作业布置
          </div>
          <div class="text-[10px] text-cocoa-300 mt-2">
            💡 作业为全班统一布置，不单独记录该生完成情况
          </div>
        </section>

        <!-- 评语 (AI 生成 / 可编辑) — 置于学生信息最后 -->
        <section class="card-flat p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              <MessageCircle :size="12" /> 学生评语
            </div>
            <div class="flex items-center gap-1.5">
              <button
                class="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1"
                :disabled="generatingComment"
                @click="generateAComment"
              >
                <Sparkles
                  :size="12"
                  :class="generatingComment ? 'animate-spin' : ''"
                />
                {{ generatingComment ? '生成中...' : 'AI 生成' }}
              </button>
              <button
                class="btn-secondary !py-1 !px-2.5 text-xs"
                @click="saveComment"
              >
                <Save :size="12" /> 保存
              </button>
            </div>
          </div>
          <textarea
            v-model="commentDraft"
            class="input-soft min-h-[90px] text-sm leading-relaxed"
            placeholder="暂无评语。点击上方「AI 生成」可自动生成个性化评语，也可手动编辑。"
          />
          <div class="text-[10px] text-cocoa-300 mt-2">
            💡 AI 评语基于该生成绩、出勤、奖惩等数据综合生成，可自由修改
          </div>
        </section>
      </div>

      <template #footer>
        <button
          class="btn-secondary"
          @click="detailOpen = false"
        >
          <X :size="14" /> 关闭
        </button>
        <button
          v-if="detailStudent"
          class="btn-primary"
          @click="openEdit(detailStudent); detailOpen = false"
        >
          <Edit :size="14" /> 编辑学生
        </button>
      </template>
    </Modal>
  </div>
</template>
