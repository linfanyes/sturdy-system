<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useGrowthStore } from '../stores/growth'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Search } from 'lucide-vue-next'
import type { GrowthEntry } from '../types'

const classStore = useClassStore()
const growthStore = useGrowthStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const students = computed(() => classStore.studentsOf(classId.value))
const studentIds = computed(() => new Set(students.value.map(s => s.id)))

const entries = computed(() =>
  growthStore.entries
    .filter(e => studentIds.value.has(e.studentId))
    .sort((a, b) => b.createdAt - a.createdAt)
)

const types: GrowthEntry['type'][] = ['获奖', '进步', '谈话', '家访', '特殊事件', '其他']
const filterType = ref<string>('全部')
const filterStudent = ref('')
const search = ref('')

const filtered = computed(() => {
  let list = entries.value
  if (filterType.value !== '全部') list = list.filter(e => e.type === filterType.value)
  if (filterStudent.value) list = list.filter(e => e.studentId === filterStudent.value)
  if (search.value.trim()) {
    const kw = search.value.trim().toLowerCase()
    list = list.filter(e => e.title.toLowerCase().includes(kw) || e.content.toLowerCase().includes(kw) || e.studentName.toLowerCase().includes(kw))
  }
  return list
})

const modalOpen = ref(false)
const editing = ref<GrowthEntry | null>(null)
const draft = ref({
  studentId: '',
  studentName: '',
  type: '进步' as GrowthEntry['type'],
  date: new Date().toISOString().slice(0, 10),
  title: '',
  content: '',
})

function openCreate() {
  editing.value = null
  draft.value = {
    studentId: students.value[0]?.id || '',
    studentName: students.value[0]?.name || '',
    type: '进步', date: new Date().toISOString().slice(0, 10), title: '', content: '',
  }
  modalOpen.value = true
}

function openEdit(e: GrowthEntry) {
  editing.value = e
  draft.value = { studentId: e.studentId, studentName: e.studentName, type: e.type, date: e.date, title: e.title, content: e.content }
  modalOpen.value = true
}

function save() {
  if (!draft.value.studentId) { toast.warning('请选择学生'); return }
  if (!draft.value.title.trim()) { toast.warning('请输入标题'); return }
  const student = students.value.find(s => s.id === draft.value.studentId)
  const payload = { ...draft.value, studentName: student?.name || draft.value.studentName }
  if (editing.value) {
    growthStore.updateEntry(editing.value.id, payload)
    toast.success('已更新')
  } else {
    growthStore.addEntry(payload)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(e: GrowthEntry) {
  if (!confirm(`确定删除「${e.title}」？`)) return
  growthStore.removeEntry(e.id)
  toast.info('已删除')
}

const typeColor: Record<string, string> = {
  '获奖': 'bg-butter-100 text-butter-600',
  '进步': 'bg-mint-100 text-mint-500',
  '谈话': 'bg-sky2-100 text-sky2-500',
  '家访': 'bg-sakura-100 text-sakura-500',
  '特殊事件': 'bg-cocoa-100 text-cocoa-600',
  '其他': 'bg-cream-200 text-cocoa-500',
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-butter-100 via-cream-50 to-mint-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">🌱</div>
      <h2 class="title-display text-2xl">学生成长档案</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录每一个闪光时刻，见证成长轨迹</p>
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
        <button v-for="t in ['全部', ...types]" :key="t" class="chip cursor-pointer text-[10px]"
          :class="filterType === t ? 'bg-butter-300 text-butter-700' : 'bg-cocoa-100 text-cocoa-500'"
          @click="filterType = t">{{ t }}</button>
      </div>
      <div class="relative ml-auto">
        <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-cocoa-300" />
        <input v-model="search" class="input-soft !pl-8 !w-40" placeholder="搜索..." />
      </div>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增
      </button>
    </div>

    <div v-if="!filtered.length" class="mt-8">
      <EmptyState title="还没有成长记录" desc="记录学生的获奖、进步、谈话等重要时刻" icon="🌱" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="e in filtered" :key="e.id" class="card-flat p-4 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ e.studentName }}</span>
              <span class="chip text-[10px]" :class="typeColor[e.type] || ''">{{ e.type }}</span>
              <span class="text-xs text-cocoa-400">{{ e.date }}</span>
            </div>
            <h4 class="text-sm font-medium text-cocoa-800 mt-1">{{ e.title }}</h4>
            <p class="text-sm text-cocoa-600 mt-1">{{ e.content }}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(e)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(e)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑成长记录' : '新增成长记录'" width="560px" @close="modalOpen = false">
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
          <label class="text-xs text-cocoa-500">类型</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <button v-for="t in types" :key="t" class="chip cursor-pointer"
              :class="draft.type === t ? typeColor[t] : 'bg-cocoa-100 text-cocoa-500'"
              @click="draft.type = t">{{ t }}</button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">标题</label>
          <input v-model="draft.title" class="input-soft" placeholder="如：数学竞赛获奖" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">详情</label>
          <textarea v-model="draft.content" class="input-soft" rows="4" placeholder="记录详细内容..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
