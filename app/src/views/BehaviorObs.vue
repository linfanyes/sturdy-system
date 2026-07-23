<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useGrowthStore } from '../stores/growth'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, TrendingUp } from 'lucide-vue-next'
import type { BehaviorRecord } from '../types'

const classStore = useClassStore()
const growthStore = useGrowthStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const students = computed(() => classStore.studentsOf(classId.value))
const studentIds = computed(() => new Set(students.value.map(s => s.id)))

const behaviors = computed(() =>
  growthStore.behaviors
    .filter(b => studentIds.value.has(b.studentId))
    .sort((a, b) => b.createdAt - a.createdAt)
)

const behaviorTypes: BehaviorRecord['behavior'][] = ['积极发言', '认真听讲', '走神', '帮助同学', '违纪', '其他']
const filterBehavior = ref<string>('全部')
const filterStudent = ref('')
const dateFilter = ref(new Date().toISOString().slice(0, 10))

const filtered = computed(() => {
  let list = behaviors.value
  if (filterBehavior.value !== '全部') list = list.filter(b => b.behavior === filterBehavior.value)
  if (filterStudent.value) list = list.filter(b => b.studentId === filterStudent.value)
  return list
})

// Stats
const stats = computed(() => {
  const map: Record<string, number> = {}
  for (const b of behaviors.value) {
    map[b.behavior] = (map[b.behavior] || 0) + 1
  }
  return map
})

const modalOpen = ref(false)
const editing = ref<BehaviorRecord | null>(null)
const draft = ref({
  studentId: '',
  studentName: '',
  date: new Date().toISOString().slice(0, 10),
  behavior: '积极发言' as BehaviorRecord['behavior'],
  note: '',
})

function openCreate() {
  editing.value = null
  draft.value = {
    studentId: students.value[0]?.id || '',
    studentName: students.value[0]?.name || '',
    date: new Date().toISOString().slice(0, 10),
    behavior: '积极发言', note: '',
  }
  modalOpen.value = true
}

function openEdit(b: BehaviorRecord) {
  editing.value = b
  draft.value = { studentId: b.studentId, studentName: b.studentName, date: b.date, behavior: b.behavior, note: b.note }
  modalOpen.value = true
}

function save() {
  if (!draft.value.studentId) { toast.warning('请选择学生'); return }
  const student = students.value.find(s => s.id === draft.value.studentId)
  const payload = { ...draft.value, studentName: student?.name || draft.value.studentName }
  if (editing.value) {
    growthStore.updateBehavior(editing.value.id, payload)
    toast.success('已更新')
  } else {
    growthStore.addBehavior(payload)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(b: BehaviorRecord) {
  if (!confirm('确定删除此条记录？')) return
  growthStore.removeBehavior(b.id)
  toast.info('已删除')
}

const behaviorColor: Record<string, string> = {
  '积极发言': 'bg-mint-100 text-mint-500',
  '认真听讲': 'bg-sky2-100 text-sky2-500',
  '走神': 'bg-butter-100 text-butter-600',
  '帮助同学': 'bg-mint-100 text-mint-500',
  '违纪': 'bg-sakura-100 text-sakura-500',
  '其他': 'bg-cocoa-100 text-cocoa-500',
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-mint-100 via-cream-50 to-sky2-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">👀</div>
      <h2 class="title-display text-2xl">行为观察记录</h2>
      <p class="text-sm text-cocoa-500 mt-1">课堂行为追踪，及时发现学生的积极表现和需要关注的问题</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filterStudent" class="input-soft !w-auto">
        <option value="">全部学生</option>
        <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <div class="flex gap-1 flex-wrap">
        <button v-for="t in ['全部', ...behaviorTypes]" :key="t" class="chip cursor-pointer text-[10px]"
          :class="filterBehavior === t ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100 text-cocoa-500'"
          @click="filterBehavior = t">{{ t }}</button>
      </div>
      <button class="btn-primary ml-auto" @click="openCreate">
        <Plus :size="14" /> 新增记录
      </button>
    </div>

    <!-- 统计概览 -->
    <div v-if="behaviors.length" class="flex gap-2 flex-wrap">
      <div v-for="(count, type) in stats" :key="type" class="chip text-xs" :class="behaviorColor[type as string] || ''">
        {{ type }}: {{ count }}次
      </div>
    </div>

    <div v-if="!filtered.length" class="mt-8">
      <EmptyState title="还没有行为记录" desc="记录课堂上的积极发言、走神等行为" icon="👀" />
    </div>

    <div v-else class="space-y-2">
      <div v-for="b in filtered" :key="b.id" class="card-flat p-3 hover:shadow-soft transition flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
          :class="behaviorColor[b.behavior] || 'bg-cocoa-100'">
          {{ b.behavior === '积极发言' ? '🙋' : b.behavior === '认真听讲' ? '👂' : b.behavior === '走神' ? '💭' : b.behavior === '帮助同学' ? '🤝' : b.behavior === '违纪' ? '⚠️' : '📝' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium">{{ b.studentName }}</span>
            <span class="chip text-[10px]" :class="behaviorColor[b.behavior] || ''">{{ b.behavior }}</span>
            <span class="text-xs text-cocoa-400">{{ b.date }}</span>
          </div>
          <p v-if="b.note" class="text-sm text-cocoa-600 mt-1">{{ b.note }}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(b)">编辑</button>
          <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(b)"><Trash2 :size="12" /></button>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑行为记录' : '新增行为记录'" width="480px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">学生</label>
            <select v-model="draft.studentId" class="input-soft">
              <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">行为类型</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <button v-for="t in behaviorTypes" :key="t" class="chip cursor-pointer"
              :class="draft.behavior === t ? behaviorColor[t] : 'bg-cocoa-100 text-cocoa-500'"
              @click="draft.behavior = t">{{ t }}</button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">备注</label>
          <textarea v-model="draft.note" class="input-soft" rows="3" placeholder="简要描述..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
