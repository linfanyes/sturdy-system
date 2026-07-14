<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSchoolStore } from '../../stores/school'
import { useTeacherStore } from '../../stores/teacher'
import { subjectPalette } from '../../seed'
import { Save, Printer, Plus, X, RefreshCw, Shuffle, Edit, Trash2, AlertTriangle, RotateCcw, Check } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { generateAutoSchedule } from '../../utils'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const teacherStore = useTeacherStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const days = ['一', '二', '三', '四', '五']
const totalPeriods = 8

const periodLabels = [
  '',
  '第 1 节',
  '第 2 节',
  '第 3 节',
  '第 4 节',
  '午自习',
  '第 6 节',
  '第 7 节',
  '课后服务',
]
const periodNumbers = [1, 2, 3, 4, 5, 6, 7, 8]

const subjectOptions = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学',
  '综合实践', '信息技术', '劳动', '阅读',
]
const fixedSubjects: Record<number, string> = { 5: '午自习', 8: '课后服务' }

// 当前班级 store 中的课表（只读原始数据）
const originalCells = computed(() => {
  const map: Record<string, { subject: string; teacher: string; note: string }> = {}
  for (const s of schoolStore.schedules) {
    if (s.classId !== classId.value) continue
    map[`${s.dayOfWeek}-${s.period}`] = {
      subject: s.subject,
      teacher: s.teacher,
      note: s.note,
    }
  }
  return map
})

// 草稿：覆盖在 store 之上
// - 普通键: { subject, teacher } —— 表示「已修改」
// - null: 表示「已清空」
const draftCells = ref<Record<string, { subject: string; teacher: string } | null>>({})

const draftCount = computed(() => Object.keys(draftCells.value).length)
const hasDraft = computed(() => draftCount.value > 0)

// 渲染用 cells：草稿优先
const cells = computed(() => {
  const map: Record<string, { subject: string; teacher: string; note: string; dirty?: boolean; cleared?: boolean }> = {}
  for (const k in originalCells.value) {
    map[k] = { ...originalCells.value[k] }
  }
  for (const k in draftCells.value) {
    const v = draftCells.value[k]
    if (v === null) {
      map[k] = { subject: '', teacher: '', note: '', cleared: true }
    } else {
      const orig = originalCells.value[k]
      // 已清空后又被编辑 → dirty
      if (!orig || orig.subject === '' || orig.teacher === '') {
        map[k] = { subject: v.subject, teacher: v.teacher, note: '', dirty: true }
      } else {
        map[k] = { subject: v.subject, teacher: v.teacher, note: '', dirty: true }
      }
    }
  }
  return map
})

// 编辑弹窗
const editCell = ref<{ day: number; period: number } | null>(null)
const editSubject = ref('语文')
const editTeacher = ref('未知')

function openEdit(d: number, p: number) {
  editCell.value = { day: d, period: p }
  const key = `${d}-${p}`
  const cell = cells.value[key]
  if (fixedSubjects[p]) {
    editSubject.value = fixedSubjects[p]
  } else {
    editSubject.value = cell?.subject || '语文'
  }
  if (fixedSubjects[p]) {
    const head = classStore.getClass(classId.value)?.headTeacher || '未知'
    editTeacher.value = cell?.teacher || head
  } else {
    editTeacher.value = cell?.teacher || '未知'
  }
}

// 暂存到草稿，不写 store
function saveEdit() {
  if (!editCell.value) return
  const { day, period } = editCell.value
  const subject = fixedSubjects[period] || editSubject.value
  if (subject) {
    draftCells.value[`${day}-${period}`] = {
      subject,
      teacher: editTeacher.value || '未知',
    }
  } else {
    // 视为清空
    draftCells.value[`${day}-${period}`] = null
  }
  editCell.value = null
  toast.success('已暂存到草稿')
}

function clearCell() {
  if (!editCell.value) return
  const { day, period } = editCell.value
  draftCells.value[`${day}-${period}`] = null
  editSubject.value = ''
  editTeacher.value = '未知'
  toast.info('已暂存清空')
  editCell.value = null
}

// 提交草稿 → 写 store
function commitDraft() {
  if (!hasDraft.value) {
    toast.info('没有需要保存的修改')
    return
  }
  const keys = Object.keys(draftCells.value)
  for (const k of keys) {
    const [d, p] = k.split('-').map(Number)
    const v = draftCells.value[k]
    if (v === null) {
      schoolStore.clearScheduleSlot(classId.value, d, p)
    } else {
      schoolStore.updateSchedule(
        classId.value,
        d,
        p,
        v.subject,
        '',
        v.teacher,
      )
    }
  }
  draftCells.value = {}
  toast.success(`已保存 ${keys.length} 项修改`)
}

// 放弃草稿
function resetDraft() {
  if (!hasDraft.value) return
  if (!confirm(`确定放弃 ${draftCount.value} 项未保存的修改？`)) return
  draftCells.value = {}
  toast.info('已放弃修改')
}

function print() {
  window.print()
}

// ============ 自动排课（直接落库，不进草稿） ============
function autoArrange() {
  if (!classId.value) {
    toast.warning('请先选择班级')
    return
  }
  if (hasDraft.value) {
    if (!confirm('当前有未保存的草稿，自动排课将覆盖它们。是否继续？')) return
  }
  if (!confirm('将清除当前班级课表并自动重新排课，确认？')) return

  const cls = classStore.getClass(classId.value)
  const head = cls?.headTeacher || '班主任'

  // 收集: 学科 -> 老师列表 (从 teacherStore 中该班级的任教分配)
  const teacherBySubject: Record<string, string[]> = {}
  for (const t of teacherStore.teachers) {
    for (const teach of t.teachings || []) {
      if (teach.classId === classId.value) {
        if (!teacherBySubject[teach.subject]) teacherBySubject[teach.subject] = []
        teacherBySubject[teach.subject].push(t.name)
      }
    }
  }

  const arr = generateAutoSchedule({
    classId: classId.value,
    headTeacher: head,
    teacherBySubject,
  })

  // 清除旧课表
  for (let d = 1; d <= 5; d++) {
    for (let p = 1; p <= 8; p++) {
      schoolStore.clearScheduleSlot(classId.value, d, p)
    }
  }
  // 写入新课表
  for (let i = 0; i < arr.length; i++) {
    schoolStore.updateSchedule(
      classId.value,
      arr[i].dayOfWeek,
      arr[i].period,
      arr[i].subject,
      '',
      arr[i].teacher,
    )
  }

  draftCells.value = {}
  toast.success('已重新排课')
}

function clearAll() {
  if (!classId.value) return
  if (hasDraft.value) {
    if (!confirm('当前有未保存的草稿，清空将覆盖它们。是否继续？')) return
  }
  if (!confirm('确定清空当前班级所有课表？')) return
  for (let d = 1; d <= 5; d++) {
    for (let p = 1; p <= 8; p++) {
      schoolStore.clearScheduleSlot(classId.value, d, p)
    }
  }
  draftCells.value = {}
  toast.info('已清空课表')
}

const teacherOptions = computed(() =>
  teacherStore.teachers.map((t) => t.name).filter(Boolean),
)

// ============ 切换班级：未保存的草稿要弹确认 ============
let revertingClassId = false
watch(classId, (newVal, oldVal) => {
  if (revertingClassId) {
    revertingClassId = false
    return
  }
  if (hasDraft.value && newVal !== oldVal) {
    if (confirm(`「${classStore.getClass(oldVal)?.name || '当前班级'}」有 ${draftCount.value} 项未保存的修改，是否放弃并切换？`)) {
      draftCells.value = {}
    } else {
      revertingClassId = true
      classId.value = oldVal
    }
  }
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="📋"
      title="课表排版"
      description="可视化编辑班级课程表，支持自动排课和草稿保存"
      gradient="from-sky2-100 via-cream-50 to-mint-100"
      class="print:hidden"
    />
    <div class="flex flex-col gap-3 print:hidden">
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="classId"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <button
          class="btn-secondary !py-2 !px-3 text-sm"
          @click="print"
        >
          <Printer :size="14" /> 打印
        </button>
        <button
          class="btn-secondary !py-2 !px-3 text-sm"
          @click="clearAll"
        >
          <Trash2 :size="14" /> 清空
        </button>
        <button
          class="btn-primary !py-2 !px-3 text-sm"
          @click="autoArrange"
        >
          <Shuffle :size="14" /> 重新排课
        </button>
      </div>
      <!-- 草稿状态条 -->
      <div
        v-if="hasDraft"
        class="flex flex-wrap items-center gap-3 card-flat px-3 py-2 !bg-butter-50"
      >
        <div class="flex items-center gap-1.5 text-butter-600 text-sm">
          <AlertTriangle :size="14" />
          <span>当前有 <b>{{ draftCount }}</b> 项未保存的修改</span>
        </div>
        <div class="flex gap-2 ml-auto">
          <button
            class="btn-ghost !py-1.5 !px-3 text-xs"
            @click="resetDraft"
          >
            <RotateCcw :size="12" /> 放弃修改
          </button>
          <button
            class="btn-primary !py-1.5 !px-3 text-xs"
            @click="commitDraft"
          >
            <Save :size="12" /> 保存到课表
          </button>
        </div>
      </div>
      <div class="text-xs text-cocoa-500">
        💡 点击单元格 → 在弹窗中编辑 → 「暂存」会放入草稿；统一在顶部「保存」才落库
      </div>
    </div>

    <div class="card-soft p-5 overflow-x-auto print-area">
      <h1 class="hidden print:block text-center text-xl font-bold mb-4 text-cocoa-900">
        {{ classStore.getClass(classId)?.name || '班级' }}课程表
      </h1>
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="p-2 text-cocoa-500 text-xs font-normal w-20" />
            <th
              v-for="(d, i) in days"
              :key="d"
              class="p-2 title-display text-base text-cocoa-700"
            >
              周{{ d }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in periodNumbers"
            :key="p"
          >
            <td class="p-2 text-center">
              <div class="number text-base text-cocoa-700">
                {{ p !== 5 && p <= 6 ? p : '' }}
              </div>
              <div class="text-[10px] text-cocoa-500">
                {{ periodLabels[p] }}
              </div>
            </td>
            <td
              v-for="(_, i) in days"
              :key="i"
              class="p-1 border border-cocoa-100/40 align-top"
            >
              <button
                class="w-full rounded-2xl flex flex-col items-center justify-center text-sm transition min-h-[58px] py-1.5 px-1.5 relative"
                :class="
                  cells[`${i + 1}-${p}`] && !cells[`${i + 1}-${p}`].cleared
                    ? `${p === 5 || p === 8 ? 'bg-cream-100' : (subjectPalette[cells[`${i + 1}-${p}`].subject]?.bg || 'bg-butter-100')} ${cells[`${i + 1}-${p}`].dirty ? 'ring-2 ring-butter-500 ring-offset-1' : ''} hover:brightness-95`
                    : 'bg-white/40 text-cocoa-300 hover:bg-white/80'
                "
                @click="openEdit(i + 1, p)"
              >
                <span
                  v-if="cells[`${i + 1}-${p}`]?.dirty"
                  class="absolute top-1 right-1 w-2 h-2 rounded-full bg-butter-500"
                  title="未保存"
                />
                <template v-if="cells[`${i + 1}-${p}`] && !cells[`${i + 1}-${p}`].cleared">
                  <div
                    v-if="p !== 5 && p !== 8"
                    class="text-xs font-medium truncate w-full text-center"
                    :class="subjectPalette[cells[`${i + 1}-${p}`].subject]?.text || 'text-cocoa-700'"
                  >
                    {{ cells[`${i + 1}-${p}`].subject }}
                  </div>
                  <div
                    class="text-[10px] mt-0.5 truncate w-full text-center"
                    :class="[
                      p === 5 || p === 8 ? 'font-medium' : '',
                      cells[`${i + 1}-${p}`].teacher === '未知' ? 'text-sakura-400 italic' : 'text-cocoa-500',
                    ]"
                  >
                    {{ cells[`${i + 1}-${p}`].teacher }}
                  </div>
                </template>
                <span
                  v-else
                  class="text-xl opacity-30"
                >+</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <transition name="modal">
      <div
        v-if="editCell"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-cocoa-900/40 backdrop-blur-sm"
        @click.self="editCell = null"
      >
        <div class="card-soft max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="title-display text-lg">
              周{{ days[editCell.day - 1] }} · {{ periodLabels[editCell.period] }}
            </h3>
            <button
              class="text-cocoa-500 hover:text-cocoa-900"
              @click="editCell = null"
            >
              <X :size="18" />
            </button>
          </div>

          <div v-if="!fixedSubjects[editCell.period]">
            <label class="text-xs text-cocoa-500 ml-1">科目</label>
            <div class="flex flex-wrap gap-2 mt-1 mb-3">
              <button
                v-for="s in subjectOptions"
                :key="s"
                class="chip border"
                :class="
                  editSubject === s
                    ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                    : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
                "
                @click="editSubject = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-xs text-cocoa-500 mb-3"
          >
            固定时段：<b>{{ fixedSubjects[editCell.period] }}</b>（仅设置老师）
          </div>

          <div>
            <label class="text-xs text-cocoa-500 ml-1">执教老师</label>
            <div class="flex gap-2 mt-1">
              <input
                v-model="editTeacher"
                class="input-soft"
                placeholder="如：李老师"
                list="teacher-options"
                @keyup.enter="saveEdit"
              >
              <datalist id="teacher-options">
                <option
                  v-for="n in teacherOptions"
                  :key="n"
                  :value="n"
                />
              </datalist>
            </div>
            <div
              v-if="teacherOptions.length"
              class="flex flex-wrap gap-1 mt-2"
            >
              <button
                v-for="n in teacherOptions.slice(0, 8)"
                :key="n"
                class="chip border bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100 text-[10px]"
                @click="editTeacher = n"
              >
                {{ n }}
              </button>
            </div>
          </div>

          <div class="flex gap-2 justify-end mt-4">
            <button
              class="btn-secondary"
              @click="clearCell"
            >
              <X :size="14" /> 清空
            </button>
            <button
              class="btn-primary"
              @click="saveEdit"
            >
              <Check :size="14" /> 暂存
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style>
@media print {
  body:has(.print-area) * {
    visibility: hidden;
  }
  body:has(.print-area) .print-area,
  body:has(.print-area) .print-area * {
    visibility: visible;
  }
  body:has(.print-area) .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }
}
</style>
