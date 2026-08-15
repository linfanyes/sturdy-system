<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClasses, classNameById } from '@/composables/useClasses'
import {
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  adjustSchedule,
} from '@/api/schedule'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const items = ref<any[]>([])
const loading = ref(false)

const showModal = ref(false)
const form = ref<any>({})
const adjustMode = ref(false)
const adjustForm = ref<any>({ adjustReason: '', adjustToDate: '', adjustToPeriod: null })

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const periods = computed(() => {
  const max = items.value.reduce((m, it) => Math.max(m, it.period || 0), 0)
  return Array.from({ length: Math.max(max, 8) }, (_, i) => i + 1)
})
const grid = computed(() => {
  const g: Record<number, Record<number, any>> = {}
  for (let d = 1; d <= 7; d++) {
    g[d] = {}
    for (const it of items.value) if (it.dayOfWeek === d) g[d][it.period] = it
  }
  return g
})

async function load() {
  if (!classId.value) return
  loading.value = true
  try {
    items.value = await getSchedule(classId.value)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function openAdd(d: number, p: number) {
  form.value = { dayOfWeek: d, period: p, subject: '', location: '', teacherName: '' }
  adjustMode.value = false
  showModal.value = true
}
function openEdit(it: any) {
  form.value = { ...it }
  adjustForm.value = { adjustReason: it.adjustReason || '', adjustToDate: it.adjustToDate || '', adjustToPeriod: it.adjustToPeriod ?? null }
  adjustMode.value = false
  showModal.value = true
}
async function save() {
  const f = { ...form.value, classId: classId.value, className: classNameById(classId.value) }
  if (f.id) await updateSchedule(f.id, f)
  else await createSchedule(f)
  showModal.value = false
  load()
}
async function remove() {
  if (!form.value.id) return
  await deleteSchedule(form.value.id)
  showModal.value = false
  load()
}
async function doAdjust() {
  if (!form.value.id) return
  await adjustSchedule(form.value.id, adjustForm.value)
  showModal.value = false
  load()
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) {
    classId.value = classes.value[0].id
    load()
  }
})
</script>

<template>
  <div class="mx-auto max-w-6xl p-4">
    <div class="mb-4 flex items-center gap-3">
      <h2 class="text-xl font-semibold text-gray-800">课表与调课</h2>
      <select v-model="classId" @change="load" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-500">节次</th>
            <th v-for="(d, i) in DAYS" :key="i" class="border-b border-l border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
              {{ d }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in periods" :key="p">
            <td class="border-b border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-500">第{{ p }}节</td>
            <td
              v-for="(d, di) in DAYS"
              :key="di"
              class="relative h-16 border-b border-l border-gray-200 p-1 align-top"
            >
              <button
                v-if="!grid[di + 1][p]"
                class="flex h-full w-full items-center justify-center text-gray-300 hover:bg-sky-50 hover:text-sky-500"
                @click="openAdd(di + 1, p)"
              >
                ＋
              </button>
              <button
                v-else
                class="flex h-full w-full flex-col items-start justify-center rounded px-2 py-1 text-left"
                :class="grid[di + 1][p].status === 'adjusted' ? 'bg-rose-50 ring-1 ring-rose-300' : 'bg-sky-50 hover:bg-sky-100'"
                @click="openEdit(grid[di + 1][p])"
              >
                <span class="font-medium text-gray-800">{{ grid[di + 1][p].subject }}</span>
                <span class="text-xs text-gray-500">{{ grid[di + 1][p].location }}</span>
                <span v-if="grid[di + 1][p].status === 'adjusted'" class="mt-0.5 text-xs font-medium text-rose-500">⚠ 已调课</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-3 text-xs text-gray-400">点击空格新增课程，点击已有课程可编辑或调课；调课将自动通知全班家长。</p>

    <!-- 编辑 / 新增弹窗 -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showModal = false">
      <div class="w-[440px] rounded-xl bg-white p-5 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">
          {{ form.id ? '编辑课程' : '新增课程' }}
        </h3>
        <div v-if="!adjustMode" class="space-y-3">
          <div class="flex gap-3">
            <label class="flex-1 text-sm">星期
              <select v-model.number="form.dayOfWeek" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5">
                <option v-for="(d, i) in DAYS" :key="i" :value="i + 1">{{ d }}</option>
              </select>
            </label>
            <label class="flex-1 text-sm">节次
              <input v-model.number="form.period" type="number" min="1" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
            </label>
          </div>
          <label class="block text-sm">科目
            <input v-model="form.subject" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="如 数学" />
          </label>
          <label class="block text-sm">上课地点
            <input v-model="form.location" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="如 教学楼301" />
          </label>
          <label class="block text-sm">上课教师
            <input v-model="form.teacherName" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <div class="flex justify-between pt-2">
            <button v-if="form.id" class="rounded bg-rose-50 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-100" @click="adjustMode = true">调课</button>
            <div v-else />
            <div class="flex gap-2">
              <button class="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200" @click="showModal = false">取消</button>
              <button v-if="form.id" class="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200" @click="remove">删除</button>
              <button class="rounded bg-sky-500 px-4 py-1.5 text-sm text-white hover:bg-sky-600" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- 调课模式 -->
        <div v-else class="space-y-3">
          <p class="rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">
            《{{ form.subject }}》· {{ DAYS[form.dayOfWeek - 1] }} 第{{ form.period }}节 将标记为调课并通知家长
          </p>
          <label class="block text-sm">调课原因
            <input v-model="adjustForm.adjustReason" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="如 教师因公出差" />
          </label>
          <div class="flex gap-3">
            <label class="flex-1 text-sm">调整至日期
              <input v-model="adjustForm.adjustToDate" type="date" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
            </label>
            <label class="flex-1 text-sm">调整至节次
              <input v-model.number="adjustForm.adjustToPeriod" type="number" min="1" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
            </label>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button class="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200" @click="adjustMode = false">返回</button>
            <button class="rounded bg-rose-500 px-4 py-1.5 text-sm text-white hover:bg-rose-600" @click="doAdjust">确认调课并通知</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
