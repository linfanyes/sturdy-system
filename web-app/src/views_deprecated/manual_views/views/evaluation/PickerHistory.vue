<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const history = ref<any[]>([])
async function load() {
  try { const d = await request.get('/picker-history'); history.value = d?.items || d || [] } catch (e) { console.error(e) }
}
load()
</script>
<template>
  <div class="picker-history"><h2>点名历史</h2>
    <div class="list"><div v-for="h in history" :key="h.id" class="item"><div class="student">{{ h.studentName || h.name }}</div><div class="time">{{ h.time || h.createdAt }}</div></div>
    <div v-if="!history.length" class="empty">暂无点名记录</div></div>
  </div>
</template>
<style scoped>
.picker-history{padding:20px} .picker-history h2{margin:0 0 16px;font-size:18px}
.list{display:flex;flex-direction:column;gap:8px}
.item{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:10px 14px}
.student{font-weight:500}.time{font-size:12px;color:#999}
.empty{text-align:center;padding:40px;color:#999}
</style>