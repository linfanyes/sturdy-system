<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import { getClass, deleteClass, listSchoolNotices, type ClassItem } from '@/api/school-admin'
import { listClassMembers, type ClassMember } from '@/api/teacher'
import { Users, Crown, BookOpen, Calendar, TrendingUp, Edit3, Trash2, ArrowLeft, GraduationCap, Megaphone } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const classId = route.params.id as string

const loading = ref(false)
const cls = ref<ClassItem | null>(null)
const members = ref<ClassMember[]>([])
const notices = ref<any[]>([])

const membersLoading = ref(false)
const noticesLoading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getClass(classId)
    cls.value = res
    await Promise.all([loadMembers(), loadNotices()])
  } catch (e: any) {
    toast.error(e?.message || '加载班级详情失败')
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  membersLoading.value = true
  try {
    const list = await listClassMembers(classId)
    members.value = Array.isArray(list) ? list : []
  } catch {
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

async function loadNotices() {
  noticesLoading.value = true
  try {
    const res = await listSchoolNotices(0, 50)
    notices.value = (res?.items || res || []).filter((n: any) => n.classId === classId)
  } catch {
    notices.value = []
  } finally {
    noticesLoading.value = false
  }
}

const headTeacher = computed(() => members.value.find(m => m.role === 'head'))
const subjectTeachers = computed(() => members.value.filter(m => m.role === 'subject'))
const activeNotices = computed(() => notices.value.filter(n => !n.ended).length)

function goStudents() {
  router.push(`/teacher/students?classId=${classId}`)
}
function goSeats() {
  router.push(`/teaching/seatMap?classId=${classId}`)
}
function goSchedule() {
  router.push('/community/schedule')
}
function goNotices() {
  router.push('/workspace/notices')
}
function goEdit() {
  router.push(`/school-admin/classes?edit=${classId}`)
}
async function handleDelete() {
  if (!cls.value) return
  if (!confirm(`确定删除班级「${cls.value.name}」？此操作不可恢复。`)) return
  try {
    await deleteClass(classId)
    toast.success('已删除')
    router.push('/school-admin/classes')
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center gap-3 no-print">
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" @click="router.back()">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-2xl font-bold text-cocoa-900">班级详情</h1>
      <div class="ml-auto flex gap-2">
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-200 text-cocoa-700 text-sm hover:bg-cream-300" @click="goEdit">
          <Edit3 class="w-4 h-4" /> 编辑
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm hover:bg-red-100" @click="handleDelete">
          <Trash2 class="w-4 h-4" /> 删除
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-cocoa-400 py-12">加载中…</div>
    <div v-else-if="!cls" class="text-center text-cocoa-400 py-12">班级不存在或无权查看</div>
    <template v-else>
      <!-- 基本信息卡 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold" :style="{ background: cls.color || '#f5b342' }">
            {{ cls.grade?.[0] || '班' }}
          </div>
          <div>
            <div class="text-xl font-bold text-cocoa-900">{{ cls.name }}</div>
            <div class="text-sm text-cocoa-500">{{ cls.grade }} · {{ cls.term || '未设学期' }}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">班主任</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ cls.headTeacher || '-' }}</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">学生人数</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ (cls as any).studentCount ?? '-' }}</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">班级成员</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ members.length }} 人</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">进行中公告</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ activeNotices }}</div>
          </div>
        </div>
        <div v-if="cls.slogan" class="mt-3 text-sm text-cocoa-600 bg-cream-50 rounded-xl p-3">
          📢 班级口号：{{ cls.slogan }}
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goStudents">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-mint-500" /> 学生管理</div>
          <div class="text-xs text-cocoa-400">花名册 / 成绩</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goSeats">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-sky2-500" /> 座位表</div>
          <div class="text-xs text-cocoa-400">可视化排座</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goSchedule">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Calendar class="w-4 h-4 text-butter-500" /> 班级课表</div>
          <div class="text-xs text-cocoa-400">课程安排</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goNotices">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Megaphone class="w-4 h-4 text-sakura-500" /> 公告</div>
          <div class="text-xs text-cocoa-400">发布/管理</div>
        </div>
      </div>

      <!-- 班级成员 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Users class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">班级成员</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ members.length }} 人</span>
        </div>
        <div v-if="membersLoading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!members.length" class="text-cocoa-400 text-sm">暂无成员</div>
        <div v-else class="space-y-2">
          <!-- 班主任 -->
          <div v-if="headTeacher" class="flex items-center gap-3 p-3 rounded-xl bg-cream-50">
            <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center text-butter-700 font-bold text-sm">班主任</div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-cocoa-900">{{ headTeacher.teacherName || headTeacher.teacherId }}</div>
              <div class="text-xs text-cocoa-500">{{ headTeacher.term || '-' }}</div>
            </div>
            <div v-if="headTeacher.subjects?.length" class="flex gap-1">
              <span v-for="s in headTeacher.subjects" :key="s" class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-700">{{ s }}</span>
            </div>
          </div>
          <!-- 科任老师 -->
          <div v-for="m in subjectTeachers" :key="m.id" class="flex items-center gap-3 p-3 rounded-xl border border-cream-200 hover:border-mint-400 transition-colors">
            <div class="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center text-mint-700 font-bold text-sm">老师</div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-cocoa-900">{{ m.teacherName || m.teacherId }}</div>
              <div class="text-xs text-cocoa-500">{{ m.term || '-' }}</div>
            </div>
            <div v-if="m.subjects?.length" class="flex gap-1">
              <span v-for="s in m.subjects" :key="s" class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-700">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 近期公告 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Megaphone class="w-5 h-5 text-sakura-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">近期公告</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ notices.length }} 条</span>
        </div>
        <div v-if="noticesLoading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!notices.length" class="text-cocoa-400 text-sm">暂无公告</div>
        <div v-else class="space-y-2">
          <div v-for="n in notices.slice(0, 10)" :key="n.id" class="flex items-center justify-between p-3 rounded-xl border border-cream-200">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cocoa-900 truncate">{{ n.title || '无标题' }}</div>
              <div class="text-xs text-cocoa-500 mt-0.5">{{ n.createdAt || n.created_at || '-' }}</div>
            </div>
            <span v-if="n.ended" class="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-500">已结束</span>
            <span v-else class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-700">进行中</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
