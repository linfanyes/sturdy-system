import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TodoItem } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'

interface TodoState {
  todos: TodoItem[]
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<TodoItem[]>([])

  const { reload, replaceAll } = usePersistStore<TodoState>(
    'todos',
    { todos },
    () => ({ todos: [] }),
  )

  function addTodo(payload: Pick<TodoItem, 'title' | 'note' | 'date'>) {
    const t: TodoItem = {
      id: uid(),
      title: payload.title,
      note: payload.note || '',
      date: payload.date || '',
      done: false,
      doneAt: 0,
      createdAt: now(),
    }
    todos.value.unshift(t)
    return t
  }
  function updateTodo(id: string, patch: Partial<TodoItem>) {
    const i = todos.value.findIndex((t) => t.id === id)
    if (i >= 0) todos.value[i] = { ...todos.value[i], ...patch }
  }
  function removeTodo(id: string) {
    todos.value = todos.value.filter((t) => t.id !== id)
  }
  function toggleTodo(id: string) {
    const t = todos.value.find((x) => x.id === id)
    if (!t) return
    t.done = !t.done
    t.doneAt = t.done ? now() : 0
  }

  return { todos, addTodo, updateTodo, removeTodo, toggleTodo, replaceAll, reload }
})
