<script setup lang="ts">
/**
 * 座位表
 * - 班级选择（useClasses）
 * - 行数 × 列数网格编辑，点击格子填入学生（listClassStudents）
 * - grid 存学生 ID（与后端 seat-layouts.seats 一致），显示时映射为姓名
 * - 交互：选中侧边学生 → 点击格子放置；或点击两个格子交换
 * - 一键排座：按学号顺序 / 按成绩排名（需选考试）/ 随机 / 男女交替
 * - 保存：saveSeatLayout；加载历史布局：listSeatLayouts；启用：activateSeatLayout
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useClasses } from '@/composables/useClasses'
import {
  listClassStudents,
  saveSeatLayout,
  listSeatLayouts,
  activateSeatLayout,
  type TeacherStudent,
} from '@/api/teacher'
import request from '@/api/request'
import { LayoutGrid, Save, Download, Monitor, RefreshCw, Trash2 } from 'lucide-vue-next'

const { classes, loadClasses } = useClasses()
loadClasses()

const classId = ref('')
const rows = ref(5)
const cols = ref(6)
/** 座位网格：存学生 ID（null 表示空位），与后端 seats 结构一致 */
const grid = ref<(string | null)[][]>([])
const students = ref<TeacherStudent[]>([])
const layouts = ref<any[]>([])
const selectedStudent = ref<string | null>(null)
const selectedCell = ref<{ r: number; c: number } | null>(null)
const saving = ref(false)
const loadingLayout = ref(false)
const activatingId = ref('')

/** 一键排座模式 */
type ArrangeMode = 'studentNo' | 'grade' | 'random' | 'gender'
const arrangeMode = ref<ArrangeMode>('studentNo')
const arrangeModeOpts: { value: ArrangeMode; label: string }[] = [
  { value: 'studentNo', label: '按学号顺序' },
  { value: 'grade', label: '按成绩排名' },
  { value: 'random', label: '随机排座' },
  { value: 'gender', label: '男女交替' },
]

/** 考试列表（按成绩排座时使用） */
interface ExamOption { id: string; name: string; date: string }
const exams = ref<ExamOption[]>([])
const examId = ref('')

const assignedIds = computed(() => {
  const set = new Set<string>()
  for (const row of grid.value) for (const cell of row) if (cell) set.add(cell)
  return set
})

const unassignedStudents = computed(() =>
  students.value.filter(s => !assignedIds.value.has(s.id)),
)

function studentName(id: string | null) {
  if (!id) return ''
  return students.value.find(s => s.id === id)?.name || ''
}

function initGrid() {
  const g: (string | null)[][] = []
  for (let r = 0; r < rows.value; r++) {
    g.push(new Array(cols.value).fill(null))
  }
  grid.value = g
}

function resizeGrid() {
  const old = grid.value
  const g: (string | null)[][] = []
  for (let r = 0; r < rows.value; r++) {
    const row: (string | null)[] = []
    for (let c = 0; c < cols.value; c++) {
      row.push(old[r]?.[c] || null)
    }
    g.push(row)
  }
  grid.value = g
}

watch([rows, cols], () => {
  if (rows.value < 1) rows.value = 1
  if (cols.value < 1) cols.value = 1
  resizeGrid()
})

async function loadStudents(cid: string) {
  if (!cid) { students.value = []; return }
  try {
    const res = await listClassStudents(cid)
    students.value = Array.isArray(res) ? res : []
  } catch {
    students.value = []
  }
}

async function loadExams(cid: string) {
  if (!cid) { exams.value = []; return }
  try {
    const res = await request.get('/exams', { params: { classId: cid, take: 100 } })
    const list = Array.isArray(res) ? res : ((res as any)?.items || [])
    exams.value = list
      .map((e: any) => ({ id: e.id, name: e.name, date: e.date || '' }))
      .sort((a: ExamOption, b: ExamOption) => (b.date || '').localeCompare(a.date || ''))
  } catch {
    exams.value = []
  }
}

async function loadLayouts(cid: string) {
  if (!cid) { layouts.value = []; return }
  try {
    const res = await listSeatLayouts(cid)
    layouts.value = Array.isArray(res) ? res : ((res as any)?.items || [])
  } catch {
    layouts.value = []
  }
}

function onClassChange() {
  selectedStudent.value = null
  selectedCell.value = null
  examId.value = ''
  initGrid()
  loadStudents(classId.value)
  loadExams(classId.value)
  loadLayouts(classId.value)
}

function clickCell(r: number, c: number) {
  const cellVal = grid.value[r][c]
  // 模式 A：选中了学生 → 放置
  if (selectedStudent.value) {
    // 若格子有人，原占用者自然回到未入座池子
    grid.value[r][c] = selectedStudent.value
    selectedStudent.value = null
    selectedCell.value = null
    return
  }
  // 模式 B：交换两个格子
  if (cellVal) {
    if (!selectedCell.value) {
      selectedCell.value = { r, c }
      return
    }
    const a = selectedCell.value
    const tmp = grid.value[a.r][a.c]
    grid.value[a.r][a.c] = grid.value[r][c]
    grid.value[r][c] = tmp
    selectedCell.value = null
    return
  }
  // 空格子且无选中：忽略
  selectedCell.value = null
}

function clearCell(r: number, c: number) {
  grid.value[r][c] = null
}

/** 把给定学生 ID 列表按行优先填入网格（多余学生忽略，空位留 null） */
function fillGridByIds(ids: string[]) {
  initGrid()
  let i = 0
  for (let r = 0; r < rows.value && i < ids.length; r++) {
    for (let c = 0; c < cols.value && i < ids.length; c++) {
      grid.value[r][c] = ids[i++]
    }
  }
}

function sortByStudentNo(list: TeacherStudent[]) {
  return [...list].sort((a, b) =>
    String(a.studentNo || '').localeCompare(String(b.studentNo || ''), 'zh'),
  )
}

function arrangeByStudentNo() {
  fillGridByIds(sortByStudentNo(students.value).map(s => s.id))
}

function arrangeRandom() {
  const ids = students.value.map(s => s.id)
  // Fisher–Yates 洗牌
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  fillGridByIds(ids)
}

function arrangeAlternatingGender() {
  const sorted = sortByStudentNo(students.value)
  const males = sorted.filter(s => s.gender === '男').map(s => s.id)
  const females = sorted.filter(s => s.gender === '女').map(s => s.id)
  const ids: string[] = []
  const max = Math.max(males.length, females.length)
  for (let k = 0; k < max; k++) {
    if (k < males.length) ids.push(males[k])
    if (k < females.length) ids.push(females[k])
  }
  fillGridByIds(ids)
}

/** 按成绩排名：调 /grades/analysis/rank 取各科分数，按学生汇总总分降序；无成绩者按学号置后 */
async function arrangeByGrade() {
  if (!classId.value) { alert('请先选择班级'); return }
  if (!examId.value) { alert('请先选择考试'); return }
  try {
    const res: any = await request.get('/grades/analysis/rank', {
      params: { classId: classId.value, examId: examId.value },
    })
    const ranks = res?.ranks || []
    const sumMap = new Map<string, number>()
    for (const r of ranks) {
      const sid = r.studentId
      if (!sid) continue
      const score = Number(r.score) || 0
      sumMap.set(sid, (sumMap.get(sid) || 0) + score)
    }
    const rankedIds = [...sumMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sid]) => sid)
    const rankedSet = new Set(rankedIds)
    const restIds = sortByStudentNo(students.value.filter(s => !rankedSet.has(s.id))).map(s => s.id)
    fillGridByIds([...rankedIds, ...restIds])
  } catch (e: any) {
    alert('获取成绩排名失败：' + (e?.message || '请重试'))
  }
}

async function autoArrange() {
  if (!students.value.length) { alert('该班级暂无学生'); return }
  if (arrangeMode.value === 'studentNo') arrangeByStudentNo()
  else if (arrangeMode.value === 'random') arrangeRandom()
  else if (arrangeMode.value === 'gender') arrangeAlternatingGender()
  else if (arrangeMode.value === 'grade') await arrangeByGrade()
}

async function save() {
  if (!classId.value) { alert('请先选择班级'); return }
  saving.value = true
  try {
    await saveSeatLayout({
      classId: classId.value,
      rows: rows.value,
      cols: cols.value,
      seats: grid.value,
      name: `${rows.value}×${cols.value} 座位表`,
    })
    alert('座位表已保存，可在「加载历史」中启用')
    await loadLayouts(classId.value)
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function activate(layout: any) {
  if (!layout?.id) return
  activatingId.value = layout.id
  try {
    await activateSeatLayout(layout.id)
    alert(`已启用「${layout.name || ''}」，学生座位已回写`)
    await loadLayouts(classId.value)
  } catch (e: any) {
    alert('启用失败：' + (e?.message || '请重试'))
  } finally {
    activatingId.value = ''
  }
}

function applyLayout(layout: any) {
  if (!layout) return
  rows.value = layout.rows || 5
  cols.value = layout.cols || 6
  // 等 watch resize 后再写入 seats
  grid.value = JSON.parse(JSON.stringify(layout.seats || []))
  while (grid.value.length < rows.value) grid.value.push(new Array(cols.value).fill(null))
  for (const row of grid.value) {
    while (row.length < cols.value) row.push(null)
  }
}

onMounted(() => {
  initGrid()
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <LayoutGrid class="w-6 h-6 text-butter-500" /> 座位表
    </h1>

    <!-- 顶部控制栏 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-wrap items-end gap-4">
      <div class="min-w-[200px]">
        <label class="text-sm text-cocoa-500">班级</label>
        <select
          v-model="classId"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          @change="onClassChange"
        >
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">行数</label>
        <input
          v-model.number="rows"
          type="number"
          min="1"
          max="20"
          class="w-20 mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">列数</label>
        <input
          v-model.number="cols"
          type="number"
          min="1"
          max="20"
          class="w-20 mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">排座模式</label>
        <select
          v-model="arrangeMode"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        >
          <option v-for="o in arrangeModeOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div v-if="arrangeMode === 'grade'" class="min-w-[180px]">
        <label class="text-sm text-cocoa-500">考试</label>
        <select
          v-model="examId"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        >
          <option value="">请选择考试</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">
            {{ e.name }}{{ e.date ? `（${e.date.slice(0, 10)}）` : '' }}
          </option>
        </select>
      </div>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-100 text-cocoa-500 text-sm hover:bg-cream-200"
        @click="autoArrange"
      >
        <RefreshCw class="w-4 h-4" /> 一键排座
      </button>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-100 text-cocoa-500 text-sm hover:bg-cream-200"
        :disabled="!layouts.length"
        @click="loadingLayout = !loadingLayout"
      >
        <Download class="w-4 h-4" /> 加载历史
      </button>
      <button
        class="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
        :disabled="saving || !classId"
        @click="save"
      >
        <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存座位表' }}
      </button>
    </div>

    <!-- 历史布局列表 -->
    <div v-if="loadingLayout && layouts.length" class="bg-white rounded-2xl p-4 shadow-softer">
      <div class="text-sm text-cocoa-500 mb-2">点击加载历史布局，或启用某布局把座位回写到学生记录</div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="l in layouts"
          :key="l.id"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cream-100"
        >
          <button
            class="text-cocoa-700 text-sm hover:text-butter-600"
            @click="applyLayout(l); loadingLayout = false"
          >
            {{ l.name || `${l.rows}×${l.cols}` }}
            <span class="text-cocoa-400 ml-1">{{ l.createdAt?.slice(0, 10) }}</span>
            <span v-if="l.active" class="ml-1 text-green-600 font-medium">使用中</span>
          </button>
          <button
            class="text-xs px-2 py-0.5 rounded-full bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
            :disabled="activatingId === l.id || l.active"
            @click="activate(l)"
          >
            {{ activatingId === l.id ? '启用中…' : (l.active ? '已启用' : '启用') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="!classId" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      请先选择班级
    </div>

    <template v-else>
      <!-- 学生池 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-2">
          <h2 class="text-lg font-semibold text-cocoa-900">未入座学生</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ unassignedStudents.length }} / {{ students.length }}</span>
        </div>
        <p class="text-xs text-cocoa-400 mb-2">点击学生名选中，再点击网格空位放置；或点击两个已入座格子交换</p>
        <div v-if="!students.length" class="text-cocoa-400 text-sm">该班级暂无学生</div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="s in unassignedStudents"
            :key="s.id"
            :class="['text-sm px-3 py-1 rounded-full border transition', selectedStudent === s.id ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-700 hover:bg-cream-50']"
            @click="selectedStudent = selectedStudent === s.id ? null : s.id"
          >{{ s.name }}</button>
          <span v-if="!unassignedStudents.length" class="text-sm text-cocoa-400">全部已入座 🎉</span>
        </div>
      </div>

      <!-- 讲台 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center justify-center gap-2 py-2 mb-4 bg-gradient-to-b from-cream-100 to-cream-50 rounded-xl border border-cream-200">
          <Monitor class="w-5 h-5 text-cocoa-500" />
          <span class="font-semibold text-cocoa-700 tracking-widest">讲  台</span>
        </div>

        <!-- 座位网格 -->
        <div class="overflow-x-auto">
          <div
            class="grid gap-2 mx-auto"
            :style="{ gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))`, maxWidth: `${cols * 96}px` }"
          >
            <template v-for="r in rows" :key="r">
              <div
                v-for="c in cols"
                :key="`${r}-${c}`"
                :class="[
                  'relative h-16 rounded-xl border-2 flex items-center justify-center text-sm font-medium cursor-pointer transition',
                  selectedCell && selectedCell.r === r - 1 && selectedCell.c === c - 1
                    ? 'border-butter-500 bg-butter-100'
                    : grid[r - 1]?.[c - 1]
                      ? 'border-cream-200 bg-cream-50 text-cocoa-900 hover:border-butter-300'
                      : 'border-dashed border-cream-200 text-cocoa-300 hover:border-butter-300',
                ]"
                @click="clickCell(r - 1, c - 1)"
              >
                {{ studentName(grid[r - 1]?.[c - 1]) }}
                <button
                  v-if="grid[r - 1]?.[c - 1]"
                  class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200"
                  @click.stop="clearCell(r - 1, c - 1)"
                >
                  <Trash2 class="w-2.5 h-2.5" />
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
