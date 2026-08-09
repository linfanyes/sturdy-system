<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { toast } from '@/utils/feedback'
import {
  listSchoolStudents, updateStudent, deleteStudent, exportStudentsCsv, exportStudentsXls,
  listClasses, toggleParentLogin as apiToggleParentLogin, resetParentPassword,
  type StudentItem, type ClassItem,
} from '@/api/school-admin'
import { isValidPhone, PHONE_HINT } from '@/utils/validators'
import { usePagedList } from '@gardener/shared/composables'
import Modal from '@/components/Modal.vue'
import ResetPasswordModal from '@/components/ResetPasswordModal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { Search, Download, Edit3, Phone, Users, Upload, Printer, Trash2 } from 'lucide-vue-next'

/* ============ 列表（P0-3：usePagedList 后端分页；搜索时拉取 500 条前端过滤） ============ */
const loading = ref(false)

const {
  page,
  pageSize,
  keyword,
  classId,
  allItems,
  loadList,
  prevPage,
  nextPage,
  goPage,
} = usePagedList(async (params: Record<string, any>) => {
  const res = await listSchoolStudents({ skip: params.skip, take: params.take, classId: params.classId })
  return { items: res.items || [], total: res.total || 0 }
})

// vue-tsc 对 composable 返回的 Ref 在模板自动解包支持有限，用 computed 包裹一层 ref 值
const pageNum = computed(() => page.value)
const pageSizeNum = computed(() => pageSize.value)

const filtered = computed(() => {
  let list = allItems.value
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(kw) ||
      (s.studentNo || '').includes(kw) ||
      (s.parentName || '').toLowerCase().includes(kw) ||
      (s.parentPhone || '').includes(kw),
    )
  }
  return list
})

const totalFiltered = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))
const displayedStudents = computed(() => {
  const start = page.value * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

async function loadStudents() {
  loading.value = true
  try {
    await loadList()
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
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

/* ============ 家长登录：开通/关闭 + 重置密码 ============ */
async function toggleParentLogin(s: StudentItem) {
  try {
    const res = await apiToggleParentLogin(s.id)
    s.parentLoginEnabled = res.parentLoginEnabled
    if (res.parentLoginEnabled && res.initialPassword) {
      toast.success(`已开通家长登录，默认口令：${res.initialPassword}（请通知家长登录后尽快修改）`)
    }
  } catch (e: any) {
    toast.error(e?.message || '操作失败')
  }
}

/* ============ 家长登录：重置密码弹框 ============ */
const showReset = ref(false)
const resetTarget = ref<StudentItem | null>(null)
const resetting = ref(false)

function openReset(s: StudentItem) {
  resetTarget.value = s
  showReset.value = true
}

async function submitReset(password: string) {
  if (!resetTarget.value || resetting.value) return
  resetting.value = true
  try {
    const res: any = await resetParentPassword(resetTarget.value.id, password)
    showReset.value = false
    toast.success('家长登录口令已重置' + (res?.defaultPassword ? `，新密码：${res.defaultPassword}` : ''))
  } catch (e: any) {
    toast.error(e?.message || '重置失败')
  } finally {
    resetting.value = false
  }
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
    toast.warning(PHONE_HINT)
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
    toast.error(e?.message || '保存失败')
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
    toast.error(e?.message || '导出失败')
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
    toast.error(e?.message || '导出失败')
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

/* ============ 删除学生 ============ */
async function handleDelete(s: StudentItem) {
  if (!await confirm(`确定删除学生「${s.name}」（${s.studentNo || '无学号'}）？\n该操作将同时清理其家长联系记录，不可恢复。`)) return
  try {
    await deleteStudent(s.id)
    allItems.value = allItems.value.filter(x => x.id !== s.id)
    toast.info('已删除')
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 no-print">
      <h1 class="text-2xl font-bold text-cocoa-900">学生管理</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="classId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索姓名/学号/家长"
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm w-56 focus:outline-none focus:border-butter-400"
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
          <tr v-else-if="totalFiltered === 0" class="text-center text-cocoa-400">
            <td colspan="8" class="py-8">暂无学生数据</td>
          </tr>
          <tr v-for="s in displayedStudents" :key="s.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.studentNo || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.gender || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.className || className(s.classId) }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentName || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.parentPhone || '-' }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-1 items-start">
                <span :class="['text-xs px-2 py-0.5 rounded-full', s.parentLoginEnabled ? 'bg-mint-100 text-mint-500' : 'bg-cream-100 text-cocoa-400']">
                  {{ s.parentLoginEnabled ? '已开通' : '未开通' }}
                </span>
                <template v-if="s.parentLoginEnabled">
                  <span class="text-xs text-cocoa-400">默认口令：123456</span>
                  <button class="text-xs text-cocoa-500 hover:text-rose-500 underline" @click="openReset(s)">重置密码</button>
                </template>
                <button
                  class="text-xs underline"
                  :class="s.parentLoginEnabled ? 'text-cocoa-400 hover:text-rose-500' : 'text-mint-500 hover:text-mint-600'"
                  @click="toggleParentLogin(s)"
                >{{ s.parentLoginEnabled ? '关闭' : '开通' }}</button>
              </div>
            </td>
            <td class="px-4 py-3 text-right">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(s)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1" title="删除" @click="handleDelete(s)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页栏 -->
    <div v-if="totalFiltered > pageSizeNum" class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-cream-100">
      <span class="text-xs text-cocoa-400">共 {{ totalFiltered }} 名学生</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="pageNum === 0"
          @click="prevPage"
        >上一页</button>
        <span class="text-xs text-cocoa-500">第 {{ pageNum + 1 }}/{{ totalPages }} 页</span>
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="pageNum + 1 >= totalPages"
          @click="nextPage"
        >下一页</button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-cocoa-400">每页</span>
        <select v-model.number="pageSizeNum" class="px-2 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="goPage(0)">
          <option :value="5">5 条</option>
          <option :value="10">10 条</option>
          <option :value="20">20 条</option>
          <option :value="50">50 条</option>
        </select>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="text-sm text-cocoa-500 flex items-center gap-2">
      <Users class="w-4 h-4" />
      共 {{ totalFiltered }} 名学生
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

  <!-- 重置密码 Modal -->
  <ResetPasswordModal
    v-model="showReset"
    :target-name="resetTarget?.name ? resetTarget.name + ' 的家长' : '该学生家长'"
    default-password="123456"
    @confirm="submitReset"
  />
</template>
