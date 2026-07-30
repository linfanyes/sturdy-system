<script setup lang="ts">
/**
 * 评语生成：
 * - 下拉框选择班级（该老师任课的班级）
 * - 下拉框选择班级学生（包含"全部"）
 * - 生成个人或全部学生的评语，自动根据学生成绩、表现生成不同评语
 * - 自动保存到学生信息（student.comment 字段）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { Sparkles, Save, Loader2, Users, FileText } from 'lucide-vue-next'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listClassStudents, aiChatSync, type TeacherStudent } from '@/api/teacher'
import request from '@/api/request'

const { classes } = useClasses()
const classId = ref('')
const students = ref<TeacherStudent[]>([])
const studentId = ref('') // '' = 全部
const commentType = ref('期末评语')
const generating = ref(false)
const saving = ref(false)
const progress = ref({ current: 0, total: 0, name: '' })

/** 生成结果：{ studentId, name, comment }[] */
const results = ref<{ studentId: string; name: string; comment: string }[]>([])

const typeOptions = ['期末评语', '期中评语', '日常评语', '鼓励性评语']

const selectedStudent = computed(() => students.value.find(s => s.id === studentId.value))

async function loadStudents(cid: string) {
  if (!cid) { students.value = []; return }
  try {
    const res = await listClassStudents(cid)
    students.value = Array.isArray(res) ? res : []
  } catch {
    students.value = []
  }
}

onMounted(async () => {
  await loadClasses()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
    await loadStudents(classId.value)
  }
})

watch(classId, async (cid) => {
  studentId.value = ''
  results.value = []
  await loadStudents(cid)
})

/** 拉取某学生的成绩与表现数据，拼成评语生成上下文 */
async function fetchStudentContext(stu: TeacherStudent): Promise<string> {
  const ctx: string[] = []
  try {
    // 成绩数据
    const grades = await request.get('/grades', { params: { classId: classId.value, take: 500 } })
    const gradeList = Array.isArray(grades) ? grades : (grades?.items || [])
    const myGrades = gradeList.filter((g: any) =>
      g.scores?.some((s: any) => s.studentId === stu.id),
    )
    if (myGrades.length) {
      const subjectSummaries = myGrades.map((g: any) => {
        const score = g.scores.find((s: any) => s.studentId === stu.id)?.score
        return `${g.subject}: ${score ?? '缺考'}`
      })
      ctx.push(`最近考试成绩：${subjectSummaries.join('、')}`)
    } else {
      ctx.push('近期暂无考试成绩记录')
    }
  } catch { /* ignore */ }

  try {
    // 行为/表现记录
    const behaviors = await request.get('/behaviors', { params: { classId: classId.value, take: 100 } })
    const behaviorList = Array.isArray(behaviors) ? behaviors : (behaviors?.items || [])
    const myBehaviors = behaviorList.filter((b: any) => b.studentId === stu.id || b.studentName === stu.name)
    if (myBehaviors.length) {
      const behaviorDesc = myBehaviors.slice(-5).map((b: any) => `${b.type || '行为'}: ${b.description || b.content || ''}`).join('；')
      ctx.push(`近期表现记录：${behaviorDesc}`)
    }
  } catch { /* ignore */ }

  try {
    // 奖惩记录
    const rewards = await request.get('/rewards', { params: { classId: classId.value, take: 100 } })
    const rewardList = Array.isArray(rewards) ? rewards : (rewards?.items || [])
    const myRewards = rewardList.filter((r: any) => r.studentId === stu.id || r.studentName === stu.name)
    if (myRewards.length) {
      const rewardDesc = myRewards.slice(-3).map((r: any) => r.title || r.reason || r.type || '奖励').join('、')
      ctx.push(`获奖记录：${rewardDesc}`)
    }
  } catch { /* ignore */ }

  return ctx.join('\n')
}

function buildPrompt(stu: TeacherStudent, context: string): string {
  const cls = classes.value.find(c => c.id === classId.value)
  return `请为${cls?.name || ''}的学生${stu.name}写一段${commentType.value}。
学生信息：${stu.gender === '男' ? '男生' : stu.gender === '女' ? '女生' : ''}，学号${stu.studentNo || '未设置'}。
学生成绩与表现数据：
${context}

要求：
1. 语言亲切、有针对性，既肯定优点又提出改进建议
2. 150字左右
3. 直接输出评语正文，不要加标题或学生姓名前缀`
}

/** 生成单个学生评语 */
async function generateForStudent(stu: TeacherStudent): Promise<string> {
  const context = await fetchStudentContext(stu)
  const prompt = buildPrompt(stu, context)
  const res = await aiChatSync([{ role: 'user', content: prompt }])
  return res?.content || '（生成失败）'
}

async function generate() {
  if (!classId.value) { alert('请先选择班级'); return }
  if (!students.value.length) { alert('该班级暂无学生'); return }

  const targets = studentId.value
    ? students.value.filter(s => s.id === studentId.value)
    : students.value

  generating.value = true
  results.value = []
  progress.value = { current: 0, total: targets.length, name: '' }

  for (const stu of targets) {
    progress.value = { current: progress.value.current + 1, total: targets.length, name: stu.name }
    try {
      const comment = await generateForStudent(stu)
      results.value.push({ studentId: stu.id, name: stu.name, comment })
    } catch (e: any) {
      results.value.push({ studentId: stu.id, name: stu.name, comment: `生成失败：${e?.message || '未知错误'}` })
    }
  }
  generating.value = false
}

/** 保存评语到学生信息（student.comment 字段） */
async function saveAll() {
  if (!results.value.length) return
  saving.value = true
  let ok = 0
  let fail = 0
  for (const r of results.value) {
    try {
      await request.patch(`/students/${r.studentId}`, { comment: r.comment })
      ok++
    } catch {
      fail++
    }
  }
  saving.value = false
  alert(`保存完成：成功 ${ok} 条${fail ? `，失败 ${fail} 条` : ''}`)
}

async function saveOne(r: { studentId: string; name: string; comment: string }) {
  try {
    await request.patch(`/students/${r.studentId}`, { comment: r.comment })
    alert(`已保存${r.name}的评语`)
  } catch (e: any) {
    alert(e?.message || '保存失败')
  }
}

function copyComment(text: string) {
  navigator.clipboard.writeText(text).then(() => alert('已复制')).catch(() => alert('复制失败'))
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> 评语生成
    </h1>

    <!-- 选择区域 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-3 gap-4 items-end">
        <div>
          <label class="text-sm text-cocoa-500">班级</label>
          <select v-model="classId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择班级</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学生</label>
          <select v-model="studentId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">全部学生</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">评语类型</label>
          <select v-model="commentType" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button
          class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="generating || !classId"
          @click="generate"
        >
          <component :is="generating ? Loader2 : Sparkles" class="w-4 h-4" :class="generating ? 'animate-spin' : ''" />
          {{ generating ? `生成中（${progress.current}/${progress.total} ${progress.name}）` : `生成${studentId ? '评语' : '全部评语'}` }}
        </button>
      </div>
    </div>

    <!-- 生成结果 -->
    <div v-if="results.length" class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-cocoa-700">
          <FileText class="w-4 h-4" />
          <span class="text-sm font-medium">生成结果（{{ results.length }} 条）</span>
        </div>
        <button
          class="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30 disabled:opacity-60"
          :disabled="saving"
          @click="saveAll"
        >
          <Save class="w-3.5 h-3.5" /> {{ saving ? '保存中…' : '全部保存到学生档案' }}
        </button>
      </div>
      <div class="space-y-3">
        <div v-for="r in results" :key="r.studentId" class="border border-cream-200 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-cocoa-900 flex items-center gap-1">
              <Users class="w-4 h-4 text-butter-500" /> {{ r.name }}
            </span>
            <div class="flex gap-2">
              <button class="text-xs px-2 py-1 rounded-lg bg-cream-100 text-cocoa-600 hover:bg-cream-200" @click="copyComment(r.comment)">复制</button>
              <button class="text-xs px-2 py-1 rounded-lg bg-mint-100 text-mint-500 hover:bg-mint-300/30" @click="saveOne(r)">保存</button>
            </div>
          </div>
          <div class="text-sm text-cocoa-700 whitespace-pre-wrap leading-relaxed">{{ r.comment }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
