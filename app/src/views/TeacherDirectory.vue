<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTeacherStore } from '../stores/teacher'
import { useClassStore } from '../stores/class'
import type { Teacher, TeachingEntry } from '../types'
import Modal from '../components/common/Modal.vue'
import { Search, Star, Phone, Mail, Plus, Edit, Trash2, Save, X, Copy, Briefcase, Users, BookOpen } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'

const teacherStore = useTeacherStore()
const classStore = useClassStore()
const toast = useToastStore()

const { search, searchDebounced } = useDebouncedSearch(200)
const subjectFilter = ref('all')

const subjectOptions = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学',
  '综合实践', '信息技术', '劳动', '阅读', '午自习', '课后服务',
]
const positionOptions = [
  '教师', '班主任', '副班主任', '教研组长', '年级组长', '学科带头人',
  '教务主任', '德育主任', '校长', '副校长', '其他',
]
const avatarOptions = ['👩‍🏫', '🧑‍🏫', '🧑', '👩', '👨‍🏫', '🎨', '🏃', '🎵', '🔬', '🌱']

// 展开"年级+班级+学科"为可选 entries
const teachingOptions = computed(() => {
  const list: { classId: string; subject: string; label: string }[] = []
  for (const c of classStore.classes) {
    for (const s of subjectOptions) {
      list.push({
        classId: c.id,
        subject: s,
        label: `${c.grade}（${c.classNo}）${c.name} · ${s}`,
      })
    }
  }
  return list
})

const subjects = computed(() =>
  Array.from(new Set(teacherStore.teachers.flatMap((t) => t.teachings.map((x) => x.subject)))),
)

const filtered = computed(() => {
  let list = [...teacherStore.teachers]
  if (subjectFilter.value !== 'all')
    list = list.filter((t) => t.teachings.some((x) => x.subject === subjectFilter.value))
  if (searchDebounced.value.trim()) {
    const kw = searchDebounced.value.trim().toLowerCase()
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        t.position.toLowerCase().includes(kw) ||
        t.teachings.some((x) => x.subject.toLowerCase().includes(kw)),
    )
  }
  return list.sort((a, b) => Number(b.isStarred) - Number(a.isStarred))
})

const starred = computed(() => filtered.value.filter((t) => t.isStarred))
const unstarred = computed(() => filtered.value.filter((t) => !t.isStarred))

function teachingSummary(t: Teacher) {
  if (!t.teachings.length) return '未设置任教'
  return t.teachings
    .slice(0, 2)
    .map((e) => {
      const c = classStore.getClass(e.classId)
      return c ? `${c.grade}（${c.classNo}）${e.subject}` : e.subject
    })
    .join('、') + (t.teachings.length > 2 ? ` 等 ${t.teachings.length} 项` : '')
}

function copy(t: Teacher) {
  const text = `${t.name} 老师\n${t.position}\n任教：${t.teachings
    .map((e) => {
      const c = classStore.getClass(e.classId)
      return c ? `${c.name} · ${e.subject}` : e.subject
    })
    .join('；')}\n📞 ${t.phone}\n✉ ${t.email}`
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制到剪贴板'),
    () => toast.error('复制失败，请手动复制'),
  )
}

// 编辑
const editOpen = ref(false)
const editId = ref<string | null>(null)
const draft = ref<Omit<Teacher, 'id'>>({
  name: '',
  position: '教师',
  phone: '',
  email: '',
  teachings: [],
  remark: '',
  joinAt: new Date().toISOString().slice(0, 7),
  avatar: '👩‍🏫',
  isStarred: false,
})

function openCreate() {
  editId.value = null
  draft.value = {
    name: '',
    position: '教师',
    phone: '',
    email: '',
    teachings: [],
    remark: '',
    joinAt: new Date().toISOString().slice(0, 7),
    avatar: '👩‍🏫',
    isStarred: false,
  }
  editOpen.value = true
}

function openEdit(t: Teacher) {
  editId.value = t.id
  draft.value = { ...t, teachings: [...t.teachings] }
  editOpen.value = true
}

function isEntrySelected(e: TeachingEntry) {
  return draft.value.teachings.some((x) => x.classId === e.classId && x.subject === e.subject)
}

function toggleEntry(e: TeachingEntry) {
  const i = draft.value.teachings.findIndex((x) => x.classId === e.classId && x.subject === e.subject)
  if (i >= 0) draft.value.teachings.splice(i, 1)
  else draft.value.teachings.push({ classId: e.classId, subject: e.subject })
}

function teachingByGrade(g: string) {
  return classStore.classes.filter((c) => c.grade === g)
}

function save() {
  if (!draft.value.name.trim()) {
    toast.warning('请填写姓名')
    return
  }
  if (editId.value) {
    teacherStore.updateTeacher(editId.value, draft.value)
    toast.success('已更新')
  } else {
    teacherStore.addTeacher(draft.value)
    toast.success('已添加同事')
  }
  editOpen.value = false
}

function remove(t: Teacher) {
  if (!confirm(`确定删除「${t.name} 老师」吗？`)) return
  teacherStore.removeTeacher(t.id)
  toast.info('已删除')
}

// 从「班级管理」跳转过来时自动打开添加
onMounted(() => {
  if (sessionStorage.getItem('trace-open-add-teacher') === '1') {
    sessionStorage.removeItem('trace-open-add-teacher')
    openCreate()
  }
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row gap-3 md:items-center justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300"
            :size="14"
          />
          <input
            v-model="search"
            class="input-soft !pl-9 !py-2 text-sm w-56"
            placeholder="搜索姓名/职务/学科"
          >
        </div>
        <select
          v-model="subjectFilter"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部学科
          </option>
          <option
            v-for="s in subjects"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 添加同事
      </button>
    </div>

    <!-- 常用 -->
    <section v-if="starred.length">
      <div class="text-xs text-cocoa-500 mb-2 flex items-center gap-1.5">
        <Star
          :size="12"
          class="fill-butter-500 text-butter-500"
        /> 常用联系人
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="t in starred"
          :key="t.id"
          class="card-soft p-4 relative hover:-translate-y-0.5 transition"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-14 h-14 rounded-2xl bg-butter-300/70 flex items-center justify-center text-3xl shadow-softer"
            >
              {{ t.avatar }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="title-display text-lg truncate">
                {{ t.name }}
              </div>
              <div class="text-xs text-cocoa-500 truncate flex items-center gap-1">
                <Briefcase :size="10" /> {{ t.position || '教师' }}
              </div>
            </div>
            <button
              class="text-butter-500 hover:scale-110 transition"
              @click="teacherStore.toggleStar(t.id)"
              title="取消常用"
            >
              <Star
                :size="16"
                class="fill-butter-500"
              />
            </button>
          </div>
          <div class="mt-2 text-xs text-cocoa-700 leading-relaxed line-clamp-2">
            <BookOpen
              :size="11"
              class="inline-block align-text-bottom text-cocoa-500"
            />
            {{ teachingSummary(t) }}
          </div>
          <div class="mt-2 space-y-1.5 text-xs text-cocoa-700">
            <a
              v-if="t.phone"
              :href="`tel:${t.phone}`"
              class="flex items-center gap-1.5 text-sky2-500 hover:underline"
            >
              <Phone :size="12" /> {{ t.phone }}
            </a>
            <a
              v-if="t.email"
              :href="`mailto:${t.email}`"
              class="flex items-center gap-1.5 text-sakura-500 hover:underline truncate"
            >
              <Mail :size="12" /> {{ t.email }}
            </a>
          </div>
          <div class="mt-3 flex justify-between items-center">
            <button
              class="btn-secondary !py-1.5 !px-3 text-xs"
              @click="copy(t)"
            >
              <Copy :size="12" /> 复制
            </button>
            <div class="flex gap-1">
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                @click="openEdit(t)"
              >
                <Edit :size="13" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                @click="remove(t)"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 全部 -->
    <section>
      <div class="text-xs text-cocoa-500 mb-2">
        全部同事
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="t in unstarred"
          :key="t.id"
          class="card-flat p-4 hover:shadow-soft transition relative"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-2xl bg-cream-200 flex items-center justify-center text-2xl"
            >
              {{ t.avatar }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">
                {{ t.name }}
              </div>
              <div class="text-xs text-cocoa-500 truncate flex items-center gap-1">
                <Briefcase :size="10" /> {{ t.position || '教师' }}
              </div>
            </div>
            <button
              class="text-cocoa-300 hover:text-butter-500 transition"
              @click="teacherStore.toggleStar(t.id)"
              title="设为常用"
            >
              <Star :size="16" />
            </button>
          </div>
          <div class="mt-2 text-xs text-cocoa-700 leading-relaxed line-clamp-2">
            <BookOpen
              :size="11"
              class="inline-block align-text-bottom text-cocoa-500"
            />
            {{ teachingSummary(t) }}
          </div>
          <div class="mt-2 space-y-1.5 text-xs text-cocoa-700">
            <a
              v-if="t.phone"
              :href="`tel:${t.phone}`"
              class="flex items-center gap-1.5 text-sky2-500 hover:underline"
            >
              <Phone :size="12" /> {{ t.phone }}
            </a>
            <a
              v-if="t.email"
              :href="`mailto:${t.email}`"
              class="flex items-center gap-1.5 text-sakura-500 hover:underline truncate"
            >
              <Mail :size="12" /> {{ t.email }}
            </a>
          </div>
          <div class="mt-3 flex justify-between items-center">
            <button
              class="btn-ghost !py-1 !px-2 text-xs"
              @click="copy(t)"
            >
              <Copy :size="12" /> 复制
            </button>
            <div class="flex gap-1">
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                @click="openEdit(t)"
              >
                <Edit :size="13" />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                @click="remove(t)"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- 空状态：完全没有老师数据 -->
      <div
        v-if="!teacherStore.teachers.length"
        class="text-center py-16"
      >
        <div class="text-5xl mb-4">
          👥
        </div>
        <h3 class="text-lg font-medium text-cocoa-900 mb-2">
          还没有教师通讯录
        </h3>
        <p class="text-sm text-cocoa-500 mb-5 max-w-sm mx-auto">
          添加同事信息，方便后续在班级管理、课表排版中快速选择任教老师
        </p>
        <button
          class="btn-primary inline-flex items-center gap-2"
          @click="openCreate"
        >
          <Plus :size="16" /> 添加第一位同事
        </button>
      </div>

      <!-- 空状态：搜索/筛选无结果 -->
      <div
        v-else-if="!filtered.length"
        class="text-center text-cocoa-500 py-10"
      >
        <div class="text-3xl mb-2">
          🔍
        </div>
        <p class="text-sm">找不到匹配的老师</p>
        <p class="text-xs text-cocoa-400 mt-1">试试调整搜索关键词或筛选条件</p>
      </div>
    </section>

    <Modal
      :open="editOpen"
      :title="editId ? '编辑同事' : '添加同事'"
      width="640px"
      @close="editOpen = false"
    >
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">姓名 *</label>
            <input
              v-model="draft.name"
              class="input-soft mt-1"
              placeholder="如：李老师"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">教师职务</label>
            <select
              v-model="draft.position"
              class="input-soft mt-1"
            >
              <option
                v-for="p in positionOptions"
                :key="p"
                :value="p"
              >
                {{ p }}
              </option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">头像</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <button
              v-for="a in avatarOptions"
              :key="a"
              class="w-9 h-9 rounded-xl text-xl flex items-center justify-center border transition"
              :class="
                draft.avatar === a
                  ? 'bg-butter-300 border-butter-500'
                  : 'bg-cream-100 border-transparent hover:border-butter-200'
              "
              @click="draft.avatar = a"
            >
              {{ a }}
            </button>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              <BookOpen :size="11" /> 任教班级学科
            </label>
            <span class="text-[10px] text-cocoa-500">已选 {{ draft.teachings.length }} 项</span>
          </div>
          <div
            v-if="!classStore.classes.length"
            class="text-center text-xs text-cocoa-500 py-3 mt-1 card-flat"
          >
            请先到「班级管理」创建班级
          </div>
          <div
            v-else
            class="space-y-2 mt-1 max-h-[280px] overflow-y-auto pr-1"
          >
            <div
              v-for="g in Array.from(new Set(classStore.classes.map((c) => c.grade)))"
              :key="g"
              class="card-flat p-2"
            >
              <div class="text-xs font-medium text-cocoa-500 mb-1.5">
                {{ g }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in teachingByGrade(g)"
                  :key="c.id + '|block'"
                  class="chip border transition cursor-pointer"
                  :class="
                    draft.teachings.some((x) => x.classId === c.id)
                      ? 'bg-butter-200 border-butter-400 text-cocoa-900'
                      : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
                  "
                  @click="() => {
                    // 切换显示该班级的所有学科选项
                    const showing = draft.teachings.some((x) => x.classId === c.id)
                    if (showing) {
                      draft.teachings = draft.teachings.filter((x) => x.classId !== c.id)
                    } else {
                      // 默认勾选「语文」为示例
                      draft.teachings.push({ classId: c.id, subject: '语文' })
                    }
                  }"
                >
                  {{ c.name }}
                  <span class="text-[10px] text-cocoa-300">({{ c.classNo }}班)</span>
                </button>
              </div>
              <div
                v-for="c in teachingByGrade(g)"
                :key="c.id + '|sub'"
                class="mt-1.5 pl-2"
              >
                <template v-if="draft.teachings.some((x) => x.classId === c.id) || true">
                  <div
                    class="text-[10px] text-cocoa-500 mt-1"
                    v-if="draft.teachings.some((x) => x.classId === c.id)"
                  >
                    {{ c.name }} 任教学科：
                  </div>
                  <div
                    v-if="draft.teachings.some((x) => x.classId === c.id)"
                    class="flex flex-wrap gap-1.5 mt-1"
                  >
                    <button
                      v-for="s in subjectOptions"
                      :key="c.id + s"
                      class="chip border transition cursor-pointer text-[11px]"
                      :class="
                        draft.teachings.some((x) => x.classId === c.id && x.subject === s)
                          ? 'bg-butter-300 border-butter-500 text-cocoa-900 shadow-softer'
                          : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
                      "
                      @click="toggleEntry({ classId: c.id, subject: s })"
                    >
                      {{ s }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">电话</label>
            <input
              v-model="draft.phone"
              class="input-soft mt-1"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">邮箱</label>
            <input
              v-model="draft.email"
              class="input-soft mt-1"
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="draft.isStarred"
            type="checkbox"
            class="accent-butter-500"
          >
          设为常用联系人
        </label>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="editOpen = false"
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
