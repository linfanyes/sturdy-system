<script setup lang="ts">
/**
 * 课表排版：网格编辑课表（行=早读/第1-8节/晚自习，列=星期），科目自动着色。
 * 对接后端 /schedules：加载、网格编辑、一键自动编排、保存到服务器、导出 CSV、打印。
 */
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarDays, Save, Printer, Trash2, Wand2, Loader2, Download, Pencil } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { SUBJECT_OPTIONS } from '@/constants/subjects'
import { listSchedules, createSchedule, deleteSchedule } from '@/api/teacher'
import Modal from '@/components/Modal.vue'
import { shuffle } from '@gardener/shared/utils/game-helpers'

const { classes } = useClasses()
const classId = ref('')
const dayCount = ref(5) // 5 / 6 / 7
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface Row {
  key: string
  label: string
  period: number
  /** 文字节次：早读/晚自习，普通节次为 null */
  section: string | null
  dim?: boolean
}
const ROWS: Row[] = [
  { key: 'morning', label: '早读', period: 0, section: '早读', dim: true },
  { key: 'p1', label: '第1节', period: 1, section: null },
  { key: 'p2', label: '第2节', period: 2, section: null },
  { key: 'p3', label: '第3节', period: 3, section: null },
  { key: 'p4', label: '第4节', period: 4, section: null },
  { key: 'p5', label: '第5节', period: 5, section: null },
  { key: 'p6', label: '第6节', period: 6, section: null },
  { key: 'p7', label: '第7节', period: 7, section: null },
  { key: 'p8', label: '第8节', period: 8, section: null },
  { key: 'evening', label: '晚自习', period: 99, section: '晚自习', dim: true },
]

interface Cell {
  id?: string
  subject: string
  teacher: string
  note: string
  weekType: 'all' | 'single' | 'double'
}

/** grid[rowKey][dayIndex] = Cell | null */
const grid = ref<Record<string, (Cell | null)[]>>({})
/** 最近一次从服务器加载的条目（保存时先删后建） */
const originalItems = ref<any[]>([])

const activeClass = computed(() => classes.value.find(c => c.id === classId.value))
const days = computed(() => DAY_NAMES.slice(0, dayCount.value))

/** 科目 → 样式映射（与 Schedule.vue 保持一致的主题色板） */
const SUBJECT_COLORS: Record<string, string> = {
  '语文': 'bg-sakura-100 text-sakura-700 border-sakura-200',
  '数学': 'bg-sky2-100 text-sky2-700 border-sky2-200',
  '英语': 'bg-mint-100 text-mint-700 border-mint-200',
  '物理': 'bg-butter-100 text-butter-700 border-butter-200',
  '化学': 'bg-cream-200 text-cocoa-700 border-cream-300',
  '生物': 'bg-green-100 text-green-700 border-green-200',
  '历史': 'bg-amber-100 text-amber-700 border-amber-200',
  '地理': 'bg-teal-100 text-teal-700 border-teal-200',
  '政治': 'bg-orange-100 text-orange-700 border-orange-200',
  '体育': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '音乐': 'bg-purple-100 text-purple-700 border-purple-200',
  '美术': 'bg-pink-100 text-pink-700 border-pink-200',
  '信息技术': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '科学': 'bg-lime-100 text-lime-700 border-lime-200',
}

const COMMON_SUBJECTS: string[] = SUBJECT_OPTIONS.map((s: { value: string }) => s.value)

function subjectClass(subj: string): string {
  if (!subj) return 'bg-surface text-cocoa-300 border-cream-200 hover:bg-cream-50'
  for (const [key, cls] of Object.entries(SUBJECT_COLORS)) {
    if (subj.includes(key)) return cls
  }
  return 'bg-cream-100 text-cocoa-700 border-cream-200'
}

function weekTypeBadge(wt?: string): string {
  if (!wt || wt === 'all') return ''
  if (wt === 'single') return '单'
  if (wt === 'double') return '双'
  return ''
}

/* ============ 网格初始化 / 加载 ============ */
function initGrid() {
  grid.value = Object.fromEntries(
    ROWS.map(r => [r.key, Array.from({ length: dayCount.value }, () => null as Cell | null)]),
  )
}

function resizeGrid() {
  for (const r of ROWS) {
    const cur = grid.value[r.key] || []
    const next = cur.slice(0, dayCount.value)
    while (next.length < dayCount.value) next.push(null)
    grid.value[r.key] = next
  }
}

async function load() {
  if (!classId.value) { initGrid(); originalItems.value = []; return }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await listSchedules({ classId: classId.value, take: 500 })
    const list: any[] = Array.isArray(res) ? res : (res?.items || [])
    originalItems.value = list
    initGrid()
    for (const it of list) {
      const row = ROWS.find(r => r.period === it.period)
      if (!row) continue
      const d = it.dayOfWeek
      if (d == null || d < 0 || d >= dayCount.value) continue
      grid.value[row.key][d] = {
        id: it.id,
        subject: it.subject || '',
        teacher: it.teacher || '',
        note: it.note || '',
        weekType: it.weekType || 'all',
      }
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '加载课表失败'
    initGrid()
  } finally {
    loading.value = false
  }
}

/* ============ 网格编辑（弹窗） ============ */
const editVisible = ref(false)
const editRowKey = ref('')
const editDayIdx = ref(0)
const editForm = ref<Cell>({ subject: '', teacher: '', note: '', weekType: 'all' })

const editRowLabel = computed(() => {
  const d = days.value[editDayIdx.value]
  const r = ROWS.find(x => x.key === editRowKey.value)
  return r && d ? `${d} · ${r.label}` : ''
})

function openEdit(key: string, d: number) {
  editRowKey.value = key
  editDayIdx.value = d
  const c = grid.value[key]?.[d]
  editForm.value = c
    ? { subject: c.subject, teacher: c.teacher, note: c.note, weekType: c.weekType }
    : { subject: '', teacher: '', note: '', weekType: 'all' }
  editVisible.value = true
}

function saveEdit() {
  const key = editRowKey.value
  const d = editDayIdx.value
  const existing = grid.value[key]?.[d]
  if (!editForm.value.subject.trim()) {
    if (grid.value[key]) grid.value[key][d] = null
  } else {
    if (grid.value[key]) {
      grid.value[key][d] = {
        id: existing?.id,
        subject: editForm.value.subject.trim(),
        teacher: editForm.value.teacher.trim(),
        note: editForm.value.note.trim(),
        weekType: editForm.value.weekType,
      }
    }
  }
  editVisible.value = false
}

function deleteEdit() {
  if (grid.value[editRowKey.value]) grid.value[editRowKey.value][editDayIdx.value] = null
  editVisible.value = false
}

async function clearAll() {
  if (!await confirm('确定清空当前课表？清空后请点击「保存到服务器」以同步到后端。')) return
  initGrid()
}

/* ============ 一键自动编排 ============ */

const DEFAULT_WEEKLY_HOURS: Record<string, number> = {
  '语文': 8, '数学': 6, '英语': 4,
  '科学': 3, '道法': 2, '体育': 3,
  '音乐': 2, '美术': 2, '劳动': 1, '信息': 1, '信息技术': 1,
  '物理': 4, '化学': 3, '生物': 2, '历史': 2, '地理': 2, '政治': 2,
}

function autoArrange() {
  if (!classId.value) { toast.warning('请先选择班级'); return }
  const cls = activeClass.value
  const subjects: string[] = (cls?.subjects && cls.subjects.length) ? cls.subjects : COMMON_SUBJECTS
  const stMap: Record<string, string> = cls?.subjectTeachers || {}
  const mainSubjects: string[] = ['语文', '数学', '英语'].filter(s => subjects.includes(s))
  const subSubjects: string[] = subjects.filter(s => !mainSubjects.includes(s))
  const hoursOf = (s: string) => DEFAULT_WEEKLY_HOURS[s] ?? 2
  const cellOf = (subj: string): Cell | null => subj
    ? { subject: subj, teacher: stMap[subj] || '', note: '', weekType: 'all' }
    : null
  const poolOf = (list: string[]): string[] => shuffle(list.flatMap(s => Array.from({ length: hoursOf(s) }, () => s)))

  initGrid()

  // 早读：优先语文，其次英语
  const morningReadSubj = mainSubjects.includes('语文')
    ? '语文'
    : (mainSubjects.includes('英语') ? '英语' : (mainSubjects[0] || ''))
  for (let d = 0; d < dayCount.value; d++) {
    grid.value['morning'][d] = cellOf(morningReadSubj)
  }

  // 上午（1-4节）排主科，避免与上一节同科
  const morningPool = poolOf(mainSubjects)
  let mi = 0
  for (let p = 1; p <= 4; p++) {
    const key = `p${p}`
    for (let d = 0; d < dayCount.value; d++) {
      const above = p > 1 ? grid.value[`p${p - 1}`][d] : null
      let guard = 0
      while (mi < morningPool.length && morningPool[mi] === above?.subject && guard < morningPool.length) {
        mi++; guard++
      }
      if (mi < morningPool.length) { grid.value[key][d] = cellOf(morningPool[mi]); mi++ }
    }
  }

  // 下午（5-8节）排副科，避免与上一节同科
  const afternoonPool = poolOf(subSubjects)
  let ai = 0
  for (let p = 5; p <= 8; p++) {
    const key = `p${p}`
    for (let d = 0; d < dayCount.value; d++) {
      const above = p > 1 ? grid.value[`p${p - 1}`][d] : null
      let guard = 0
      while (ai < afternoonPool.length && afternoonPool[ai] === above?.subject && guard < afternoonPool.length) {
        ai++; guard++
      }
      if (ai < afternoonPool.length) { grid.value[key][d] = cellOf(afternoonPool[ai]); ai++ }
    }
  }
  // 晚自习留空，可手动填写
}

/* ============ 保存到服务器（先删旧再建新） ============ */
function collectCells() {
  const out: any[] = []
  for (const r of ROWS) {
    for (let d = 0; d < dayCount.value; d++) {
      const c = grid.value[r.key]?.[d]
      if (c && c.subject && c.subject.trim()) {
        out.push({
          classId: classId.value,
          dayOfWeek: d,
          period: r.period,
          section: r.section,
          weekType: c.weekType || 'all',
          subject: c.subject.trim(),
          teacher: (c.teacher || '').trim(),
          note: (c.note || '').trim(),
        })
      }
    }
  }
  return out
}

async function saveToServer() {
  if (!classId.value) { toast.warning('请先选择班级'); return }
  saving.value = true
  try {
    // 1. 删除该班旧课表
    await Promise.allSettled(originalItems.value.map(it => deleteSchedule(it.id)))
    // 2. 批量创建当前格子
    const payload = collectCells()
    await Promise.all(payload.map(c => createSchedule(c)))
    // 3. 重新加载，刷新 id
    await load()
    toast.success('已保存到服务器')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/* ============ 导出 CSV ============ */
function csvCell(s: string): string {
  const v = String(s ?? '')
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

function cellText(c: Cell | null | undefined): string {
  if (!c || !c.subject) return ''
  return c.subject + (c.teacher ? `(${c.teacher})` : '') + (c.note ? ` ${c.note}` : '')
}

function exportCsv() {
  if (!classId.value) { toast.warning('请先选择班级'); return }
  const name = activeClass.value?.name || classId.value
  const header = ['节次', ...days.value]
  const rows = ROWS.map(r => [r.label, ...days.value.map((_, d) => cellText(grid.value[r.key]?.[d]))])
  const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `课表_${name}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function printSchedule() {
  window.print()
}

watch(classId, load)
watch(dayCount, resizeGrid)

onMounted(async () => {
  await loadClasses()
  initGrid()
  if (classes.value[0]) {
    // 设置 classId 会触发 watch(classId) → load()，避免重复请求
    classId.value = classes.value[0].id
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap no-print">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <CalendarDays class="w-6 h-6 text-butter-500" /> 课表排版
      </h1>
      <div class="flex items-center gap-2 flex-wrap print:hidden">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model.number="dayCount" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400">
          <option :value="5">周一到周五</option>
          <option :value="6">周一到周六</option>
          <option :value="7">周一到周日</option>
        </select>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 hover:bg-mint-300/30 text-sm" @click="autoArrange">
          <Wand2 class="w-4 h-4" /> 自动编排
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="clearAll">
          <Trash2 class="w-4 h-4" /> 清空
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="exportCsv">
          <Download class="w-4 h-4" /> 导出CSV
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="printSchedule">
          <Printer class="w-4 h-4" /> 打印
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 text-sm disabled:opacity-60"
          :disabled="saving || !classId"
          @click="saveToServer"
        >
          <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存到服务器' }}
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm no-print">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400 no-print">
      <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
    </div>

    <!-- 打印标题（仅打印时可见） -->
    <div class="hidden print:block text-center mb-2">
      <h2 class="text-xl font-bold text-cocoa-900">{{ activeClass?.name || '' }} 课程表</h2>
    </div>

    <!-- 课表网格 -->
    <div v-if="!loading" class="bg-surface rounded-2xl p-6 shadow-softer overflow-x-auto">
      <table class="w-full border-collapse min-w-[640px]">
        <thead>
          <tr>
            <th class="w-16 px-2 py-2 text-sm font-medium text-cocoa-500">节次</th>
            <th v-for="(d, i) in days" :key="i" class="px-2 py-2 text-sm font-medium text-cocoa-500">{{ d }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in ROWS" :key="r.key">
            <td :class="['px-2 py-1 text-center text-sm font-medium', r.dim ? 'text-butter-600' : 'text-cocoa-400']">{{ r.label }}</td>
            <td v-for="(d, di) in days" :key="di" class="px-1 py-1 align-top">
              <button
                type="button"
                :class="[
                  'w-full text-left text-sm px-2 py-2 rounded-lg border transition-colors min-h-[44px] flex flex-col gap-0.5',
                  subjectClass(grid[r.key]?.[di]?.subject || ''),
                ]"
                @click="openEdit(r.key, di)"
              >
                <template v-if="grid[r.key]?.[di]?.subject">
                  <span class="font-semibold truncate flex items-center gap-1">
                    <span class="truncate">{{ grid[r.key][di]!.subject }}</span>
                    <span v-if="weekTypeBadge(grid[r.key][di]!.weekType)" class="shrink-0 text-[9px] px-1 rounded bg-black/10">{{ weekTypeBadge(grid[r.key][di]!.weekType) }}</span>
                  </span>
                  <span v-if="grid[r.key][di]!.teacher" class="text-xs opacity-70 truncate">{{ grid[r.key][di]!.teacher }}</span>
                  <span v-if="grid[r.key][di]!.note" class="text-xs opacity-60 truncate">{{ grid[r.key][di]!.note }}</span>
                </template>
                <template v-else>
                  <span class="text-center text-cocoa-300 text-xs flex items-center justify-center gap-1">
                    <Pencil class="w-3 h-3" /> 添加
                  </span>
                </template>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 科目图例 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer no-print">
      <div class="text-xs text-cocoa-500 mb-2">科目颜色图例</div>
      <div class="flex flex-wrap gap-2">
        <span v-for="s in COMMON_SUBJECTS" :key="s" :class="['text-xs px-2.5 py-1 rounded-full border', subjectClass(s)]">{{ s }}</span>
      </div>
      <div class="text-xs text-cocoa-400 mt-3">
        提示：点击任一格子可编辑科目、任课老师、备注与周次；「自动编排」依据本班已设置的科目填充；编辑后请点击「保存到服务器」。
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Modal v-model="editVisible" :title="`编辑课程 · ${editRowLabel}`" width="max-w-md">
      <div class="space-y-3">
        <div>
          <label class="text-sm text-cocoa-500">科目</label>
          <select v-model="editForm.subject" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">（留空清除）</option>
            <option v-for="s in COMMON_SUBJECTS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">任课老师</label>
          <input v-model="editForm.teacher" placeholder="任课老师姓名" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">备注</label>
          <input v-model="editForm.note" placeholder="如：单周/双周/教室" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">周次</label>
          <select v-model="editForm.weekType" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="all">全周</option>
            <option value="single">单周</option>
            <option value="double">双周</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-sakura-600 hover:bg-sakura-50" @click="deleteEdit">删除</button>
        <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="editVisible = false">取消</button>
        <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="saveEdit">保存</button>
      </template>
    </Modal>
  </div>
</template>
