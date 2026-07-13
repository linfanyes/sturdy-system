<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useClassScoreStore } from '../../stores/classScore'
import { useToastStore } from '../../stores/toast'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { Plus, Minus, RotateCcw, Trophy, Star } from 'lucide-vue-next'
import type { GroupScore } from '../../types'

const classStore = useClassStore()
const scoreStore = useClassScoreStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const students = computed(() => classStore.studentsOf(classId.value))
const groups = computed(() => scoreStore.groups.filter(g => g.classId === classId.value))
const records = computed(() => scoreStore.records.filter(r => r.classId === classId.value))

// Group management
const newGroupName = ref('')
function addGroup() {
  if (!newGroupName.value.trim()) return
  scoreStore.addGroup({ classId: classId.value, name: newGroupName.value.trim(), points: 0, color: pickColor(groups.value.length) })
  newGroupName.value = ''
}

function pickColor(idx: number) {
  const colors = ['#f9a8d4', '#86efac', '#93c5fd', '#fde68a', '#c4b5fd', '#fca5a5']
  return colors[idx % colors.length]
}

// Individual scoring
function scoreStudent(studentId: string, delta: number) {
  const s = students.value.find(s => s.id === studentId)
  if (!s) return
  scoreStore.addRecord({
    classId: classId.value,
    studentId,
    studentName: s.name,
    delta,
    reason: delta > 0 ? '课堂表现加分' : '课堂行为扣分',
  })
  toast.success(`${s.name} ${delta > 0 ? '+' : ''}${delta}分`)
}

// Group scoring
function scoreGroup(groupId: string, delta: number) {
  scoreStore.updateGroup(groupId, delta)
  const g = groups.value.find(g => g.id === groupId)
  if (g) toast.success(`${g.name} ${delta > 0 ? '+' : ''}${delta}分`)
}

function resetAll() {
  if (!confirm('确定清零所有小组分数？')) return
  scoreStore.resetGroupScores(classId.value)
  toast.info('已清零')
}

// Student total scores
const studentScores = computed(() => {
  const map = new Map<string, { name: string; total: number }>()
  for (const s of students.value) {
    map.set(s.id, { name: s.name, total: 0 })
  }
  for (const r of records.value) {
    const entry = map.get(r.studentId)
    if (entry) entry.total += r.delta
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🏅"
      title="课堂加减分"
      description="个人加分扣分、小组竞赛积分，实时排行"
      gradient="from-sakura-100 via-cream-50 to-butter-100"
    />

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="grid lg:grid-cols-2 gap-5">
      <!-- 个人加减分 -->
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3 flex items-center gap-2">
          <Star :size="18" /> 个人加减分
        </h3>
        <div v-if="!students.length" class="text-sm text-cocoa-400 py-4">暂无学生</div>
        <div v-else class="space-y-1.5 max-h-80 overflow-y-auto">
          <div v-for="s in students" :key="s.id" class="flex items-center gap-2">
            <span class="text-sm w-16 truncate">{{ s.name }}</span>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreStudent(s.id, 1)">+1</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreStudent(s.id, 2)">+2</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreStudent(s.id, 5)">+5</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-sakura-500" @click="scoreStudent(s.id, -1)">-1</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-sakura-500" @click="scoreStudent(s.id, -2)">-2</button>
            <span class="text-xs text-cocoa-400 ml-auto">
              总分: {{ studentScores.find(ss => ss.name === s.name)?.total || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- 小组竞赛 -->
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3 flex items-center gap-2">
          <Trophy :size="18" /> 小组竞赛
        </h3>
        <div class="flex gap-2 mb-3">
          <input v-model="newGroupName" class="input-soft flex-1 !py-1.5 text-sm" placeholder="小组名称" @keyup.enter="addGroup" />
          <button class="btn-primary !py-1.5 !px-3 text-sm" @click="addGroup">
            <Plus :size="14" /> 添加
          </button>
        </div>

        <div v-if="!groups.length" class="text-sm text-cocoa-400 py-4">
          还没有小组，添加后开始竞赛吧
        </div>
        <div v-else class="space-y-2">
          <div v-for="g in groups" :key="g.id" class="flex items-center gap-3 p-3 rounded-xl" :style="{ backgroundColor: g.color + '30' }">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" :style="{ backgroundColor: g.color }">
              {{ g.points }}
            </div>
            <span class="font-medium flex-1">{{ g.name }}</span>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreGroup(g.id, 1)"><Plus :size="12" />1</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreGroup(g.id, 2)"><Plus :size="12" />2</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-mint-500" @click="scoreGroup(g.id, 5)"><Plus :size="12" />5</button>
            <button class="btn-ghost !px-2 !py-0.5 text-xs text-sakura-500" @click="scoreGroup(g.id, -1)"><Minus :size="12" />1</button>
          </div>
          <button class="btn-ghost text-xs w-full mt-2" @click="resetAll">
            <RotateCcw :size="12" /> 全部清零
          </button>
        </div>
      </div>
    </div>

    <!-- 排行榜 -->
    <div v-if="studentScores.length" class="card-soft p-5">
      <h3 class="title-display text-lg mb-3">个人积分排行</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div v-for="(s, i) in studentScores.slice(0, 12)" :key="i" class="flex items-center gap-2 p-2 rounded-lg" :class="i < 3 ? 'bg-butter-100' : ''">
          <span class="text-lg w-8 text-center">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}` }}</span>
          <span class="text-sm flex-1">{{ s.name }}</span>
          <span class="number text-sm font-bold" :class="s.total > 0 ? 'text-mint-500' : s.total < 0 ? 'text-sakura-500' : 'text-cocoa-400'">{{ s.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
