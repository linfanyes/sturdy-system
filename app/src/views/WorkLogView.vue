<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/admin'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Calendar, BookOpen } from 'lucide-vue-next'
import type { WorkLog } from '../types'

const adminStore = useAdminStore()
const toast = useToastStore()

const logs = computed(() => [...adminStore.logs].sort((a, b) => b.createdAt - a.createdAt))

const modalOpen = ref(false)
const editing = ref<WorkLog | null>(null)
const draft = ref({
  date: new Date().toISOString().slice(0, 10),
  content: '',
  classCount: 0,
  homeworkCount: 0,
  note: '',
})

function openCreate() {
  editing.value = null
  draft.value = {
    date: new Date().toISOString().slice(0, 10),
    content: '', classCount: 0, homeworkCount: 0, note: '',
  }
  modalOpen.value = true
}

function openEdit(l: WorkLog) {
  editing.value = l
  draft.value = { date: l.date, content: l.content, classCount: l.classCount, homeworkCount: l.homeworkCount, note: l.note }
  modalOpen.value = true
}

function save() {
  if (!draft.value.content.trim()) { toast.warning('请填写工作内容'); return }
  if (editing.value) {
    adminStore.updateLog(editing.value.id, draft.value)
    toast.success('已更新')
  } else {
    adminStore.addLog(draft.value)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(l: WorkLog) {
  if (!confirm('确定删除此条工作日志？')) return
  adminStore.removeLog(l.id)
  toast.info('已删除')
}

// Summary stats
const totalClasses = computed(() => logs.value.reduce((s, l) => s + l.classCount, 0))
const totalHomework = computed(() => logs.value.reduce((s, l) => s + l.homeworkCount, 0))
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-butter-100 via-cream-50 to-sakura-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📓</div>
      <h2 class="title-display text-2xl">工作日志</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录每日教学工作，回顾与反思</p>
    </section>

    <!-- 统计概览 -->
    <div v-if="logs.length" class="flex gap-3 flex-wrap">
      <div class="chip bg-butter-100 text-butter-600 text-xs">
        <Calendar :size="12" class="inline" /> 共 {{ logs.length }} 篇日志
      </div>
      <div class="chip bg-mint-100 text-mint-500 text-xs">
        <BookOpen :size="12" class="inline" /> 累计 {{ totalClasses }} 节课
      </div>
      <div class="chip bg-sky2-100 text-sky2-500 text-xs">
        批改 {{ totalHomework }} 份作业
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增日志
      </button>
    </div>

    <div v-if="!logs.length" class="mt-8">
      <EmptyState title="还没有工作日志" desc="记录每天的教学工作，积累教学经验" icon="📓" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="l in logs" :key="l.id" class="card-soft p-5 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-cocoa-800">{{ l.date }}</span>
              <span v-if="l.classCount" class="chip bg-butter-100 text-butter-600 text-[10px]">{{ l.classCount }}节课</span>
              <span v-if="l.homeworkCount" class="chip bg-sky2-100 text-sky2-500 text-[10px]">批改{{ l.homeworkCount }}份</span>
            </div>
            <p class="text-sm text-cocoa-700 mt-2 whitespace-pre-line">{{ l.content }}</p>
            <p v-if="l.note" class="text-xs text-cocoa-500 mt-1 italic">💡 {{ l.note }}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(l)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(l)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑工作日志' : '新增工作日志'" width="560px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">上课节数</label>
            <input v-model.number="draft.classCount" type="number" min="0" class="input-soft" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">批改作业数</label>
            <input v-model.number="draft.homeworkCount" type="number" min="0" class="input-soft" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">工作内容</label>
          <textarea v-model="draft.content" class="input-soft" rows="6" placeholder="今天的主要工作内容..." />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">备注/反思</label>
          <textarea v-model="draft.note" class="input-soft" rows="2" placeholder="选填" />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
