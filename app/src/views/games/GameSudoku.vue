<!-- 数独游戏：9x9 棋盘，在每行/每列/每宫填入 1-9，预填数字不可修改，全部填满且无冲突即完成 -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RotateCcw, Check } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Cell = { value: number; fixed: boolean }
type Difficulty = '简单' | '中等' | '困难'

// 三个难度的预设题目（. 表示空）
const puzzles: Record<Difficulty, string[]> = {
  简单: [
    '53..7....',
    '6..195...',
    '.98....6.',
    '8...6...3',
    '4..8.3..1',
    '7...2...6',
    '.6....28.',
    '...419..5',
    '....8..79',
  ],
  中等: [
    '...26.7.1',
    '68..7..9.',
    '19...45..',
    '82.1...4.',
    '..46.29..',
    '.5...3.28',
    '..93...74',
    '.4..5..36',
    '7.3.18...',
  ],
  困难: [
    '.........',
    '59....82.',
    '....2...5',
    '6.....1.7',
    '...8.2...',
    '.3.9.....',
    '4....5...',
    '.71....98',
    '...3.....',
  ],
}

const difficulty = ref<Difficulty>('简单')
const board = ref<Cell[][]>(loadPuzzle('简单'))
const selected = ref<{ r: number; c: number } | null>(null)
const isComplete = ref(false)
const toast = ref<{ text: string; type: 'info' | 'success' | 'error' } | null>(null)
let toastTimer: number | null = null

function loadPuzzle(name: Difficulty): Cell[][] {
  return puzzles[name].map(row =>
    row.split('').map(ch => ({
      value: ch === '.' ? 0 : parseInt(ch, 10),
      fixed: ch !== '.',
    }))
  )
}

function selectDifficulty(name: Difficulty) {
  difficulty.value = name
  board.value = loadPuzzle(name)
  selected.value = null
  isComplete.value = false
  showToast(`已加载${name}难度`, 'info')
}

function selectCell(r: number, c: number) {
  if (board.value[r][c].fixed) return
  selected.value = { r, c }
}

function inputNumber(n: number) {
  if (!selected.value) return
  const { r, c } = selected.value
  if (board.value[r][c].fixed) return
  board.value[r][c].value = n
  checkCompletion()
}

function clearCell() {
  if (!selected.value) return
  const { r, c } = selected.value
  if (board.value[r][c].fixed) return
  board.value[r][c].value = 0
}

// 冲突检测：返回冲突格坐标集合（同行/列/宫有重复）
const conflicts = computed<Set<string>>(() => {
  const set = new Set<string>()
  const b = board.value
  const checkGroup = (cells: [number, number][]) => {
    const seen = new Map<number, [number, number]>()
    for (const [r, c] of cells) {
      const v = b[r][c].value
      if (v === 0) continue
      if (seen.has(v)) {
        const [pr, pc] = seen.get(v)!
        set.add(`${r},${c}`)
        set.add(`${pr},${pc}`)
      } else {
        seen.set(v, [r, c])
      }
    }
  }
  // 行
  for (let r = 0; r < 9; r++) checkGroup(Array.from({ length: 9 }, (_, c) => [r, c] as [number, number]))
  // 列
  for (let c = 0; c < 9; c++) checkGroup(Array.from({ length: 9 }, (_, r) => [r, c] as [number, number]))
  // 宫
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells: [number, number][] = []
      for (let i = 0; i < 9; i++) {
        cells.push([br * 3 + Math.floor(i / 3), bc * 3 + (i % 3)])
      }
      checkGroup(cells)
    }
  }
  return set
})

function isConflict(r: number, c: number) {
  return conflicts.value.has(`${r},${c}`)
}

function checkCompletion() {
  const allFilled = board.value.every(row => row.every(cell => cell.value !== 0))
  if (allFilled && conflicts.value.size === 0) {
    isComplete.value = true
    showToast('恭喜完成！', 'success')
  }
}

function checkAnswer() {
  const count = conflicts.value.size
  if (count === 0) {
    const allFilled = board.value.every(row => row.every(cell => cell.value !== 0))
    if (allFilled) {
      isComplete.value = true
      showToast('全部正确！', 'success')
    } else {
      showToast('暂无冲突，继续加油！', 'info')
    }
  } else {
    showToast(`发现 ${count} 处冲突`, 'error')
  }
}

function resetBoard() {
  board.value = loadPuzzle(difficulty.value)
  selected.value = null
  isComplete.value = false
  showToast('已重置', 'info')
}

function showToast(text: string, type: 'info' | 'success' | 'error') {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
  }, 2000)
}

function getCellClass(r: number, c: number): string {
  const cell = board.value[r][c]
  const cls: string[] = []
  // 3x3 宫边界加粗
  if (c % 3 === 2 && c !== 8) cls.push('!border-r-2 !border-r-cocoa-300')
  if (r % 3 === 2 && r !== 8) cls.push('!border-b-2 !border-b-cocoa-300')

  if (isConflict(r, c)) {
    cls.push('!bg-rose-200 !text-rose-700')
  } else if (selected.value?.r === r && selected.value?.c === c) {
    cls.push('!bg-butter-300 !text-cocoa-900')
  } else if (cell.fixed) {
    cls.push('bg-cream-100/90 text-cocoa-900')
  } else {
    cls.push('bg-white text-butter-600 hover:bg-butter-100')
  }
  return cls.join(' ')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key, 10))
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    clearCell()
  } else if (e.key.startsWith('Arrow') && selected.value) {
    e.preventDefault()
    let { r, c } = selected.value
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1)
    if (e.key === 'ArrowDown') r = Math.min(8, r + 1)
    if (e.key === 'ArrowLeft') c = Math.max(0, c - 1)
    if (e.key === 'ArrowRight') c = Math.min(8, c + 1)
    selectCell(r, c)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🔢"
      title="数独"
      description="在 9x9 棋盘填入 1-9，每行每列每宫不可重复"
      gradient="from-sky2-100 via-cream-50 to-butter-100"
      status-text="数字逻辑"
      status-color="bg-sky2-100 text-sky2-500"
      :back-to="'games'"
    />

    <!-- 难度选择 -->
    <div class="flex justify-center gap-2 flex-wrap">
      <button
        v-for="d in (['简单', '中等', '困难'] as const)"
        :key="d"
        class="btn-pill text-sm"
        :class="difficulty === d ? 'bg-gradient-to-br from-butter-400 to-butter-500 text-cocoa-900 shadow-pop' : 'bg-cocoa-900/5 text-cocoa-900 hover:bg-cocoa-900/10'"
        @click="selectDifficulty(d)"
      >
        {{ d }}
      </button>
    </div>

    <!-- 棋盘 -->
    <div class="flex justify-center">
      <div class="relative">
        <div class="card-flat p-2 bg-cocoa-100/40">
          <div
            class="grid grid-cols-9"
            :style="{ width: 'min(92vw, 420px)' }"
          >
            <template v-for="r in 9" :key="`row-${r}`">
              <div
                v-for="c in 9"
                :key="`${r}-${c}`"
                class="aspect-square flex items-center justify-center cursor-pointer select-none text-base sm:text-xl font-bold border border-cocoa-100/70 transition-colors"
                :class="getCellClass(r - 1, c - 1)"
                @click="selectCell(r - 1, c - 1)"
              >
                {{ board[r - 1][c - 1].value || '' }}
              </div>
            </template>
          </div>
        </div>

        <!-- 完成遮罩 -->
        <div
          v-if="isComplete"
          class="absolute inset-0 bg-mint-500/85 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-white mb-4">恭喜完成！</div>
          <button class="btn-primary" @click="resetBoard">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 数字键盘 -->
    <div class="flex justify-center">
      <div class="flex flex-wrap gap-2 justify-center max-w-xs">
        <button
          v-for="n in 9"
          :key="n"
          class="btn-secondary !px-4 !py-3 font-bold text-lg"
          @click="inputNumber(n)"
        >
          {{ n }}
        </button>
        <button class="btn-secondary !px-4 !py-3 font-bold text-lg" @click="clearCell">
          ⌫
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-primary" @click="checkAnswer">
        <Check :size="16" />
        检查答案
      </button>
      <button class="btn-secondary" @click="resetBoard">
        <RotateCcw :size="16" />
        重置
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 点击空格选中后用键盘 1-9 输入，预填数字不可修改</p>
      <p>方向键移动选中格，Backspace 清除</p>
    </div>

    <!-- Toast -->
    <div
      v-if="toast"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-medium"
      :class="{
        'bg-cocoa-900/80 text-white': toast.type === 'info',
        'bg-mint-500 text-white': toast.type === 'success',
        'bg-rose-500 text-white': toast.type === 'error',
      }"
    >
      {{ toast.text }}
    </div>
  </div>
</template>
