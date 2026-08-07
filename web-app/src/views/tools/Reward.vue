<script setup lang="ts">
import { ref } from 'vue'
import { listAllStudents, createReward } from '@/api/teacher'
import { toast } from '@/utils/feedback'
const students = ref<any[]>([])
const selected = ref('')
const points = ref('5')
const reason = ref('')
async function loadStudents() {
  try {
    const d = await listAllStudents({ take: 50 })
    students.value = (d?.items || d || []).slice(0, 50)
  } catch (e: any) {
    console.error('[Reward] loadStudents error:', e)
  }
}
async function award() {
  if (!selected.value) return
  try {
    await createReward({
      studentId: selected.value,
      points: parseInt(points.value) || 1,
      reason: reason.value,
    })
    selected.value = ''
    reason.value = ''
    toast.success('已奖励！')
  } catch (e: any) {
    console.error('[Reward] award error:', e)
    toast.error(e?.message || '奖励失败')
  }
}
loadStudents()
</script>
<template>
  <div class="reward"><h2>奖赏</h2>
    <div class="form"><select v-model="selected"><option value="">选择学生</option><option v-for="s in students" :key="s.id" :value="s.id">{{ s.name || s.studentId }}</option></select>
    <input v-model="points" type="number" placeholder="积分" /><input v-model="reason" placeholder="理由" />
    <button class="btn-primary" @click="award">奖励</button></div>
  </div>
</template>
<style scoped>
.reward{padding:20px} .reward h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;flex-wrap:wrap}
.form select,.form input{padding:8px 10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
</style>