<script setup lang="ts">
/**
 * 班级职务：管理班级职务分配（职务名 + 学生名 + 任期）。
 * 数据走后端 /class-duty-configs 接口，按班级筛选。
 */
import { ref, onMounted, watch } from 'vue'
import { Plus, Trash2, Edit3, Users, Loader2 } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import {
  listClassDutyConfigs,
  createClassDutyConfig,
  updateClassDutyConfig,
  deleteClassDutyConfig,
  listClassStudents,
  type TeacherStudent,
} from '@/api/teacher'

const { classes } = useClasses()
const classId = ref('')
const students = ref<TeacherStudent[]>([])
const items = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const form = ref({ dutyName: '', studentName: '', term: '' })

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
    const res: any = await listClassDutyConfigs(classId.value)
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
    await Promise.all([loadStudents(classId.value), loadList()])
  }
})

watch(classId, async (cid) => {
  await Promise.all([loadStudents(cid), loadList()])
})

function openCreate() {
  if (!classId.value) { alert('请先选择班级'); return }
  editing.value = null
  form.value = { dutyName: '', studentName: '', term: currentTerm() }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { dutyName: row.dutyName || '', studentName: row.studentName || '', term: row.term || '' }
  showForm.value = true
}

function currentTerm() {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 8 ? `${y}-${y + 1}学年第一学期` : `${y - 1}-${y}学年第二学期`
}

async function submit() {
  if (!form.value.dutyName) { alert('请输入职务名'); return }
  if (!form.value.studentName) { alert('请选择学生'); return }
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    if (editing.value) {
      await updateClassDutyConfig(editing.value.id, payload)
      const idx = items.value.findIndex(x => x.id === editing.value.id)
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...payload }
    } else {
      const res = await createClassDutyConfig(payload)
      if (res?.id) items.value.unshift(res)
      else await loadList()
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  if (!confirm(`确定删除「${row.dutyName}」职务？`)) return
  try {
    await deleteClassDutyConfig(row.id)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Users class="w-6 h-6 text-butter-500" /> 班级职务
      </h1>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 新增职务
        </button>
      </div>
    </div>

    <div v-if="!classId" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">请先选择班级</div>
    <div v-else-if="loading" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Loader2 class="w-6 h-6 mx-auto mb-2 animate-spin" /> 加载中…
    </div>
    <div v-else-if="!items.length" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      暂无职务，点击「新增职务」创建
    </div>
    <div v-else class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium w-40">职务名</th>
            <th class="px-4 py-3 font-medium">学生</th>
            <th class="px-4 py-3 font-medium">任期</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="row in items" :key="row.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 text-cocoa-900 font-medium">{{ row.dutyName }}</td>
            <td class="px-4 py-3 text-cocoa-700">
              <span class="inline-block px-2 py-0.5 rounded-full bg-mint-100 text-mint-500">{{ row.studentName }}</span>
            </td>
            <td class="px-4 py-3 text-cocoa-500">{{ row.term || '—' }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(row)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1" title="删除" @click="remove(row)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-model="showForm" :title="editing ? '编辑职务' : '新增职务'" width="max-w-lg">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">职务名<span class="text-red-500">*</span></label>
        <input v-model="form.dutyName" placeholder="如：班长、学习委员、组长" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">学生<span class="text-red-500">*</span></label>
        <select v-model="form.studentName" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
          <option value="">请选择</option>
          <option v-for="s in students" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
        <div v-if="!students.length" class="text-xs text-cocoa-300 mt-1">该班级暂无学生</div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">任期</label>
        <input v-model="form.term" placeholder="如：2024-2025学年第一学期" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="submit">
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>
