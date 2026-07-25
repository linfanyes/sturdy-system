<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listClasses, createClass, updateClass, deleteClass,
  listTeachers, exportClassesXls,
  type ClassItem, type TeacherItem,
} from '@/api/school-admin'
import Modal from '@/components/Modal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { Plus, Search, Trash2, Edit3, Upload, Printer, Download } from 'lucide-vue-next'

/* ============ 列表 ============ */
const loading = ref(false)
const classes = ref<ClassItem[]>([])
const total = ref(0)
const keyword = ref('')

const filtered = computed(() => {
  if (!keyword.value) return classes.value
  const kw = keyword.value.toLowerCase()
  return classes.value.filter(c =>
    c.name?.toLowerCase().includes(kw) ||
    c.grade?.toLowerCase().includes(kw) ||
    c.headTeacher?.toLowerCase().includes(kw) ||
    c.term?.toLowerCase().includes(kw),
  )
})

async function loadClasses() {
  loading.value = true
  try {
    const res = await listClasses(0, 500)
    classes.value = res.items
    total.value = res.total
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadClasses)

/* ============ 教师选项 ============ */
const teachers = ref<TeacherItem[]>([])
async function loadTeachers() {
  try {
    const res = await listTeachers(0, 500)
    teachers.value = res.items
  } catch {}
}
onMounted(loadTeachers)

function teacherName(id: string) {
  return teachers.value.find(t => t.id === id)?.name || id
}

/* ============ 学科选项 ============ */
const SUBJECT_OPTIONS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

/* ============ 学期生成 ============ */
function genTermOptions() {
  const year = new Date().getFullYear()
  const opts: string[] = []
  for (let y = year - 2; y <= year + 1; y++) {
    opts.push(`${y}春季`)
    opts.push(`${y}秋季`)
  }
  return opts
}
const TERM_OPTIONS = genTermOptions()
const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

/* ============ 新增/编辑 ============ */
const showForm = ref(false)
const editingId = ref<string | null>(null)
const formLoading = ref(false)
const form = ref({
  name: '',
  grade: '',
  classNo: '1',
  term: '',
  headTeacherId: '',
  subjects: [] as string[],
  // 科任老师 [{ teacherId, subjects }]
  subjectTeachers: [] as { teacherId: string; subjects: string[] }[],
})

function defaultTerm() {
  const now = new Date()
  const year = now.getFullYear()
  const season = now.getMonth() >= 7 ? '秋季' : '春季' // 8月及之后算秋季
  return `${year}${season}`
}

function openCreate() {
  editingId.value = null
  form.value = {
    name: '', grade: '', classNo: '1',
    term: defaultTerm(),
    headTeacherId: '',
    subjects: [],
    subjectTeachers: [],
  }
  showForm.value = true
}

function openEdit(c: ClassItem) {
  editingId.value = c.id
  form.value = {
    name: c.name,
    grade: c.grade,
    classNo: c.classNo || '1',
    term: c.term || defaultTerm(),
    headTeacherId: c.teacherId,
    subjects: [...(c.subjects || [])],
    subjectTeachers: [],
  }
  showForm.value = true
}

function addSubjectTeacher() {
  form.value.subjectTeachers.push({ teacherId: '', subjects: [] })
}
function removeSubjectTeacher(idx: number) {
  form.value.subjectTeachers.splice(idx, 1)
}

function toggleSubject(list: string[], subj: string) {
  const i = list.indexOf(subj)
  if (i >= 0) list.splice(i, 1)
  else list.push(subj)
}

async function submitForm() {
  if (!form.value.name || !form.value.grade || !form.value.headTeacherId) {
    alert('班级名称、年级、班主任必填')
    return
  }
  formLoading.value = true
  try {
    if (editingId.value) {
      // 编辑：支持转交班主任 + 基本信息
      await updateClass(editingId.value, {
        name: form.value.name,
        grade: form.value.grade,
        classNo: form.value.classNo,
        term: form.value.term,
        headTeacherId: form.value.headTeacherId,
        headTeacher: teacherName(form.value.headTeacherId),
      })
    } else {
      // 新增：班级 + 班主任任教学科 + 科任老师
      const validST = form.value.subjectTeachers.filter(st => st.teacherId && st.teacherId !== form.value.headTeacherId)
      await createClass({
        name: form.value.name,
        grade: form.value.grade,
        classNo: form.value.classNo,
        headTeacher: teacherName(form.value.headTeacherId),
        headTeacherId: form.value.headTeacherId,
        term: form.value.term,
        subjects: form.value.subjects,
        subjectTeachers: validST.map(st => ({ teacherId: st.teacherId, subjects: st.subjects })),
      })
    }
    showForm.value = false
    await loadClasses()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 删除 ============ */
async function handleDelete(c: ClassItem) {
  if (!confirm(`确定删除班级「${c.name}」？此操作不可恢复。`)) return
  try {
    await deleteClass(c.id)
    await loadClasses()
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 批量导入 ============ */
const showImport = ref(false)

/* ============ 导出 XLS ============ */
const exportingXls = ref(false)
async function handleExportXls() {
  exportingXls.value = true
  try {
    await exportClassesXls()
  } catch (e: any) {
    alert(e?.message || '导出失败')
  } finally {
    exportingXls.value = false
  }
}

/* ============ 打印 ============ */
function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 no-print">
      <h1 class="text-2xl font-bold text-cocoa-900">班级管理</h1>
      <div class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索班级/年级/班主任"
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm w-64 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 transition-colors disabled:opacity-60"
          :disabled="exportingXls"
          @click="handleExportXls"
        >
          <Download class="w-4 h-4" /> {{ exportingXls ? '导出中…' : '导出 XLS' }}
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-200 text-cocoa-700 text-sm font-medium hover:bg-cream-300 transition-colors"
          @click="handlePrint"
        >
          <Printer class="w-4 h-4" /> 打印
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="showImport = true"
        >
          <Upload class="w-4 h-4" /> 批量导入
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新增班级
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-2xl shadow-softer overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">班级名称</th>
            <th class="px-4 py-3 font-medium">年级</th>
            <th class="px-4 py-3 font-medium">学期</th>
            <th class="px-4 py-3 font-medium">班主任</th>
            <th class="px-4 py-3 font-medium">班主任任教学科</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">暂无班级数据</td>
          </tr>
          <tr v-for="c in filtered" :key="c.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ c.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.grade || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.term || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.headTeacher || teacherName(c.teacherId) || '-' }}</td>
            <td class="px-4 py-3">
              <span v-if="!c.subjects || c.subjects.length === 0" class="text-cocoa-400 text-xs">未设置</span>
              <div v-else class="flex flex-wrap gap-1">
                <span
                  v-for="s in c.subjects"
                  :key="s"
                  class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-600"
                >{{ s }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-right space-x-1">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(c)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(c)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editingId ? '编辑班级' : '新增班级'" width="max-w-2xl">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">班级名称 *</label>
          <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如：一年级1班" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">年级 *</label>
          <select v-model="form.grade" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">班级序号</label>
          <input v-model="form.classNo" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如：1" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学期</label>
          <select v-model="form.term" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">不限学期</option>
            <option v-for="t in TERM_OPTIONS" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">班主任 *</label>
        <select v-model="form.headTeacherId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
          <option value="">请选择班主任</option>
          <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}（{{ t.username }}）</option>
        </select>
        <div v-if="editingId" class="text-xs text-butter-600 mt-1">提示：更换班主任将自动转交，原班主任降级为本班科任老师</div>
      </div>

      <!-- 班主任任教学科 -->
      <div v-if="!editingId">
        <label class="text-sm text-cocoa-500">班主任任教学科（支持兼任本班多科）</label>
        <div class="flex flex-wrap gap-1.5 mt-1">
          <button
            v-for="s in SUBJECT_OPTIONS"
            :key="s"
            type="button"
            :class="[
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              form.subjects.includes(s)
                ? 'border-butter-400 bg-butter-100 text-butter-600'
                : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
            ]"
            @click="toggleSubject(form.subjects, s)"
          >{{ s }}</button>
        </div>
      </div>

      <!-- 科任老师（仅新增时） -->
      <div v-if="!editingId">
        <div class="flex items-center justify-between">
          <label class="text-sm text-cocoa-500">科任老师（可选，一次性加入）</label>
          <button type="button" class="text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/40" @click="addSubjectTeacher">+ 添加</button>
        </div>
        <div v-if="form.subjectTeachers.length === 0" class="text-xs text-cocoa-400 mt-1">暂未添加，可后续由班主任在班级内管理</div>
        <div v-for="(st, idx) in form.subjectTeachers" :key="idx" class="flex items-start gap-2 mt-2 p-2 rounded-xl bg-cream-50">
          <select v-model="st.teacherId" class="flex-1 px-2 py-1.5 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
            <option value="">选择老师</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}（{{ t.username }}）</option>
          </select>
          <div class="flex flex-wrap gap-1 max-w-xs">
            <button
              v-for="s in SUBJECT_OPTIONS.slice(0, 8)"
              :key="s"
              type="button"
              :class="[
                'text-xs px-2 py-0.5 rounded-full border',
                st.subjects.includes(s)
                  ? 'border-mint-400 bg-mint-100 text-mint-500'
                  : 'border-cream-200 text-cocoa-400 hover:bg-cream-100',
              ]"
              @click="toggleSubject(st.subjects, s)"
            >{{ s }}</button>
          </div>
          <button type="button" class="p-1 rounded-lg hover:bg-red-50 text-red-500" @click="removeSubjectTeacher(idx)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !form.name || !form.grade || !form.headTeacherId"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 批量导入 -->
  <BatchImportDialog v-model="showImport" type="class" @imported="loadClasses" />
</template>
