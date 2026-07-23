import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScoreRecord, GroupScore } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

export const useClassScoreStore = defineStore('classScore', () => {
  const records = ref<ScoreRecord[]>([])
  const groups = ref<GroupScore[]>([])

  const { reload, replaceAll } = usePersistStore(
    'classScores',
    { records, groups },
    (): { records: ScoreRecord[]; groups: GroupScore[] } => ({ records: [], groups: [] }),
  )

  const recordsByClass = computed(() => {
    const map = new Map<string, ScoreRecord[]>()
    for (const r of records.value) {
      const arr = map.get(r.classId)
      if (arr) arr.push(r)
      else map.set(r.classId, [r])
    }
    return map
  })

  const groupsByClass = computed(() => {
    const map = new Map<string, GroupScore[]>()
    for (const g of groups.value) {
      const arr = map.get(g.classId)
      if (arr) arr.push(g)
      else map.set(g.classId, [g])
    }
    return map
  })

  function addRecord(payload: Omit<ScoreRecord, 'id' | 'createdAt'>) {
    const r: ScoreRecord = { ...payload, id: uid(), createdAt: now() }
    records.value.push(r)
    return r
  }

  function removeRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
  }

  function clearRecordsByClass(classId: string) {
    records.value = records.value.filter((r) => r.classId !== classId)
  }

  function addGroup(payload: Omit<GroupScore, 'id' | 'updatedAt'>) {
    const g: GroupScore = { ...payload, id: uid(), updatedAt: now() }
    groups.value.push(g)
    return g
  }

  function updateGroup(id: string, points: number) {
    const idx = groups.value.findIndex((g) => g.id === id)
    if (idx >= 0) {
      groups.value[idx].points += points
      groups.value[idx].updatedAt = now()
    }
  }

  function removeGroup(id: string) {
    groups.value = groups.value.filter((g) => g.id !== id)
  }

  function clearGroupsByClass(classId: string) {
    groups.value = groups.value.filter((g) => g.classId !== classId)
  }

  function resetGroupScores(classId: string) {
    for (const g of groups.value) {
      if (g.classId === classId) g.points = 0
    }
  }

  return {
    records,
    groups,
    recordsByClass,
    groupsByClass,
    addRecord,
    removeRecord,
    clearRecordsByClass,
    addGroup,
    updateGroup,
    removeGroup,
    clearGroupsByClass,
    resetGroupScores,
    replaceAll,
    reload,
  }
})
