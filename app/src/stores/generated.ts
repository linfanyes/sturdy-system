/**
 * 生成类文档的本地存储 (优选试卷 / 优质教案)
 *
 * 所有生成结果都保存在当前用户隔离的 localStorage 命名空间, 方便随时回看与再次下载.
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { GeneratedPaper, GeneratedLessonPlan, GeneratedKnowledge, PaperQueryDoc } from '../types'
import { now, uid } from '../utils'
import { getStorageKey, onUserChange } from '../utils/storage'

const PKEY = () => getStorageKey('papers')
const LKEY = () => getStorageKey('lessonplans')
const KKEY = () => getStorageKey('knowledges')
const QKEY = () => getStorageKey('paperqueries')

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
function loadKnowledges(): GeneratedKnowledge[] {
  try {
    const raw = localStorage.getItem(KKEY())
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return []
}
function loadQueries(): PaperQueryDoc[] {
  try {
    const raw = localStorage.getItem(QKEY())
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return []
}

export const useGeneratedStore = defineStore('generated', () => {
  const papers = ref<GeneratedPaper[]>(loadPapers())
  const lessonPlans = ref<GeneratedLessonPlan[]>(loadPlans())
  const knowledges = ref<GeneratedKnowledge[]>(loadKnowledges())
  const queries = ref<PaperQueryDoc[]>(loadQueries())

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

  function addKnowledge(p: Omit<GeneratedKnowledge, 'id' | 'createdAt'>) {
    const item: GeneratedKnowledge = { ...p, id: uid(), createdAt: now() }
    knowledges.value.unshift(item)
    return item
  }
  function removeKnowledge(id: string) {
    knowledges.value = knowledges.value.filter((x) => x.id !== id)
  }
  function getKnowledge(id: string) {
    return knowledges.value.find((x) => x.id === id) || null
  }

  function addQuery(p: Omit<PaperQueryDoc, 'id' | 'createdAt'>) {
    const item: PaperQueryDoc = { ...p, id: uid(), createdAt: now() }
    queries.value.unshift(item)
    return item
  }
  function removeQuery(id: string) {
    queries.value = queries.value.filter((x) => x.id !== id)
  }
  function getQuery(id: string) {
    return queries.value.find((x) => x.id === id) || null
  }

  function clearAll() {
    papers.value = []
    lessonPlans.value = []
    knowledges.value = []
    queries.value = []
  }

  watch(
    [papers, lessonPlans, knowledges, queries],
    () => {
      localStorage.setItem(PKEY(), JSON.stringify(papers.value))
      localStorage.setItem(LKEY(), JSON.stringify(lessonPlans.value))
      localStorage.setItem(KKEY(), JSON.stringify(knowledges.value))
      localStorage.setItem(QKEY(), JSON.stringify(queries.value))
    },
    { deep: true },
  )

  onUserChange(() => {
    papers.value = loadPapers()
    lessonPlans.value = loadPlans()
    knowledges.value = loadKnowledges()
    queries.value = loadQueries()
  })

  return {
    papers,
    lessonPlans,
    knowledges,
    queries,
    addPaper,
    removePaper,
    getPaper,
    addLessonPlan,
    removeLessonPlan,
    getLessonPlan,
    addKnowledge,
    removeKnowledge,
    getKnowledge,
    addQuery,
    removeQuery,
    getQuery,
    clearAll,
    reload: () => {
      papers.value = loadPapers()
      lessonPlans.value = loadPlans()
      knowledges.value = loadKnowledges()
      queries.value = loadQueries()
    },
  }
})
