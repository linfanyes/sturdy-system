<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getLearningProfile, generateExercise, saveStudyPlan } from '@/api/learningLoop'
import { useClasses } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const loading = ref(false)
const profile = ref<any>(null)

const expanded = ref<string | null>(null)
const genKp = ref('')
const genLoading = ref(false)
const genResult = ref<any>(null)

const planKp = ref('')
const planProgress = ref(0)
const planSaving = ref(false)

async function load() {
  if (!classId.value) { profile.value = null; return }
  loading.value = true
  try {
    profile.value = await getLearningProfile(classId.value)
  } finally {
    loading.value = false
  }
}

const memberList = computed(() => profile.value?.students || [])

async function generate(studentId: string, kp: string) {
  genKp.value = kp
  genLoading.value = true
  genResult.value = null
  try {
    genResult.value = await generateExercise({ studentId, knowledgePoint: kp })
  } catch (e: any) {
    alert('生成失败：' + (e?.message || e))
  } finally {
    genLoading.value = false
  }
}

async function savePlan(studentId: string) {
  if (!planKp.value.trim()) { alert('请填写本周要攻克的知识点'); return }
  planSaving.value = true
  try {
    await saveStudyPlan({
      studentId,
      classId: classId.value,
      knowledgePoints: planKp.value.split(/[,，、\n]/).map((s: string) => s.trim()).filter(Boolean),
      progress: planProgress.value,
      note: '',
    })
    alert('学习计划已保存')
    planKp.value = ''
    planProgress.value = 0
  } catch (e: any) {
    alert('保存失败：' + (e?.message || e))
  } finally {
    planSaving.value = false
  }
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
        <h1 class="text-xl font-semibold text-gray-800">个性化学习闭环</h1>
        <p class="text-sm text-gray-500">聚合错题与成绩薄弱点，生成学情画像与 AI 同类题练习，因材施教。</p>
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
    <div v-else-if="!memberList.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">该班级暂无可分析的学生（需先录入成绩或错题）。</div>

    <template v-else>
      <div class="grid gap-4">
        <div v-for="s in memberList" :key="s.studentId" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-2 flex items-center justify-between">
            <div class="font-semibold text-gray-800">{{ s.studentName }}</div>
            <button class="text-sm text-blue-600 hover:underline" @click="expanded = expanded === s.studentId ? null : s.studentId">
              {{ expanded === s.studentId ? '收起' : '设定本周计划' }}
            </button>
          </div>

          <div v-if="!s.weakPoints?.length" class="text-sm text-gray-400">暂未发现明显薄弱点，继续保持～</div>
          <div v-else class="flex flex-wrap gap-2">
            <span v-for="(w, i) in s.weakPoints" :key="i" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              :class="w.source === 'mistake' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'">
              {{ w.kp }}
              <span v-if="w.count > 1" class="rounded-full bg-white/70 px-1">×{{ w.count }}</span>
              <button class="ml-1 font-medium hover:underline" @click="generate(s.studentId, w.kp)">练</button>
            </span>
          </div>

          <div v-if="expanded === s.studentId" class="mt-3 rounded-lg bg-gray-50 p-3">
            <label class="mb-1 block text-xs text-gray-500">本周要攻克的知识点（用逗号分隔）</label>
            <textarea v-model="planKp" rows="2" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="如：分数加减法, 四边形面积"></textarea>
            <div class="mt-2 flex items-center gap-3">
              <span class="text-xs text-gray-500">进度 {{ planProgress }}%</span>
              <input v-model.number="planProgress" type="range" min="0" max="100" class="flex-1" />
              <button class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50" :disabled="planSaving" @click="savePlan(s.studentId)">
                {{ planSaving ? '保存中…' : '保存计划' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="genResult" class="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div class="mb-1 flex items-center justify-between">
          <span class="font-medium text-blue-700">AI 同类题 · {{ genResult.knowledgePoint }}</span>
          <button class="text-xs text-gray-400 hover:underline" @click="genResult = null">关闭</button>
        </div>
        <div v-if="genLoading" class="text-sm text-gray-400">生成中…</div>
        <div v-else class="space-y-2 text-sm text-gray-700">
          <div><span class="font-medium">题目：</span>{{ genResult.question }}</div>
          <div v-if="genResult.answer"><span class="font-medium">答案：</span>{{ genResult.answer }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
