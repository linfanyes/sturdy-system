<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listMyClasses, type TeacherClass } from '@/api/teacher'
import { School, BookOpen, GraduationCap, Megaphone } from 'lucide-vue-next'

const auth = useAuthStore()
const loading = ref(true)
const classes = ref<TeacherClass[]>([])

async function loadDashboard() {
  loading.value = true
  try {
    const list = await listMyClasses()
    classes.value = Array.isArray(list) ? list : []
  } catch {
    classes.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadDashboard)

const featureLabel = (count: number) => count === 0 ? '全部可用' : `${count} 项`
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900">教师工作台</h1>
      <button
        class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors"
        :disabled="loading"
        @click="loadDashboard"
      >
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <!-- 概览卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-butter-100 flex items-center justify-center">
          <GraduationCap class="w-6 h-6 text-butter-600" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">当前教师</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ auth.user?.name }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-mint-100 flex items-center justify-center">
          <School class="w-6 h-6 text-mint-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">所属学校</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5 truncate max-w-[10rem]">{{ auth.user?.schoolName || auth.user?.schoolId || '-' }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-sky2-100 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-sky2-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">功能权限</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ featureLabel(auth.user?.features?.length ?? 0) }}</div>
        </div>
      </div>
    </div>

    <!-- 我的班级 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <School class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">我的班级</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ classes.length }} 个班级</span>
      </div>
      <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
      <div v-else-if="classes.length === 0" class="text-cocoa-400 text-sm py-8 text-center">
        <School class="w-8 h-8 mx-auto mb-2 text-cocoa-300" />
        暂无班级，请联系校管为您分配班级
      </div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="c in classes"
          :key="c.id"
          class="border border-cream-200 rounded-xl p-4 hover:border-butter-300 hover:shadow-softer transition-all"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-cocoa-900">{{ c.name }}</div>
            <span class="text-xs text-cocoa-400">{{ c.term || '本学期' }}</span>
          </div>
          <div class="text-sm text-cocoa-500 space-y-1">
            <div>年级：{{ c.grade || '-' }}</div>
            <div>班主任：{{ c.headTeacher || '-' }}</div>
            <div v-if="c.subjects?.length" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="s in c.subjects"
                :key="s"
                class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-600"
              >{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-start gap-3">
        <Megaphone class="w-5 h-5 text-sakura-500 mt-0.5" />
        <div class="text-sm text-cocoa-600">
          <div class="font-medium text-cocoa-900 mb-1">Web 端说明</div>
          <p>Web 端当前提供校管管理功能（教师/班级/学生/公告等）。教师日常教学功能（成绩录入、考勤、作业、AI 备课、课堂工具等）请使用小程序端，数据互通。</p>
        </div>
      </div>
    </div>
  </div>
</template>
