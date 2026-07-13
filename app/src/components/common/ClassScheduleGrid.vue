<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSchoolStore } from '../../stores/school'
import { useClassStore } from '../../stores/class'
import { useUserStore } from '../../stores/user'
import { useToastStore } from '../../stores/toast'
import { subjectPalette } from '../../seed'
import { classSubjects } from '../../utils'
import Modal from './Modal.vue'

const props = defineProps<{
  /** 单班级模式：传入 classId 仅展示该班级 */
  classId?: string
  /** 多班级模式（我的课表）：按任教过滤 */
  mode?: 'single' | 'teaching'
}>()

const schoolStore = useSchoolStore()
const classStore = useClassStore()
const userStore = useUserStore()
const toast = useToastStore()

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

// 收集涉及的班级 id 列表
const involvedClassIds = computed(() => {
  if (props.mode === 'teaching') {
    const ids = new Set<string>()
    for (const s of schoolStore.schedules) ids.add(s.classId)
    return Array.from(ids)
  }
  return props.classId ? [props.classId] : []
})

function getCell(classId: string, day: number, period: number) {
  return schoolStore.schedules.find(
    (s) => s.classId === classId && s.dayOfWeek === day && s.period === period,
  )
}

// 是否在「我的任教」模式
const isTeaching = computed(() => props.mode === 'teaching')

function cellMatchesTeaching(classId: string, subject: string) {
  if (!isTeaching.value) return true
  return userStore.isTeaching(classId, subject)
}

// ============== 编辑弹窗 ==============
const editOpen = ref(false)
const editDraft = ref<{
  classId: string
  dayOfWeek: number
  period: number
  subject: string
  teacher: string
  note: string
} | null>(null)

const subjectOptions = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学',
  '午自习', '课后服务', '综合实践', '信息技术', '劳动', '阅读',
]

/** 根据当前编辑班级，动态展示优先学科（班级已设置的在前） */
const currentSubjectOptions = computed<string[]>(() => {
  if (!editDraft.value) return subjectOptions
  const c = classStore.getClass(editDraft.value.classId)
  const allowed = classSubjects(c, subjectOptions)
  // 班级设置的学科放前面，其余追加
  const rest = subjectOptions.filter((s) => !allowed.includes(s))
  return [...allowed, ...rest]
})

function openCellEdit(classId: string, day: number, period: number) {
  const found = getCell(classId, day, period)
  // 午自习 / 课后服务默认老师 = 班主任
  const fixedSubjects: Record<number, string> = { 5: '午自习', 8: '课后服务' }
  const defaultTeacher = fixedSubjects[period]
    ? classStore.getClass(classId)?.headTeacher || '未知'
    : '未知'
  editDraft.value = {
    classId,
    dayOfWeek: day,
    period,
    subject: found?.subject || fixedSubjects[period] || '',
    teacher: found?.teacher || defaultTeacher,
    note: found?.note || '',
  }
  editOpen.value = true
}

function saveEdit() {
  if (!editDraft.value) return
  const d = editDraft.value
  schoolStore.updateSchedule(
    d.classId,
    d.dayOfWeek,
    d.period,
    d.subject,
    d.note,
    d.teacher || '未知',
  )
  toast.success('已保存')
  editOpen.value = false
}

function clearCell() {
  if (!editDraft.value) return
  const d = editDraft.value
  schoolStore.clearScheduleSlot(d.classId, d.dayOfWeek, d.period)
  toast.info('已清空')
  editOpen.value = false
}

// ============== 双击直接修改老师 ==============
const teacherEditOpen = ref(false)
const teacherDraft = ref<{
  classId: string
  dayOfWeek: number
  period: number
  teacher: string
} | null>(null)

function dblClickTeacher(classId: string, day: number, period: number, current: string) {
  teacherDraft.value = { classId, dayOfWeek: day, period, teacher: current || '未知' }
  teacherEditOpen.value = true
}

function saveTeacher() {
  if (!teacherDraft.value) return
  const d = teacherDraft.value
  schoolStore.updateScheduleTeacher(d.classId, d.dayOfWeek, d.period, d.teacher || '未知')
  toast.success('执教老师已更新')
  teacherEditOpen.value = false
}

defineExpose({ involvedClassIds })
</script>

<template>
  <div class="space-y-5">
    <div
      v-for="cid in involvedClassIds"
      :key="cid"
      class="space-y-2"
    >
      <div
        v-if="mode === 'teaching'"
        class="text-sm text-cocoa-500 flex items-center gap-2"
      >
        🏫 {{ classStore.getClass(cid)?.name || '已删除班级' }}
      </div>
      <div class="card-soft p-4 overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="p-2 text-cocoa-500 text-xs font-normal w-20" />
              <th
                v-for="d in days"
                :key="d"
                class="p-2 title-display text-base text-cocoa-700"
              >
                周{{ d }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in totalPeriods"
              :key="p"
            >
              <td class="p-2 text-center">
                <div class="number text-base text-cocoa-700">
                  {{ p !== 5 && p <= 6 ? p : '' }}
                </div>
                <div class="text-[10px] text-cocoa-500 mt-0.5">
                  {{ periodLabels[p] }}
                </div>
              </td>
              <td
                v-for="(_, i) in days"
                :key="i"
                class="p-1 border border-cocoa-100/40 align-top"
              >
                <div
                  v-if="getCell(cid, i + 1, p) && cellMatchesTeaching(cid, getCell(cid, i + 1, p)!.subject)"
                  class="rounded-xl px-1.5 py-1.5 cursor-pointer hover:ring-2 hover:ring-butter-400 transition min-h-[58px] flex flex-col items-center justify-center"
                  :class="p === 5 || p === 8 ? 'bg-cream-100' : (subjectPalette[getCell(cid, i + 1, p)!.subject]?.bg || 'bg-butter-100')"
                  @click="openCellEdit(cid, i + 1, p)"
                >
                  <!-- 午自习/课后服务 行不显示学科字段, 只显示老师名字 (避免与左侧节次标签重复) -->
                  <div
                    v-if="p !== 5 && p !== 8"
                    class="text-xs font-medium truncate w-full text-center"
                    :class="subjectPalette[getCell(cid, i + 1, p)!.subject]?.text || 'text-cocoa-700'"
                  >
                    {{ getCell(cid, i + 1, p)!.subject }}
                  </div>
                  <div
                    class="truncate w-full text-center cursor-text"
                    :class="[
                      p === 5 || p === 8 ? 'text-xs font-medium' : 'text-[10px] mt-0.5',
                      getCell(cid, i + 1, p)!.teacher === '未知' ? 'text-sakura-400 italic' : (p === 5 || p === 8 ? 'text-cocoa-700' : 'text-cocoa-500')
                    ]"
                    :title="'双击修改执教老师'"
                    @dblclick.stop="dblClickTeacher(cid, i + 1, p, getCell(cid, i + 1, p)!.teacher)"
                  >
                    {{ getCell(cid, i + 1, p)!.teacher }}
                  </div>
                </div>
                <div
                  v-else-if="!isTeaching"
                  class="rounded-xl p-3 bg-white/40 text-cocoa-300 text-center text-xs cursor-pointer hover:bg-butter-100/40 min-h-[58px] flex items-center justify-center"
                  @click="openCellEdit(cid, i + 1, p)"
                >
                  +
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="text-[11px] text-cocoa-500 mt-2 flex flex-wrap gap-3">
          <span>💡 点击单元格编辑科目</span>
          <span>💡 双击「老师」快速修改执教老师</span>
        </div>
      </div>
    </div>

    <div
      v-if="!involvedClassIds.length"
      class="text-center text-cocoa-500 py-8 card-flat"
    >
      <div class="text-3xl mb-2">
        📭
      </div>
      <div v-if="mode === 'teaching'">
        暂未设置任课，请点击「设置任课」开始配置
      </div>
      <div v-else>
        请先选择一个班级
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Modal
      :open="editOpen"
      title="编辑课程"
      width="420px"
      @close="editOpen = false"
    >
      <div
        v-if="editDraft"
        class="space-y-3"
      >
        <div class="text-sm text-cocoa-500">
          {{
            classStore.getClass(editDraft.classId)?.name
          }} · 周{{ days[editDraft.dayOfWeek - 1] }} · {{ periodLabels[editDraft.period] }}
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">科目</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <button
              v-for="s in currentSubjectOptions"
              :key="s"
              class="chip border transition"
              :class="
                editDraft.subject === s
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 hover:bg-butter-100'
              "
              @click="editDraft.subject = s"
            >
              {{ s }}
            </button>
          </div>
          <div
            v-if="classStore.getClass(editDraft.classId)?.subjects?.length"
            class="text-[10px] text-mint-500 mt-1"
          >
            ✨ 班级已设置学期学科，本班优先学科已置顶
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">执教老师</label>
          <input
            v-model="editDraft.teacher"
            class="input-soft mt-1"
            placeholder="如：李老师"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">备注（可选）</label>
          <input
            v-model="editDraft.note"
            class="input-soft mt-1"
          >
        </div>
      </div>
      <template #footer>
        <button
          v-if="editDraft && getCell(editDraft.classId, editDraft.dayOfWeek, editDraft.period)"
          class="btn-sakura"
          @click="clearCell"
        >
          清空
        </button>
        <button
          class="btn-secondary"
          @click="editOpen = false"
        >
          取消
        </button>
        <button
          class="btn-primary"
          @click="saveEdit"
        >
          保存
        </button>
      </template>
    </Modal>

    <!-- 老师编辑弹窗 -->
    <Modal
      :open="teacherEditOpen"
      title="修改执教老师"
      width="360px"
      @close="teacherEditOpen = false"
    >
      <div
        v-if="teacherDraft"
        class="space-y-3"
      >
        <div class="text-sm text-cocoa-500">
          {{
            classStore.getClass(teacherDraft.classId)?.name
          }} · 周{{ days[teacherDraft.dayOfWeek - 1] }} · {{ periodLabels[teacherDraft.period] }}
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">执教老师</label>
          <input
            v-model="teacherDraft.teacher"
            class="input-soft mt-1"
            placeholder="如：王老师"
            @keyup.enter="saveTeacher"
          >
        </div>
        <p class="text-[11px] text-cocoa-500">
          不填或填「未知」将保持默认
        </p>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="teacherEditOpen = false"
        >
          取消
        </button>
        <button
          class="btn-primary"
          @click="saveTeacher"
        >
          保存
        </button>
      </template>
    </Modal>
  </div>
</template>
