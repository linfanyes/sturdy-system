<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getFiveEduProfile, saveFiveEduRecord } from '@/api/fiveEdu'
import { useClasses, classNameById } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const loading = ref(false)
const profile = ref<any>(null)
const saving = ref(false)

const DIM_LABELS: Record<string, string> = {
  moral: '德', intellectual: '智', physical: '体', aesthetic: '美', labour: '劳',
}
const DIM_ORDER = ['moral', 'intellectual', 'physical', 'aesthetic', 'labour']

// 五维雷达图 SVG 点位（0–100 映射到半径）
function radarPoints(radar: Record<string, number>) {
  const cx = 60, cy = 60, r = 48
  return DIM_ORDER.map((d, i) => {
    const ang = (-90 + i * 72) * (Math.PI / 180)
    const v = (radar?.[d] ?? 0) / 100
    return `${cx + r * v * Math.cos(ang)},${cy + r * v * Math.sin(ang)}`
  }).join(' ')
}

async function load() {
  if (!classId.value) { profile.value = null; return }
  loading.value = true
  try {
    profile.value = await getFiveEduProfile(classId.value)
  } finally {
    loading.value = false
  }
}

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

const memberList = computed(() => profile.value?.students || [])

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

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="s in memberList" :key="s.studentId" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-2 flex items-center justify-between">
            <div class="font-semibold text-gray-800">{{ s.studentName }}</div>
            <div class="text-sm font-medium text-amber-600">综合 {{ s.avg }}</div>
          </div>
          <div class="flex gap-3">
            <svg viewBox="0 0 120 120" class="h-28 w-28 shrink-0">
              <polygon :points="radarPoints(s.radar)" fill="rgba(245,158,11,.18)" stroke="#f59e0b" stroke-width="1.5" />
              <text v-for="(d, i) in DIM_ORDER" :key="d" :x="60 + 52 * Math.cos((-90 + i * 72) * Math.PI / 180)" :y="64 + 52 * Math.sin((-90 + i * 72) * Math.PI / 180)" text-anchor="middle" class="fill-gray-400" style="font-size:10px">{{ DIM_LABELS[d] }}</text>
            </svg>
            <div class="flex-1 space-y-1">
              <div v-for="d in DIM_ORDER" :key="d" class="flex items-center gap-2">
                <span class="w-4 text-xs text-gray-500">{{ DIM_LABELS[d] }}</span>
                <div class="h-2 flex-1 rounded-full bg-gray-100">
                  <div class="h-full rounded-full bg-amber-400" :style="{ width: (s.radar[d] || 0) + '%' }"></div>
                </div>
                <span class="w-7 text-right text-[11px] text-gray-500">{{ s.radar[d] || 0 }}</span>
              </div>
            </div>
          </div>
          <button class="mt-3 w-full rounded-lg border border-amber-200 py-1.5 text-sm text-amber-600 hover:bg-amber-50" @click="openForm(s)">录入过程性评价</button>
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
