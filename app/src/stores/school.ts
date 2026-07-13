import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ScheduleItem, Homework, Notice, Resource, Attendance, PickerHistory } from '../types'
import { now, uid } from '../utils'
import {
  seedSchedules,
  seedHomework,
  seedNotices,
  seedResources,
  seedAttendance,
} from '../seed'
import { getStorageKey, onUserChange } from '../utils/storage'
import { useClassStore } from './class'
import { useTeacherStore } from './teacher'
import { useUserStore } from './user'

const KEY = () => getStorageKey('school')

interface SchoolState {
  schedules: ScheduleItem[]
  homework: Homework[]
  notices: Notice[]
  resources: Resource[]
  attendance: Attendance[]
  pickerHistory: PickerHistory[]
}

function load(): SchoolState {
  try {
    const raw = localStorage.getItem(KEY())
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* noop */
  }
  // 返回副本, 避免不同用户共享同一个种子数组引用
  return {
    schedules: [...seedSchedules],
    homework: [...seedHomework],
    notices: [...seedNotices],
    resources: [...seedResources],
    attendance: [...seedAttendance],
    pickerHistory: [],
  }
}

export const useSchoolStore = defineStore('school', () => {
  const initial = load()
  const schedules = ref<ScheduleItem[]>(initial.schedules)
  const homework = ref<Homework[]>(initial.homework)
  const notices = ref<Notice[]>(initial.notices)
  const resources = ref<Resource[]>(initial.resources)
  const attendance = ref<Attendance[]>(initial.attendance)
  const pickerHistory = ref<PickerHistory[]>(initial.pickerHistory)

  function reload() {
    const next = load()
    schedules.value = next.schedules
    homework.value = next.homework
    notices.value = next.notices
    resources.value = next.resources
    attendance.value = next.attendance
    pickerHistory.value = next.pickerHistory
  }

  // ====== 课表 ======
  function updateSchedule(
    classId: string,
    dayOfWeek: number,
    period: number,
    subject: string,
    note = '',
    teacher = '未知',
  ) {
    const found = schedules.value.find(
      (s) => s.classId === classId && s.dayOfWeek === dayOfWeek && s.period === period,
    )
    if (found) {
      found.subject = subject
      found.note = note
      found.teacher = teacher
    } else {
      schedules.value.push({
        id: uid(),
        classId,
        dayOfWeek,
        period,
        subject,
        teacher,
        note,
      })
    }
    // 自动同步：如果老师名匹配通讯录中的老师，为其创建任教分配
    if (teacher && teacher !== '未知') {
      const teacherStore = useTeacherStore()
      const matched = teacherStore.teachers.find((t) => t.name === teacher)
      if (matched) {
        const hasEntry = (matched.teachings || []).some(
          (e) => e.classId === classId && e.subject === subject,
        )
        if (!hasEntry) {
          teacherStore.updateTeacher(matched.id, {
            teachings: [...(matched.teachings || []), { classId, subject }],
          })
        }
      }
    }
  }

  /** 教师改名时，同步更新课表中的老师名 */
  function renameTeacherInSchedule(oldName: string, newName: string) {
    if (!oldName || oldName === newName) return
    for (const s of schedules.value) {
      if (s.teacher === oldName) s.teacher = newName
    }
  }

  function updateScheduleTeacher(
    classId: string,
    dayOfWeek: number,
    period: number,
    teacher: string,
  ) {
    const found = schedules.value.find(
      (s) => s.classId === classId && s.dayOfWeek === dayOfWeek && s.period === period,
    )
    if (found) {
      found.teacher = teacher
    } else {
      schedules.value.push({
        id: uid(),
        classId,
        dayOfWeek,
        period,
        subject: '',
        teacher,
        note: '',
      })
    }
  }

  function clearScheduleSlot(classId: string, dayOfWeek: number, period: number) {
    schedules.value = schedules.value.filter(
      (s) => !(s.classId === classId && s.dayOfWeek === dayOfWeek && s.period === period),
    )
  }

  /**
   * 批量写入某个班级的课表
   * grid 是 5 行 × 8 列（行=周一~周五，列=节次 1~8）
   * 每个单元格内容：
   *  - 空：不写
   *  - 「科目/老师」：写入 subject=科目, teacher=老师
   *  - 仅「老师」（或「未知」）：写入 subject=午自习/课后服务（针对第 5 / 8 节），teacher=老师
   */
  function batchImportSchedule(
    classId: string,
    grid: string[][],
    fixedSubjectByPeriod: Record<number, string>,
  ) {
    const importedSubjects = new Set<string>()
    for (let d = 0; d < 5; d++) {
      const day = d + 1
      const row = grid[d] || []
      for (let p = 1; p <= 8; p++) {
        const cell = (row[p - 1] || '').trim()
        if (!cell) continue
        let subject = ''
        let teacher = '未知'
        if (cell.includes('/')) {
          const [s, t] = cell.split('/')
          subject = (s || '').trim()
          teacher = (t || '').trim() || '未知'
        } else {
          // 没有斜杠：若为固定 subject（午自习/课后服务），则视为老师；否则视为科目
          if (fixedSubjectByPeriod[p]) {
            subject = fixedSubjectByPeriod[p]
            teacher = cell
          } else {
            subject = cell
          }
        }
        if (!subject) continue
        importedSubjects.add(subject)
        updateSchedule(classId, day, p, subject, '', teacher)
      }
    }
    // 自动同步：将课表中出现的学科写入当前用户的任教配置
    if (importedSubjects.size > 0) {
      const userStore = useUserStore()
      const userSubjects = new Set(userStore.user?.subjects || [])
      for (const subj of importedSubjects) {
        if (userSubjects.has(subj) && !userStore.isTeaching(classId, subj)) {
          userStore.toggleTeaching(classId, subj)
        }
      }
    }
  }

  // ====== 作业 ======
  function addHomework(payload: Omit<Homework, 'id' | 'createdAt'>) {
    homework.value.unshift({ ...payload, id: uid(), createdAt: now() })
  }
  function updateHomework(id: string, patch: Partial<Homework>) {
    const idx = homework.value.findIndex((h) => h.id === id)
    if (idx >= 0) homework.value[idx] = { ...homework.value[idx], ...patch }
  }
  function removeHomework(id: string) {
    homework.value = homework.value.filter((h) => h.id !== id)
  }

  // ====== 公告 ======
  function addNotice(payload: Omit<Notice, 'id' | 'createdAt'>) {
    notices.value.unshift({ ...payload, id: uid(), createdAt: now() })
  }
  function updateNotice(id: string, patch: Partial<Notice>) {
    const idx = notices.value.findIndex((n) => n.id === id)
    if (idx >= 0) notices.value[idx] = { ...notices.value[idx], ...patch }
  }
  function removeNotice(id: string) {
    notices.value = notices.value.filter((n) => n.id !== id)
  }
  function togglePinNotice(id: string) {
    const n = notices.value.find((x) => x.id === id)
    if (n) n.pinned = !n.pinned
  }

  /**
   * 一键结束公告：设置 ended=true，自动取消置顶。
   * 已结束的公告不会再出现在置顶区。
   */
  function endNotice(id: string) {
    const n = notices.value.find((x) => x.id === id)
    if (!n) return
    n.ended = true
    n.endedAt = now()
    n.pinned = false
  }

  /** 重新发布已结束的公告（清除 ended） */
  function reopenNotice(id: string) {
    const n = notices.value.find((x) => x.id === id)
    if (!n) return
    n.ended = false
    n.endedAt = undefined
  }

  // ====== 资源 ======
  function addResource(payload: Omit<Resource, 'id' | 'createdAt'>) {
    resources.value.unshift({ ...payload, id: uid(), createdAt: now() })
  }
  function removeResource(id: string) {
    resources.value = resources.value.filter((r) => r.id !== id)
  }

  // ====== 考勤 ======
  function getAttendance(classId: string, date: string) {
    return attendance.value.find((a) => a.classId === classId && a.date === date)
  }
  function saveAttendance(classId: string, date: string, records: Attendance['records']) {
    // 自动适配班级学生变动：补齐新增学生（默认出勤），移除已删除学生
    const classStore = useClassStore()
    const currentStudentIds = new Set(classStore.studentsOf(classId).map((s) => s.id))
    const reconciled = records.filter((r) => currentStudentIds.has(r.studentId))
    const existingIds = new Set(reconciled.map((r) => r.studentId))
    for (const sid of currentStudentIds) {
      if (!existingIds.has(sid)) {
        reconciled.push({ studentId: sid, status: '出勤' })
      }
    }
    const found = attendance.value.find((a) => a.classId === classId && a.date === date)
    if (found) {
      found.records = reconciled
    } else {
      attendance.value.push({ id: uid(), classId, date, records: reconciled })
    }
  }

  // ====== 点名历史 ======
  function pushPickerHistory(classId: string, studentId: string, studentName: string) {
    pickerHistory.value.unshift({
      id: uid(),
      classId,
      studentId,
      studentName,
      createdAt: now(),
    })
    pickerHistory.value = pickerHistory.value.slice(0, 50)
  }
  function clearPickerHistory(classId?: string) {
    if (classId) pickerHistory.value = pickerHistory.value.filter((p) => p.classId !== classId)
    else pickerHistory.value = []
  }

  function replaceAll(next: SchoolState) {
    schedules.value = next.schedules
    homework.value = next.homework
    notices.value = next.notices
    resources.value = next.resources
    attendance.value = next.attendance
    pickerHistory.value = next.pickerHistory
  }

  /** 将 fromId 班级关联数据 (课表/作业/考勤/点名历史) 整体迁到 toId 班级 */
  function reassignClass(fromId: string, toId: string) {
    if (fromId === toId) return
    schedules.value = schedules.value.map((s) =>
      s.classId === fromId ? { ...s, classId: toId } : s,
    )
    homework.value = homework.value.map((h) =>
      h.classId === fromId ? { ...h, classId: toId } : h,
    )
    attendance.value = attendance.value.map((a) =>
      a.classId === fromId ? { ...a, classId: toId } : a,
    )
    pickerHistory.value = pickerHistory.value.map((p) =>
      p.classId === fromId ? { ...p, classId: toId } : p,
    )
  }

  /** 班级合并后，删除 fromId 班级相关数据 (课表/作业/考勤) */
  function clearByClass(classId: string) {
    schedules.value = schedules.value.filter((s) => s.classId !== classId)
    homework.value = homework.value.filter((h) => h.classId !== classId)
    attendance.value = attendance.value.filter((a) => a.classId !== classId)
    pickerHistory.value = pickerHistory.value.filter((p) => p.classId !== classId)
  }

  /** 删除学生时清理其考勤记录与点名历史 */
  function clearByStudent(studentIds: string[]) {
    const set = new Set(studentIds)
    attendance.value = attendance.value.map((a) => ({
      ...a,
      records: a.records.filter((r) => !set.has(r.studentId)),
    }))
    pickerHistory.value = pickerHistory.value.filter(
      (p) => !set.has(p.studentId),
    )
  }

  watch(
    [schedules, homework, notices, resources, attendance, pickerHistory],
    () => {
      localStorage.setItem(
        KEY(),
        JSON.stringify({
          schedules: schedules.value,
          homework: homework.value,
          notices: notices.value,
          resources: resources.value,
          attendance: attendance.value,
          pickerHistory: pickerHistory.value,
        }),
      )
    },
    { deep: true },
  )

  onUserChange(() => {
    reload()
  })

  return {
    schedules,
    homework,
    notices,
    resources,
    attendance,
    pickerHistory,
    updateSchedule,
    updateScheduleTeacher,
    clearScheduleSlot,
    batchImportSchedule,
    renameTeacherInSchedule,
    addHomework,
    updateHomework,
    removeHomework,
    addNotice,
    updateNotice,
    removeNotice,
    togglePinNotice,
    endNotice,
    reopenNotice,
    addResource,
    removeResource,
    getAttendance,
    saveAttendance,
    pushPickerHistory,
    clearPickerHistory,
    reassignClass,
    clearByClass,
    clearByStudent,
    replaceAll,
    reload,
  }
})
