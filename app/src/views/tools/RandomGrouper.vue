<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSeatStore } from '../../stores/seat'
import { useToastStore } from '../../stores/toast'
import type { Student } from '../../types/class'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { RefreshCw, Copy, Printer, Users } from 'lucide-vue-next'

const classStore = useClassStore()
const seatStore = useSeatStore()
const toast = useToastStore()

type GroupMode = 'random' | 'gender' | 'mixed' | 'column'
const MODE_LABELS: Record<GroupMode, string> = {
  random: '完全随机',
  gender: '男女均衡',
  mixed: '混合均衡',
  column: '按列分组',
}

const classId = ref('')
const groupCount = ref(4)
const mode = ref<GroupMode>('random')

const classList = computed(() => classStore.classes)
const studentList = computed<Student[]>(() =>
  classId.value ? classStore.studentsOf(classId.value) : [],
)

interface Group {
  index: number
  members: Student[]
}

const groups = ref<Group[]>([])

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 将已排序名单依次填入各组 (轮转) */
function roundRobin(list: Student[], n: number): Group[] {
  const result: Group[] = Array.from({ length: n }, (_, i) => ({ index: i + 1, members: [] }))
  list.forEach((s, i) => result[i % n].members.push(s))
  return result
}

function buildGroups() {
  const list = studentList.value
  if (!list.length) {
    toast.warning('请先选择包含学生的班级')
    return
  }
  // 按列分组：取当前已启用的座位表，每一列为一组
  if (mode.value === 'column') {
    const layout = seatStore.activeLayoutOfClass(classId.value)
    if (!layout) {
      toast.warning('该班级尚未启用座位表，请先在「座位表」中启用座次后再分组')
      return
    }
    const byCol: Group[] = []
    for (let c = 0; c < layout.cols; c++) {
      const members: Student[] = []
      for (let r = 0; r < layout.rows; r++) {
        const sid = layout.seats[r]?.[c]
        if (sid) {
          const st = classStore.students.find((s) => s.id === sid)
          if (st) members.push(st)
        }
      }
      if (members.length) byCol.push({ index: byCol.length + 1, members })
    }
    groups.value = byCol
    return
  }
  const n = Math.max(1, Math.floor(groupCount.value) || 1)
  const boys = shuffle(list.filter((s) => s.gender === '男'))
  const girls = shuffle(list.filter((s) => s.gender === '女'))

  let arranged: Student[]
  if (mode.value === 'random') {
    arranged = shuffle(list)
  } else {
    // 男女均衡: 交替取男/女, 保证每组男女数量差 <= 1
    const total = boys.length + girls.length
    arranged = []
    let bi = 0
    let gi = 0
    let turn = 0
    for (let k = 0; k < total; k++) {
      let s: Student | undefined
      if (turn === 0 && bi < boys.length) {
        s = boys[bi++]
        turn = 1
      } else if (gi < girls.length) {
        s = girls[gi++]
        turn = 0
      } else if (bi < boys.length) {
        s = boys[bi++]
        turn = 1
      }
      if (s) arranged.push(s)
    }
    if (mode.value === 'mixed') {
      // 混合均衡: 在男女均衡基础上, 组间再按原序交错分布
      arranged = arranged
    }
  }

  groups.value = roundRobin(arranged, n)
}

const ROLES = ['组长', '记录员', '发言人']
function roleOf(memberIndex: number): string {
  return ROLES[memberIndex % ROLES.length]
}

function copyResult() {
  if (!groups.value.length) {
    toast.warning('请先生成分组')
    return
  }
  const className = classList.value.find((c) => c.id === classId.value)?.name || ''
  const lines: string[] = [
    `【${className} 随机分组】共 ${groups.value.length} 组，方式：${MODE_LABELS[mode.value]}`,
  ]
  for (const g of groups.value) {
    lines.push(`\n第 ${g.index} 组（${g.members.length} 人）`)
    g.members.forEach((m, i) => lines.push(`  ${i + 1}. ${m.name}（${m.gender}）${roleOf(i)}`))
  }
  const text = lines.join('\n')
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success('分组结果已复制到剪贴板'))
    .catch(() => toast.warning('复制失败，请手动选择文本'))
}

function printResult() {
  if (!groups.value.length) {
    toast.warning('请先生成分组')
    return
  }
  window.print()
}

function onClassChange() {
  groups.value = []
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🧩"
      title="随机分组"
      description="将班级学生随机分组，支持角色分配与结果导出"
      gradient="from-mint-100 via-cream-50 to-sky2-100"
    />

    <div class="flex flex-wrap items-end gap-3 card-soft p-4">
      <div>
        <label class="text-xs text-cocoa-500">选择班级</label>
        <select v-model="classId" class="input-soft" @change="onClassChange">
          <option value="">请选择班级</option>
          <option v-for="c in classList" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-cocoa-500">组数</label>
        <input v-model.number="groupCount" type="number" min="1" max="20" class="input-soft w-20" />
      </div>
      <div>
        <label class="text-xs text-cocoa-500">分组方式</label>
        <div class="flex gap-1 mt-1">
          <button
            v-for="m in (['random', 'gender', 'mixed', 'column'] as const)"
            :key="m"
            class="chip cursor-pointer text-[10px]"
            :class="mode === m ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100 text-cocoa-500'"
            @click="mode = m"
          >
            {{ MODE_LABELS[m] }}
          </button>
        </div>
      </div>
      <button class="btn-primary" @click="buildGroups"><RefreshCw :size="14" /> 生成分组</button>
      <button class="btn-secondary" :disabled="!groups.length" @click="copyResult">
        <Copy :size="14" /> 复制
      </button>
      <button class="btn-secondary" :disabled="!groups.length" @click="printResult">
        <Printer :size="14" /> 打印
      </button>
    </div>

    <div v-if="!studentList.length" class="mt-8">
      <EmptyState title="请选择班级" desc="选择含学生的班级后即可分组" icon="🧩" />
    </div>
    <div v-else-if="!groups.length" class="mt-8">
      <EmptyState title="尚未生成分组" desc="设置组数与方式后点击「生成分组」" icon="🧩" />
    </div>
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="g in groups" :key="g.index" class="card-soft p-5">
        <div class="flex items-center gap-2 mb-2">
          <Users :size="16" class="text-mint-500" />
          <h3 class="title-display text-base">第 {{ g.index }} 组</h3>
          <span class="chip text-[10px] bg-cocoa-100 text-cocoa-500">{{ g.members.length }} 人</span>
        </div>
        <ul class="space-y-1 text-sm">
          <li
            v-for="(m, i) in g.members"
            :key="m.id"
            class="flex items-center justify-between gap-2"
          >
            <span>
              <span class="text-cocoa-700">{{ m.name }}</span>
              <span class="text-xs text-cocoa-400">（{{ m.gender }}）</span>
            </span>
            <span class="chip text-[10px] bg-butter-100 text-butter-600">{{ roleOf(i) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
