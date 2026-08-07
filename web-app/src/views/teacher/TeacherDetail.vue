<script setup lang="ts">
/**
 * 教师详情页
 * 路由 query：id（教师记录 id）或 userId（教师用户 id），二者至少其一
 * - GET /teachers/{id}/detail?userId=xxx  返回教师详情聚合数据
 * 适用于：校管、班主任、教师本人、家长端（家长端另有接口，本页用于教师域）
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTeacherDetail } from '@/api/teacher'
import {
  ArrowLeft, Phone, Mail, User, BookOpen, School, Award,
  Calendar, Quote, Copy, Check, Users, GraduationCap, Briefcase, Star,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const routeId = String(route.query.id || '')
const routeUserId = String(route.query.userId || '')
// 路径参 id 优先取 id，回退 userId；查询参 userId 优先取 userId，回退 id
const id = routeId || routeUserId
const userId = routeUserId || routeId

const loading = ref(false)
const detail = ref<any>(null)

const subjects = computed<string[]>(() => detail.value?.subjects || [])
const teachings = computed<any[]>(() => detail.value?.teachings || [])
const headClasses = computed<any[]>(() => detail.value?.headClasses || [])

async function loadDetail() {
  if (!id) return
  loading.value = true
  try {
    detail.value = await getTeacherDetail(id, userId)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/teacher/teacher-directory')
}

/* 复制联系方式 */
const copiedKey = ref('')
let copyTimer: ReturnType<typeof setTimeout> | null = null
async function copyText(text: string, key: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 忽略剪贴板不可用 */
  }
  copiedKey.value = key
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copiedKey.value = '' }, 1500)
}

const avatarText = computed(() => {
  const n = detail.value?.name || ''
  return n ? n.slice(0, 1) : '?'
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部标题栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <button class="p-2 rounded-xl bg-surface border border-cream-200 hover:bg-cream-50 text-cocoa-600" @click="goBack">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
            <User class="w-6 h-6 text-butter-500" />
            {{ detail?.name || '教师详情' }}
          </h1>
          <div class="text-sm text-cocoa-500 mt-0.5">
            <template v-if="detail?.position">{{ detail.position }}</template>
            <template v-else>教师</template>
            <span v-if="detail?.school" class="mx-2 text-cocoa-300">·</span>
            <span v-if="detail?.school">{{ detail.school }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      加载中…
    </div>

    <template v-else>
      <div v-if="!detail" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
        暂无数据
      </div>

      <template v-else>
        <!-- 教师基本信息卡片 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="flex items-center gap-5 flex-wrap">
            <!-- 头像 -->
            <div class="shrink-0">
              <img
                v-if="detail.avatar"
                :src="detail.avatar"
                :alt="detail.name"
                class="w-20 h-20 rounded-2xl object-cover border border-cream-200"
              />
              <div
                v-else
                class="w-20 h-20 rounded-2xl bg-butter-100 text-butter-600 flex items-center justify-center text-3xl font-bold"
              >
                {{ avatarText }}
              </div>
            </div>
            <!-- 姓名与基础信息 -->
            <div class="flex-1 min-w-[200px]">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-2xl font-bold text-cocoa-900">{{ detail.name || '-' }}</span>
                <span v-if="detail.isStarred" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-600">
                  <Star class="w-3 h-3" /> 重点关注
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-cocoa-600">
                <span v-if="detail.position" class="inline-flex items-center gap-1.5">
                  <Briefcase class="w-4 h-4 text-cocoa-400" /> {{ detail.position }}
                </span>
                <span v-if="detail.gender" class="inline-flex items-center gap-1.5">
                  <User class="w-4 h-4 text-cocoa-400" /> {{ detail.gender }}
                </span>
                <span v-if="detail.teacherNo || detail.teacherId" class="inline-flex items-center gap-1.5">
                  <Award class="w-4 h-4 text-cocoa-400" /> 编号：{{ detail.teacherNo || detail.teacherId }}
                </span>
                <span v-if="detail.joinAt" class="inline-flex items-center gap-1.5">
                  <Calendar class="w-4 h-4 text-cocoa-400" /> 入职：{{ detail.joinAt }}
                </span>
                <span v-if="detail.school" class="inline-flex items-center gap-1.5">
                  <School class="w-4 h-4 text-cocoa-400" /> {{ detail.school }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系方式 + 任教学科 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- 联系方式卡片 -->
          <div class="bg-surface rounded-2xl p-6 shadow-softer">
            <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
              <Phone class="w-5 h-5 text-butter-500" /> 联系方式
            </h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3 rounded-xl border border-cream-200 px-4 py-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-lg bg-mint-100 text-mint-500 flex items-center justify-center shrink-0">
                    <Phone class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-cocoa-400">手机号</div>
                    <div class="text-sm font-medium text-cocoa-900 truncate">{{ detail.phone || '-' }}</div>
                  </div>
                </div>
                <button
                  v-if="detail.phone"
                  class="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200 transition-colors"
                  @click="copyText(detail.phone, 'phone')"
                >
                  <component :is="copiedKey === 'phone' ? Check : Copy" class="w-3.5 h-3.5" />
                  {{ copiedKey === 'phone' ? '已复制' : '复制' }}
                </button>
              </div>
              <div class="flex items-center justify-between gap-3 rounded-xl border border-cream-200 px-4 py-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-lg bg-sky2-100 text-sky2-600 flex items-center justify-center shrink-0">
                    <Mail class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-cocoa-400">邮箱</div>
                    <div class="text-sm font-medium text-cocoa-900 truncate">{{ detail.email || '-' }}</div>
                  </div>
                </div>
                <button
                  v-if="detail.email"
                  class="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200 transition-colors"
                  @click="copyText(detail.email, 'email')"
                >
                  <component :is="copiedKey === 'email' ? Check : Copy" class="w-3.5 h-3.5" />
                  {{ copiedKey === 'email' ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 任教学科 -->
          <div class="bg-surface rounded-2xl p-6 shadow-softer">
            <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
              <BookOpen class="w-5 h-5 text-butter-500" /> 任教学科
            </h2>
            <div v-if="subjects.length" class="flex flex-wrap gap-2">
              <span
                v-for="s in subjects"
                :key="s"
                class="text-sm px-3 py-1.5 rounded-full bg-butter-100 text-butter-600 font-medium"
              >
                {{ s }}
              </span>
            </div>
            <div v-else class="text-center text-cocoa-400 py-6 text-sm">暂无任教学科</div>
          </div>
        </div>

        <!-- 任课班级表格 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-butter-500" /> 任课班级
          </h2>
          <div v-if="teachings.length" class="table-wrap">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-4 py-3 font-medium">班级</th>
                  <th class="px-4 py-3 font-medium">科目</th>
                  <th class="px-4 py-3 font-medium">学期</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr
                  v-for="(t, i) in teachings"
                  :key="i"
                  class="hover:bg-cream-50 transition-colors"
                >
                  <td class="px-4 py-3 font-medium text-cocoa-900">{{ t.className || t.classId || '-' }}</td>
                  <td class="px-4 py-3 text-cocoa-700">{{ t.subject || '-' }}</td>
                  <td class="px-4 py-3 text-cocoa-700">{{ t.term || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center text-cocoa-400 py-6 text-sm">暂无任课班级</div>
        </div>

        <!-- 班主任身份 -->
        <div v-if="headClasses.length" class="bg-surface rounded-2xl p-6 shadow-softer">
          <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
            <Users class="w-5 h-5 text-butter-500" /> 班主任身份
          </h2>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(c, i) in headClasses"
              :key="i"
              class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-mint-100 text-mint-600 font-medium"
            >
              <GraduationCap class="w-4 h-4" />
              {{ c.className || c.classId }}
              <span v-if="c.term" class="text-mint-500/80 text-xs">· {{ c.term }}</span>
            </span>
          </div>
        </div>

        <!-- 个人简介 / 座右铭 -->
        <div v-if="detail.motto" class="bg-surface rounded-2xl p-6 shadow-softer">
          <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
            <Quote class="w-5 h-5 text-butter-500" /> 座右铭
          </h2>
          <p class="text-sm text-cocoa-700 leading-relaxed">{{ detail.motto }}</p>
        </div>

        <!-- 备注 -->
        <div v-if="detail.remark" class="bg-surface rounded-2xl p-6 shadow-softer">
          <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
            <Briefcase class="w-5 h-5 text-butter-500" /> 备注
          </h2>
          <p class="text-sm text-cocoa-700 leading-relaxed whitespace-pre-wrap">{{ detail.remark }}</p>
        </div>
      </template>
    </template>
  </div>
</template>
