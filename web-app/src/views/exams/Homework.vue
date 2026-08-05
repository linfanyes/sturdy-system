<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses, classNameById } from '@/composables/useClasses'
import { onMounted, ref, computed } from 'vue'
import request from '@/api/request'
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
  Eye, ListChecks, Filter, Loader2, RefreshCw,
} from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => {
  loadClasses()
  loadHomework()
})

const SUBJECTS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

const fields: FieldDef[] = [
  { key: 'title', label: '作业标题', required: true },
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'subject', label: '科目', type: 'select', options: SUBJECTS, width: 'w-20' },
  { key: 'startDate', label: '开始日期', type: 'date', width: 'w-32' },
  { key: 'deadline', label: '截止日期', type: 'date', width: 'w-32' },
  { key: 'status', label: '状态', type: 'select', options: ['待批改', '批改中', '已批改', '已发布'], width: 'w-24' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '布置时间', type: 'datetime', width: 'w-40', readonly: true },
]

/* ============ 视图切换 ============ */
const view = ref<'list' | 'teaching'>('teaching')

/* ============ 教学视图数据 ============ */
const homework = ref<any[]>([])
const loading = ref(false)
const onlyMySubject = ref(true)

/** 当前教师任教学科集合（聚合自班级 subjects 字段，兜底为空） */
const mySubjects = computed<string[]>(() => {
  const set = new Set<string>()
  for (const c of classes.value || []) {
    const subs = (c as any).subjects
    if (Array.isArray(subs)) subs.forEach((s: string) => set.add(s))
  }
  return Array.from(set)
})

async function loadHomework() {
  loading.value = true
  try {
    const res: any = await request.get('/homework', { params: { take: 500 } })
    homework.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载作业失败')
    homework.value = []
  } finally {
    loading.value = false
  }
}

/** 应用"只看我的任课"过滤后的列表 */
const filteredHomework = computed(() => {
  if (!onlyMySubject.value || mySubjects.value.length === 0) return homework.value
  return homework.value.filter(h => !h?.subject || mySubjects.value.includes(h.subject))
})

/** 按 classId 分组（兜底用 className） */
const groupedByClass = computed(() => {
  const map = new Map<string, { classId: string; className: string; items: any[] }>()
  for (const h of filteredHomework.value) {
    const cid = h?.classId || h?.className || '未分组'
    const key = String(cid)
    if (!map.has(key)) {
      map.set(key, {
        classId: key,
        className: h?.className || classNameById(key) || key,
        items: [],
      })
    }
    map.get(key)!.items.push(h)
  }
  return Array.from(map.values())
})

/** 三段状态统计：待批改 / 已批改 / 已发还 */
function statsOf(items: any[]) {
  let pending = 0, graded = 0, returned = 0
  for (const it of items) {
    const s = it?.status
    if (s === '已发还' || s === '已发布') returned++
    else if (s === '已批改') graded++
    else pending++ // 含 '待批改' / '批改中' / 其他
  }
  const total = pending + graded + returned || 1
  const rate = total ? Math.round((returned / total) * 100) : 0
  return { pending, graded, returned, total: pending + graded + returned, rate }
}

/** 逾期未批改列表：status !== '已发还' 且 deadline 早于今天，按逾期天数排序 */
const overdueList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const list = filteredHomework.value.filter(h => {
    const s = h?.status
    if (s === '已发还' || s === '已发布') return false
    const dl = h?.deadline
    if (!dl) return false
    const d = new Date(dl)
    if (isNaN(d.getTime())) return false
    d.setHours(0, 0, 0, 0)
    return d.getTime() < today.getTime()
  })
  return list
    .map(h => {
      const d = new Date(h.deadline)
      d.setHours(0, 0, 0, 0)
      const days = Math.floor((today.getTime() - d.getTime()) / (24 * 3600 * 1000))
      return { hw: h, days }
    })
    .sort((a, b) => b.days - a.days)
})

/** 折叠状态：默认全部展开 */
const collapsed = ref<Record<string, boolean>>({})
function toggleGroup(key: string) {
  collapsed.value[key] = !collapsed.value[key]
}

/** 一键标记已批改 */
const marking = ref<Record<string, boolean>>({})
async function markGraded(h: any) {
  if (!h?.id) return
  if (marking.value[h.id]) return
  marking.value[h.id] = true
  try {
    const res: any = await request.patch('/homework/' + h.id, { status: '已批改' })
    // 本地同步
    const idx = homework.value.findIndex(x => x.id === h.id)
    if (idx >= 0) {
      homework.value[idx] = { ...homework.value[idx], status: '已批改', ...res }
    }
  } catch (e: any) {
    alert(e?.message || '标记失败')
  } finally {
    marking.value[h.id] = false
  }
}

function fmtDate(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return d.toLocaleDateString('zh-CN').replace(/\//g, '-')
}

function statusBadge(s?: string) {
  if (s === '已发还' || s === '已发布') return 'bg-mint-100 text-mint-500'
  if (s === '已批改') return 'bg-butter-100 text-butter-600'
  return 'bg-sakura-100 text-sakura-500'
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 + 视图切换 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900">作业管理</h1>
      <div class="flex items-center gap-2">
        <!-- 视图切换 Tab -->
        <div class="flex bg-cream-100 rounded-xl p-1">
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'teaching' ? 'bg-surface text-cocoa-900 shadow-softer' : 'text-cocoa-500 hover:text-cocoa-700',
            ]"
            @click="view = 'teaching'"
          >
            <Eye class="w-4 h-4" /> 教学视图
          </button>
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'list' ? 'bg-surface text-cocoa-900 shadow-softer' : 'text-cocoa-500 hover:text-cocoa-700',
            ]"
            @click="view = 'list'"
          >
            <ListChecks class="w-4 h-4" /> 列表管理
          </button>
        </div>
      </div>
    </div>

    <!-- 列表管理视图：CrudTable -->
    <CrudTable v-if="view === 'list'" api-path="homework" title="作业" :fields="fields" :defaults="{ status: '待批改' }" />

    <!-- 教学视图 -->
    <div v-else class="space-y-4">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between gap-3 flex-wrap bg-surface rounded-2xl p-3 shadow-softer">
        <label class="flex items-center gap-2 text-sm text-cocoa-700 cursor-pointer select-none">
          <Filter class="w-4 h-4 text-cocoa-500" />
          <input type="checkbox" v-model="onlyMySubject" class="accent-butter-500 w-4 h-4" />
          只看我的任课
          <span v-if="mySubjects.length" class="text-xs text-cocoa-400">({{ mySubjects.join('、') }})</span>
        </label>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors"
          :disabled="loading"
          @click="loadHomework"
        >
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" /> 刷新
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="bg-surface rounded-2xl p-8 shadow-softer flex items-center justify-center text-cocoa-400">
        <Loader2 class="w-5 h-5 animate-spin mr-2" /> 加载中…
      </div>

      <!-- 空数据 -->
      <div v-else-if="filteredHomework.length === 0" class="bg-surface rounded-2xl p-8 shadow-softer text-center text-cocoa-400">
        暂无作业数据
      </div>

      <template v-else>
        <!-- 逾期未批改提醒 -->
        <div v-if="overdueList.length" class="bg-sakura-100/60 border border-sakura-300 rounded-2xl p-4 shadow-softer">
          <div class="flex items-center gap-2 mb-3">
            <AlertTriangle class="w-5 h-5 text-sakura-500" />
            <h3 class="font-semibold text-cocoa-900">逾期未批改（{{ overdueList.length }}）</h3>
          </div>
          <ul class="space-y-2">
            <li
              v-for="item in overdueList"
              :key="item.hw.id"
              class="flex items-center justify-between gap-3 bg-surface rounded-xl px-3 py-2 text-sm"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="font-medium text-cocoa-900 truncate">{{ item.hw.title || '未命名作业' }}</span>
                <span class="text-xs text-cocoa-500 shrink-0">{{ item.hw.className || classNameById(item.hw.classId) || '-' }}</span>
                <span class="text-xs text-cocoa-400 shrink-0">截止 {{ fmtDate(item.hw.deadline) }}</span>
              </div>
              <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-sakura-500 text-white font-medium">
                逾期{{ item.days }}天
              </span>
              <button
                class="shrink-0 text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-50"
                :disabled="marking[item.hw.id]"
                @click="markGraded(item.hw)"
              >标记已批改</button>
            </li>
          </ul>
        </div>

        <!-- 班级分组卡片 -->
        <div v-for="group in groupedByClass" :key="group.classId" class="table-wrap">
          <!-- 班级头部 -->
          <button
            class="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-cream-50 transition-colors"
            @click="toggleGroup(group.classId)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <component
                :is="collapsed[group.classId] ? ChevronRight : ChevronDown"
                class="w-5 h-5 text-cocoa-400 shrink-0"
              />
              <h3 class="font-semibold text-cocoa-900 truncate">{{ group.className }}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-cocoa-700 shrink-0">
                {{ group.items.length }} 项作业
              </span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <template v-if="!collapsed[group.classId]">
                <span class="text-xs text-cocoa-500">完成率</span>
                <span class="text-sm font-semibold text-mint-500">{{ statsOf(group.items).rate }}%</span>
              </template>
            </div>
          </button>

          <!-- 班级内容（可折叠） -->
          <div v-show="!collapsed[group.classId]" class="border-t border-cream-100 px-5 py-4 space-y-4">
            <!-- 三段进度条 -->
            <div>
              <div class="flex items-center justify-between text-xs text-cocoa-500 mb-1.5">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sakura-400"></span>待批改 {{ statsOf(group.items).pending }}</span>
                  <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-butter-400"></span>已批改 {{ statsOf(group.items).graded }}</span>
                  <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-mint-400"></span>已发还 {{ statsOf(group.items).returned }}</span>
                </div>
                <span>完成率 {{ statsOf(group.items).rate }}%</span>
              </div>
              <div class="flex h-2 rounded-full overflow-hidden bg-cream-100">
                <div
                  :style="{ width: (statsOf(group.items).pending / statsOf(group.items).total * 100) + '%' }"
                  class="bg-sakura-400"
                ></div>
                <div
                  :style="{ width: (statsOf(group.items).graded / statsOf(group.items).total * 100) + '%' }"
                  class="bg-butter-400"
                ></div>
                <div
                  :style="{ width: (statsOf(group.items).returned / statsOf(group.items).total * 100) + '%' }"
                  class="bg-mint-400"
                ></div>
              </div>
            </div>

            <!-- 作业卡片列表 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="h in group.items"
                :key="h.id"
                class="border border-cream-200 rounded-xl p-3 hover:shadow-softer transition-shadow"
              >
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="font-medium text-cocoa-900 text-sm truncate">{{ h.title || '未命名作业' }}</div>
                  <span :class="['text-xs px-2 py-0.5 rounded-full shrink-0', statusBadge(h.status)]">
                    {{ h.status || '待批改' }}
                  </span>
                </div>
                <div class="text-xs text-cocoa-500 space-y-0.5 mb-3">
                  <div v-if="h.subject">科目：{{ h.subject }}</div>
                  <div>截止：{{ fmtDate(h.deadline) || '-' }}</div>
                </div>
                <button
                  v-if="h.status !== '已批改' && h.status !== '已发还' && h.status !== '已发布'"
                  class="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-50"
                  :disabled="marking[h.id]"
                  @click="markGraded(h)"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  {{ marking[h.id] ? '标记中…' : '标记已批改' }}
                </button>
                <div
                  v-else
                  class="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg bg-cream-100 text-cocoa-400"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" /> 已处理
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
