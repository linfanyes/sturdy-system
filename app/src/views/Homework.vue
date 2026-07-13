<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useSchoolStore } from '../stores/school'
import { useUserStore } from '../stores/user'
import type { Homework, HomeworkStatus } from '../types'
import Modal from '../components/common/Modal.vue'
import { Plus, Edit, Trash2, Save, X, NotebookText, Calendar, Filter, BookOpen, ChevronDown, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { formatDate, classSubjects } from '../utils'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const userStore = useUserStore()
const toast = useToastStore()

const statusFilters: ('全部' | HomeworkStatus)[] = [
  '全部',
  '待批改',
  '已批改',
  '已发还',
]
const filterClass = ref('all')
const filterStatus = ref<'全部' | HomeworkStatus>('全部')
const onlyMine = ref(true) // 只看我的任课
const filterSubject = ref('all')
const sortBy = ref<'deadline' | 'createdAt' | 'classId'>('deadline')

const myTeachingKeys = computed(() => {
  return new Set(userStore.teaching.map((t) => `${t.classId}|${t.subject}`))
})

const FALLBACK_HOMEWORK_SUBJECTS = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '综合实践', '信息技术', '劳动', '阅读', '午自习', '课后服务']

/** 根据当前选中的班级，动态展示可选学科 */
const subjects = computed<string[]>(() => {
  if (filterClass.value === 'all') return FALLBACK_HOMEWORK_SUBJECTS
  const c = classStore.getClass(filterClass.value)
  return classSubjects(c, FALLBACK_HOMEWORK_SUBJECTS)
})

const filtered = computed(() => {
  let list = [...schoolStore.homework]
  if (onlyMine.value) {
    list = list.filter((h) => myTeachingKeys.value.has(`${h.classId}|${h.subject}`))
  }
  if (filterClass.value !== 'all') list = list.filter((h) => h.classId === filterClass.value)
  if (filterSubject.value !== 'all') list = list.filter((h) => h.subject === filterSubject.value)
  if (filterStatus.value !== '全部') list = list.filter((h) => h.status === filterStatus.value)
  list.sort((a, b) => {
    if (sortBy.value === 'deadline') return +new Date(b.deadline) - +new Date(a.deadline)
    if (sortBy.value === 'createdAt') return b.createdAt - a.createdAt
    return (a.classId + a.subject).localeCompare(b.classId + b.subject)
  })
  return list
})

// 按班级分组
const grouped = computed(() => {
  const map = new Map<string, Homework[]>()
  for (const h of filtered.value) {
    const key = h.classId
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(h)
  }
  return Array.from(map.entries()).map(([cid, list]) => ({
    classId: cid,
    className: classStore.getClass(cid)?.name || '已删除班级',
    list,
  }))
})

const collapsed = ref<Set<string>>(new Set())
function toggleCollapse(cid: string) {
  if (collapsed.value.has(cid)) collapsed.value.delete(cid)
  else collapsed.value.add(cid)
  collapsed.value = new Set(collapsed.value)
}

const modalOpen = ref(false)
const editing = ref<Homework | null>(null)
const draft = ref<Omit<Homework, 'id' | 'createdAt'>>({
  classId: '',
  subject: '语文',
  title: '',
  content: '',
  startDate: new Date().toISOString().slice(0, 10),
  deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  status: '待批改',
})

function openCreate() {
  editing.value = null
  const defaultClass =
    filterClass.value !== 'all' ? filterClass.value : classStore.classes[0]?.id || ''
  const defaultSubject = (() => {
    if (filterSubject.value !== 'all') return filterSubject.value
    // 优先取我的任课第一项
    const mine = userStore.teaching.find((t) => t.classId === defaultClass)
    return mine?.subject || '语文'
  })()
  draft.value = {
    classId: defaultClass,
    subject: defaultSubject,
    title: '',
    content: '',
    startDate: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    status: '待批改',
  }
  modalOpen.value = true
}

function quickAssignToClass(cid: string) {
  editing.value = null
  const defaultSubject =
    userStore.teaching.find((t) => t.classId === cid)?.subject || '语文'
  draft.value = {
    classId: cid,
    subject: defaultSubject,
    title: '',
    content: '',
    startDate: new Date().toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    status: '待批改',
  }
  modalOpen.value = true
}

function openEdit(h: Homework) {
  editing.value = h
  draft.value = { ...h }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) {
    toast.warning('请填写作业标题')
    return
  }
  if (!draft.value.content.trim()) {
    toast.warning('请填写作业内容')
    return
  }
  if (+new Date(draft.value.deadline) < +new Date(draft.value.startDate)) {
    toast.warning('截止日期不能早于开始日期')
    return
  }
  if (editing.value) {
    const prevStatus = editing.value.status
    schoolStore.updateHomework(editing.value.id, draft.value)
    toast.success('已保存')
    // 状态变为已发还时，自动生成一条班级公告
    if (draft.value.status === '已发还' && prevStatus !== '已发还') {
      const cls = classStore.getClass(draft.value.classId)
      schoolStore.addNotice({
        classId: draft.value.classId,
        title: `${draft.value.title} 已发还`,
        content: `${cls?.name || ''}的「${draft.value.title}」作业已发还，请同学们查收。`,
        pinned: false,
      })
      toast.success(`已为「${draft.value.title}」生成发还通知`)
    }
  } else {
    schoolStore.addHomework(draft.value)
    toast.success('已布置作业')
  }
  modalOpen.value = false
}

function remove(h: Homework) {
  if (!confirm(`确定删除「${h.title}」吗？`)) return
  schoolStore.removeHomework(h.id)
  toast.info('已删除')
}

function quickMarkDone(h: Homework) {
  schoolStore.updateHomework(h.id, { ...h, status: '已批改' })
  toast.success('已标记为「已批改」')
}

const statusColor: Record<HomeworkStatus, string> = {
  待批改: 'bg-sakura-100 text-sakura-500',
  已批改: 'bg-mint-100 text-mint-500',
  已发还: 'bg-sky2-100 text-sky2-500',
}

const totalCount = computed(() => filtered.value.length)
const pendingCount = computed(() => filtered.value.filter((h) => h.status === '待批改').length)
const doneCount = computed(() => filtered.value.filter((h) => h.status === '已批改' || h.status === '已发还').length)
</script>

<template>
  <div class="space-y-5">
    <!-- 顶部统计条 -->
    <div class="card-soft p-5 flex flex-col md:flex-row gap-3 md:items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-butter-300/70 flex items-center justify-center text-2xl">
          📝
        </div>
        <div>
          <div class="title-display text-xl">
            作业管理
          </div>
          <div class="text-xs text-cocoa-500 mt-0.5 flex flex-wrap items-center gap-3">
            <span>共 <b class="text-butter-600">{{ totalCount }}</b> 项</span>
            <span class="text-cocoa-300">|</span>
            <span>待批改 <b class="text-sakura-500">{{ pendingCount }}</b></span>
            <span class="text-cocoa-300">|</span>
            <span>已完成 <b class="text-mint-500">{{ doneCount }}</b></span>
          </div>
        </div>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 布置新作业
      </button>
    </div>

    <!-- 过滤条 -->
    <div class="card-soft p-3 flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 text-cocoa-500">
        <Filter :size="14" />
        <span class="text-xs">筛选：</span>
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer chip border bg-butter-100 border-butter-300 text-butter-700 hover:bg-butter-200">
        <input
          v-model="onlyMine"
          type="checkbox"
          class="accent-butter-500"
        >
        <Sparkles :size="11" />
        <span>只看我的任课</span>
      </label>
      <select
        v-model="filterClass"
        class="input-soft !py-1.5 text-sm w-auto"
      >
        <option value="all">
          所有班级
        </option>
        <option
          v-for="c in classStore.classes"
          :key="c.id"
          :value="c.id"
        >
          {{ c.name }}
        </option>
      </select>
      <select
        v-model="filterSubject"
        class="input-soft !py-1.5 text-sm w-auto"
      >
        <option value="all">
          所有学科
        </option>
        <option
          v-for="s in subjects"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <select
        v-model="filterStatus"
        class="input-soft !py-1.5 text-sm w-auto"
      >
        <option
          v-for="s in statusFilters"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <select
        v-model="sortBy"
        class="input-soft !py-1.5 text-sm w-auto"
      >
        <option value="deadline">
          按截止日期
        </option>
        <option value="createdAt">
          按布置时间
        </option>
        <option value="classId">
          按班级
        </option>
      </select>
    </div>

    <!-- 按班级分组 -->
    <div
      v-if="grouped.length"
      class="space-y-4"
    >
      <section
        v-for="g in grouped"
        :key="g.classId"
        class="card-soft overflow-hidden"
      >
        <header
          class="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-butter-50/40"
          @click="toggleCollapse(g.classId)"
        >
          <div class="flex items-center gap-2">
            <component
              :is="collapsed.has(g.classId) ? ChevronRight : ChevronDown"
              :size="14"
              class="text-cocoa-500"
            />
            <BookOpen
              :size="14"
              class="text-cocoa-500"
            />
            <span class="title-display text-base">{{ g.className }}</span>
            <span class="chip bg-white/70 text-cocoa-500 text-[10px]">{{ g.list.length }} 项</span>
          </div>
          <button
            class="btn-secondary !py-1 !px-2 text-xs"
            @click.stop="quickAssignToClass(g.classId)"
          >
            <Plus :size="12" /> 布置新作业
          </button>
        </header>
        <div
          v-if="!collapsed.has(g.classId)"
          class="border-t border-cocoa-100/60"
        >
          <div
            v-for="h in g.list"
            :key="h.id"
            class="px-5 py-4 flex flex-col md:flex-row md:items-start gap-3 border-b border-cocoa-100/40 last:border-b-0 hover:bg-butter-50/30 transition"
          >
            <div
              class="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
              :class="statusColor[h.status]"
            >
              <NotebookText :size="18" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="chip text-[10px]"
                  :class="statusColor[h.status]"
                >
                  {{ h.status }}
                </span>
                <span class="chip bg-butter-100 text-butter-600 text-[10px]">{{ h.subject }}</span>
                <h3 class="title-display text-base">
                  {{ h.title }}
                </h3>
              </div>
              <p class="text-sm text-cocoa-700 mt-1.5 whitespace-pre-wrap line-clamp-2">
                {{ h.content }}
              </p>
              <div class="text-xs text-cocoa-500 mt-2 flex flex-wrap gap-3">
                <span class="flex items-center gap-1">
                  <Calendar :size="11" /> {{ h.startDate }} ~ {{ h.deadline }}
                </span>
                <span class="text-cocoa-300">·</span>
                <span>📝 布置于 {{ formatDate(h.createdAt, 'MM-DD HH:mm') }}</span>
                <span
                  v-if="!myTeachingKeys.has(`${h.classId}|${h.subject}`)"
                  class="text-sakura-400"
                >
                  · 非我的任课
                </span>
              </div>
            </div>
            <div class="flex gap-1 self-end md:self-start shrink-0">
              <button
                v-if="h.status === '待批改'"
                class="p-1.5 rounded-full hover:bg-mint-100 text-mint-500"
                title="标记已批改"
                @click="quickMarkDone(h)"
              >
                <CheckCircle2 :size="14" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                title="编辑"
                @click="openEdit(h)"
              >
                <Edit :size="14" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                title="删除"
                @click="remove(h)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div
      v-else
      class="card-soft p-12 text-center text-cocoa-500"
    >
      <div class="text-5xl mb-2">
        📝
      </div>
      <div>{{ onlyMine ? '你还没有布置过作业，点下方按钮开始' : '暂无作业记录' }}</div>
      <button
        class="btn-primary mt-4"
        @click="openCreate"
      >
        <Plus :size="14" /> 布置一份
      </button>
    </div>

    <!-- 作业编辑/布置弹窗 -->
    <Modal
      :open="modalOpen"
      :title="editing ? '编辑作业' : '布置作业'"
      width="600px"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">班级</label>
            <select
              v-model="draft.classId"
              class="input-soft mt-1"
            >
              <option
                v-for="c in classStore.classes"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">学科</label>
            <select
              v-model="draft.subject"
              class="input-soft mt-1"
            >
              <option
                v-for="s in subjects"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
            <div
              v-if="myTeachingKeys.has(`${draft.classId}|${draft.subject}`)"
              class="text-[10px] text-mint-500 mt-1"
            >
              ✓ 是你的任课
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">开始日期</label>
            <input
              v-model="draft.startDate"
              type="date"
              class="input-soft mt-1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">截止日期</label>
            <input
              v-model="draft.deadline"
              type="date"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">作业标题 *</label>
          <input
            v-model="draft.title"
            class="input-soft mt-1"
            placeholder="如：背诵《静夜思》"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">具体内容 *</label>
          <textarea
            v-model="draft.content"
            class="input-soft mt-1 min-h-[140px]"
            placeholder="1. 朗读课文 3 遍&#10;2. 完成课后练习 1-3 题&#10;3. 家长签字"
          />
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">完成状态</label>
          <div class="flex gap-2 mt-1 flex-wrap">
            <button
              v-for="s in (['待批改', '已批改', '已发还'] as HomeworkStatus[])"
              :key="s"
              class="chip border"
              :class="
                draft.status === s
                  ? `${statusColor[s]} border-butter-500`
                  : 'bg-white/70 border-white-80 text-cocoa-700'
              "
              @click="draft.status = s"
            >
              {{ s }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="modalOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="save"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>
  </div>
</template>
