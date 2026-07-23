import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ClassExpense, DutyRoster, ClassActivity } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

export const useClassOpsStore = defineStore('classOps', () => {
  const expenses = ref<ClassExpense[]>([])
  const rosters = ref<DutyRoster[]>([])
  const activities = ref<ClassActivity[]>([])

  const { reload, replaceAll } = usePersistStore(
    'classOps',
    { expenses, rosters, activities },
    (): { expenses: ClassExpense[]; rosters: DutyRoster[]; activities: ClassActivity[] } => ({ expenses: [], rosters: [], activities: [] }),
  )

  /* ---- ClassExpense ---- */
  function addExpense(payload: Omit<ClassExpense, 'id' | 'createdAt'>) {
    const e: ClassExpense = { ...payload, id: uid(), createdAt: now() }
    expenses.value.push(e)
    return e
  }

  function updateExpense(id: string, patch: Partial<ClassExpense>) {
    const idx = expenses.value.findIndex((e) => e.id === id)
    if (idx >= 0) expenses.value[idx] = { ...expenses.value[idx], ...patch }
  }

  function removeExpense(id: string) {
    expenses.value = expenses.value.filter((e) => e.id !== id)
  }

  const expensesByClass = computed(() => {
    const map = new Map<string, ClassExpense[]>()
    for (const e of expenses.value) {
      const arr = map.get(e.classId)
      if (arr) arr.push(e)
      else map.set(e.classId, [e])
    }
    return map
  })

  function balanceOf(classId: string) {
    return expenses.value
      .filter((e) => e.classId === classId)
      .reduce((sum, e) => sum + (e.type === '收入' ? e.amount : -e.amount), 0)
  }

  /* ---- DutyRoster ---- */
  function addRoster(payload: Omit<DutyRoster, 'id' | 'createdAt'>) {
    const r: DutyRoster = { ...payload, id: uid(), createdAt: now() }
    rosters.value.push(r)
    return r
  }

  function updateRoster(id: string, patch: Partial<DutyRoster>) {
    const idx = rosters.value.findIndex((r) => r.id === id)
    if (idx >= 0) rosters.value[idx] = { ...rosters.value[idx], ...patch }
  }

  function removeRoster(id: string) {
    rosters.value = rosters.value.filter((r) => r.id !== id)
  }

  const rostersByClass = computed(() => {
    const map = new Map<string, DutyRoster[]>()
    for (const r of rosters.value) {
      const arr = map.get(r.classId)
      if (arr) arr.push(r)
      else map.set(r.classId, [r])
    }
    return map
  })

  /* ---- ClassActivity ---- */
  function addActivity(payload: Omit<ClassActivity, 'id' | 'createdAt'>) {
    const a: ClassActivity = { ...payload, id: uid(), createdAt: now() }
    activities.value.push(a)
    return a
  }

  function updateActivity(id: string, patch: Partial<ClassActivity>) {
    const idx = activities.value.findIndex((a) => a.id === id)
    if (idx >= 0) activities.value[idx] = { ...activities.value[idx], ...patch }
  }

  function removeActivity(id: string) {
    activities.value = activities.value.filter((a) => a.id !== id)
  }

  const activitiesByClass = computed(() => {
    const map = new Map<string, ClassActivity[]>()
    for (const a of activities.value) {
      const arr = map.get(a.classId)
      if (arr) arr.push(a)
      else map.set(a.classId, [a])
    }
    return map
  })

  function clearByClass(classId: string) {
    expenses.value = expenses.value.filter((e) => e.classId !== classId)
    rosters.value = rosters.value.filter((r) => r.classId !== classId)
    activities.value = activities.value.filter((a) => a.classId !== classId)
  }

  return {
    expenses,
    rosters,
    activities,
    expensesByClass,
    rostersByClass,
    activitiesByClass,
    balanceOf,
    addExpense,
    updateExpense,
    removeExpense,
    addRoster,
    updateRoster,
    removeRoster,
    addActivity,
    updateActivity,
    removeActivity,
    clearByClass,
    replaceAll,
    reload,
  }
})
