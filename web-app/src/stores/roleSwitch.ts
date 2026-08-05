import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 师兼家双角色切换 store。
 * - 当用户同时拥有 teacher + parent 身份时，登录后存储双 token 与双 user 对象
 * - switchTo() 切换当前身份，覆盖 auth store 中的 token 和 user
 * - 持久化到 localStorage，刷新后双身份仍可切换
 */

type SwitchUser = {
  role: string
  [k: string]: any
}

const PERSIST_KEY = 'trace_role_switch'

interface PersistShape {
  teacherToken: string
  parentToken: string
  teacherUser: SwitchUser | null
  parentUser: SwitchUser | null
  currentRole: 'teacher' | 'parent'
}

function loadPersisted(): Partial<PersistShape> | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    return raw ? (JSON.parse(raw) as Partial<PersistShape>) : null
  } catch {
    return null
  }
}

export const useRoleSwitchStore = defineStore('roleSwitch', () => {
  const teacherToken = ref('')
  const parentToken = ref('')
  const teacherUser = ref<SwitchUser | null>(null)
  const parentUser = ref<SwitchUser | null>(null)
  const currentRole = ref<'teacher' | 'parent'>('teacher')

  // 刷新后恢复双身份上下文（token/user）
  const saved = loadPersisted()
  if (saved) {
    teacherToken.value = saved.teacherToken || ''
    parentToken.value = saved.parentToken || ''
    teacherUser.value = saved.teacherUser || null
    parentUser.value = saved.parentUser || null
    currentRole.value = saved.currentRole || 'teacher'
  }

  function persist() {
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          teacherToken: teacherToken.value,
          parentToken: parentToken.value,
          teacherUser: teacherUser.value,
          parentUser: parentUser.value,
          currentRole: currentRole.value,
        }),
      )
    } catch {
      /* 忽略持久化失败 */
    }
  }

  /**
   * 登录双身份选择时调用：无论先选 teacher 还是 parent，都写入双 token 与双 user，
   * 保证两端切换按钮都可出现。
   */
  function setTokens(payload: {
    teacherToken: string
    parentToken: string
    teacherUser: SwitchUser
    parentUser: SwitchUser
    initialRole?: 'teacher' | 'parent'
  }) {
    teacherToken.value = payload.teacherToken
    parentToken.value = payload.parentToken
    teacherUser.value = payload.teacherUser
    parentUser.value = payload.parentUser
    currentRole.value = payload.initialRole || 'teacher'
    persist()
  }

  function switchTo(
    targetRole: 'teacher' | 'parent',
    setAuth: (token: string, user: any) => void,
  ) {
    if (targetRole === 'teacher' && teacherToken.value && teacherUser.value) {
      // 切回教师端：使用登录时存好的教师 user（含 name/subject 等字段），不再误用家长数据
      setAuth(teacherToken.value, teacherUser.value)
      currentRole.value = 'teacher'
      persist()
    } else if (targetRole === 'parent' && parentToken.value && parentUser.value) {
      setAuth(parentToken.value, parentUser.value)
      currentRole.value = 'parent'
      persist()
    }
  }

  function clear() {
    teacherToken.value = ''
    parentToken.value = ''
    teacherUser.value = null
    parentUser.value = null
    currentRole.value = 'teacher'
    try {
      localStorage.removeItem(PERSIST_KEY)
    } catch {
      /* 忽略 */
    }
  }

  return {
    teacherToken,
    parentToken,
    teacherUser,
    parentUser,
    currentRole,
    setTokens,
    switchTo,
    clear,
  }
})
