import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClassDutyConfig } from '../types'
import { usePersistStore } from '../composables/usePersistStore'
import { useClassStore } from './class'

interface ClassDutyState {
  configs: ClassDutyConfig[]
}

export const useClassDutyStore = defineStore('classDuty', () => {
  const configs = ref<ClassDutyConfig[]>([])

  const { reload, replaceAll } = usePersistStore(
    'classDuty',
    { configs },
    (): ClassDutyState => ({ configs: [] }),
  )

  function getConfig(classId: string): ClassDutyConfig | undefined {
    return configs.value.find((c) => c.classId === classId)
  }

  function ensureConfig(classId: string): ClassDutyConfig {
    let cfg = getConfig(classId)
    if (!cfg) {
      cfg = { classId, duties: [], assignments: {} }
      configs.value.push(cfg)
    }
    return cfg
  }

  function getDuties(classId: string): string[] {
    return getConfig(classId)?.duties || []
  }

  function getAssignment(classId: string, duty: string): string[] | undefined {
    return getConfig(classId)?.assignments[duty]
  }

  function setDuties(classId: string, duties: string[]) {
    const cfg = ensureConfig(classId)
    cfg.duties = duties
    for (const d of Object.keys(cfg.assignments)) {
      if (!duties.includes(d)) delete cfg.assignments[d]
    }
  }

  function setAssignment(classId: string, duty: string, studentIds: string[]) {
    const cfg = ensureConfig(classId)
    if (!cfg.duties.includes(duty)) return
    cfg.assignments[duty] = [...studentIds]
  }

  /**
   * 根据配置同步该班所有学生的 duty 字段：
   * - 已分配职务的学生写入所有对应职务（用中文顿号分隔）
   * - 未分配或职务已被删除的学生清空职务
   */
  function syncStudentDuties(classId: string) {
    const classStore = useClassStore()
    const cfg = getConfig(classId)
    if (!cfg) {
      for (const s of classStore.studentsOf(classId)) {
        if (s.duty) classStore.updateStudent(s.id, { duty: '' })
      }
      return
    }

    const studentDuties = new Map<string, string[]>()
    for (const duty of cfg.duties) {
      const ids = cfg.assignments[duty] || []
      for (const studentId of ids) {
        if (!studentDuties.has(studentId)) studentDuties.set(studentId, [])
        studentDuties.get(studentId)!.push(duty)
      }
    }

    for (const s of classStore.studentsOf(classId)) {
      const duties = studentDuties.get(s.id) || []
      const newDuty = duties.join('、')
      if (s.duty !== newDuty) classStore.updateStudent(s.id, { duty: newDuty })
    }
  }

  /**
   * 保存完整配置并同步学生职务
   */
  function saveConfig(
    classId: string,
    duties: string[],
    assignments: Record<string, string[]>,
  ) {
    const cfg = ensureConfig(classId)
    cfg.duties = duties
    cfg.assignments = {}
    for (const [duty, studentIds] of Object.entries(assignments)) {
      if (duties.includes(duty)) {
        cfg.assignments[duty] = studentIds.filter(Boolean)
      }
    }
    syncStudentDuties(classId)
  }

  return {
    configs,
    getConfig,
    ensureConfig,
    getDuties,
    getAssignment,
    setDuties,
    setAssignment,
    syncStudentDuties,
    saveConfig,
    reload,
    replaceAll,
  }
})
