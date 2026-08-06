<script setup lang="ts">
/**
 * 轮值表管理：每个班级可有多张轮值表（按周/按月），
 * 每张表包含若干 {date, persons[]} 排班条目。
 */
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, Edit3, Calendar } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listClassStudents, type TeacherStudent } from '@/api/teacher'
import request from '@/api/request'

const { classes } = useClasses()
const loading = ref(false)
const items = ref<any[]>([])
const classId = ref('')
const students = ref<TeacherStudent[]>([])
const showForm = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const form = ref<{ name: string; type: string; assignments: { date: string; persons: string[] }[] }>({
  name: '', type: '周轮值', assignments: [],
})

const typeOptions = ['周轮值', '月轮值', '值日', '其他']

async function loadStudents(cid: string) {
  if (!cid) { students.value = []; return }
  try {
    const res = await listClassStudents(cid)
    students.value = Array.isArray(res) ? res : []
  } catch { students.value = [] }
}

async function loadList() {
  if (!classId.value) { items.value = []; return }
  loading.value = true
  try {
    const res = await request.get('/duty-rosters', { params: { classId: classId.value } })
    items.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
    await Promise.all([loadList(), loadStudents(classId.value)])
  }
})

async function onClassChange() {
  await Promise.all([loadList(), loadStudents(classId.value)])
}

function openCreate() {
  if (!classId.value) { alert('请先选择班级'); return }
  editing.value = null
  form.value = { name: '', type: '周轮值', assignments: [{ date: new Date().toISOString().slice(0, 10), persons: [] }] }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { name: row.name, type: row.type, assignments: JSON.parse(JSON.stringify(row.assignments || [])) }
  showForm.value = true
}

function addAssignment() {
  form.value.assignments.push({ date: new Date().toISOString().slice(0, 10), persons: [] })
}
function removeAssignment(i: number) {
  form.value.assignments.splice(i, 1)
}
function togglePerson(a: any, name: string) {
  const i = a.persons.indexOf(name)
  if (i >= 0) a.persons.splice(i, 1)
  else a.persons.push(name)
}

async function submit() {
  if (!form.value.name) { alert('请填写名称'); return }
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    if (editing.value) {
      await request.patch(`/duty-rosters/${editing.value.id}`, payload)
      await loadList()
    } else {
      const res = await request.post('/duty-rosters', payload)
      if (res?.id) items.value.unshift(res)
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function del(row: any) {
  if (!await confirm(`确定删除「${row.name}」？`)) return
  try {
    await request.delete(`/duty-rosters/${row.id}`)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

const assignmentCount = (row: any) => (row.assignments || []).length
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">轮值表</h1>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="onClassChange">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <div v-if="!classId" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Calendar class="w-10 h-10 mx-auto mb-2 text-cocoa-300" />
      请先选择班级
    </div>
    <div v-else-if="loading" class="text-center text-cocoa-400 py-10">加载中…</div>
    <div v-else-if="!items.length" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      暂无轮值表，点击「新增」创建
    </div>
    <div v-else class="space-y-3">
      <div v-for="row in items" :key="row.id" class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="font-semibold text-cocoa-900">{{ row.name }}</span>
            <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-500">{{ row.type }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-cocoa-400 mr-2">{{ assignmentCount(row) }} 条排班</span>
            <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="openEdit(row)"><Edit3 class="w-4 h-4" /></button>
            <button class="p-1 rounded hover:bg-red-50 text-red-500" @click="del(row)"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <div class="space-y-1.5">
          <div v-for="(a, i) in row.assignments" :key="i" class="flex items-center gap-2 text-sm">
            <span class="text-cocoa-400 w-28">{{ a.date }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="p in a.persons" :key="p" class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-600">{{ p }}</span>
              <span v-if="!a.persons?.length" class="text-xs text-cocoa-300">未安排</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model="showForm" :title="editing ? '编辑轮值表' : '新增轮值表'" width="max-w-3xl">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">名称<span class="text-red-500">*</span></label>
          <input v-model="form.name" placeholder="如：第一周轮值" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">类型</label>
          <select v-model="form.type" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm text-cocoa-500">排班安排</label>
          <button class="text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-600 hover:bg-mint-300/30" @click="addAssignment">+ 添加一条</button>
        </div>
        <div class="space-y-2">
          <div v-for="(a, i) in form.assignments" :key="i" class="border border-cream-200 rounded-xl p-3">
            <div class="flex items-center gap-2 mb-2">
              <input v-model="a.date" type="date" class="px-2 py-1 rounded-lg border border-cream-200 text-sm" />
              <button class="ml-auto p-1 rounded hover:bg-red-50 text-red-500" @click="removeAssignment(i)"><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="s in students"
                :key="s.id"
                type="button"
                :class="['text-xs px-2 py-0.5 rounded-full border', a.persons.includes(s.name) ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
                @click="togglePerson(a, s.name)"
              >{{ s.name }}</button>
              <span v-if="!students.length" class="text-xs text-cocoa-300">该班级暂无学生</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
    </template>
  </Modal>
</template>
