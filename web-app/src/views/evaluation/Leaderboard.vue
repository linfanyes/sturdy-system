<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { Trophy, Medal } from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const loading = ref(false)
const scoreRecords = ref<any[]>([])
const rewardRecords = ref<any[]>([])

async function loadData() {
  if (!classId.value) return
  loading.value = true
  try {
    const [sc, rw] = await Promise.all([
      request.get('/score-records', { params: { classId: classId.value } }),
      request.get('/reward-records', { params: { classId: classId.value } }),
    ])
    scoreRecords.value = Array.isArray(sc) ? sc : (sc?.items || [])
    rewardRecords.value = Array.isArray(rw) ? rw : (rw?.items || [])
  } catch { scoreRecords.value = []; rewardRecords.value = [] } finally { loading.value = false }
}

const ranking = computed(() => {
  const map = new Map<string, number>()
  for (const r of scoreRecords.value) {
    const name = r.studentName
    if (!name) continue
    map.set(name, (map.get(name) || 0) + Number(r.score || 0))
  }
  for (const r of rewardRecords.value) {
    const name = r.studentName
    if (!name) continue
    const delta = r.type === '减分' ? -Number(r.score || 0) : Number(r.score || 0)
    map.set(name, (map.get(name) || 0) + delta)
  }
  return Array.from(map.entries())
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
})

const medalColor = (i: number) => i === 0 ? 'text-butter-500' : i === 1 ? 'text-cocoa-400' : i === 2 ? 'text-sakura-400' : 'text-cocoa-300'
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Trophy class="w-6 h-6 text-butter-500" /> 积分排行榜
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <label class="text-sm text-cocoa-500">班级</label>
      <select v-model="classId" @change="loadData" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 max-w-xs">
        <option value="">请选择</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 text-center">加载中…</div>

    <div v-else-if="ranking.length" class="table-wrap">
      <div class="px-4 py-3 bg-cream-100 text-cocoa-500 font-medium">排名（共 {{ ranking.length }} 人）</div>
      <div class="divide-y divide-cream-100">
        <div v-for="(r, i) in ranking" :key="r.name" class="flex items-center px-4 py-3 hover:bg-cream-50">
          <div class="w-10 flex items-center justify-center">
            <Medal v-if="i < 3" :class="['w-5 h-5', medalColor(i)]" />
            <span v-else class="text-cocoa-400 text-sm">{{ i + 1 }}</span>
          </div>
          <div class="flex-1 text-cocoa-900 font-medium">{{ r.name }}</div>
          <div class="text-butter-600 font-semibold">{{ r.score }} 分</div>
        </div>
      </div>
    </div>
  </div>
</template>
