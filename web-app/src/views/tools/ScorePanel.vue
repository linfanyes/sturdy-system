<script setup lang="ts">
/**
 * 课堂加减分
 * - 班级选择（useClasses）
 * - 学生网格（listClassStudents），每个学生显示当前总分
 * - 点击学生弹出加减分面板：+1/+2/+5/-1/-2/-5 + 自定义分值 + 原因
 * - 保存调用 createScoreRecord；加载历史 listScoreRecords
 * - 前端累加实时更新总分
 * - 排行榜（按分数排序）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useClasses } from '@/composables/useClasses'
import {
  listClassStudents,
  listScoreRecords,
  createScoreRecord,
  type TeacherStudent,
} from '@/api/teacher'
import Modal from '@/components/Modal.vue'
import { Award, Minus, Plus, Trophy, Medal, X, Save } from 'lucide-vue-next'

const { classes, loadClasses } = useClasses()
loadClasses()

const classId = ref('')
const students = ref<TeacherStudent[]>([])
const records = ref<any[]>([])
const activeStudent = ref<TeacherStudent | null>(null)
const customScore = ref<number | null>(null)
const reason = ref('')
const saving = ref(false)

const quickScores = [1, 2, 5, -1, -2, -5]

const scoreMap = computed(() => {
  const map = new Map<string, number>()
  for (const r of records.value) {
    const name = r.studentName
    if (!name) continue
    map.set(name, (map.get(name) || 0) + Number(r.score || 0))
  }
  return map
})

const leaderboard = computed(() =>
  students.value
    .map(s => ({ ...s, score: scoreMap.value.get(s.name) || 0 }))
    .sort((a, b) => b.score - a.score),
)

function medalColor(i: number) {
  return i === 0 ? 'text-butter-500' : i === 1 ? 'text-cocoa-400' : i === 2 ? 'text-sakura-400' : 'text-cocoa-300'
}

async function loadStudents(cid: string) {
  if (!cid) { students.value = []; return }
  try {
    const res = await listClassStudents(cid)
    students.value = Array.isArray(res) ? res : []
  } catch {
    students.value = []
  }
}

async function loadRecords(cid: string) {
  if (!cid) { records.value = []; return }
  try {
    const res = await listScoreRecords(cid)
    records.value = Array.isArray(res) ? res : ((res as any)?.items || [])
  } catch {
    records.value = []
  }
}

function onClassChange() {
  loadStudents(classId.value)
  loadRecords(classId.value)
}

function openStudent(s: TeacherStudent) {
  activeStudent.value = s
  customScore.value = null
  reason.value = ''
}

function closePanel() {
  activeStudent.value = null
}

async function applyScore(delta: number) {
  if (!activeStudent.value || !classId.value) return
  if (!delta) return
  saving.value = true
  try {
    const payload = {
      classId: classId.value,
      studentName: activeStudent.value.name,
      studentId: activeStudent.value.id,
      score: delta,
      reason: reason.value || (delta > 0 ? '课堂加分' : '课堂扣分'),
      source: '课堂',
      date: new Date().toISOString().slice(0, 10),
    }
    const created = await createScoreRecord(payload)
    records.value.unshift(created || payload)
    activeStudent.value = null
    reason.value = ''
    customScore.value = null
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function applyCustom() {
  const v = Number(customScore.value)
  if (!v) return
  applyScore(v)
}

onMounted(() => {})
watch(classId, onClassChange)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Award class="w-6 h-6 text-butter-500" /> 课堂加减分
    </h1>

    <!-- 班级选择 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <label class="text-sm text-cocoa-500">班级</label>
      <select
        v-model="classId"
        class="w-full mt-1 max-w-xs px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
      >
        <option value="">请选择班级</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="!classId" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      请先选择班级
    </div>

    <template v-else>
      <!-- 排行榜 -->
      <div class="table-wrap">
        <div class="flex items-center gap-2 px-4 py-3 bg-cream-100">
          <Trophy class="w-5 h-5 text-butter-500" />
          <span class="font-medium text-cocoa-700">实时排行榜</span>
          <span class="text-sm text-cocoa-400 ml-auto">共 {{ leaderboard.length }} 人</span>
        </div>
        <div class="divide-y divide-cream-100 max-h-48 overflow-y-auto">
          <div v-if="!leaderboard.length" class="px-4 py-6 text-center text-cocoa-400 text-sm">暂无学生</div>
          <div
            v-for="(s, i) in leaderboard"
            :key="s.id"
            class="flex items-center px-4 py-2"
          >
            <div class="w-8 flex items-center justify-center">
              <Medal v-if="i < 3" :class="['w-5 h-5', medalColor(i)]" />
              <span v-else class="text-cocoa-400 text-sm">{{ i + 1 }}</span>
            </div>
            <span class="flex-1 text-cocoa-900 text-sm font-medium">{{ s.name }}</span>
            <span :class="['text-sm font-semibold tabular-nums', s.score >= 0 ? 'text-butter-600' : 'text-sakura-500']">{{ s.score }}</span>
          </div>
        </div>
      </div>

      <!-- 学生网格 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-semibold text-cocoa-900">学生列表</h2>
          <span class="text-sm text-cocoa-400 ml-auto">点击学生进行加减分</span>
        </div>
        <div v-if="!students.length" class="text-cocoa-400 text-sm text-center py-4">该班级暂无学生</div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="s in students"
            :key="s.id"
            class="border border-cream-200 rounded-xl p-3 text-center hover:border-butter-300 hover:shadow-softer transition"
            @click="openStudent(s)"
          >
            <div class="font-medium text-cocoa-900 text-sm truncate">{{ s.name }}</div>
            <div
              :class="['mt-1 text-lg font-bold tabular-nums', (scoreMap.get(s.name) || 0) >= 0 ? 'text-butter-600' : 'text-sakura-500']"
            >{{ scoreMap.get(s.name) || 0 }}</div>
          </button>
        </div>
      </div>
    </template>

    <!-- 加减分弹窗 -->
    <Modal :model-value="!!activeStudent" @update:model-value="closePanel" :title="activeStudent ? `${activeStudent.name} 加减分` : ''" width="max-w-md">
      <div v-if="activeStudent" class="space-y-4">
        <div class="text-center py-3 bg-cream-50 rounded-xl">
          <div class="text-sm text-cocoa-500">当前总分</div>
          <div :class="['text-4xl font-bold tabular-nums', (scoreMap.get(activeStudent.name) || 0) >= 0 ? 'text-butter-600' : 'text-sakura-500']">
            {{ scoreMap.get(activeStudent.name) || 0 }}
          </div>
        </div>

        <div>
          <label class="text-sm text-cocoa-500">快捷加减分</label>
          <div class="grid grid-cols-3 gap-2 mt-1">
            <button
              v-for="v in quickScores"
              :key="v"
              :class="[
                'py-2.5 rounded-xl text-lg font-bold transition',
                v > 0 ? 'bg-mint-100 text-mint-600 hover:bg-mint-100/70' : 'bg-sakura-100 text-sakura-500 hover:bg-sakura-100/70',
              ]"
              :disabled="saving"
              @click="applyScore(v)"
            >{{ v > 0 ? '+' : '' }}{{ v }}</button>
          </div>
        </div>

        <div>
          <label class="text-sm text-cocoa-500">自定义分值</label>
          <div class="flex gap-2 mt-1">
            <input
              v-model.number="customScore"
              type="number"
              placeholder="如 3 或 -3"
              class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
            />
            <button
              class="flex items-center gap-1 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm hover:bg-butter-600 disabled:opacity-60"
              :disabled="saving || !customScore"
              @click="applyCustom"
            >
              <Save class="w-4 h-4" /> 应用
            </button>
          </div>
        </div>

        <div>
          <label class="text-sm text-cocoa-500">原因（可选）</label>
          <input
            v-model="reason"
            placeholder="如：主动回答问题、未交作业"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="closePanel">关闭</button>
      </template>
    </Modal>
  </div>
</template>
