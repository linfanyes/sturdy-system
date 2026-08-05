<script setup lang="ts">
/**
 * 教学日历：按月展示教学计划，支持在某日添加/编辑/删除计划项。
 * 数据来自 /teaching-calendar（title/date/grade/subject/note/color/type）。
 */
import { ref, computed, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit3, Calendar } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import request from '@/api/request'

const items = ref<any[]>([])
const loading = ref(false)
const current = ref(new Date())
const showForm = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const form = ref({ title: '', date: '', grade: '', subject: '', note: '', color: '#e8f1fb', type: 'normal' })

const typeOptions = [
  { value: 'normal', label: '普通', color: '#e8f1fb' },
  { value: 'exam', label: '考试', color: '#fde8e8' },
  { value: 'meeting', label: '教研', color: '#e8f8ea' },
  { value: 'other', label: '其他', color: '#f8f0e8' },
]

const year = computed(() => current.value.getFullYear())
const month = computed(() => current.value.getMonth())

/** 当月日历网格（含前后补位） */
const calendarDays = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const days: { date: string; day: number; inMonth: boolean; isWeekend: boolean }[] = []
  // 前置补位
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year.value, month.value, -i)
    const dow = d.getDay()
    days.push({ date: fmtDate(d), day: d.getDate(), inMonth: false, isWeekend: dow === 0 || dow === 6 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year.value, month.value, d)
    const dow = date.getDay()
    days.push({ date: fmtDate(date), day: d, inMonth: true, isWeekend: dow === 0 || dow === 6 })
  }
  // 后置补位至 6 行
  while (days.length % 7 !== 0) {
    const last = new Date(days[days.length - 1].date)
    last.setDate(last.getDate() + 1)
    const dow = last.getDay()
    days.push({ date: fmtDate(last), day: last.getDate(), inMonth: false, isWeekend: dow === 0 || dow === 6 })
  }
  return days
})

function fmtDate(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function itemsOnDate(date: string) {
  return items.value.filter(i => i.date === date)
}

function prevMonth() {
  current.value = new Date(year.value, month.value - 1, 1)
}
function nextMonth() {
  current.value = new Date(year.value, month.value + 1, 1)
}
function today() {
  current.value = new Date()
}

async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/teaching-calendar', { params: { take: 500 } })
    items.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadList)

function openCreate(date?: string) {
  editing.value = null
  form.value = { title: '', date: date || fmtDate(new Date()), grade: '', subject: '', note: '', color: '#e8f1fb', type: 'normal' }
  showForm.value = true
}

function openEdit(item: any) {
  editing.value = item
  form.value = { title: item.title, date: item.date, grade: item.grade || '', subject: item.subject || '', note: item.note || '', color: item.color || '#e8f1fb', type: item.type || 'normal' }
  showForm.value = true
}

function onTypeChange() {
  const t = typeOptions.find(o => o.value === form.value.type)
  if (t) form.value.color = t.color
}

async function submit() {
  if (!form.value.title) { alert('请填写标题'); return }
  if (!form.value.date) { alert('请选择日期'); return }
  saving.value = true
  try {
    if (editing.value) {
      await request.patch(`/teaching-calendar/${editing.value.id}`, form.value)
    } else {
      const res = await request.post('/teaching-calendar', form.value)
      if (res?.id) items.value.unshift(res)
    }
    await loadList()
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function del(item: any) {
  if (!await confirm(`确定删除「${item.title}」？`)) return
  try {
    await request.delete(`/teaching-calendar/${item.id}`)
    items.value = items.value.filter(x => x.id !== item.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

const monthLabel = computed(() => `${year.value}年${month.value + 1}月`)
const todayStr = fmtDate(new Date())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Calendar class="w-6 h-6 text-butter-500" /> 教学日历
      </h1>
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-lg hover:bg-cream-100 text-cocoa-500" @click="prevMonth"><ChevronLeft class="w-4 h-4" /></button>
        <span class="text-sm font-medium text-cocoa-700 min-w-[6rem] text-center">{{ monthLabel }}</span>
        <button class="p-2 rounded-lg hover:bg-cream-100 text-cocoa-500" @click="nextMonth"><ChevronRight class="w-4 h-4" /></button>
        <button class="px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 text-sm hover:bg-cream-200" @click="today">今天</button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate()">
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <!-- 日历网格 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer">
      <div class="grid grid-cols-7 gap-1 mb-1">
        <div v-for="(w, i) in ['日','一','二','三','四','五','六']" :key="w"
          :class="['text-center text-xs py-2 font-medium', (i === 0 || i === 6) ? 'text-sakura-400' : 'text-cocoa-500']">{{ w }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="d in calendarDays"
          :key="d.date"
          :class="[
            'min-h-[5rem] rounded-lg border p-1.5 cursor-pointer transition-colors',
            d.inMonth
              ? (d.isWeekend
                ? 'border-sakura-200 bg-sakura-50/40 hover:border-sakura-300'
                : 'border-mint-200 bg-mint-50/30 hover:border-mint-300')
              : 'border-cream-100 bg-cream-50/50 text-cocoa-300',
            d.date === todayStr ? 'ring-2 ring-butter-400' : '',
          ]"
          @click="openCreate(d.date)"
        >
          <div class="text-xs font-medium" :class="[
            d.date === todayStr ? 'text-butter-600'
              : d.inMonth && d.isWeekend ? 'text-sakura-500'
              : d.inMonth ? 'text-mint-600' : 'text-cocoa-300'
          ]">{{ d.day }}</div>
          <div class="mt-1 space-y-0.5">
            <div
              v-for="item in itemsOnDate(d.date)"
              :key="item.id"
              class="text-xs px-1.5 py-0.5 rounded truncate"
              :style="{ background: item.color || '#e8f1fb', color: '#444' }"
              @click.stop="openEdit(item)"
            >
              {{ item.title }}
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-4 mt-3 text-xs text-cocoa-400">
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded border border-mint-200 bg-mint-50/30"></span>工作日</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded border border-sakura-200 bg-sakura-50/40"></span>周末</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded ring-2 ring-butter-400"></span>今天</span>
      </div>
    </div>
  </div>

  <Modal v-model="showForm" :title="editing ? '编辑计划' : '新增计划'" width="max-w-lg">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">标题<span class="text-red-500">*</span></label>
        <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">日期<span class="text-red-500">*</span></label>
          <input v-model="form.date" type="date" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">类型</label>
          <select v-model="form.type" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" @change="onTypeChange">
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">年级</label>
          <input v-model="form.grade" placeholder="如：三年级" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">科目</label>
          <input v-model="form.subject" placeholder="如：语文" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">备注</label>
        <textarea v-model="form.note" rows="2" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
      </div>
    </div>
    <template #footer>
      <button v-if="editing" class="mr-auto px-3 py-2 rounded-xl text-red-500 hover:bg-red-50" @click="del(editing); showForm = false"><Trash2 class="w-4 h-4" /></button>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
    </template>
  </Modal>
</template>
