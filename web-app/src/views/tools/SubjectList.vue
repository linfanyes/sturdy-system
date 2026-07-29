<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const subjects = [
  { name: '语文', path: '/teacher/subject-tools/chinese' },
  { name: '数学', path: '/teacher/subject-tools/math' },
  { name: '英语', path: '/teacher/subject-tools/english' },
  { name: '科学', path: '/teacher/subject-tools/science' },
]
</script>
<template>
  <div class="subject-list"><h2>学科列表</h2>
    <div class="list"><div v-for="s in subjects" :key="s.path" class="item" @click="router.push(s.path)"><span>{{ s.name }}</span><span class="arrow">&rsaquo;</span></div></div>
  </div>
</template>
<style scoped>
.subject-list{padding:20px} .subject-list h2{margin:0 0 16px;font-size:18px}
.list{display:flex;flex-direction:column;gap:6px}
.item{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:12px 14px;cursor:pointer;transition:border-color .2s}
.item:hover{border-color:#e6a23c} .arrow{font-size:18px;color:#999}
</style>