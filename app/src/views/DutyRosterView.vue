<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useClassOpsStore } from '../stores/classOps'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Users } from 'lucide-vue-next'
import ToolBackButton from '../components/common/ToolBackButton.vue'
import type { DutyRoster } from '../types'

const classStore = useClassStore()
const opsStore = useClassOpsStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const students = computed(() => classStore.studentsOf(classId.value))
const rosters = computed(() => opsStore.rosters.filter(r => r.classId === classId.value))

const modalOpen = ref(false)
const editing = ref<DutyRoster | null>(null)
const draft = ref({
  name: '',
  type: '值日' as DutyRoster['type'],
  assignments: [] as { date: string; persons: string[] }[],
})

// Generate next 5 weekdays
function nextWeekdays(count: number) {
  const dates: string[] = []
  const d = new Date()
  while (dates.length < count) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) {
      dates.push(d.toISOString().slice(0, 10))
    }
  }
  return dates
}

function openCreate() {
  editing.value = null
  const dates = nextWeekdays(5)
  draft.value = {
    name: '值日安排表',
    type: '值日',
    assignments: dates.map(d => ({ date: d, persons: [] })),
  }
  modalOpen.value = true
}

function openEdit(r: DutyRoster) {
  editing.value = r
  draft.value = {
    name: r.name,
    type: r.type,
    assignments: r.assignments.map(a => ({ date: a.date, persons: [...a.persons] })),
  }
  modalOpen.value = true
}

function addPerson(idx: number) {
  draft.value.assignments[idx].persons.push('')
}

function removePerson(idx: number, pIdx: number) {
  draft.value.assignments[idx].persons.splice(pIdx, 1)
}

function save() {
  if (!draft.value.name.trim()) { toast.warning('请输入名称'); return }
  const payload = {
    classId: classId.value,
    name: draft.value.name,
    type: draft.value.type,
    assignments: draft.value.assignments.filter(a => a.persons.some(p => p.trim())),
  }
  if (editing.value) {
    opsStore.updateRoster(editing.value.id, payload)
    toast.success('已更新')
  } else {
    opsStore.addRoster(payload)
    toast.success('已创建')
  }
  modalOpen.value = false
}

function remove(r: DutyRoster) {
  if (!confirm(`确定删除「${r.name}」？`)) return
  opsStore.removeRoster(r.id)
  toast.info('已删除')
}

function dayName(dateStr: string) {
  const d = new Date(dateStr)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}
</script>

<template>
  <div class="space-y-5">
    <ToolBackButton />

    <section class="card-soft p-6 bg-gradient-to-br from-sky2-100 via-cream-50 to-sakura-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📋</div>
      <h2 class="title-display text-2xl">轮值表</h2>
      <p class="text-sm text-cocoa-500 mt-1">管理值日安排和班干部轮值</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新建轮值表
      </button>
    </div>

    <div v-if="!rosters.length" class="mt-8">
      <EmptyState title="还没有轮值表" desc="创建值日或班干部轮值安排" icon="📋" />
    </div>

    <div v-else class="space-y-4">
      <div v-for="r in rosters" :key="r.id" class="card-soft p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h3 class="title-display text-lg">{{ r.name }}</h3>
            <span class="chip text-[10px]" :class="r.type === '值日' ? 'bg-mint-100 text-mint-500' : 'bg-sky2-100 text-sky2-500'">{{ r.type }}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(r)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(r)"><Trash2 :size="12" /></button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-cocoa-500">
                <th class="text-left py-1 pr-3">日期</th>
                <th class="text-left py-1">人员</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in r.assignments" :key="a.date" class="border-t border-cocoa-100/50">
                <td class="py-1.5 pr-3 whitespace-nowrap">{{ a.date }} 周{{ dayName(a.date) }}</td>
                <td class="py-1.5">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(p, i) in a.persons" :key="i" class="chip bg-cream-200 text-cocoa-600 text-xs">{{ p }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑轮值表' : '新建轮值表'" width="640px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">名称</label>
            <input v-model="draft.name" class="input-soft" placeholder="如：本周值日表" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">类型</label>
            <div class="flex gap-2 mt-1">
              <button class="chip cursor-pointer" :class="draft.type === '值日' ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100'" @click="draft.type = '值日'">值日</button>
              <button class="chip cursor-pointer" :class="draft.type === '班干部' ? 'bg-sky2-300 text-sky2-700' : 'bg-cocoa-100'" @click="draft.type = '班干部'">班干部</button>
            </div>
          </div>
        </div>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div v-for="(a, idx) in draft.assignments" :key="idx" class="card-flat p-3">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <input v-model="a.date" type="date" class="input-soft !py-1 !text-xs !w-36" />
                <span class="text-xs text-cocoa-500">周{{ dayName(a.date) }}</span>
              </div>
              <button class="btn-ghost !px-2 !py-0.5 text-xs" @click="addPerson(idx)">+ 人员</button>
            </div>
            <div class="flex flex-wrap gap-1 mt-1">
              <div v-for="(p, pIdx) in a.persons" :key="pIdx" class="flex items-center gap-1">
                <input v-model="a.persons[pIdx]" class="input-soft !py-0.5 !text-xs !w-20" placeholder="姓名" list="student-names" />
                <button class="text-sakura-400 hover:text-sakura-500 text-xs" @click="removePerson(idx, pIdx)">×</button>
              </div>
            </div>
          </div>
        </div>
        <datalist id="student-names">
          <option v-for="s in students" :key="s.id" :value="s.name">{{ s.name }}</option>
        </datalist>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
