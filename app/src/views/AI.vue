<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { useAIStore, DEFAULT_TEXT_MODELS, DEFAULT_VISION_MODELS } from '../stores/ai'
import { AI_DASHSCOPE_BASE_URL } from '../utils/aiBase'
import { useUserStore } from '../stores/user'
import { useClassStore } from '../stores/class'
import { useTeacherStore } from '../stores/teacher'
import { useNoteStore } from '../stores/note'
import { useGradeStore } from '../stores/grade'
import { useExamStore } from '../stores/exam'
import { useRewardStore } from '../stores/reward'
import { useTodoStore } from '../stores/todo'
import { useSchoolStore } from '../stores/school'
import { useToastStore } from '../stores/toast'
import { fmtScore } from '../utils/format'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import MarkdownView from '../components/common/MarkdownView.vue'
import {
  Send,
  Settings as SettingsIcon,
  Plus,
  Copy,
  NotebookPen,
  Trash2,
  Bot,
  User as UserIcon,
  Sparkles,
  Database,
  Square,
  X,
  Save,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Menu,
  Search,
  Lightbulb,
} from 'lucide-vue-next'
import {
  readFile,
  buildUserContent,
  formatSize as fmtSize,
  type AIAttachment,
} from '../utils/aiAttachment'
import { aiChat, AIError, isVisionModel, VISION_MODEL_EXAMPLES } from '../utils/aiCall'
import { parseByAI, type AISchema } from '../utils/aiParse'
import ToolBackButton from '../components/common/ToolBackButton.vue'
import AIModelHint from '../components/common/AIModelHint.vue'
// @ts-ignore - Vite raw import
import SYSTEM_MANUAL_TEXT from '../assets/SYSTEM_MANUAL.md?raw'

const ai = useAIStore()
const user = useUserStore()
const classStore = useClassStore()
const teacherStore = useTeacherStore()
const noteStore = useNoteStore()
const gradeStore = useGradeStore()
const examStore = useExamStore()
const rewardStore = useRewardStore()
const todoStore = useTodoStore()
const schoolStore = useSchoolStore()
const toast = useToastStore()

// Build system context: turn all local data into readable text
function buildContext(): string {
  const lines: string[] = []
  lines.push('## 登录用户')
  lines.push('- 姓名: ' + (user.user?.name || '未登录'))
  if (user.user?.subject) lines.push('- 任教科目: ' + user.user.subject)
  if (user.user?.motto) lines.push('- 教育格言: ' + user.user.motto)
  if (user.teaching.length) {
    lines.push(
      '- 当前任课设置: ' +
        user.teaching
          .map(
            (t) =>
              (classStore.getClass(t.classId)?.name || '') + ' ' + t.subject,
          )
          .filter(Boolean)
          .join('、'),
    )
  }

  lines.push('')
  lines.push('## 班级 (' + classStore.classes.length + ' 个)')
  for (const c of classStore.classes) {
    const stu = classStore.studentsOf(c.id)
    const head = c.headTeacher ? ', 班主任 ' + c.headTeacher : ''
    lines.push('- ' + c.name + ': ' + stu.length + ' 人' + head)
  }

  lines.push('')
  lines.push('## 学生 (' + classStore.students.length + ' 人)')
  for (const s of classStore.students) {
    const cls = classStore.getClass(s.classId)
    lines.push('- ' + s.name + ' (' + (cls?.name || '未分班') + ')')
  }

  lines.push('')
  lines.push('## 教师通讯录 (' + teacherStore.teachers.length + ' 人)')
  for (const t of teacherStore.teachers) {
    const tch = t.teachings
      .map((x) => (classStore.getClass(x.classId)?.name || '') + ' ' + x.subject)
      .filter(Boolean)
      .join('、')
    lines.push(
      '- ' +
        t.name +
        ' (' +
        (t.position || '教师') +
        '): ' +
        (tch || '未配置任教'),
    )
  }

  if (noteStore.notes.length) {
    lines.push('')
    lines.push('## 笔记 (' + noteStore.notes.length + ' 条)')
    for (const n of noteStore.notes.slice(0, 50)) {
      const c = n.content.length > 200 ? n.content.slice(0, 200) + '...' : n.content
      lines.push('- [' + n.title + '] ' + c)
    }
  }

  if (gradeStore.grades.length) {
    lines.push('')
    lines.push('## 成绩 (' + gradeStore.grades.length + ' 场考试)')
    for (const g of gradeStore.grades) {
      const cls = classStore.getClass(g.classId)?.name
      const v = g.scores.filter((x) => x.score != null)
      const avg = v.length
        ? (v.reduce((a, b) => a + (b.score || 0), 0) / v.length).toFixed(1)
        : '-'
      const max = v.length ? fmtScore(Math.max(...v.map((x) => x.score || 0))) : '-'
      const min = v.length ? fmtScore(Math.min(...v.map((x) => x.score || 0))) : '-'
      lines.push(
        '- ' +
          cls +
          ' ' +
          g.subject +
          ' - ' +
          g.examName +
          ' (' +
          g.date +
          '): 参考 ' +
          v.length +
          ' 人, 均分 ' +
          avg +
          ', 最高 ' +
          max +
          ', 最低 ' +
          min,
      )
      // 展开每个学生的分数, 方便查询「某个学生的某次考试成绩」
      const scored = g.scores
        .map((s) => {
          const stu = classStore.getStudent(s.studentId)
          return stu ? { name: stu.name, sid: s.studentId, score: s.score } : null
        })
        .filter((x): x is { name: string; sid: string; score: number | null } => !!x)
      for (const s of scored) {
        lines.push(
          '  · ' +
            s.name +
            ': ' +
            (s.score == null ? '缺考' : fmtScore(s.score) + ' 分'),
        )
      }
    }
  }

  if (examStore.exams.length) {
    lines.push('')
    lines.push('## 考试计划 (' + examStore.exams.length + ')')
    for (const e of examStore.exams.slice(0, 30)) {
      const cls = classStore.getClass(e.classId)?.name
      lines.push(
        '- ' +
          e.term +
          ' ' +
          e.name +
          ' (' +
          cls +
          ' ' +
          e.date +
          ') 科目: ' +
          e.subjects.join('、'),
      )
    }
  }

  if (rewardStore.records.length) {
    lines.push('')
    lines.push('## 奖惩记录 (' + rewardStore.records.length + ' 条)')
    for (const r of rewardStore.records.slice(0, 50)) {
      const stu = classStore.getStudent(r.studentId)?.name
      const cls = classStore.getClass(r.classId)?.name
      lines.push(
        '- ' +
          cls +
          ' ' +
          stu +
          ' ' +
          r.type +
          ' ' +
          (r.points > 0 ? '+' : '') +
          r.points +
          ' (' +
          r.reason +
          ', ' +
          r.date +
          ')',
      )
    }
  }

  if (todoStore.todos.length) {
    lines.push('')
    lines.push('## 待办 (' + todoStore.todos.length + ' 条)')
    for (const t of todoStore.todos.slice(0, 30)) {
      lines.push('- [' + (t.done ? '✓' : ' ') + '] ' + t.title)
    }
  }

  if (schoolStore.homework.length) {
    lines.push('')
    lines.push('## 作业 (' + schoolStore.homework.length + ' 条)')
    for (const h of schoolStore.homework.slice(0, 30)) {
      const cls = classStore.getClass(h.classId)?.name
      lines.push(
        '- [' +
          h.status +
          '] ' +
          cls +
          ' ' +
          h.subject +
          ' - ' +
          h.title +
          ' (截止 ' +
          h.deadline +
          ')',
      )
    }
  }

  if (schoolStore.notices.length) {
    lines.push('')
    lines.push('## 公告 (' + schoolStore.notices.length + ' 条)')
    for (const n of schoolStore.notices.slice(0, 20)) {
      lines.push(
        '- [' + (n.pinned ? '置顶' : '普通') + '] ' + n.title,
      )
    }
  }

  return lines.join('\n')
}

// ============ Settings ============
const settingsOpen = ref(false)
const editSettings = ref({ ...ai.settings })
const settingsTab = ref<'text' | 'vision'>('text')

// 文本模型选择状态
const textModelSelect = ref('qwen3.7-plus')
const textCustomModel = ref('')
// 多模态模型选择状态
const visionModelSelect = ref('qwen3-vl-plus')
const visionCustomModel = ref('')

function syncTextModelField() {
  const m = editSettings.value.textModel || 'qwen3.7-plus'
  if (DEFAULT_TEXT_MODELS.includes(m)) {
    textModelSelect.value = m
    textCustomModel.value = ''
  } else {
    textModelSelect.value = '__custom__'
    textCustomModel.value = m
  }
}
function syncVisionModelField() {
  const m = editSettings.value.visionModel || 'qwen3-vl-plus'
  if (DEFAULT_VISION_MODELS.includes(m)) {
    visionModelSelect.value = m
    visionCustomModel.value = ''
  } else {
    visionModelSelect.value = '__custom__'
    visionCustomModel.value = m
  }
}
function syncModelFields() {
  syncTextModelField()
  syncVisionModelField()
}
function openSettings() {
  editSettings.value = { ...ai.settings }
  syncModelFields()
  settingsTab.value = 'text'
  settingsOpen.value = true
}
function resolveModelFromSelect(
  select: string,
  custom: string,
  defaultName: string,
): string {
  if (select === '__custom__') {
    const name = custom.trim()
    return name || defaultName
  }
  return select || defaultName
}
function saveSettings() {
  const textModel = resolveModelFromSelect(
    textModelSelect.value,
    textCustomModel.value,
    'qwen3.7-plus',
  )
  const visionModel = resolveModelFromSelect(
    visionModelSelect.value,
    visionCustomModel.value,
    'qwen3-vl-plus',
  )
  if (!textModel.trim() || !visionModel.trim()) {
    toast.warning('请选择或填写模型')
    return
  }
  ai.setSettings({
    ...editSettings.value,
    textModel,
    visionModel,
  })
  settingsOpen.value = false
  toast.success('设置已保存')
}
function resetSettings() {
  if (!confirm('恢复默认设置?')) return
  ai.resetSettings()
  editSettings.value = { ...ai.settings }
  syncModelFields()
}

// ============ Chat sessions ============
const showSidebar = ref(true)
const isMobileSidebarOpen = ref(false)
const searchQuery = ref('')
const showQuickCommands = ref(false)

const quickCommands = [
  { label: '分析班级成绩', icon: '📊', prompt: '帮我分析一下最近一次考试的班级成绩情况，包括平均分、最高分、最低分和进步最大的学生' },
  { label: '生成教案', icon: '📚', prompt: '帮我设计一份三年级数学《长方形和正方形的周长》的教案，包含教学目标、教学重点和课堂活动' },
  { label: '写期末评语', icon: '✍️', prompt: '请帮我写一段期末评语，要求积极鼓励，指出优点和改进方向，大约100字左右' },
  { label: '出练习题', icon: '📝', prompt: '请帮我出10道二年级数学口算题，包含加减法，难度适中' },
  { label: '家长沟通', icon: '💬', prompt: '学生小明这次考试成绩下降了，请帮我写一条给家长的沟通消息，既要指出问题又要鼓励' },
  { label: '课堂活动', icon: '🎯', prompt: '推荐几个适合小学三年级的数学课堂互动游戏或活动' },
  { label: '知识点梳理', icon: '💡', prompt: '请帮我梳理一下五年级数学上册的重点知识点，按单元整理' },
  { label: '作业批改', icon: '✓', prompt: '学生作业中有一道题做错了：35 × 24 = 820，请帮我分析错误原因并给出正确解答' },
]

function newChat() {
  ai.createChat('新对话')
  nextTick(scrollToBottom)
}
function selectChat(id: string) {
  ai.setActiveChat(id)
  nextTick(scrollToBottom)
}
function deleteChat(id: string) {
  if (!confirm('确定删除该对话?')) return
  ai.removeChat(id)
}
function useQuickCommand(cmd: string) {
  input.value = cmd
  showQuickCommands.value = false
}
const filteredChats = computed(() => {
  if (!searchQuery.value) return ai.chats
  const q = searchQuery.value.toLowerCase()
  return ai.chats.filter(c => 
    c.title.toLowerCase().includes(q) || 
    c.messages.some(m => m.content.toLowerCase().includes(q))
  )
})

// ============ Message input ============
const input = ref('')
/** 当前输入框的待发送附件 (发送后清空) */
const pendingAttachments = ref<AIAttachment[]>([])
/** 隐藏的 file input ref */
const fileInputEl = ref<HTMLInputElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
const isStreaming = ref(false)
/** 流式输出中的消息 id, 用于 MarkdownView 启用节流 */
const streamingMessageId = ref<string | null>(null)
let abortCtrl: AbortController | null = null

const activeChat = computed(() => ai.getActiveChat())
const messages = computed(() => activeChat.value?.messages || [])

/** 触发文件选择 */
function pickFiles() {
  fileInputEl.value?.click()
}

/** 选中文件后批量读取 */
async function onFilesPicked(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files || !files.length) return
  for (const f of Array.from(files)) {
    try {
      const att = await readFile(f)
      pendingAttachments.value.push(att)
    } catch (err: any) {
      toast.warning(err?.message || '读取文件失败')
    }
  }
  // 允许重复选择同一文件
  target.value = ''
}

function removeAttachment(id: string) {
  pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id)
}

function clearAttachments() {
  pendingAttachments.value = []
}

/** 最后一条 AI 回复 (用于在其后展示「复制/添加到笔记」按钮组) */
const lastAssistantMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return messages.value[i]
  }
  return null
})

/** 最后一条用户消息 (用于智能识别导入) */
const lastUserMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') return messages.value[i]
  }
  return null
})

/** 可导入的数据类型 */
type ImportableType = 'student' | 'grade' | 'schedule' | 'none'

/** 检测消息中可能包含的可导入数据类型 (简单启发式) */
function detectImportableType(text: string): ImportableType {
  const t = text.toLowerCase()
  // 学生名单特征: 姓名、性别、学号、家长、联系方式等
  const studentKeywords = ['姓名', '性别', '学号', '家长', '电话', '学生名单', '学生信息', '班级名单', '学生名册']
  const studentScore = studentKeywords.filter((k) => t.includes(k)).length
  if (studentScore >= 2) return 'student'
  if (t.includes('学生') && /\d+\s*[\u4e00-\u9fa5]{2,4}/.test(text) && studentScore >= 1) return 'student'

  // 成绩特征: 分数、考试、科目、语文、数学、英语、成绩等
  const gradeKeywords = ['语文', '数学', '英语', '成绩', '分数', '考试', '总分', '排名', '平均分']
  const gradeScore = gradeKeywords.filter((k) => t.includes(k)).length
  if (gradeScore >= 2) return 'grade'

  // 课表特征: 星期、节次、课程表、上午、下午等
  const scheduleKeywords = ['星期一', '星期二', '星期三', '星期四', '星期五', '课表', '课程表', '第一节', '第二节', '上午', '下午']
  const scheduleScore = scheduleKeywords.filter((k) => t.includes(k)).length
  if (scheduleScore >= 2) return 'schedule'

  return 'none'
}

/** 检测最后一条用户消息是否包含可导入数据 */
const detectedImportType = computed<ImportableType>(() => {
  if (!lastUserMessage.value || isStreaming.value) return 'none'
  // 只在对话最后一条 assistant 回复后显示 (即对话完整时)
  if (!lastAssistantMessage.value?.content) return 'none'
  const msg = lastUserMessage.value
  const text = msg.content || ''
  // 如果附件有文档, 也尝试检测
  const hasDoc = msg.attachments?.some((a) => a.kind === 'doc')
  if (hasDoc) {
    // 有文档附件时, 尝试从文件名判断
    const docName = msg.attachments?.find((a) => a.kind === 'doc')?.name || ''
    if (docName.includes('学生') || docName.includes('名单')) return 'student'
    if (docName.includes('成绩') || docName.includes('分数')) return 'grade'
    if (docName.includes('课表')) return 'schedule'
  }
  return detectImportableType(text)
})

// ============ 智能导入相关 ============
const importModalOpen = ref(false)
const importType = ref<ImportableType>('none')
const importing = ref(false)
const importRawText = ref('')
const importParsedData = ref<any[]>([])
const importTargetClassId = ref('')
const importExamName = ref('')
const importExamDate = ref('')

/** 导入预览表格列 */
const importPreviewColumns = computed(() => {
  if (importType.value === 'student') {
    return {
      name: '姓名',
      gender: '性别',
      studentNo: '学号',
      parentName: '家长',
      parentPhone: '电话',
    } as Record<string, string>
  }
  if (importType.value === 'grade') {
    return {
      name: '姓名',
      subject: '科目',
      score: '分数',
    } as Record<string, string>
  }
  return {
    dayOfWeek: '星期',
    period: '节次',
    subject: '科目',
    teacher: '老师',
  } as Record<string, string>
})

/** 打开智能导入 */
function openSmartImport(type: ImportableType) {
  importType.value = type
  importParsedData.value = []
  importTargetClassId.value = classStore.classes[0]?.id || ''
  importExamName.value = '单元测试'
  importExamDate.value = new Date().toISOString().slice(0, 10)

  // 收集待解析的文本
  let text = lastUserMessage.value?.content || ''
  // 如果有文档附件, 加上文档内容
  const docAtts = lastUserMessage.value?.attachments?.filter((a) => a.kind === 'doc' && a.text)
  if (docAtts?.length) {
    text += '\n\n' + docAtts.map((a) => `【${a.name}】\n${a.text}`).join('\n\n')
  }
  importRawText.value = text

  importModalOpen.value = true
}

/** AI 解析导入数据 */
async function parseImportData() {
  if (!importRawText.value.trim()) {
    toast.warning('没有可解析的数据')
    return
  }
  importing.value = true
  importParsedData.value = []
  try {
    let schema: AISchema
    if (importType.value === 'student') {
      schema = {
        name: 'students',
        fields: {
          name: '姓名（必填）',
          gender: '性别（男/女）',
          studentNo: '学号',
          parentName: '家长姓名',
          parentPhone: '家长电话',
          note: '备注',
        },
        example: {
          name: '张三',
          gender: '男',
          studentNo: '2024001',
          parentName: '张爸爸',
          parentPhone: '13800138000',
          note: '',
        },
        extra: '姓名是必填字段，其他字段如果原文没有就填空字符串。',
      }
    } else if (importType.value === 'grade') {
      schema = {
        name: 'scores',
        fields: {
          name: '学生姓名（必填）',
          subject: '科目（必填，如：语文、数学、英语）',
          score: '分数（数字，必填）',
        },
        example: {
          name: '张三',
          subject: '语文',
          score: 95,
        },
        extra: '每条记录是一个学生一个科目的成绩。如果一行有多个科目成绩，请拆分成多条记录。分数必须是数字。',
      }
    } else {
      schema = {
        name: 'schedule',
        fields: {
          dayOfWeek: '星期几（1-5，代表周一到周五，必填）',
          period: '第几节课（数字，必填）',
          subject: '科目名称（必填）',
          teacher: '任课老师',
        },
        example: {
          dayOfWeek: 1,
          period: 1,
          subject: '语文',
          teacher: '李老师',
        },
        extra: 'dayOfWeek: 星期一=1, 星期二=2, 星期三=3, 星期四=4, 星期五=5。period从1开始计数。',
      }
    }

    const result = await parseByAI({
      text: importRawText.value,
      schema,
      signal: undefined,
    })

    if (result.ok) {
      importParsedData.value = result.data
      if (result.data.length === 0) {
        toast.warning('未解析出有效数据，请检查文本格式')
      } else {
        toast.success(`成功解析 ${result.data.length} 条数据`)
      }
    } else {
      toast.error(result.error || '解析失败')
    }
  } catch (e: any) {
    toast.error('解析失败：' + (e?.message || '未知错误'))
  } finally {
    importing.value = false
  }
}

/** 确认导入 */
function confirmImport() {
  if (!importParsedData.value.length) {
    toast.warning('没有可导入的数据')
    return
  }
  if (!importTargetClassId.value) {
    toast.warning('请选择目标班级')
    return
  }

  if (importType.value === 'student') {
    let count = 0
    for (const item of importParsedData.value) {
      if (!item.name) continue
      classStore.addStudent({
        classId: importTargetClassId.value,
        name: item.name,
        gender: item.gender === '女' ? '女' : '男',
        studentNo: item.studentNo || '',
        seatNo: 0,
        parentName: item.parentName || '',
        parentPhone: item.parentPhone || '',
        note: item.note || '',
        tags: [],
      })
      count++
    }
    toast.success(`已导入 ${count} 名学生到「${classStore.getClass(importTargetClassId.value)?.name}」`)
  } else if (importType.value === 'grade') {
    // 成绩导入: 按科目分组，使用 mergeGrade
    const examName = importExamName.value || '导入考试'
    const examDate = importExamDate.value
    // 先创建考试
    const cls = classStore.getClass(importTargetClassId.value)
    examStore.addExam({
      name: examName,
      date: examDate,
      classId: importTargetClassId.value,
      term: cls?.term || '',
      subjects: [],
      note: 'AI 对话导入',
    })
    // 按科目分组
    const bySubject = new Map<string, { studentId: string; score: number }[]>()
    for (const item of importParsedData.value) {
      if (!item.name || !item.subject || item.score == null) continue
      const student = classStore.studentsOf(importTargetClassId.value).find(
        (s) => s.name === item.name,
      )
      if (!student) continue
      if (!bySubject.has(item.subject)) {
        bySubject.set(item.subject, [])
      }
      bySubject.get(item.subject)!.push({
        studentId: student.id,
        score: Number(item.score),
      })
    }
    let count = 0
    for (const [subject, scores] of bySubject) {
      gradeStore.mergeGrade({
        classId: importTargetClassId.value,
        examName,
        date: examDate,
        subject,
        scores,
      })
      count += scores.length
    }
    toast.success(`已导入 ${count} 条成绩到「${examName}」`)
  } else if (importType.value === 'schedule') {
    // 课表导入
    const cls = classStore.getClass(importTargetClassId.value)
    if (!cls) return
    // 先清空该班原有课表
    const existing = schoolStore.schedules.filter((s) => s.classId === importTargetClassId.value)
    for (const s of existing) {
      schoolStore.clearScheduleSlot(importTargetClassId.value, s.dayOfWeek, s.period)
    }
    // 导入新课表
    let count = 0
    for (const item of importParsedData.value) {
      if (!item.dayOfWeek || !item.period || !item.subject) continue
      schoolStore.updateSchedule(
        importTargetClassId.value,
        Number(item.dayOfWeek),
        Number(item.period),
        item.subject,
        '',
        item.teacher || '未知',
      )
      count++
    }
    toast.success(`已导入 ${count} 节课到「${cls.name}」课表`)
  }

  importModalOpen.value = false
}

function scrollToBottom() {
  if (!messagesEl.value) return
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

const IMAGE_GEN_KEYWORDS = ['生成图片', '生成图', '画一张', '画个', '画一', '来张图', '画张', '作图', '画图', '绘图', '给我画', '画一幅', '生成照片', '生成图像']

function hasImageGenerationIntent(text: string): boolean {
  const t = text.toLowerCase()
  return IMAGE_GEN_KEYWORDS.some((k) => t.includes(k.toLowerCase()))
}

/** 根据当前输入判断应使用的模型类型 */
function resolveChatModelType(
  text: string,
  attachments: AIAttachment[],
): 'text' | 'vision' {
  const hasImage = attachments.some((a) => a.kind === 'image')
  if (hasImage || hasImageGenerationIntent(text)) return 'vision'
  return 'text'
}

// Send + stream response
async function send() {
  const text = input.value.trim()
  const atts = pendingAttachments.value
  if ((!text && atts.length === 0) || isStreaming.value) return
  let chat = activeChat.value
  if (!chat) {
    chat = ai.createChat('新对话')
  }
  const sendAtts = atts.slice()
  input.value = ''
  pendingAttachments.value = []

  ai.appendMessage(chat.id, {
    role: 'user',
    content: text,
    attachments: sendAtts,
  })
  if (chat.messages.length === 1) {
    const first = text || sendAtts.map((a) => a.name).join(', ')
    ai.renameChatTitle(chat.id, first.slice(0, 30))
  }
  ai.appendMessage(chat.id, { role: 'assistant', content: '' })
  scrollToBottom()

  if (!ai.settings.apiKey) {
    ai.updateLastMessage(
      chat.id,
      '⚠️ 请先在「设置」里填写 API Key 才能开始对话.',
    )
    toast.warning('请先在右上角设置中配置 API Key')
    return
  }

  const modelType = resolveChatModelType(text, sendAtts)

  // 图片附件 + 配置的多模态模型本身不支持视觉 -> 拦截并提示
  const hasImage = sendAtts.some((a) => a.kind === 'image')
  if (hasImage && !isVisionModel(ai.settings.visionModel)) {
    toast.error(
      `多模态模型「${ai.settings.visionModel || '未设置'}」不支持图片识别。\n请到右上角「设置」切换到支持视觉的模型，例如：${VISION_MODEL_EXAMPLES.slice(0, 4).join(' / ')} 等，再上传图片。`,
    )
    input.value = text
    pendingAttachments.value = sendAtts
    if (chat.messages.length >= 2) {
      chat.messages.splice(chat.messages.length - 2, 2)
    }
    return
  }

  isStreaming.value = true
  // 记录当前流式输出的 assistant 消息 id, 供 MarkdownView 启用节流
  const lastMsg = chat.messages[chat.messages.length - 1]
  streamingMessageId.value = lastMsg?.id || null
  abortCtrl = new AbortController()
  try {
    const context = buildContext()
    const systemContent =
      ai.settings.systemPrompt +
      '\n\n# 你可访问的园丁工作台数据 (仅供参考, 请基于此回答):\n' +
      context +
      '\n\n# 园丁工作台 系统使用说明书 (回答用户关于本系统怎么用 / 功能位置 / 操作流程等提问时, 请严格基于此):\n' +
      SYSTEM_MANUAL_TEXT +
      '\n\n# 沟通规则\n- 称呼登录老师为「' +
      (user.user?.name || '老师') +
      '老师」.\n- 回复尽量使用列表/小标题, 便于在手机/电脑上快速浏览.\n- 涉及学生姓名、班级时使用真实数据.\n- 用户问到「这个系统怎么用 / XX功能在哪里 / 如何操作」类问题时, 必须参考上面的「系统使用说明书」回答, 准确给出功能位置 / 操作步骤.'

    // 构建 user 消息 content: 纯文本 -> string, 有图片附件 -> multimodal 数组
    const userContent = buildUserContent(text, sendAtts)

    // 历史消息: 排除刚刚追加的 (user + 空的 assistant) 两条, 仅保留更早的对话
    const historyMessages = chat.messages
      .slice(0, Math.max(0, chat.messages.length - 2))
      .map((m) => {
        if (
          m.role === 'user' &&
          m.attachments &&
          m.attachments.some((a) => a.kind === 'image' && a.dataUrl)
        ) {
          return { role: m.role, content: buildUserContent(m.content, m.attachments) }
        }
        return { role: m.role, content: m.content }
      })

    let acc = ''
    const res = await aiChat({
      messages: [
        { role: 'system', content: systemContent },
        ...historyMessages,
        { role: 'user', content: userContent },
      ],
      modelType,
      temperature: ai.settings.temperature ?? 0.8,
      stream: true,
      signal: abortCtrl.signal,
      onDelta: (delta) => {
        acc += delta
        ai.updateLastMessage(chat.id, acc)
        scrollToBottom()
      },
    })
    if (!res && !acc) {
      ai.updateLastMessage(chat.id, '(无内容返回)')
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      toast.info('已停止')
    } else {
      const msg = e instanceof AIError ? e.message : e?.message || String(e)
      ai.updateLastMessage(chat.id, '❌ 错误: ' + msg)
    }
  } finally {
    isStreaming.value = false
    streamingMessageId.value = null
    abortCtrl = null
    scrollToBottom()
  }
}

function stop() {
  abortCtrl?.abort()
}

function clearInput() {
  input.value = ''
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// ============ Message actions ============
function copyMessage(content: string) {
  if (!content) return
  navigator.clipboard.writeText(content).then(
    () => toast.success('已复制'),
    () => toast.warning('复制失败'),
  )
}
function addToNote(content: string) {
  if (!content) return
  noteStore.addNote({
    title: 'AI 笔记 - ' + new Date().toLocaleString('zh-CN').slice(0, 16),
    content,
    category: '其他',
  })
  toast.success('已添加到笔记')
}
function regenerate() {
  if (!activeChat.value || isStreaming.value) return
  const chat = activeChat.value
  const last = chat.messages[chat.messages.length - 1]
  if (!last || last.role !== 'assistant') return
  chat.messages.pop()
  const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user')
  if (lastUser) {
    input.value = lastUser.content
    send()
  }
}

// First mount: ensure a chat exists
if (!ai.getActiveChat()) {
  ai.createChat('新对话')
}

// 组件卸载时中止未完成的流式请求
onUnmounted(() => {
  if (abortCtrl) abortCtrl.abort()
})
</script>

<template>
  <div class="ai-container bg-gradient-to-br from-butter-50 via-cream-50 to-sakura-50">
    <!-- Left: chat list (desktop) -->
    <aside
      v-if="showSidebar && !isMobileSidebarOpen"
      class="ai-sidebar card-soft p-3 flex flex-col"
    >
      <button
        class="btn-primary w-full mb-3"
        @click="newChat"
      >
        <Plus :size="14" /> 新建对话
      </button>
      
      <div class="relative mb-3">
        <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-cocoa-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索对话..."
          class="w-full pl-7 pr-3 py-2 bg-butter-50 border border-butter-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-butter-400 transition-all"
        />
      </div>
      
      <div class="flex-1 overflow-y-auto space-y-1">
        <button
          v-for="c in filteredChats"
          :key="c.id"
          class="w-full text-left card-flat px-3 py-2 text-sm flex items-center gap-2 group transition-all duration-200"
          :class="
            c.id === ai.activeChatId
              ? 'bg-gradient-to-r from-butter-100 to-sakura-100 ring-1 ring-butter-300 shadow-sm'
              : 'hover:bg-butter-50/80 hover:shadow-sm'
          "
          @click="selectChat(c.id)"
        >
          <MessageSquare
            :size="14"
            class="shrink-0 text-cocoa-500"
          />
          <span class="flex-1 truncate">{{ c.title || '新对话' }}</span>
          <span
            class="opacity-0 group-hover:opacity-100 text-cocoa-300 hover:text-sakura-500"
            @click.stop="deleteChat(c.id)"
          >
            <Trash2 :size="12" />
          </span>
        </button>
        <div
          v-if="!ai.chats.length"
          class="text-xs text-cocoa-400 text-center py-4"
        >
          暂无对话
        </div>
      </div>
      <div class="text-[10px] text-cocoa-400 pt-2 border-t border-cocoa-100/60 mt-2 flex items-center gap-1">
        <Database :size="10" /> 本地数据
      </div>
    </aside>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-black/40 z-40 lg:hidden"
      @click="isMobileSidebarOpen = false"
    />
    <aside
      v-if="isMobileSidebarOpen"
      class="fixed top-0 left-0 bottom-0 w-64 max-w-[80%] z-50 card-soft p-3 flex flex-col lg:hidden rounded-none border-r"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="font-semibold text-cocoa-700 text-sm flex items-center gap-1">
          <MessageSquare :size="14" /> 对话列表
        </div>
        <button
          class="p-1 rounded-full hover:bg-butter-100"
          @click="isMobileSidebarOpen = false"
        >
          <X :size="14" />
        </button>
      </div>
      <button
        class="btn-primary w-full mb-3"
        @click="newChat(); isMobileSidebarOpen = false"
      >
        <Plus :size="14" /> 新建对话
      </button>
      <div class="flex-1 overflow-y-auto space-y-1">
        <button
          v-for="c in ai.chats"
          :key="c.id"
          class="w-full text-left card-flat px-3 py-2 text-sm flex items-center gap-2"
          :class="
            c.id === ai.activeChatId
              ? 'bg-butter-100 ring-1 ring-butter-300'
              : 'hover:bg-butter-50/60'
          "
          @click="selectChat(c.id); isMobileSidebarOpen = false"
        >
          <MessageSquare
            :size="14"
            class="shrink-0 text-cocoa-500"
          />
          <span class="flex-1 truncate">{{ c.title || '新对话' }}</span>
          <span
            class="text-cocoa-300 hover:text-sakura-500"
            @click.stop="deleteChat(c.id)"
          >
            <Trash2 :size="12" />
          </span>
        </button>
        <div
          v-if="!ai.chats.length"
          class="text-xs text-cocoa-400 text-center py-4"
        >
          暂无对话
        </div>
      </div>
      <div class="text-[10px] text-cocoa-400 pt-2 border-t border-cocoa-100/60 mt-2 flex items-center gap-1">
        <Database :size="10" /> 本地数据
      </div>
    </aside>

    <!-- Main chat area -->
    <section class="ai-main card-soft flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-cocoa-100/60 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="p-1.5 rounded-full hover:bg-butter-100 lg:hidden"
            @click="isMobileSidebarOpen = true"
          >
            <Menu :size="16" />
          </button>
          <button
            class="p-1.5 rounded-full hover:bg-butter-100 hidden lg:block"
            @click="showSidebar = !showSidebar"
          >
            <ChevronLeft
              v-if="showSidebar"
              :size="16"
            />
            <ChevronRight
              v-else
              :size="16"
            />
          </button>
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-butter-300 to-sakura-300 flex items-center justify-center shrink-0">
            <Bot
              :size="16"
              class="text-cocoa-900 sm:size-[18px]"
            />
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-cocoa-900 text-sm sm:text-base flex items-center gap-1">
              {{ ai.settings.aiName || '小林子' }}
              <Sparkles
                :size="12"
                class="text-butter-500"
              />
            </div>
            <div class="text-[10px] text-cocoa-500 truncate hidden sm:block">
              文本: {{ ai.settings.textModel || 'qwen3.7-plus' }} / 多模态: {{ ai.settings.visionModel || 'qwen3-vl-plus' }} · 已注入本地数据
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <ToolBackButton class="!mb-0 !hidden sm:!inline-flex" />
          <button
            class="btn-secondary !py-1.5 !px-2.5 text-xs"
            @click="openSettings"
          >
            <SettingsIcon :size="12" />
            <span class="hidden sm:inline"> 设置</span>
          </button>
        </div>
      </header>

      <!-- AI 模型信息提示条 -->
      <div class="px-3 pt-2 sm:px-4">
        <AIModelHint :injected="true" />
      </div>

      <!-- Message stream -->
      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3"
      >
        <EmptyState
          v-if="!messages.length"
          title="开始你的第一次对话"
          desc="问成绩、问班级、问学生、问计划... 我已读取本系统所有数据."
          icon="🤖"
        />
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex gap-2"
          :class="m.role === 'user' ? 'justify-end' : ''"
        >
          <div
            v-if="m.role === 'assistant'"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-butter-300 to-sakura-300 flex items-center justify-center shrink-0"
          >
            <Bot
              :size="14"
              class="text-cocoa-900 sm:size-4"
            />
          </div>
          <div
            class="max-w-[80%] sm:max-w-[78%] rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm break-words"
            :class="
              m.role === 'user'
                ? 'bg-butter-300 text-cocoa-900 rounded-tr-sm'
                : 'card-flat !rounded-2xl rounded-tl-sm text-cocoa-900'
            "
          >
            <!-- 附件预览 (仅 user 消息) -->
            <div
              v-if="m.role === 'user' && m.attachments && m.attachments.length"
              class="mb-2 flex flex-wrap gap-1.5"
            >
              <div
                v-for="a in m.attachments"
                :key="a.id"
                class="flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 text-[11px] text-cocoa-700"
              >
                <img
                  v-if="a.kind === 'image' && a.dataUrl"
                  :src="a.dataUrl"
                  :alt="a.name"
                  class="w-12 h-12 object-cover rounded-md border border-white/40"
                >
                <ImageIcon
                  v-else-if="a.kind === 'image'"
                  :size="14"
                  class="text-cocoa-500"
                />
                <FileText
                  v-else
                  :size="14"
                  class="text-cocoa-500"
                />
                <span
                  v-if="a.kind !== 'image' || !a.dataUrl"
                  class="max-w-[120px] sm:max-w-[140px] truncate"
                >
                  {{ a.name }}
                </span>
                <span
                  v-if="a.kind !== 'image' || !a.dataUrl"
                  class="text-cocoa-400 hidden sm:inline"
                >
                  {{ fmtSize(a.size) }}
                </span>
              </div>
            </div>
            <!-- 用户消息保持纯文本 (用户输入可能有 & < 等字符, 不应被解释为 HTML);
                 AI 消息渲染 Markdown, 流式时启用节流 -->
            <template v-if="m.role === 'user'">
              <span class="whitespace-pre-wrap">{{ m.content }}</span>
            </template>
            <template v-else>
              <MarkdownView
                v-if="m.content"
                :md="m.content"
                :streaming="isStreaming && m.id === streamingMessageId"
              />
              <span
                v-if="!m.content && isStreaming"
                class="inline-block w-2 h-4 bg-butter-500 ml-0.5 align-middle animate-pulse"
              />
            </template>
          </div>
          <div
            v-if="m.role === 'user'"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cocoa-200 flex items-center justify-center shrink-0"
          >
            <UserIcon
              :size="14"
              class="text-cocoa-700 sm:size-4"
            />
          </div>
        </div>

        <!-- Assistant message actions (仅显示在最后一条回答后面) -->
        <div
          v-if="lastAssistantMessage && lastAssistantMessage.content"
          class="flex justify-start gap-1 pl-9 sm:pl-10 flex-wrap"
        >
          <button
            class="text-[10px] text-cocoa-500 hover:text-butter-600 flex items-center gap-0.5 px-1.5 py-0.5"
            @click="copyMessage(lastAssistantMessage.content)"
          >
            <Copy :size="10" /> 复制
          </button>
          <button
            class="text-[10px] text-cocoa-500 hover:text-butter-600 flex items-center gap-0.5 px-1.5 py-0.5"
            @click="addToNote(lastAssistantMessage.content)"
          >
            <NotebookPen :size="10" /> 添加到笔记
          </button>
          <button
            v-if="!isStreaming"
            class="text-[10px] text-cocoa-500 hover:text-butter-600 flex items-center gap-0.5 px-1.5 py-0.5"
            @click="regenerate"
          >
            <RefreshCw :size="10" /> 重新生成
          </button>
        </div>

        <!-- 智能识别导入卡片 -->
        <div
          v-if="detectedImportType !== 'none'"
          class="ml-9 sm:ml-10 mr-4"
        >
          <div class="card-flat !rounded-2xl p-3 border border-butter-200/60 bg-gradient-to-r from-butter-50/50 to-cream-50/50">
            <div class="flex items-start gap-2">
              <div class="w-8 h-8 rounded-xl bg-butter-100 flex items-center justify-center shrink-0">
                <Sparkles
                  :size="16"
                  class="text-butter-600"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-cocoa-800">
                  检测到可导入数据
                </div>
                <div class="text-xs text-cocoa-500 mt-0.5">
                  {{
                    detectedImportType === 'student'
                      ? '识别到学生名单信息，可一键导入到班级'
                      : detectedImportType === 'grade'
                        ? '识别到成绩数据，可一键导入到成绩管理'
                        : '识别到课表信息，可一键导入到班级课表'
                  }}
                </div>
              </div>
              <button
                class="btn-primary !py-1 !px-3 text-xs shrink-0"
                @click="openSmartImport(detectedImportType)"
              >
                <Download :size="12" /> 导入
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t border-cocoa-100/60 p-2.5 sm:p-3">
        <!-- 待发送附件预览 -->
        <div
          v-if="pendingAttachments.length"
          class="mb-2 flex flex-wrap gap-1.5 px-1"
        >
          <div
            v-for="a in pendingAttachments"
            :key="a.id"
            class="relative group flex items-center gap-1.5 card-flat !rounded-xl px-2 py-1 text-[11px] text-cocoa-700"
          >
            <img
              v-if="a.kind === 'image' && a.dataUrl"
              :src="a.dataUrl"
              :alt="a.name"
              class="w-10 h-10 object-cover rounded-md border border-white/60"
            >
            <ImageIcon
              v-else-if="a.kind === 'image'"
              :size="14"
              class="text-cocoa-500"
            />
            <FileText
              v-else
              :size="14"
              class="text-cocoa-500"
            />
            <div class="min-w-0 max-w-[120px] sm:max-w-[160px]">
              <div class="truncate">
                {{ a.name }}
              </div>
              <div class="text-[10px] text-cocoa-400">
                {{ fmtSize(a.size) }}
              </div>
            </div>
            <button
              class="ml-1 -mr-1 -mt-1 -mb-1 w-5 h-5 rounded-full hover:bg-sakura-100 text-cocoa-400 hover:text-sakura-500 flex items-center justify-center"
              :title="'移除 ' + a.name"
              @click="removeAttachment(a.id)"
            >
              <X :size="11" />
            </button>
          </div>
          <button
            class="text-[10px] text-cocoa-400 hover:text-sakura-500 px-2 self-center"
            @click="clearAttachments"
          >
            全部清空
          </button>
        </div>

        <div class="card-flat p-2 flex items-end gap-2">
          <!-- 快捷指令按钮 -->
          <button
            class="p-2 rounded-xl text-cocoa-500 hover:text-butter-600 hover:bg-butter-50 transition-colors shrink-0"
            :title="'快捷指令'"
            :disabled="isStreaming"
            @click="showQuickCommands = !showQuickCommands"
          >
            <Lightbulb :size="16" />
          </button>
          <!-- 附件按钮 (回形针) -->
          <button
            class="p-2 rounded-xl text-cocoa-500 hover:text-butter-600 hover:bg-butter-50 transition-colors shrink-0"
            :title="'上传附件'"
            :disabled="isStreaming"
            @click="pickFiles"
          >
            <Paperclip :size="16" />
          </button>
          <input
            ref="fileInputEl"
            type="file"
            multiple
            class="hidden"
            accept="image/*,text/*,.txt,.md,.csv,.json,.xml,.html,.js,.ts,.vue,.css,.java,.py,.c,.cpp,.go,.rs,.sh,.bat,.sql,.log,.yml,.yaml,.ini,.tex,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt"
            @change="onFilesPicked"
          >
          <textarea
            v-model="input"
            rows="1"
            :placeholder="
              pendingAttachments.length
                ? '补充问题后发送'
                : '提问... (回车发送)'
            "
            class="flex-1 bg-transparent outline-none resize-none text-sm px-2 py-1.5 max-h-32 min-h-[32px]"
            @keydown="onKeyDown"
          />
          <button
            v-if="!isStreaming"
            class="btn-primary !py-1.5 shrink-0"
            :disabled="!input.trim() && !pendingAttachments.length"
            @click="send"
          >
            <Send :size="14" />
            <span class="hidden sm:inline"> 发送</span>
          </button>
          <button
            v-else
            class="btn-secondary !py-1.5 shrink-0"
            @click="stop"
          >
            <Square :size="14" />
          </button>
        </div>
        <div class="text-[10px] text-cocoa-400 mt-1 hidden sm:flex items-center justify-between">
          <span>
            <Paperclip
              :size="10"
              class="inline-block -mt-0.5"
            />
            支持文本/代码、图片，以及文档 (PDF/Word/Excel/PPT)
          </span>
          <span>{{ user.user?.name || '老师' }}老师 · 上下文含本系统全部数据</span>
        </div>
        
        <!-- 快捷指令面板 -->
        <div
          v-if="showQuickCommands"
          class="mt-2 bg-white rounded-2xl shadow-lg border border-butter-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div class="px-3 py-2 bg-gradient-to-r from-butter-100 to-sakura-100 flex items-center gap-2">
            <Lightbulb :size="14" class="text-butter-600" />
            <span class="text-xs font-medium text-cocoa-800">快捷指令</span>
            <button
              class="ml-auto text-cocoa-400 hover:text-cocoa-600"
              @click="showQuickCommands = false"
            >
              <X :size="12" />
            </button>
          </div>
          <div class="p-2 grid grid-cols-2 gap-2">
            <button
              v-for="cmd in quickCommands"
              :key="cmd.label"
              class="text-left p-2 rounded-xl bg-butter-50/60 hover:bg-butter-100 transition-all group"
              @click="useQuickCommand(cmd.prompt)"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ cmd.icon }}</span>
                <span class="text-xs font-medium text-cocoa-700 group-hover:text-butter-600 transition-colors">{{ cmd.label }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Settings modal -->
    <Modal
      :open="settingsOpen"
      title="AI 设置"
      width="560px"
      @close="settingsOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">API Base URL</label>
          <input
            v-model="editSettings.baseUrl"
            class="input-soft mt-1"
            placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
          >
          <div class="text-[10px] text-cocoa-400 mt-0.5">
            支持 OpenAI 兼容协议 (阿里通义千问等). 默认 qwen3.7-plus, 可改为其他.
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">API Key</label>
          <input
            v-model="editSettings.apiKey"
            type="password"
            class="input-soft mt-1"
            placeholder="sk-..."
          >
          <div class="text-[10px] text-cocoa-400 mt-0.5">
            仅保存在本地浏览器 (localStorage), 不会上传。注意：本地为明文存储，请勿在公共/共享设备上保存 Key。
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">AI 名称</label>
            <input
              v-model="editSettings.aiName"
              class="input-soft mt-1"
              placeholder="小林子"
            >
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">温度 (0~1)</label>
            <input
              v-model.number="editSettings.temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              class="input-soft mt-1"
            >
          </div>
        </div>

        <!-- 模型页签 -->
        <div class="flex items-center gap-1 card-flat p-1 w-fit">
          <button
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
            :class="settingsTab === 'text' ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
            @click="settingsTab = 'text'"
          >
            <MessageSquare :size="12" /> 文本模型
          </button>
          <button
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
            :class="settingsTab === 'vision' ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
            @click="settingsTab = 'vision'"
          >
            <ImageIcon :size="12" /> 多模态模型
          </button>
        </div>

        <div v-if="settingsTab === 'text'" class="space-y-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">文本模型</label>
            <select
              v-model="textModelSelect"
              class="input-soft mt-1"
            >
              <option
                v-for="m in DEFAULT_TEXT_MODELS"
                :key="m"
                :value="m"
              >
                {{ m }}
              </option>
              <option value="__custom__">
                + 自定义...
              </option>
            </select>
            <input
              v-if="textModelSelect === '__custom__'"
              v-model="textCustomModel"
              class="input-soft mt-1"
              placeholder="输入自定义模型名"
            >
            <p class="text-[10px] text-cocoa-400 mt-1">
              用于普通文本对话、评语生成、教案、试卷、知识点等纯文本任务。
            </p>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">多模态模型</label>
            <select
              v-model="visionModelSelect"
              class="input-soft mt-1"
            >
              <option
                v-for="m in DEFAULT_VISION_MODELS"
                :key="m"
                :value="m"
              >
                {{ m }}
              </option>
              <option value="__custom__">
                + 自定义...
              </option>
            </select>
            <input
              v-if="visionModelSelect === '__custom__'"
              v-model="visionCustomModel"
              class="input-soft mt-1"
              placeholder="输入自定义模型名"
            >
            <p class="text-[10px] text-cocoa-400 mt-1">
              用于文件解析、图片识别、视频解析、图片/视频生成等需要"看图"的任务。
            </p>
          </div>
        </div>

        <div>
          <label class="text-xs text-cocoa-500 ml-1">系统提示词 (可编辑)</label>
          <textarea
            v-model="editSettings.systemPrompt"
            class="input-soft mt-1 min-h-[120px]"
          />
        </div>
        <div class="flex justify-end">
          <button
            class="btn-secondary !py-1 text-xs"
            @click="resetSettings"
          >
            <Download :size="12" /> 恢复默认
          </button>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="settingsOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveSettings"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>

    <!-- 智能导入弹窗 -->
    <Modal
      :open="importModalOpen"
      :title="
        importType === 'student'
          ? '导入学生名单'
          : importType === 'grade'
            ? '导入成绩'
            : '导入课表'
      "
      width="640px"
      @close="importModalOpen = false"
    >
      <div class="space-y-4">
        <!-- 目标选择 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">
            目标班级
          </label>
          <select
            v-model="importTargetClassId"
            class="input-soft w-full"
          >
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- 成绩导入时额外字段 -->
        <div
          v-if="importType === 'grade'"
          class="grid grid-cols-2 gap-3"
        >
          <div>
            <label class="text-sm text-cocoa-600 block mb-1.5">
              考试名称
            </label>
            <input
              v-model="importExamName"
              class="input-soft w-full"
              placeholder="如：期中测试"
            />
          </div>
          <div>
            <label class="text-sm text-cocoa-600 block mb-1.5">
              考试日期
            </label>
            <input
              v-model="importExamDate"
              type="date"
              class="input-soft w-full"
            />
          </div>
        </div>

        <!-- 解析按钮 -->
        <div class="flex items-center gap-2">
          <button
            class="btn-primary flex-1"
            :disabled="importing || !importRawText.trim()"
            @click="parseImportData"
          >
            <Sparkles
              :size="14"
              :class="importing ? 'animate-spin' : ''"
            />
            {{ importing ? 'AI 解析中...' : 'AI 智能解析' }}
          </button>
        </div>

        <!-- 解析结果预览 -->
        <div
          v-if="importParsedData.length"
          class="space-y-2"
        >
          <div class="text-sm text-cocoa-600 flex items-center justify-between">
            <span>解析结果（{{ importParsedData.length }} 条）</span>
            <span class="text-xs text-cocoa-400">
              确认无误后点击下方导入
            </span>
          </div>
          <div class="max-h-[240px] overflow-y-auto border border-cocoa-100 rounded-xl">
            <table class="w-full text-xs">
              <thead class="bg-cream-50 sticky top-0">
                <tr>
                  <th
                    v-for="(label, key) in importPreviewColumns"
                    :key="key"
                    class="text-left px-2 py-1.5 text-cocoa-500 font-medium border-b border-cocoa-100"
                  >
                    {{ label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, i) in importParsedData.slice(0, 20)"
                  :key="i"
                  class="border-b border-cocoa-50 last:border-0"
                >
                  <td
                    v-for="(label, key) in importPreviewColumns"
                    :key="key"
                    class="px-2 py-1.5 text-cocoa-700"
                  >
                    {{ item[key] ?? '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="importParsedData.length > 20"
              class="text-center py-2 text-xs text-cocoa-400 bg-cream-50"
            >
              仅显示前 20 条，共 {{ importParsedData.length }} 条
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          class="btn-secondary"
          @click="importModalOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          :disabled="!importParsedData.length"
          @click="confirmImport"
        >
          <Download :size="14" /> 确认导入
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.ai-container {
  display: flex;
  gap: 0.75rem;
  /* 桌面: 视口高度 - AppShell 顶栏(~56px) - main 的 pb-12(48px) - 留 16px 余量 = 120px
     使用 dvh 动态视口单位, 避免移动端 URL 栏跳变导致输入框被遮挡 */
  height: calc(100dvh - 140px);
}
.ai-sidebar {
  width: 15rem;
  flex-shrink: 0;
}
.ai-main {
  flex: 1;
  min-width: 0;
}

/* 手机端: 顶栏 + main 的 pb-24(96px) + 底部导航(64px) + 余量 */
@media (max-width: 1023px) {
  .ai-container {
    height: calc(100dvh - 220px);
    min-height: 380px;
  }
}

/* 超小屏优化 */
@media (max-width: 480px) {
  .ai-container {
    gap: 0.5rem;
  }
}
</style>
