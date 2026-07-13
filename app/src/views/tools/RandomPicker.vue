<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSchoolStore } from '../../stores/school'
import { Play, Square, RotateCcw, History } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const classStore = useClassStore()
const schoolStore = useSchoolStore()

const classId = ref(classStore.classes[0]?.id || '')
const pool = ref<string[]>([]) // 选中的 studentIds
const current = ref<string>('')
const rolling = ref(false)
const filterPicked = ref(false)
let timer: number | null = null

const students = computed(() =>
  classId.value ? classStore.studentsOf(classId.value) : [],
)
const pickedSet = computed(() => {
  const list = schoolStore.pickerHistory.filter((h) => h.classId === classId.value)
  return new Set(list.map((h) => h.studentId))
})

const poolStudents = computed(() => {
  let list = students.value
  if (filterPicked.value) {
    list = list.filter((s) => !pickedSet.value.has(s.id))
  }
  return list
})

function start() {
  if (!pool.value.length) {
    pool.value = poolStudents.value.map((s) => s.id)
  }
  if (!pool.value.length) return
  rolling.value = true
  timer = window.setInterval(() => {
    const r = pool.value[Math.floor(Math.random() * pool.value.length)]
    current.value = r
  }, 60)
}

function stop() {
  rolling.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (current.value) {
    const s = classStore.getStudent(current.value)
    if (s) {
      schoolStore.pushPickerHistory(classId.value, s.id, s.name)
    }
  }
}

function reset() {
  stop()
  current.value = ''
}

function togglePick(id: string) {
  const i = pool.value.indexOf(id)
  if (i >= 0) pool.value.splice(i, 1)
  else pool.value.push(id)
}

function selectAll() {
  pool.value = poolStudents.value.map((s) => s.id)
}
function clearPool() {
  pool.value = []
}

const history = computed(() =>
  schoolStore.pickerHistory.filter((h) => h.classId === classId.value).slice(0, 12),
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🎯"
      title="随机点名"
      description="公平有趣的课堂抽问工具，支持权重模式和不重复点名"
      gradient="from-sakura-100 via-cream-50 to-butter-100"
    />
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <div
          class="card-soft p-10 text-center relative overflow-hidden bg-gradient-to-br from-butter-100 via-cream-50 to-sakura-100"
        >
          <div class="absolute -top-10 -left-10 text-7xl opacity-20 animate-floaty">
            🎯
          </div>
          <div class="absolute -bottom-10 -right-10 text-7xl opacity-20 animate-floaty">
            ✨
          </div>
          <div
            class="title-display text-7xl my-4 transition-all"
            :class="rolling ? 'animate-wiggle text-butter-600' : 'text-cocoa-900'"
          >
            {{
              current
                ? classStore.getStudent(current)?.name || '...'
                : '点击开始'
            }}
          </div>
          <div class="flex items-center justify-center gap-2">
            <button
              v-if="!rolling"
              class="btn-primary !px-6 !py-3"
              @click="start"
              :disabled="!pool.length && !poolStudents.length"
            >
              <Play :size="16" /> 开始
            </button>
            <button
              v-else
              class="btn-sakura !px-6 !py-3"
              @click="stop"
            >
              <Square :size="16" /> 停止
            </button>
            <button
              class="btn-secondary !px-4 !py-3"
              @click="reset"
            >
              <RotateCcw :size="16" /> 重置
            </button>
          </div>
          <div
            v-if="!pool.length"
            class="text-xs text-cocoa-500 mt-3"
          >
            提示：未选择学生池时，将从班级所有学生中随机
          </div>
        </div>

        <div class="card-soft p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="title-display text-lg">
              学生池
            </h3>
            <div class="flex gap-2">
              <label class="flex items-center gap-1.5 text-sm text-cocoa-700">
                <input
                  v-model="filterPicked"
                  type="checkbox"
                  class="accent-butter-500"
                >
                排除已点过
              </label>
              <button
                class="btn-ghost !py-1.5 !px-3 text-xs"
                @click="selectAll"
              >
                全选
              </button>
              <button
                class="btn-ghost !py-1.5 !px-3 text-xs"
                @click="clearPool"
              >
                清空
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in poolStudents"
              :key="s.id"
              class="chip border transition"
              :class="
                pool.includes(s.id)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : pickedSet.has(s.id)
                    ? 'bg-cream-100 border-cream-200 text-cocoa-300'
                    : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              :disabled="pickedSet.has(s.id) && !pool.includes(s.id)"
              @click="togglePick(s.id)"
            >
              {{ s.gender === '女' ? '👧' : '👦' }} {{ s.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        <div class="card-soft p-5">
          <label class="text-xs text-cocoa-500 ml-1">当前班级</label>
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
          <div class="mt-3 text-sm text-cocoa-500">
            班级人数：<b class="text-cocoa-900">{{ students.length }}</b>
          </div>
        </div>

        <div class="card-soft p-5">
          <h3 class="title-display text-lg flex items-center gap-2 mb-3">
            <History :size="16" /> 本班点过
          </h3>
          <div
            v-if="history.length"
            class="space-y-1.5"
          >
            <div
              v-for="h in history"
              :key="h.id"
              class="flex items-center justify-between text-sm py-1"
            >
              <span>👋 {{ h.studentName }}</span>
              <button
                class="text-xs text-cocoa-300 hover:text-sakura-500"
                @click="schoolStore.pushPickerHistory(classId, h.studentId, h.studentName)"
                title="再点一次"
              >
                ↻
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-center text-cocoa-500 py-3 text-sm"
          >
            还没有点过名
          </div>
          <button
            v-if="history.length"
            class="btn-ghost !py-1.5 !px-3 text-xs w-full mt-3"
            @click="schoolStore.clearPickerHistory(classId)"
          >
            清空记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
