<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const tools = [
  { name: '评语生成', route: '/teacher/tools/comment', icon: 'comment' },
  { name: '期末总结', route: '/teacher/tools/summary', icon: 'summary' },
  { name: '教案模板', route: '/teacher/tools/planTemplates', icon: 'plan' },
  { name: '教育论文', route: '/teacher/tools/thesis', icon: 'thesis' },
  { name: '翻译助手', route: '/teacher/office-tools/translate', icon: 'translate' },
  { name: '黑板报', route: '/teacher/office-tools/blackboard', icon: 'blackboard' },
  { name: '演讲稿', route: '/teacher/office-tools/speech', icon: 'speech' },
]
</script>
<template>
  <div class="office-tools"><h2>办公工具</h2>
    <div class="grid"><div v-for="t in tools" :key="t.route" class="card" @click="router.push(t.route)"><div class="name">{{ t.name }}</div></div></div>
  </div>
</template>
<style scoped>
.office-tools{padding:20px} .office-tools h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:15px;font-weight:500}
</style>