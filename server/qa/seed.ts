/**
 * QA 测试数据集（与 qa/TEST_DATA.md 一致）
 * 规模：10 学校 × 20 教师 × 10 班级 × 50 学生 × 10 次考试（含多类成绩分布场景）
 *
 * 账号约定（供用例引用）：
 * - 超管：admin / admin（QA 环境默认）
 * - 校管：qaadmin01~10 / QaAdmin@123（第 i 所学校）
 * - 教师：qat{i:02d}t{j:02d} / QaTeach@123（第 i 校第 j 位，j=01 为该班班主任）
 * - 家长：学号登录，口令 123456（学号规则 S{i:02d}C{k:02d}N{n:02d}）
 */
import type { DataSource } from 'typeorm'
import { http } from './harness'

/** 与 src/im/parent-im.util.ts 保持一致的家长 IM 账号派生算法 */
function parentImUserId(p: { studentId: string; relation: string; parentName: string }): string {
  const raw = `${p.studentId}|${p.relation}|${p.parentName}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) >>> 0
  return 'p_' + h.toString(36)
}

export const SUPER_USER = 'admin'
export const SUPER_PASS = 'admin'
export const ADMIN_PASS = 'QaAdmin@123'
export const TEACHER_PASS = 'QaTeach@123'
export const PARENT_PASS = '123456'
export const SCHOOL_COUNT = 10
export const TEACHERS_PER_SCHOOL = 30
export const CLASSES_PER_SCHOOL = 10
export const STUDENTS_PER_CLASS = 60
export const EXAMS_PER_CLASS = 10
export const SUBJECTS = ['语文', '数学', '英语', '科学', '道法', '体育']

export const adminUser = (i: number) => `qaadmin${String(i).padStart(2, '0')}`
export const teacherUser = (i: number, j: number) => `qat${String(i).padStart(2, '0')}t${String(j).padStart(2, '0')}`
export const studentNo = (i: number, k: number, n: number) =>
  `S${String(i).padStart(2, '0')}C${String(k).padStart(2, '0')}N${String(n).padStart(2, '0')}`

/** 确定性伪随机（LCG），保证数据集可复现 */
export function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
/** Box-Muller 正态分布 */
function normal(rng: () => number, mean: number, sd: number) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return mean + sd * z
}

/** 10 次考试的成绩场景（覆盖不同分布形态） */
const EXAM_SCENARIOS: Array<{ name: string; term: string; mean: number; sd: number; absentees: number }> = [
  { name: '第一次月考', term: '2025-2026学年上学期', mean: 75, sd: 12, absentees: 0 },   // 常规正态
  { name: '期中考试', term: '2025-2026学年上学期', mean: 78, sd: 11, absentees: 0 },     // 整体进步
  { name: '第二次月考', term: '2025-2026学年上学期', mean: 72, sd: 13, absentees: 0 },   // 整体退步
  { name: '期末考试', term: '2025-2026学年上学期', mean: 80, sd: 10, absentees: 0 },     // 复习后回升
  { name: '第一单元测验', term: '2025-2026学年下学期', mean: 85, sd: 7, absentees: 0 },   // 高分段
  { name: '第二单元测验', term: '2025-2026学年下学期', mean: 65, sd: 14, absentees: 0 },  // 低分段（难点单元）
  { name: '模拟测试', term: '2025-2026学年下学期', mean: 74, sd: 20, absentees: 0 },     // 大离散（两极分化）
  { name: '课堂小测', term: '2025-2026学年下学期', mean: 82, sd: 9, absentees: 0 },      // 随堂小测
  { name: '期中联考', term: '2025-2026学年下学期', mean: 76, sd: 12, absentees: 2 },     // 含缺考
  { name: '期末统考', term: '2025-2026学年下学期', mean: 79, sd: 11, absentees: 1 },     // 含缺考 + 进步
]

export interface SeedResult {
  schools: Array<{ id: string; name: string; code: string; adminToken: string; classIds: string[]; headTeacherIds: string[]; headTeacherTokens: string[] }>
  studentCount: number
  examCount: number
  gradeRowCount: number
  noticeCount: number
  messageCount: number
  noteCount: number
  notificationCount: number
  durationMs: number
}

export async function seedDataset(baseUrl: string, ds: DataSource): Promise<SeedResult> {
  const t0 = Date.now()

  // ---------- 1) 超管登录 ----------
  const su = await http('POST', `${baseUrl}/auth/unified-login`, { body: { username: SUPER_USER, password: SUPER_PASS } })
  if (su.status >= 300) throw new Error(`超管登录失败: ${su.status} ${JSON.stringify(su.body)}`)
  const superToken = su.body.token as string

  // 需要直接写库的仓储
  const studentRepo = ds.getRepository('students')
  const examRepo = ds.getRepository('exams')
  const gradeRepo = ds.getRepository('grades')
  const noticeRepo = ds.getRepository('notices')
  const homeworkRepo = ds.getRepository('homework')
  const attendanceRepo = ds.getRepository('attendances')
  const messageRepo = ds.getRepository('messages')
  const noteRepo = ds.getRepository('notes')
  const notificationRepo = ds.getRepository('notifications')

  // 预计算家长口令哈希（同一口令复用同一哈希，bcrypt 盐内嵌于哈希，验证不受影响）
  const bcrypt = require('bcrypt')
  const parentHash = bcrypt.hashSync(PARENT_PASS, 4)

  const schools: SeedResult['schools'] = []
  let studentCount = 0
  let examCount = 0
  let gradeRowCount = 0
  let firstAdminId = ''

  for (let i = 1; i <= SCHOOL_COUNT; i++) {
    // ---------- 2) 学校 ----------
    const schoolName = `测试第${i}学校`
    const sch = await http('POST', `${baseUrl}/admin/schools`, { token: superToken, body: { name: schoolName, prefix: 'QA' } })
    if (sch.status >= 300) throw new Error(`创建学校失败(${schoolName}): ${sch.status} ${JSON.stringify(sch.body)}`)
    const schoolId = sch.body.id as string

    // ---------- 3) 校管 ----------
    const au = adminUser(i)
    const adm = await http('POST', `${baseUrl}/admin/school-admins`, {
      token: superToken,
      body: { username: au, password: ADMIN_PASS, name: `校管${i}`, schoolId },
    })
    if (adm.status >= 300) throw new Error(`创建校管失败(${au}): ${adm.status} ${JSON.stringify(adm.body)}`)
    const adminLogin = await http('POST', `${baseUrl}/auth/unified-login`, { body: { username: au, password: ADMIN_PASS } })
    if (adminLogin.status >= 300) throw new Error(`校管登录失败(${au}): ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`)
    const adminToken = adminLogin.body.token as string
    const adminId = adminLogin.body.user?.id || adminLogin.body.id || ''
    if (!adminId) throw new Error(`校管ID缺失(${au})`)
    // 记录第一所学校的 admin 信息，供后续用例断言
    if (i === 1) firstAdminId = adminId

    // ---------- 4) 教师 ×20（批量接口） ----------
    const teachers = Array.from({ length: TEACHERS_PER_SCHOOL }, (_, j0) => {
      const j = j0 + 1
      return {
        name: `教师${i}-${j}`,
        username: teacherUser(i, j),
        password: TEACHER_PASS,
        subject: SUBJECTS[j0 % SUBJECTS.length],
      }
    })
    const tch = await http('POST', `${baseUrl}/school-admin/teachers/batch`, { token: adminToken, body: { teachers } })
    if (tch.status >= 300) throw new Error(`批量创建教师失败(校${i}): ${tch.status} ${JSON.stringify(tch.body).slice(0, 200)}`)

    // 教师账号 → id 映射（批量响应含创建结果）
    const createdTeachers: Array<{ id: string; username: string }> = Array.isArray(tch.body?.items)
      ? tch.body.items
      : Array.isArray(tch.body?.teachers) ? tch.body.teachers : Array.isArray(tch.body) ? tch.body : []
    const teacherIdByUser = new Map<string, string>()
    for (const t of createdTeachers) if (t?.username && t?.id) teacherIdByUser.set(t.username, t.id)
    // 兜底：若响应未带 id，直接查库
    if (teacherIdByUser.size < TEACHERS_PER_SCHOOL) {
      const rows: any[] = await ds.getRepository('users').find({ where: { schoolId } })
      for (const r of rows) if (r.username) teacherIdByUser.set(r.username, r.id)
    }

    // ---------- 5) 班级 ×10（一年级~五年级 × 2 班） ----------
    const classIds: string[] = []
    const headTeacherIds: string[] = []
    const headTeacherTokens: string[] = []
    for (let k = 1; k <= CLASSES_PER_SCHOOL; k++) {
      const gradeIdx = Math.ceil(k / 2) // 1..5
      const grade = ['一年级', '二年级', '三年级', '四年级', '五年级'][gradeIdx - 1]
      const classNo = `${gradeIdx}0${(k % 2) + 1}`
      const className = `${grade}(${(k % 2) + 1})班`
      // 班主任 = 该校第 k 位教师
      const headUser = teacherUser(i, k)
      const headId = teacherIdByUser.get(headUser) || ''
      const cls = await http('POST', `${baseUrl}/school-admin/classes`, {
        token: adminToken,
        body: { name: className, grade, classNo, headTeacher: `教师${i}-${k}`, teacherId: headId, headTeacherId: headId },
      })
      if (cls.status >= 300) throw new Error(`创建班级失败(${className}): ${cls.status} ${JSON.stringify(cls.body)}`)
      classIds.push(cls.body.id)
      headTeacherIds.push(headId)
    }

    // 班主任登录（取前 2 个班级班主任供功能用例使用，其余仅数据存在）
    for (let k = 1; k <= 2; k++) {
      const u = teacherUser(i, k)
      const lg = await http('POST', `${baseUrl}/auth/unified-login`, { body: { username: u, password: TEACHER_PASS } })
      headTeacherTokens.push(lg.status < 300 ? lg.body.token : '')
    }

    // ---------- 6) 学生 ×50/班（直接写库，含家长登录授权） ----------
    const studentRows: any[] = []
    for (let k = 1; k <= CLASSES_PER_SCHOOL; k++) {
      const headId = headTeacherIds[k - 1]
      for (let n = 1; n <= STUDENTS_PER_CLASS; n++) {
        const no = studentNo(i, k, n)
        // 学校1：C01N01 与 C02N01 共用同一家长电话（二孩家庭，用于跨娃比对用例）
        const sharedFamily = i === 1 && n === 1 && (k === 1 || k === 2)
        studentRows.push({
          classId: classIds[k - 1],
          teacherId: headId,
          name: `学生${i}-${k}-${n}`,
          gender: n % 2 === 1 ? '男' : '女',
          studentNo: no,
          seatNo: n,
          parentName: sharedFamily ? '家长1-二孩' : `家长${i}-${k}-${n}`,
          parentPhone: sharedFamily ? '13800000001' : `13${String(800000000 + i * 1000000 + k * 10000 + n * 7).slice(0, 9)}`,
          parentLoginEnabled: true,
          parentPasswordHash: parentHash,
        })
      }
    }
    for (let off = 0; off < studentRows.length; off += 500) {
      await studentRepo.save(studentRepo.create(studentRows.slice(off, off + 500)))
    }
    studentCount += studentRows.length

    // ---------- 7) 考试 ×10/班 + 成绩（直接写库） ----------
    const studentsByClass = new Map<string, any[]>()
    const allStudents: any[] = await studentRepo.find({ where: studentRows.map((r) => ({ classId: r.classId })) as any })
    for (const s of allStudents) {
      if (!studentsByClass.has(s.classId)) studentsByClass.set(s.classId, [])
      studentsByClass.get(s.classId)!.push(s)
    }

    for (let k = 1; k <= CLASSES_PER_SCHOOL; k++) {
      const classId = classIds[k - 1]
      const headId = headTeacherIds[k - 1]
      const classStudents = studentsByClass.get(classId) || []
      // 每个学生的能力基线（保证跨考试的个体趋势稳定：有人持续进步/退步/偏科）
      const rngC = makeRng(i * 100000 + k * 1000)
      const ability = classStudents.map(() => normal(rngC, 0, 10))
      const trend = classStudents.map(() => (rngC() - 0.5) * 2) // -1~1：进步/退步倾向
      const weakSubjectIdx = classStudents.map(() => Math.floor(rngC() * SUBJECTS.length))

      for (let e = 0; e < EXAMS_PER_CLASS; e++) {
        const sc = EXAM_SCENARIOS[e]
        const date = `2026-${String(Math.floor(e / 2) + 1).padStart(2, '0')}-${String(10 + e).padStart(2, '0')}`
        const examName = `${sc.name}`
        const exam = await examRepo.save(examRepo.create({
          teacherId: headId,
          classId,
          term: sc.term,
          name: examName,
          subjects: SUBJECTS,
          subjectFullScores: Object.fromEntries(SUBJECTS.map((s) => [s, 100])),
          date,
          note: '',
          analysisNote: e % 3 === 0 ? `本次${examName}整体${sc.mean >= 78 ? '表现良好' : '有待提升'}。` : '',
        }))
        examCount++

        // 缺考学生集合
        const absentSet = new Set<number>()
        const rngA = makeRng(i * 777 + k * 77 + e)
        for (let a = 0; a < sc.absentees; a++) absentSet.add(Math.floor(rngA() * classStudents.length))

        const gradeRows: any[] = SUBJECTS.map((subject, sIdx) => {
          const scores = classStudents.map((stu, idx) => {
            if (absentSet.has(idx)) return { studentId: stu.id, score: null }
            const drift = trend[idx] * e * 1.2 // 随考试序号放大的进步/退步
            const weakPenalty = weakSubjectIdx[idx] === sIdx ? 18 : 0 // 偏科场景
            let score = Math.round(normal(rngC, sc.mean, sc.sd) + ability[idx] + drift - weakPenalty)
            score = Math.max(5, Math.min(100, score))
            return { studentId: stu.id, score }
          })
          return {
            teacherId: headId,
            classId,
            subject,
            examName,
            examId: exam.id,
            date,
            scores,
          }
        })
        await gradeRepo.save(gradeRepo.create(gradeRows))
        gradeRowCount += gradeRows.length
      }
    }

    // 学校1：为二孩家庭（C01N01 与 C02N01 同家长）预建 Parent 记录 + 回填 parentId + StudentParent 绑定，
    // 对齐生产「教师开启家长登录（toggle D6）」的完整链路，支撑 /me kids 与跨娃比对用例
    if (i === 1) {
      const parentRepo = ds.getRepository('parents')
      const spRepo = ds.getRepository('student_parents')
      const famParent = await parentRepo.save(parentRepo.create({ phone: '13800000001', parentName: '家长1-二孩' }))
      const kids: any[] = await studentRepo.find({ where: [{ studentNo: studentNo(1, 1, 1) }, { studentNo: studentNo(1, 2, 1) }] })
      for (const k of kids) {
        k.parentId = famParent.id
        await studentRepo.save(k)
        await spRepo.save(spRepo.create({ studentId: k.id, parentId: famParent.id, openId: '', relation: '家长', nickName: '家长1-二孩', schoolId, classId: k.classId, isPrimary: true }))
      }
    }

    // ---------- 8) 富化数据：班级公告 / 作业 / 考勤 / 消息 / 笔记 / 通知 ----------
    // 目的：让四角色页面真实有数据可查，支撑功能/性能/交互三类用例。
    // 仓储已在函数开头声明，复用即可。

    const rngI = makeRng(i * 99991)

    for (let k = 1; k <= CLASSES_PER_SCHOOL; k++) {
      const classId = classIds[k - 1]
      const headId = headTeacherIds[k - 1]
      const classStudents = await studentRepo.find({ where: { classId } })
      const classStudentIds = classStudents.map((s) => s.id)

      // 公告：每班 3 条（含 1 条置顶），外加 1 条全校级公告（仅首班写一次）
      const noticeRows = []
      for (let n = 0; n < 3; n++) {
        noticeRows.push({
          teacherId: headId,
          classId,
          title: `班级${k}公告 #${n + 1}：${['家长开放日通知', '期中复习安排', '班级公约更新'][n]}`,
          content: `这是测试第${i}学校的班级${k}发布的第 ${n + 1} 条公告。发布时间：2026-0${n + 1}-15 10:00。`,
          pinned: n === 0,
          ended: false,
          scope: 'class',
        })
      }
      for (const nr of noticeRows) await noticeRepo.save(noticeRepo.create(nr))
      if (k === 1) {
        await noticeRepo.save(noticeRepo.create({
          teacherId: adminId,
          classId: '全校',
          title: `测试第${i}学校 全校公告：期末工作通知`,
          content: '为迎接期末考试，学校安排如下工作，请各位师生知悉。',
          pinned: true,
          ended: false,
          scope: 'school',
        }))
      }

      // 作业：每班 4 条，覆盖不同学科 / 不同状态
      for (let h = 0; h < 4; h++) {
        const subject = SUBJECTS[(h + k) % SUBJECTS.length]
        const statuses = ['待批改', '已批改', '进行中', '已发布']
        await homeworkRepo.save(homeworkRepo.create({
          teacherId: headId,
          classId,
          subject,
          title: `${subject}作业 #${h + 1}`,
          content: `测试第${i}学校 班级${k} 的 ${subject} 作业 #${h + 1}。`,
          startDate: `2026-0${h + 1}-01`,
          deadline: `2026-0${h + 1}-15`,
          status: statuses[h],
        }))
      }

      // 考勤：每班 3 天考勤记录（含随机出勤状态）
      for (let d = 0; d < 3; d++) {
        const date = `2026-0${d + 1}-10`
        const records = classStudentIds.map((sid, idx) => ({
          studentId: sid,
          status: (rngI() > 0.05 ? 'present' : 'absent') + (idx % 3 === 0 ? '+late' : ''),
        }))
        await attendanceRepo.save(attendanceRepo.create({ teacherId: headId, classId, date, records }))
      }

      // 消息：每班 5 条教师→家长双向消息（使用 parentImUserId 派生家长收件人ID，与家长登录JWT sub 对齐）
      const parentStudents = classStudents.filter((_, idx) => idx % 5 === 0)
      for (let m = 0; m < 5; m++) {
        const stu = parentStudents[m % Math.max(1, parentStudents.length)] || classStudents[m]
        const pName: string = stu?.parentName || `家长${i}-${k}-${m}`
        const recipientId = parentImUserId({ studentId: stu?.id || '', relation: '家长', parentName: pName })
        await messageRepo.save(messageRepo.create({
          senderId: headId,
          senderRole: 'teacher',
          recipientId,
          recipientRole: 'parent',
          title: `班级${k} 通知 #${m + 1}`,
          content: `您好，我是测试第${i}学校 ${k}班班主任，关于 ${stu?.name || '学生'} 的事情与您沟通…`,
          type: 'direct',
          isRead: false,
        }))
      }

      // 笔记：每位班主任 3 条
      for (let n = 0; n < 3; n++) {
        const categories = ['教学反思', '班级管理', '教研笔记', '其他']
        await noteRepo.save(noteRepo.create({
          teacherId: headId,
          title: `笔记 #${n + 1}：${categories[n % categories.length]}`,
          content: `这是班主任 ${teacherUser(i, k)} 的第 ${n + 1} 条笔记内容。`,
          category: categories[n % categories.length],
          pinned: n === 0,
          favorite: n === 1,
        }))
      }

      // 通知：每位班主任 5 条（含不同类型）
      for (let n = 0; n < 5; n++) {
        const types = ['info', 'notice', 'homework', 'grade', 'info']
        const type = types[n]
        await notificationRepo.save(notificationRepo.create({
          teacherId: headId,
          title: `通知 #${n + 1}`,
          content: `这是一条 ${type} 类型的通知。`,
          type,
          read: n % 3 === 0,
          link: type === 'homework' ? '/class-ops/homework' : type === 'grade' ? '/exams/grades' : '',
        }))
      }

      // 校管 → 班主任 消息（每校 2 条）
      if (k === 0) {
        await messageRepo.save(messageRepo.create({
          senderId: adminId,
          senderRole: 'school_admin',
          recipientId: headId,
          recipientRole: 'teacher',
          title: `校${i} 校管→班主任`,
          content: `关于班级 ${i}-${k + 1} 的日常管理沟通…`,
          type: 'direct',
          isRead: false,
        }))
        // 校管 → 超管 1 条
        await messageRepo.save(messageRepo.create({
          senderId: adminId,
          senderRole: 'school_admin',
          recipientId: 'super',
          recipientRole: 'super',
          title: `校${i} 向超管汇报`,
          content: `校${i} 的本学期教学进展汇报…`,
          type: 'direct',
          isRead: false,
        }))
      }
    }

    schools.push({
      id: schoolId,
      name: schoolName,
      code: sch.body.code || '',
      adminToken,
      classIds,
      headTeacherIds,
      headTeacherTokens,
    })
    // eslint-disable-next-line no-console
    console.log(`[seed] 学校 ${i}/${SCHOOL_COUNT} 完成`)
  }

  const noticeCount = await noticeRepo.count()
  const messageCount = await messageRepo.count()
  const noteCount = await noteRepo.count()
  const notificationCount = await notificationRepo.count()

  return {
    schools,
    studentCount,
    examCount,
    gradeRowCount,
    noticeCount,
    messageCount,
    noteCount,
    notificationCount,
    durationMs: Date.now() - t0,
  }
}
