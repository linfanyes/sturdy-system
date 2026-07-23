import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AwardRecord, AwardCategory } from '../types/award'
import { now, uid } from '../utils'
import { getStorageKey, onUserChange } from '../utils/storage'

const KEY = () => getStorageKey('awards')

interface AwardState {
  records: AwardRecord[]
  categories: AwardCategory[]
}

function load(): AwardState {
  try {
    const raw = localStorage.getItem(KEY())
    if (raw) {
      const data = JSON.parse(raw)
      return {
        records: data.records || [],
        categories: data.categories || defaultCategories(),
      }
    }
  } catch (e) {
    /* noop */
  }
  return {
    records: [],
    categories: defaultCategories(),
  }
}

function defaultCategories(): AwardCategory[] {
  return [
    { id: 'cat_1', name: '教学竞赛', color: '#f5c542' },
    { id: 'cat_2', name: '论文发表', color: '#4ade80' },
    { id: 'cat_3', name: '荣誉称号', color: '#60a5fa' },
    { id: 'cat_4', name: '指导学生', color: '#f472b6' },
    { id: 'cat_5', name: '其他', color: '#a78bfa' },
  ]
}

function save(state: AwardState) {
  localStorage.setItem(KEY(), JSON.stringify(state))
}

export const useAwardStore = defineStore('award', () => {
  const initial = load()
  const records = ref<AwardRecord[]>(initial.records)
  const categories = ref<AwardCategory[]>(initial.categories)

  function reload() {
    const next = load()
    records.value = next.records
    categories.value = next.categories
  }

  // 持久化
  watch(
    [records, categories],
    () => save({ records: records.value, categories: categories.value }),
    { deep: true },
  )

  onUserChange(() => reload())

  // ========== 获奖记录 ==========

  function addAward(payload: Omit<AwardRecord, 'id' | 'createdAt'>) {
    const r: AwardRecord = { ...payload, id: uid(), createdAt: now() }
    records.value.unshift(r)
    return r
  }

  function updateAward(id: string, patch: Partial<AwardRecord>) {
    const idx = records.value.findIndex((r) => r.id === id)
    if (idx >= 0) {
      records.value[idx] = { ...records.value[idx], ...patch }
    }
  }

  function removeAward(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
  }

  function getAward(id: string) {
    return records.value.find((r) => r.id === id) || null
  }

  // 一键设置所有获奖的评级分
  function setAllRatingScore(score: number) {
    const v = Number.isFinite(Number(score)) ? Number(score) : 0
    records.value = records.value.map((r) => ({ ...r, ratingScore: v }))
  }

  // 按年份分组
  const recordsByYear = computed(() => {
    const map = new Map<string, AwardRecord[]>()
    for (const r of records.value) {
      const year = r.date ? r.date.slice(0, 4) : '未知'
      if (!map.has(year)) {
        map.set(year, [])
      }
      map.get(year)!.push(r)
    }
    // 按年份降序排列
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  })

  // 所有年份列表
  const allYears = computed(() => {
    const years = new Set<string>()
    for (const r of records.value) {
      if (r.date) years.add(r.date.slice(0, 4))
    }
    return [...years].sort((a, b) => b.localeCompare(a))
  })

  // 所有标签（从记录中收集）
  const allTags = computed(() => {
    const tags = new Set<string>()
    for (const r of records.value) {
      for (const t of r.tags) tags.add(t)
    }
    return [...tags].sort()
  })

  // 有效评级分合计（所有获奖的评级分求和）
  const ratingTotal = computed(() =>
    records.value.reduce((s, r) => s + (r.ratingScore ?? 0), 0),
  )

  // ========== 分类管理 ==========

  function addCategory(name: string, color: string) {
    const cat: AwardCategory = { id: 'cat_' + uid(), name, color }
    categories.value.push(cat)
    return cat
  }

  function updateCategory(id: string, patch: Partial<AwardCategory>) {
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx >= 0) {
      categories.value[idx] = { ...categories.value[idx], ...patch }
    }
  }

  function removeCategory(id: string) {
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  return {
    records,
    categories,
    recordsByYear,
    allYears,
    allTags,
    ratingTotal,
    addAward,
    updateAward,
    removeAward,
    getAward,
    setAllRatingScore,
    addCategory,
    updateCategory,
    removeCategory,
    reload,
  }
})
