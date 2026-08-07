<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses, classNameById } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import {
  Plus, Edit3, Trash2, Pin, PinOff, Send, Sparkles, FileText,
  Power, PowerOff, Loader2, Search,
} from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => {
  loadClasses()
  loadNotices()
})

interface NoticeItem {
  id: string
  title: string
  content?: string
  scope?: 'class' | 'school'
  classId?: string
  className?: string
  pinned?: boolean
  ended?: boolean
  createdAt?: string
}

/* ============ 列表数据 ============ */
const loading = ref(false)
const notices = ref<NoticeItem[]>([])
const keyword = ref('')
const classFilter = ref('')
const pageNotices = ref(0)
const pageSizeNotices = ref(10)

const filtered = computed(() => {
  let list = notices.value
  if (classFilter.value) {
    list = list.filter(n => n.classId === classFilter.value || n.scope === 'school')
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(kw) ||
      (n.content || '').toLowerCase().includes(kw),
    )
  }
  // 置顶优先，再按时间倒序
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
})

const totalFilteredNotices = computed(() => filtered.value.length)
const totalPagesNotices = computed(() => Math.max(1, Math.ceil(totalFilteredNotices.value / pageSizeNotices.value)))
const displayedNotices = computed(() => {
  const start = pageNotices.value * pageSizeNotices.value
  return filtered.value.slice(start, start + pageSizeNotices.value)
})

function resetNoticesPage() {
  pageNotices.value = 0
}
watch(classFilter, resetNoticesPage)
watch(keyword, resetNoticesPage)

async function loadNotices() {
  loading.value = true
  try {
    const res: any = await request.get('/notices', { params: { take: 100 } })
    notices.value = Array.isArray(res) ? res : (res?.items || [])
    pageNotices.value = 0
  } catch (e: any) {
    alert(e?.message || '加载公告失败')
    notices.value = []
  } finally {
    loading.value = false
  }
}

function fmtDate(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function scopeBadge(n: NoticeItem) {
  if (n.scope === 'school') return 'bg-sky2-100 text-sky2-500'
  return 'bg-butter-100 text-butter-600'
}
function scopeLabel(n: NoticeItem) {
  if (n.scope === 'school') return '全校'
  return '班级'
}

/* ============ 新增/编辑表单 ============ */
const showForm = ref(false)
const editing = ref<NoticeItem | null>(null)
const formLoading = ref(false)
const form = ref<{ title: string; scope: 'class' | 'school'; classId: string; content: string; pinned: boolean }>({
  title: '', scope: 'class', classId: '', content: '', pinned: false,
})

function openCreate() {
  editing.value = null
  form.value = { title: '', scope: 'class', classId: '', content: '', pinned: false }
  showForm.value = true
}

function openEdit(n: NoticeItem) {
  editing.value = n
  form.value = {
    title: n.title || '',
    scope: (n.scope === 'school' ? 'school' : 'class'),
    classId: n.classId || '',
    content: n.content || '',
    pinned: !!n.pinned,
  }
  showForm.value = true
}

async function submitForm() {
  if (!form.value.title.trim()) {
    alert('请输入公告标题')
    return
  }
  formLoading.value = true
  try {
    const payload: Record<string, any> = {
      title: form.value.title,
      scope: form.value.scope,
      content: form.value.content,
      pinned: form.value.pinned,
    }
    if (form.value.scope === 'class') {
      payload.classId = form.value.classId
      payload.className = classNameById(form.value.classId) || form.value.classId
    } else {
      payload.classId = ''
      payload.className = ''
    }
    if (editing.value) {
      const res: any = await request.patch('/notices/' + editing.value.id, payload)
      const idx = notices.value.findIndex(x => x.id === editing.value!.id)
      if (idx >= 0) notices.value[idx] = { ...notices.value[idx], ...payload, ...res }
    } else {
      const res: any = await request.post('/notices', payload)
      if (res?.id) notices.value.unshift(res)
      else await loadNotices()
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(n: NoticeItem) {
  if (!await confirm('确定删除？')) return
  try {
    await request.delete('/notices/' + n.id)
    notices.value = notices.value.filter(x => x.id !== n.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 置顶 / 结束 / 恢复 ============ */
async function togglePin(n: NoticeItem) {
  try {
    await request.patch('/notices/' + n.id, { pinned: !n.pinned })
    n.pinned = !n.pinned
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

async function setEnded(n: NoticeItem, ended: boolean) {
  try {
    await request.patch('/notices/' + n.id, { ended })
    n.ended = ended
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

/* ============ 推送家长 ============ */
const pushing = ref<Record<string, boolean>>({})
async function pushToParents(n: NoticeItem) {
  if (pushing.value[n.id]) return
  if (!await confirm(`确定将公告「${n.title}」推送给家长？`)) return
  pushing.value[n.id] = true
  try {
    await request.post('/security/push-notice', { noticeId: n.id })
    alert('已推送给家长')
  } catch (e: any) {
    alert(e?.message || '推送失败')
  } finally {
    pushing.value[n.id] = false
  }
}

/* ============ AI 润色 ============ */
const polishing = ref(false)
async function aiPolish() {
  if (!form.value.content.trim()) {
    alert('请先输入公告内容')
    return
  }
  if (polishing.value) return
  polishing.value = true
  try {
    const res: any = await request.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: '请润色以下公告内容，使其更专业、有温度：\n' + form.value.content }],
    })
    const out = res?.content
    if (out) form.value.content = out
    else alert('AI 未返回内容')
  } catch (e: any) {
    alert(e?.message || 'AI 润色失败')
  } finally {
    polishing.value = false
  }
}

/* ============ 模板套用 ============ */
const showTemplates = ref(false)
const templates = ref<any[]>([])
const templateLoading = ref(false)

async function openTemplates() {
  showTemplates.value = true
  templateLoading.value = true
  templates.value = []
  try {
    const res: any = await request.get('/notice-templates', { params: { take: 200 } })
    templates.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载模板失败')
  } finally {
    templateLoading.value = false
  }
}

function applyTemplate(t: any) {
  const content = t?.content || ''
  const today = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')
  const clsName = form.value.scope === 'class'
    ? (classNameById(form.value.classId) || form.value.classId || '')
    : '全校'
  form.value.content = content
    .replace(/\{班级\}/g, clsName)
    .replace(/\{日期\}/g, today)
  if (!form.value.title && t?.title) form.value.title = t.title
  showTemplates.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900">班级公告</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="classFilter"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">全部范围</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索标题/内容"
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm w-56 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新建公告
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <div v-if="loading" class="py-12 flex items-center justify-center text-cocoa-400">
        <Loader2 class="w-5 h-5 animate-spin mr-2" /> 加载中…
      </div>
      <div v-else-if="totalFilteredNotices === 0" class="py-12 text-center text-cocoa-400">
        暂无公告
      </div>
      <ul v-else class="divide-y divide-cream-100">
        <li
          v-for="n in displayedNotices"
          :key="n.id"
          :class="['px-5 py-4 hover:bg-cream-50 transition-colors', n.ended ? 'opacity-60' : '']"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <!-- 左：标题 + 标签 -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <Pin v-if="n.pinned" class="w-4 h-4 text-butter-500 shrink-0" />
                <span class="font-semibold text-cocoa-900 truncate">{{ n.title }}</span>
                <span :class="['text-xs px-2 py-0.5 rounded-full shrink-0', scopeBadge(n)]">
                  {{ scopeLabel(n) }}
                </span>
                <span v-if="n.scope === 'class' && (n.className || n.classId)" class="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-cocoa-700 shrink-0">
                  {{ n.className || classNameById(n.classId || '') || n.classId }}
                </span>
                <span v-if="n.ended" class="text-xs px-2 py-0.5 rounded-full bg-sakura-100 text-sakura-500 shrink-0">
                  已结束
                </span>
              </div>
              <div v-if="n.content" class="text-sm text-cocoa-700 line-clamp-2">{{ n.content }}</div>
              <div class="text-xs text-cocoa-400 mt-1">{{ fmtDate(n.createdAt) }}</div>
            </div>
            <!-- 右：操作按钮 -->
            <div class="flex items-center gap-1 shrink-0">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click="openEdit(n)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500"
                :class="n.pinned ? 'text-butter-500' : ''"
                :title="n.pinned ? '取消置顶' : '置顶'"
                @click="togglePin(n)"
              >
                <PinOff v-if="n.pinned" class="w-4 h-4" />
                <Pin v-else class="w-4 h-4" />
              </button>
              <button
                v-if="!n.ended"
                class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500"
                title="结束"
                @click="setEnded(n, true)"
              >
                <PowerOff class="w-4 h-4" />
              </button>
              <button
                v-else
                class="p-1.5 rounded-lg hover:bg-cream-100 text-mint-500"
                title="恢复"
                @click="setEnded(n, false)"
              >
                <Power class="w-4 h-4" />
              </button>
              <button
                class="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-sky2-100 text-sky2-500 hover:bg-sky2-300/30 disabled:opacity-50"
                :disabled="pushing[n.id] || n.ended"
                :title="n.ended ? '已结束，无法推送' : '推送给家长'"
                @click="pushToParents(n)"
              >
                <Send class="w-3.5 h-3.5" />
                <span v-if="pushing[n.id]">推送中</span>
                <span v-else>推送</span>
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1" title="删除" @click="handleDelete(n)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- 分页栏 -->
    <div v-if="totalFilteredNotices > pageSizeNotices" class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-cream-100">
      <span class="text-xs text-cocoa-400">共 {{ totalFilteredNotices }} 条</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="pageNotices === 0"
          @click="pageNotices--"
        >上一页</button>
        <span class="text-xs text-cocoa-500">第 {{ pageNotices + 1 }}/{{ totalPagesNotices }} 页</span>
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="pageNotices + 1 >= totalPagesNotices"
          @click="pageNotices++"
        >下一页</button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-cocoa-400">每页</span>
        <select v-model.number="pageSizeNotices" class="px-2 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="pageNotices = 0">
          <option :value="5">5 条</option>
          <option :value="10">10 条</option>
          <option :value="20">20 条</option>
          <option :value="50">50 条</option>
        </select>
      </div>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editing ? '编辑公告' : '新建公告'" width="max-w-2xl">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">标题 <span class="text-red-500">*</span></label>
          <input
            v-model="form.title"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
            placeholder="公告标题"
          />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">范围</label>
          <select
            v-model="form.scope"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          >
            <option value="class">班级</option>
            <option value="school">学校（需校管权限）</option>
          </select>
        </div>
      </div>

      <div v-if="form.scope === 'class'">
        <label class="text-sm text-cocoa-500">班级</label>
        <select
          v-model="form.classId"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        >
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label class="text-sm text-cocoa-500">内容</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-cream-100 text-cocoa-700 hover:bg-cream-200 disabled:opacity-50"
              :disabled="polishing"
              @click="aiPolish"
            >
              <Sparkles class="w-3.5 h-3.5 text-butter-500" />
              {{ polishing ? 'AI 润色中…' : 'AI 润色' }}
            </button>
            <button
              type="button"
              class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-cream-100 text-cocoa-700 hover:bg-cream-200"
              @click="openTemplates"
            >
              <FileText class="w-3.5 h-3.5 text-mint-500" /> 套用模板
            </button>
          </div>
        </div>
        <textarea
          v-model="form.content"
          rows="6"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none"
          placeholder="公告正文"
        />
      </div>

      <label class="flex items-center gap-2 text-sm text-cocoa-700 cursor-pointer select-none">
        <input type="checkbox" v-model="form.pinned" class="accent-butter-500 w-4 h-4" />
        置顶
      </label>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading || !form.title"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 模板选择弹窗 -->
  <Modal v-model="showTemplates" title="选择公告模板" width="max-w-lg">
    <div v-if="templateLoading" class="py-8 flex items-center justify-center text-cocoa-400">
      <Loader2 class="w-5 h-5 animate-spin mr-2" /> 加载中…
    </div>
    <div v-else-if="templates.length === 0" class="py-8 text-center text-cocoa-400">
      暂无模板
    </div>
    <ul v-else class="divide-y divide-cream-100 max-h-[50vh] overflow-y-auto -mx-2">
      <li
        v-for="t in templates"
        :key="t.id"
        class="px-3 py-3 hover:bg-cream-50 rounded-xl cursor-pointer"
        @click="applyTemplate(t)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="font-medium text-cocoa-900 text-sm truncate">{{ t.title || '未命名模板' }}</div>
          <span v-if="t.category" class="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-cocoa-700 shrink-0">{{ t.category }}</span>
        </div>
        <div v-if="t.content" class="text-xs text-cocoa-500 mt-1 line-clamp-2">{{ t.content }}</div>
      </li>
    </ul>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showTemplates = false">取消</button>
    </template>
  </Modal>
</template>
