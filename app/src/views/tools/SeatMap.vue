<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSeatStore } from '../../stores/seat'
import { useGradeStore, calcStat } from '../../stores/grade'
import { useToastStore } from '../../stores/toast'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import Modal from '../../components/common/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Shuffle, SortAsc, Trophy, ArrowDownUp } from 'lucide-vue-next'
import type { SeatLayout } from '../../types'

const classStore = useClassStore()
const seatStore = useSeatStore()
const gradeStore = useGradeStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const editingLayout = ref<SeatLayout | null>(null)
const modalOpen = ref(false)

const draft = ref({
  name: '',
  rows: 5,
  cols: 5,
  seats: [] as (string | null)[][],
})

const layouts = computed(() => seatStore.layoutsOfClass(classId.value))
const students = computed(() => classStore.studentsOf(classId.value))

/** 获取学生平均成绩（用于按成绩排序） */
function studentAvgScore(studentId: string): number {
  const grades = gradeStore.gradesOfClass(classId.value)
  let total = 0, count = 0
  for (const g of grades) {
    const s = g.scores.find(sc => sc.studentId === studentId)
    if (s?.score != null && typeof s.score === 'number') {
      total += s.score
      count++
    }
  }
  return count > 0 ? total / count : -1
}

/** 自动将未安排学生填入空座 */
function autoFillEmptySeats(sortedStudents: { id: string }[]) {
  const seats = draft.value.seats
  const assigned = new Set<string>()
  for (const row of seats) {
    for (const s of row) {
      if (s) assigned.add(s)
    }
  }
  // 未安排的学生（按传入顺序）
  const unplaced = sortedStudents.filter(s => !assigned.has(s.id))
  // 遍历空座，依次填入
  for (let r = 0; r < seats.length && unplaced.length > 0; r++) {
    for (let c = 0; c < seats[r].length && unplaced.length > 0; c++) {
      if (seats[r][c] === null) {
        seats[r][c] = unplaced.shift()!.id
      }
    }
  }
}

/** 按学号排序的学生列表 */
function studentsByNo() {
  return [...students.value].sort((a, b) => {
    const na = parseInt(a.studentNo) || 0
    const nb = parseInt(b.studentNo) || 0
    return na - nb
  })
}

/** 按成绩排序的学生列表（从高到低） */
function studentsByGrade() {
  return [...students.value].sort((a, b) => studentAvgScore(b.id) - studentAvgScore(a.id))
}

/** 随机打乱 */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 重排座位 */
function rearrangeSeats(mode: 'studentNo' | 'grade' | 'random') {
  // 清空所有座位
  const totalSeats = draft.value.rows * draft.value.cols
  const seats: (string | null)[][] = Array.from({ length: draft.value.rows }, () => Array(draft.value.cols).fill(null))
  draft.value.seats = seats

  let ordered: { id: string }[]
  if (mode === 'studentNo') {
    ordered = studentsByNo()
  } else if (mode === 'grade') {
    ordered = studentsByGrade()
  } else {
    ordered = shuffleArray(students.value)
  }

  autoFillEmptySeats(ordered)
  const label = mode === 'studentNo' ? '学号' : mode === 'grade' ? '成绩' : '随机'
  toast.success(`已按${label}重新编排`)
}

/** 打开新建 */
function openCreate() {
  editingLayout.value = null
  const r = 5, c = 5
  const seats: (string | null)[][] = Array.from({ length: r }, () => Array(c).fill(null))
  draft.value = { name: '新座位表', rows: r, cols: c, seats }
  // 默认按学号自动填充
  autoFillEmptySeats(studentsByNo())
  modalOpen.value = true
}

/** 打开编辑 */
function openEdit(layout: SeatLayout) {
  editingLayout.value = layout
  draft.value = {
    name: layout.name,
    rows: layout.rows,
    cols: layout.cols,
    seats: layout.seats.map(r => [...r]),
  }
  // 编辑时自动将新增的未安排学生填入空座
  autoFillEmptySeats(studentsByNo())
  modalOpen.value = true
}

function resizeSeats(newRows: number, newCols: number) {
  const old = draft.value.seats
  const seats: (string | null)[][] = Array.from({ length: newRows }, (_, r) =>
    Array.from({ length: newCols }, (_, c) => old[r]?.[c] ?? null)
  )
  draft.value.rows = newRows
  draft.value.cols = newCols
  draft.value.seats = seats
  // 尺寸变化后自动填充
  autoFillEmptySeats(studentsByNo())
}

function studentName(id: string | null) {
  if (!id) return ''
  return students.value.find(s => s.id === id)?.name || '?'
}

function studentNo(id: string | null) {
  if (!id) return ''
  return students.value.find(s => s.id === id)?.studentNo || ''
}

/** 左侧（讲台后方左半区）应包含的列数：整体居中，中间留过道 */
function leftCount(cols: number) {
  return Math.ceil(cols / 2)
}

function assignStudent(row: number, col: number, studentId: string) {
  if (!studentId) {
    draft.value.seats[row][col] = null
    return
  }
  // 若该学号已分配在其他座位，先将其移出原位置，再放到新位置
  for (let r = 0; r < draft.value.seats.length; r++) {
    for (let c = 0; c < draft.value.seats[r].length; c++) {
      if (r === row && c === col) continue
      if (draft.value.seats[r][c] === studentId) {
        draft.value.seats[r][c] = null
      }
    }
  }
  draft.value.seats[row][col] = studentId
}

function clearSeat(row: number, col: number) {
  draft.value.seats[row][col] = null
}

function saveLayout() {
  if (!draft.value.name.trim()) {
    toast.warning('请输入布局名称')
    return
  }
  const payload = {
    classId: classId.value,
    name: draft.value.name,
    rows: draft.value.rows,
    cols: draft.value.cols,
    seats: draft.value.seats,
  }
  if (editingLayout.value) {
    seatStore.updateLayout(editingLayout.value.id, payload)
    toast.success('已更新座位表')
  } else {
    seatStore.addLayout(payload)
    toast.success('已创建座位表')
  }
  modalOpen.value = false
}

function activate(layout: SeatLayout) {
  seatStore.activateLayout(layout.id)
  toast.success(`已启用「${layout.name}」，学生座位已同步`)
}

function remove(layout: SeatLayout) {
  if (!confirm(`确定删除「${layout.name}」吗？`)) return
  seatStore.removeLayout(layout.id)
  toast.info('已删除')
}

/** 未安排学生：仅当没有空座时才显示 */
const unassigned = computed(() => {
  const assigned = new Set<string>()
  let emptyCount = 0
  for (const row of draft.value.seats) {
    for (const s of row) {
      if (s) assigned.add(s)
      else emptyCount++
    }
  }
  // 还有空座时不显示未安排（因为自动填充会处理）
  if (emptyCount > 0) return []
  return students.value.filter(s => !assigned.has(s.id))
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="💺"
      title="座位表编辑器"
      description="可视化编排座位，支持按学号/成绩/随机重排"
      gradient="from-sky2-100 via-cream-50 to-mint-100"
    />

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新建座位表
      </button>
    </div>

    <div v-if="!layouts.length" class="mt-8">
      <EmptyState title="还没有座位表" desc="点击「新建座位表」开始编排座位" icon="💺" />
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div v-for="layout in layouts" :key="layout.id" class="card-soft p-5" :class="layout.active ? 'ring-2 ring-butter-500 bg-butter-100/30' : ''">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="title-display text-lg">{{ layout.name }}</h3>
            <span class="chip bg-sky2-100 text-sky2-500 text-[10px]">{{ classStore.getClass(layout.classId)?.name || '' }}</span>
            <span v-if="layout.active" class="chip bg-butter-300 text-cocoa-900 font-semibold text-[10px]">✓ 使用中</span>
          </div>
          <div class="flex gap-1">
            <button v-if="!layout.active" class="btn-ghost !px-2 !py-1 text-xs text-mint-500" @click="activate(layout)">使用</button>
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(layout)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(layout)">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <div class="text-xs text-cocoa-500 mb-2">{{ layout.rows }}排 × {{ layout.cols }}列</div>
        <div class="overflow-x-auto">
          <!-- 讲台（前置，醒目台子） -->
          <div class="flex justify-center mb-3">
            <div
              class="px-6 py-1.5 rounded-lg text-[11px] font-semibold tracking-widest border shadow-sm"
              :class="layout.active
                ? 'bg-butter-300 text-cocoa-900 border-butter-500'
                : 'bg-cocoa-100 text-cocoa-700 border-cocoa-300'"
            >
              讲 台
            </div>
          </div>
          <!-- 座位：讲台后方，中间过道分左右两侧 -->
          <div class="flex flex-col gap-1 items-center">
            <div
              v-for="(row, ri) in layout.seats"
              :key="ri"
              class="flex items-center gap-1"
            >
              <!-- 左半区 -->
              <div
                class="grid gap-1"
                :style="{ gridTemplateColumns: `repeat(${leftCount(layout.cols)}, 2.5rem)` }"
              >
                <div
                  v-for="(seat, ci) in row.slice(0, leftCount(layout.cols))"
                  :key="'l' + ci"
                  class="w-10 h-8 rounded text-[10px] flex items-center justify-center truncate px-0.5 transition"
                  :class="seat
                    ? (layout.active
                        ? 'bg-butter-300 text-cocoa-900 font-semibold ring-1 ring-butter-500'
                        : 'bg-mint-200 text-cocoa-800')
                    : 'bg-cocoa-100/40 text-cocoa-300'"
                >
                  {{ seat ? studentName(seat) : '空' }}
                </div>
              </div>
              <!-- 中间过道 -->
              <div
                v-if="layout.cols > 1"
                class="w-5 flex-shrink-0 flex justify-center"
              >
                <div class="w-px h-6 bg-cocoa-200/60"></div>
              </div>
              <!-- 右半区 -->
              <div
                v-if="row.length > leftCount(layout.cols)"
                class="grid gap-1"
                :style="{ gridTemplateColumns: `repeat(${row.length - leftCount(layout.cols)}, 2.5rem)` }"
              >
                <div
                  v-for="(seat, ci) in row.slice(leftCount(layout.cols))"
                  :key="'r' + ci"
                  class="w-10 h-8 rounded text-[10px] flex items-center justify-center truncate px-0.5 transition"
                  :class="seat
                    ? (layout.active
                        ? 'bg-butter-300 text-cocoa-900 font-semibold ring-1 ring-butter-500'
                        : 'bg-mint-200 text-cocoa-800')
                    : 'bg-cocoa-100/40 text-cocoa-300'"
                >
                  {{ seat ? studentName(seat) : '空' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Modal :open="modalOpen" :title="editingLayout ? '编辑座位表' : '新建座位表'" width="90vw" max-h="85vh" @close="modalOpen = false">
      <div class="space-y-4">
        <!-- 顶栏：名称 + 行列 + 重排按钮 -->
        <div class="flex gap-3 flex-wrap items-end">
          <input v-model="draft.name" class="input-soft !w-40" placeholder="布局名称" />
          <div class="flex items-center gap-1">
            <label class="text-xs text-cocoa-500">排</label>
            <input v-model.number="draft.rows" type="number" min="1" max="12" class="input-soft !w-16" @change="resizeSeats(draft.rows, draft.cols)" />
          </div>
          <div class="flex items-center gap-1">
            <label class="text-xs text-cocoa-500">列</label>
            <input v-model.number="draft.cols" type="number" min="1" max="12" class="input-soft !w-16" @change="resizeSeats(draft.rows, draft.cols)" />
          </div>
        </div>

        <!-- 重排工具栏 -->
        <div class="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-cream-200/60">
          <span class="text-xs text-cocoa-500 flex items-center gap-1"><ArrowDownUp :size="12" /> 重排：</span>
          <button class="chip cursor-pointer bg-sky2-100 text-sky2-600 hover:bg-sky2-200 transition" @click="rearrangeSeats('studentNo')">
            <SortAsc :size="12" class="inline" /> 按学号
          </button>
          <button class="chip cursor-pointer bg-butter-100 text-butter-600 hover:bg-butter-200 transition" @click="rearrangeSeats('grade')">
            <Trophy :size="12" class="inline" /> 按成绩
          </button>
          <button class="chip cursor-pointer bg-sakura-100 text-sakura-500 hover:bg-sakura-200 transition" @click="rearrangeSeats('random')">
            <Shuffle :size="12" class="inline" /> 随机编排
          </button>
        </div>

        <!-- 座位网格 -->
        <div>
          <div class="text-xs text-cocoa-500 mb-1">讲台 ↑</div>
          <div class="overflow-x-auto">
            <div class="inline-grid gap-1" :style="{ gridTemplateColumns: `repeat(${draft.cols}, minmax(3.5rem, 1fr))` }">
              <template v-for="(row, ri) in draft.seats" :key="ri">
                <div
                  v-for="(seat, ci) in row"
                  :key="ci"
                  class="relative group"
                >
                  <select
                    :value="seat || ''"
                    class="w-full h-9 rounded text-xs px-1 border border-cocoa-200 bg-cream-100 hover:border-mint-400 transition cursor-pointer"
                    @change="assignStudent(ri, ci, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ seat ? `${studentNo(seat)} ${studentName(seat)}` : '空座' }}</option>
                    <option v-for="s in students" :key="s.id" :value="s.id">{{ s.studentNo }} {{ s.name }}</option>
                  </select>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 未安排学生：仅当没有空座时才显示 -->
        <div v-if="unassigned.length" class="flex flex-wrap gap-1.5 p-2 rounded-lg bg-sakura-50">
          <span class="text-xs text-sakura-500 font-medium">⚠️ 座位不足，{{ unassigned.length }}人未安排：</span>
          <span v-for="s in unassigned" :key="s.id" class="chip bg-sakura-100 text-sakura-500 text-xs">
            {{ s.studentNo }} {{ s.name }}
          </span>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="saveLayout">
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>
  </div>
</template>
