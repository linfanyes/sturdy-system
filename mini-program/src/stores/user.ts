import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { User, Theme } from '../types'
import { getStorageKey, onUserChange, setCurrentUserId, getStorage, setStorage } from '../utils/storage'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const theme = ref<Theme>('light')
  const colorScheme = ref('butter')
  const fontSize = ref('md')

  const load = () => {
    const raw = getStorage(getStorageKey('user'), null)
    if (raw) {
      user.value = raw
    }
    theme.value = getStorage(getStorageKey('theme'), 'light')
    colorScheme.value = getStorage(getStorageKey('colorScheme'), 'butter')
    fontSize.value = getStorage(getStorageKey('fontSize'), 'md')
  }

  const save = () => {
    if (user.value) {
      setStorage(getStorageKey('user'), user.value)
      setStorage('trace-user', { user: user.value })
    }
    setStorage(getStorageKey('theme'), theme.value)
    setStorage(getStorageKey('colorScheme'), colorScheme.value)
    setStorage(getStorageKey('fontSize'), fontSize.value)
  }

  watch([user, theme, colorScheme, fontSize], save, { deep: true })

  const login = (name: string, subject: string, school: string) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name,
      subject,
      subjects: [subject],
      term: '2026春季学期',
      school,
      avatar: ['👨‍🏫', '👩‍🏫', '🧑‍🏫'][Math.floor(Math.random() * 3)],
      motto: '用心教育，用爱陪伴',
      createdAt: Date.now(),
    }
    user.value = newUser
    setCurrentUserId(newUser.id)
    save()
  }

  const logout = () => {
    user.value = null
    setCurrentUserId(null)
    save()
  }

  const updateProfile = (data: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...data }
    }
  }

  const setTheme = (t: Theme) => {
    theme.value = t
  }

  const setColorScheme = (c: string) => {
    colorScheme.value = c
  }

  const setFontSize = (s: string) => {
    fontSize.value = s
  }

  load()
  onUserChange(load)

  return {
    user,
    theme,
    colorScheme,
    fontSize,
    login,
    logout,
    updateProfile,
    setTheme,
    setColorScheme,
    setFontSize,
  }
})
