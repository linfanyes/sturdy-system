<script setup lang="ts">
/**
 * 课表排版：网格编辑课表（行=节次 1-8，列=星期），科目自动着色。
 * 保存到 localStorage（web_tool_schedule_<classId>），支持打印。
 */
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarDays, Save, Printer, Trash2, Wand2 } from 'lucide-vue-next'
import { loadClasses, useClasses } from '@/composables/useClasses'

const { classes } = useClasses()
const classId = ref('')
const dayCount = ref(6) // 5 或 6
const PERIODS = 8

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六']

/** 科目 → 样式映射（使用主题色板） */
const SUBJECT_COLORS: Record<string, string> = {
  '语文': 'bg-sakura-100 text-sakura-500 border-sakura-300',
  '数学': 'bg-sky2-100 text-sky2-500 border-sky2-300',
  '英语': 'bg-mint-100 text-mint-500 border-mint-300',
  '科学': 'bg-butter-100 text-butter-600 border-butter-300',
  '体育': 'bg-cocoa-100 text-cocoa-700 border-cocoa-300',
  '音乐': 'bg-sakura-100 text-sakura-500 border-sakura-300',
  '美术': 'bg-butter-100 text-butter-600 border-butter-300',
  '道法': 'bg-mint-100 text-mint-500 border-mint-300',
  '劳动': 'bg-cocoa-100 text-cocoa-700 border-cocoa-300',
  '信息': 'bg-sky2-100 text-sky2-500 border-sky2-300',
}

const COMMON_SUBJECTS = ['语文', '数学', '英语', '科学', '体育', '音乐', '美术', '道法', '劳动', '信息']

/** grid[period][day] = 科目字符串 */
const grid = ref<string[][]>([])

function initGrid() {
  grid.value = Array.from({ length: PERIODS }, () => Array.from({ length: dayCount.value }, () => ''))
}

function storageKey() {
  return `web_tool_schedule_${classId.value}`
}

function load() {
  if (!classId.value) { initGrid(); return }
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data) && data.length) {
        grid.value = data
        // 兼容天数变化
        dayCount.value = data[0]?.length || dayCount.value
        return
      }
    }
  } catch { /* ignore */ }
  initGrid()
}

function save() {
  if (!classId.value) { alert('请先选择班级'); return }
  try {
    localStorage.setItem(storageKey(), JSON.stringify(grid.value))
    alert('已保存')
  } catch {
    alert('保存失败')
  }
}

function clearAll() {
  if (!confirm('确定清空当前课表？')) return
  initGrid()
}

/**
 * 自动排版：按小学常见课时分配自动填充课表。
 * 规则：主科（语文/数学/英语）分布到每天上午；副科穿插下午；
 * 同一科目尽量不连续两节；每天上午安排主科，下午安排副科。
 */
function autoArrange() {
  if (!classId.value) { alert('请先选择班级'); return }
  initGrid()

  // 各科目周课时数（小学常见分配）
  const weeklyHours: Record<string, number> = {
    '语文': 8, '数学': 6, '英语': 4,
    '科学': 3, '道法': 2, '体育': 3,
    '音乐': 2, '美术': 2, '劳动': 1, '信息': 1,
  }

  // 上午节次（1-4）适合主科，下午节次（5-8）适合副科
  const morningSubjects = ['语文', '数学', '英语']
  const afternoonSubjects = ['科学', '道法', '体育', '音乐', '美术', '劳动', '信息']

  // 待排科目池：每个科目按周课时数展开为队列
  const morningPool: string[] = []
  for (const subj of morningSubjects) {
    for (let i = 0; i < (weeklyHours[subj] || 0); i++) morningPool.push(subj)
  }
  const afternoonPool: string[] = []
  for (const subj of afternoonSubjects) {
    for (let i = 0; i < (weeklyHours[subj] || 0); i++) afternoonPool.push(subj)
  }

  // 打乱（保持均衡分布）
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffledMorning = shuffle(morningPool)
  const shuffledAfternoon = shuffle(afternoonPool)

  let morningIdx = 0
  let afternoonIdx = 0

  for (let p = 0; p < PERIODS; p++) {
    for (let d = 0; d < dayCount.value; d++) {
      if (p < 4) {
        // 上午：主科
        if (morningIdx < shuffledMorning.length) {
          // 避免同一科目连续两节
          const prev = d > 0 ? grid.value[p][d - 1] : ''
          let subj = shuffledMorning[morningIdx]
          if (subj === prev && morningIdx + 1 < shuffledMorning.length) {
            morningIdx++
            subj = shuffledMorning[morningIdx]
          }
          grid.value[p][d] = subj
          morningIdx++
        }
      } else {
        // 下午：副科
        if (afternoonIdx < shuffledAfternoon.length) {
          grid.value[p][d] = shuffledAfternoon[afternoonIdx]
          afternoonIdx++
        }
      }
    }
  }
}

function subjectClass(subj: string) {
  if (!subj) return 'bg-white text-cocoa-400 border-cream-200'
  return SUBJECT_COLORS[subj.trim()] || 'bg-cream-100 text-cocoa-700 border-cream-200'
}

function printSchedule() {
  window.print()
}

const days = computed(() => DAY_NAMES.slice(0, dayCount.value))

watch(classId, load)
watch(dayCount, () => {
  // 天数变化时调整每行长度
  grid.value = grid.value.map(row => {
    const newRow = row.slice(0, dayCount.value)
    while (newRow.length < dayCount.value) newRow.push('')
    return newRow
  })
})

onMounted(async () => {
  await loadClasses()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
  }
  initGrid()
  load()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <CalendarDays class="w-6 h-6 text-butter-500" /> 课表排版
      </h1>
      <div class="flex items-center gap-2 print:hidden">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model.number="dayCount" class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400">
          <option :value="5">周一到周五</option>
          <option :value="6">周一到周六</option>
        </select>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 hover:bg-mint-300/30 text-sm" @click="autoArrange">
          <Wand2 class="w-4 h-4" /> 自动排版
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="clearAll">
          <Trash2 class="w-4 h-4" /> 清空
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="printSchedule">
          <Printer class="w-4 h-4" /> 打印
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 text-sm" @click="save">
          <Save class="w-4 h-4" /> 保存
        </button>
      </div>
    </div>

    <!-- 课表网格 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer overflow-x-auto">
      <table class="w-full border-collapse min-w-[640px]">
        <thead>
          <tr>
            <th class="w-16 px-2 py-2 text-sm font-medium text-cocoa-500">节次</th>
            <th v-for="(d, i) in days" :key="i" class="px-2 py-2 text-sm font-medium text-cocoa-500">{{ d }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, p) in grid" :key="p">
            <td class="px-2 py-1 text-center text-sm text-cocoa-400 font-medium">第{{ p + 1 }}节</td>
            <td v-for="(subj, d) in days" :key="d" class="px-1 py-1">
              <input
                v-model="grid[p][d]"
                list="subject-list"
                :class="['w-full text-center text-sm px-2 py-2 rounded-lg border transition-colors', subjectClass(grid[p][d])]"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <datalist id="subject-list">
        <option v-for="s in COMMON_SUBJECTS" :key="s" :value="s" />
      </datalist>
    </div>

    <!-- 科目图例 -->
    <div class="bg-white rounded-2xl p-4 shadow-softer print:hidden">
      <div class="text-xs text-cocoa-500 mb-2">科目颜色图例</div>
      <div class="flex flex-wrap gap-2">
        <span v-for="s in COMMON_SUBJECTS" :key="s" :class="['text-xs px-2.5 py-1 rounded-full border', subjectClass(s)]">{{ s }}</span>
      </div>
    </div>
  </div>
</template>
