import { ref } from 'vue'
import request from '@/api/request'

export interface MyClass {
  id: string
  teacherId: string
  name: string
  grade: string
  classNo: string
  headTeacher: string
  term: string
  subjects?: string[]
  /** 科目 → 任课教师姓名 */
  subjectTeachers?: Record<string, string>
  color?: string
  createdAt: string
}

/** 当前教师可见的班级（含班主任 + 科任） */
const classes = ref<MyClass[]>([])
const loaded = ref(false)
const loading = ref(false)

/** 加载班级列表（教师端 /classes 返回数组） */
export async function loadClasses(force = false) {
  if (loaded.value && !force) return classes.value
  if (loading.value) return classes.value
  loading.value = true
  try {
    const res = await request.get('/classes')
    classes.value = Array.isArray(res) ? res : (res?.items || [])
    loaded.value = true
  } catch {
    classes.value = []
  } finally {
    loading.value = false
  }
  return classes.value
}

export function useClasses() {
  return { classes, loading, loadClasses }
}

export function classNameById(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}
