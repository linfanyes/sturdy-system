/**
 * 生成类文档的本地存储 (优选试卷 / 优质教案)
 *
 * 所有生成结果都保存在当前用户隔离的 localStorage 命名空间, 方便随时回看与再次下载.
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { GeneratedPaper, GeneratedLessonPlan } from '../types'
import { now, uid } from '../utils'
import { getStorageKey, onUserChange } from '../utils/storage'

const PKEY = () => getStorageKey('papers')
const LKEY = () => getStorageKey('lessonplans')

function loadPapers(): GeneratedPaper[] {
  try {
    const raw = localStorage.getItem(PKEY())
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return []
}
function loadPlans(): GeneratedLessonPlan[] {
  try {
    const raw = localStorage.getItem(LKEY())
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return []
}

export const useGeneratedStore = defineStore('generated', () => {
  const papers = ref<GeneratedPaper[]>(loadPapers())
  const lessonPlans = ref<GeneratedLessonPlan[]>(loadPlans())

  function addPaper(p: Omit<GeneratedPaper, 'id' | 'createdAt'>) {
    const item: GeneratedPaper = { ...p, id: uid(), createdAt: now() }
    papers.value.unshift(item)
    return item
  }
  function removePaper(id: string) {
    papers.value = papers.value.filter((x) => x.id !== id)
  }
  function getPaper(id: string) {
    return papers.value.find((x) => x.id === id) || null
  }

  function addLessonPlan(p: Omit<GeneratedLessonPlan, 'id' | 'createdAt'>) {
    const item: GeneratedLessonPlan = { ...p, id: uid(), createdAt: now() }
    lessonPlans.value.unshift(item)
    return item
  }
  function removeLessonPlan(id: string) {
    lessonPlans.value = lessonPlans.value.filter((x) => x.id !== id)
  }
  function getLessonPlan(id: string) {
    return lessonPlans.value.find((x) => x.id === id) || null
  }

  function clearAll() {
    papers.value = []
    lessonPlans.value = []
  }

  watch(
    [papers, lessonPlans],
    () => {
      localStorage.setItem(PKEY(), JSON.stringify(papers.value))
      localStorage.setItem(LKEY(), JSON.stringify(lessonPlans.value))
    },
    { deep: true },
  )

  onUserChange(() => {
    papers.value = loadPapers()
    lessonPlans.value = loadPlans()
  })

  return {
    papers,
    lessonPlans,
    addPaper,
    removePaper,
    getPaper,
    addLessonPlan,
    removeLessonPlan,
    getLessonPlan,
    clearAll,
    reload: () => {
      papers.value = loadPapers()
      lessonPlans.value = loadPlans()
    },
  }
})
