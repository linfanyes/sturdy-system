<script setup lang="ts">
/**
 * 座位表
 * - 班级选择（useClasses）
 * - 行数 × 列数网格编辑，点击格子填入学生名（listClassStudents）
 * - 交互：选中侧边学生 → 点击格子放置；或点击两个格子交换
 * - 讲台标识在顶部
 * - 保存：saveSeatLayout；加载历史布局：listSeatLayouts
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useClasses } from '@/composables/useClasses'
import { listClassStudents, saveSeatLayout, listSeatLayouts, type TeacherStudent } from '@/api/teacher'
import { LayoutGrid, Save, Download, Monitor, RefreshCw, Trash2 } from 'lucide-vue-next'

const { classes, loadClasses } = useClasses()
loadClasses()

const classId = ref('')
const rows = ref(5)
const cols = ref(6)
const grid = ref<string[][]>([])
const students = ref<TeacherStudent[]>([])
const layouts = ref<any[]>([])
const selectedStudent = ref<string | null>(null)
const selectedCell = ref<{ r: number; c: number } | null>(null)
const saving = ref(false)
const loadingLayout = ref(false)

const assignedNames = computed(() => {
  const set = new Set<string>()
  for (const row of grid.value) for (const cell of row) if (cell) set.add(cell)
  return set
})

const unassignedStudents = computed(() =>
  students.value.filter(s => !assignedNames.value.has(s.name)),
)

function initGrid() {
  const g: string[][] = []
  for (let r = 0; r < rows.value; r++) {
    g.push(new Array(cols.value).fill(''))
  }
  grid.value = g
}

function resizeGrid() {
  const old = grid.value
  const g: string[][] = []
  for (let r = 0; r < rows.value; r++) {
    const row: string[] = []
    for (let c = 0; c < cols.value; c++) {
      row.push(old[r]?.[c] || '')
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
  initGrid()
  loadStudents(classId.value)
  loadLayouts(classId.value)
}

function clickCell(r: number, c: number) {
  const cellVal = grid.value[r][c]
  // 模式 A：选中了学生 → 放置
  if (selectedStudent.value) {
    // 若格子有人，把原占用者放回池子（即取消选中其对应状态，自然回到 unassigned）
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
    // 已选中第一个格子，进行交换
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
  grid.value[r][c] = ''
}

function autoArrange() {
  // 一键按学生顺序自动排入网格
  initGrid()
  const names = students.value.map(s => s.name)
  let i = 0
  for (let r = 0; r < rows.value && i < names.length; r++) {
    for (let c = 0; c < cols.value && i < names.length; c++) {
      grid.value[r][c] = names[i++]
    }
  }
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
    alert('座位表已保存')
    await loadLayouts(classId.value)
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function applyLayout(layout: any) {
  if (!layout) return
  rows.value = layout.rows || 5
  cols.value = layout.cols || 6
  // 等 watch resize 后再写入 seats
  grid.value = JSON.parse(JSON.stringify(layout.seats || []))
  while (grid.value.length < rows.value) grid.value.push(new Array(cols.value).fill(''))
  for (const row of grid.value) {
    while (row.length < cols.value) row.push('')
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
      <div class="text-sm text-cocoa-500 mb-2">点击加载历史布局</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="l in layouts"
          :key="l.id"
          class="px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200"
          @click="applyLayout(l); loadingLayout = false"
        >
          {{ l.name || `${l.rows}×${l.cols}` }}
          <span class="text-cocoa-400 ml-1">{{ l.createdAt?.slice(0, 10) }}</span>
        </button>
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
            :class="['text-sm px-3 py-1 rounded-full border transition', selectedStudent === s.name ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-700 hover:bg-cream-50']"
            @click="selectedStudent = selectedStudent === s.name ? null : s.name"
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
                {{ grid[r - 1]?.[c - 1] || '' }}
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
