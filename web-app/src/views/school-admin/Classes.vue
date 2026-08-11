<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import {
  listClasses, createClass, updateClass, deleteClass,
  listTeachers, exportClassesXls,
  type ClassItem, type TeacherItem,
} from '@/api/school-admin'
import Modal from '@/components/Modal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { SUBJECT_OPTIONS } from '@/constants/subjects'
import { generateClassName } from '@gardener/shared/validators'
import { getCurrentSemester } from '@gardener/shared/utils/date'
import { Plus, Search, Trash2, Edit3, Upload, Printer, Download, Users, Eye } from 'lucide-vue-next'

const router = useRouter()

/* ============ 列表 ============ */
const loading = ref(false)
const classes = ref<ClassItem[]>([])
const total = ref(0)
const keyword = ref('')
const page = ref(0)
const pageSize = ref(20)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

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
    const skip = page.value * pageSize.value
    const res = await listClasses(skip, pageSize.value)
    classes.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function goPage(p: number) { page.value = p; loadClasses() }
watch(page, () => loadClasses())
watch(pageSize, () => { page.value = 0; loadClasses() })

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

/* ============ 学科选项（来自共享常量 @/constants/subjects） ============ */

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
  grade: '',
  classNo: '1',
  term: '',
  headTeacherId: '',
  subjects: [] as string[],
  // 科任老师（按科目）：科目 -> 教师 ID
  subjectTeacherMap: {} as Record<string, string>,
})

/** 班级名称由「年级 + 班级序号 + 班」自动拼接，例如 五年级 + 1 → 五年级1班（不可手动编辑）；宽松模式非法输入返回空 */
const className = computed(() => {
  const g = form.value.grade
  const n = (form.value.classNo || '').trim()
  return generateClassName(g, n, { lenient: true })
})

function defaultTerm() {
  // 沿用原有边界：8月及之后算秋季（getMonth() >= 7）
  return getCurrentSemester(new Date(), 7)
}

function openCreate() {
  editingId.value = null
  form.value = {
    grade: '', classNo: '1',
    term: defaultTerm(),
    headTeacherId: '',
    subjects: [],
    subjectTeacherMap: {},
  }
  showForm.value = true
}

function openEdit(c: ClassItem) {
  editingId.value = c.id
  // 兼容历史数据：旧 classNo 可能为「一班」(带「班」尾)，去掉尾部「班」还原为序号
  const rawNo = c.classNo || '1'
  const classNo = /班$/.test(rawNo) ? rawNo.slice(0, -1) : rawNo
  // 兼容科任老师两种存储：Record<subject, teacherId> 或 [{ teacherId, subjects }]
  const map: Record<string, string> = {}
  const stRec = (c as any).subjectTeachers
  if (stRec && !Array.isArray(stRec)) {
    Object.entries(stRec as Record<string, string>).forEach(([k, v]) => { map[k] = v })
  } else if (Array.isArray(stRec)) {
    ;(stRec as Array<{ teacherId: string; subjects?: string[] }>).forEach((st) => {
      ;(st.subjects || []).forEach((s) => { map[s] = st.teacherId })
    })
  }
  form.value = {
    grade: c.grade,
    classNo,
    term: c.term || defaultTerm(),
    headTeacherId: c.teacherId,
    subjects: [...(c.subjects || [])],
    subjectTeacherMap: map,
  }
  showForm.value = true
}

/** 科任老师按科目下拉：切换某科目任教老师 */
function setSubjectTeacher(subj: string, tid: string) {
  if (tid) form.value.subjectTeacherMap[subj] = tid
  else delete form.value.subjectTeacherMap[subj]
}

function toggleSubject(list: string[], subj: string) {
  const i = list.indexOf(subj)
  if (i >= 0) list.splice(i, 1)
  else list.push(subj)
}

/** 由「科目->教师」映射生成后端 subjectTeachers 数组（排除与班主任重复、空值） */
function buildSubjectTeachers(): { teacherId: string; subjects: string[] }[] {
  return Object.entries(form.value.subjectTeacherMap)
    .filter(([subj, tid]) => tid && tid !== form.value.headTeacherId)
    .map(([subj, tid]) => ({ teacherId: tid, subjects: [subj] }))
}

async function submitForm() {
  if (!className.value) {
    toast.warning('请选择年级并填写班级序号（班级名称将自动生成为「年级+序号+班」）')
    return
  }
  if (!form.value.headTeacherId) {
    toast.warning('请选择班主任')
    return
  }
  formLoading.value = true
  try {
    if (editingId.value) {
      // 编辑：支持转交班主任 + 基本信息
      await updateClass(editingId.value, {
        name: className.value,
        grade: form.value.grade,
        classNo: form.value.classNo,
        term: form.value.term,
        headTeacherId: form.value.headTeacherId,
        headTeacher: teacherName(form.value.headTeacherId),
        subjects: form.value.subjects,
        subjectTeachers: buildSubjectTeachers(),
      })
    } else {
      // 新增：班级 + 班主任任教学科 + 科任老师
      await createClass({
        name: className.value,
        grade: form.value.grade,
        classNo: form.value.classNo,
        headTeacher: teacherName(form.value.headTeacherId),
        headTeacherId: form.value.headTeacherId,
        term: form.value.term,
        subjects: form.value.subjects,
        subjectTeachers: buildSubjectTeachers(),
      })
    }
    showForm.value = false
    await loadClasses()
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 删除 ============ */
async function handleDelete(c: ClassItem) {
  if (!await confirm(`确定删除班级「${c.name}」？此操作不可恢复。`)) return
  try {
    await deleteClass(c.id)
    await loadClasses()
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
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
    toast.error(e?.message || '导出失败')
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
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm w-64 focus:outline-none focus:border-butter-400"
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
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">班级名称</th>
            <th class="px-4 py-3 font-medium">年级</th>
            <th class="px-4 py-3 font-medium">学期</th>
            <th class="px-4 py-3 font-medium">班主任</th>
            <th class="px-4 py-3 font-medium">学生人数</th>
            <th class="px-4 py-3 font-medium">班主任任教学科</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <template v-if="loading">
            <tr v-for="i in 6" :key="'sk'+i">
              <td colspan="7" class="py-3">
                <div class="animate-pulse flex items-center gap-4 px-4">
                  <div class="h-5 bg-cream-100 rounded flex-1"></div>
                  <div class="h-5 bg-cream-100 rounded w-20"></div>
                  <div class="h-5 bg-cream-100 rounded w-16"></div>
                  <div class="h-5 bg-cream-100 rounded w-24"></div>
                  <div class="h-5 bg-cream-100 rounded w-16"></div>
                  <div class="h-5 bg-cream-100 rounded w-28"></div>
                  <div class="h-5 bg-cream-100 rounded w-20"></div>
                </div>
              </td>
            </tr>
          </template>
          <template v-else-if="filtered.length === 0">
            <tr class="text-center text-cocoa-400">
              <td colspan="7" class="py-8">暂无班级数据</td>
            </tr>
          </template>
          <template v-else>
          <tr v-for="c in filtered" :key="c.id" class="hover:bg-cream-50 transition-colors cursor-pointer" @dblclick="router.push('/school-admin/classes/' + c.id)">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ c.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.grade || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.term || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ c.headTeacher || teacherName(c.teacherId) || '-' }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 text-cocoa-700">
                <Users class="w-3.5 h-3.5 text-mint-500" />
                {{ c.studentCount ?? '-' }} 人
              </span>
            </td>
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
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-sky2-500" title="详情" @click="router.push('/school-admin/classes/' + c.id)">
                <Eye class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(c)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(c)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0 && pageSize < total" class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-cream-100">
      <span class="text-xs text-cocoa-400">共 {{ total }} 个班级</span>
      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 rounded-xl border border-cream-200 text-sm disabled:opacity-40" :disabled="page===0" @click="goPage(page-1)">上一页</button>
        <span class="text-xs text-cocoa-500">第 {{ page+1 }}/{{ totalPages }} 页</span>
        <button class="px-3 py-1.5 rounded-xl border border-cream-200 text-sm disabled:opacity-40" :disabled="page+1>=totalPages" @click="goPage(page+1)">下一页</button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-cocoa-400">每页</span>
        <select v-model.number="pageSize" class="px-2 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm">
          <option :value="10">10</option><option :value="20">20</option><option :value="50">50</option>
        </select>
      </div>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editingId ? '编辑班级' : '新增班级'" width="max-w-2xl">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">班级名称（自动生成）</label>
          <div class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-700">
            {{ className || '请选择年级并填写班级序号' }}
          </div>
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

      <!-- 班主任任教学科（新增与编辑均可调整） -->
      <div>
        <label class="text-sm text-cocoa-500">班主任任教学科（支持兼任本班多科）</label>
        <div class="flex flex-wrap gap-1.5 mt-1">
          <button
            v-for="s in SUBJECT_OPTIONS"
            :key="s.value"
            type="button"
            :class="[
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              form.subjects.includes(s.value)
                ? 'border-butter-400 bg-butter-100 text-butter-600'
                : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
            ]"
            @click="toggleSubject(form.subjects, s.value)"
          >{{ s.label }}</button>
        </div>
      </div>

      <!-- 科任老师（按科目下拉）：选定班主任任教学科后，为每科选择任教老师 -->
      <div v-if="form.subjects.length">
        <label class="text-sm text-cocoa-500">科任老师（按科目，下拉选择）</label>
        <div v-for="s in form.subjects" :key="s" class="flex items-center gap-2 mt-2">
          <span class="w-20 text-sm text-cocoa-700 shrink-0">{{ s }}</span>
          <select
            :value="form.subjectTeacherMap[s] || ''"
            class="flex-1 px-2 py-1.5 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-butter-400"
            @change="setSubjectTeacher(s, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">选择科任老师（默认班主任）</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}（{{ t.username }}）</option>
          </select>
        </div>
        <p class="text-xs text-cocoa-400 mt-1">未选择的科目默认由班主任任教；同一老师可任教多科。班主任本人自动排除。</p>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !className || !form.headTeacherId"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 批量导入 -->
  <BatchImportDialog v-model="showImport" type="class" @imported="loadClasses" />
</template>
