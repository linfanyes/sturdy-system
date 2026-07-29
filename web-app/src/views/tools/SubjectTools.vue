<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const subjects = [
  { name: '语文', path: 'chinese', icon: 'chinese' },
  { name: '数学', path: 'math', icon: 'math' },
  { name: '英语', path: 'english', icon: 'english' },
]
</script>
<template>
  <div class="subject-tools"><h2>学科工具</h2>
    <div class="grid"><div v-for="s in subjects" :key="s.path" class="card" @click="router.push(s.path)"><div class="name">{{ s.name }}</div></div></div>
  </div>
</template>
<style scoped>
.subject-tools{padding:20px} .subject-tools h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:16px;font-weight:500}
</style>