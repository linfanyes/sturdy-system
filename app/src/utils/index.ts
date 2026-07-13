// 通用工具函数
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { downloadBlob } from './download'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}

export function now() {
  return Date.now()
}

export function formatDate(t: number | string, fmt = 'YYYY-MM-DD HH:mm') {
  const d = typeof t === 'number' ? new Date(t) : new Date(t)
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatShort(t: number | string) {
  const d = typeof t === 'number' ? new Date(t) : new Date(t)
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getMonth() + 1}-${pad(d.getDate())}`
}

export function dayOfWeekCN(d = new Date()) {
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function avg(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

export function downloadJSON(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 全部候选学科（兜底用）。当班级没有设置学期/学科时使用。
 */
export const ALL_SUBJECTS = [
  '语文',
  '数学',
  '英语',
  '科学',
  '品德',
  '音乐',
  '美术',
  '体育',
  '综合实践',
  '信息技术',
]

/**
 * 默认老师池 (当 teacherStore 还没有数据时使用, 用于种子 / 新建班级)
 */
export const DEFAULT_TEACHER_POOL = [
  '李老师',
  '王老师',
  '张老师',
  '陈老师',
  '刘老师',
  '赵老师',
  '周老师',
  '吴老师',
  '徐老师',
]

/**
 * 课表自动排课: 周一-周五, 1-7 节随机安排学科, 5=午自习(班主任), 8=课后服务(班主任)
 * - 每个工作日 1-4 节: 从 8 个学科中随机 4 个, 保证至少出现 1 个主科 (语数英)
 * - 第 5 节: 固定 午自习, 默认老师 = 班主任
 * - 6-7 节: 从剩余学科里随机 2 个 (不与 1-4 重复)
 * - 第 8 节: 固定 课后服务, 默认老师 = 班主任
 *
 * @param teacherPool 老师池 (种子 / 新建班级时使用, 当 teacherBySubject 不足时兜底)
 * @param teacherBySubject 学科 -> 老师列表, 优先从此处为学科分配老师
 */
export function generateAutoSchedule(opts: {
  classId: string
  headTeacher: string
  teacherBySubject?: Record<string, string[]>
  teacherPool?: string[]
}): Array<{
  classId: string
  dayOfWeek: number
  period: number
  subject: string
  teacher: string
  note: string
}> {
  const {
    classId,
    headTeacher,
    teacherBySubject = {},
    teacherPool = DEFAULT_TEACHER_POOL,
  } = opts

  const mainSubjects = ['语文', '数学', '英语']
  const minorSubjects = ['音乐', '美术', '体育', '品德', '科学', '综合实践', '信息技术']
  const allSubjects = [...mainSubjects, ...minorSubjects]

  function pickTeacher(subject: string, usedSet: Set<string>): string {
    const pool = teacherBySubject[subject] || []
    const list = pool.length
      ? pool
      : teacherPool.filter((n) => n !== headTeacher)
    // 优先选还没在本日用过的老师
    const fresh = list.filter((n) => !usedSet.has(n))
    const chosen = (fresh.length ? fresh : list)[0] || '未知'
    usedSet.add(chosen)
    return chosen
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const result: Array<{
    classId: string
    dayOfWeek: number
    period: number
    subject: string
    teacher: string
    note: string
  }> = []

  for (let d = 1; d <= 5; d++) {
    const usedTeachers = new Set<string>()
    // 1-4 节: 4 个学科, 至少 1 个主科
    const daySubjects = shuffle(allSubjects).slice(0, 4)
    if (!daySubjects.some((s) => mainSubjects.includes(s))) {
      // 兜底: 把第一个换成随机主科
      daySubjects[0] = pick(mainSubjects)
    }
    for (let p = 1; p <= 4; p++) {
      const subject = daySubjects[p - 1]
      result.push({
        classId,
        dayOfWeek: d,
        period: p,
        subject,
        teacher: pickTeacher(subject, usedTeachers),
        note: '',
      })
    }
    // 5 = 午自习, 老师 = 班主任
    result.push({
      classId,
      dayOfWeek: d,
      period: 5,
      subject: '午自习',
      teacher: headTeacher || '班主任',
      note: '',
    })
    usedTeachers.add(headTeacher)
    // 6-7 节: 从 1-4 用过的学科之外随机 2 个
    const restSubjects = shuffle(allSubjects.filter((s) => !daySubjects.includes(s)))
    const afternoon = restSubjects.slice(0, 2)
    // 若 rest 不足 2 个 (极端), 用全部里补齐
    while (afternoon.length < 2) {
      afternoon.push(pick(allSubjects.filter((s) => !afternoon.includes(s))))
    }
    for (let p = 6; p <= 7; p++) {
      const subject = afternoon[(p - 6) % afternoon.length]
      result.push({
        classId,
        dayOfWeek: d,
        period: p,
        subject,
        teacher: pickTeacher(subject, usedTeachers),
        note: '',
      })
    }
    // 8 = 课后服务, 老师 = 班主任
    result.push({
      classId,
      dayOfWeek: d,
      period: 8,
      subject: '课后服务',
      teacher: headTeacher || '班主任',
      note: '',
    })
  }

  return result
}

/**
 * 取出班级设置的学科范围。
 * - 班级存在且已设置学期/学科：返回已勾选学科
 * - 班级存在但未设置：返回全部候选学科
 * - 班级不存在：返回全部候选学科
 */
export function classSubjects(
  classItem: { subjects?: string[] } | null | undefined,
  fallback: string[] = ALL_SUBJECTS,
): string[] {
  if (classItem && Array.isArray(classItem.subjects) && classItem.subjects.length) {
    return classItem.subjects
  }
  return fallback
}

/** 班级学期：班级未设置时回退到用户当前任教学期，再回退到空字符串 */
export function classTerm(
  classItem: { term?: string } | null | undefined,
  userTerm: string = '',
): string {
  return classItem?.term || userTerm || ''
}
