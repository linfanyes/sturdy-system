<script setup lang="ts">
/**
 * 教师端学生管理
 * 班主任和科任老师均可管理学生：单个录入、编辑、删除、家长登录开关。
 * 数据来自后端 /students（按 teacherId 隔离，支持 classId 过滤）。
 */
import { ref, onMounted, computed } from 'vue'
import { loadClasses, useClasses, type MyClass } from '@/composables/useClasses'
import {
  listAllStudents, createStudent, updateStudent, deleteStudent,
  toggleStudentParentLogin, resetStudentParentPassword,
  listStudentParentBindings, unbindStudentParent, setPrimaryStudentParent,
  type TeacherStudent, type StudentParentBinding,
} from '@/api/teacher'
import { isValidPhone, PHONE_HINT } from '@/utils/validators'
import Modal from '@/components/Modal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { Plus, Search, Edit3, Trash2, Users, Phone, KeyRound, Download, Upload, FileDown, MessageCircle, Star } from 'lucide-vue-next'

const { classes } = useClasses()
const loading = ref(false)
const students = ref<TeacherStudent[]>([])
const classFilter = ref('')
const keyword = ref('')

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
    const res = await listAllStudents({ take: 500 })
    students.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  await loadStudents()
})

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

/* ============ 新增/编辑学生 ============ */
const showForm = ref(false)
const editing = ref<TeacherStudent | null>(null)
const formLoading = ref(false)
const form = ref({
  name: '', gender: '', studentNo: '',
  parentName: '', parentPhone: '',
  studentPhone: '', address: '',
  classId: '',
})

function openCreate() {
  editing.value = null
  form.value = {
    name: '', gender: '', studentNo: '',
    parentName: '', parentPhone: '',
    studentPhone: '', address: '',
    classId: classFilter.value || (classes.value[0]?.id || ''),
  }
  showForm.value = true
}

function openEdit(s: TeacherStudent) {
  editing.value = s
  form.value = {
    name: s.name,
    gender: s.gender || '',
    studentNo: s.studentNo || '',
    parentName: s.parentName || '',
    parentPhone: s.parentPhone || '',
    studentPhone: s.studentPhone || '',
    address: s.address || '',
    classId: s.classId,
  }
  showForm.value = true
}

const phoneError = computed(() =>
  form.value.parentPhone && !isValidPhone(form.value.parentPhone) ? PHONE_HINT : '',
)

async function submitForm() {
  if (!form.value.name) { alert('请填写姓名'); return }
  if (!form.value.classId) { alert('请选择班级'); return }
  if (form.value.parentPhone && !isValidPhone(form.value.parentPhone)) {
    alert(PHONE_HINT)
    return
  }
  formLoading.value = true
  try {
    const payload = {
      name: form.value.name,
      gender: form.value.gender,
      studentNo: form.value.studentNo,
      parentName: form.value.parentName,
      parentPhone: form.value.parentPhone,
      studentPhone: form.value.studentPhone,
      address: form.value.address,
      classId: form.value.classId,
    }
    if (editing.value) {
      const updated = await updateStudent(editing.value.id, payload)
      const idx = students.value.findIndex(s => s.id === editing.value!.id)
      if (idx >= 0) students.value[idx] = { ...students.value[idx], ...updated }
    } else {
      const created = await createStudent(payload)
      students.value.unshift(created)
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 批量导入 ============ */
const showImport = ref(false)

/* ============ 删除 ============ */
async function handleDelete(s: TeacherStudent) {
  if (!confirm(`确定删除学生「${s.name}」？此操作会同时清理该学生的相关数据，不可恢复。`)) return
  try {
    await deleteStudent(s.id)
    students.value = students.value.filter(x => x.id !== s.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 家长登录 ============ */
async function handleToggleParentLogin(s: TeacherStudent) {
  try {
    const res = await toggleStudentParentLogin(s.id)
    s.parentLoginEnabled = res.parentLoginEnabled
    if (res.parentLoginEnabled && res.initialPassword) {
      alert(`已开通家长登录，默认口令：${res.initialPassword}\n请通知家长登录后尽快修改。`)
    }
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

async function handleResetParentPwd(s: TeacherStudent) {
  if (!confirm(`确定将「${s.name}」的家长登录口令重置为默认密码？`)) return
  try {
    const res = await resetStudentParentPassword(s.id)
    alert(`已重置为默认密码：${res.defaultPassword}`)
  } catch (e: any) {
    alert(e?.message || '重置失败')
  }
}

/* ============ 家长微信绑定列表 ============ */
const showBindings = ref(false)
const bindingsLoading = ref(false)
const bindingsStudent = ref<TeacherStudent | null>(null)
const bindings = ref<StudentParentBinding[]>([])

async function openBindings(s: TeacherStudent) {
  bindingsStudent.value = s
  showBindings.value = true
  bindingsLoading.value = true
  bindings.value = []
  try {
    const res = await listStudentParentBindings(s.id)
    bindings.value = Array.isArray(res) ? res : []
  } catch (e: any) {
    alert(e?.message || '加载绑定列表失败')
  } finally {
    bindingsLoading.value = false
  }
}

async function handleUnbind(b: StudentParentBinding) {
  if (!bindingsStudent.value) return
  if (!confirm(`确定解绑「${b.nickName || '微信用户'}」？解绑后该微信将无法登录查看孩子情况。`)) return
  try {
    await unbindStudentParent(bindingsStudent.value.id, b.id)
    bindings.value = bindings.value.filter(x => x.id !== b.id)
  } catch (e: any) {
    alert(e?.message || '解绑失败')
  }
}

async function handleSetPrimary(b: StudentParentBinding) {
  if (!bindingsStudent.value || b.isPrimary) return
  if (!confirm(`确定将「${b.nickName || '微信用户'}」设为主家长？`)) return
  try {
    await setPrimaryStudentParent(bindingsStudent.value.id, b.id)
    bindings.value = bindings.value.map(x => ({ ...x, isPrimary: x.id === b.id }))
  } catch (e: any) {
    alert(e?.message || '设置失败')
  }
}

/* ============ 导出 CSV ============ */
function exportCsv() {
  const rows = filtered.value
  if (!rows.length) { alert('暂无数据可导出'); return }
  const header = ['姓名', '学号', '性别', '班级', '家长', '家长电话']
  const lines = [header.join(',')]
  for (const s of rows) {
    lines.push([s.name, s.studentNo, s.gender, className(s.classId), s.parentName, s.parentPhone].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `学生名单_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ============ 下载导入模板 ============ */
function downloadTemplate() {
  // 模板列序与 BatchImportDialog/student 一致：姓名,性别,学号,家长姓名,家长电话
  const header = ['姓名', '性别', '学号', '家长姓名', '家长电话']
  const lines = [header.join(',')]
  // 预填当前班级学生（若已选班级且有学生），便于在原数据上追加/修改后重新导入
  const preset = classFilter.value
    ? students.value.filter(s => s.classId === classFilter.value)
    : []
  for (const s of preset) {
    lines.push([s.name, s.gender, s.studentNo, s.parentName, s.parentPhone]
      .map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const clsName = classFilter.value ? className(classFilter.value) : '全部'
  a.download = `学生导入模板_${clsName}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">学生管理</h1>
      <div class="flex items-center gap-2 flex-wrap">
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
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm w-48 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 transition-colors"
          @click="exportCsv"
        >
          <Download class="w-4 h-4" /> 导出
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cream-200 text-cocoa-500 text-sm font-medium hover:bg-cream-50 transition-colors"
          @click="downloadTemplate"
        >
          <FileDown class="w-4 h-4" /> 下载模板
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-200 text-cocoa-700 text-sm font-medium hover:bg-cream-300 transition-colors"
          @click="showImport = true"
        >
          <Upload class="w-4 h-4" /> 批量导入
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新增学生
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
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
            <td class="px-4 py-3 text-cocoa-700">{{ className(s.classId) }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentName || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentPhone || '-' }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-1 items-start">
                <span :class="['text-xs px-2 py-0.5 rounded-full', s.parentLoginEnabled ? 'bg-mint-100 text-mint-500' : 'bg-cream-100 text-cocoa-400']">
                  {{ s.parentLoginEnabled ? '已开通' : '未开通' }}
                </span>
                <template v-if="s.parentLoginEnabled">
                  <button class="text-xs text-cocoa-500 hover:text-rose-500 underline" @click="handleResetParentPwd(s)">重置密码</button>
                </template>
                <button
                  class="text-xs underline"
                  :class="s.parentLoginEnabled ? 'text-cocoa-400 hover:text-rose-500' : 'text-mint-500 hover:text-mint-600'"
                  @click="handleToggleParentLogin(s)"
                >{{ s.parentLoginEnabled ? '关闭' : '开通' }}</button>
              </div>
            </td>
            <td class="px-4 py-3 text-right space-x-1">
              <button class="p-1.5 rounded-lg hover:bg-mint-50 text-mint-500" title="家长微信绑定" @click="openBindings(s)">
                <MessageCircle class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(s)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(s)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 底部统计 -->
    <div class="text-sm text-cocoa-500 flex items-center gap-2">
      <Users class="w-4 h-4" />
      共 {{ filtered.length }} 名学生（总计 {{ students.length }} 名）
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editing ? '编辑学生' : '新增学生'">
    <div class="space-y-3">
      <div v-if="editing" class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        学生：{{ editing?.name }}（{{ editing?.studentNo }}）· {{ className(editing?.classId || '') }}
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">姓名 *</label>
          <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="请输入姓名" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学号</label>
          <input v-model="form.studentNo" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="选填" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">性别</label>
          <select v-model="form.gender" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">未设置</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">班级 *</label>
          <select v-model="form.classId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
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
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">学生电话</label>
          <input v-model="form.studentPhone" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="选填，学生本人手机号" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">地址</label>
          <input v-model="form.address" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="选填，家庭住址" />
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !form.name || !form.classId"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 批量导入：复用通用组件，导入完成后刷新列表 -->
  <BatchImportDialog v-model="showImport" type="student" :classes="classes" @imported="loadStudents" />

  <!-- 家长微信绑定列表 -->
  <Modal v-model="showBindings" :title="`家长微信绑定 · ${bindingsStudent?.name || ''}`">
    <div v-if="bindingsLoading" class="py-8 text-center text-cocoa-400">加载中…</div>
    <div v-else-if="!bindings.length" class="py-8 text-center text-cocoa-400">
      该学生暂无家长微信绑定。
      <div class="mt-2 text-xs text-cocoa-500">家长可在小程序「家长端」中绑定微信，或由校管理员开通家长登录后用学号登录。</div>
    </div>
    <div v-else class="space-y-2">
      <div v-for="b in bindings" :key="b.id" class="flex items-center gap-3 p-3 rounded-xl border border-cream-200 bg-cream-50">
        <div class="w-10 h-10 rounded-full bg-mint-100 flex items-center justify-center text-mint-600 text-sm font-semibold shrink-0">
          {{ b.nickName ? b.nickName.charAt(0) : '微' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5 flex-wrap">
            {{ b.nickName || '微信用户' }}
            <span v-if="b.relation" class="text-[10px] px-1.5 py-0.5 rounded-full bg-sky2-50 text-sky2-600">{{ b.relation }}</span>
            <span v-if="b.isPrimary" class="text-[10px] px-1.5 py-0.5 rounded-full bg-butter-100 text-butter-700">主家长</span>
          </div>
          <div class="text-xs text-cocoa-400 mt-0.5">openid 尾号：{{ b.openIdTail || '--' }}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="!b.isPrimary"
            class="p-1.5 rounded-lg hover:bg-butter-50 text-butter-500"
            title="设为主家长"
            @click="handleSetPrimary(b)"
          >
            <Star class="w-4 h-4" />
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
            title="解绑"
            @click="handleUnbind(b)"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="text-xs text-cocoa-400 pt-2 leading-relaxed">一个学生可绑定多个微信（如爸爸、妈妈），各家长均可微信登录查看孩子情况。仅当前学生绑定的微信会展示在此列表。</div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="showBindings = false">关闭</button>
    </template>
  </Modal>
</template>
