import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Teacher } from '../types'
import { seedTeachers } from '../seed'
import { usePersistStore } from '../composables/usePersistStore'
import { useSchoolStore } from './school'

export const useTeacherStore = defineStore('teacher', () => {
  const teachers = ref<Teacher[]>([])

  const { reload, replaceAll } = usePersistStore(
    'teachers',
    { teachers },
    () => ({ teachers: seedTeachers.map((t) => ({ ...t })) }),
  )

  function toggleStar(id: string) {
    const t = teachers.value.find((x) => x.id === id)
    if (t) t.isStarred = !t.isStarred
  }

  function addTeacher(payload: Omit<Teacher, 'id'>) {
    teachers.value.push({ ...payload, id: 't-' + Date.now() })
  }

  function updateTeacher(id: string, patch: Partial<Teacher>) {
    const idx = teachers.value.findIndex((t) => t.id === id)
    if (idx < 0) return
    const old = teachers.value[idx]
    teachers.value[idx] = { ...old, ...patch }
    // 教师改名时，同步更新课表中的老师名
    if (patch.name && patch.name !== old.name) {
      useSchoolStore().renameTeacherInSchedule(old.name, patch.name)
    }
  }

  function removeTeacher(id: string) {
    teachers.value = teachers.value.filter((t) => t.id !== id)
  }

  /** 将 fromId 班级的任教分配迁到 toId */
  function reassignClass(fromId: string, toId: string) {
    if (fromId === toId) return
    teachers.value = teachers.value.map((t) => {
      if (!t.teachings?.length) return t
      let changed = false
      const next = t.teachings.map((entry) => {
        if (entry.classId === fromId) {
          changed = true
          return { ...entry, classId: toId }
        }
        return entry
      })
      return changed ? { ...t, teachings: next } : t
    })
  }

  function clearByClass(classId: string) {
    teachers.value = teachers.value.map((t) => {
      if (!t.teachings?.length) return t
      const next = t.teachings.filter((e) => e.classId !== classId)
      return next.length === t.teachings.length ? t : { ...t, teachings: next }
    })
  }

  return {
    teachers,
    toggleStar,
    addTeacher,
    updateTeacher,
    removeTeacher,
    reassignClass,
    clearByClass,
    replaceAll,
    reload,
  }
})
