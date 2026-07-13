import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LessonObservation, WorkLog, LessonPlanTemplate } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

export const useAdminStore = defineStore('admin', () => {
  const observations = ref<LessonObservation[]>([])
  const logs = ref<WorkLog[]>([])
  const planTemplates = ref<LessonPlanTemplate[]>([])

  const { reload, replaceAll } = usePersistStore(
    'admin',
    { observations, logs, planTemplates },
    (): { observations: LessonObservation[]; logs: WorkLog[]; planTemplates: LessonPlanTemplate[] } => ({ observations: [], logs: [], planTemplates: [] }),
  )

  /* ---- LessonObservation ---- */
  function addObservation(payload: Omit<LessonObservation, 'id' | 'createdAt'>) {
    const o: LessonObservation = { ...payload, id: uid(), createdAt: now() }
    observations.value.push(o)
    return o
  }

  function updateObservation(id: string, patch: Partial<LessonObservation>) {
    const idx = observations.value.findIndex((o) => o.id === id)
    if (idx >= 0) observations.value[idx] = { ...observations.value[idx], ...patch }
  }

  function removeObservation(id: string) {
    observations.value = observations.value.filter((o) => o.id !== id)
  }

  /* ---- WorkLog ---- */
  function addLog(payload: Omit<WorkLog, 'id' | 'createdAt'>) {
    const l: WorkLog = { ...payload, id: uid(), createdAt: now() }
    logs.value.push(l)
    return l
  }

  function updateLog(id: string, patch: Partial<WorkLog>) {
    const idx = logs.value.findIndex((l) => l.id === id)
    if (idx >= 0) logs.value[idx] = { ...logs.value[idx], ...patch }
  }

  function removeLog(id: string) {
    logs.value = logs.value.filter((l) => l.id !== id)
  }

  const logsByDate = computed(() => {
    const map = new Map<string, WorkLog[]>()
    for (const l of logs.value) {
      const arr = map.get(l.date)
      if (arr) arr.push(l)
      else map.set(l.date, [l])
    }
    return map
  })

  /* ---- LessonPlanTemplate ---- */
  function addPlanTemplate(payload: Omit<LessonPlanTemplate, 'id' | 'createdAt'>) {
    const t: LessonPlanTemplate = { ...payload, id: uid(), createdAt: now() }
    planTemplates.value.push(t)
    return t
  }

  function updatePlanTemplate(id: string, patch: Partial<LessonPlanTemplate>) {
    const idx = planTemplates.value.findIndex((t) => t.id === id)
    if (idx >= 0) planTemplates.value[idx] = { ...planTemplates.value[idx], ...patch }
  }

  function removePlanTemplate(id: string) {
    planTemplates.value = planTemplates.value.filter((t) => t.id !== id)
  }

  function togglePlanFavorite(id: string) {
    const t = planTemplates.value.find((t) => t.id === id)
    if (t) t.isFavorite = !t.isFavorite
  }

  return {
    observations,
    logs,
    planTemplates,
    logsByDate,
    addObservation,
    updateObservation,
    removeObservation,
    addLog,
    updateLog,
    removeLog,
    addPlanTemplate,
    updatePlanTemplate,
    removePlanTemplate,
    togglePlanFavorite,
    replaceAll,
    reload,
  }
})
