<script setup lang="ts">
/**
 * 互动答疑（对齐小程序 pages/ai/ai-interactive.vue）
 * 学生提问 → AI 以符合学生认知水平的口吻辅助回答；
 * 支持复制、存笔记、换个问法重新生成。
 */
import { ref } from 'vue'
import { aiChatSync } from '@/api/teacher'
import request from '@/api/request'
import { toast } from '@/utils/feedback'
import { MessagesSquare, Copy, Save, RefreshCw, Loader2 } from 'lucide-vue-next'

const SUBJECTS = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术']

const form = ref({ grade: '', subject: '', question: '' })
const loading = ref(false)
const result = ref('')
const saving = ref(false)

function buildPrompt() {
  return `你是一位耐心、专业的${form.value.subject || '各学科'}老师，面向${form.value.grade || '小学'}学生答疑。
请用通俗易懂、生动有趣的语言回答以下学生问题，必要时举例说明。

学生问题：${form.value.question}

要求：
1. 回答要符合学生的认知水平
2. 多用生活中的例子帮助理解
3. 语气亲切、鼓励思考
4. 如果问题较复杂，分步骤解答`
}

async function ask() {
  if (!form.value.question.trim()) { toast.warning('请输入学生问题'); return }
  loading.value = true
  result.value = ''
  try {
    const res = await aiChatSync([{ role: 'user', content: buildPrompt() }])
    result.value = res?.content || '（无内容返回）'
  } catch (e: any) {
    toast.error(e?.message || '回答失败，请重试')
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    toast.success('已复制到剪贴板')
  } catch {
    toast.error('复制失败，请手动选择文本')
  }
}

async function saveToNotes() {
  if (!result.value || saving.value) return
  saving.value = true
  try {
    await request.post('notes', {
      title: '答疑：' + (form.value.question || '').slice(0, 30),
      content: result.value,
    })
    toast.success('已存到「笔记」')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <MessagesSquare class="w-6 h-6 text-butter-500" /> 互动答疑
      <span class="text-sm font-normal text-cocoa-400">学生提问，AI 辅助回答</span>
    </h1>

    <!-- 提问表单 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">年级</label>
          <input
            v-model="form.grade"
            placeholder="如：五年级"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学科</label>
          <select
            v-model="form.subject"
            class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 bg-surface focus:outline-none focus:border-butter-400"
          >
            <option value="">选择学科</option>
            <option v-for="s in SUBJECTS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
      <div class="mt-4">
        <label class="text-sm text-cocoa-500">学生问题</label>
        <textarea
          v-model="form.question"
          rows="4"
          placeholder="输入学生提出的问题…"
          class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-y"
        />
      </div>
      <div class="flex justify-end mt-4">
        <button
          class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="loading"
          @click="ask"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <MessagesSquare v-else class="w-4 h-4" />
          {{ loading ? '回答中…' : '获取回答' }}
        </button>
      </div>
    </div>

    <!-- 回答结果 -->
    <div v-if="loading" class="bg-surface rounded-2xl p-6 shadow-softer text-cocoa-400 flex items-center gap-2">
      <Loader2 class="w-4 h-4 animate-spin" /> AI 正在思考…
    </div>

    <div v-else-if="result" class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-cocoa-700">💡 AI 回答</span>
        <div class="flex gap-2">
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="copyResult">
            <Copy class="w-3.5 h-3.5" /> 复制
          </button>
          <button
            class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-60"
            :disabled="saving"
            @click="saveToNotes"
          >
            <Save class="w-3.5 h-3.5" /> {{ saving ? '保存中…' : '存笔记' }}
          </button>
          <button class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sky2-100 text-sky2-600 hover:bg-sky2-200" @click="ask">
            <RefreshCw class="w-3.5 h-3.5" /> 换个问法
          </button>
        </div>
      </div>
      <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ result }}</div>
    </div>
  </div>
</template>
