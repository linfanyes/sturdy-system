<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const students = ref<any[]>([])
const selected = ref('')
const trend = ref<any[]>([])
async function loadStudents() {
  try { const d = await request.get('/students'); students.value = (d?.items || d || []).slice(0, 50) } catch (e) { console.error(e) }
}
async function loadTrend() {
  if (!selected.value) return
  try { const d = await request.get('/grades', { params: { studentId: selected.value } }); trend.value = d?.items || d || [] } catch (e) { console.error(e) }
}
loadStudents()
</script>
<template>
  <div class="grade-trend"><h2>成绩趋势</h2>
    <div class="sel"><select v-model="selected" @change="loadTrend"><option value="">选择学生</option><option v-for="s in students" :key="s.id" :value="s.id">{{ s.name || s.studentId }}</option></select></div>
    <div v-if="trend.length" class="list"><div v-for="item in trend" :key="item.id" class="item"><div class="exam">{{ item.examName || item.name }}</div><div class="bar"><div class="fill" :style="{width:(item.totalScore||0)+'%'}"><span>{{ item.totalScore || 0 }}分</span></div></div><div class="date">{{ item.date }}</div></div></div>
    <div v-else class="empty">{{ students.length ? '请选择学生' : '暂无数据' }}</div>
  </div>
</template>
<style scoped>
.grade-trend{padding:20px} .grade-trend h2{margin:0 0 16px;font-size:18px}
.sel{margin-bottom:16px} .sel select{padding:8px 12px;border:1px solid rgb(var(--cream-300));border-radius:4px}
.list{display:flex;flex-direction:column;gap:8px}
.item{background:rgb(var(--cream-50));border:1px solid rgb(var(--cream-300));border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:10px}
.exam{min-width:80px;font-size:14px}.bar{flex:1;height:20px;background:rgb(var(--cream-200));border-radius:10px;overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,rgb(var(--p-amber)),rgb(var(--p-green)));border-radius:10px;display:flex;align-items:center}
.fill span{color:#fff;font-size:11px;margin-left:8px}.date{font-size:12px;color:rgb(var(--cocoa-400))}
.empty{text-align:center;padding:40px;color:rgb(var(--cocoa-400))}
</style>