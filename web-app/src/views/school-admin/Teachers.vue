<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  listTeachers, createTeacher, updateTeacher, deleteTeacher,
  updateTeacherFeatures, resetTeacherPassword, exportTeachersCsv, exportTeachersXls,
  type TeacherItem,
} from '@/api/school-admin'
import { ALL_FEATURES } from '@/constants/features'
import { SUBJECT_OPTIONS } from '@/constants/subjects'
import { ALL_POSITIONS } from '@gardener/shared/constants'
import { useAuthStore } from '@/stores/auth'
import { isValidPhone, PHONE_HINT } from '@/utils/validators'
import Modal from '@/components/Modal.vue'
import ResetPasswordModal from '@/components/ResetPasswordModal.vue'
import BatchImportDialog from '@/components/BatchImportDialog.vue'
import { Plus, Search, Settings2, KeyRound, Trash2, Edit3, Download, Upload, Printer } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()

/** 跳转到教师详情页：用 teacher.id 作为 userId */
function goDetail(t: TeacherItem) {
  router.push({ path: '/teacher/teacher-detail', query: { userId: t.id } })
}

const loading = ref(false)
const teachers = ref<TeacherItem[]>([])
const total = ref(0)
const keyword = ref('')

const filtered = computed(() => {
  if (!keyword.value) return teachers.value
  const kw = keyword.value.toLowerCase()
  return teachers.value.filter(t =>
    t.name?.toLowerCase().includes(kw) ||
    t.username?.toLowerCase().includes(kw) ||
    t.phone?.includes(kw),
  )
})

async function loadTeachers() {
  loading.value = true
  try {
    const res = await listTeachers(0, 500)
    teachers.value = res.items
    total.value = res.total
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadTeachers()
  // 刷新本校学校级功能包开关（schoolFeatureFlags），供「有效权限预览」使用
  await auth.fetchMe()
})

/* ============ 新增/编辑教师 ============ */
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', phone: '', gender: '', subject: '', position: '', positions: [] as string[], grade: '', username: '', password: '' })
const formLoading = ref(false)

/** 年级选项（与班级管理保持一致） */
const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

/** 把教师现有职务归一化为多选数组（兼容旧单值 position 字段与逗号拼接） */
function normalizePositions(t: TeacherItem): string[] {
  const arr = (t as any).positions
  if (Array.isArray(arr) && arr.length) return arr.filter(Boolean)
  const p = ((t as any).position || '') as string
  if (!p) return []
  return p.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', phone: '', gender: '', subject: '', position: '', positions: [], grade: '', username: '', password: '' }
  showForm.value = true
}

function openEdit(t: TeacherItem) {
  editingId.value = t.id
  form.value = {
    name: t.name, phone: t.phone || '', gender: t.gender || '', subject: t.subject || '',
    position: (t as any).position || '', positions: normalizePositions(t), grade: (t as any).grade || '',
    username: t.username || '', password: '',
  }
  showForm.value = true
}

/** 职务多选：切换某个职务的勾选 */
function togglePosition(p: string) {
  const i = form.value.positions.indexOf(p)
  if (i >= 0) form.value.positions.splice(i, 1)
  else form.value.positions.push(p)
}

const phoneError = computed(() =>
  form.value.phone && !isValidPhone(form.value.phone) ? PHONE_HINT : '',
)

async function submitForm() {
  if (!form.value.name) return
  if (form.value.phone && !isValidPhone(form.value.phone)) {
    alert(PHONE_HINT)
    return
  }
  formLoading.value = true
  try {
    if (editingId.value) {
      const dto: Record<string, any> = {
        name: form.value.name, phone: form.value.phone,
        gender: form.value.gender, subject: form.value.subject,
        position: form.value.positions.length ? form.value.positions.join(',') : form.value.position,
        positions: form.value.positions,
        grade: form.value.grade,
      }
      // 支持修改账号：非空才提交，后端校验库中是否已存在
      if (form.value.username && form.value.username.trim()) {
        dto.username = form.value.username.trim()
      }
      await updateTeacher(editingId.value, dto)
    } else {
      await createTeacher({
        name: form.value.name, phone: form.value.phone,
        gender: form.value.gender, subject: form.value.subject,
        position: form.value.positions.length ? form.value.positions.join(',') : form.value.position,
        positions: form.value.positions,
        grade: form.value.grade,
        username: form.value.username?.trim() || undefined,
        password: form.value.password || undefined,
      })
    }
    showForm.value = false
    await loadTeachers()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 功能权限配置 ============ */
const showFeatures = ref(false)
const featuresTeacher = ref<TeacherItem | null>(null)
const selectedFeatures = ref<string[]>([])
const featuresLoading = ref(false)

function openFeatures(t: TeacherItem) {
  featuresTeacher.value = t
  selectedFeatures.value = [...(t.features || [])]
  showFeatures.value = true
}

async function saveFeatures() {
  if (!featuresTeacher.value) return
  featuresLoading.value = true
  try {
    await updateTeacherFeatures(featuresTeacher.value.id, selectedFeatures.value)
    featuresTeacher.value.features = [...selectedFeatures.value]
    showFeatures.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    featuresLoading.value = false
  }
}

/** 全选：跳过被学校级关闭的项（选了也不可用） */
function selectAllFeatures() {
  selectedFeatures.value = ALL_FEATURES.filter(f => !isBlockedBySchool(f.key)).map(f => f.key)
}
function clearAllFeatures() { selectedFeatures.value = [] }

/* ---------- 有效权限预览：effective = 学校级 ∩ 教师级 ---------- */

/** 本校学校级功能包开关（来自登录/me 的 schoolFeatureFlags）；null/[] = 全开 */
const schoolFlags = computed<string[] | null>(() => {
  const f = auth.user?.schoolFeatureFlags
  return Array.isArray(f) && f.length > 0 ? f : null
})

/** 学校级是否全开（未配置时不收窄） */
const schoolAllOn = computed(() => schoolFlags.value === null)

/** 某 key 是否被学校级关闭（教师即使勾选也不可用） */
function isBlockedBySchool(key: string): boolean {
  if (schoolAllOn.value) return false
  return !schoolFlags.value!.includes(key)
}

/** 归一化某一级：null/[] → 全集，不做收窄（与后端同公式） */
function normalizeLevel(flags: string[] | null | undefined): string[] {
  if (!Array.isArray(flags) || flags.length === 0) return ALL_FEATURES.map(f => f.key)
  return flags
}

/** 实际可用 key 列表（保持 ALL_FEATURES 原始顺序） */
const effectivePreview = computed<{ key: string; label: string }[]>(() => {
  const school = new Set(normalizeLevel(schoolFlags.value))
  const teacher = new Set(normalizeLevel(selectedFeatures.value))
  return ALL_FEATURES.filter(f => school.has(f.key) && teacher.has(f.key))
})

/** 被学校级关闭、但教师侧勾选了的项（提示冲突） */
const blockedSelected = computed<{ key: string; label: string }[]>(() =>
  ALL_FEATURES.filter(f => isBlockedBySchool(f.key) && selectedFeatures.value.includes(f.key)),
)

/** 勾选切换：被学校级关闭的项锁定，不允许操作 */
function toggleFeature(key: string) {
  if (isBlockedBySchool(key)) return
  const i = selectedFeatures.value.indexOf(key)
  if (i >= 0) selectedFeatures.value.splice(i, 1)
  else selectedFeatures.value.push(key)
}

/* ============ 重置密码 ============ */
const showReset = ref(false)
const resetTarget = ref<TeacherItem | null>(null)
const resetting = ref(false)

function openReset(t: TeacherItem) {
  resetTarget.value = t
  showReset.value = true
}

async function submitReset(password: string) {
  if (!resetTarget.value || resetting.value) return
  resetting.value = true
  try {
    const r: any = await resetTeacherPassword(resetTarget.value.id, password)
    showReset.value = false
    alert('密码已重置' + (r?.defaultPassword ? `，新密码：${r.defaultPassword}\n请通知老师用此密码登录，并尽快修改。` : ''))
  } catch (e: any) {
    alert(e?.message || '重置失败')
  } finally {
    resetting.value = false
  }
}

/* ============ 删除 ============ */
async function handleDelete(t: TeacherItem) {
  if (!await confirm(`确定删除教师「${t.name}」？此操作不可恢复。`)) return
  try {
    await deleteTeacher(t.id)
    await loadTeachers()
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 导出 ============ */
const exporting = ref(false)
async function handleExport() {
  exporting.value = true
  try {
    await exportTeachersCsv()
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
    await exportTeachersXls()
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
      <h1 class="text-2xl font-bold text-cocoa-900">教师管理</h1>
      <div class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索姓名/账号/手机"
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
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新增教师
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">姓名</th>
            <th class="px-4 py-3 font-medium">账号</th>
            <th class="px-4 py-3 font-medium">手机</th>
            <th class="px-4 py-3 font-medium">性别</th>
            <th class="px-4 py-3 font-medium">学科</th>
            <th class="px-4 py-3 font-medium">职务</th>
            <th class="px-4 py-3 font-medium">年级</th>
            <th class="px-4 py-3 font-medium">功能权限</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="8" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td colspan="8" class="py-8">暂无教师数据</td>
          </tr>
          <tr v-for="t in filtered" :key="t.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">
              <button class="hover:text-butter-600 hover:underline transition-colors text-left" @click="goDetail(t)">{{ t.name }}</button>
            </td>
            <td class="px-4 py-3 text-cocoa-700">{{ t.username || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ t.phone || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ t.gender || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ t.subject || '-' }}</td>
            <td class="px-4 py-3">
              <span v-if="!t.positions || t.positions.length === 0" class="text-cocoa-400 text-xs">{{ (t as any).position || '-' }}</span>
              <span v-else class="flex flex-wrap gap-1">
                <span
                  v-for="p in t.positions"
                  :key="p"
                  class="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-600"
                >{{ p }}</span>
              </span>
            </td>
            <td class="px-4 py-3 text-cocoa-700">{{ (t as any).grade || '-' }}</td>
            <td class="px-4 py-3">
              <span v-if="!t.features || t.features.length === 0" class="text-mint-500 text-xs">全部可用</span>
              <span v-else class="text-butter-600 text-xs">{{ t.features.length }} 项</span>
            </td>
            <td class="px-4 py-3">
              <span :class="['text-xs px-2 py-0.5 rounded-full', t.enabled ? 'bg-mint-100 text-mint-500' : 'bg-red-50 text-red-500']">
                {{ t.enabled ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right space-x-1">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(t)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="功能权限" @click="openFeatures(t)">
                <Settings2 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="重置密码" @click="openReset(t)">
                <KeyRound class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(t)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editingId ? '编辑教师' : '新增教师'">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">姓名 *</label>
        <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="请输入姓名" />
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
          <label class="text-sm text-cocoa-500">学科</label>
          <select v-model="form.subject" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">未设置</option>
            <option v-for="s in SUBJECT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">职务（可多选）</label>
        <div class="flex flex-wrap gap-1.5 mt-1">
          <button
            v-for="p in ALL_POSITIONS"
            :key="p"
            type="button"
            :class="[
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              form.positions.includes(p)
                ? 'border-butter-400 bg-butter-100 text-butter-600'
                : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
            ]"
            @click="togglePosition(p)"
          >{{ p }}</button>
        </div>
        <p v-if="form.positions.length" class="text-xs text-cocoa-400 mt-1">已选：{{ form.positions.join('、') }}</p>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">年级</label>
        <select v-model="form.grade" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
          <option value="">未设置</option>
          <option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">手机号</label>
        <input
          v-model="form.phone"
          class="w-full mt-1 px-3 py-2 rounded-xl border focus:outline-none"
          :class="phoneError ? 'border-red-400' : 'border-cream-200 focus:border-butter-400'"
          placeholder="选填"
        />
        <p v-if="phoneError" class="text-xs text-red-500 mt-1">{{ phoneError }}</p>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">登录用户名{{ editingId ? '（可修改）' : '（留空自动生成）' }}</label>
        <input v-model="form.username" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如 zhangsan" />
      </div>
      <template v-if="!editingId">
        <div>
          <label class="text-sm text-cocoa-500">初始密码</label>
          <input v-model="form.password" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="留空则默认 1314521" />
        </div>
      </template>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="formLoading || !form.name" @click="submitForm">
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 功能权限配置 -->
  <Modal v-model="showFeatures" :title="`功能权限 · ${featuresTeacher?.name || ''}`" width="max-w-2xl">
    <div class="space-y-3">
      <!-- 有效权限预览：effective = 学校级 ∩ 教师级 -->
      <div class="bg-mint-100/40 border border-mint-300/50 rounded-xl px-3 py-2.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-cocoa-900">有效权限预览</span>
          <span class="text-xs text-cocoa-500">
            实际可用 {{ effectivePreview.length }} / {{ ALL_FEATURES.length }} 项
          </span>
        </div>
        <p class="text-xs text-cocoa-500 mt-1">
          实际可用 = 学校级 ∩ 教师级。学校级关闭后，该校教师即使勾选也不可用。<template v-if="schoolAllOn">当前学校级未做限制（全部开放）。</template>
        </p>
        <div v-if="effectivePreview.length" class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="f in effectivePreview"
            :key="f.key"
            class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-500"
          >
            {{ f.label }}
          </span>
        </div>
        <p v-else class="text-xs text-red-500 mt-2">当前配置下该教师无任何可用功能。</p>
        <div v-if="blockedSelected.length" class="mt-2 pt-2 border-t border-mint-300/40">
          <p class="text-xs text-cocoa-400">
            以下 {{ blockedSelected.length }} 项已被学校级关闭，勾选也不生效：
            <span class="text-cocoa-500">{{ blockedSelected.map(f => f.label).join('、') }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between bg-cream-50 rounded-xl px-3 py-2">
        <span class="text-sm text-cocoa-500">
          空列表 = 全部可用；勾选后仅勾选的功能可用
        </span>
        <div class="flex gap-2">
          <button class="text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/40" @click="selectAllFeatures">全选</button>
          <button class="text-xs px-2 py-1 rounded-lg bg-cream-200 text-cocoa-500 hover:bg-cream-300/40" @click="clearAllFeatures">清空</button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <label
          v-for="f in ALL_FEATURES"
          :key="f.key"
          :title="isBlockedBySchool(f.key) ? '被学校级关闭' : ''"
          :class="[
            'flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-sm',
            isBlockedBySchool(f.key)
              ? 'border-cream-200 bg-cream-100 text-cocoa-400 cursor-not-allowed opacity-70'
              : selectedFeatures.includes(f.key)
                ? 'border-butter-400 bg-butter-100/50 text-cocoa-900 cursor-pointer'
                : 'border-cream-200 hover:bg-cream-50 text-cocoa-700 cursor-pointer',
          ]"
        >
          <input
            type="checkbox"
            :checked="selectedFeatures.includes(f.key)"
            :disabled="isBlockedBySchool(f.key)"
            class="rounded text-butter-500 focus:ring-butter-400 disabled:cursor-not-allowed"
            @change="toggleFeature(f.key)"
          />
          <span class="truncate">{{ f.label }}</span>
          <span v-if="isBlockedBySchool(f.key)" class="ml-auto text-[10px] text-cocoa-400 whitespace-nowrap">被学校级关闭</span>
        </label>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showFeatures = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="featuresLoading" @click="saveFeatures">
        {{ featuresLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 批量导入 -->
  <BatchImportDialog v-model="showImport" type="teacher" @imported="loadTeachers" />

  <!-- 重置密码 Modal -->
  <ResetPasswordModal
    v-model="showReset"
    :target-name="resetTarget?.name"
    default-password="1314521"
    @confirm="submitReset"
  />
</template>
