<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { Save, Bot, Settings } from 'lucide-vue-next'

const tab = ref<'ai' | 'app'>('ai')
const loading = ref(false)
const saving = ref(false)

const aiForm = ref({
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: '',
  temperature: 0.7,
})

const appForm = ref({
  theme: 'light',
  semester: '',
  schoolYear: '',
})

async function load() {
  loading.value = true
  try {
    const [ai, app] = await Promise.all([
      request.get('/config/ai-settings').catch(() => null),
      request.get('/config/app-config').catch(() => null),
    ])
    if (ai) Object.assign(aiForm.value, ai)
    if (app) Object.assign(appForm.value, app)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function saveAi() {
  saving.value = true
  try {
    await request.patch('/config/ai-settings', { ...aiForm.value, temperature: Number(aiForm.value.temperature) })
    alert('AI 配置已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function saveApp() {
  saving.value = true
  try {
    await request.patch('/config/app-config', appForm.value)
    alert('应用配置已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const SEMESTER_OPTIONS = (() => {
  const y = new Date().getFullYear()
  const opts: string[] = []
  for (let i = y - 2; i <= y + 1; i++) { opts.push(`${i}春季`); opts.push(`${i}秋季`) }
  return opts
})()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">配置中心</h1>

    <div class="flex gap-2">
      <button
        :class="['flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'ai' ? 'bg-butter-500 text-white' : 'bg-white text-cocoa-500 hover:bg-cream-100']"
        @click="tab = 'ai'"
      ><Bot class="w-4 h-4" /> AI 配置</button>
      <button
        :class="['flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'app' ? 'bg-butter-500 text-white' : 'bg-white text-cocoa-500 hover:bg-cream-100']"
        @click="tab = 'app'"
      ><Settings class="w-4 h-4" /> 应用配置</button>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>

    <!-- AI 配置 -->
    <div v-else-if="tab === 'ai'" class="bg-white rounded-2xl p-6 shadow-softer max-w-2xl space-y-4">
      <div class="text-xs text-butter-600 bg-butter-100/50 rounded-lg px-3 py-2">
        ⚠️ API Key 属敏感信息，请勿在公共环境泄露；仅保存在你自己的账号下。
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">服务商</label>
          <select v-model="aiForm.provider" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="qwen">通义千问</option>
            <option value="doubao">豆包</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">模型</label>
          <input v-model="aiForm.model" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如 gpt-4o-mini" />
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">API Key</label>
        <input v-model="aiForm.apiKey" type="password" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="sk-..." />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">Base URL（可选）</label>
        <input v-model="aiForm.baseUrl" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="留空使用官方地址" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">温度（0-2）</label>
        <input v-model="aiForm.temperature" type="number" step="0.1" min="0" max="2" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
      </div>
      <div class="flex justify-end">
        <button class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="saveAi">
          <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 应用配置 -->
    <div v-else class="bg-white rounded-2xl p-6 shadow-softer max-w-2xl space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">主题</label>
          <select v-model="appForm.theme" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">当前学期</label>
          <select v-model="appForm.semester" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">未设置</option>
            <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end">
        <button class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="saveApp">
          <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
