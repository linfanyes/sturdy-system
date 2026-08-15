<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listLessons, classBadges } from '@/api/literacy'
import { useClasses } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const tab = ref<'lessons' | 'badges'>('lessons')

const loading = ref(false)
const lessons = ref<any[]>([])
const badges = ref<any>({ byLesson: [], topStudents: [] })

const CAT_LABEL: Record<string, string> = { digital_literacy: '数字素养', online_safety: '网络安全', career: '生涯启蒙' }
const CAT_CLASS: Record<string, string> = {
  digital_literacy: 'bg-sky-50 text-sky-600',
  online_safety: 'bg-rose-50 text-rose-600',
  career: 'bg-violet-50 text-violet-600',
}

async function load() {
  if (!classId.value) { lessons.value = []; badges.value = { byLesson: [], topStudents: [] }; return }
  loading.value = true
  try {
    if (tab.value === 'lessons') {
      lessons.value = await listLessons()
    } else {
      badges.value = await classBadges(classId.value)
    }
  } catch (e: any) {
    alert('加载失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

function switchTab(t: 'lessons' | 'badges') {
  tab.value = t
  load()
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
        <h1 class="text-xl font-semibold text-gray-800">数字素养 · 生涯启蒙</h1>
        <p class="text-sm text-gray-500">微课学习 + 徽章激励，帮孩子成为安全、自信的小网民。</p>
      </div>
      <select v-model="classId" class="rounded-lg border border-gray-200 px-3 py-2 text-sm" @change="load">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="mb-4 flex items-center gap-3 text-sm">
      <button class="rounded-lg px-3 py-2" :class="tab === 'lessons' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('lessons')">微课库</button>
      <button class="rounded-lg px-3 py-2" :class="tab === 'badges' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('badges')">班级徽章</button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>
    <div v-else-if="!classId" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">请先选择班级。</div>

    <template v-else-if="tab === 'lessons'">
      <div v-if="!lessons.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">暂无微课。</div>
      <div v-else class="grid gap-3 sm:grid-cols-2">
        <div v-for="l in lessons" :key="l.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-1 flex items-center gap-2">
            <span class="rounded-full px-2 py-0.5 text-xs" :class="CAT_CLASS[l.category]">{{ CAT_LABEL[l.category] || l.category }}</span>
            <span class="text-xs text-gray-400">约 {{ l.duration }} 分钟</span>
          </div>
          <h3 class="font-semibold text-gray-800">{{ l.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-gray-600">{{ l.content }}</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 class="mb-2 font-semibold text-gray-800">各微课完成人数</h3>
          <div v-if="!badges.byLesson.length" class="text-sm text-gray-400">暂无完成记录。</div>
          <div v-for="b in badges.byLesson" :key="b.lessonId" class="mb-2">
            <div class="flex justify-between text-sm"><span class="text-gray-700">{{ b.title }}</span><span class="text-violet-600">{{ b.count }} 人</span></div>
            <div class="mt-1 h-2 rounded-full bg-gray-100"><div class="h-2 rounded-full bg-violet-500" :style="{ width: Math.min(100, b.count * 8) + '%' }"></div></div>
          </div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 class="mb-2 font-semibold text-gray-800">徽章达人榜</h3>
          <div v-if="!badges.topStudents.length" class="text-sm text-gray-400">还没有同学获得徽章。</div>
          <div v-for="(s, i) in badges.topStudents" :key="s.studentId" class="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0">
            <span class="w-6 text-center">{{ ['🥇', '🥈', '🥉'][i] || i + 1 }}</span>
            <span class="flex-1 text-sm text-gray-800">{{ s.studentName }}</span>
            <span class="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">{{ s.count }} 枚</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
