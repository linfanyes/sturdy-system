import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RewardRecord } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

interface RewardState {
  records: RewardRecord[]
}

export const useRewardStore = defineStore('reward', () => {
  const records = ref<RewardRecord[]>([])

  const { reload, replaceAll } = usePersistStore<RewardState>(
    'rewards',
    { records },
    () => ({ records: [] }),
  )

  function addRecord(payload: Omit<RewardRecord, 'id' | 'createdAt'>) {
    records.value.unshift({ ...payload, id: uid(), createdAt: now() })
  }
  function updateRecord(id: string, patch: Partial<RewardRecord>) {
    const i = records.value.findIndex((r) => r.id === id)
    if (i >= 0) records.value[i] = { ...records.value[i], ...patch }
  }
  function removeRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
  }
  function clearByClass(classId: string) {
    records.value = records.value.filter((r) => r.classId !== classId)
  }
  function clearByStudent(classId: string, studentId: string) {
    records.value = records.value.filter(
      (r) => !(r.classId === classId && r.studentId === studentId),
    )
  }

  /** 将 fromId 班级的奖惩记录迁到 toId */
  function reassignClass(fromId: string, toId: string) {
    if (fromId === toId) return
    records.value = records.value.map((r) =>
      r.classId === fromId ? { ...r, classId: toId } : r,
    )
  }
  /** 统计某学生在某班级的积分合计 */
  function totalPoints(classId: string, studentId: string): number {
    return records.value
      .filter((r) => r.classId === classId && r.studentId === studentId)
      .reduce((a, b) => a + b.points, 0)
  }

  return {
    records,
    addRecord,
    updateRecord,
    removeRecord,
    clearByClass,
    clearByStudent,
    reassignClass,
    totalPoints,
    replaceAll,
    reload,
  }
})
