<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const topic = ref('')
const content = ref('')
const result = ref('')
async function generate() {
  if (!topic.value.trim()) return
  try { const d = await request.post('/api/ai/blackboard', { topic: topic.value }); result.value = d?.content || d?.result || '' } catch (e) { console.error(e) }
}
</script>
<template>
  <div class="blackboard"><h2>黑板报生成</h2>
    <div class="form"><input v-model="topic" placeholder="输入主题（如：国庆节、运动会）" />
    <button class="btn-primary" @click="generate">生成</button></div>
    <div v-if="result" class="result"><pre>{{ result }}</pre></div>
  </div>
</template>
<style scoped>
.blackboard{padding:20px} .blackboard h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;margin-bottom:16px}
.form input{flex:1;padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px}
.result pre{margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;font-family:inherit}
</style>