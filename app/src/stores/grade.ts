import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Grade, GradeScore } from '../types'
import { now, uid } from '../utils'
import { seedGrades } from '../seed'
import { usePersistStore } from '../composables/usePersistStore'

export const useGradeStore = defineStore('grade', () => {
  const grades = ref<Grade[]>([])

  const { reload, replaceAll } = usePersistStore(
    'grades',
    { grades },
    () => ({ grades: seedGrades.map((g) => ({ ...g })) }),
  )

  // 一次遍历构建全部索引，减少 O(3N) → O(N)
  const _indexes = computed(() => {
    const byId = new Map<string, Grade>()
    const byClass = new Map<string, Grade[]>()
    const byClassSubject = new Map<string, Grade[]>()
    for (const g of grades.value) {
      byId.set(g.id, g)
      const arr1 = byClass.get(g.classId)
      if (arr1) arr1.push(g)
      else byClass.set(g.classId, [g])
      const key = `${g.classId}::${g.subject}`
      const arr2 = byClassSubject.get(key)
      if (arr2) arr2.push(g)
      else byClassSubject.set(key, [g])
    }
    return { byId, byClass, byClassSubject }
  })

  const gradeMap = computed(() => _indexes.value.byId)
  const gradesByClass = computed(() => _indexes.value.byClass)
  const gradesByClassSubject = computed(() => _indexes.value.byClassSubject)

  function addGrade(payload: Omit<Grade, 'id' | 'createdAt'>) {
    const g: Grade = { ...payload, id: uid(), createdAt: now() }
    grades.value.push(g)
    return g
  }

  function updateGrade(id: string, patch: Partial<Grade>) {
    const idx = grades.value.findIndex((g) => g.id === id)
    if (idx >= 0) grades.value[idx] = { ...grades.value[idx], ...patch }
  }

  function removeGrade(id: string) {
    grades.value = grades.value.filter((g) => g.id !== id)
  }

  function gradesOfClass(classId: string) {
    return gradesByClass.value.get(classId) || []
  }

  function gradesOfClassSubject(classId: string, subject: string) {
    return gradesByClassSubject.value.get(`${classId}::${subject}`) || []
  }

  function setScore(gradeId: string, studentId: string, score: number | null) {
    const g = gradeMap.value.get(gradeId)
    if (!g) return
    const item = g.scores.find((s) => s.studentId === studentId)
    if (item) item.score = score
    else g.scores.push({ studentId, score })
  }

  /**
   * 查找已有的同班级+同考试+同科目的成绩记录
   * 用于批量导入时判断是否重复，以及合并更新分数
   */
  function findGrade(classId: string, examName: string, subject: string) {
    return grades.value.find(
      (g) =>
        g.classId === classId &&
        g.examName.trim() === examName.trim() &&
        g.subject === subject,
    )
  }

  /**
   * 合并导入成绩：如果已存在则更新学生分数，不存在则新增
   * 返回 { created: boolean, gradeId: string }
   */
  function mergeGrade(payload: Omit<Grade, 'id' | 'createdAt'>) {
    const existing = findGrade(payload.classId, payload.examName, payload.subject)
    if (existing) {
      // 合并：更新已有学生的分数，新增学生追加
      for (const sc of payload.scores) {
        const item = existing.scores.find((s) => s.studentId === sc.studentId)
        if (item) item.score = sc.score
        else existing.scores.push(sc)
      }
      return { created: false, gradeId: existing.id }
    } else {
      const g = addGrade(payload)
      return { created: true, gradeId: g.id }
    }
  }

  function ensureScores(gradeId: string, studentIds: string[]) {
    const g = gradeMap.value.get(gradeId)
    if (!g) return
    for (const id of studentIds) {
      if (!g.scores.find((s) => s.studentId === id)) {
        g.scores.push({ studentId: id, score: null })
      }
    }
  }

  /** 将 fromId 班级的成绩迁到 toId */
  function reassignClass(fromId: string, toId: string) {
    if (fromId === toId) return
    grades.value = grades.value.map((g) =>
      g.classId === fromId ? { ...g, classId: toId } : g,
    )
  }

  /** 删除 fromId 班级所有成绩 */
  function clearByClass(classId: string) {
    grades.value = grades.value.filter((g) => g.classId !== classId)
  }

  /** 删除 fromId 学生所有分数 (从每条 grade.scores 中过滤掉) */
  function clearByStudent(studentIds: string[]) {
    const set = new Set(studentIds)
    grades.value = grades.value.map((g) => ({
      ...g,
      scores: g.scores.filter((s) => !set.has(s.studentId)),
    }))
  }

  /** 找到某场考试 (按 classId + subject + examName + date 匹配) */
  function findGradeMatch(
    classId: string,
    subject: string,
    examName: string,
    date: string,
  ): Grade | undefined {
    return grades.value.find(
      (g) =>
        g.classId === classId &&
        g.subject === subject &&
        g.examName === examName &&
        g.date === date,
    )
  }

  /** 删除一场考试的所有成绩 (按 examId 优先, 否则按 classId+subject+examName+date 匹配) */
  function clearByExam(opts: {
    examId?: string
    classId: string
    subjects: string[]
    examName: string
    date: string
  }) {
    grades.value = grades.value.filter((g) => {
      // 优先按 examId 匹配
      if (opts.examId && g.examId === opts.examId) return false
      // 否则按业务字段匹配 (兼容历史未关联 examId 的数据)
      if (
        g.classId === opts.classId &&
        g.examName.trim() === opts.examName.trim() &&
        g.date === opts.date &&
        opts.subjects.includes(g.subject)
      ) {
        return false
      }
      return true
    })
  }

  /**
   * 删除某场考试中「被移除科目」的全部成绩，与考试科目计划保持同步。
   * 优先按 examId 匹配，否则按 班级+考试名+日期 匹配（兼容历史未关联 examId 的数据）。
   */
  function removeSubjectsOfExam(opts: {
    examId?: string
    classId: string
    examName: string
    date: string
    subjects: string[]
  }) {
    grades.value = grades.value.filter((g) => {
      const matchExam = opts.examId
        ? g.examId === opts.examId
        : g.classId === opts.classId &&
          g.examName.trim() === opts.examName.trim() &&
          g.date === opts.date
      if (!matchExam) return true
      return !opts.subjects.includes(g.subject)
    })
  }

  return {
    grades,
    addGrade,
    updateGrade,
    removeGrade,
    gradesOfClass,
    gradesOfClassSubject,
    setScore,
    findGrade,
    mergeGrade,
    ensureScores,
    reassignClass,
    clearByClass,
    clearByStudent,
    clearByExam,
    removeSubjectsOfExam,
    findGradeMatch,
    replaceAll,
    reload,
  }
})

// 统计工具
export interface GradeStat {
  count: number
  avg: number
  max: number
  min: number
  median: number
  passRate: number
  excellentRate: number
  // 10 段：0-9, 10-19, 20-29, ..., 90-100
  distribution: number[]
  distLabels: string[]
  ranking: { studentId: string; score: number; rank: number }[]
}

export function calcStat(scores: GradeScore[], fullScore = 100): GradeStat {
  const fs = fullScore > 0 ? fullScore : 100
  const passLine = fs * 0.6
  const excLine = fs * 0.9
  const bands = 10
  const w = fs / bands
  const dist = new Array(bands).fill(0)
  const distLabels: string[] = []
  for (let b = 0; b < bands; b++) {
    const lo = Math.round(b * w)
    const hi = Math.round((b + 1) * w)
    distLabels.push(b === bands - 1 ? `${lo}-${hi}` : `${lo}-${hi - 1}`)
  }

  const valid: { studentId: string; score: number }[] = []
  let count = 0
  let sum = 0
  let max = -Infinity
  let min = Infinity
  let pass = 0
  let exc = 0

  for (let i = 0; i < scores.length; i++) {
    const raw = scores[i].score as unknown
    if (raw === null || raw === undefined || raw === '') continue
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    valid.push({ studentId: scores[i].studentId, score: n })
    count++
    sum += n
    if (n > max) max = n
    if (n < min) min = n
    if (n >= passLine) pass++
    if (n >= excLine) exc++
    let idx = Math.floor(n / w)
    if (idx < 0) idx = 0
    if (idx > bands - 1) idx = bands - 1
    dist[idx]++
  }

  if (count === 0) {
    return {
      count: 0,
      avg: 0,
      max: 0,
      min: 0,
      median: 0,
      passRate: 0,
      excellentRate: 0,
      distribution: dist,
      distLabels,
      ranking: [],
    }
  }

  const avg = Math.round((sum / count) * 10) / 10
  max = max === -Infinity ? 0 : max
  min = min === Infinity ? 0 : min

  const nums = new Array(count)
  for (let i = 0; i < count; i++) nums[i] = valid[i].score
  nums.sort((a, b) => a - b)
  let median = 0
  if (count % 2) median = nums[(count - 1) / 2]
  else median = (nums[count / 2 - 1] + nums[count / 2]) / 2
  median = Math.round(median * 10) / 10

  const ranking = [...valid]
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }))

  return {
    count,
    avg,
    max,
    min,
    median,
    passRate: Math.round((pass / count) * 1000) / 10,
    excellentRate: Math.round((exc / count) * 1000) / 10,
    distribution: dist,
    distLabels,
    ranking,
  }
}
