<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const name = (route.params.name as string) || ''
const tools = [
  { name: '古诗词助手', route: '/teacher/tools/poetry' },
  { name: '汉字笔顺', route: '/teacher/tools/strokeOrder' },
  { name: '成语词典', route: '/teacher/tools/idiom' },
  { name: '口算生成', route: '/teacher/tools/math' },
  { name: '乘法口诀', route: '/teacher/tools/multiplicationTable' },
  { name: '单位换算', route: '/teacher/tools/unitConversion' },
]
</script>
<template>
  <div class="subject-detail"><h2>{{ name || '学科' }}工具</h2>
    <div class="grid"><div v-for="t in tools" :key="t.route" class="card" @click="router.push(t.route)"><div class="name">{{ t.name }}</div></div></div>
  </div>
</template>
<style scoped>
.subject-detail{padding:20px} .subject-detail h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:18px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:14px;font-weight:500}
</style>