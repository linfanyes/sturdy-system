/**
 * useClasses —— 班级列表 composable。
 *
 * 【注意】当前使用模块级单例模式：HMR（热模块替换）会重置 classes/loaded/loading 状态。
 * 此为有意权衡——保证全局共享同一份班级缓存，避免重复请求。
 * 若需完全独立的响应式状态（如多实例场景），请使用 useClassesFactory()。
 */
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
  /** 已创建的腾讯 IM 班级群号（后端 class.entity 持久化；空串表示尚未建群） */
  imGroupId?: string
  createdAt: string
}

// —— 模块级单例状态（HMR 会重置，见上方注释）——
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

/** Composable：返回班级状态与加载函数 */
export function useClasses() {
  return { classes, loading, loadClasses, loaded }
}

/** 通过 id 查找班级名 */
export function classNameById(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

// —— 工厂函数（可选）：完全独立的响应式状态，不受 HMR 影响 ——

export function useClassesFactory() {
  const classes = ref<MyClass[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function loadClasses(force = false) {
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

  return { classes, loading, loadClasses, loaded }
}
