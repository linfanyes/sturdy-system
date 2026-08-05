<script setup lang="ts">
/**
 * 错题本：按班级/学生记录数学错题，支持新增与删除。
 * 数据走后端 /math-mistakes 接口。
 */
import { ref, onMounted, watch } from 'vue'
import { Plus, Trash2, BookX, Loader2 } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listClassStudents, listMathMistakes, createMathMistake, deleteMathMistake, type TeacherStudent } from '@/api/teacher'

const { classes } = useClasses()
const classId = ref('')
const students = ref<TeacherStudent[]>([])
const studentName = ref('')
const items = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const form = ref({ studentName: '', question: '', wrongAnswer: '', correctAnswer: '', knowledgePoint: '' })

async function loadStudents(cid: string) {
  if (!cid) { students.value = []; return }
  try {
    const res = await listClassStudents(cid)
    students.value = Array.isArray(res) ? res : []
  } catch { students.value = [] }
}

async function loadList() {
  loading.value = true
  try {
    const res: any = await listMathMistakes(classId.value || undefined)
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
  studentName.value = ''
  await Promise.all([loadStudents(cid), loadList()])
})

function openCreate() {
  form.value = { studentName: studentName.value, question: '', wrongAnswer: '', correctAnswer: '', knowledgePoint: '' }
  showForm.value = true
}

async function submit() {
  if (!form.value.studentName) { alert('请选择学生'); return }
  if (!form.value.question) { alert('请输入题目'); return }
  saving.value = true
  try {
    const payload = { ...form.value, classId: classId.value }
    const res = await createMathMistake(payload)
    if (res?.id) items.value.unshift(res)
    else await loadList()
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  if (!await confirm('确定删除该错题？')) return
  try {
    await deleteMathMistake(row.id)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

const filtered = () => {
  if (!studentName.value) return items.value
  return items.value.filter(x => x.studentName === studentName.value)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BookX class="w-6 h-6 text-butter-500" /> 错题本
      </h1>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="studentName" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400">
          <option value="">全部学生</option>
          <option v-for="s in students" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 添加错题
        </button>
      </div>
    </div>

    <div v-if="loading" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Loader2 class="w-6 h-6 mx-auto mb-2 animate-spin" /> 加载中…
    </div>
    <div v-else-if="!filtered().length" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      暂无错题记录，点击「添加错题」创建
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="row in filtered()" :key="row.id" class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-cocoa-900">{{ row.studentName }}</span>
            <span v-if="row.knowledgePoint" class="text-xs px-2 py-0.5 rounded-full bg-sakura-100 text-sakura-500">{{ row.knowledgePoint }}</span>
          </div>
          <button class="p-1 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="remove(row)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <div class="text-cocoa-700 mb-2">{{ row.question }}</div>
        <div class="flex gap-4 text-sm">
          <div>错答：<span class="text-red-500 font-mono">{{ row.wrongAnswer || '—' }}</span></div>
          <div>正答：<span class="text-mint-500 font-mono">{{ row.correctAnswer || '—' }}</span></div>
        </div>
        <div v-if="row.createdAt" class="text-xs text-cocoa-400 mt-2">{{ new Date(row.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-') }}</div>
      </div>
    </div>
  </div>

  <Modal v-model="showForm" title="添加错题" width="max-w-lg">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">学生<span class="text-red-500">*</span></label>
        <select v-model="form.studentName" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
          <option value="">请选择</option>
          <option v-for="s in students" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">题目<span class="text-red-500">*</span></label>
        <textarea v-model="form.question" rows="3" placeholder="如：25 × 4 = ?" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">错误答案</label>
          <input v-model="form.wrongAnswer" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">正确答案</label>
          <input v-model="form.correctAnswer" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">知识点</label>
        <input v-model="form.knowledgePoint" placeholder="如：两位数乘法" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
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
