<script setup lang="ts">
/**
 * 值日配置：定义班级职务列表（duties）与每个职务的学生分配（assignments）。
 * 每个班级通常一份配置；支持新增/编辑职务、勾选学生。
 */
import { ref, onMounted } from 'vue'
import { Plus, Trash2, Edit3, Settings } from 'lucide-vue-next'
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
const form = ref<{ duties: string[]; assignments: Record<string, string[]> }>({ duties: [], assignments: {} })
const newDuty = ref('')

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
    const res = await request.get('/class-duty-configs', { params: { classId: classId.value } })
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
  form.value = { duties: [], assignments: {} }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { duties: [...(row.duties || [])], assignments: JSON.parse(JSON.stringify(row.assignments || {})) }
  showForm.value = true
}

function addDuty() {
  const d = newDuty.value.trim()
  if (!d) return
  if (form.value.duties.includes(d)) { alert('职务已存在'); return }
  form.value.duties.push(d)
  if (!form.value.assignments[d]) form.value.assignments[d] = []
  newDuty.value = ''
}
function removeDuty(d: string) {
  form.value.duties = form.value.duties.filter(x => x !== d)
  delete form.value.assignments[d]
}
function toggleStudent(duty: string, name: string) {
  if (!form.value.assignments[duty]) form.value.assignments[duty] = []
  const i = form.value.assignments[duty].indexOf(name)
  if (i >= 0) form.value.assignments[duty].splice(i, 1)
  else form.value.assignments[duty].push(name)
}

async function submit() {
  if (!form.value.duties.length) { alert('请至少添加一个职务'); return }
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    if (editing.value) {
      await request.patch(`/class-duty-configs/${editing.value.id}`, payload)
    } else {
      const res = await request.post('/class-duty-configs', payload)
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

async function del(row: any) {
  if (!confirm('确定删除该值日配置？')) return
  try {
    await request.delete(`/class-duty-configs/${row.id}`)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">值日配置</h1>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400" @change="onClassChange">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <div v-if="!classId" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Settings class="w-10 h-10 mx-auto mb-2 text-cocoa-300" />
      请先选择班级
    </div>
    <div v-else-if="loading" class="text-center text-cocoa-400 py-10">加载中…</div>
    <div v-else-if="!items.length" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      暂无值日配置，点击「新增」创建
    </div>
    <div v-else class="space-y-3">
      <div v-for="row in items" :key="row.id" class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold text-cocoa-900">{{ row.duties?.length || 0 }} 个职务</div>
          <div class="flex items-center gap-1">
            <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="openEdit(row)"><Edit3 class="w-4 h-4" /></button>
            <button class="p-1 rounded hover:bg-red-50 text-red-500" @click="del(row)"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="d in row.duties" :key="d" class="border border-cream-200 rounded-xl p-2.5">
            <div class="text-sm font-medium text-cocoa-700 mb-1">{{ d }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="p in (row.assignments?.[d] || [])" :key="p" class="text-xs px-1.5 py-0.5 rounded bg-mint-100 text-mint-600">{{ p }}</span>
              <span v-if="!(row.assignments?.[d] || []).length" class="text-xs text-cocoa-300">未分配</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model="showForm" :title="editing ? '编辑值日配置' : '新增值日配置'" width="max-w-3xl">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">职务列表</label>
        <div class="flex items-center gap-2 mt-1">
          <input v-model="newDuty" placeholder="如：值日生、组长、纪律委员" class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" @keyup.enter="addDuty" />
          <button class="px-3 py-2 rounded-xl bg-mint-100 text-mint-600 hover:bg-mint-300/30" @click="addDuty">添加</button>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <span v-for="d in form.duties" :key="d" class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-butter-100 text-butter-600">
            {{ d }}
            <button class="hover:text-red-500" @click="removeDuty(d)"><Trash2 class="w-3 h-3" /></button>
          </span>
          <span v-if="!form.duties.length" class="text-xs text-cocoa-300">暂未添加职务</span>
        </div>
      </div>
      <div v-if="form.duties.length">
        <label class="text-sm text-cocoa-500">学生分配</label>
        <div class="space-y-2 mt-1">
          <div v-for="d in form.duties" :key="d" class="border border-cream-200 rounded-xl p-2.5">
            <div class="text-sm font-medium text-cocoa-700 mb-1.5">{{ d }}</div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="s in students"
                :key="s.id"
                type="button"
                :class="['text-xs px-2 py-0.5 rounded-full border', (form.assignments[d] || []).includes(s.name) ? 'border-butter-400 bg-butter-100 text-butter-600' : 'border-cream-200 text-cocoa-500 hover:bg-cream-50']"
                @click="toggleStudent(d, s.name)"
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
