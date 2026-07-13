import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GrowthEntry, BehaviorRecord } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

export const useGrowthStore = defineStore('growth', () => {
  const entries = ref<GrowthEntry[]>([])
  const behaviors = ref<BehaviorRecord[]>([])

  const { reload, replaceAll } = usePersistStore(
    'growth',
    { entries, behaviors },
    (): { entries: GrowthEntry[]; behaviors: BehaviorRecord[] } => ({ entries: [], behaviors: [] }),
  )

  const entriesByStudent = computed(() => {
    const map = new Map<string, GrowthEntry[]>()
    for (const e of entries.value) {
      const arr = map.get(e.studentId)
      if (arr) arr.push(e)
      else map.set(e.studentId, [e])
    }
    return map
  })

  const behaviorsByStudent = computed(() => {
    const map = new Map<string, BehaviorRecord[]>()
    for (const b of behaviors.value) {
      const arr = map.get(b.studentId)
      if (arr) arr.push(b)
      else map.set(b.studentId, [b])
    }
    return map
  })

  /* ---- GrowthEntry CRUD ---- */
  function addEntry(payload: Omit<GrowthEntry, 'id' | 'createdAt'>) {
    const e: GrowthEntry = { ...payload, id: uid(), createdAt: now() }
    entries.value.push(e)
    return e
  }

  function updateEntry(id: string, patch: Partial<GrowthEntry>) {
    const idx = entries.value.findIndex((e) => e.id === id)
    if (idx >= 0) entries.value[idx] = { ...entries.value[idx], ...patch }
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  function entriesOfStudent(studentId: string) {
    return entriesByStudent.value.get(studentId) || []
  }

  /* ---- BehaviorRecord CRUD ---- */
  function addBehavior(payload: Omit<BehaviorRecord, 'id' | 'createdAt'>) {
    const b: BehaviorRecord = { ...payload, id: uid(), createdAt: now() }
    behaviors.value.push(b)
    return b
  }

  function updateBehavior(id: string, patch: Partial<BehaviorRecord>) {
    const idx = behaviors.value.findIndex((b) => b.id === id)
    if (idx >= 0) behaviors.value[idx] = { ...behaviors.value[idx], ...patch }
  }

  function removeBehavior(id: string) {
    behaviors.value = behaviors.value.filter((b) => b.id !== id)
  }

  function behaviorsOfStudent(studentId: string) {
    return behaviorsByStudent.value.get(studentId) || []
  }

  function clearByStudent(studentIds: string[]) {
    const set = new Set(studentIds)
    entries.value = entries.value.filter((e) => !set.has(e.studentId))
    behaviors.value = behaviors.value.filter((b) => !set.has(b.studentId))
  }

  return {
    entries,
    behaviors,
    entriesByStudent,
    behaviorsByStudent,
    addEntry,
    updateEntry,
    removeEntry,
    entriesOfStudent,
    addBehavior,
    updateBehavior,
    removeBehavior,
    behaviorsOfStudent,
    clearByStudent,
    replaceAll,
    reload,
  }
})
