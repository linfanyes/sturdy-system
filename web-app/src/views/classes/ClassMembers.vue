<script setup lang="ts">
/**
 * 班级成员（协作教师）管理
 * 展示当前教师在各班级的协作关系：班主任 / 科任老师、任教学科、学期。
 * 数据来自后端 /classes/:id/members（按班级查询）。
 */
import { ref, computed, onMounted } from 'vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listClassMembers, type ClassMember } from '@/api/teacher'
import { Users, Crown, BookOpen } from 'lucide-vue-next'

const { classes } = useClasses()
const loading = ref(false)
const members = ref<ClassMember[]>([])
const activeClassId = ref('')

async function loadMembers(classId: string) {
  activeClassId.value = classId
  if (!classId) { members.value = []; return }
  loading.value = true
  try {
    const res = await listClassMembers(classId)
    members.value = Array.isArray(res) ? res : []
  } catch (e: any) {
    alert(e?.message || '加载成员失败')
    members.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  if (classes.value[0]) await loadMembers(classes.value[0].id)
})

const headTeachers = computed(() => members.value.filter(m => m.role === 'head'))
const subjectTeachers = computed(() => members.value.filter(m => m.role === 'subject'))
const activeClassName = computed(() => classes.value.find(c => c.id === activeClassId.value)?.name || '')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">班级成员</h1>
      <select
        v-model="activeClassId"
        class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
        @change="loadMembers(activeClassId)"
      >
        <option value="">请选择班级</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}（{{ c.term }}）</option>
      </select>
    </div>

    <div v-if="!activeClassId" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Users class="w-10 h-10 mx-auto mb-2 text-cocoa-300" />
      请先选择班级查看协作教师
    </div>

    <template v-else>
      <!-- 班主任 -->
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Crown class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">班主任</h2>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!headTeachers.length" class="text-cocoa-400 text-sm">暂未设置班主任</div>
        <div v-else class="grid grid-cols-2 gap-3">
          <div v-for="m in headTeachers" :key="m.id" class="border border-cream-200 rounded-xl p-4">
            <div class="font-semibold text-cocoa-900">{{ m.teacherName || m.teacherId }}</div>
            <div class="text-xs text-cocoa-400 mt-1">学期：{{ m.term || '-' }}</div>
            <div v-if="m.subjects?.length" class="flex flex-wrap gap-1 mt-2">
              <span v-for="s in m.subjects" :key="s" class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-600">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 科任老师 -->
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <BookOpen class="w-5 h-5 text-mint-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">科任老师</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ activeClassName }} · 共 {{ subjectTeachers.length }} 人</span>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!subjectTeachers.length" class="text-cocoa-400 text-sm">暂无科任老师</div>
        <div v-else class="grid grid-cols-3 gap-3">
          <div v-for="m in subjectTeachers" :key="m.id" class="border border-cream-200 rounded-xl p-3">
            <div class="font-medium text-cocoa-900 text-sm">{{ m.teacherName || m.teacherId }}</div>
            <div v-if="m.subjects?.length" class="flex flex-wrap gap-1 mt-1.5">
              <span v-for="s in m.subjects" :key="s" class="text-xs px-1.5 py-0.5 rounded bg-mint-100 text-mint-600">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
