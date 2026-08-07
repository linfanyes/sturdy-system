<script setup lang="ts">
/**
 * 随机分组工具
 * - 名单 textarea（每行一个），支持从班级导入
 * - 分组模式：按组数分 / 按人数分
 * - 分组结果以彩色卡片展示（sakura/mint/sky2/butter 循环背景）
 * - 支持重新打乱（shuffle）
 */
import { ref, computed } from 'vue'
import { useClasses } from '@/composables/useClasses'
import { listClassStudents, type TeacherStudent } from '@/api/teacher'
import { toast } from '@/utils/feedback'
import { Users, Shuffle, Download, RefreshCw } from 'lucide-vue-next'
import { shuffle } from '@gardener/shared/utils/game-helpers'

const { classes, loadClasses } = useClasses()
loadClasses()

type GroupMode = 'byGroup' | 'bySize'
const classId = ref('')
const namesText = ref('')
const mode = ref<GroupMode>('byGroup')
const groupCount = ref(4)
const groupSize = ref(5)
const groups = ref<string[][]>([])

const namesList = computed(() =>
  namesText.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean),
)

const groupBgColors = ['bg-sakura-100', 'bg-mint-100', 'bg-sky2-100', 'bg-butter-100']
const groupTextColors = ['text-sakura-500', 'text-mint-500', 'text-sky2-500', 'text-butter-600']

function groupColor(i: number) {
  return [groupBgColors[i % groupBgColors.length], groupTextColors[i % groupTextColors.length]]
}


function doGroup() {
  const list = namesList.value
  if (list.length === 0) {
    toast.warning('请先输入名单')
    return
  }
  const shuffled = shuffle(list)
  const result: string[][] = []
  if (mode.value === 'byGroup') {
    const n = Math.max(1, groupCount.value)
    for (let i = 0; i < n; i++) result.push([])
    shuffled.forEach((name, i) => result[i % n].push(name))
  } else {
    const size = Math.max(1, groupSize.value)
    for (let i = 0; i < shuffled.length; i += size) {
      result.push(shuffled.slice(i, i + size))
    }
  }
  groups.value = result
}

function reshuffle() {
  if (groups.value.length === 0) {
    doGroup()
    return
  }
  doGroup()
}

async function importFromClass() {
  if (!classId.value) {
    toast.warning('请先选择班级')
    return
  }
  try {
    const res = await listClassStudents(classId.value)
    const list: TeacherStudent[] = Array.isArray(res) ? res : []
    if (!list.length) {
      toast.info('该班级暂无学生')
      return
    }
    const existing = namesList.value
    const merged = Array.from(new Set([...existing, ...list.map(s => s.name)]))
    namesText.value = merged.join('\n')
  } catch (e: any) {
    toast.error(e?.message || '导入失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Users class="w-6 h-6 text-butter-500" /> 随机分组
    </h1>

    <!-- 班级选择 + 名单输入 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer space-y-3">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="text-sm text-cocoa-500">班级（可选，用于导入学生）</label>
          <select
            v-model="classId"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          >
            <option value="">不绑定班级</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-500 text-white text-sm font-medium hover:bg-mint-400"
          @click="importFromClass"
        >
          <Download class="w-4 h-4" /> 从班级导入
        </button>
      </div>
      <div>
        <div class="flex items-center mb-2">
          <h2 class="text-lg font-semibold text-cocoa-900">名单</h2>
          <span class="text-sm text-cocoa-400 ml-auto">共 {{ namesList.length }} 人</span>
        </div>
        <textarea
          v-model="namesText"
          rows="6"
          placeholder="每行输入一个名字"
          class="w-full px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 font-mono"
        />
      </div>
    </div>

    <!-- 分组模式 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3">分组方式</h2>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex rounded-xl bg-cream-100 p-1">
          <button
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition', mode === 'byGroup' ? 'bg-surface text-butter-600 shadow-softer' : 'text-cocoa-500']"
            @click="mode = 'byGroup'"
          >按组数分</button>
          <button
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition', mode === 'bySize' ? 'bg-surface text-butter-600 shadow-softer' : 'text-cocoa-500']"
            @click="mode = 'bySize'"
          >按人数分</button>
        </div>
        <div v-if="mode === 'byGroup'" class="flex items-center gap-2">
          <label class="text-sm text-cocoa-500">组数</label>
          <input
            v-model.number="groupCount"
            type="number"
            min="1"
            class="w-20 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
        <div v-else class="flex items-center gap-2">
          <label class="text-sm text-cocoa-500">每组人数</label>
          <input
            v-model.number="groupSize"
            type="number"
            min="1"
            class="w-20 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600"
          @click="doGroup"
        >
          <Shuffle class="w-4 h-4" /> 生成分组
        </button>
        <button
          v-if="groups.length"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-500 text-white text-sm font-medium hover:bg-mint-400"
          @click="reshuffle"
        >
          <RefreshCw class="w-4 h-4" /> 重新打乱
        </button>
      </div>
    </div>

    <!-- 分组结果 -->
    <div v-if="groups.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="(g, i) in groups"
        :key="i"
        :class="['rounded-2xl p-5 shadow-softer', groupColor(i)[0]]"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 :class="['font-bold text-lg', groupColor(i)[1]]">第 {{ i + 1 }} 组</h3>
          <span class="text-sm text-cocoa-500">{{ g.length }} 人</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(name, idx) in g"
            :key="idx"
            class="px-3 py-1 rounded-full bg-surface/70 text-cocoa-900 text-sm font-medium"
          >{{ name }}</span>
        </div>
      </div>
    </div>
    <div v-else class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      输入名单后点击「生成分组」
    </div>
  </div>
</template>
