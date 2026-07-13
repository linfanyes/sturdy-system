<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useRewardStore } from '../../stores/reward'
import type { RewardRecord, RewardType } from '../../types'
import Modal from '../../components/common/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import {
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  Award,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  User,
  Filter,
  TrendingUp,
  TrendingDown,
} from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'

const classStore = useClassStore()
const rewardStore = useRewardStore()
const toast = useToastStore()

const types: { value: RewardType; icon: any; bg: string; text: string; ring: string; sign: number }[] = [
  { value: '表扬', icon: ThumbsUp, bg: 'bg-mint-100', text: 'text-mint-500', ring: 'ring-mint-300', sign: 1 },
  { value: '批评', icon: ThumbsDown, bg: 'bg-butter-100', text: 'text-butter-600', ring: 'ring-butter-300', sign: -1 },
  { value: '处分', icon: AlertTriangle, bg: 'bg-sakura-100', text: 'text-sakura-500', ring: 'ring-sakura-300', sign: -1 },
]

function typeMeta(t: RewardType) {
  return types.find((x) => x.value === t) || types[0]
}

// 筛选
const filterClass = ref<string>('all')
const filterStudent = ref<string>('all')
const filterType = ref<string>('all')

const classStudents = computed(() => {
  if (filterClass.value === 'all') return classStore.students
  return classStore.studentsOf(filterClass.value)
})

const filtered = computed(() => {
  return rewardStore.records
    .filter((r) => {
      if (filterClass.value !== 'all' && r.classId !== filterClass.value) return false
      if (filterStudent.value !== 'all' && r.studentId !== filterStudent.value) return false
      if (filterType.value !== 'all' && r.type !== filterType.value) return false
      return true
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date) || b.createdAt - a.createdAt)
})

// 班级+学生的积分排行
const studentPoints = computed(() => {
  const map = new Map<string, { studentId: string; classId: string; total: number; count: number }>()
  for (const r of rewardStore.records) {
    if (filterClass.value !== 'all' && r.classId !== filterClass.value) continue
    const k = `${r.classId}|${r.studentId}`
    const cur = map.get(k) || { studentId: r.studentId, classId: r.classId, total: 0, count: 0 }
    cur.total += r.points
    cur.count += 1
    map.set(k, cur)
  }
  return Array.from(map.values())
    .map((s) => {
      const stu = classStore.getStudent(s.studentId)
      return { ...s, name: stu?.name || '已删除', className: classStore.getClass(s.classId)?.name || '' }
    })
    .sort((a, b) => b.total - a.total)
})

// 弹框
const editOpen = ref(false)
const editId = ref<string | null>(null)
const edit = ref<{
  type: RewardType
  classId: string
  studentId: string
  points: number
  reason: string
  date: string
} | null>(null)

function openCreate() {
  editId.value = null
  edit.value = {
    type: '表扬',
    classId: filterClass.value !== 'all' ? filterClass.value : classStore.classes[0]?.id || '',
    studentId:
      filterStudent.value !== 'all'
        ? filterStudent.value
        : classStore.studentsOf(filterClass.value !== 'all' ? filterClass.value : classStore.classes[0]?.id || '')[0]?.id || '',
    points: 1,
    reason: '',
    date: new Date().toISOString().slice(0, 10),
  }
  editOpen.value = true
}

function openEdit(r: RewardRecord) {
  editId.value = r.id
  edit.value = {
    type: r.type,
    classId: r.classId,
    studentId: r.studentId,
    points: r.points,
    reason: r.reason,
    date: r.date,
  }
  editOpen.value = true
}

function pickType(t: RewardType) {
  if (!edit.value) return
  edit.value.type = t
  // 自动建议积分：表扬默认 +1，批评 -1，处分 -3
  const meta = typeMeta(t)
  edit.value.points = meta.sign * Math.max(Math.abs(edit.value.points), 1)
}

function saveEdit() {
  if (!edit.value) return
  if (!edit.value.classId) return toast.warning('请选择班级')
  if (!edit.value.studentId) return toast.warning('请选择学生')
  if (!edit.value.points) return toast.warning('请填写积分')
  if (!edit.value.reason.trim()) return toast.warning('请填写事项/原因')
  if (!edit.value.date) return toast.warning('请选择日期')
  if (editId.value) {
    rewardStore.updateRecord(editId.value, { ...edit.value })
    toast.success('已更新')
  } else {
    rewardStore.addRecord({ ...edit.value })
    toast.success('已添加记录')
  }
  editOpen.value = false
}

function removeRecord(r: RewardRecord) {
  if (!confirm('确定删除该记录吗？')) return
  rewardStore.removeRecord(r.id)
  toast.info('已删除')
}
</script>

<template>
  <div class="space-y-5">
    <ToolBackButton />
    <!-- 顶部说明 -->
    <section
      class="card-soft p-6 bg-gradient-to-br from-sakura-100 via-cream-50 to-butter-100 relative overflow-hidden"
    >
      <div class="absolute -top-8 -right-4 text-7xl opacity-15 select-none">
        🏅
      </div>
      <h2 class="title-display text-2xl">
        奖惩记录
      </h2>
      <p class="text-sm text-cocoa-500 mt-1 max-w-lg">
        给孩子的成长路上留个小印章：表扬加分、批评减分、处分警示。支持按班级/学生筛选，可随时修改删除。
      </p>
    </section>

    <!-- 筛选 + 添加 -->
    <div class="flex flex-col md:flex-row gap-3 md:items-center justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <Filter
          :size="14"
          class="text-cocoa-500"
        />
        <select
          v-model="filterClass"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部班级
          </option>
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <select
          v-model="filterStudent"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部学生
          </option>
          <option
            v-for="s in classStudents"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </option>
        </select>
        <select
          v-model="filterType"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部类型
          </option>
          <option value="表扬">
            表扬
          </option>
          <option value="批评">
            批评
          </option>
          <option value="处分">
            处分
          </option>
        </select>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 添加记录
      </button>
    </div>

    <!-- 积分榜（按学生） -->
    <div
      v-if="studentPoints.length"
      class="card-soft p-5"
    >
      <h3 class="title-display text-lg flex items-center gap-2 mb-3">
        <Award :size="16" /> 积分榜
        <span class="text-[11px] text-cocoa-500 font-normal">
          {{ filterClass === 'all' ? '全校' : classStore.getClass(filterClass)?.name }}
        </span>
      </h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="(p, i) in studentPoints.slice(0, 9)"
          :key="p.classId + p.studentId"
          class="card-flat p-3 flex items-center gap-2"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
            :class="
              i === 0
                ? 'bg-butter-400 text-cocoa-900'
                : i === 1
                  ? 'bg-sky2-300 text-cocoa-900'
                  : i === 2
                    ? 'bg-sakura-300 text-cocoa-900'
                    : 'bg-cocoa-100 text-cocoa-700'
            "
          >
            {{ i + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">
              {{ p.name }}
            </div>
            <div class="text-[10px] text-cocoa-500">
              {{ p.className }} · 共 {{ p.count }} 条
            </div>
          </div>
          <div
            class="number text-lg"
            :class="p.total > 0 ? 'text-mint-500' : p.total < 0 ? 'text-sakura-500' : 'text-cocoa-500'"
          >
            {{ p.total > 0 ? '+' : '' }}{{ p.total }}
          </div>
        </div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div
      v-if="filtered.length"
      class="card-soft p-5"
    >
      <h3 class="title-display text-lg flex items-center gap-2 mb-3">
        <User :size="16" /> 记录明细
        <span class="text-[11px] text-cocoa-500 font-normal">共 {{ filtered.length }} 条</span>
      </h3>
      <div class="space-y-2">
        <div
          v-for="r in filtered"
          :key="r.id"
          class="card-flat p-3 flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center"
            :class="typeMeta(r.type).bg + ' ' + typeMeta(r.type).text"
          >
            <component
              :is="typeMeta(r.type).icon"
              :size="16"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-sm font-medium">
                {{ classStore.getStudent(r.studentId)?.name || '已删除' }}
              </span>
              <span
                class="chip text-[10px]"
                :class="typeMeta(r.type).bg + ' ' + typeMeta(r.type).text"
              >
                {{ r.type }}
              </span>
              <span class="text-[10px] text-cocoa-500">
                {{ classStore.getClass(r.classId)?.name }} · {{ r.date }}
              </span>
            </div>
            <div
              class="text-xs text-cocoa-700 mt-0.5 truncate"
              :title="r.reason"
            >
              {{ r.reason }}
            </div>
          </div>
          <div
            class="number text-lg flex items-center gap-0.5"
            :class="r.points > 0 ? 'text-mint-500' : 'text-sakura-500'"
          >
            <component
              :is="r.points > 0 ? TrendingUp : TrendingDown"
              :size="12"
            />
            {{ r.points > 0 ? '+' : '' }}{{ r.points }}
          </div>
          <div class="flex items-center gap-1">
            <button
              class="p-1.5 rounded-full hover:bg-butter-100"
              @click="openEdit(r)"
            >
              <Edit :size="14" />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-sakura-100"
              @click="removeRecord(r)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="还没有奖惩记录"
      desc="添加第一条记录，开始记录孩子的成长"
      icon="🌟"
    >
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 立即添加
      </button>
    </EmptyState>

    <!-- 编辑弹框 -->
    <Modal
      :open="editOpen"
      :title="editId ? '修改记录' : '添加记录'"
      width="560px"
      @close="editOpen = false"
    >
      <div
        v-if="edit"
        class="space-y-3"
      >
        <div>
          <label class="text-xs text-cocoa-500 ml-1">类型</label>
          <div class="mt-1 grid grid-cols-3 gap-2">
            <button
              v-for="t in types"
              :key="t.value"
              class="card-flat p-3 text-center transition"
              :class="
                edit.type === t.value
                  ? `${t.bg} ring-2 ${t.ring}`
                  : 'hover:bg-butter-50'
              "
              @click="pickType(t.value)"
            >
              <div
                class="w-9 h-9 mx-auto rounded-full flex items-center justify-center mb-1"
                :class="t.bg + ' ' + t.text"
              >
                <component
                  :is="t.icon"
                  :size="16"
                />
              </div>
              <div class="text-sm font-medium">
                {{ t.value }}
              </div>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">班级</label>
            <select
              v-model="edit.classId"
              class="input-soft mt-1"
            >
              <option
                v-for="c in classStore.classes"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">学生</label>
            <select
              v-model="edit.studentId"
              class="input-soft mt-1"
            >
              <option
                v-for="s in classStore.studentsOf(edit.classId)"
                :key="s.id"
                :value="s.id"
              >
                {{ s.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">积分（正加分，负减分）</label>
            <input
              v-model.number="edit.points"
              type="number"
              class="input-soft mt-1"
              placeholder="如 1 或 -1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">日期</label>
            <input
              v-model="edit.date"
              type="date"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">事项 / 原因</label>
          <textarea
            v-model="edit.reason"
            class="input-soft mt-1 min-h-[80px]"
            placeholder="如：主动帮助同学 / 上课走神 / 拾金不昧..."
          />
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="editOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveEdit"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>
  </div>
</template>
