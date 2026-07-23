import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SeatLayout } from '../types'
import { now, uid } from '../utils'
import { usePersistStore } from '../composables/usePersistStore'
import { useClassStore } from './class'

export const useSeatStore = defineStore('seat', () => {
  const layouts = ref<SeatLayout[]>([])

  const { reload, replaceAll } = usePersistStore(
    'seats',
    { layouts },
    (): { layouts: SeatLayout[] } => ({ layouts: [] }),
  )

  const layoutsByClass = computed(() => {
    const map = new Map<string, SeatLayout[]>()
    for (const l of layouts.value) {
      const arr = map.get(l.classId)
      if (arr) arr.push(l)
      else map.set(l.classId, [l])
    }
    return map
  })

  function addLayout(payload: Omit<SeatLayout, 'id' | 'createdAt'>) {
    const l: SeatLayout = { ...payload, id: uid(), createdAt: now() }
    layouts.value.push(l)
    return l
  }

  function updateLayout(id: string, patch: Partial<SeatLayout>) {
    const idx = layouts.value.findIndex((l) => l.id === id)
    if (idx >= 0) layouts.value[idx] = { ...layouts.value[idx], ...patch }
  }

  function removeLayout(id: string) {
    layouts.value = layouts.value.filter((l) => l.id !== id)
  }

  function layoutsOfClass(classId: string) {
    return layoutsByClass.value.get(classId) || []
  }

  /** 获取班级当前启用的座位表 */
  function activeLayoutOfClass(classId: string): SeatLayout | undefined {
    return layouts.value.find((l) => l.classId === classId && l.active)
  }

  /**
   * 启用指定座位表：
   * 1. 同班级其他布局取消 active
   * 2. 目标布局设为 active
   * 3. 将座位写入学生的 seatRow / seatCol
   */
  function activateLayout(id: string) {
    const target = layouts.value.find((l) => l.id === id)
    if (!target) return

    // 同班级去活
    for (const l of layouts.value) {
      if (l.classId === target.classId && l.id !== id) {
        l.active = false
      }
    }
    target.active = true

    // 写入学生 seatRow / seatCol
    const classStore = useClassStore()
    for (let r = 0; r < target.seats.length; r++) {
      for (let c = 0; c < target.seats[r].length; c++) {
        const studentId = target.seats[r][c]
        if (studentId) {
          classStore.updateStudent(studentId, { seatRow: r + 1, seatCol: c + 1 })
        }
      }
    }
  }

  function clearByClass(classId: string) {
    layouts.value = layouts.value.filter((l) => l.classId !== classId)
  }

  return {
    layouts,
    addLayout,
    updateLayout,
    removeLayout,
    layoutsOfClass,
    activeLayoutOfClass,
    activateLayout,
    clearByClass,
    replaceAll,
    reload,
  }
})
