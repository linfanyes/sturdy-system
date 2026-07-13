import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Exam } from '../types'
import { now, uid } from '../utils'
import { getStorageKey, onUserChange } from '../utils/storage'
import { currentTermStr, normalizeTerm } from './user'
import { useGradeStore } from './grade'

const KEY = () => getStorageKey('exams')

interface ExamState {
  exams: Exam[]
  currentTerm: string
}

function load(): ExamState {
  try {
    const raw = localStorage.getItem(KEY())
    if (raw) {
      const data = JSON.parse(raw)
      return {
        exams: (data.exams || []).map((e: Exam) => ({
          ...e,
          term: normalizeTerm(e.term),
        })),
        currentTerm: normalizeTerm(data.currentTerm || currentTermStr()),
      }
    }
  } catch (e) {
    /* noop */
  }
  return { exams: [], currentTerm: currentTermStr() }
}

export const useExamStore = defineStore('exam', () => {
  const initial = load()
  const exams = ref<Exam[]>(initial.exams)
  const currentTermName = ref<string>(initial.currentTerm)

  function reload() {
    const next = load()
    exams.value = next.exams
    currentTermName.value = next.currentTerm
  }

  function addExam(payload: Omit<Exam, 'id' | 'createdAt'>) {
    exams.value.unshift({ ...payload, id: uid(), createdAt: now() })
  }
  function updateExam(id: string, patch: Partial<Exam>) {
    const i = exams.value.findIndex((e) => e.id === id)
    if (i < 0) return
    const old = exams.value[i]
    const merged = { ...old, ...patch }
    exams.value[i] = merged
    // 若考试科目被裁剪，则同步清理成绩管理中该考试下被移除科目的成绩
    if (patch.subjects) {
      const removed = old.subjects.filter((s) => !merged.subjects.includes(s))
      if (removed.length) {
        useGradeStore().removeSubjectsOfExam({
          examId: id,
          classId: old.classId,
          examName: old.name,
          date: old.date,
          subjects: removed,
        })
      }
    }
  }
  function removeExam(id: string) {
    exams.value = exams.value.filter((e) => e.id !== id)
  }
  function getExam(id: string) {
    return exams.value.find((e) => e.id === id) || null
  }

  function setCurrentTerm(t: string) {
    currentTermName.value = t
  }

  function replaceAll(list: Exam[]) {
    exams.value = list
  }

  /** 将 fromId 班级的考试计划迁到 toId */
  function reassignClass(fromId: string, toId: string) {
    if (fromId === toId) return
    exams.value = exams.value.map((e) =>
      e.classId === fromId ? { ...e, classId: toId } : e,
    )
  }

  function clearByClass(classId: string) {
    exams.value = exams.value.filter((e) => e.classId !== classId)
  }

  watch(
    [exams, currentTermName],
    () => {
      localStorage.setItem(
        KEY(),
        JSON.stringify({ exams: exams.value, currentTerm: currentTermName.value }),
      )
    },
    { deep: true },
  )

  onUserChange(() => {
    reload()
  })

  return {
    exams,
    currentTermName,
    addExam,
    updateExam,
    removeExam,
    getExam,
    setCurrentTerm,
    reassignClass,
    clearByClass,
    replaceAll,
    reload,
  }
})
