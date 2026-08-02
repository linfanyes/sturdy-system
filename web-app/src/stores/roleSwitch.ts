import { defineStore } from 'pinia'
import { ref } from 'vue'
import { buildParentUser } from '@/api/auth'

/**
 * 师兼家双角色切换 store。
 * - 当用户同时拥有 teacher + parent 身份时，登录后存储双 token
 * - switchTo() 切换当前身份，覆盖 auth store 中的 token 和 user
 */
export const useRoleSwitchStore = defineStore('roleSwitch', () => {
  const teacherToken = ref('')
  const parentToken = ref('')
  const parentData = ref<any>(null)
  const currentRole = ref<'teacher' | 'parent'>('teacher')

  function setTokens(tt: string, pt: string, pd: any) {
    teacherToken.value = tt
    parentToken.value = pt
    parentData.value = pd
  }

  function switchTo(targetRole: 'teacher' | 'parent', setAuth: (token: string, user: any) => void) {
    if (targetRole === 'teacher' && teacherToken.value) {
      setAuth(teacherToken.value, { role: 'teacher', ...parentData.value?.user })
      currentRole.value = 'teacher'
    } else if (targetRole === 'parent' && parentToken.value) {
      setAuth(parentToken.value, buildParentUser(parentData.value))
      currentRole.value = 'parent'
    }
  }

  function clear() {
    teacherToken.value = ''
    parentToken.value = ''
    parentData.value = null
    currentRole.value = 'teacher'
  }

  return { teacherToken, parentToken, parentData, currentRole, setTokens, switchTo, clear }
})
