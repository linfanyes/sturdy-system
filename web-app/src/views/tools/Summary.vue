<script setup lang="ts">
/**
 * 期末总结生成：
 * - 去掉年级（班级中已包含年级信息）
 * - 班级改为下拉框（该老师任课的班级）
 */
import { ref, computed, onMounted } from 'vue'
import { Sparkles, Save, Copy, FileText, Loader2, Download } from 'lucide-vue-next'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { aiChatSync } from '@/api/teacher'
import { downloadText } from '@/utils/download'

const { classes } = useClasses()

const form = ref({
  type: '班级总结',
  classId: '',
  keypoints: '',
})
const result = ref('')
const generating = ref(false)

const typeOptions = ['班级总结', '学科总结', '学生评语', '班主任工作总结']

const selectedClass = computed(() => classes.value.find(c => c.id === form.value.classId))

onMounted(async () => {
  await loadClasses()
  if (classes.value[0]) form.value.classId = classes.value[0].id
})

function buildPrompt(): string {
  const cls = selectedClass.value
  return `请写一份${cls?.name || ''}的${form.value.type || '班级总结'}。要点/亮点：${form.value.keypoints || ''}。要求结构完整、内容充实、语言得体，800字左右。`
}

async function generate() {
  const prompt = buildPrompt()
  if (!form.value.classId) { alert('请选择班级'); return }
  generating.value = true
  result.value = ''
  try {
    const res = await aiChatSync([{ role: 'user', content: prompt }])
    result.value = res?.content || '（无内容返回）'
  } catch (e: any) {
    result.value = `生成失败：${e?.message || '未知错误'}`
  } finally {
    generating.value = false
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value)
    alert('已复制')
  } catch {
    alert('复制失败，请手动选择')
  }
}

/** 下载期末总结为 Word 文档（.doc） */
function downloadResult() {
  if (!result.value) return
  const cls = selectedClass.value
  const name = `${cls?.name || ''}${form.value.type || '总结'}`.trim() || '期末总结'
  downloadText(result.value, name, 'doc')
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> 期末总结生成
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-cocoa-500">总结类型</label>
            <select v-model="form.type" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-cocoa-500">班级</label>
            <select v-model="form.classId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
              <option value="">请选择班级</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">要点/亮点</label>
          <textarea v-model="form.keypoints" rows="4" placeholder="如：本学期成绩提升明显、运动会第一名等" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button
          class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="generating || !form.classId"
          @click="generate"
        >
          <component :is="generating ? Loader2 : Sparkles" class="w-4 h-4" :class="generating ? 'animate-spin' : ''" />
          {{ generating ? '生成中…' : '生成' }}
        </button>
      </div>
    </div>

    <div v-if="result || generating" class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-cocoa-700">
          <FileText class="w-4 h-4" />
          <span class="text-sm font-medium">生成结果</span>
          <span v-if="generating" class="text-xs text-butter-500 animate-pulse">生成中…</span>
        </div>
        <div v-if="result && !generating" class="flex gap-2">
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="copyResult">
            <Copy class="w-3.5 h-3.5" /> 复制
          </button>
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky2-100 text-sky2-600 hover:bg-sky2-200" @click="downloadResult">
            <Download class="w-3.5 h-3.5" /> 下载
          </button>
        </div>
      </div>
      <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ result }}</div>
    </div>
  </div>
</template>
