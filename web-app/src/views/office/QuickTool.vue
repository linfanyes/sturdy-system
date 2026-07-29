<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const shortcuts = [
  { name: '随机点名', route: '/teacher/tools/picker' },
  { name: '倒计时', route: '/teacher/tools/timer' },
  { name: '课堂计算器', route: '/teacher/tools/calc' },
  { name: '座位表', route: '/teacher/tools/seatMap' },
  { name: '加减分', route: '/teacher/tools/scorePanel' },
  { name: '随机分组', route: '/teacher/tools/grouper' },
  { name: '口算生成', route: '/teacher/tools/math' },
  { name: '汉字笔顺', route: '/teacher/tools/strokeOrder' },
  { name: '乘法口诀', route: '/teacher/tools/multiplicationTable' },
  { name: '单位换算', route: '/teacher/tools/unitConversion' },
]
</script>
<template>
  <div class="quicktool"><h2>快捷工具</h2>
    <div class="grid"><div v-for="s in shortcuts" :key="s.route" class="card" @click="router.push(s.route)"><div class="name">{{ s.name }}</div></div></div>
  </div>
</template>
<style scoped>
.quicktool{padding:20px} .quicktool h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:14px;font-weight:500}
</style>