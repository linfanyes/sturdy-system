<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { School, Plus, Edit3, Trash2, Power, Loader2 } from 'lucide-vue-next'
import { listSchools, createSchool, updateSchool, deleteSchool } from '@/api/admin'

const loading = ref(false)
const items = ref<any[]>([])
const total = ref(0)

const activeCount = computed(() => items.value.filter(s => s.status === 'active').length)
const inactiveCount = computed(() => items.value.filter(s => s.status !== 'active').length)

async function load() {
  loading.value = true
  try {
    const res = await listSchools(0, 500)
    items.value = (res?.items || [])
    total.value = res?.total || 0
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ============ 新增/编辑弹窗 ============ */
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', prefix: '', address: '', status: 'active' })
const submitting = ref(false)
const codePreview = ref('')

// 实时预览：2 位前缀 + 5 位随机 + 平台后缀(H)，仅新增时展示
watch(() => form.value.prefix, (v) => {
  const p = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)
  form.value.prefix = p
  codePreview.value = p.length === 2 ? `${p}•••••H` : ''
})

function openCreate() {
  editingId.value = null
  form.value = { name: '', prefix: '', address: '', status: 'active' }
  codePreview.value = ''
  showForm.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  form.value = {
    name: row.name || '',
    prefix: (row.code || '').slice(0, 2) || '',
    address: row.address || '',
    status: row.status === 'inactive' ? 'inactive' : 'active',
  }
  codePreview.value = ''
  showForm.value = true
}

async function submit() {
  if (!form.value.name) {
    alert('请填写学校名称')
    return
  }
  if (!editingId.value && !/^[A-Z0-9]{2}$/.test(form.value.prefix)) {
    alert('请填写 2 位学校编号前缀（大写字母或数字）')
    return
  }
  submitting.value = true
  try {
    const payload: any = {
      name: form.value.name,
      address: form.value.address || undefined,
      status: form.value.status,
    }
    if (!editingId.value) {
      // 新增：服务端按 2 位前缀 + 随机 + H 生成 8 位编号
      payload.prefix = form.value.prefix
      payload.platform = 'web'
    }
    if (editingId.value) {
      await updateSchool(editingId.value, payload)
    } else {
      await createSchool(payload)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

/* ============ 启用/停用切换 ============ */
async function toggleStatus(row: any) {
  const next = row.status === 'active' ? 'inactive' : 'active'
  try {
    await updateSchool(row.id, { status: next })
    row.status = next
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

/* ============ 删除 ============ */
async function handleDelete(row: any) {
  if (!confirm(`确定删除学校「${row.name}」？此操作不可恢复。`)) return
  try {
    await deleteSchool(row.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <School class="w-6 h-6 text-butter-500" /> 学校管理
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" /> 新增学校
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">学校总数</div>
        <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ total }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">启用数</div>
        <div class="text-2xl font-bold text-mint-500 mt-1">{{ activeCount }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">停用数</div>
        <div class="text-2xl font-bold text-sakura-500 mt-1">{{ inactiveCount }}</div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
            <th class="px-4 py-3 font-medium">名称</th>
            <th class="px-4 py-3 font-medium">编号</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">地址</th>
            <th class="px-4 py-3 font-medium">管理员数量</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading">
            <td colspan="6" class="py-10 text-center text-cocoa-400">
              <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="6" class="py-10 text-center text-cocoa-400">暂无学校数据</td>
          </tr>
          <tr v-for="row in items" :key="row.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.code || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs px-2 py-0.5 rounded-full', row.status === 'active' ? 'bg-mint-100 text-mint-500' : 'bg-sakura-100 text-sakura-500']">
                {{ row.status === 'active' ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.address || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.adminCount ?? row.admin_count ?? '-' }}</td>
            <td class="px-4 py-3 text-right space-x-1">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(row)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500"
                :title="row.status === 'active' ? '停用' : '启用'"
                @click="toggleStatus(row)"
              >
                <Power class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(row)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增/编辑 Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-cocoa-900 mb-4">{{ editingId ? '编辑学校' : '新增学校' }}</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm text-cocoa-500">名称 *</label>
            <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="请输入学校名称" />
          </div>
          <div>
            <label class="text-sm text-cocoa-500">编号前缀（2 位，必填）</label>
            <input v-model="form.prefix" maxlength="2" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 uppercase" placeholder="如 BJ" />
            <p v-if="codePreview" class="text-xs text-cocoa-400 mt-1">将生成编号：{{ codePreview }}（2 位前缀 + 5 位随机 + H，共 8 位）</p>
          </div>
          <div>
            <label class="text-sm text-cocoa-500">地址（可选）</label>
            <input v-model="form.address" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="请输入地址" />
          </div>
          <div>
            <label class="text-sm text-cocoa-500">状态</label>
            <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="showForm = false">取消</button>
          <button
            class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
            :disabled="submitting || !form.name"
            @click="submit"
          >
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
