<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import {
  getStudent, listAwards, type TeacherStudent,
} from '@/api/teacher'
import request from '@/api/request'
import {
  ArrowLeft, User, Phone, Users, BookOpen, Trophy, Calendar,
  Mail, MapPin, IdCard,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const studentId = computed(() => route.params.id as string)
const loading = ref(false)
const student = ref<TeacherStudent | null>(null)
const awards = ref<any[]>([])
const recentGrades = ref<any[]>([])

const className = computed(() => {
  // Reuse class name lookup from classes store
  const clsList = JSON.parse(localStorage.getItem('g_classes') || '[]')
  const found = clsList.find((c: any) => c.id === student.value?.classId)
  return found?.name || student.value?.classId || '-'
})

async function load() {
  loading.value = true
  try {
    const [stu, aw, grd] = await Promise.allSettled([
      getStudent(studentId.value),
      listAwards(student.value?.classId || ''),
      request.get('/grades', { params: { studentId: studentId.value, take: 10 } }),
    ])
    if (stu.status === 'fulfilled') student.value = stu.value
    else toast.error('加载学生信息失败')

    if (aw.status === 'fulfilled') awards.value = (aw.value as any)?.items || aw.value || []
    if (grd.status === 'fulfilled') recentGrades.value = (grd.value as any)?.items || grd.value || []
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!studentId.value) { router.back(); return }
  load()
})

function goGrades() {
  router.push({ path: '/teacher/student-grades', query: { studentId: studentId.value, classId: student.value?.classId } })
}
function goAttendance() {
  router.push({ path: '/teacher/attendance', query: { studentId: studentId.value } })
}
function goAwards() {
  router.push({ path: '/teacher/awards', query: { studentId: studentId.value } })
}
function goBack() {
  router.back()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" @click="goBack">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-2xl font-bold text-cocoa-900">学生详情</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
    </div>

    <div v-else-if="!student" class="text-center text-cocoa-400 py-12">未找到该学生信息</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- 左侧：基本信息 -->
      <div class="md:col-span-2 space-y-4">
        <!-- 基本信息卡 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-butter-100 flex items-center justify-center text-butter-600 text-lg font-bold">
              {{ student.name?.[0] || '?' }}
            </div>
            <div>
              <div class="text-xl font-bold text-cocoa-900">{{ student.name }}</div>
              <div class="text-sm text-cocoa-500">{{ student.gender || '未知性别' }} · {{ student.studentNo || '无学号' }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="flex items-center gap-2 text-cocoa-600">
              <IdCard class="w-4 h-4 text-cocoa-400" /> 学号：{{ student.studentNo || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Users class="w-4 h-4 text-cocoa-400" /> 班级：{{ className }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Mail class="w-4 h-4 text-cocoa-400" /> 学生电话：{{ student.studentPhone || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <MapPin class="w-4 h-4 text-cocoa-400" /> 地址：{{ student.address || '-' }}
            </div>
          </div>
        </div>

        <!-- 家长信息卡 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 mb-3 text-cocoa-900">
            <User class="w-5 h-5 text-butter-500" /> 家长信息
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="flex items-center gap-2 text-cocoa-600">
              <User class="w-4 h-4 text-cocoa-400" /> 姓名：{{ student.parentName || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Phone class="w-4 h-4 text-cocoa-400" /> 电话：{{ student.parentPhone || '-' }}
            </div>
          </div>
        </div>

        <!-- 近期成绩 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-cocoa-900">
              <BookOpen class="w-5 h-5 text-butter-500" /> 近期成绩
            </div>
            <button class="text-sm text-butter-600 hover:text-butter-700" @click="goGrades">查看全部 →</button>
          </div>
          <div v-if="!recentGrades.length" class="text-sm text-cocoa-400 py-4 text-center">暂无成绩记录</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-3 py-2">考试</th>
                <th class="px-3 py-2">科目</th>
                <th class="px-3 py-2 text-right">成绩</th>
                <th class="px-3 py-2 text-right">班级排名</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="g in recentGrades.slice(0, 10)" :key="g.id">
                <td class="px-3 py-2">{{ g.examName || g.examId }}</td>
                <td class="px-3 py-2">{{ g.subject }}</td>
                <td class="px-3 py-2 text-right font-medium">{{ g.score }}</td>
                <td class="px-3 py-2 text-right text-cocoa-500">{{ g.classRank || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 右侧：快捷操作 + 奖励 -->
      <div class="space-y-4">
        <!-- 快捷操作 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="text-sm font-semibold text-cocoa-900 mb-3">快捷操作</div>
          <div class="space-y-2">
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goGrades">
              <BookOpen class="w-4 h-4 text-butter-500" /> 成绩管理
            </button>
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goAttendance">
              <Calendar class="w-4 h-4 text-butter-500" /> 考勤记录
            </button>
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goAwards">
              <Trophy class="w-4 h-4 text-butter-500" /> 奖励记录
            </button>
          </div>
        </div>

        <!-- 奖励记录 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-cocoa-900">
              <Trophy class="w-5 h-5 text-butter-500" /> 近期奖励
            </div>
            <span class="text-xs text-cocoa-400">共 {{ awards.length }} 条</span>
          </div>
          <div v-if="!awards.length" class="text-sm text-cocoa-400 py-4 text-center">暂无奖励记录</div>
          <div v-else class="space-y-2">
            <div v-for="a in awards.slice(0, 8)" :key="a.id" class="flex items-center justify-between text-sm py-2 border-b border-cream-100 last:border-0">
              <div>
                <div class="font-medium text-cocoa-800">{{ a.type || a.category || '奖励' }}</div>
                <div class="text-xs text-cocoa-400">{{ a.reason || a.note || '-' }}</div>
              </div>
              <div class="text-xs text-cocoa-500">{{ a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
