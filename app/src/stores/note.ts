import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NoteItem } from '../types'
import { now, uid } from '../utils'
import { seedNotes } from '../seed'
import { usePersistStore } from '../composables/usePersistStore'

export const useNoteStore = defineStore('note', () => {
  const notes = ref<NoteItem[]>([])

  const { reload, replaceAll } = usePersistStore(
    'notes',
    { notes },
    () => ({ notes: seedNotes.map((n) => ({ ...n })) }),
  )

  function addNote(payload: Pick<NoteItem, 'title' | 'content' | 'category'>) {
    const n: NoteItem = {
      ...payload,
      id: uid(),
      pinned: false,
      favorite: false,
      createdAt: now(),
      updatedAt: now(),
    }
    notes.value.unshift(n)
    return n
  }

  function updateNote(id: string, patch: Partial<NoteItem>) {
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx >= 0) {
      notes.value[idx] = { ...notes.value[idx], ...patch, updatedAt: now() }
    }
  }

  function removeNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  function togglePinned(id: string) {
    const n = notes.value.find((x) => x.id === id)
    if (n) n.pinned = !n.pinned
  }

  function toggleFavorite(id: string) {
    const n = notes.value.find((x) => x.id === id)
    if (n) n.favorite = !n.favorite
  }

  return {
    notes,
    addNote,
    updateNote,
    removeNote,
    togglePinned,
    toggleFavorite,
    replaceAll,
    reload,
  }
})
