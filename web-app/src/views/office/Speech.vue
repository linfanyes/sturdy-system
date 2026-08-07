<script setup lang="ts">
import { ref } from 'vue'
import { aiSpeech } from '@/api/teacher'
const topic = ref('')
const role = ref('')
const result = ref('')
async function generate() {
  if (!topic.value.trim()) return
  try {
    const d = await aiSpeech({ topic: topic.value, role: role.value })
    result.value = d?.content || d?.result || ''
  } catch (e) {
    console.error(e)
  }
}
</script>
<template>
  <div class="speech"><h2>演讲稿生成</h2>
    <div class="form"><input v-model="topic" placeholder="演讲主题" /><input v-model="role" placeholder="角色（如：班主任）" />
    <button class="btn-primary" @click="generate">生成</button></div>
    <div v-if="result" class="result"><pre>{{ result }}</pre></div>
  </div>
</template>
<style scoped>
.speech{padding:20px} .speech h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.form input{flex:1;min-width:140px;padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px}
.result pre{margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;font-family:inherit}
</style>