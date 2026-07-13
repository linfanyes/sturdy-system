<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useClassOpsStore } from '../stores/classOps'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Wallet, TrendingUp, TrendingDown } from 'lucide-vue-next'
import type { ClassExpense } from '../types'

const classStore = useClassStore()
const opsStore = useClassOpsStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const expenses = computed(() =>
  opsStore.expenses.filter(e => e.classId === classId.value).sort((a, b) => b.createdAt - a.createdAt)
)
const balance = computed(() => opsStore.balanceOf(classId.value))
const totalIn = computed(() => expenses.value.filter(e => e.type === '收入').reduce((s, e) => s + e.amount, 0))
const totalOut = computed(() => expenses.value.filter(e => e.type === '支出').reduce((s, e) => s + e.amount, 0))

const categories = ['班费收缴', '文具采购', '活动经费', '打印复印', '装饰品', '奖品', '其他']
const modalOpen = ref(false)
const editing = ref<ClassExpense | null>(null)
const draft = ref({
  type: '支出' as ClassExpense['type'],
  category: '其他',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  handler: '',
})

function openCreate() {
  editing.value = null
  draft.value = { type: '支出', category: '其他', amount: 0, date: new Date().toISOString().slice(0, 10), description: '', handler: '' }
  modalOpen.value = true
}

function openEdit(e: ClassExpense) {
  editing.value = e
  draft.value = { type: e.type, category: e.category, amount: e.amount, date: e.date, description: e.description, handler: e.handler }
  modalOpen.value = true
}

function save() {
  if (!draft.value.amount) { toast.warning('请输入金额'); return }
  if (!draft.value.description.trim()) { toast.warning('请输入说明'); return }
  const payload = { ...draft.value, classId: classId.value }
  if (editing.value) {
    opsStore.updateExpense(editing.value.id, payload)
    toast.success('已更新')
  } else {
    opsStore.addExpense(payload)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(e: ClassExpense) {
  if (!confirm('确定删除此条记录？')) return
  opsStore.removeExpense(e.id)
  toast.info('已删除')
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-mint-100 via-cream-50 to-butter-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">💰</div>
      <h2 class="title-display text-2xl">班费管理</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录班费收支，账目清晰透明</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增记录
      </button>
    </div>

    <!-- 概览 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-flat p-4 text-center">
        <Wallet :size="18" class="mx-auto text-cocoa-400" />
        <div class="number text-2xl mt-1" :class="balance >= 0 ? 'text-mint-500' : 'text-sakura-500'">{{ balance.toFixed(2) }}</div>
        <div class="text-xs text-cocoa-500">当前余额</div>
      </div>
      <div class="card-flat p-4 text-center">
        <TrendingUp :size="18" class="mx-auto text-mint-400" />
        <div class="number text-2xl mt-1 text-mint-500">{{ totalIn.toFixed(2) }}</div>
        <div class="text-xs text-cocoa-500">总收入</div>
      </div>
      <div class="card-flat p-4 text-center">
        <TrendingDown :size="18" class="mx-auto text-sakura-400" />
        <div class="number text-2xl mt-1 text-sakura-500">{{ totalOut.toFixed(2) }}</div>
        <div class="text-xs text-cocoa-500">总支出</div>
      </div>
    </div>

    <div v-if="!expenses.length" class="mt-4">
      <EmptyState title="还没有收支记录" desc="记录班费的每一笔收入和支出" icon="💰" />
    </div>

    <div v-else class="space-y-2">
      <div v-for="e in expenses" :key="e.id" class="card-flat p-3 hover:shadow-soft transition flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          :class="e.type === '收入' ? 'bg-mint-200 text-mint-600' : 'bg-sakura-200 text-sakura-600'">
          {{ e.type === '收入' ? '+' : '-' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm">{{ e.description }}</span>
            <span class="chip bg-cocoa-100 text-cocoa-500 text-[10px]">{{ e.category }}</span>
            <span class="text-xs text-cocoa-400">{{ e.date }}</span>
            <span v-if="e.handler" class="text-xs text-cocoa-400">经办: {{ e.handler }}</span>
          </div>
        </div>
        <div class="number text-sm font-bold shrink-0" :class="e.type === '收入' ? 'text-mint-500' : 'text-sakura-500'">
          {{ e.type === '收入' ? '+' : '-' }}{{ e.amount.toFixed(2) }}
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(e)">编辑</button>
          <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(e)"><Trash2 :size="12" /></button>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑收支' : '新增收支'" width="480px" @close="modalOpen = false">
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500">类型</label>
          <div class="flex gap-2 mt-1">
            <button class="chip cursor-pointer" :class="draft.type === '收入' ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100 text-cocoa-500'" @click="draft.type = '收入'">收入</button>
            <button class="chip cursor-pointer" :class="draft.type === '支出' ? 'bg-sakura-300 text-sakura-700' : 'bg-cocoa-100 text-cocoa-500'" @click="draft.type = '支出'">支出</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">金额</label>
            <input v-model.number="draft.amount" type="number" min="0" step="0.01" class="input-soft" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">分类</label>
          <select v-model="draft.category" class="input-soft">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">说明</label>
          <input v-model="draft.description" class="input-soft" placeholder="如：购买班级装饰用品" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">经办人</label>
          <input v-model="draft.handler" class="input-soft" placeholder="选填" />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
