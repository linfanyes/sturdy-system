<script setup lang="ts">
/**
 * 班级成员（协作教师）管理
 * 展示当前教师在各班级的协作关系：班主任 / 科任老师、任教学科、学期。
 * 数据来自后端 /classes/:id/members（按班级查询）。
 * 点击班主任 / 科任老师可查看教师详情（从 /teachers 同步）。
 */
import { ref, computed, onMounted } from 'vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listClassMembers, listTeachers, type ClassMember } from '@/api/teacher'
import { Users, Crown, BookOpen, Phone, Mail, Calendar, Briefcase, X } from 'lucide-vue-next'

const { classes } = useClasses()
const loading = ref(false)
const members = ref<ClassMember[]>([])
const activeClassId = ref('')
const teachers = ref<any[]>([])

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

async function loadTeachers() {
  try {
    const res = await listTeachers()
    teachers.value = Array.isArray(res) ? res : (res?.items || [])
  } catch { teachers.value = [] }
}

onMounted(async () => {
  await loadClasses()
  await loadTeachers()
  if (classes.value[0]) await loadMembers(classes.value[0].id)
})

const headTeachers = computed(() => members.value.filter(m => m.role === 'head'))
const subjectTeachers = computed(() => members.value.filter(m => m.role === 'subject'))
const activeClassName = computed(() => classes.value.find(c => c.id === activeClassId.value)?.name || '')

/* ============ 教师详情弹窗 ============ */
const detailVisible = ref(false)
const detailMember = ref<ClassMember | null>(null)
const detailTeacher = computed(() => {
  const m = detailMember.value
  if (!m) return null
  return teachers.value.find(t => t.id === m.teacherId || t.name === m.teacherName) || null
})

function openDetail(m: ClassMember) {
  detailMember.value = m
  detailVisible.value = true
}
function closeDetail() {
  detailVisible.value = false
  detailMember.value = null
}
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
          <div
            v-for="m in headTeachers"
            :key="m.id"
            class="border border-cream-200 rounded-xl p-4 cursor-pointer hover:border-butter-400 hover:shadow-soft transition-all"
            @click="openDetail(m)"
          >
            <!-- 第一行：姓名 -->
            <div class="font-semibold text-cocoa-900 text-base">{{ m.teacherName || m.teacherId }}</div>
            <!-- 第二行：学期 + 任教学科 -->
            <div class="text-xs text-cocoa-500 mt-1.5 flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1">
                <Calendar class="w-3 h-3" />学期：{{ m.term || '-' }}
              </span>
              <span v-if="m.subjects?.length" class="inline-flex items-center gap-1">
                <BookOpen class="w-3 h-3" />{{ m.subjects.join('、') }}
              </span>
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
          <div
            v-for="m in subjectTeachers"
            :key="m.id"
            class="border border-cream-200 rounded-xl p-3 cursor-pointer hover:border-mint-400 hover:shadow-soft transition-all"
            @click="openDetail(m)"
          >
            <!-- 第一行：姓名 -->
            <div class="font-medium text-cocoa-900 text-sm">{{ m.teacherName || m.teacherId }}</div>
            <!-- 第二行：学期 + 任教学科 -->
            <div class="text-xs text-cocoa-500 mt-1.5 flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1">
                <Calendar class="w-3 h-3" />{{ m.term || '-' }}
              </span>
              <span v-if="m.subjects?.length" class="inline-flex items-center gap-1">
                <BookOpen class="w-3 h-3" />{{ m.subjects.join('、') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 教师详情弹窗 -->
    <div v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <div class="modal">
        <div class="modal-h">
          <h3>教师详情</h3>
          <span class="modal-close" @click="closeDetail"><X class="w-4 h-4" /></span>
        </div>
        <div class="modal-body">
          <template v-if="detailMember">
            <!-- 基本信息 -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-14 h-14 rounded-2xl bg-butter-100 flex items-center justify-center text-2xl">
                {{ detailTeacher?.avatar || '🧑' }}
              </div>
              <div>
                <div class="text-lg font-bold text-cocoa-900">{{ detailMember.teacherName || detailMember.teacherId }}</div>
                <div class="text-xs text-cocoa-500 mt-0.5">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs"
                    :class="detailMember.role === 'head' ? 'bg-butter-100 text-butter-700' : 'bg-mint-100 text-mint-700'"
                  >{{ detailMember.role === 'head' ? '班主任' : '科任老师' }}</span>
                </div>
              </div>
            </div>

            <!-- 班级协作信息 -->
            <div class="bg-cream-50 rounded-xl p-3 mb-3 space-y-1.5 text-sm">
              <div class="flex items-center gap-2 text-cocoa-700">
                <Calendar class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">学期：</span>{{ detailMember.term || '-' }}
              </div>
              <div class="flex items-center gap-2 text-cocoa-700">
                <BookOpen class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">任教学科：</span>
                <span v-if="detailMember.subjects?.length" class="flex flex-wrap gap-1">
                  <span v-for="s in detailMember.subjects" :key="s" class="px-2 py-0.5 rounded-full bg-butter-100 text-butter-700 text-xs">{{ s }}</span>
                </span>
                <span v-else>-</span>
              </div>
              <div class="flex items-center gap-2 text-cocoa-700">
                <Users class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">班级：</span>{{ activeClassName || '-' }}
              </div>
            </div>

            <!-- 通讯录详细信息 -->
            <div v-if="detailTeacher" class="space-y-2 text-sm">
              <div v-if="detailTeacher.position" class="flex items-center gap-2 text-cocoa-700">
                <Briefcase class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">职务：</span>{{ detailTeacher.position }}
              </div>
              <div v-if="detailTeacher.phone" class="flex items-center gap-2 text-cocoa-700">
                <Phone class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">电话：</span>{{ detailTeacher.phone }}
              </div>
              <div v-if="detailTeacher.email" class="flex items-center gap-2 text-cocoa-700">
                <Mail class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">邮箱：</span>{{ detailTeacher.email }}
              </div>
              <div v-if="detailTeacher.joinAt" class="flex items-center gap-2 text-cocoa-700">
                <Calendar class="w-4 h-4 text-cocoa-400" />
                <span class="text-cocoa-500">入职时间：</span>{{ detailTeacher.joinAt }}
              </div>
              <div v-if="detailTeacher.remark" class="text-cocoa-600 text-xs bg-cream-50 rounded-lg p-2 mt-2">
                {{ detailTeacher.remark }}
              </div>
            </div>
            <div v-else class="text-xs text-cocoa-400 mt-2">该教师通讯录信息未同步，仅显示班级协作关系。</div>
          </template>
        </div>
        <div class="modal-foot">
          <button class="btn-outline" @click="closeDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>
