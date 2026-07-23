<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore, termOptions } from '../stores/user'
import { useClassStore } from '../stores/class'
import { useGradeStore } from '../stores/grade'
import { useNoteStore } from '../stores/note'
import { useTeacherStore } from '../stores/teacher'
import { useSchoolStore } from '../stores/school'
import { useExamStore } from '../stores/exam'
import { useAwardStore } from '../stores/award'
import { useTodoStore } from '../stores/todo'
import { useAIStore } from '../stores/ai'
import { useGeneratedStore } from '../stores/generated'
import { useRewardStore } from '../stores/reward'
import { avatarPool } from '../seed'
import { useRouter } from 'vue-router'
import { useToastStore } from '../stores/toast'
import { Save, Download, Upload, Trash2, LogOut, Sun, Moon, Edit, X, BookOpen, Calendar, School, Sparkles, Clock } from 'lucide-vue-next'
import { downloadJSON } from '../utils'
import { createBackup, getBackupList, restoreBackup, deleteBackup, exportBackup, importBackupFile, getAutoBackupEnabled, setAutoBackupEnabled, startAutoBackup, stopAutoBackup } from '../utils/backup'

const userStore = useUserStore()
const classStore = useClassStore()
const gradeStore = useGradeStore()
const noteStore = useNoteStore()
const teacherStore = useTeacherStore()
const schoolStore = useSchoolStore()
const examStore = useExamStore()
const awardStore = useAwardStore()
const todoStore = useTodoStore()
const aiStore = useAIStore()
const generatedStore = useGeneratedStore()
const rewardStore = useRewardStore()
const router = useRouter()
const toast = useToastStore()

// ====== 自动备份开关 ======
const autoBackupOn = ref(getAutoBackupEnabled())
function toggleAutoBackup(v: boolean) {
  autoBackupOn.value = v
  setAutoBackupEnabled(v)
  if (v) startAutoBackup()
  else stopAutoBackup()
}

const editing = ref(false)
const draft = ref({ ...(userStore.user || {}) } as any)

const allSubjects = [
  '语文',
  '数学',
  '英语',
  '科学',
  '品德',
  '音乐',
  '美术',
  '体育',
  '综合实践',
  '信息技术',
]

const termList = computed(() => termOptions())

const colorOptions = [
  { value: 'butter', label: '奶黄', dotClass: 'bg-gradient-to-br from-butter-200 to-butter-400' },
  { value: 'mint', label: '薄荷', dotClass: 'bg-gradient-to-br from-mint-200 to-mint-400' },
  { value: 'sakura', label: '樱花', dotClass: 'bg-gradient-to-br from-sakura-200 to-sakura-400' },
  { value: 'sky', label: '天蓝', dotClass: 'bg-gradient-to-br from-sky2-200 to-sky2-400' },
] as const

function toggleSubject(s: string) {
  if (!Array.isArray(draft.value.subjects)) draft.value.subjects = []
  const i = draft.value.subjects.indexOf(s)
  if (i >= 0) draft.value.subjects.splice(i, 1)
  else draft.value.subjects.push(s)
}

function save() {
  if (!draft.value.name?.trim()) {
    toast.warning('请填写姓名')
    return
  }
  // 同步 subject 为 subjects 第一个
  if (Array.isArray(draft.value.subjects) && draft.value.subjects.length) {
    draft.value.subject = draft.value.subjects[0]
  }
  if (!draft.value.term?.trim()) {
    draft.value.term = userStore.user?.term || ''
  }
  // 兜底: 避免 school 字段为空
  if (typeof draft.value.school !== 'string') draft.value.school = ''
  userStore.update(draft.value)
  editing.value = false
  toast.success('已更新个人资料')
}

function exportData() {
  downloadJSON('园丁工作台-数据备份.json', {
    version: 1,
    user: userStore.user,
    classes: classStore.classes,
    students: classStore.students,
    grades: gradeStore.grades,
    notes: noteStore.notes,
    teachers: teacherStore.teachers,
    school: {
      schedules: schoolStore.schedules,
      homework: schoolStore.homework,
      notices: schoolStore.notices,
      resources: schoolStore.resources,
      attendance: schoolStore.attendance,
      pickerHistory: schoolStore.pickerHistory,
    },
    exams: examStore.exams,
    awards: awardStore.records,
    todos: todoStore.todos,
    aiSettings: aiStore.settings,
    generated: {
      papers: generatedStore.papers,
      lessonPlans: generatedStore.lessonPlans,
    },
    rewards: rewardStore.records,
    exportedAt: Date.now(),
  })
  toast.success('数据已导出')
}

const fileInput = ref<HTMLInputElement | null>(null)
function pickImport() {
  fileInput.value?.click()
}

function importData(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (data.user) userStore.$patch({ user: data.user })
      if (data.classes) classStore.replaceAll({ classes: data.classes, students: data.students || [] })
      if (data.students && !data.classes) classStore.replaceAll({ classes: classStore.classes, students: data.students })
      if (data.grades) gradeStore.replaceAll({ grades: data.grades })
      if (data.notes) noteStore.replaceAll({ notes: data.notes })
      if (data.teachers) teacherStore.replaceAll({ teachers: data.teachers })
      if (data.school) schoolStore.replaceAll(data.school)
      if (data.exams) examStore.replaceAll(data.exams)
      if (data.awards) awardStore.$patch({ records: data.awards })
      if (data.todos) todoStore.replaceAll({ todos: data.todos })
      if (data.aiSettings) aiStore.setSettings(data.aiSettings)
      if (data.generated) {
        if (data.generated.papers) generatedStore.$patch({ papers: data.generated.papers })
        if (data.generated.lessonPlans) generatedStore.$patch({ lessonPlans: data.generated.lessonPlans })
      }
      if (data.rewards) rewardStore.replaceAll({ records: data.rewards })
      toast.success('导入成功')
    } catch (err) {
      console.error(err)
      toast.error('数据格式不正确')
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

function resetData() {
  if (!confirm('确定清空所有数据吗？此操作不可恢复！')) return
  if (!confirm('真的要清空吗？建议先导出备份。')) return
  // 只清除当前用户的数据，不影响其他用户
  const userId = userStore.user?.id || 'public'
  const prefix = `trace.${userId}.`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
  toast.info('数据已清空，正在刷新')
  setTimeout(() => location.reload(), 800)
}

function logout() {
  if (!confirm('退出登录将保留所有数据，确定继续吗？')) return
  userStore.logout()
  router.push({ name: 'login' })
}

function goToSeed() {
  router.push({ path: '/dev/seed' })
}

// ====== 备份历史 ======
const backupList = ref(getBackupList())
const backupFileInput = ref<HTMLInputElement | null>(null)

function refreshBackups() {
  backupList.value = getBackupList()
}

function handleCreateBackup() {
  createBackup('手动备份')
  refreshBackups()
  toast.success('已创建备份')
}

function handleRestoreBackup(id: string) {
  if (!confirm('恢复备份将覆盖当前数据，确定继续吗？')) return
  restoreBackup(id)
}

function handleDeleteBackup(id: string) {
  if (!confirm('确定删除这个备份吗？')) return
  deleteBackup(id)
  refreshBackups()
  toast.info('已删除备份')
}

function handleExportBackup(id: string) {
  exportBackup(id)
  toast.success('备份已导出')
}

function handleImportBackup(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importBackupFile(file).then((ok) => {
    if (ok) {
      refreshBackups()
      toast.success('备份已导入')
    } else {
      toast.error('导入失败')
    }
  })
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div
    v-if="userStore.user"
    class="space-y-5"
  >
    <!-- 资料卡 -->
    <section
      class="card-soft p-6 lg:p-8 relative overflow-hidden bg-gradient-to-br from-butter-100 via-cream-50 to-sakura-100"
    >
      <div class="absolute -top-10 -right-10 text-8xl opacity-20 select-none animate-floaty">
        {{ userStore.user.avatar }}
      </div>
      <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div
          class="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center text-5xl shadow-pop"
        >
          {{ userStore.user.avatar }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="title-display text-2xl">
              {{ userStore.user.name }}
            </h2>
            <span class="chip bg-mint-100 text-mint-500">
              {{ userStore.user.subject }} 老师
            </span>
            <span
              v-if="userStore.user.term"
              class="chip bg-butter-100 text-butter-600"
            >
              <Calendar
                :size="11"
                class="inline"
              /> {{ userStore.user.term }}
            </span>
            <span
              v-if="userStore.user.school"
              class="chip bg-sky2-100 text-sky2-500"
            >
              <School
                :size="11"
                class="inline"
              /> {{ userStore.user.school }}
            </span>
          </div>
          <p class="hand text-lg mt-2 text-cocoa-700">
            "{{ userStore.user.motto }}"
          </p>
          <p class="text-xs text-cocoa-300 mt-2">
            加入时间：{{ new Date(userStore.user.createdAt).toLocaleString('zh-CN') }}
          </p>
        </div>
        <button
          class="btn-secondary"
          @click="editing = true"
        >
          <Edit :size="14" /> 编辑资料
        </button>
      </div>
    </section>

    <!-- 编辑资料 -->
    <section
      v-if="editing"
      class="card-soft p-6"
    >
      <h3 class="title-display text-lg mb-4">
        编辑资料
      </h3>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">老师称呼</label>
          <input
            v-model="draft.name"
            class="input-soft mt-1"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <School :size="11" /> 所在学校
          </label>
          <input
            v-model="draft.school"
            class="input-soft mt-1"
            placeholder="如：阳光小学"
            maxlength="30"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <Calendar :size="11" /> 任教学期
          </label>
          <div class="mt-1 flex gap-2">
            <select
              v-model="draft.term"
              class="input-soft flex-1"
            >
              <option
                v-for="t in termList"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
            <input
              v-model="draft.term"
              class="input-soft flex-1"
              placeholder="或自定义, 如 2026春季学期"
            >
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
            <BookOpen :size="11" /> 任教学科（可多选）
          </label>
          <div class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="s in allSubjects"
              :key="s"
              type="button"
              class="chip border transition"
              :class="
                (draft.subjects || []).includes(s)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleSubject(s)"
            >
              {{ (draft.subjects || []).includes(s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
          <div
            v-if="(draft.subjects || []).length"
            class="text-[10px] text-cocoa-500 mt-1.5"
          >
            已选 {{ draft.subjects.length }} 个学科
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">教育格言</label>
          <input
            v-model="draft.motto"
            class="input-soft mt-1"
            maxlength="50"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">头像</label>
          <div class="grid grid-cols-8 gap-2 p-2 rounded-2xl bg-white/60 border border-white/80 mt-1">
            <button
              v-for="a in avatarPool"
              :key="a"
              class="aspect-square rounded-xl text-2xl flex items-center justify-center transition"
              :class="draft.avatar === a ? 'bg-butter-300 scale-110 shadow-softer' : 'hover:bg-butter-100'"
              @click="draft.avatar = a"
            >
              {{ a }}
            </button>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="btn-secondary"
            @click="editing = false"
          >
            取消
          </button>
          <button
            class="btn-primary"
            @click="save"
          >
            <Save :size="14" /> 保存
          </button>
        </div>
      </div>
    </section>

    <!-- 外观设置 -->
    <section class="card-soft p-6">
      <h3 class="title-display text-lg mb-4">
        外观设置
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- 切换主题（明暗）：单按钮切换 -->
        <div>
          <div class="text-sm font-medium text-cocoa-700 mb-2">
            主题模式
          </div>
          <button
            class="card-flat w-full p-3 flex items-center gap-3 transition hover:shadow-soft"
            @click="userStore.toggleDark()"
          >
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center"
              :class="userStore.theme === 'dark' ? 'bg-cocoa-700' : 'bg-butter-100'"
            >
              <Moon v-if="userStore.theme === 'dark'" :size="18" class="text-butter-300" />
              <Sun v-else :size="18" class="text-butter-500" />
            </div>
            <div class="text-left">
              <div class="text-sm font-medium">
                {{ userStore.theme === 'dark' ? '暗色模式' : '明亮模式' }}
              </div>
              <div class="text-[11px] text-cocoa-500">
                点击切换为{{ userStore.theme === 'dark' ? '明亮' : '暗黑' }}模式
              </div>
            </div>
          </button>
        </div>

        <!-- 主题色：单按钮按固定顺序循环切换 -->
        <div>
          <div class="text-sm font-medium text-cocoa-700 mb-2">
            主题色
          </div>
          <button
            class="card-flat w-full p-3 flex items-center gap-3 transition hover:shadow-soft"
            @click="userStore.cycleThemeColor()"
          >
            <div
              class="w-9 h-9 rounded-full"
              :class="(colorOptions.find((c) => c.value === userStore.colorScheme) || colorOptions[0]).dotClass"
            />
            <div class="text-left">
              <div class="text-sm font-medium">
                {{ (colorOptions.find((c) => c.value === userStore.colorScheme) || colorOptions[0]).label }}
              </div>
              <div class="text-[11px] text-cocoa-500">
                点击切换下一种主题色
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="card-soft p-6">
      <h3 class="title-display text-lg mb-3">
        数据管理
      </h3>
      <div class="grid sm:grid-cols-2 gap-3">
        <button
          class="card-flat p-4 text-left hover:shadow-soft transition"
          @click="exportData"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-mint-300 flex items-center justify-center">
              <Download :size="18" />
            </div>
            <div>
              <div class="font-medium">
                导出数据
              </div>
              <div class="text-xs text-cocoa-500">
                将所有数据备份为 JSON
              </div>
            </div>
          </div>
        </button>
        <button
          class="card-flat p-4 text-left hover:shadow-soft transition"
          @click="pickImport"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-sky2-300 flex items-center justify-center">
              <Upload :size="18" />
            </div>
            <div>
              <div class="font-medium">
                导入数据
              </div>
              <div class="text-xs text-cocoa-500">
                从备份文件恢复
              </div>
            </div>
          </div>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="importData"
        >
        <button
          class="card-flat p-4 text-left hover:shadow-soft transition"
          @click="goToSeed"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-sakura-200 flex items-center justify-center">
              <Sparkles
                :size="18"
                class="text-sakura-500"
              />
            </div>
            <div>
              <div class="font-medium">
                添加演示数据
              </div>
              <div class="text-xs text-cocoa-500">
                一键生成班级、学生、成绩等示例
              </div>
            </div>
          </div>
        </button>
        <button
          class="card-flat p-4 text-left hover:shadow-soft transition"
          @click="resetData"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-sakura-300 flex items-center justify-center">
              <Trash2 :size="18" />
            </div>
            <div>
              <div class="font-medium text-sakura-500">
                清空所有数据
              </div>
              <div class="text-xs text-cocoa-500">
                不可恢复，请先备份
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>

    <!-- 备份历史 -->
    <section class="card-soft p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="title-display text-lg flex items-center gap-2">
          <Clock /> 备份历史
        </h3>
        <div class="flex items-center gap-2">
          <button class="btn-flat text-sm" @click="backupFileInput?.click()">
            <Upload :size="14" /> 导入备份
          </button>
          <button class="btn-soft text-sm" @click="handleCreateBackup">创建备份</button>
        </div>
      </div>
      <input
        ref="backupFileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleImportBackup"
      >
      <!-- 自动备份开关 -->
      <div class="flex items-center justify-between card-flat p-3">
        <div>
          <div class="text-sm font-medium text-cocoa-700 flex items-center gap-1.5">
            <Clock :size="14" /> 自动备份
          </div>
          <div class="text-[11px] text-cocoa-500 mt-0.5">
            开启后系统每 2 小时自动备份一次
          </div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="autoBackupOn"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          :class="autoBackupOn ? 'bg-mint-500' : 'bg-cocoa-300'"
          @click="toggleAutoBackup(!autoBackupOn)"
        >
          <span
            class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            :class="autoBackupOn ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
      </div>
      <p class="text-xs text-cocoa-400">系统每 2 小时自动备份一次（可在上方开关关闭），最多保留 10 个版本</p>
      <div v-if="backupList.length === 0" class="text-sm text-cocoa-300 py-4 text-center">
        暂无备份记录
      </div>
      <div v-else class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="b in backupList"
          :key="b.id"
          class="flex items-center justify-between p-3 rounded-xl bg-cream-100/50 hover:bg-cream-200/50 transition"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-cocoa-700">{{ b.label || '备份' }}</div>
            <div class="text-xs text-cocoa-400">
              {{ new Date(b.timestamp).toLocaleString('zh-CN') }} · {{ (b.size / 1024).toFixed(1) }}KB
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn-flat text-xs !px-2 !py-1" @click="handleExportBackup(b.id)" title="下载">
              <Download class="w-3.5 h-3.5" />
            </button>
            <button class="btn-flat text-xs !px-2 !py-1 text-mint-600" @click="handleRestoreBackup(b.id)" title="恢复">
              <Upload class="w-3.5 h-3.5" />
            </button>
            <button class="btn-flat text-xs !px-2 !py-1 text-sakura-500" @click="handleDeleteBackup(b.id)" title="删除">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 退出 -->
    <section class="card-soft p-6 flex items-center justify-between">
      <div>
        <h3 class="title-display text-lg">
          退出登录
        </h3>
        <p class="text-sm text-cocoa-500">
          保留所有数据，仅退出当前账号
        </p>
      </div>
      <button
        class="btn-secondary"
        @click="logout"
      >
        <LogOut :size="14" /> 退出
      </button>
    </section>
  </div>
</template>
