<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { toast } from '@/utils/feedback'
import { ToggleLeft, Loader2, Save, School, Check, Info } from 'lucide-vue-next'
import { listSchools } from '@/api/admin'
import { getSchoolFeatures, updateSchoolFeatures } from '@/api/feature'
import { FEATURE_FLAG_LIST, FEATURE_FLAGS } from '@gardener/shared/constants'

/** key → 中文标签（来自单一来源 shared/constants） */
const LABEL_MAP: Record<string, string> = Object.fromEntries(
  FEATURE_FLAG_LIST.map((f) => [f.key, f.label]),
)
const ALL_KEYS: string[] = [...FEATURE_FLAGS]

/** 功能包分组（与控制器的 @Feature key 对齐），便于超管按业务域批量开关 */
const GROUPS: { title: string; keys: string[] }[] = [
  { title: '班级与学生', keys: ['classes', 'students'] },
  { title: '学情与考试', keys: ['exams', 'grades', 'analysis', 'attendance', 'homework'] },
  { title: '课堂工具', keys: ['tools', 'seats', 'games'] },
  { title: '学生评价', keys: ['rewards', 'growth', 'behavior', 'reading', 'checkin'] },
  { title: '班级管理', keys: ['finance', 'activities', 'duty', 'gallery'] },
  { title: '家校沟通', keys: ['parents', 'im', 'notices'] },
  { title: 'AI 与备课', keys: ['ai', 'schedule'] },
  { title: '教师办公', keys: ['worklog', 'observation', 'calendar', 'teachers'] },
  { title: '个人', keys: ['todos', 'notes', 'demo'] },
  {
    title: '办公/学科/快捷工具',
    keys: ['office_tools', 'subject_tools', 'quicktool', 'grade_trend', 'picker_history', 'reward', 'translate', 'blackboard', 'speech'],
  },
]

// ==================== 学校选择 ====================
const schools = ref<{ id: string; name: string; code?: string }[]>([])
const selectedSchoolId = ref<string>('')
const loadingSchools = ref(false)

// ==================== 状态 ====================
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)
/** 每个 key 的开关态（true=启用） */
const selected = reactive<Record<string, boolean>>({})

const enabledCount = computed(() => ALL_KEYS.filter((k) => selected[k]).length)
const allOn = computed(() => enabledCount.value === ALL_KEYS.length)

async function loadSchools() {
  loadingSchools.value = true
  try {
    const res = await listSchools(0, 500)
    schools.value = (res?.items || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }))
    if (!selectedSchoolId.value && schools.value.length) {
      selectedSchoolId.value = schools.value[0].id
    }
  } catch (e: any) {
    toast.error(e?.message || '加载学校列表失败')
  } finally {
    loadingSchools.value = false
  }
}

/** 把服务端 featureFlags（null/[]=全部开启）映射为开关态 */
function applyFlags(featureFlags: string[] | null | undefined) {
  const on = !featureFlags || featureFlags.length === 0
  for (const k of ALL_KEYS) {
    selected[k] = on ? true : (featureFlags || []).includes(k)
  }
  dirty.value = false
}

async function loadFeatures() {
  if (!selectedSchoolId.value) return
  loading.value = true
  try {
    const res = await getSchoolFeatures(selectedSchoolId.value)
    applyFlags(res?.featureFlags)
  } catch (e: any) {
    toast.error(e?.message || '加载功能包开关失败')
  } finally {
    loading.value = false
  }
}

/** 当前启用的 key 列表（保存时下发） */
function currentEnabled(): string[] {
  return ALL_KEYS.filter((k) => selected[k])
}

function toggle(key: string) {
  selected[key] = !selected[key]
  dirty.value = true
}

function setGroup(keys: string[], on: boolean) {
  for (const k of keys) selected[k] = on
  dirty.value = true
}

function setAll(on: boolean) {
  for (const k of ALL_KEYS) selected[k] = on
  dirty.value = true
}

async function save() {
  if (!selectedSchoolId.value) return
  saving.value = true
  try {
    const enabled = currentEnabled()
    await updateSchoolFeatures(selectedSchoolId.value, enabled)
    dirty.value = false
    toast.success('保存成功')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

watch(selectedSchoolId, () => loadFeatures())

onMounted(async () => {
  await loadSchools()
  await loadFeatures()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <ToggleLeft class="w-6 h-6 text-butter-500" /> 学校功能包
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
        :disabled="saving || loading || !selectedSchoolId"
        @click="save"
      >
        <Save class="w-4 h-4" />
        {{ saving ? '保存中…' : dirty ? '保存修改' : '保存' }}
      </button>
    </div>

    <!-- 说明 -->
    <div class="bg-cream-50 border border-cream-200 rounded-2xl p-4 flex items-start gap-2 text-sm text-cocoa-600">
      <Info class="w-4 h-4 mt-0.5 text-butter-500 shrink-0" />
      <div>
        <p>学校级功能包开关为<strong>超管独占</strong>配置：关闭某包后，该校教师与家长访问该功能将被后端 <code>@Feature</code> 守卫拦截（返回 403「当前功能未开放：&lt;key&gt;」）。</p>
        <p class="mt-1">默认全部开启（<code>featureFlags</code> 为 null/空数组）。<strong>超管与学校管理员不受学校级影响</strong>，始终拥有全部功能。</p>
      </div>
    </div>

    <!-- 学校选择 -->
    <div class="bg-surface rounded-2xl shadow-softer p-4 flex items-center gap-3">
      <School class="w-5 h-5 text-butter-500 shrink-0" />
      <label class="text-sm text-cocoa-500 shrink-0">选择学校</label>
      <select
        v-model="selectedSchoolId"
        class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        :disabled="loadingSchools"
      >
        <option v-for="s in schools" :key="s.id" :value="s.id">
          {{ s.name }}{{ s.code ? `（${s.code}）` : '' }}
        </option>
      </select>
      <span class="text-xs text-cocoa-400 whitespace-nowrap">已开启 {{ enabledCount }} / {{ ALL_KEYS.length }}</span>
    </div>

    <div v-if="loading" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-400">
      <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
    </div>

    <template v-else>
      <!-- 全量操作 -->
      <div class="bg-surface rounded-2xl shadow-softer p-4 flex items-center justify-between">
        <span class="text-sm text-cocoa-500">按组批量操作，或逐项切换</span>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50 disabled:opacity-60"
            :disabled="allOn"
            @click="setAll(true)"
          >
            全部开启
          </button>
          <button
            class="px-3 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50"
            @click="setAll(false)"
          >
            全部关闭
          </button>
        </div>
      </div>

      <!-- 分组列表 -->
      <div
        v-for="g in GROUPS"
        :key="g.title"
        class="bg-surface rounded-2xl shadow-softer p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold text-cocoa-900">{{ g.title }}</h2>
          <div class="flex items-center gap-2">
            <button
              class="text-xs px-2 py-1 rounded-md border border-cream-200 text-cocoa-500 hover:bg-cream-50"
              @click="setGroup(g.keys, true)"
            >
              全开
            </button>
            <button
              class="text-xs px-2 py-1 rounded-md border border-cream-200 text-cocoa-500 hover:bg-cream-50"
              @click="setGroup(g.keys, false)"
            >
              全关
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            v-for="k in g.keys"
            :key="k"
            type="button"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors"
            :class="selected[k]
              ? 'border-butter-300 bg-butter-50'
              : 'border-cream-200 bg-surface hover:bg-cream-50'"
            @click="toggle(k)"
          >
            <span class="text-sm" :class="selected[k] ? 'text-cocoa-900 font-medium' : 'text-cocoa-400'">
              {{ LABEL_MAP[k] || k }}
            </span>
            <span
              class="w-9 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0"
              :class="selected[k] ? 'bg-butter-500 justify-end' : 'bg-cream-300 justify-start'"
            >
              <span class="w-4 h-4 rounded-full bg-surface shadow" />
            </span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
