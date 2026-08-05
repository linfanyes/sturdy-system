<script setup lang="ts">
/**
 * 随机点名工具
 * - 顶部班级选择，名单按班级持久化到 localStorage
 * - 支持「从班级学生导入」（listClassStudents）
 * - 三种抽取模式：单人 / 多人(N) / 去重抽签
 * - 大字号滚动动画展示结果（50ms 切换，3 秒后定格）
 * - 历史记录调用后端 listPickerHistory / addPickerHistory / clearPickerHistory
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useClasses } from '@/composables/useClasses'
import {
  listClassStudents,
  listPickerHistory,
  addPickerHistory,
  clearPickerHistory,
  type TeacherStudent,
} from '@/api/teacher'
import { Shuffle, Users, History, Trash2, Download, Sparkles } from 'lucide-vue-next'

const { classes, loadClasses } = useClasses()
loadClasses()

type Mode = 'single' | 'multi' | 'unique'
const classId = ref('')
const namesText = ref('')
const mode = ref<Mode>('single')
const pickCount = ref(3)
const rolling = ref(false)
const displayText = ref('点击开始抽取')
const finalResult = ref<string[]>([])
const history = ref<any[]>([])
const remaining = ref<string[]>([]) // 去重抽签的剩余池

const namesList = computed(() =>
  namesText.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean),
)

const lsKey = computed(() => `web_tool_picker_names_${classId.value || 'default'}`)

function loadNamesFromLS() {
  const raw = localStorage.getItem(lsKey.value)
  namesText.value = raw || ''
}

function saveNamesToLS() {
  localStorage.setItem(lsKey.value, namesText.value)
}

watch(namesText, saveNamesToLS)
watch(classId, loadNamesFromLS)

async function importFromClass() {
  if (!classId.value) {
    alert('请先选择班级')
    return
  }
  try {
    const res = await listClassStudents(classId.value)
    const list: TeacherStudent[] = Array.isArray(res) ? res : []
    if (!list.length) {
      alert('该班级暂无学生')
      return
    }
    const existing = namesList.value
    const merged = Array.from(new Set([...existing, ...list.map(s => s.name)]))
    namesText.value = merged.join('\n')
  } catch (e: any) {
    alert(e?.message || '导入失败')
  }
}

let timer: number | undefined
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function startRoll() {
  const pool = remaining.value.length && mode.value === 'unique' ? remaining.value : namesList.value
  if (pool.length === 0) {
    alert('请先输入学生名单')
    return
  }
  if (mode.value === 'multi' && pool.length < pickCount.value) {
    alert(`名单人数不足 ${pickCount.value} 人`)
    return
  }
  if (mode.value === 'unique' && pool.length === 0) {
    alert('抽签池已空，请重置后再抽')
    return
  }
  rolling.value = true
  finalResult.value = []
  stopTimer()
  timer = window.setInterval(() => {
    const idx = Math.floor(Math.random() * pool.length)
    displayText.value = pool[idx]
  }, 50)
  window.setTimeout(() => {
    stopTimer()
    rolling.value = false
    settle(pool)
  }, 3000)
}

function settle(pool: string[]) {
  let result: string[] = []
  if (mode.value === 'single') {
    result = [pool[Math.floor(Math.random() * pool.length)]]
  } else if (mode.value === 'multi') {
    const copy = [...pool]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    result = copy.slice(0, Math.min(pickCount.value, copy.length))
  } else {
    // unique：从剩余池中抽取一个，并移除
    const idx = Math.floor(Math.random() * pool.length)
    result = [pool[idx]]
    remaining.value = pool.filter((_, i) => i !== idx)
  }
  finalResult.value = result
  displayText.value = result.join('、')
  recordHistory(result)
}

async function recordHistory(result: string[]) {
  const item = {
    classId: classId.value || undefined,
    mode: mode.value,
    result,
    createdAt: new Date().toISOString(),
  }
  history.value.unshift(item)
  if (history.value.length > 10) history.value.length = 10
  try {
    await addPickerHistory({ classId: classId.value || undefined, mode: mode.value, result })
  } catch {
    /* 后端记录失败不影响使用 */
  }
}

async function loadHistory() {
  try {
    const res = await listPickerHistory(classId.value || undefined)
    const list = Array.isArray(res) ? res : ((res as any)?.items || [])
    history.value = list.slice(0, 10)
  } catch {
    history.value = []
  }
}

async function onClearHistory() {
  if (!await confirm('确定清空历史记录？')) return
  try {
    await clearPickerHistory(classId.value || undefined)
  } catch {
    /* ignore */
  }
  history.value = []
}

function resetUniquePool() {
  remaining.value = [...namesList.value]
}

function modeLabel(m: string) {
  return m === 'single' ? '单人' : m === 'multi' ? '多人' : '去重'
}

onMounted(loadHistory)
watch(classId, loadHistory)
onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Shuffle class="w-6 h-6 text-butter-500" /> 随机点名
    </h1>

    <!-- 班级选择 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-wrap items-end gap-4">
      <div class="flex-1 min-w-[200px]">
        <label class="text-sm text-cocoa-500">班级</label>
        <select
          v-model="classId"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        >
          <option value="">不绑定班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}（{{ c.term }}）</option>
        </select>
      </div>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-500 text-white text-sm font-medium hover:bg-mint-400"
        @click="importFromClass"
      >
        <Download class="w-4 h-4" /> 从班级导入
      </button>
    </div>

    <!-- 名单输入 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-2">
        <Users class="w-5 h-5 text-cocoa-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">学生名单</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ namesList.length }} 人</span>
      </div>
      <textarea
        v-model="namesText"
        rows="6"
        placeholder="每行输入一个名字"
        class="w-full px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 font-mono"
      />
    </div>

    <!-- 抽取模式 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3">抽取模式</h2>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex rounded-xl bg-cream-100 p-1">
          <button
            v-for="m in (['single','multi','unique'] as Mode[])"
            :key="m"
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition', mode === m ? 'bg-surface text-butter-600 shadow-softer' : 'text-cocoa-500']"
            @click="mode = m"
          >{{ modeLabel(m) }}</button>
        </div>
        <div v-if="mode === 'multi'" class="flex items-center gap-2">
          <label class="text-sm text-cocoa-500">抽取人数</label>
          <input
            v-model.number="pickCount"
            type="number"
            min="1"
            class="w-20 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
        <div v-if="mode === 'unique'" class="flex items-center gap-2 text-sm text-cocoa-500">
          <span>剩余池：{{ remaining.length }} 人</span>
          <button class="px-3 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-cocoa-500" @click="resetUniquePool">重置池</button>
        </div>
      </div>
    </div>

    <!-- 结果展示 -->
    <div class="bg-surface rounded-2xl p-8 shadow-softer text-center">
      <div
        :class="['text-5xl font-bold tracking-wider transition-colors min-h-[2em] flex items-center justify-center', rolling ? 'text-butter-500' : finalResult.length ? 'text-cocoa-900' : 'text-cocoa-300']"
      >
        <Sparkles v-if="finalResult.length && !rolling" class="w-8 h-8 text-butter-500 mr-2" />
        {{ displayText }}
      </div>
      <button
        class="mt-6 px-8 py-3 rounded-xl bg-butter-500 text-white text-lg font-semibold hover:bg-butter-600 disabled:opacity-60"
        :disabled="rolling"
        @click="startRoll"
      >{{ rolling ? '抽取中…' : '开始抽取' }}</button>
    </div>

    <!-- 历史记录 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-3">
        <History class="w-5 h-5 text-cocoa-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">历史记录</h2>
        <span class="text-sm text-cocoa-400 ml-auto">最近 10 条</span>
        <button class="ml-2 p-1 rounded hover:bg-red-50 text-red-500" @click="onClearHistory">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
      <div v-if="!history.length" class="text-cocoa-400 text-sm text-center py-4">暂无记录</div>
      <ul v-else class="divide-y divide-cream-100">
        <li v-for="(h, i) in history" :key="i" class="flex items-center py-2 text-sm">
          <span class="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-500 w-12 text-center">{{ modeLabel(h.mode) }}</span>
          <span class="ml-3 text-cocoa-900 font-medium">{{ (h.result || []).join('、') }}</span>
          <span class="ml-auto text-cocoa-400 text-xs">{{ h.createdAt?.slice(11, 16) || '' }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
