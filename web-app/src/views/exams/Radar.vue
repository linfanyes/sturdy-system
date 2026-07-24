<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses, classNameById } from '@/composables/useClasses'
import { Radar as RadarIcon } from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const students = ref<any[]>([])
const exams = ref<any[]>([])
const grades = ref<any[]>([])
const selectedStudentId = ref('')
const loading = ref(false)

async function loadData() {
  if (!classId.value) return
  loading.value = true
  try {
    const [st, ex, gr] = await Promise.all([
      request.get('/students', { params: { classId: classId.value } }),
      request.get('/exams', { params: { classId: classId.value } }),
      request.get('/grades', { params: { classId: classId.value } }),
    ])
    students.value = Array.isArray(st) ? st : (st?.items || [])
    exams.value = Array.isArray(ex) ? ex : (ex?.items || [])
    grades.value = Array.isArray(gr) ? gr : (gr?.items || [])
    selectedStudentId.value = ''
  } catch { students.value = []; exams.value = []; grades.value = [] } finally { loading.value = false }
}

/** 取该生最近一次考试各科成绩 + 班级均分，构建雷达图数据 */
const radarData = computed(() => {
  if (!selectedStudentId.value || !exams.value.length) return null
  const latestExam = exams.value[exams.value.length - 1]
  if (!latestExam) return null
  const subjects = latestExam.subjects || []
  if (!subjects.length) return null
  const points: { subject: string; myScore: number; classAvg: number; full: number }[] = []
  for (const subject of subjects) {
    const grade = grades.value.find(g => (g.examId === latestExam.id || g.examName === latestExam.name) && g.subject === subject)
    if (!grade) continue
    const scores = (grade.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
    const myEntry = (grade.scores || []).find((s: any) => s.studentId === selectedStudentId.value)
    if (myEntry == null || myEntry.score == null) continue
    const classAvg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
    const full = latestExam.subjectFullScores?.[subject] || 100
    points.push({ subject, myScore: Number(myEntry.score), classAvg: Math.round(classAvg * 10) / 10, full })
  }
  return { examName: latestExam.name, points }
})

/** 雷达图 SVG 坐标计算 */
const svgSize = 320
const center = svgSize / 2
const radius = 120
function pointCoord(angle: number, r: number) {
  return [center + r * Math.cos(angle - Math.PI / 2), center + r * Math.sin(angle - Math.PI / 2)]
}
const radarPoly = computed(() => {
  if (!radarData.value) return ''
  const pts = radarData.value.points
  return pts.map((p, i) => {
    const angle = (i / pts.length) * Math.PI * 2
    const r = (p.myScore / p.full) * radius
    const [x, y] = pointCoord(angle, r)
    return `${x},${y}`
  }).join(' ')
})
const classAvgPoly = computed(() => {
  if (!radarData.value) return ''
  const pts = radarData.value.points
  return pts.map((p, i) => {
    const angle = (i / pts.length) * Math.PI * 2
    const r = (p.classAvg / p.full) * radius
    const [x, y] = pointCoord(angle, r)
    return `${x},${y}`
  }).join(' ')
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <RadarIcon class="w-6 h-6 text-butter-500" /> 成绩雷达图
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">班级</label>
          <select v-model="classId" @change="loadData" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学生</label>
          <select v-model="selectedStudentId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 text-center">加载中…</div>

    <div v-else-if="radarData" class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="text-center text-cocoa-700 mb-2">{{ radarData.examName }} · {{ students.find(s => s.id === selectedStudentId)?.name }}</div>
      <div class="flex justify-center">
        <svg :width="svgSize" :height="svgSize">
          <!-- 网格 -->
          <circle :cx="center" :cy="center" :r="radius" fill="none" stroke="#e5d5b6" stroke-width="1" />
          <circle :cx="center" :cy="center" :r="radius * 0.75" fill="none" stroke="#e5d5b6" stroke-width="0.5" />
          <circle :cx="center" :cy="center" :r="radius * 0.5" fill="none" stroke="#e5d5b6" stroke-width="0.5" />
          <circle :cx="center" :cy="center" :r="radius * 0.25" fill="none" stroke="#e5d5b6" stroke-width="0.5" />
          <!-- 轴线 -->
          <line v-for="(p, i) in radarData.points" :key="'axis'+i"
            :x1="center" :y1="center"
            :x2="pointCoord((i / radarData.points.length) * Math.PI * 2, radius)[0]"
            :y2="pointCoord((i / radarData.points.length) * Math.PI * 2, radius)[1]"
            stroke="#e5d5b6" stroke-width="0.5" />
          <!-- 班级均分多边形 -->
          <polygon :points="classAvgPoly" fill="rgba(120,200,180,0.2)" stroke="#7ac8b4" stroke-width="1.5" />
          <!-- 我的多边形 -->
          <polygon :points="radarPoly" fill="rgba(230,180,80,0.25)" stroke="#e6b450" stroke-width="2" />
          <!-- 顶点 -->
          <circle v-for="(p, i) in radarData.points" :key="'pt'+i"
            :cx="pointCoord((i / radarData.points.length) * Math.PI * 2, (p.myScore / p.full) * radius)[0]"
            :cy="pointCoord((i / radarData.points.length) * Math.PI * 2, (p.myScore / p.full) * radius)[1]"
            r="3" fill="#e6b450" />
          <!-- 标签 -->
          <text v-for="(p, i) in radarData.points" :key="'lb'+i"
            :x="pointCoord((i / radarData.points.length) * Math.PI * 2, radius + 16)[0]"
            :y="pointCoord((i / radarData.points.length) * Math.PI * 2, radius + 16)[1]"
            text-anchor="middle" font-size="11" fill="#7a6a55">{{ p.subject }} {{ p.myScore }}</text>
        </svg>
      </div>
      <div class="flex justify-center gap-4 mt-2 text-xs">
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-butter-400 inline-block"></span> 我的成绩</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-mint-300 inline-block"></span> 班级均分</span>
      </div>
    </div>
  </div>
</template>
