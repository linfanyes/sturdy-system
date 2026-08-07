<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
import { Image as ImageIcon, Download, Sparkles } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'

const prompt = ref('')
const size = ref('1024x1024')
const generating = ref(false)
const imageUrl = ref('')

async function generate() {
  if (!prompt.value.trim()) { toast.warning('请输入图片描述'); return }
  generating.value = true
  imageUrl.value = ''
  try {
    const res = await request.post('/ai/gen-image', { prompt: prompt.value, size: size.value })
    imageUrl.value = res?.url || res?.image || ''
    if (!imageUrl.value) toast.warning('未返回图片地址')
  } catch (e: any) {
    toast.error(e?.message || '生成失败')
  } finally {
    generating.value = false
  }
}

function download() {
  if (!imageUrl.value) return
  const a = document.createElement('a')
  a.href = imageUrl.value
  a.download = `ai-image-${Date.now()}.png`
  a.target = '_blank'
  a.click()
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> 图像创造
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">图片描述</label>
        <textarea v-model="prompt" rows="3" placeholder="如：一只可爱的卡通小猫在草地上放风筝，水彩风格" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm text-cocoa-500">尺寸</label>
        <select v-model="size" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
          <option value="1024x1024">1024×1024（方）</option>
          <option value="1792x1024">1792×1024（横）</option>
          <option value="1024x1792">1024×1792（竖）</option>
        </select>
        <button
          class="ml-auto flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="generating"
          @click="generate"
        >
          <Sparkles class="w-4 h-4" /> {{ generating ? '生成中…' : '生成' }}
        </button>
      </div>
    </div>

    <div v-if="imageUrl || generating" class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-cocoa-500">{{ generating ? '生成中…' : '生成结果' }}</span>
        <button v-if="imageUrl" class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="download">
          <Download class="w-3.5 h-3.5" /> 下载
        </button>
      </div>
      <div v-if="generating" class="aspect-square bg-cream-50 rounded-xl flex items-center justify-center text-cocoa-400">
        <ImageIcon class="w-12 h-12 animate-pulse" />
      </div>
      <img v-else :src="imageUrl" class="max-w-full rounded-xl mx-auto" alt="AI 生成图片" />
    </div>
  </div>
</template>
