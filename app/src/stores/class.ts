import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ClassItem, Student } from '../types'
import { now, uid } from '../utils'
import { seedClasses, seedStudents } from '../seed'
import { usePersistStore } from '../composables/usePersistStore'

interface ClassesState {
  classes: ClassItem[]
  students: Student[]
}

export const useClassStore = defineStore('class', () => {
  const classes = ref<ClassItem[]>([])
  const students = ref<Student[]>([])

  const { reload, replaceAll } = usePersistStore(
    'classes',
    { classes, students },
    () => ({
      classes: [...seedClasses],
      students: [...seedStudents],
    }),
  )

  // Map 索引：O(1) 查找，computed 自动缓存
  const classMap = computed(() => {
    const map = new Map<string, ClassItem>()
    for (const c of classes.value) map.set(c.id, c)
    return map
  })
  const studentMap = computed(() => {
    const map = new Map<string, Student>()
    for (const s of students.value) map.set(s.id, s)
    return map
  })
  const studentsByClass = computed(() => {
    const map = new Map<string, Student[]>()
    for (const s of students.value) {
      const arr = map.get(s.classId)
      if (arr) arr.push(s)
      else map.set(s.classId, [s])
    }
    return map
  })

  function addClass(payload: Omit<ClassItem, 'id' | 'createdAt'>) {
    const c: ClassItem = { ...payload, id: uid(), createdAt: now() }
    classes.value.push(c)
    return c
  }

  function updateClass(id: string, patch: Partial<ClassItem>) {
    const idx = classes.value.findIndex((c) => c.id === id)
    if (idx >= 0) classes.value[idx] = { ...classes.value[idx], ...patch }
  }

  function removeClass(id: string) {
    classes.value = classes.value.filter((c) => c.id !== id)
    students.value = students.value.filter((s) => s.classId !== id)
  }

  /**
   * 将 fromId 班级下的学生整体迁到 toId 班级。
   * 关联的课表/作业/考勤/成绩/奖惩/考试等需要调用方在各 store 内执行。
   * 返回迁移的学生数。
   */
  function reassignStudents(fromId: string, toId: string): number {
    if (fromId === toId) return 0
    let count = 0
    students.value = students.value.map((s) => {
      if (s.classId === fromId) {
        count++
        return { ...s, classId: toId }
      }
      return s
    })
    return count
  }

  function getClass(id: string) {
    return classMap.value.get(id)
  }

  function studentsOf(classId: string) {
    return studentsByClass.value.get(classId) || []
  }

  function addStudent(payload: Omit<Student, 'id' | 'createdAt'>) {
    const s: Student = { ...payload, id: uid(), createdAt: now() }
    students.value.push(s)
    return s
  }

  function updateStudent(id: string, patch: Partial<Student>) {
    const idx = students.value.findIndex((s) => s.id === id)
    if (idx >= 0) students.value[idx] = { ...students.value[idx], ...patch }
  }

  function removeStudent(id: string) {
    students.value = students.value.filter((s) => s.id !== id)
  }

  function removeStudents(ids: string[]) {
    students.value = students.value.filter((s) => !ids.includes(s.id))
  }

  function getStudent(id: string) {
    return studentMap.value.get(id)
  }

  // 当前选中的班级（用于工作台公告按班级过滤）
  const currentClassId = ref<string | null>(null)
  function setCurrentClass(id: string | null) {
    currentClassId.value = id
  }

  return {
    classes,
    students,
    addClass,
    updateClass,
    removeClass,
    reassignStudents,
    getClass,
    studentsOf,
    addStudent,
    updateStudent,
    removeStudent,
    removeStudents,
    getStudent,
    replaceAll,
    reload,
    currentClassId,
    setCurrentClass,
  }
})
