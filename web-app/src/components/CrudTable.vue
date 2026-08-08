<script setup lang="ts">
/**
 * 通用 CRUD 表格组件
 * 复用小程序后端统一 CRUD 接口（base.controller.ts 模式：GET/?classId=&skip=&take=&term=）
 * 支持：列表展示、新增、编辑、删除、按 classId 筛选、关键词搜索
 */
import { ref, onMounted, computed, watch } from 'vue'
import { Plus, Search, Edit3, Trash2, Inbox } from 'lucide-vue-next'
import Modal from './Modal.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { toast } from '@/utils/feedback'

/** 选项：支持纯字符串或 {value,label} 对象（value 为真实存储值，label 为展示文本） */
export type SelectOption = string | { value: string; label: string }

/** 字段定义 */
export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'datetime' | 'textarea' | 'select' | 'tags'
  options?: SelectOption[] | (() => SelectOption[])
  required?: boolean
  placeholder?: string
  /** 列宽（Tailwind class） */
  width?: string
  /** 是否在列表中隐藏 */
  hideInList?: boolean
  /** 是否在表单中只读 */
  readonly?: boolean
  /** 格式校验正则（仅当值非空时校验，如手机号） */
  pattern?: RegExp
  /** 校验失败提示语 */
  patternHint?: string
  /** 渲染函数：自定义单元格渲染 */
  render?: (row: any) => string
}

const props = defineProps<{
  /** API 路径，如 'todos' / 'award-records' / 'generated/papers' */
  apiPath: string
  /** 资源单数标题，如 '待办' */
  title: string
  /** 字段定义 */
  fields: FieldDef[]
  /** 是否按 classId 筛选（默认 true） */
  classFilterable?: boolean
  /** 新建时附加的默认值 */
  defaults?: Record<string, any>
  /** 自定义行内操作按钮（返回数组） */
  extraActions?: (row: any) => { label: string; onClick: (row: any) => void }[]
  /** 请求 take 数量 */
  take?: number
}>()

const loading = ref(false)
const items = ref<any[]>([])
const allItems = ref<any[]>([])
const keyword = ref('')
const classId = ref('')
const showForm = ref(false)
const editing = ref<any | null>(null)
const formLoading = ref(false)
const form = ref<Record<string, any>>({})

/** 分页状态 */
const page = ref(0)
const pageSize = ref(10)
const total = ref(0)

const skip = computed(() => page.value * pageSize.value)

/** 前端搜索过滤（保留，因后端暂不支持通用 term 搜索） */
const filtered = computed(() => {
  if (!keyword.value) return allItems.value
  const kw = keyword.value.toLowerCase()
  return allItems.value.filter(row =>
    props.fields.some(f => {
      const v = row[f.key]
      if (v == null) return false
      if (Array.isArray(v)) return v.join(',').toLowerCase().includes(kw)
      return String(v).toLowerCase().includes(kw)
    }),
  )
})

const totalFiltered = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))

/** 当前页展示的数据切片 */
const displayedItems = computed(() => {
  const start = page.value * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

/** 班级选项：自动从 useClasses 加载，用于 classId 字段下拉与顶部筛选 */
const { classes } = useClasses()
const classOptions = computed<{ value: string; label: string }[]>(() =>
  classes.value.map(c => ({ value: c.id, label: c.name })),
)

const listFields = computed(() => props.fields.filter(f => !f.hideInList))

async function loadList() {
  loading.value = true
  try {
    const isSearching = !!keyword.value.trim()
    const params: Record<string, any> = {
      skip: isSearching ? 0 : page.value * pageSize.value,
      take: isSearching ? 500 : pageSize.value,
    }
    if (classId.value) params.classId = classId.value
    const res = await import('@/api/request').then(m => m.default.get(props.apiPath, { params }))
    const arr = Array.isArray(res) ? res : (res?.items || [])
    allItems.value = arr
    items.value = arr
    total.value = res?.total ?? arr.length
    page.value = 0
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadClasses()
  loadList()
})

function resetAndReload() {
  page.value = 0
  loadList()
}
watch(classId, resetAndReload)
watch(keyword, resetAndReload)

function goPage(p: number) {
  const maxPage = Math.max(0, Math.ceil(totalFiltered.value / pageSize.value) - 1)
  page.value = Math.min(Math.max(0, p), maxPage)
  if (!keyword.value.trim()) {
    loadList()
  }
}
function prevPage() { goPage(page.value - 1) }
function nextPage() { goPage(page.value + 1) }

/** 解析字段选项为统一 {value,label} 形式 */
function getOptions(f: FieldDef): { value: string; label: string }[] {
  let raw: SelectOption[] = []
  if (!f.options) {
    // classId 字段未显式传 options 时，自动使用班级列表
    if (f.key === 'classId') return classOptions.value as { value: string; label: string }[]
    return []
  }
  raw = typeof f.options === 'function' ? f.options() : f.options
  return raw.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
}

/** 根据 value 查 label（列表展示 classId 等字段时用） */
function labelOf(f: FieldDef, val: any): string {
  if (val == null || val === '') return ''
  const opts = getOptions(f)
  const hit = opts.find(o => o.value === val)
  return hit ? hit.label : String(val)
}

function openCreate() {
  editing.value = null
  form.value = { ...props.defaults }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { ...row }
  showForm.value = true
}

async function submitForm() {
  // 校验必填
  for (const f of props.fields) {
    if (f.required && (form.value[f.key] == null || form.value[f.key] === '')) {
      toast.warning(`${f.label}必填`)
      return
    }
    // 格式校验（仅当值非空时）
    if (f.pattern && form.value[f.key]) {
      const val = String(form.value[f.key]).trim()
      if (val && !f.pattern.test(val)) {
        toast.warning(f.patternHint || `${f.label}格式不正确`)
        return
      }
    }
  }
  formLoading.value = true
  try {
    const request = (await import('@/api/request')).default
    if (editing.value) {
      const res = await request.patch(`${props.apiPath}/${editing.value.id}`, form.value)
      // 本地同步
      const idx = items.value.findIndex(x => x.id === editing.value.id)
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...form.value, ...res }
    } else {
      const res = await request.post(props.apiPath, form.value)
      if (res?.id) items.value.unshift(res)
      else await loadList()
    }
    showForm.value = false
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(row: any) {
  if (!await confirm(`确定删除该「${props.title}」？`)) return
  try {
    const request = (await import('@/api/request')).default
    await request.delete(`${props.apiPath}/${row.id}`)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}

function fmtVal(row: any, f: FieldDef): string {
  if (f.render) return f.render(row)
  const v = row[f.key]
  if (v == null || v === '') return '-'
  if (Array.isArray(v)) {
    // tags 类型：将每个 value 映射为 label 展示
    if (f.type === 'tags') {
      const opts = getOptions(f)
      return v.map((item: string) => {
        const hit = opts.find(o => o.value === item)
        return hit ? hit.label : item
      }).join(', ')
    }
    return v.join(', ')
  }
  if (f.type === 'datetime' && v) return new Date(v).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  if (f.type === 'date' && v) return new Date(v).toLocaleDateString('zh-CN').replace(/\//g, '-')
  // select 字段展示 label（如 classId → 班级名）
  if (f.type === 'select') return labelOf(f, v)
  return String(v)
}

/** 暴露刷新方法，供父页面在数据变化后（如懒初始化）主动重载列表 */
defineExpose({ reload: loadList })
</script>

<template>
  <div class="card-soft">
    <!-- 顶栏 -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <h1 class="text-2xl font-bold text-cocoa-900">{{ title }}管理</h1>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-if="classFilterable !== false"
          v-model="classId"
          aria-label="按班级筛选"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">全部班级</option>
          <option v-for="opt in classOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="relative flex-1 min-w-[160px] sm:flex-none">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索"
            aria-label="搜索"
            class="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="btn-pill bg-butter-500 text-white hover:bg-butter-600"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th v-for="f in listFields" :key="f.key" :class="['px-4 py-3 font-medium', f.width]">{{ f.label }}</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td :colspan="listFields.length + 1" class="py-12" role="status" aria-live="polite">
              <div class="flex flex-col items-center gap-2">
                <div class="w-6 h-6 border-2 border-butter-500 border-t-transparent rounded-full animate-spin" />
                <span class="text-sm">加载中…</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td :colspan="listFields.length + 1" class="py-12" role="status" aria-live="polite">
              <div class="flex flex-col items-center gap-1">
                <Inbox class="w-8 h-8 text-cocoa-300" />
                <span class="text-sm">暂无数据</span>
              </div>
            </td>
          </tr>
          <tr v-for="row in displayedItems" :key="row.id" class="hover:bg-cream-50 transition-colors">
            <td v-for="f in listFields" :key="f.key" class="px-4 py-3 text-cocoa-700">{{ fmtVal(row, f) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" aria-label="编辑" @click="openEdit(row)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1" title="删除" aria-label="删除" @click="handleDelete(row)">
                <Trash2 class="w-4 h-4" />
              </button>
              <button
                v-for="act in (extraActions ? extraActions(row) : [])"
                :key="act.label"
                class="ml-1 text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30"
                @click="act.onClick(row)"
              >{{ act.label }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页栏 -->
    <div v-if="totalFiltered > pageSize" class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-cream-100">
      <span class="text-xs text-cocoa-400">共 {{ totalFiltered }} 条</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="page === 0"
          @click="prevPage"
        >上一页</button>
        <span class="text-xs text-cocoa-500">第 {{ page + 1 }}/{{ totalPages }} 页</span>
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
          :disabled="page + 1 >= totalPages"
          @click="nextPage"
        >下一页</button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-cocoa-400">每页</span>
        <select v-model.number="pageSize" aria-label="每页条数" class="px-2 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="goPage(0)">
          <option :value="5">5 条</option>
          <option :value="10">10 条</option>
          <option :value="20">20 条</option>
          <option :value="50">50 条</option>
        </select>
      </div>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editing ? `编辑${title}` : `新增${title}`" width="max-w-2xl">
    <div class="space-y-3">
      <div v-for="f in fields" :key="f.key" :class="f.type === 'textarea' ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'">
        <div :class="f.type === 'textarea' ? '' : 'col-span-1'">
          <label class="text-sm text-cocoa-500">
            {{ f.label }}<span v-if="f.required" class="text-red-500">*</span>
          </label>
          <input
            v-if="!f.type || f.type === 'text' || f.type === 'date' || f.type === 'datetime'"
            v-model="form[f.key]"
            :type="f.type === 'date' ? 'date' : (f.type === 'datetime' ? 'datetime-local' : 'text')"
            :placeholder="f.placeholder"
            :readonly="f.readonly"
            :aria-label="f.label"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
          <input
            v-else-if="f.type === 'number'"
            v-model.number="form[f.key]"
            type="number"
            :placeholder="f.placeholder"
            :aria-label="f.label"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
          <select
            v-else-if="f.type === 'select'"
            v-model="form[f.key]"
            :aria-label="f.label"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          >
            <option value="">请选择</option>
            <option v-for="opt in getOptions(f)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <textarea
            v-else-if="f.type === 'textarea'"
            v-model="form[f.key]"
            rows="4"
            :placeholder="f.placeholder"
            :aria-label="f.label"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none"
          />
          <div v-else-if="f.type === 'tags'">
            <div class="flex flex-wrap gap-1.5 mt-1">
              <button
                v-for="opt in getOptions(f)"
                :key="opt.value"
                type="button"
                :class="[
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  (form[f.key] || []).includes(opt.value)
                    ? 'border-butter-400 bg-butter-100 text-butter-600'
                    : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
                ]"
                @click="() => { if (!form[f.key]) form[f.key] = []; const i = form[f.key].indexOf(opt.value); if (i >= 0) form[f.key].splice(i, 1); else form[f.key].push(opt.value) }"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="formLoading"
        @click="submitForm"
      >
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>
