<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useGradeStore } from '../../stores/grade'
import { useRewardStore } from '../../stores/reward'
import { useAIStore } from '../../stores/ai'
import { useUserStore, currentTermStr } from '../../stores/user'
import { useToastStore } from '../../stores/toast'
import type { Student } from '../../types'
import { aiChat, AIError } from '../../utils/aiCall'
import { fmtScore } from '../../utils/format'
import { Sparkles, Copy, Wand2, Check, Users, GraduationCap, Save } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const classStore = useClassStore()
const gradeStore = useGradeStore()
const rewardStore = useRewardStore()
const ai = useAIStore()
const userStore = useUserStore()
const toast = useToastStore()

// ============ 基本信息 ============
const classFilter = ref<string>('all')
const selectedIds = ref<string[]>([])

const studentsInScope = computed(() =>
  classFilter.value === 'all'
    ? classStore.students
    : classStore.studentsOf(classFilter.value),
)
const targets = computed(() => {
  const scope = studentsInScope.value
  if (selectedIds.value.length) return scope.filter((s) => selectedIds.value.includes(s.id))
  return scope
})

function toggleStudent(id: string) {
  if (selectedIds.value.includes(id))
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value.push(id)
}
function selectAllInScope() {
  if (selectedIds.value.length === studentsInScope.value.length) selectedIds.value = []
  else selectedIds.value = studentsInScope.value.map((s) => s.id)
}
function onClassChange() {
  // 切换班级时清空已选学生 (避免跨班选中)
  selectedIds.value = []
}

// ============ 生成 ============
const generating = ref(false)
const resultIds = ref<string[]>([])
const edits = ref<Record<string, string>>({})
const appliedCount = ref(0)

/** 构造单个学生的本学期表现摘要 */
function studentLine(s: Student, idx: number): string {
  const cls = classStore.getClass(s.classId)
  const grades = gradeStore.grades.filter((g) => g.classId === s.classId)
  const parts: string[] = []
  for (const g of grades) {
    const my = g.scores.find((x) => x.studentId === s.id)
    if (!my || my.score == null) continue
    const all = g.scores.map((x) => x.score).filter((v) => v != null) as number[]
    const avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : '-'
    const rank = all.filter((v) => v > (my.score as number)).length + 1
    parts.push(`${g.subject}${fmtScore(my.score)}(班均${avg},第${rank})`)
  }
  const rewards = rewardStore.records.filter((r) => r.studentId === s.id)
  const plus = rewards.filter((r) => r.type === '表扬').length
  const minus = rewards.filter((r) => r.type === '批评').length
  const tags = s.tags.length ? ' 特点:' + s.tags.join('/') : ''
  return (
    `${idx}. id=${s.id} 姓名=${s.name} 班级=${cls?.name || ''}\n` +
    `   成绩:${parts.join(' ') || '暂无'}\n` +
    `   奖惩:表扬${plus}次 批评${minus}次${tags}`
  )
}

function parseJSONArray(text: string): any[] {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  try {
    const v = JSON.parse(t)
    return Array.isArray(v) ? v : []
  } catch {
    /* noop */
  }
  const arr = t.match(/\[[\s\S]*\]/)
  if (arr) {
    try {
      const v = JSON.parse(arr[0])
      return Array.isArray(v) ? v : []
    } catch {
      /* noop */
    }
  }
  return []
}

async function generate() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话」右上角设置中配置 API Key')
    return
  }
  if (!targets.value.length) {
    toast.warning('当前范围没有可选学生')
    return
  }
  generating.value = true
  appliedCount.value = 0
  try {
    const term = userStore.user?.term || currentTermStr()
    const lines = targets.value.map((s, i) => studentLine(s, i + 1)).join('\n')
    const sys =
      '你是一位温柔负责、善于发现孩子闪光点的班主任。请综合学生本学期各科成绩、排名、奖惩与特点，为每位学生撰写一段期末评语，关注其整体表现而非单一学科。'
    const usr =
      `以下是「${term}」学期若干学生的整体表现数据（含各科成绩、班均、排名、奖惩与特点）。请为每位学生写一段评语：\n` +
      `- 语气亲切温暖，以鼓励和赞扬为主，先肯定整体亮点，再温和地提出一个期待；\n` +
      `- 结合其本学期整体表现，具体不空泛，避免千篇一律；\n` +
      `- 每位学生一段，3~5 句话；\n` +
      `- 严格只输出 JSON 数组，不要任何额外说明，格式：\n` +
      `[{"id":"学生ID","comment":"评语内容"}, ...]\n\n` +
      `学生数据：\n${lines}`
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
    })
    const arr = parseJSONArray(text)
    let applied = 0
    const seen = new Set<string>()
    for (const item of arr) {
      const id = item?.id
      const comment = (item?.comment || '').toString().trim()
      if (!id || !comment || seen.has(id)) continue
      const stu = classStore.getStudent(id)
      if (!stu) continue
      classStore.updateStudent(stu.id, { comment })
      seen.add(id)
      applied++
    }
    if (applied === 0) {
      toast.warning('AI 返回内容无法解析，请重试')
    } else {
      // 初始化可编辑草稿
      const map: Record<string, string> = {}
      for (const s of targets.value) map[s.id] = s.comment || ''
      edits.value = map
      resultIds.value = targets.value.map((s) => s.id)
      toast.success(`已为 ${applied} 名学生生成评语，并写入各自档案`)
    }
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function saveOne(id: string) {
  const stu = classStore.getStudent(id)
  if (!stu) return
  classStore.updateStudent(id, { comment: edits.value[id] || '' })
  toast.success(`已保存「${stu.name}」的评语`)
}
function copyOne(id: string) {
  const txt = edits.value[id] || ''
  if (!txt) return
  navigator.clipboard.writeText(txt).then(
    () => toast.success('已复制评语'),
    () => toast.error('复制失败'),
  )
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="✍️"
      title="评语生成"
      description="根据学生特点自动生成个性化评语，省时又贴心"
      gradient="from-mint-100 via-cream-50 to-sky2-100"
      status-text="AI 驱动"
      status-color="bg-mint-100 text-mint-600"
    />
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <!-- 基本信息 -->
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3 flex items-center gap-2">
          <Users :size="18" /> 基本信息
        </h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">班级（不选=全部班级）</label>
            <select
              v-model="classFilter"
              class="input-soft mt-1"
              @change="onClassChange"
            >
              <option value="all">
                全部班级
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
          <div class="flex items-end">
            <button
              class="btn-ghost !py-2 text-xs w-full"
              @click="selectAllInScope"
            >
              <Users :size="12" />
              {{ selectedIds.length === studentsInScope.length && studentsInScope.length ? '取消全选' : '全选本范围' }}
            </button>
          </div>
        </div>

        <!-- 学生多选 -->
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-cocoa-500">
              选择学生（不选具体学生 → 默认为本范围全部学生）
            </label>
            <span class="text-[10px] text-cocoa-400">本范围 {{ studentsInScope.length }} 人，已选 {{ selectedIds.length }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 card-flat !rounded-xl">
            <button
              v-for="s in studentsInScope"
              :key="s.id"
              class="chip border transition text-xs"
              :class="
                selectedIds.includes(s.id)
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleStudent(s.id)"
            >
              {{ s.name }}
            </button>
            <span
              v-if="!studentsInScope.length"
              class="text-xs text-cocoa-400 px-2 py-1"
            >该班级暂无学生</span>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3 flex-wrap">
          <button
            v-if="!generating"
            class="btn-primary flex items-center gap-2 !py-2.5"
            @click="generate"
          >
            <Sparkles :size="16" />
            为 {{ targets.length }} 名学生生成评语
          </button>
          <div class="text-xs text-cocoa-500">
            将基于 AI + 该学期成绩与表现，生成<b class="text-butter-600">偏鼓励赞扬</b>的评语，并自动写入学生档案
          </div>
        </div>
      </div>

      <!-- 结果 -->
      <div
        v-if="resultIds.length"
        class="card-soft p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="title-display text-lg flex items-center gap-2">
            <Check
              :size="18"
              class="text-mint-500"
            /> 已生成 {{ resultIds.length }} 条评语
          </h3>
          <span class="text-xs text-cocoa-400">可直接修改，修改后点击「保存」写入档案</span>
        </div>
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="id in resultIds"
            :key="id"
            class="card-flat !rounded-xl p-3"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="font-medium text-cocoa-900 flex items-center gap-1.5">
                <GraduationCap
                  :size="14"
                  class="text-butter-600"
                />
                {{ classStore.getStudent(id)?.name }}
                <span class="text-[10px] text-cocoa-400">{{ classStore.getClass(classStore.getStudent(id)?.classId || '')?.name }}</span>
              </div>
              <div class="flex gap-1.5">
                <button
                  class="text-[10px] text-cocoa-500 hover:text-butter-600 flex items-center gap-0.5"
                  @click="copyOne(id)"
                >
                  <Copy :size="10" /> 复制
                </button>
                <button
                  class="text-[10px] text-mint-500 hover:underline flex items-center gap-0.5"
                  @click="saveOne(id)"
                >
                  <Save :size="10" /> 保存
                </button>
              </div>
            </div>
            <textarea
              v-model="edits[id]"
              class="input-soft min-h-[90px] text-sm leading-relaxed"
              placeholder="评语内容"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="card-soft p-8 text-center text-cocoa-400"
      >
        <Wand2
          :size="36"
          class="mx-auto mb-2 opacity-40"
        />
        <p class="text-sm">
          选择班级 / 学生后点击「生成评语」
        </p>
        <p class="text-xs mt-1">
          不指定具体学生时，会为所选范围全部学生批量生成
        </p>
      </div>
    </div>

    <!-- 右侧提示 -->
    <div class="space-y-5">
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-2">
          评语小贴士
        </h3>
        <ul class="text-sm text-cocoa-500 space-y-1.5 list-disc pl-5">
          <li>先用「班级管理」录入成绩、奖惩，评语会更贴合</li>
          <li>可只选某个班级、或班级下部分学生</li>
          <li>不选具体学生 → 默认给该范围<b>全部</b>学生生成</li>
          <li>评语生成后自动存入学生档案，可在「学生管理」双击查看与修改</li>
          <li>风格以鼓励、赞扬为主，先肯定再提期待</li>
        </ul>
      </div>
      </div>
    </div>
  </div>
</template>
