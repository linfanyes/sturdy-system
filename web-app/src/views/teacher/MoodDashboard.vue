<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">心情与情绪关怀</h1>
      <div class="text-sm text-gray-500">班级情绪看板 · 每日心情打卡聚合</div>
    </div>

    <!-- 概览 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-3xl font-bold text-indigo-600">{{ dashboard.avgLevel || '—' }}</div>
        <div class="text-xs text-gray-500 mt-1">班级平均情绪 (1–5)</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-3xl font-bold text-gray-700">{{ dashboard.total || 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">打卡样本数</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-3xl font-bold text-rose-500">{{ dashboard.treePending || 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">树洞待处理</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-3xl font-bold text-red-600">{{ dashboard.treeHigh || 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">高危待跟进</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 情绪分布 -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold text-gray-700 mb-3">情绪分布</div>
        <div v-for="o in levelOptions" :key="o.level" class="flex items-center gap-2 mb-2">
          <div class="w-16 text-sm text-gray-600">{{ o.icon }} {{ o.label }}</div>
          <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div class="h-full bg-indigo-400" :style="{ width: pct(dashboard.distribution?.[o.level]) }"></div>
          </div>
          <div class="w-8 text-right text-xs text-gray-500">{{ dashboard.distribution?.[o.level] || 0 }}</div>
        </div>
      </div>

      <!-- 趋势 -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold text-gray-700 mb-3">近期情绪趋势（日均）</div>
        <div v-if="!(dashboard.trend || []).length" class="text-sm text-gray-400">暂无数据</div>
        <div class="space-y-1">
          <div v-for="t in dashboard.trend" :key="t.date" class="flex items-center gap-2 text-sm">
            <div class="w-20 text-gray-500">{{ t.date }}</div>
            <div class="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div class="h-full bg-emerald-400" :style="{ width: ((t.avg / 5) * 100) + '%' }"></div>
            </div>
            <div class="w-10 text-right text-gray-600">{{ t.avg }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 连续低落预警 -->
    <div class="bg-white rounded-xl p-4 shadow-sm mt-4">
      <div class="font-semibold text-gray-700 mb-3">⚡ 需要关注（连续低落 ≥2 天）</div>
      <div v-if="!(dashboard.lowStreak || []).length" class="text-sm text-gray-400">暂无连续低落学生，很好 👍</div>
      <div v-for="s in dashboard.lowStreak" :key="s.studentId" class="flex items-center justify-between border-b border-gray-50 py-2">
        <div>
          <div class="text-sm font-medium text-gray-800">{{ s.studentName || s.studentId }}</div>
          <div class="text-xs text-gray-400">连续 {{ s.streak }} 天低落 · 最近 {{ s.latestDate }}</div>
        </div>
        <div class="text-xs text-rose-500 max-w-[50%] truncate">{{ s.latestNote || '（无留言）' }}</div>
      </div>
    </div>

    <!-- 树洞跟进 -->
    <div class="bg-white rounded-xl p-4 shadow-sm mt-4">
      <div class="font-semibold text-gray-700 mb-3">🕳️ 树洞跟进</div>
      <div v-if="!trees.length" class="text-sm text-gray-400">暂无倾诉</div>
      <div v-for="t in trees" :key="t.id" class="border rounded-lg p-3 mb-2" :class="t.riskLevel === 'high' ? 'border-red-300 bg-red-50' : 'border-gray-100'">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs px-2 py-0.5 rounded-full" :class="riskClass(t.riskLevel)">{{ riskText(t.riskLevel) }}</span>
          <span class="text-xs text-gray-400">{{ t.createdAt ? t.createdAt.slice(0, 10) : '' }}</span>
          <span class="text-xs text-gray-400 ml-auto">{{ statusText(t.status) }}</span>
        </div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ t.content }}</div>
        <div v-if="t.aiReply" class="text-xs text-emerald-600 mt-1">🌱 {{ t.aiReply }}</div>
        <div v-if="t.staffReply" class="text-xs text-amber-700 mt-1">👩‍🏫 {{ t.staffReply }}</div>
        <div class="mt-2 flex gap-2">
          <input v-model="t._reply" placeholder="人工回复 / 关怀留言" class="flex-1 text-sm border rounded px-2 py-1" />
          <select v-model="t._risk" class="text-sm border rounded px-1">
            <option value="none">正常</option>
            <option value="low">轻微</option>
            <option value="high">高危</option>
          </select>
          <button class="text-sm bg-indigo-500 text-white rounded px-3 py-1" @click="reply(t)">回复</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMoodDashboard, listTreeHoles, replyTreeHole } from '@/api/mood'

const dashboard = ref<any>({})
const trees = ref<any[]>([])

const levelOptions = [
  { level: 5, icon: '😄', label: '很好' },
  { level: 4, icon: '🙂', label: '不错' },
  { level: 3, icon: '😐', label: '还行' },
  { level: 2, icon: '😟', label: '有点闷' },
  { level: 1, icon: '😣', label: '很低落' },
]

function pct(v?: number) {
  const total = dashboard.value.total || 0
  if (!v || !total) return '0%'
  return Math.round((v / total) * 100) + '%'
}
function riskClass(r: string) {
  return r === 'high' ? 'bg-red-100 text-red-600' : r === 'low' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
}
function riskText(r: string) {
  return r === 'high' ? '需关注' : r === 'low' ? '轻微' : '正常'
}
function statusText(s: string) {
  return s === 'escalated' ? '已升级' : s === 'responded' ? '已回复' : '待处理'
}

async function load() {
  try {
    dashboard.value = (await getMoodDashboard()) || {}
    const list = (await listTreeHoles()) || []
    trees.value = list.map((t) => ({ ...t, _reply: '', _risk: t.riskLevel || 'none' }))
  } catch (e) {
    dashboard.value = {}
    trees.value = []
  }
}
async function reply(t: any) {
  try {
    await replyTreeHole(t.id, { staffReply: t._reply, riskLevel: t._risk, status: t._risk === 'high' ? 'escalated' : 'responded' })
    await load()
  } catch (e) {
    alert('回复失败：' + (e as any)?.message)
  }
}

onMounted(load)
</script>
