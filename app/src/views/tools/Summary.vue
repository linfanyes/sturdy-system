<script setup lang="ts">
// 期末总结生成：基于本地班级 / 学生 / 成绩数据，用 AI 生成期末各类总结（Markdown 格式）
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useGradeStore } from '../../stores/grade'
import { useRewardStore } from '../../stores/reward'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import { copyText, downloadMarkdown, renderMarkdownToHtml, printHtml } from '../../utils/download'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import { Sparkles, Copy, Download, Printer, RefreshCw, FileText } from 'lucide-vue-next'

const classStore = useClassStore()
const gradeStore = useGradeStore()
const rewardStore = useRewardStore()
const ai = useAIStore()
const toast = useToastStore()

const summaryTypes = [
  { value: 'student', label: '学生评语总结' },
  { value: 'class', label: '班级工作总结' },
  { value: 'subject', label: '学科教学总结' },
  { value: 'headTeacher', label: '班主任工作总结' },
]
const styles = ['正式', '温馨', '简洁']
const wordCounts = [300, 500, 800, 1000]

const type = ref('class')
const term = ref('2026春季学期')
const classId = ref('all') // 'all' = 全校
const style = ref('温馨')
const words = ref(500)

const generating = ref(false)
const result = ref('')

const noApiKey = computed(() => !ai.settings.apiKey)
const scopeLabel = computed(() =>
  classId.value === 'all' ? '全校' : classStore.getClass(classId.value)?.name || '所选班级',
)

/** 构造本地数据上下文（注入给 AI） */
function buildContext(): string {
  const targetClasses =
    classId.value === 'all'
      ? classStore.classes
      : classStore.classes.filter((c) => c.id === classId.value)
  if (!targetClasses.length) return '（暂无班级数据）'

  const lines: string[] = []
  lines.push(`学期：${term.value}`)
  lines.push(`范围：${scopeLabel.value}`)
  lines.push(`班级数：${targetClasses.length}`)

  for (const c of targetClasses) {
    const students = classStore.studentsOf(c.id)
    const grades = gradeStore.gradesOfClass(c.id)
    const rewards = rewardStore.records.filter((r) => r.classId === c.id)
    const praiseCount = rewards.filter((r) => r.type === '表扬').length
    const critiqueCount = rewards.filter((r) => r.type === '批评').length

    lines.push('')
    lines.push(`## 班级：${c.name}`)
    lines.push(`- 年级：${c.grade}`)
    lines.push(`- 班主任：${c.headTeacher || '未填写'}`)
    lines.push(`- 班训：${c.slogan || '无'}`)
    lines.push(`- 学生人数：${students.length}`)
    lines.push(`- 任课老师：${c.teachers?.length ? c.teachers.join('、') : '未填写'}`)
    lines.push(`- 本学期奖惩：表扬 ${praiseCount} 次，批评 ${critiqueCount} 次`)

    if (grades.length) {
      lines.push('- 成绩记录：')
      for (const g of grades) {
        const valid = g.scores.map((s) => s.score).filter((v) => v != null) as number[]
        if (!valid.length) continue
        const sum = valid.reduce((a, b) => a + b, 0)
        const avg = (sum / valid.length).toFixed(1)
        const max = Math.max(...valid)
        const min = Math.min(...valid)
        const passRate = ((valid.filter((v) => v >= 60).length / valid.length) * 100).toFixed(0)
        lines.push(
          `  · ${g.subject}（${g.examName} ${g.date}）：均分 ${avg}，最高 ${max}，最低 ${min}，及格率 ${passRate}%`,
        )
      }
    } else {
      lines.push('- 成绩记录：暂无')
    }
  }
  return lines.join('\n')
}

function buildPrompt() {
  const typeLabel = summaryTypes.find((t) => t.value === type.value)?.label || '总结'
  const typeHintMap: Record<string, string> = {
    student: '聚焦学生整体表现与评语汇总，分班级归纳学生群体特点、典型表现与需要关注的学生。',
    class: '聚焦班级本学期的整体建设、班级活动、班风学风、取得的成果与不足。',
    subject: '聚焦学科教学：教学进度、教学方法、学生学习效果、考试成绩分析、教学反思。',
    headTeacher: '聚焦班主任工作：班级管理、学生成长、家校沟通、活动组织、工作反思。',
  }
  const sys =
    `你是一位经验丰富、文笔出色的${typeLabel}撰写者。请根据提供的本地班级 / 学生 / 成绩数据，` +
    `撰写一份风格${style.value}、约 ${words.value} 字的${typeLabel}。${typeHintMap[type.value]}` +
    `输出为 Markdown 格式，结构清晰，可适当使用二级 / 三级标题与列表。不要输出与总结无关的内容。`
  const usr =
    `请根据以下本地数据撰写「${term.value}」${scopeLabel.value}的${typeLabel}：\n\n` +
    `${buildContext()}\n\n` +
    `要求：\n` +
    `- 风格：${style.value}\n` +
    `- 字数：约 ${words.value} 字\n` +
    `- 基于上述数据，避免空话套话\n` +
    `- 输出 Markdown 格式`
  return { sys, usr }
}

async function generate() {
  if (generating.value) return
  if (noApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  generating.value = true
  result.value = ''
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.8,
      stream: false,
    })
    result.value = text || ''
    if (!result.value) toast.warning('AI 未返回内容，请重试')
    else toast.success('总结已生成')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

const exportName = computed(() =>
  `${term.value}-${scopeLabel.value}-期末总结`.replace(/[\\/:*?"<>|]/g, '_'),
)

async function doCopy() {
  if (!result.value) return
  ;(await copyText(result.value)) ? toast.success('已复制全文') : toast.error('复制失败')
}
function doDownload() {
  if (!result.value) return
  downloadMarkdown(exportName.value + '.md', result.value)
  toast.success('Markdown 已下载')
}
function doPrint() {
  if (!result.value) return
  printHtml(`${term.value} 期末总结`, renderMarkdownToHtml(result.value))
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="true" />

    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-cream-50 to-mint-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-mint-400 flex items-center justify-center text-2xl shadow-softer"
        >
          📝
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            期末总结生成
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            基于本地班级、学生、成绩数据，AI 一键生成期末各类总结。支持复制、下载 Markdown、打印。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">总结类型</label>
          <select
            v-model="type"
            class="input-soft mt-1"
          >
            <option
              v-for="t in summaryTypes"
              :key="t.value"
              :value="t.value"
            >
              {{ t.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">学期</label>
          <input
            v-model="term"
            class="input-soft mt-1"
            placeholder="如 2026春季学期"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班级范围</label>
          <select
            v-model="classId"
            class="input-soft mt-1"
          >
            <option value="all">
              全校
            </option>
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">风格</label>
          <select
            v-model="style"
            class="input-soft mt-1"
          >
            <option
              v-for="s in styles"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">字数</label>
          <select
            v-model.number="words"
            class="input-soft mt-1"
          >
            <option
              v-for="w in wordCounts"
              :key="w"
              :value="w"
            >
              {{ w }} 字
            </option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
            :disabled="generating || noApiKey"
            @click="generate"
          >
            <Sparkles v-if="!generating" :size="16" />
            <RefreshCw v-else :size="16" class="animate-spin" />
            {{ generating ? '生成中...' : '生成总结' }}
          </button>
        </div>
      </div>
      <div
        v-if="noApiKey"
        class="mt-3 text-xs text-sakura-500"
      >
        请先在「AI 对话 → 设置」中配置 API Key
      </div>
    </section>

    <section class="card-soft p-5">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 class="title-display text-lg flex items-center gap-2">
          <FileText
            :size="16"
            class="text-mint-500"
          /> 总结结果
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            class="btn-secondary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doCopy"
          >
            <Copy :size="12" /> 复制
          </button>
          <button
            class="btn-secondary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doDownload"
          >
            <Download :size="12" /> 下载
          </button>
          <button
            class="btn-primary !py-1.5 !px-3 text-xs"
            :disabled="!result"
            @click="doPrint"
          >
            <Printer :size="12" /> 打印
          </button>
        </div>
      </div>
      <MarkdownView
        v-if="result"
        class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed overflow-y-auto max-h-[70vh]"
        :md="result"
      />
      <div
        v-else-if="generating"
        class="min-h-[300px] flex items-center justify-center text-cocoa-400 text-sm"
      >
        <RefreshCw
          :size="20"
          class="animate-spin mr-2"
        /> 正在生成总结...
      </div>
      <div
        v-else
        class="min-h-[300px] flex flex-col items-center justify-center text-cocoa-400"
      >
        <FileText
          :size="40"
          class="mb-2 opacity-40"
        />
        <p class="text-sm">
          选择总结类型与范围后点击「生成总结」
        </p>
        <p class="text-xs mt-1">
          AI 将基于本地班级 / 学生 / 成绩数据自动撰写
        </p>
      </div>
    </section>
  </div>
</template>
