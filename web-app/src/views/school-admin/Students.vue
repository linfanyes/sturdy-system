<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listSchoolStudents, updateStudent, exportStudentsCsv, exportStudentsXls,
  listClasses,
  type StudentItem, type ClassItem,
} from '@/api/school-admin'
import { isValidPhone, PHONE_HINT } from '@/utils/validators'
import Modal from '@/components/Modal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { Search, Download, Edit3, Phone, Users, Upload, Printer } from 'lucide-vue-next'

/* ============ 列表 ============ */
const loading = ref(false)
const students = ref<StudentItem[]>([])
const keyword = ref('')
const classFilter = ref('')

const filtered = computed(() => {
  let list = students.value
  if (classFilter.value) {
    list = list.filter(s => s.classId === classFilter.value)
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s =>
      s.name?.toLowerCase().includes(kw) ||
      s.studentNo?.includes(kw) ||
      s.parentName?.includes(kw) ||
      s.parentPhone?.includes(kw),
    )
  }
  return list
})

async function loadStudents() {
  loading.value = true
  try {
    const res = await listSchoolStudents()
    students.value = res.items
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadStudents)

/* ============ 班级筛选项 ============ */
const classes = ref<ClassItem[]>([])
async function loadClasses() {
  try {
    const res = await listClasses(0, 500)
    classes.value = res.items
  } catch {}
}
onMounted(loadClasses)

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

/* ============ 编辑 ============ */
const showForm = ref(false)
const editing = ref<StudentItem | null>(null)
const formLoading = ref(false)
const form = ref({ name: '', gender: '', parentName: '', parentPhone: '' })

function openEdit(s: StudentItem) {
  editing.value = s
  form.value = {
    name: s.name,
    gender: s.gender || '',
    parentName: s.parentName || '',
    parentPhone: s.parentPhone || '',
  }
  showForm.value = true
}

const phoneError = computed(() =>
  form.value.parentPhone && !isValidPhone(form.value.parentPhone) ? PHONE_HINT : '',
)

async function submitForm() {
  if (!editing.value) return
  if (form.value.parentPhone && !isValidPhone(form.value.parentPhone)) {
    alert(PHONE_HINT)
    return
  }
  formLoading.value = true
  try {
    await updateStudent(editing.value.id, {
      name: form.value.name,
      gender: form.value.gender,
      parentName: form.value.parentName,
      parentPhone: form.value.parentPhone,
    })
    // 本地同步
    Object.assign(editing.value, {
      name: form.value.name,
      gender: form.value.gender,
      parentName: form.value.parentName,
      parentPhone: form.value.parentPhone,
    })
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 导出 ============ */
const exporting = ref(false)
async function handleExport() {
  exporting.value = true
  try {
    await exportStudentsCsv()
  } catch (e: any) {
    alert(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

const exportingXls = ref(false)
async function handleExportXls() {
  exportingXls.value = true
  try {
    await exportStudentsXls()
  } catch (e: any) {
    alert(e?.message || '导出失败')
  } finally {
    exportingXls.value = false
  }
}

/* ============ 批量导入 ============ */
const showImport = ref(false)

/* ============ 打印 ============ */
function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 no-print">
      <h1 class="text-2xl font-bold text-cocoa-900">学生管理</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="classFilter"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索姓名/学号/家长"
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm w-56 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 transition-colors disabled:opacity-60"
          :disabled="exporting"
          @click="handleExport"
        >
          <Download class="w-4 h-4" /> {{ exporting ? '导出中…' : 'CSV' }}
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 transition-colors disabled:opacity-60"
          :disabled="exportingXls"
          @click="handleExportXls"
        >
          <Download class="w-4 h-4" /> {{ exportingXls ? '导出中…' : 'XLS' }}
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
      </div>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-2xl shadow-softer overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">姓名</th>
            <th class="px-4 py-3 font-medium">学号</th>
            <th class="px-4 py-3 font-medium">性别</th>
            <th class="px-4 py-3 font-medium">班级</th>
            <th class="px-4 py-3 font-medium">家长</th>
            <th class="px-4 py-3 font-medium">家长电话</th>
            <th class="px-4 py-3 font-medium">家长登录</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="8" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td colspan="8" class="py-8">暂无学生数据</td>
          </tr>
          <tr v-for="s in filtered" :key="s.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.studentNo || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.gender || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.className || className(s.classId) }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentName || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentPhone || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs px-2 py-0.5 rounded-full', s.parentLoginEnabled ? 'bg-mint-100 text-mint-500' : 'bg-cream-100 text-cocoa-400']">
                {{ s.parentLoginEnabled ? '已开通' : '未开通' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(s)">
                <Edit3 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 底部统计 -->
    <div class="text-sm text-cocoa-500 flex items-center gap-2">
      <Users class="w-4 h-4" />
      共 {{ filtered.length }} 名学生（全校 {{ students.length }} 名）
    </div>
  </div>

  <!-- 编辑模态框 -->
  <Modal v-model="showForm" title="编辑学生">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        学生：{{ editing?.name }}（{{ editing?.studentNo }}）· {{ editing?.className || className(editing?.classId || '') }}
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">姓名</label>
          <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">性别</label>
          <select v-model="form.gender" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">未设置</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">家长姓名</label>
        <input v-model="form.parentName" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如：张三爸爸" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">家长电话</label>
        <input
          v-model="form.parentPhone"
          class="w-full mt-1 px-3 py-2 rounded-xl border focus:outline-none"
          :class="phoneError ? 'border-red-400' : 'border-cream-200 focus:border-butter-400'"
          placeholder="家长手机号"
        />
        <p v-if="phoneError" class="text-xs text-red-500 mt-1">{{ phoneError }}</p>
      </div>
      <div class="text-xs text-cocoa-400 flex items-center gap-1">
        <Phone class="w-3 h-3" />
        家长登录开通/关闭由班主任在小程序端操作
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !form.name"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 批量导入 -->
  <BatchImportDialog v-model="showImport" type="student" :classes="classes" @imported="loadStudents" />
</template>
