<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listSchoolNotices, createSchoolNotice, deleteSchoolNotice,
} from '@/api/school-admin'
import Modal from '@/components/Modal.vue'
import { Plus, Trash2, Pin } from 'lucide-vue-next'

interface NoticeItem {
  id: string
  title: string
  content?: string
  pinned?: boolean
  scope?: string
  createdAt: string
}

const loading = ref(false)
const notices = ref<NoticeItem[]>([])

async function loadNotices() {
  loading.value = true
  try {
    const res = await listSchoolNotices(0, 100)
    notices.value = res.items
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
onMounted(loadNotices)

/* ============ 新建公告 ============ */
const showForm = ref(false)
const formLoading = ref(false)
const form = ref({ title: '', content: '' })

function openCreate() {
  form.value = { title: '', content: '' }
  showForm.value = true
}

async function submitForm() {
  if (!form.value.title) {
    alert('请输入公告标题')
    return
  }
  formLoading.value = true
  try {
    await createSchoolNotice({ title: form.value.title, content: form.value.content })
    showForm.value = false
    await loadNotices()
  } catch (e: any) {
    alert(e?.message || '发布失败')
  } finally {
    formLoading.value = false
  }
}

/* ============ 删除 ============ */
async function handleDelete(n: NoticeItem) {
  if (!confirm(`确定删除公告「${n.title}」？`)) return
  try {
    await deleteSchoolNotice(n.id)
    await loadNotices()
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

function fmtDate(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">学校公告</h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" /> 发布公告
      </button>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-2xl shadow-softer overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">标题</th>
            <th class="px-4 py-3 font-medium">内容预览</th>
            <th class="px-4 py-3 font-medium">发布时间</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="4" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="notices.length === 0" class="text-center text-cocoa-400">
            <td colspan="4" class="py-8">暂无公告</td>
          </tr>
          <tr v-for="n in notices" :key="n.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">
              <div class="flex items-center gap-1.5">
                <Pin v-if="n.pinned" class="w-3.5 h-3.5 text-butter-500" />
                {{ n.title }}
              </div>
            </td>
            <td class="px-4 py-3 text-cocoa-700 max-w-md truncate">{{ n.content || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-500 text-xs whitespace-nowrap">{{ fmtDate(n.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(n)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 发布公告模态框 -->
  <Modal v-model="showForm" title="发布学校公告" width="max-w-xl">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">标题 *</label>
        <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="公告标题" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">内容</label>
        <textarea
          v-model="form.content"
          rows="5"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none"
          placeholder="公告正文（选填）"
        />
      </div>
      <div class="text-xs text-cocoa-400">学校公告将展示给本校所有教师/家长端可见范围内。</div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !form.title"
        @click="submitForm"
      >
        {{ formLoading ? '发布中…' : '发布' }}
      </button>
    </template>
  </Modal>
</template>
