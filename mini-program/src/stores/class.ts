import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { ClassItem, Student } from '../types'
import { getStorageKey, onUserChange, getStorage, setStorage } from '../utils/storage'

export const useClassStore = defineStore('class', () => {
  const classes = ref<ClassItem[]>([])
  const students = ref<Student[]>([])

  const load = () => {
    classes.value = getStorage(getStorageKey('classes'), [])
    students.value = getStorage(getStorageKey('students'), [])
  }

  const save = () => {
    setStorage(getStorageKey('classes'), classes.value)
    setStorage(getStorageKey('students'), students.value)
  }

  watch([classes, students], save, { deep: true })

  const addClass = (data: Omit<ClassItem, 'id' | 'createdAt'>) => {
    const newClass: ClassItem = {
      ...data,
      id: `class_${Date.now()}`,
      createdAt: Date.now(),
    }
    classes.value.push(newClass)
    return newClass
  }

  const updateClass = (id: string, data: Partial<ClassItem>) => {
    const index = classes.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      classes.value[index] = { ...classes.value[index], ...data }
    }
  }

  const deleteClass = (id: string) => {
    classes.value = classes.value.filter((c) => c.id !== id)
    students.value = students.value.filter((s) => s.classId !== id)
  }

  const getClassById = (id: string) => {
    return classes.value.find((c) => c.id === id)
  }

  const addStudent = (data: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...data,
      id: `student_${Date.now()}`,
      createdAt: Date.now(),
    }
    students.value.push(newStudent)
    return newStudent
  }

  const updateStudent = (id: string, data: Partial<Student>) => {
    const index = students.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      students.value[index] = { ...students.value[index], ...data }
    }
  }

  const deleteStudent = (id: string) => {
    students.value = students.value.filter((s) => s.id !== id)
  }

  const getStudentsByClass = (classId: string) => {
    return students.value.filter((s) => s.classId === classId)
  }

  const getStudentById = (id: string) => {
    return students.value.find((s) => s.id === id)
  }

  const totalStudents = computed(() => students.value.length)

  const classCount = computed(() => classes.value.length)

  load()
  onUserChange(load)

  return {
    classes,
    students,
    addClass,
    updateClass,
    deleteClass,
    getClassById,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentsByClass,
    getStudentById,
    totalStudents,
    classCount,
  }
})
