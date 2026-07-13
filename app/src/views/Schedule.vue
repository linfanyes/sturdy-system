<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClassStore } from '../stores/class'
import { useSchoolStore } from '../stores/school'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'
import MyScheduleTable from '../components/common/MyScheduleTable.vue'
import Modal from '../components/common/Modal.vue'
import ToolBackButton from '../components/common/ToolBackButton.vue'
import { Calendar, Settings, Printer, Save, SlidersHorizontal } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const userStore = useUserStore()
const toast = useToastStore()
const router = useRouter()

// 我的任教配置（持久化在 userStore）
const teaching = computed(() => userStore.teaching)

// 班级 × 科目组合（用于勾选）
const subjectOptions = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学',
  '午自习', '课后服务', '综合实践', '信息技术', '劳动', '阅读',
]

const settingOpen = ref(false)

// 进入页面时：若任教为空，弹提示 + 打开设置
onMounted(() => {
  if (userStore.teaching.length === 0) {
    toast.warning('请先勾选任课')
    settingOpen.value = true
  }
})

function toggleAssignment(classId: string, subject: string) {
  userStore.toggleTeaching(classId, subject)
}

function clearAll() {
  if (!confirm('确定清空所有任教配置？')) return
  userStore.setTeaching([])
  toast.info('已清空')
}

function saveAndClose() {
  settingOpen.value = false
  toast.success(`已保存任教配置（${teaching.value.length} 项）`)
}

// 统计
const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay()
const todayLessons = computed(() => {
  return schoolStore.schedules.filter((s) => {
    if (s.dayOfWeek !== todayDow) return false
    if (s.period > 8) return false
    if (!s.subject) return false
    return userStore.isTeaching(s.classId, s.subject)
  })
})

const totalLessons = computed(() => {
  return schoolStore.schedules.filter((s) => {
    if (!s.subject) return false
    return userStore.isTeaching(s.classId, s.subject)
  }).length
})

function openSettings() {
  settingOpen.value = true
}

function print() {
  window.print()
}

function goScheduleMaker() {
  router.push({ name: 'tool-schedule-maker' })
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <ToolBackButton />
    <!-- 顶部 -->
    <div class="card-soft p-4 sm:p-5 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-butter-300/70 flex items-center justify-center text-xl sm:text-2xl">
          📅
        </div>
        <div class="min-w-0">
          <div class="title-display text-lg sm:text-xl">
            我的课表
          </div>
          <div class="text-xs text-cocoa-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
            <span>已设置 <b class="text-butter-600">{{ teaching.length }}</b> 项任教</span>
            <span class="text-cocoa-300 hidden sm:inline">|</span>
            <span>本周共 <b class="text-butter-600">{{ totalLessons }}</b> 节课</span>
            <span class="text-cocoa-300 hidden sm:inline">|</span>
            <span>今日 <b class="text-mint-500">{{ todayLessons.length }}</b> 节</span>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="btn-secondary !py-2 !px-3 text-sm flex-1 sm:flex-none"
          @click="print"
        >
          <Printer :size="14" /> 打印
        </button>
        <button
          class="btn-secondary !py-2 !px-3 text-sm flex-1 sm:flex-none"
          @click="goScheduleMaker"
        >
          <SlidersHorizontal :size="14" /> 排版课表
        </button>
        <button
          class="btn-primary flex-1 sm:flex-none"
          @click="openSettings"
        >
          <Settings :size="14" /> 设置任课
        </button>
      </div>
    </div>

    <!-- 课程表 -->
    <div v-if="teaching.length">
      <MyScheduleTable />
    </div>
    <div
      v-else
      class="card-soft p-10 text-center"
    >
      <div class="text-4xl mb-2">
        📋
      </div>
      <div class="title-display text-lg mb-1">
        还没有设置任课
      </div>
      <div class="text-sm text-cocoa-500 mb-4">
        请先勾选你在哪些班级教授哪些科目
      </div>
      <button
        class="btn-primary"
        @click="openSettings"
      >
        <Settings :size="14" /> 立即设置任课
      </button>
    </div>

    <!-- 当前任教清单 -->
    <div
      v-if="teaching.length"
      class="card-soft p-5"
    >
      <div class="text-sm font-medium mb-2 flex items-center gap-2">
        <Calendar
          :size="14"
          class="text-cocoa-500"
        /> 当前任教一览
      </div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="t in teaching"
          :key="t.classId + '-' + t.subject"
          class="chip bg-butter-100 text-butter-600"
        >
          {{ classStore.getClass(t.classId)?.name || '已删除' }} · {{ t.subject }}
        </span>
      </div>
    </div>

    <!-- 设置任课弹窗 -->
    <Modal
      :open="settingOpen"
      title="设置我的任课"
      width="780px"
      @close="settingOpen = false"
    >
      <div class="space-y-3 max-h-[60vh] sm:max-h-none overflow-y-auto sm:overflow-visible -mr-1 pr-1 sm:mr-0 sm:pr-0">
        <p class="text-sm text-cocoa-500">
          勾选你在每个班级教授的科目。保存后，课表只展示与你任教相关的课节。
        </p>

        <div
          v-for="c in classStore.classes"
          :key="c.id"
          class="card-flat p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="font-medium flex items-center gap-2 text-sm sm:text-base">
              <span>🏫</span> {{ c.name }}
            </div>
            <div class="text-[11px] text-cocoa-500">
              已选 {{ teaching.filter((t) => t.classId === c.id).length }} / {{ subjectOptions.length }}
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              v-for="s in subjectOptions"
              :key="s"
              class="chip border transition cursor-pointer text-xs sm:text-sm"
              :class="
                userStore.isTeaching(c.id, s)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900 shadow-softer'
                  : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleAssignment(c.id, s)"
            >
              {{ userStore.isTeaching(c.id, s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
        </div>

        <div
          v-if="!classStore.classes.length"
          class="text-center text-cocoa-500 py-4"
        >
          请先到「班级管理」创建班级
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap gap-2 justify-end w-full">
          <button
            class="btn-sakura !py-1.5 text-sm"
            @click="clearAll"
          >
            清空全部
          </button>
          <button
            class="btn-secondary !py-1.5 text-sm"
            @click="settingOpen = false"
          >
            取消
          </button>
          <button
            class="btn-primary !py-1.5 text-sm"
            @click="saveAndClose"
          >
            <Save :size="14" /> 保存
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>
