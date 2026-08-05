<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Users, Plus, Edit3, Trash2, KeyRound, Power, Loader2 } from 'lucide-vue-next'
import {
  listSchoolAdmins, createSchoolAdmin, updateSchoolAdmin,
  resetSchoolAdminPassword, toggleSchoolAdminEnabled, deleteSchoolAdmin,
  listSchools, listTeachers,
} from '@/api/admin'
import Modal from '@/components/Modal.vue'
import ResetPasswordModal from '@/components/ResetPasswordModal.vue'

const loading = ref(false)
const items = ref<any[]>([])
const total = ref(0)
const schools = ref<any[]>([])
/** schoolId → 教师数（超管查看校管理员时展示本校教师规模） */
const teacherCountBySchool = ref<Record<string, number>>({})

const activeCount = computed(() => items.value.filter(a => a.enabled !== false).length)

async function loadSchools() {
  try {
    const res = await listSchools(0, 500)
    schools.value = (res?.items || [])
  } catch (e: any) {
    schools.value = []
  }
}

function schoolName(id: string) {
  return schools.value.find(s => s.id === id)?.name || '-'
}

async function load() {
  loading.value = true
  try {
    const [adminsRes, teachersRes] = await Promise.all([
      listSchoolAdmins(0, 500),
      listTeachers(0, 500).catch(() => ({ items: [] as any[], total: 0 })),
    ])
    items.value = (adminsRes?.items || [])
    total.value = adminsRes?.total || 0
    // 聚合各校教师数（schoolId → count）
    const teachers = (teachersRes as any)?.items || []
    const map: Record<string, number> = {}
    for (const t of teachers) {
      const sid = t.schoolId || ''
      if (sid) map[sid] = (map[sid] || 0) + 1
    }
    teacherCountBySchool.value = map
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadSchools()
  await load()
})

/* ============ 新增/编辑弹窗 ============ */
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ schoolId: '', username: '', password: '', name: '' })
const submitting = ref(false)

function openCreate() {
  editingId.value = null
  form.value = { schoolId: schools.value[0]?.id || '', username: '', password: '', name: '' }
  showForm.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  form.value = {
    schoolId: row.schoolId || row.school_id || '',
    username: row.username || '',
    password: '',
    name: row.name || '',
  }
  showForm.value = true
}

async function submit() {
  if (!form.value.schoolId) { alert('请选择所属学校'); return }
  if (!form.value.name) { alert('请填写姓名'); return }
  if (!editingId.value) {
    if (!form.value.username) { alert('请填写用户名'); return }
    if (!form.value.password) { alert('请填写密码'); return }
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateSchoolAdmin(editingId.value, {
        name: form.value.name,
        schoolId: form.value.schoolId,
      })
    } else {
      await createSchoolAdmin({
        schoolId: form.value.schoolId,
        username: form.value.username,
        password: form.value.password,
        name: form.value.name,
      })
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

/* ============ 重置密码弹窗 ============ */
const showReset = ref(false)
const resetTarget = ref<any | null>(null)
const resetting = ref(false)

function openReset(row: any) {
  resetTarget.value = row
  showReset.value = true
}

async function submitReset(password: string) {
  if (!resetTarget.value || resetting.value) return
  resetting.value = true
  try {
    const res: any = await resetSchoolAdminPassword(resetTarget.value.id, password)
    showReset.value = false
    alert('密码已重置' + (res?.defaultPassword ? `，新密码：${res.defaultPassword}` : ''))
  } catch (e: any) {
    alert(e?.message || '重置失败')
  } finally {
    resetting.value = false
  }
}

/* ============ 启用/停用 ============ */
async function toggleEnabled(row: any) {
  const next = !(row.enabled !== false)
  try {
    await toggleSchoolAdminEnabled(row.id, next)
    row.enabled = next
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

/* ============ 删除 ============ */
async function handleDelete(row: any) {
  if (!await confirm('确定删除？')) return
  try {
    await deleteSchoolAdmin(row.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

function formatTime(t?: string) {
  if (!t) return '-'
  return t.replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 19)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Users class="w-6 h-6 text-butter-500" /> 学校管理员
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" /> 新增管理员
      </button>
    </div>

    <!-- 统计 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">管理员总数</div>
        <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ total }}</div>
      </div>
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">启用数</div>
        <div class="text-2xl font-bold text-mint-500 mt-1">{{ activeCount }}</div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
            <th class="px-4 py-3 font-medium">姓名</th>
            <th class="px-4 py-3 font-medium">用户名</th>
            <th class="px-4 py-3 font-medium">所属学校</th>
            <th class="px-4 py-3 font-medium">本校教师</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">创建时间</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading">
            <td colspan="7" class="py-10 text-center text-cocoa-400">
              <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="7" class="py-10 text-center text-cocoa-400">暂无管理员数据</td>
          </tr>
          <tr v-for="row in items" :key="row.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.username || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ schoolName(row.schoolId || row.school_id) }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 text-xs">
                <Users class="w-3.5 h-3.5 text-mint-500" />
                <span class="text-cocoa-700 font-medium">{{ teacherCountBySchool[row.schoolId || row.school_id] ?? 0 }}</span>
                <span class="text-cocoa-400">人</span>
              </span>
            </td>
            <td class="px-4 py-3">
              <span :class="['text-xs px-2 py-0.5 rounded-full', row.enabled !== false ? 'bg-mint-100 text-mint-500' : 'bg-sakura-100 text-sakura-500']">
                {{ row.enabled !== false ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-3 text-cocoa-700">{{ formatTime(row.createdAt || row.created_at) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <span class="inline-flex items-center gap-1">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(row)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="重置密码" @click="openReset(row)">
                <KeyRound class="w-4 h-4" />
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500"
                :title="row.enabled !== false ? '停用' : '启用'"
                @click="toggleEnabled(row)"
              >
                <Power class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(row)">
                <Trash2 class="w-4 h-4" />
              </button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增/编辑 Modal -->
    <Modal v-model="showForm" :title="editingId ? '编辑管理员' : '新增管理员'" width="max-w-md">
      <div class="space-y-3">
        <div>
          <label class="text-sm text-cocoa-500">所属学校 *</label>
          <select v-model="form.schoolId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">姓名 *</label>
          <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="请输入姓名" />
        </div>
        <template v-if="!editingId">
          <div>
            <label class="text-sm text-cocoa-500">用户名 *</label>
            <input v-model="form.username" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="登录用户名" />
          </div>
          <div>
            <label class="text-sm text-cocoa-500">密码 *</label>
            <input v-model="form.password" type="password" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="初始密码" />
          </div>
        </template>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
        <button
          class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? '保存中…' : '保存' }}
        </button>
      </template>
    </Modal>

    <!-- 重置密码 Modal -->
    <ResetPasswordModal
      v-model="showReset"
      :target-name="resetTarget?.name"
      default-password="1314520"
      @confirm="submitReset"
    />
  </div>
</template>
