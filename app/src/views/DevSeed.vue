<script setup lang="ts">
/**
 * 开发者测试数据生成工具
 *
 * 仅在 dev 模式或 Electron 打包态可见 (router 中通过 import.meta.env.DEV || window.__ELECTRON_PACKAGED__ 判断)。
 * 登录后访问 /#/dev/seed 可一键为「甘珊」老师生成完整测试数据:
 *  - 2 个班级 (15 + 15 = 30 学生)
 *  - 3 次考试 (各科 100/50 分)
 *  - 各科成绩 (基于学生姓名生成稳定但真实的分数)
 *
 * 注意: 数据会写入当前登录用户隔离的 localStorage key (trace.{userId}.*)
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, currentTermStr, normalizeTerm } from '../stores/user'
import { useClassStore } from '../stores/class'
import { useExamStore } from '../stores/exam'
import { useGradeStore } from '../stores/grade'
import { useRewardStore } from '../stores/reward'
import { useSchoolStore } from '../stores/school'
import { useTeacherStore } from '../stores/teacher'
import { useNoteStore } from '../stores/note'
import { useTodoStore } from '../stores/todo'
import { useToastStore } from '../stores/toast'
import { generateAutoSchedule, uid, now, shuffle } from '../utils'
import type { ClassItem, Student, Homework } from '../types'
import { Beaker, RotateCcw, Trash2, Sparkles, Home } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const classStore = useClassStore()
const examStore = useExamStore()
const gradeStore = useGradeStore()
const rewardStore = useRewardStore()
const schoolStore = useSchoolStore()
const teacherStore = useTeacherStore()
const noteStore = useNoteStore()
const todoStore = useTodoStore()
const toast = useToastStore()

const running = ref(false)
const logs = ref<string[]>([])

const summary = ref<{
  classes: number
  students: number
  exams: number
  grades: number
  schedules: number
  notes: number
  todos: number
  homeworks: number
  teachers: number
  notices: number
  resources: number
} | null>(null)

function log(msg: string) {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  if (logs.value.length > 100) logs.value.length = 100
}

/** 简单稳定散列: 字符串 -> 0~1 */
function hash01(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h % 10000) / 10000
}

/** 根据种子 (字符串) 生成指定范围的"真实"分数 */
function genScore(seed: string, min: number, max: number, absentRate = 0.03): number | null {
  const h = hash01(seed)
  if (h < absentRate) return null // 缺考
  // 正态近似: 取两个 hash 平均, 让分数更集中
  const h2 = hash01(seed + 'x')
  const v = (h + h2) / 2
  // 偏正态: 稍微偏向中上 (75 分左右)
  const skewed = Math.pow(v, 0.7)
  const score = min + skewed * (max - min)
  // 满分特例
  if (h > 0.985) return max
  return Math.round(score * 10) / 10
}

const currentUserName = computed(() => userStore.user?.name || '未登录')

/** 30 个常用姓氏 + 名字 (覆盖中小学常见姓名) */
const STUDENT_NAMES = [
  '张梓涵', '王欣怡', '李俊熙', '陈思远', '刘雨桐',
  '黄诗琪', '赵子轩', '吴梓萱', '周天宇', '杨晨曦',
  '徐若曦', '孙梦瑶', '马一鸣', '朱可馨', '胡可怡',
  '郭睿杰', '何雨欣', '高佳怡', '林志豪', '罗心怡',
  '梁雅琪', '宋思涵', '唐浩宇', '韩雪儿', '冯嘉怡',
  '邓子萱', '曹诗韵', '彭俊豪', '曾子墨', '萧雨泽',
]

const SUBJECTS_100 = ['语文', '数学', '英语']
const SUBJECTS_50 = ['科学', '品德', '音乐', '美术', '体育', '综合实践', '信息技术']
const ALL_TEST_SUBJECTS = [...SUBJECTS_100, ...SUBJECTS_50.slice(0, 4)] // 语数英 + 4 个 50 分科目

const GENDER_POOL: Array<'男' | '女'> = ['男', '女']

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickName(usedSet: Set<string>): string {
  const pool = [...STUDENT_NAMES]
  for (const n of pool) {
    if (!usedSet.has(n)) {
      usedSet.add(n)
      return n
    }
  }
  // 不够时拼编号
  let i = 1
  while (usedSet.has(`同学${i}`)) i++
  const n = `同学${i}`
  usedSet.add(n)
  return n
}

async function seedGanShan() {
  if (running.value) return
  if (!userStore.user) {
    toast.warning('请先登录后再运行')
    return
  }
  running.value = true
  logs.value = []
  log(`开始为「${userStore.user.name}」生成测试数据...`)

  try {
    // 日期工具：让生成的待办 / 作业日期基于「今天」，确保在工作台「今日待办 / 今日截止作业」可见
    const todayStr = new Date().toISOString().slice(0, 10)
    const plusDays = (n: number) => {
      const d = new Date()
      d.setDate(d.getDate() + n)
      return d.toISOString().slice(0, 10)
    }

    // 0. 清理当前用户现有数据 (避免重复)
    log('0. 清理当前用户已有班级/学生/考试/成绩/课表/笔记/待办...')
    noteStore.replaceAll({ notes: [] })
    todoStore.replaceAll({ todos: [] })
    const oldClassIds = new Set(classStore.classes.map((c) => c.id))
    for (const c of [...classStore.classes]) {
      schoolStore.clearByClass(c.id)
      gradeStore.clearByClass(c.id)
      examStore.clearByClass(c.id)
      rewardStore.clearByClass(c.id)
      classStore.removeClass(c.id)
    }
    log(`   - 已清理 ${oldClassIds.size} 个旧班级及其全部关联数据`)

    // 1. 创建 2 个班级
    log('1. 创建 2 个班级 (三年级一班 + 三年级二班)...')
    const class1 = classStore.addClass({
      name: '三年级一班',
      grade: '三年级',
      classNo: '一班',
      slogan: '勤奋 乐学 友爱 进取',
      headTeacher: '甘珊',
      teachers: ['甘珊', '王老师', '张老师', '陈老师', '李老师'],
      color: 'butter',
      term: normalizeTerm(currentTermStr()),
      subjects: [...ALL_TEST_SUBJECTS],
    })
    const class2 = classStore.addClass({
      name: '三年级二班',
      grade: '三年级',
      classNo: '二班',
      slogan: '团结 自信 勇敢 创新',
      headTeacher: '甘珊',
      teachers: ['甘珊', '王老师', '张老师', '陈老师', '刘老师'],
      color: 'mint',
      term: normalizeTerm(currentTermStr()),
      subjects: [...ALL_TEST_SUBJECTS],
    })
    log(`   - ✓ ${class1.name} (id: ${class1.id.slice(-6)})`)
    log(`   - ✓ ${class2.name} (id: ${class2.id.slice(-6)})`)

    // 2. 创建 30 个学生 (15+15)
    log('2. 创建 30 个学生 (15 + 15)...')
    const usedNames = new Set<string>()
    const studentsClass1: Student[] = []
    const studentsClass2: Student[] = []

    for (let i = 0; i < 15; i++) {
      const name = pickName(usedNames)
      const s = classStore.addStudent({
        classId: class1.id,
        name,
        gender: GENDER_POOL[i % 2],
        studentNo: `2026010${(i + 1).toString().padStart(2, '0')}`,
        seatNo: i + 1,
        parentName: `${name.charAt(0)}爸`,
        parentPhone: `138${(randInt(10000000, 99999999)).toString()}`,
        note: '',
        tags: [],
      })
      studentsClass1.push(s)
    }
    for (let i = 0; i < 15; i++) {
      const name = pickName(usedNames)
      const s = classStore.addStudent({
        classId: class2.id,
        name,
        gender: GENDER_POOL[(i + 1) % 2],
        studentNo: `2026020${(i + 1).toString().padStart(2, '0')}`,
        seatNo: i + 1,
        parentName: `${name.charAt(0)}妈`,
        parentPhone: `139${(randInt(10000000, 99999999)).toString()}`,
        note: '',
        tags: [],
      })
      studentsClass2.push(s)
    }
    log(`   - ✓ 三年级一班: 15 人`)
    log(`   - ✓ 三年级二班: 15 人`)
    log(`   - ✓ 合计: 30 人`)

    // 3. 自动排课
    log('3. 自动排课 (周一-周五, 8 节/天)...')
    const teacherBySubject: Record<string, string[]> = {
      语文: ['甘珊', '王老师'],
      数学: ['张老师'],
      英语: ['陈老师'],
      科学: ['李老师'],
      品德: ['甘珊'],
      音乐: ['刘老师'],
      美术: ['周老师'],
      体育: ['吴老师'],
    }
    const schedule1 = generateAutoSchedule({
      classId: class1.id,
      headTeacher: '甘珊',
      teacherBySubject,
    })
    const schedule2 = generateAutoSchedule({
      classId: class2.id,
      headTeacher: '甘珊',
      teacherBySubject,
    })
    for (const sc of schedule1) {
      schoolStore.updateSchedule(sc.classId, sc.dayOfWeek, sc.period, sc.subject, '', sc.teacher)
    }
    for (const sc of schedule2) {
      schoolStore.updateSchedule(sc.classId, sc.dayOfWeek, sc.period, sc.subject, '', sc.teacher)
    }
    log(`   - ✓ 三年级一班: ${schedule1.length} 节课`)
    log(`   - ✓ 三年级二班: ${schedule2.length} 节课`)

    // 4. 创建 3 次考试
    log('4. 创建 3 次考试 (第一单元 / 期中 / 第二单元)...')
    const termName = normalizeTerm(currentTermStr())
    // 手动 push (store 没返回 id 时, 我们需要拿到)
    const newExam1 = (() => {
      const e: any = {
        id: uid(),
        term: termName,
        name: '第一单元测试',
        classId: class1.id,
        subjects: [...ALL_TEST_SUBJECTS],
        subjectFullScores: {
          语文: 100,
          数学: 100,
          英语: 100,
          科学: 50,
          品德: 50,
          音乐: 50,
          美术: 50,
        },
        date: '2026-03-15',
        note: '第一单元测验',
        createdAt: now(),
      }
      examStore.exams.unshift(e)
      return e
    })()
    const newExam2 = (() => {
      const e: any = {
        id: uid(),
        term: termName,
        name: '期中考试',
        classId: class1.id,
        subjects: [...ALL_TEST_SUBJECTS],
        subjectFullScores: {
          语文: 100,
          数学: 100,
          英语: 100,
          科学: 50,
          品德: 50,
          音乐: 50,
          美术: 50,
        },
        date: '2026-04-20',
        note: '期中考试',
        createdAt: now(),
      }
      examStore.exams.unshift(e)
      return e
    })()
    const newExam3 = (() => {
      const e: any = {
        id: uid(),
        term: termName,
        name: '第二单元测试',
        classId: class1.id,
        subjects: [...ALL_TEST_SUBJECTS],
        subjectFullScores: {
          语文: 100,
          数学: 100,
          英语: 100,
          科学: 50,
          品德: 50,
          音乐: 50,
          美术: 50,
        },
        date: '2026-05-25',
        note: '第二单元测验',
        createdAt: now(),
      }
      examStore.exams.unshift(e)
      return e
    })()
    log(`   - ✓ 第一单元测试 (3/15)`)
    log(`   - ✓ 期中考试 (4/20)`)
    log(`   - ✓ 第二单元测试 (5/25)`)

    // 5. 录入各科成绩 (三年级一班)
    log('5. 录入三年级一班各科成绩 (15 人 × 7 科 × 3 次考试 = 315 条)...')
    const allStudents = [...studentsClass1, ...studentsClass2]
    const allExams = [newExam1, newExam2, newExam3]
    let gradeCount = 0
    for (const exam of allExams) {
      for (const subject of ALL_TEST_SUBJECTS) {
        const full = SUBJECTS_100.includes(subject) ? 100 : 50
        const stuList = exam.classId === class1.id ? studentsClass1 : studentsClass2
        const scores = stuList.map((s) => ({
          studentId: s.id,
          score: genScore(`${s.id}-${subject}-${exam.name}`, full * 0.4, full, 0.04),
        }))
        gradeStore.addGrade({
          classId: exam.classId,
          subject,
          examName: exam.name,
          examId: exam.id,
          date: exam.date,
          scores,
        })
        gradeCount++
      }
    }
    log(`   - ✓ 已录入 ${gradeCount} 场成绩`)

    // 6. 给三年级二班也录入 1 次考试 (验证班级独立)
    log('6. 给三年级二班录入期中考试数据...')
    const newExam4 = (() => {
      const e: any = {
        id: uid(),
        term: termName,
        name: '期中考试',
        classId: class2.id,
        subjects: [...ALL_TEST_SUBJECTS],
        subjectFullScores: {
          语文: 100,
          数学: 100,
          英语: 100,
          科学: 50,
          品德: 50,
          音乐: 50,
          美术: 50,
        },
        date: '2026-04-21',
        note: '三年级二班期中考试',
        createdAt: now(),
      }
      examStore.exams.unshift(e)
      return e
    })()
    for (const subject of ALL_TEST_SUBJECTS) {
      const full = SUBJECTS_100.includes(subject) ? 100 : 50
      const scores = studentsClass2.map((s) => ({
        studentId: s.id,
        score: genScore(`${s.id}-${subject}-期中考试二班`, full * 0.4, full, 0.04),
      }))
      gradeStore.addGrade({
        classId: class2.id,
        subject,
        examName: '期中考试',
        examId: newExam4.id,
        date: newExam4.date,
        scores,
      })
      gradeCount++
    }
    log(`   - ✓ 三年级二班期中成绩 7 场`)

    // 7. 加点奖惩记录
    log('7. 录入奖惩记录 (随机 8 条)...')
    const rewardTypes: Array<'表扬' | '批评'> = ['表扬', '表扬', '表扬', '批评']
    const rewardReasons = [
      '主动帮助同学', '作业完成优秀', '课堂积极发言', '值日认真负责',
      '拾金不昧', '考试进步明显', '体育比赛获奖', '违反课堂纪律',
    ]
    for (let i = 0; i < 8; i++) {
      const cls = allStudents[i % allStudents.length]
      const tp = rewardTypes[i % rewardTypes.length]
      rewardStore.addRecord({
        classId: cls.classId,
        studentId: cls.id,
        type: tp,
        points: tp === '表扬' ? randInt(1, 5) : -randInt(1, 3),
        reason: rewardReasons[i % rewardReasons.length],
        date: `2026-0${randInt(3, 5)}-${randInt(1, 28).toString().padStart(2, '0')}`,
      })
    }
    log(`   - ✓ 8 条奖惩记录`)

    // 8. 添加 5 个适合教师的资源
    log('8. 添加 5 个教师常用资源...')
    const teacherResources = [
      {
        title: '国家中小学智慧教育平台',
        url: 'https://www.smart.edu.cn',
        category: '官方平台',
        tags: ['官方', '免费', '全学段'],
        description: '教育部官方平台, 提供全学段全学科教材配套视频、课件、试题, 完全免费, 是备课首选。',
      },
      {
        title: '人民教育出版社',
        url: 'https://www.pep.com.cn',
        category: '教学素材',
        tags: ['教材', '人教版', '配套资源'],
        description: '人教版教材的官方配套资源网站, 提供教师用书、教案、PPT 课件、习题答案等。',
      },
      {
        title: '国家数字图书馆',
        url: 'https://www.nlc.cn',
        category: '教学素材',
        tags: ['图书', '文献', '公益'],
        description: '国图数字图书馆, 提供海量电子图书、期刊、古籍、论文等, 教师备课参考利器。',
      },
      {
        title: '中国大学 MOOC (慕课网)',
        url: 'https://www.icourse163.org',
        category: '教学素材',
        tags: ['进修', '网课', '名师'],
        description: '网易高教社合作平台, 提供清华北大等名校教师讲授的免费课程, 适合教师专业进修。',
      },
      {
        title: '央视频',
        url: 'https://www.yangshipin.cn',
        category: '教学素材',
        tags: ['视频', '纪录片', '央视'],
        description: '央广总台出品, 海量高清纪录片、文化节目、新闻视频, 是课堂引入和素材积累的好来源。',
      },
    ]
    for (const r of teacherResources) {
      schoolStore.addResource(r)
    }
    log(`   - ✓ 已添加 5 个教师常用资源`)

    // 9. 添加教学笔记 (4 篇, 覆盖各分类; 1 篇置顶 1 篇收藏)
    log('9. 添加教学笔记 (4 篇)...')
    const noteSeeds: Array<{ title: string; content: string; category: any; pin?: boolean; fav?: boolean }> = [
      {
        title: '《春》公开课教学反思',
        category: '教学反思',
        content:
          '今天讲授朱自清《春》, 用「五感法」引导学生描写春天: 视觉(嫩绿的草)、听觉(鸟鸣)、嗅觉(泥土香)。\n课堂亮点: 让张梓涵用身体动作演绎「偷偷地钻出来」, 全班笑声中理解了拟人的妙处。\n待改进: 后排男生注意力易分散, 下次准备更多互动提问。',
        pin: true,
      },
      {
        title: '「网络安全」主题班会记录',
        category: '班会记录',
        content:
          '时间: 2026-04-12  主持人: 甘珊\n议题: 1) 不泄露个人信息 2) 陌生链接不点 3) 文明用语\n讨论: 王欣怡分享了自己收到「免费皮肤」诈骗链接的经历, 同学们很受触动。\n作业: 回家与家长一起设置手机青少年模式。',
      },
      {
        title: '三年级数学易错题整理',
        category: '学习资料',
        content:
          '1. 周长与面积混淆: 周长用长度单位(厘米), 面积用面积单位(平方厘米)。\n2. 除法余数: 余数必须比除数小。\n3. 时间计算: 跨 noon 的时段要分段算。\n附: 已整理成练习题 10 道, 见班级群文件。',
        fav: true,
      },
      {
        title: '给家长会的温馨提醒',
        category: '其他',
        content: '下周五(2026-05-08)15:00 召开家长会, 地点三年级一班教室。\n请家长提前 5 分钟到场, 带上孩子的作业本。',
      },
    ]
    for (const ns of noteSeeds) {
      const n = noteStore.addNote({ title: ns.title, content: ns.content, category: ns.category })
      if (ns.pin) noteStore.togglePinned(n.id)
      if (ns.fav) noteStore.toggleFavorite(n.id)
    }
    log(`   - ✓ 4 篇笔记 (含 1 置顶 + 1 收藏)`)

    // 10. 添加待办事项 (6 条, 部分已完成, 日期基于今天)
    log('10. 添加待办事项 (6 条)...')
    const todoSeeds: Array<{ title: string; note: string; date: string; done?: boolean }> = [
      { title: '批改期中试卷', note: '三年级一班 + 二班共 30 份, 重点标注进步学生', date: todayStr, done: true },
      { title: '填写期中素质教育报告', note: '每生一句评语, 周五前提交教务', date: todayStr },
      { title: '联系家长沟通课堂表现', note: '近期注意力下降, 约定电话时间', date: todayStr },
      { title: '准备「读书月」活动方案', note: '联合语文组, 设计班级共读清单', date: plusDays(2) },
      { title: '提交本月教学反思', note: '上传至教研平台', date: plusDays(5) },
      { title: '筹备六一文艺汇演节目', note: '三年级一班合唱《虫儿飞》', date: plusDays(8) },
    ]
    for (const ts of todoSeeds) {
      const t = todoStore.addTodo({ title: ts.title, note: ts.note, date: ts.date })
      if (ts.done) todoStore.toggleTodo(t.id)
    }
    log(`   - ✓ 6 条待办 (1 已完成)`)

    // 11. 添加所有科目老师信息 (teacher store, 含任教班级学科)
    log('11. 添加所有科目老师信息 (含任教班级学科)...')
    const teacherPlan: Array<{ name: string; subject: string; position: string }> = [
      { name: '甘珊', subject: '语文', position: '班主任 / 语文教师' },
      { name: '王老师', subject: '语文', position: '语文教师' },
      { name: '张老师', subject: '数学', position: '数学教师' },
      { name: '陈老师', subject: '英语', position: '英语教师' },
      { name: '李老师', subject: '科学', position: '科学教师' },
      { name: '赵老师', subject: '品德', position: '道德与法治教师' },
      { name: '刘老师', subject: '音乐', position: '音乐教师' },
      { name: '周老师', subject: '美术', position: '美术教师' },
      { name: '吴老师', subject: '体育', position: '体育教师' },
      { name: '孙老师', subject: '信息技术', position: '信息技术教师' },
      { name: '郑老师', subject: '综合实践', position: '综合实践教师' },
    ]
    const teacherAvatarPool = ['👩‍🏫', '🧑‍🏫', '👨‍🏫', '🧑‍🎓', '👩‍🎓', '🧑‍💼']
    const teacherMap = new Map<string, { position: string; teachings: { classId: string; subject: string }[]; avatar: string }>()
    teacherPlan.forEach((t, i) => {
      if (!teacherMap.has(t.name)) {
        teacherMap.set(t.name, {
          position: t.position,
          teachings: [],
          avatar: teacherAvatarPool[i % teacherAvatarPool.length],
        })
      }
      teacherMap.get(t.name)!.teachings.push({ classId: class1.id, subject: t.subject })
      teacherMap.get(t.name)!.teachings.push({ classId: class2.id, subject: t.subject })
    })
    let tIdx = 0
    for (const [name, t] of teacherMap) {
      tIdx++
      teacherStore.addTeacher({
        name,
        position: t.position,
        phone: `13${randInt(100000000, 999999999)}`,
        email: `teacher${tIdx}@school.edu.cn`,
        teachings: t.teachings,
        remark: name === '甘珊' ? '三年级一班班主任，关爱学生，注重习惯养成。' : '教学认真负责，深受学生喜爱。',
        joinAt: '2025-09-01',
        avatar: t.avatar,
        isStarred: name === '甘珊',
      })
    }
    log(`   - ✓ ${teacherMap.size} 位老师 (覆盖 ${new Set(teacherPlan.map((t) => t.subject)).size} 个科目)`)

    // 12. 添加班级公告 (含班级维度 + 全校)
    log('12. 添加班级公告...')
    const noticeSeeds: Array<{ classId: string | '全校'; title: string; content: string; pinned?: boolean }> = [
      {
        classId: class1.id,
        title: '关于期中考试安排的通知',
        content:
          '各位家长好：三年级一班期中考试定于 2026-04-20 进行，请提醒孩子合理安排复习时间，注意休息。如有疑问可随时联系班主任。',
        pinned: true,
      },
      {
        classId: class1.id,
        title: '家长会通知',
        content: '定于 2026-05-08 15:00 召开家长会，地点三年级一班教室。请家长提前 5 分钟到场，带上孩子的作业本。',
      },
      {
        classId: class2.id,
        title: '春季运动会报名',
        content: '校春季运动会将于下月举行，请有体育特长的同学向体育委员报名，截止本周五。',
      },
      {
        classId: class2.id,
        title: '读书月活动倡议',
        content: '本月为「读书月」，鼓励每位同学每周至少读一本课外书，月末将评选「阅读之星」。',
        pinned: true,
      },
      {
        classId: '全校',
        title: '国庆假期安全提醒',
        content: '国庆假期为 10 月 1 日—10 月 7 日，请家长做好孩子的安全教育与监护，按时完成假期作业。',
        pinned: true,
      },
    ]
    for (const n of noticeSeeds) {
      schoolStore.addNotice({
        classId: n.classId,
        title: n.title,
        content: n.content,
        pinned: n.pinned || false,
      })
    }
    log(`   - ✓ ${noticeSeeds.length} 条公告 (含班级 + 全校)`)

    // 13. 添加作业管理测试数据 (含 1 条今日截止, 可在作业页 / 今日截止作业查看)
    log('13. 添加作业管理测试数据...')
    const homeworkSeeds: Array<{
      classId: string
      subject: string
      title: string
      content: string
      startOffset: number
      deadlineOffset: number
      status: Homework['status']
    }> = [
      { classId: class1.id, subject: '语文', title: '《春》生字抄写', content: '抄写第1-3段生字各3遍', startOffset: 0, deadlineOffset: 2, status: '待批改' },
      { classId: class1.id, subject: '数学', title: '练习册 P23-25', content: '完成长方形面积计算题', startOffset: 0, deadlineOffset: 3, status: '待批改' },
      { classId: class1.id, subject: '英语', title: 'Unit3 单词背诵', content: '背诵并默写 20 个新单词', startOffset: 0, deadlineOffset: 1, status: '待批改' },
      { classId: class2.id, subject: '语文', title: '阅读笔记一篇', content: '写 200 字《稻草人》读后感', startOffset: 0, deadlineOffset: 0, status: '待批改' },
      { classId: class2.id, subject: '科学', title: '观察日记', content: '连续 3 天记录一种植物生长', startOffset: 0, deadlineOffset: 5, status: '待批改' },
    ]
    for (const h of homeworkSeeds) {
      schoolStore.addHomework({
        classId: h.classId,
        subject: h.subject,
        title: h.title,
        content: h.content,
        startDate: plusDays(h.startOffset),
        deadline: plusDays(h.deadlineOffset),
        status: h.status,
      })
    }
    log(`   - ✓ ${homeworkSeeds.length} 条作业 (含今日截止 1 条)`)

    // 汇总
    summary.value = {
      classes: classStore.classes.length,
      students: classStore.students.length,
      exams: examStore.exams.length,
      grades: gradeStore.grades.length,
      schedules: schoolStore.schedules?.length || 0,
      notes: noteStore.notes.length,
      todos: todoStore.todos.length,
      homeworks: schoolStore.homework.length,
      teachers: teacherStore.teachers.length,
      notices: schoolStore.notices.length,
      resources: schoolStore.resources.length,
    }
    log('='.repeat(40))
    log('🎉 测试数据生成完成!')
    log(`   班级: ${summary.value.classes}`)
    log(`   学生: ${summary.value.students}`)
    log(`   考试: ${summary.value.exams}`)
    log(`   成绩: ${summary.value.grades}`)
    log(`   课表条目: ${summary.value.schedules}`)
    log(`   笔记: ${summary.value.notes}`)
    log(`   待办: ${summary.value.todos}`)
    toast.success('测试数据已生成, 刷新页面查看')
  } catch (e: any) {
    log(`❌ 错误: ${e.message || String(e)}`)
    toast.error('生成失败: ' + (e.message || String(e)))
    console.error(e)
  } finally {
    running.value = false
  }
}

function clearAll() {
  if (!confirm('确定清空当前用户的所有测试数据吗？\n包含：班级/学生/考试/成绩/课表/奖惩/笔记/待办/作业/教师/公告/教学资源，此操作不可撤销!')) return
  for (const c of [...classStore.classes]) {
    schoolStore.clearByClass(c.id)
    gradeStore.clearByClass(c.id)
    examStore.clearByClass(c.id)
    rewardStore.clearByClass(c.id)
    classStore.removeClass(c.id)
  }
  // 清除不按班级隔离的数据（教学资源、公告、作业、笔记、待办、教师）
  schoolStore.replaceAll({ schedules: [], homework: [], notices: [], resources: [], attendance: [], pickerHistory: [] })
  noteStore.replaceAll({ notes: [] })
  todoStore.replaceAll({ todos: [] })
  teacherStore.teachers.splice(0)
  summary.value = null
  log('已清空全部数据（含教学资源、公告、作业、教师、笔记、待办）')
  toast.info('已清空')
}

function refreshPage() {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

function goHome() {
  router.push({ name: 'dashboard' })
}

onMounted(() => {
  summary.value = {
    classes: classStore.classes.length,
    students: classStore.students.length,
    exams: examStore.exams.length,
    grades: gradeStore.grades.length,
    schedules: schoolStore.schedules?.length || 0,
    notes: noteStore.notes.length,
    todos: todoStore.todos.length,
    homeworks: schoolStore.homework.length,
    teachers: teacherStore.teachers.length,
    notices: schoolStore.notices.length,
    resources: schoolStore.resources.length,
  }
  // 支持 URL 参数 ?auto=1 自动运行 (headless / 自动化测试用)
  // 注意: vue-router hash 模式下 ?auto=1 是在 hash 内的 search,
  //       window.location.search 在 hash 模式下通常为空, 所以两个地方都查
  // 安全: 自动运行仅在开发环境生效，防止生产构建被意外触发
  if (import.meta.env.DEV) {
    try {
      const outerSearch = window.location.search
      const hashQuery = window.location.hash.includes('?')
        ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
        : ''
      const params = new URLSearchParams(outerSearch || hashQuery)
      if (params.get('auto') === '1' && userStore.user) {
        setTimeout(() => seedGanShan(), 500)
      }
    } catch (e) {
      /* noop */
    }
  }
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div class="card-soft p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-sky2-300 flex items-center justify-center">
          <Beaker
            :size="22"
            class="text-cocoa-700"
          />
        </div>
        <div>
          <h2 class="title-display text-2xl">
            测试数据生成器
          </h2>
          <p class="text-cocoa-500 text-sm">
            当前用户: <b class="text-cocoa-700">{{ currentUserName }}</b>
            <span v-if="userStore.user?.term"> · 学期: {{ userStore.user.term }}</span>
          </p>
        </div>
      </div>

      <div class="rounded-2xl bg-butter-100 border border-butter-300 p-4 text-sm text-cocoa-700 space-y-1">
        <p><b>功能说明:</b></p>
        <ul class="list-disc list-inside space-y-0.5 text-cocoa-600">
          <li>将为当前登录用户生成完整测试数据：2 班级 + 30 学生 + 4 考试 + ~28 场成绩 + 课表 + 奖惩 + 4 笔记 + 6 待办 + 5 作业 + 11 位教师 + 5 条公告 + 5 个教学资源</li>
          <li>已存在的数据会先被清空, 然后重新生成</li>
          <li>分数基于学生姓名稳定散列生成, 范围 40%~满分, 偶尔有缺考/满分, 分布真实</li>
          <li>考试包括: 三年级一班 3 次 (第一单元/期中/第二单元) + 三年级二班 1 次 (期中)</li>
          <li>待办与作业日期基于「今天」, 生成后可在工作台「今日待办 / 今日截止作业」及作业管理页直接查看</li>
          <li>「清空全部」会清除上述所有数据 (含教学资源、公告、教师、笔记、待办、作业), 不会残留</li>
          <li>所有数据写入 trace.<span class="font-mono">{{ '{userId}' }}</span>.* 命名空间, 不会污染其他账号</li>
        </ul>
      </div>
    </div>

    <div class="card-soft p-6">
      <h3 class="text-base font-semibold text-cocoa-800 mb-3">
        数据统计
      </h3>
      <div
        v-if="summary"
        class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 text-center"
      >
        <div class="p-3 rounded-2xl bg-butter-100 border border-butter-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.classes }}
          </div>
          <div class="text-xs text-cocoa-500">
            班级
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-mint-100 border border-mint-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.students }}
          </div>
          <div class="text-xs text-cocoa-500">
            学生
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-sakura-100 border border-sakura-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.exams }}
          </div>
          <div class="text-xs text-cocoa-500">
            考试
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-sky2-100 border border-sky2-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.grades }}
          </div>
          <div class="text-xs text-cocoa-500">
            成绩
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-cocoa-100 border border-cocoa-200">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.schedules }}
          </div>
          <div class="text-xs text-cocoa-500">
            课表
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-sakura-100 border border-sakura-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.notes }}
          </div>
          <div class="text-xs text-cocoa-500">
            笔记
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-butter-100 border border-butter-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.todos }}
          </div>
          <div class="text-xs text-cocoa-500">
            待办
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-mint-100 border border-mint-300">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.homeworks }}
          </div>
          <div class="text-xs text-cocoa-500">
            作业
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-cream-200 border border-cocoa-200">
          <div class="text-2xl font-bold text-cocoa-800">
            {{ summary.resources }}
          </div>
          <div class="text-xs text-cocoa-500">
            资源
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-3 flex-wrap">
      <button
        class="btn-primary flex items-center gap-2"
        :disabled="running"
        @click="seedGanShan"
      >
        <Sparkles :size="18" />
        {{ running ? '生成中…' : '一键生成测试数据' }}
      </button>
      <button
        class="btn-ghost flex items-center gap-2"
        :disabled="running"
        @click="clearAll"
      >
        <Trash2 :size="18" /> 清空全部
      </button>
      <button
        class="btn-ghost flex items-center gap-2"
        :disabled="running"
        @click="refreshPage"
      >
        <RotateCcw :size="18" /> 刷新页面
      </button>
      <button
        class="btn-ghost flex items-center gap-2"
        :disabled="running"
        @click="goHome"
      >
        <Home :size="18" /> 回到首页
      </button>
    </div>

    <div
      v-if="logs.length"
      class="card-soft p-4"
    >
      <h3 class="text-sm font-semibold text-cocoa-800 mb-2">
        执行日志
      </h3>
      <div class="bg-cocoa-50 rounded-xl p-3 max-h-96 overflow-y-auto font-mono text-xs space-y-0.5 text-cocoa-700">
        <div
          v-for="(line, i) in logs"
          :key="i"
        >
          {{ line }}
        </div>
      </div>
    </div>
  </div>
</template>
