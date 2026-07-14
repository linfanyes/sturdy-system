<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useClassStore } from '../../stores/class'
import { useClassDutyStore } from '../../stores/classDuty'
import { useToastStore } from '../../stores/toast'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import { Plus, X, Save, Users, Check } from 'lucide-vue-next'

const route = useRoute()
const classStore = useClassStore()
const classDutyStore = useClassDutyStore()
const toast = useToastStore()

const DEFAULT_DUTIES = ['班长', '副班长', '学习委员', '组长']

const classId = ref('')
const selectedDuties = ref<string[]>([])
const customDuties = ref<string[]>([])
const assignments = ref<Record<string, string>>({})
const customInput = ref('')

const classSubjects = computed(() => {
  const c = classStore.getClass(classId.value)
  return c?.subjects?.length ? c.subjects : ['语文', '数学', '英语']
})

const subjectDuties = computed(() =>
  classSubjects.value.map((s) => `${s}课代表`),
)

const availableDefaultDuties = computed(() => [
  ...DEFAULT_DUTIES,
  ...subjectDuties.value,
])

const allEnabledDuties = computed(() => [
  ...selectedDuties.value,
  ...customDuties.value,
])

const students = computed(() =>
  [...classStore.studentsOf(classId.value)].sort((a, b) =>
    (a.studentNo || '').localeCompare(b.studentNo || '', 'zh'),
  ),
)

const assignedStudentIds = computed(() => {
  const set = new Set<string>()
  for (const [duty, studentId] of Object.entries(assignments.value)) {
    if (allEnabledDuties.value.includes(duty) && studentId) set.add(studentId)
  }
  return set
})

function selectableStudents(currentDuty: string) {
  const currentId = assignments.value[currentDuty]
  return students.value.filter(
    (s) => !assignedStudentIds.value.has(s.id) || s.id === currentId,
  )
}

function loadConfig() {
  const cfg = classDutyStore.getConfig(classId.value)
  if (cfg) {
    selectedDuties.value = cfg.duties.filter((d) =>
      availableDefaultDuties.value.includes(d),
    )
    customDuties.value = cfg.duties.filter(
      (d) => !availableDefaultDuties.value.includes(d),
    )
    assignments.value = {}
    for (const d of cfg.duties) {
      assignments.value[d] = cfg.assignments[d] || ''
    }
  } else {
    selectedDuties.value = []
    customDuties.value = []
    assignments.value = {}
  }
}

onMounted(() => {
  const queryClassId = route.query.classId as string | undefined
  if (queryClassId && classStore.getClass(queryClassId)) {
    classId.value = queryClassId
  } else if (classStore.classes.length) {
    classId.value = classStore.classes[0].id
  }
  loadConfig()
})

watch(classId, () => loadConfig())

function toggleDuty(duty: string) {
  const idx = selectedDuties.value.indexOf(duty)
  if (idx >= 0) {
    selectedDuties.value.splice(idx, 1)
    delete assignments.value[duty]
  } else {
    selectedDuties.value.push(duty)
  }
}

function addCustomDuty() {
  const v = customInput.value.trim()
  if (!v) return
  if (
    !customDuties.value.includes(v) &&
    !availableDefaultDuties.value.includes(v) &&
    !selectedDuties.value.includes(v)
  ) {
    customDuties.value.push(v)
    customInput.value = ''
  }
}

function removeCustomDuty(duty: string) {
  customDuties.value = customDuties.value.filter((d) => d !== duty)
  delete assignments.value[duty]
}

function save() {
  if (!classId.value) {
    toast.warning('请先选择班级')
    return
  }
  const duties = [...selectedDuties.value, ...customDuties.value]
  const payload: Record<string, string | null> = {}
  for (const d of duties) {
    payload[d] = assignments.value[d] || null
  }
  classDutyStore.saveConfig(classId.value, duties, payload)
  toast.success('已保存班级职务设置')
}
</script>

<template>
  <div class="space-y-5">
    <ToolBackButton />
    <ToolPageHeader
      icon="🎖️"
      title="班级职务"
      description="为每个班级配置班干部、课代表、组长等职务，并分配学生"
      gradient="from-butter-100 via-cream-50 to-mint-100"
    />

    <div class="card-soft p-5 space-y-5">
      <!-- 班级选择 -->
      <div>
        <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
          <Users :size="11" /> 选择班级
        </label>
        <select
          v-model="classId"
          class="input-soft mt-1"
        >
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
      </div>

      <div
        v-if="!classStore.classes.length"
        class="text-center text-cocoa-500 py-6"
      >
        还没有班级，请先到「班级管理」创建班级
      </div>

      <template v-else>
        <!-- 默认职务 -->
        <div>
          <label class="text-xs text-cocoa-500 ml-1">默认职务（多选）</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="d in availableDefaultDuties"
              :key="d"
              class="chip border transition text-xs"
              :class="
                selectedDuties.includes(d)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleDuty(d)"
            >
              <Check
                v-if="selectedDuties.includes(d)"
                :size="10"
                class="inline"
              />
              {{ d }}
            </button>
          </div>
        </div>

        <!-- 自定义职务 -->
        <div>
          <label class="text-xs text-cocoa-500 ml-1">自定义职务</label>
          <div class="flex gap-2 mt-1">
            <input
              v-model="customInput"
              class="input-soft flex-1"
              placeholder="如：节能委员、图书管理员"
              @keyup.enter="addCustomDuty"
            >
            <button
              class="btn-secondary"
              @click="addCustomDuty"
            >
              <Plus :size="14" /> 添加
            </button>
          </div>
          <div
            v-if="customDuties.length"
            class="flex flex-wrap gap-2 mt-2"
          >
            <span
              v-for="d in customDuties"
              :key="d"
              class="chip bg-sky2-100 text-sky2-600 text-xs flex items-center gap-1"
            >
              {{ d }}
              <button
                class="hover:text-cocoa-900"
                @click="removeCustomDuty(d)"
              >
                <X :size="10" />
              </button>
            </span>
          </div>
        </div>

        <!-- 职务分配 -->
        <div v-if="allEnabledDuties.length">
          <label class="text-xs text-cocoa-500 ml-1">职务分配</label>
          <div class="mt-2 space-y-2">
            <div
              v-for="d in allEnabledDuties"
              :key="d"
              class="flex items-center gap-3 card-flat p-3"
            >
              <div class="w-28 shrink-0 text-sm font-medium text-cocoa-700">
                {{ d }}
              </div>
              <select
                v-model="assignments[d]"
                class="input-soft flex-1"
              >
                <option value="">
                  — 未选择 —
                </option>
                <option
                  v-for="s in selectableStudents(d)"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}（{{ s.studentNo }}）
                </option>
              </select>
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-center text-cocoa-400 text-sm py-4"
        >
          请先勾选或添加职务
        </div>

        <div class="flex justify-end pt-2">
          <button
            class="btn-primary"
            @click="save"
          >
            <Save :size="14" /> 保存设置
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
