import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ParentContact, NoticeTemplate } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

export const useParentContactStore = defineStore('parentContact', () => {
  const contacts = ref<ParentContact[]>([])
  const templates = ref<NoticeTemplate[]>([])

  const { reload, replaceAll } = usePersistStore(
    'parentContacts',
    { contacts, templates },
    (): { contacts: ParentContact[]; templates: NoticeTemplate[] } => ({ contacts: [], templates: [] }),
  )

  const contactsByStudent = computed(() => {
    const map = new Map<string, ParentContact[]>()
    for (const c of contacts.value) {
      const arr = map.get(c.studentId)
      if (arr) arr.push(c)
      else map.set(c.studentId, [c])
    }
    return map
  })

  const templatesByCategory = computed(() => {
    const map = new Map<string, NoticeTemplate[]>()
    for (const t of templates.value) {
      const arr = map.get(t.category)
      if (arr) arr.push(t)
      else map.set(t.category, [t])
    }
    return map
  })

  function addContact(payload: Omit<ParentContact, 'id' | 'createdAt'>) {
    const c: ParentContact = { ...payload, id: uid(), createdAt: now() }
    contacts.value.push(c)
    return c
  }

  function updateContact(id: string, patch: Partial<ParentContact>) {
    const idx = contacts.value.findIndex((c) => c.id === id)
    if (idx >= 0) contacts.value[idx] = { ...contacts.value[idx], ...patch }
  }

  function removeContact(id: string) {
    contacts.value = contacts.value.filter((c) => c.id !== id)
  }

  function contactsOfStudent(studentId: string) {
    return contactsByStudent.value.get(studentId) || []
  }

  function clearByStudent(studentIds: string[]) {
    const set = new Set(studentIds)
    contacts.value = contacts.value.filter((c) => !set.has(c.studentId))
  }

  function addTemplate(payload: Omit<NoticeTemplate, 'id' | 'createdAt'>) {
    const t: NoticeTemplate = { ...payload, id: uid(), createdAt: now() }
    templates.value.push(t)
    return t
  }

  function updateTemplate(id: string, patch: Partial<NoticeTemplate>) {
    const idx = templates.value.findIndex((t) => t.id === id)
    if (idx >= 0) templates.value[idx] = { ...templates.value[idx], ...patch }
  }

  function removeTemplate(id: string) {
    templates.value = templates.value.filter((t) => t.id !== id)
  }

  return {
    contacts,
    templates,
    contactsByStudent,
    templatesByCategory,
    addContact,
    updateContact,
    removeContact,
    contactsOfStudent,
    clearByStudent,
    addTemplate,
    updateTemplate,
    removeTemplate,
    replaceAll,
    reload,
  }
})
