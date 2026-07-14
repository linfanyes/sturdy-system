<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useParentContactStore } from '../stores/parentContact'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Phone, MessageSquare, RefreshCw } from 'lucide-vue-next'
import type { ParentContact } from '../types'
import { formatDate } from '../utils'

const classStore = useClassStore()
const contactStore = useParentContactStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const students = computed(() => classStore.studentsOf(classId.value))
const contacts = computed(() => {
  const studentIds = new Set(students.value.map(s => s.id))
  return contactStore.contacts.filter(c => studentIds.has(c.studentId))
    .sort((a, b) => b.createdAt - a.createdAt)
})

const modalOpen = ref(false)
const editing = ref<ParentContact | null>(null)
const draft = ref({
  studentId: '',
  parentName: '',
  relation: '家长',
  phone: '',
  wechat: '',
  method: '电话' as ParentContact['method'],
  content: '',
  date: new Date().toISOString().slice(0, 10),
})

function openCreate() {
  editing.value = null
  draft.value = {
    studentId: students.value[0]?.id || '',
    parentName: '', relation: '家长', phone: '', wechat: '',
    method: '电话', content: '', date: new Date().toISOString().slice(0, 10),
  }
  modalOpen.value = true
}

function openEdit(c: ParentContact) {
  editing.value = c
  draft.value = {
    studentId: c.studentId, parentName: c.parentName, relation: c.relation,
    phone: c.phone, wechat: c.wechat, method: c.method, content: c.content, date: c.date,
  }
  modalOpen.value = true
}

function save() {
  if (!draft.value.studentId) { toast.warning('请选择学生'); return }
  if (!draft.value.content.trim()) { toast.warning('请填写沟通内容'); return }
  const student = students.value.find(s => s.id === draft.value.studentId)
  const payload = { ...draft.value, studentName: student?.name || '' }
  if (editing.value) {
    contactStore.updateContact(editing.value.id, payload)
    toast.success('已更新')
  } else {
    contactStore.addContact(payload)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(c: ParentContact) {
  if (!confirm('确定删除此条联系记录？')) return
  contactStore.removeContact(c.id)
  toast.info('已删除')
}

/** 从学生档案同步家长信息（有则填充，无则留空） */
function syncParentFromStudent() {
  const student = students.value.find(s => s.id === draft.value.studentId)
  if (!student) {
    toast.warning('请先选择学生')
    return
  }
  draft.value.parentName = student.parentName || ''
  draft.value.phone = student.parentPhone || ''
  toast.success(student.parentName || student.parentPhone ? '已同步学生家长信息' : '该学生暂未填写家长信息')
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-sky2-100 via-cream-50 to-mint-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📞</div>
      <h2 class="title-display text-2xl">家长联系记录</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录每次家校沟通，方便回顾和跟进</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增记录
      </button>
    </div>

    <div v-if="!contacts.length" class="mt-8">
      <EmptyState title="还没有联系记录" desc="点击「新增记录」开始记录家校沟通" icon="📞" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="c in contacts" :key="c.id" class="card-flat p-4 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ c.studentName }}</span>
              <span class="chip bg-sky2-100 text-sky2-500 text-[10px]">{{ c.method }}</span>
              <span class="text-xs text-cocoa-400">{{ c.date }}</span>
            </div>
            <div class="text-xs text-cocoa-500 mt-1">{{ c.parentName }}（{{ c.relation }}）
              <span v-if="c.phone" class="ml-2"><Phone :size="10" class="inline" /> {{ c.phone }}</span>
              <span v-if="c.wechat" class="ml-2">微信: {{ c.wechat }}</span>
            </div>
            <p class="text-sm text-cocoa-700 mt-2">{{ c.content }}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(c)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(c)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑联系记录' : '新增联系记录'" width="560px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">学生</label>
            <div class="flex items-center gap-2">
              <select v-model="draft.studentId" class="input-soft flex-1">
                <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <button class="btn-secondary !px-3 text-xs whitespace-nowrap" title="从学生档案同步家长姓名和电话" @click="syncParentFromStudent">
                <RefreshCw :size="12" class="inline" /> 同步档案家长
              </button>
            </div>
            <p class="text-[11px] text-cocoa-500 mt-1">
              点击「同步档案家长」可把该学生在「学生管理」中已填写的家长姓名/电话自动带过来，没有则留空。
            </p>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">家长姓名</label>
            <input v-model="draft.parentName" class="input-soft" placeholder="如：张妈妈" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">关系</label>
            <input v-model="draft.relation" class="input-soft" placeholder="如：母亲、父亲" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">电话</label>
            <input v-model="draft.phone" class="input-soft" placeholder="选填" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">微信</label>
            <input v-model="draft.wechat" class="input-soft" placeholder="选填" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">沟通方式</label>
          <div class="flex gap-2 mt-1">
            <button v-for="m in ['电话', '微信', '面谈', '家访', '其他']" :key="m"
              class="chip cursor-pointer" :class="draft.method === m ? 'bg-sky2-300 text-sky2-700' : 'bg-cocoa-100 text-cocoa-500'"
              @click="draft.method = m as any">{{ m }}</button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">沟通内容</label>
          <textarea v-model="draft.content" class="input-soft" rows="4" placeholder="记录沟通要点..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
