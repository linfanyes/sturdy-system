<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getFiveEduProfile, saveFiveEduRecord } from '@/api/fiveEdu'
import { useClasses } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const loading = ref(false)
const profile = ref<any>(null)
const saving = ref(false)
const selectedStudentId = ref('')

const DIM_LABELS: Record<string, string> = {
  moral: '德', intellectual: '智', physical: '体', aesthetic: '美', labour: '劳',
}
const DIM_ORDER = ['moral', 'intellectual', 'physical', 'aesthetic', 'labour']

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

async function load() {
  if (!classId.value) { profile.value = null; return }
  loading.value = true
  try {
    profile.value = await getFiveEduProfile(classId.value)
    selectedStudentId.value = ''
  } finally {
    loading.value = false
  }
}

const memberList = computed(() => profile.value?.students || [])

function renderChart() {
  if (!chartEl.value) return
  const students = memberList.value
  if (!students.length) return
  const classAvg = DIM_ORDER.map((d) =>
    Math.round(students.reduce((a: number, s: any) => a + (s.radar?.[d] || 0), 0) / students.length),
  )
  const series = [{ name: '班级均值', value: classAvg }]
  const sel = students.find((s: any) => s.studentId === selectedStudentId.value)
  if (sel) series.push({ name: sel.studentName, value: DIM_ORDER.map((d) => sel.radar?.[d] || 0) })

  if (!chart) chart = echarts.init(chartEl.value)
  chart.setOption({
    tooltip: {},
    legend: { bottom: 0, data: series.map((s) => s.name) },
    radar: {
      indicator: DIM_ORDER.map((d) => ({ name: DIM_LABELS[d], max: 100 })),
      radius: '62%',
      splitNumber: 4,
      axisName: { color: '#6b7280', fontSize: 12 },
    },
    series: [
      {
        type: 'radar',
        data: series.map((s) => ({ value: s.value, name: s.name, areaStyle: { opacity: 0.18 } })),
      },
    ],
  })
}

watch([profile, selectedStudentId], () => nextTick(renderChart))
onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})

// 过程性评价录入
const showForm = ref(false)
const form = ref({ studentId: '', studentName: '', dimension: 'moral', evalType: 'teacher', score: 4, content: '', evaluatorName: '' })
function openForm(s?: any) {
  form.value = { studentId: s?.studentId || '', studentName: s?.studentName || '', dimension: 'moral', evalType: 'teacher', score: 4, content: '', evaluatorName: '' }
  showForm.value = true
}
async function submitForm() {
  if (!form.value.studentId) { alert('请选择学生'); return }
  saving.value = true
  try {
    await saveFiveEduRecord({ ...form.value, classId: classId.value })
    alert('已保存')
    showForm.value = false
    load()
  } catch (e: any) {
    alert('保存失败：' + (e?.message || e))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) classId.value = classes.value[0].id
  load()
})
</script>

<template>
  <div class="mx-auto max-w-5xl p-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">五育综合素质档案</h1>
        <p class="text-sm text-gray-500">破唯分数，聚合德/智/体/美/劳多源数据，看见每个孩子的全面成长。</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="rounded-lg border border-gray-200 px-3 py-2 text-sm" @change="load">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700" @click="load">刷新</button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>
    <div v-else-if="!classId" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">请先选择班级。</div>
    <div v-else-if="!memberList.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">该班级暂无可分析的学生。</div>

    <template v-else>
      <div v-if="profile?.summary" class="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-gray-700">
        <span class="mr-1 font-medium text-amber-700">班级五育点评</span>{{ profile.summary }}
        <span class="ml-1 text-[11px] text-gray-400">（{{ profile.generatedBy === 'ai' ? 'AI 生成' : '模板生成' }}）</span>
      </div>

      <!-- 五育雷达（班级均值 + 选中学生对比） -->
      <div class="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="mb-1 text-sm font-medium text-gray-600">
          五育雷达（班级均值<span v-if="selectedStudentId"> · 叠加个人</span>）
        </div>
        <div ref="chartEl" class="h-[360px] w-full"></div>
        <p class="mt-1 text-center text-xs text-gray-400">点击下方学生卡片，可在雷达图上叠加对比该生五育轮廓。</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="s in memberList"
          :key="s.studentId"
          class="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition"
          :class="selectedStudentId === s.studentId ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'"
          @click="selectedStudentId = s.studentId"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="font-semibold text-gray-800">{{ s.studentName }}</div>
            <div class="text-sm font-medium text-amber-600">综合 {{ s.avg }}</div>
          </div>
          <div class="space-y-1">
            <div v-for="d in DIM_ORDER" :key="d" class="flex items-center gap-2">
              <span class="w-4 text-xs text-gray-500">{{ DIM_LABELS[d] }}</span>
              <div class="h-2 flex-1 rounded-full bg-gray-100">
                <div class="h-full rounded-full bg-amber-400" :style="{ width: (s.radar[d] || 0) + '%' }"></div>
              </div>
              <span class="w-7 text-right text-[11px] text-gray-500">{{ s.radar[d] || 0 }}</span>
            </div>
          </div>
          <button class="mt-3 w-full rounded-lg border border-amber-200 py-1.5 text-sm text-amber-600 hover:bg-amber-50" @click.stop="openForm(s)">录入过程性评价</button>
        </div>
      </div>
    </template>

    <!-- 录入弹层 -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showForm = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 class="mb-3 text-lg font-semibold text-gray-800">过程性评价录入</h3>
        <div class="space-y-3 text-sm">
          <div>
            <label class="mb-1 block text-gray-500">学生</label>
            <select v-model="form.studentId" class="w-full rounded-lg border border-gray-200 px-3 py-2">
              <option value="">请选择</option>
              <option v-for="s in memberList" :key="s.studentId" :value="s.studentId">{{ s.studentName }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-gray-500">维度</label>
              <select v-model="form.dimension" class="w-full rounded-lg border border-gray-200 px-3 py-2">
                <option value="moral">德（德育）</option>
                <option value="intellectual">智（智育）</option>
                <option value="physical">体（体育）</option>
                <option value="aesthetic">美（美育）</option>
                <option value="labour">劳（劳育/家务）</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-gray-500">评价主体</label>
              <select v-model="form.evalType" class="w-full rounded-lg border border-gray-200 px-3 py-2">
                <option value="teacher">老师评</option>
                <option value="self">自评</option>
                <option value="peer">同伴互评</option>
                <option value="home">家务打卡</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-gray-500">评分（1–5）</label>
            <input v-model.number="form.score" type="number" min="1" max="5" class="w-full rounded-lg border border-gray-200 px-3 py-2" />
          </div>
          <div>
            <label class="mb-1 block text-gray-500">评语 / 任务描述</label>
            <textarea v-model="form.content" rows="2" class="w-full rounded-lg border border-gray-200 px-3 py-2"></textarea>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded-lg border border-gray-200 px-4 py-2 text-gray-600" @click="showForm = false">取消</button>
          <button class="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-50" :disabled="saving" @click="submitForm">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
