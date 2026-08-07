<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const input = ref('')
const result = ref('')
const lang = ref('en')
async function doTranslate() {
  if (!input.value.trim()) return
  try {
    const d = await request.post('/ai/translate', { text: input.value, targetLang: lang.value })
    result.value = d?.result || d?.text || ''
  } catch (e) {
    console.error(e)
  }
}
</script>
<template>
  <div class="translate"><h2>翻译助手</h2>
    <div class="form"><textarea v-model="input" placeholder="输入要翻译的内容..." rows="4"></textarea>
    <div class="row"><select v-model="lang"><option value="en">中→英</option><option value="ja">中→日</option><option value="ko">中→韩</option><option value="zh">英→中</option></select>
    <button class="btn-primary" @click="doTranslate">翻译</button></div></div>
    <div v-if="result" class="result">{{ result }}</div>
  </div>
</template>
<style scoped>
.translate{padding:20px} .translate h2{margin:0 0 16px;font-size:18px}
.form{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.form textarea{padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px;resize:vertical}
.row{display:flex;gap:8px} .row select,.row input{padding:8px 10px;border:1px solid #e0d5c4;border-radius:4px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap}
</style>