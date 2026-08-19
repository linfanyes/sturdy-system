/**
 * QA 测试数据集（与 qa/TEST_DATA.md 一致）
 * 规模：20 学校 × 6 年级 × 8 班 × 60 学生 + 6 老师/班 × 3 学期 × 10 考试
 * 总计：20 校 × 48 班/校 × 60 生/班 = 57,600 学生
 *       20 校 × 48 班/校 × 6 师/班 = 5,760 教师
 *       20 校 × 48 班/校 × 30 考试/班 = 28,800 考试
 *       28,800 考试 × 6 科 = 172,800 成绩记录
 *
 * 特殊场景：
 * - 同校多孩：校1 家长1-二孩 有2个孩子在同校不同班
 * - 跨校多孩：家长跨校 有2个孩子在不同学校
 * - 教师子女家长：校1 教师的孩子在另一班，用学号独立登录家长端
 * - 三孩家庭：校2 一个家长3个孩子
 *
 * 账号约定（供用例引用）：
 * - 超管：admin / admin
 * - 校管：qaadmin01~20 / QaAdmin@123
 * - 教师：qat{i:02d}t{j:02d} / QaTeach@123（j=01 为1班班主任）
 * - 家长：学号登录，口令 123456
 *   学号规则：S{校:02d}G{级:02d}C{班:02d}N{生:02d}
 */
import type { DataSource } from 'typeorm'
import { http } from './harness'
import { randomUUID } from 'crypto'
import bcrypt from 'bcrypt'

/** TypeORM 默认命名策略：camelCase → snake_case */
function toSnake(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
}

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

// 数据规模常量（可通过环境变量覆盖，用于快速测试）
export const SCHOOL_COUNT = +(process.env.QA_SCHOOL_COUNT || 20)
export const GRADES_PER_SCHOOL = +(process.env.QA_GRADES_PER_SCHOOL || 6)
export const CLASSES_PER_GRADE = +(process.env.QA_CLASSES_PER_GRADE || 8)
export const CLASSES_PER_SCHOOL = GRADES_PER_SCHOOL * CLASSES_PER_GRADE
export const STUDENTS_PER_CLASS = +(process.env.QA_STUDENTS_PER_CLASS || 60)
export const TEACHERS_PER_CLASS = +(process.env.QA_TEACHERS_PER_CLASS || 6)
export const TEACHERS_PER_SCHOOL = CLASSES_PER_SCHOOL * TEACHERS_PER_CLASS
export const EXAMS_PER_SEMESTER = 10
export const SEMESTERS = 3
export const EXAMS_PER_CLASS = EXAMS_PER_SEMESTER * SEMESTERS // 30
export const SUBJECTS = ['语文', '数学', '英语', '科学', '道法', '体育']

export const adminUser = (i: number) => `qaadmin${String(i).padStart(2, '0')}`
export const teacherUser = (i: number, j: number) => `qat${String(i).padStart(2, '0')}t${String(j).padStart(2, '0')}`
export const studentNo = (i: number, g: number, c: number, n: number) =>
  `S${String(i).padStart(2, '0')}G${String(g).padStart(2, '0')}C${String(c).padStart(2, '0')}N${String(n).padStart(2, '0')}`

/** 班级编号：gradeIdx(1-6) + classIdx(1-8) */
export const classNo = (g: number, c: number) => `${g}0${String(c).padStart(2, '0')}`

/** 年级名称 */
export const GRADE_NAMES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

/** 教师角色类型 */
export const TEACHER_ROLES = [
  '班主任',           // 0: head teacher
  '语文老师',         // 1
  '数学老师',         // 2
  '英语老师',         // 3
  '科学/道法老师',    // 4
  '体育/艺术老师',    // 5
]

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

/** 3 学期 × 10 次考试 = 30 次考试的成绩场景 */
function buildExamScenarios() {
  const terms = [
    '2025-2026学年上学期',
    '2025-2026学年下学期',
    '2026-2027学年上学期',
  ]
  const baseScenarios = [
    { name: '第一次月考', mean: 75, sd: 12, absentees: 0 },
    { name: '期中考试', mean: 78, sd: 11, absentees: 0 },
    { name: '第二次月考', mean: 72, sd: 13, absentees: 0 },
    { name: '期末考试', mean: 80, sd: 10, absentees: 0 },
    { name: '第一单元测验', mean: 85, sd: 7, absentees: 0 },
    { name: '第二单元测验', mean: 65, sd: 14, absentees: 0 },
    { name: '模拟测试', mean: 74, sd: 20, absentees: 0 },
    { name: '课堂小测', mean: 82, sd: 9, absentees: 0 },
    { name: '期中联考', mean: 76, sd: 12, absentees: 2 },
    { name: '期末统考', mean: 79, sd: 11, absentees: 1 },
  ]
  const scenarios: Array<{ name: string; term: string; mean: number; sd: number; absentees: number; examIndex: number }> = []
  for (let s = 0; s < SEMESTERS; s++) {
    for (let e = 0; e < EXAMS_PER_SEMESTER; e++) {
      const sc = baseScenarios[e]
      scenarios.push({
        name: sc.name,
        term: terms[s],
        mean: sc.mean + s * 1,
        sd: sc.sd,
        absentees: sc.absentees,
        examIndex: s * EXAMS_PER_SEMESTER + e,
      })
    }
  }
  return scenarios
}
const EXAM_SCENARIOS = buildExamScenarios()

export interface SeedResult {
  schools: Array<{
    id: string; name: string; code: string; adminToken: string;
    classIds: string[]; headTeacherIds: string[]; headTeacherTokens: string[];
    teacherIds: string[];
  }>
  multiChildFamilies: Array<{ parentPhone: string; parentName: string; studentNos: string[] }>
  teacherAsParent: Array<{ teacherUser: string; studentNo: string; schoolIdx: number }>
  studentCount: number
  examCount: number
  gradeRowCount: number
  noticeCount: number
  messageCount: number
  noteCount: number
  notificationCount: number
  durationMs: number
}

/** Get current timestamp string for SQLite */
function now(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

/** Generate UUID */
function uid(): string {
  return randomUUID()
}

/** Map property names to column names using TypeORM metadata */
function getColumnMap(ds: DataSource): Map<string, string> {
  const map = new Map<string, string>()
  for (const meta of ds.entityMetadatas) {
    for (const col of meta.columns) {
      if (col.propertyName && col.databaseName) {
        map.set(`${meta.tableName}.${col.propertyName}`, col.databaseName)
      }
    }
  }
  return map
}

/** Get column names for a table */
function getTableColumns(colMap: Map<string, string>, table: string): string[] {
  const cols: string[] = []
  const prefix = table + '.'
  for (const [key, val] of colMap) {
    if (key.startsWith(prefix)) cols.push(val)
  }
  return cols
}

/** Build batch INSERT using entity metadata for correct column names */
async function batchInsert(
  ds: DataSource,
  table: string,
  propToCol: Map<string, string>,
  rows: any[][],
  batchSize: number = 100,
  ignoreDuplicates: boolean = false
): Promise<void> {
  if (!rows.length) return
  const qr = ds.createQueryRunner()
  try {
    await qr.connect()
    for (let off = 0; off < rows.length; off += batchSize) {
      const chunk = rows.slice(off, off + batchSize)
      const colNames = Array.from(propToCol.values())
      const placeholders = chunk.map(() => `(${colNames.map(() => '?').join(',')})`).join(',')
      const values: any[] = []
      for (const row of chunk) {
        for (const val of row) {
          if (val === undefined || val === null) values.push(null)
          else if (typeof val === 'boolean') values.push(val ? 1 : 0)
          else if (typeof val === 'object') values.push(JSON.stringify(val))
          else values.push(val)
        }
      }
      const sql = ignoreDuplicates
        ? `INSERT OR IGNORE INTO ${table} (${colNames.join(',')}) VALUES ${placeholders}`
        : `INSERT INTO ${table} (${colNames.join(',')}) VALUES ${placeholders}`
      await qr.query(sql, values)
    }
  } finally {
    if (qr) await qr.release()
  }
}

export async function seedDataset(baseUrl: string, ds: DataSource): Promise<SeedResult> {
  const t0 = Date.now()

  // ---------- 1) 超管登录 ----------
  const su = await http('POST', `${baseUrl}/auth/unified-login`, { body: { username: SUPER_USER, password: SUPER_PASS } })
  if (su.status >= 300) throw new Error(`超管登录失败: ${su.status} ${JSON.stringify(su.body)}`)
  const superToken = su.body.token as string

  // 预计算家长口令哈希（与 password.util.ts 保持一致：bcrypt + 10 rounds）
  const parentHash = bcrypt.hashSync(PARENT_PASS, 10)

  // Build property→column maps using entity metadata
  const colMap = getColumnMap(ds)

  // Build per-table maps
  function tbl(table: string, props: string[]): Map<string, string> {
    const m = new Map<string, string>()
    for (const p of props) {
      const col = colMap.get(`${table}.${p}`)
      if (col) m.set(p, col)
    }
    return m
  }

  const studentProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'classId', 'name', 'gender', 'studentNo',
    'birthDate', 'seatNo', 'seatRow', 'seatCol', 'parentName', 'parentPhone', 'studentPhone',
    'address', 'parentId', 'parentNickName', 'parentLoginEnabled', 'parentPasswordHash',
    'note', 'tags', 'duty', 'comment', 'examComments']
  const studentCols = tbl('students', studentProps)

  const examProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'term', 'name', 'teacherName',
    'classId', 'subjects', 'subjectFullScores', 'date', 'note', 'analysisNote']
  const examCols = tbl('exams', examProps)

  const gradeProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'classId', 'subject',
    'examName', 'examId', 'date', 'scores']
  const gradeCols = tbl('grades', gradeProps)

  const noticeProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'classId', 'title', 'content', 'pinned', 'ended', 'endedAt', 'scope']
  const noticeCols = tbl('notices', noticeProps)

  const homeworkProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'classId', 'subject', 'title', 'content', 'startDate', 'deadline', 'status']
  const homeworkCols = tbl('homework', homeworkProps)

  const attendanceProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'classId', 'date', 'records']
  const attendanceCols = tbl('attendances', attendanceProps)

  const messageProps = ['id', 'senderId', 'senderRole', 'recipientId', 'recipientRole', 'title', 'content', 'type', 'isRead', 'createdAt']
  const messageCols = tbl('messages', messageProps)

  const noteProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'title', 'content', 'category', 'pinned', 'favorite']
  const noteCols = tbl('notes', noteProps)

  const notificationProps = ['id', 'teacherId', 'createdAt', 'updatedAt', 'title', 'content', 'type', 'read', 'link']
  const notificationCols = tbl('notifications', notificationProps)

  const parentProps = ['id', 'createdAt', 'updatedAt', 'openId', 'phone', 'parentName', 'nickName', 'relation', 'passwordHash']
  const parentCols = tbl('parents', parentProps)

  const spProps = ['id', 'createdAt', 'updatedAt', 'studentId', 'parentId', 'openId', 'relation', 'nickName', 'avatar', 'isPrimary', 'schoolId', 'classId']
  const spCols = tbl('student_parents', spProps)

  // Helper to get database column name
  function dc(table: string, prop: string): string {
    return colMap.get(`${table}.${prop}`) || prop
  }

  const schools: SeedResult['schools'] = []
  const multiChildFamilies: SeedResult['multiChildFamilies'] = []
  const teacherAsParent: SeedResult['teacherAsParent'] = []
  let studentCount = 0
  let examCount = 0
  let gradeRowCount = 0

  const crossSchoolParentPhone = '13800000099'
  const crossSchoolParentName = '家长-跨校'
  const crossSchoolStudentNos: string[] = []

  const teacherParentUser = teacherUser(1, 5)

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

    // ---------- 4) 教师 ×288（6 教师 × 48 班，分批创建） ----------
    const allTeachers: Array<{ name: string; username: string; password: string; subject: string }> = []
    for (let k = 1; k <= CLASSES_PER_SCHOOL; k++) {
      const baseIdx = (k - 1) * TEACHERS_PER_CLASS
      for (let t = 1; t <= TEACHERS_PER_CLASS; t++) {
        const idx = baseIdx + t
        const subjectMap = ['语文', '语文', '数学', '英语', '科学', '体育']
        allTeachers.push({
          name: `教师${i}-${String(idx).padStart(3, '0')}`,
          username: teacherUser(i, idx),
          password: TEACHER_PASS,
          subject: subjectMap[t - 1],
        })
      }
    }

    // 分批创建教师（每批 50 人）
    const teacherIdByUser = new Map<string, string>()
    for (let off = 0; off < allTeachers.length; off += 50) {
      const batch = allTeachers.slice(off, off + 50)
      const tch = await http('POST', `${baseUrl}/school-admin/teachers/batch`, { token: adminToken, body: { teachers: batch } })
      if (tch.status >= 300) throw new Error(`批量创建教师失败(校${i} offset=${off}): ${tch.status} ${JSON.stringify(tch.body).slice(0, 200)}`)

      const createdTeachers: Array<{ id: string; username: string }> = Array.isArray(tch.body?.items)
        ? tch.body.items
        : Array.isArray(tch.body?.teachers) ? tch.body.teachers : Array.isArray(tch.body) ? tch.body : []
      for (const t of createdTeachers) if (t?.username && t?.id) teacherIdByUser.set(t.username, t.id)
    }
    // 兜底查询
    if (teacherIdByUser.size < TEACHERS_PER_SCHOOL) {
      const rows: any[] = await ds.getRepository('users').find({ where: { schoolId } })
      for (const r of rows) if (r.username) teacherIdByUser.set(r.username, r.id)
    }

    const allTeacherIds: string[] = []
    for (let idx = 1; idx <= TEACHERS_PER_SCHOOL; idx++) {
      const uidStr = teacherUser(i, idx)
      const tid = teacherIdByUser.get(uidStr)
      if (tid) allTeacherIds.push(tid)
    }

    // ---------- 5) 班级 ×48（6 年级 × 8 班） ----------
    const classIds: string[] = []
    const headTeacherIds: string[] = []
    const headTeacherTokens: string[] = []

    for (let g = 1; g <= GRADES_PER_SCHOOL; g++) {
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        const k = (g - 1) * CLASSES_PER_GRADE + c
        const className = `${GRADE_NAMES[g - 1]}(${c})班`
        const headIdx = (k - 1) * TEACHERS_PER_CLASS + 1
        const headUser = teacherUser(i, headIdx)
        const headId = teacherIdByUser.get(headUser) || ''

        const cls = await http('POST', `${baseUrl}/school-admin/classes`, {
          token: adminToken,
          body: {
            name: className,
            grade: GRADE_NAMES[g - 1],
            classNo: classNo(g, c),
            headTeacher: `教师${i}-${String(headIdx).padStart(3, '0')}`,
            teacherId: headId,
            headTeacherId: headId,
          },
        })
        if (cls.status >= 300) throw new Error(`创建班级失败(${className}): ${cls.status} ${JSON.stringify(cls.body)}`)
        classIds.push(cls.body.id)
        headTeacherIds.push(headId)
      }
    }

    // 班主任登录（取前 2 个班级班主任供功能用例使用）
    for (let k = 1; k <= 2; k++) {
      const headIdx = (k - 1) * TEACHERS_PER_CLASS + 1
      const u = teacherUser(i, headIdx)
      const lg = await http('POST', `${baseUrl}/auth/unified-login`, { body: { username: u, password: TEACHER_PASS } })
      headTeacherTokens.push(lg.status < 300 ? lg.body.token : '')
    }

    // ---------- 6) 学生 ×60/班（直接写库，含家长登录授权） ----------
    const studentIdMap = new Map<string, string>()
    const studentRows: any[][] = []

    for (let g = 1; g <= GRADES_PER_SCHOOL; g++) {
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        const k = (g - 1) * CLASSES_PER_GRADE + c
        const classId = classIds[k - 1]
        const headId = headTeacherIds[k - 1]

        for (let n = 1; n <= STUDENTS_PER_CLASS; n++) {
          const no = studentNo(i, g, c, n)
          const newId = uid()
          studentIdMap.set(no, newId)

          let parentName = `家长${i}-${g}-${c}-${n}`
          let parentPhone = `13${String(800000000 + i * 10000000 + g * 100000 + c * 10000 + n * 7).slice(0, 9)}`

          const isSameSchoolMulti = i === 1 && n === 1 && ((g === 1 && c === 1) || (g === 1 && c === 2))
          const isThreeChildFamily = i === 1 && n === 1 && ((g === 1 && c === 3) || (g === 1 && c === 5) || (g === 1 && c === 6))

          if (isSameSchoolMulti) {
            parentName = '家长1-二孩'
            parentPhone = '13800000001'
          } else if (isThreeChildFamily) {
            parentName = '家长1-三孩'
            parentPhone = '13800000002'
          }

          // 跨校孩子：用 class 4 避免与同校多孩/三孩家庭的 class 1/2/3/5/6 冲突
          const isCrossSchoolChild = n === 1 && g === 1 && c === 4
          if (i === 1 && isCrossSchoolChild) {
            parentName = crossSchoolParentName
            parentPhone = crossSchoolParentPhone
            crossSchoolStudentNos.push(no)
          } else if (i === 2 && isCrossSchoolChild) {
            parentName = crossSchoolParentName
            parentPhone = crossSchoolParentPhone
            crossSchoolStudentNos.push(no)
          }

          const isTeacherChild = i === 1 && g === 2 && c === 3 && n === 60
          if (isTeacherChild) {
            parentName = '教师1-5兼长'
            parentPhone = '13900000001'
            teacherAsParent.push({ teacherUser, studentNo: no, schoolIdx: i } as any)
          }

          studentRows.push([
            newId,         // id
            headId,        // teacherId
            now(),         // createdAt
            now(),         // updatedAt
            classId,       // classId
            `学生${i}-${g}-${c}-${n}`, // name
            n % 2 === 1 ? '男' : '女', // gender
            no,            // studentNo
            null,          // birthDate
            n,             // seatNo
            null,          // seatRow
            null,          // seatCol
            parentName,    // parentName
            parentPhone,   // parentPhone
            '',            // studentPhone
            '',            // address
            null,          // parentId
            '',            // parentNickName
            true,          // parentLoginEnabled
            parentHash,    // parentPasswordHash
            null,          // note
            null,          // tags
            null,          // duty
            null,          // comment
            null,          // examComments
          ])
        }
      }
    }
    await batchInsert(ds, 'students', studentCols, studentRows, 100)
    studentCount += studentRows.length

    // ---------- 7) 考试 ×30/班 + 成绩（直接写库） ----------
    const studentsByClass = new Map<string, Array<{ id: string; studentNo: string }>>()
    for (let g = 1; g <= GRADES_PER_SCHOOL; g++) {
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        const k = (g - 1) * CLASSES_PER_GRADE + c
        const classId = classIds[k - 1]
        const classStudents: Array<{ id: string; studentNo: string }> = []
        for (let n = 1; n <= STUDENTS_PER_CLASS; n++) {
          const no = studentNo(i, g, c, n)
          const sid = studentIdMap.get(no)
          if (sid) classStudents.push({ id: sid, studentNo: no })
        }
        if (!studentsByClass.has(classId)) studentsByClass.set(classId, [])
        studentsByClass.get(classId)!.push(...classStudents)
      }
    }

    for (let g = 1; g <= GRADES_PER_SCHOOL; g++) {
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        const k = (g - 1) * CLASSES_PER_GRADE + c
        const classId = classIds[k - 1]
        const headId = headTeacherIds[k - 1]
        const classStudents = studentsByClass.get(classId) || []

        const rngC = makeRng(i * 100000 + g * 10000 + c * 100)
        const ability = classStudents.map(() => normal(rngC, 0, 10))
        const trend = classStudents.map(() => (rngC() - 0.5) * 2)
        const weakSubjectIdx = classStudents.map(() => Math.floor(rngC() * SUBJECTS.length))

        const examRows: any[][] = []
        const gradeRows: any[][] = []

        for (let e = 0; e < EXAMS_PER_CLASS; e++) {
          const sc = EXAM_SCENARIOS[e]
          const month = Math.floor((e % EXAMS_PER_SEMESTER) / 3) + 1
          const day = (e % EXAMS_PER_SEMESTER) * 2 + 10
          const date = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const examId = uid()

          examRows.push([
            examId,
            headId,
            now(),
            now(),
            sc.term,
            sc.name,
            '',
            classId,
            SUBJECTS,
            Object.fromEntries(SUBJECTS.map((s) => [s, 100])),
            date,
            '',
            e % 3 === 0 ? `本次${sc.name}整体${sc.mean >= 78 ? '表现良好' : '有待提升'}。` : '',
          ])

          const absentSet = new Set<number>()
          const rngA = makeRng(i * 777 + g * 77 + c * 7 + e)
          for (let a = 0; a < sc.absentees; a++) absentSet.add(Math.floor(rngA() * classStudents.length))

          for (let sIdx = 0; sIdx < SUBJECTS.length; sIdx++) {
            const subject = SUBJECTS[sIdx]
            const scores = classStudents.map((stu, idx) => {
              if (absentSet.has(idx)) return { studentId: stu.id, score: null }
              const drift = trend[idx] * e * 1.2
              const weakPenalty = weakSubjectIdx[idx] === sIdx ? 18 : 0
              let score = Math.round(normal(rngC, sc.mean, sc.sd) + ability[idx] + drift - weakPenalty)
              score = Math.max(5, Math.min(100, score))
              return { studentId: stu.id, score }
            })

            gradeRows.push([
              uid(),
              headId,
              now(),
              now(),
              classId,
              subject,
              sc.name,
              examId,
              date,
              scores,
            ])
          }
          examCount++
        }

        await batchInsert(ds, 'exams', examCols, examRows, 100)
        await batchInsert(ds, 'grades', gradeCols, gradeRows, 50, true)
        gradeRowCount += gradeRows.length
      }
    }

    // ---------- 8) 多孩家庭绑定 ----------
    if (i === 1) {
      // 同校二孩家庭
      const famParentId = uid()
      await batchInsert(ds, 'parents', parentCols, [[famParentId, now(), now(), null, '13800000001', '家长1-二孩', null, null, null]], 1)

      const kidNos = [studentNo(1, 1, 1, 1), studentNo(1, 1, 2, 1)]
      const spRows: any[][] = []
      for (let idx = 0; idx < kidNos.length; idx++) {
        const no = kidNos[idx]
        const stuId = studentIdMap.get(no)
        if (stuId) {
          const qr = ds.createQueryRunner()
          try {
            await qr.connect()
            const parentIdCol = dc('students', 'parentId')
            await qr.query(`UPDATE students SET ${parentIdCol} = ? WHERE id = ?`, [famParentId, stuId])
          } finally {
            if (qr) await qr.release()
          }
          const uniqueOpenId = `family_${stuId.slice(0, 8)}`
          spRows.push([uid(), now(), now(), stuId, famParentId, uniqueOpenId, '家长', '家长1-二孩', '', true, '', classIds[0]])
        }
      }
      await batchInsert(ds, 'student_parents', spCols, spRows, 50)
      multiChildFamilies.push({ parentPhone: '13800000001', parentName: '家长1-二孩', studentNos: kidNos })

      // 三孩家庭
      const threeParentId = uid()
      await batchInsert(ds, 'parents', parentCols, [[threeParentId, now(), now(), null, '13800000002', '家长1-三孩', null, null, null]], 1)

      const threeKidNos = [studentNo(1, 1, 3, 1), studentNo(1, 1, 5, 1), studentNo(1, 1, 6, 1)]
      const threeSpRows: any[][] = []
      for (let idx = 0; idx < threeKidNos.length; idx++) {
        const no = threeKidNos[idx]
        const stuId = studentIdMap.get(no)
        if (stuId) {
          const qr = ds.createQueryRunner()
          try {
            await qr.connect()
            const parentIdCol = dc('students', 'parentId')
            await qr.query(`UPDATE students SET ${parentIdCol} = ? WHERE id = ?`, [threeParentId, stuId])
          } finally {
            if (qr) await qr.release()
          }
          const uniqueOpenId = `three_${stuId.slice(0, 8)}`
          threeSpRows.push([uid(), now(), now(), stuId, threeParentId, uniqueOpenId, '家长', '家长1-三孩', '', true, '', classIds[0]])
        }
      }
      await batchInsert(ds, 'student_parents', spCols, threeSpRows, 50)
      multiChildFamilies.push({ parentPhone: '13800000002', parentName: '家长1-三孩', studentNos: threeKidNos })
    }

    if (i === 1) {
      const tParentId = uid()
      await batchInsert(ds, 'parents', parentCols, [[tParentId, now(), now(), null, '13900000001', '教师1-5兼长', null, null, null]], 1)

      const stuId = studentIdMap.get(studentNo(1, 2, 3, 60))
      if (stuId) {
        const qr = ds.createQueryRunner()
        try {
          await qr.connect()
          const parentIdCol = dc('students', 'parentId')
          await qr.query(`UPDATE students SET ${parentIdCol} = ? WHERE id = ?`, [tParentId, stuId])
        } finally {
          if (qr) await qr.release()
        }
        const classIdx = (2 - 1) * CLASSES_PER_GRADE + 3
        const uniqueOpenId = `teacher_parent_${stuId.slice(0, 8)}`
        await batchInsert(ds, 'student_parents', spCols, [[uid(), now(), now(), stuId, tParentId, uniqueOpenId, '家长', '教师1-5兼长', '', true, '', classIds[classIdx - 1]]], 1)
      }
    }

    // ---------- 9) 富化数据 ----------
    const rngI = makeRng(i * 99991)
    const MAX_CLASS_DATA = 8

    const noticeRows: any[][] = []
    const homeworkRows: any[][] = []
    const attendanceRows: any[][] = []
    const messageRows: any[][] = []
    const noteRows: any[][] = []
    const notificationRows: any[][] = []

    for (let k = 1; k <= Math.min(MAX_CLASS_DATA, CLASSES_PER_SCHOOL); k++) {
      const classId = classIds[k - 1]
      const headId = headTeacherIds[k - 1]
      const classStudents = await ds.getRepository('students').find({ where: { classId } })
      const classStudentIds = classStudents.map((s) => s.id)

      // 公告
      const noticeTitles = ['家长开放日通知', '期中复习安排', '班级公约更新']
      for (let n = 0; n < 3; n++) {
        noticeRows.push([
          uid(), headId, now(), now(), classId,
          `班级${k}公告 #${n + 1}：${noticeTitles[n]}`,
          `这是测试第${i}学校的班级${k}发布的第 ${n + 1} 条公告。`,
          n === 0, false, null, 'class'
        ])
      }
      if (k === 1) {
        noticeRows.push([
          uid(), adminId, now(), now(), '全校',
          `测试第${i}学校 全校公告：期末工作通知`,
          '为迎接期末考试，学校安排如下工作。',
          true, false, null, 'school'
        ])
      }

      // 作业
      for (let h = 0; h < 4; h++) {
        const subject = SUBJECTS[(h + k) % SUBJECTS.length]
        const statuses = ['待批改', '已批改', '进行中', '已发布']
        homeworkRows.push([
          uid(), headId, now(), now(), classId, subject,
          `${subject}作业 #${h + 1}`,
          `测试第${i}学校 班级${k} 的 ${subject} 作业。`,
          `2026-0${(h % 9) + 1}-01`,
          `2026-0${(h % 9) + 1}-15`,
          statuses[h]
        ])
      }

      // 考勤
      for (let d = 0; d < 3; d++) {
        const date = `2026-0${d + 1}-10`
        const records = classStudentIds.map((sid, idx) => ({
          studentId: sid,
          status: (rngI() > 0.05 ? 'present' : 'absent') + (idx % 3 === 0 ? '+late' : ''),
        }))
        attendanceRows.push([uid(), headId, now(), now(), classId, date, records])
      }

      // 消息
      for (let m = 0; m < 5; m++) {
        const stu = classStudents[(m * 10) % classStudents.length] || classStudents[m]
        const pName: string = stu?.parentName || `家长${i}-${k}-${m}`
        const recipientId = parentImUserId({ studentId: stu?.id || '', relation: '家长', parentName: pName })
        messageRows.push([
          uid(), headId, 'teacher', recipientId, 'parent',
          `班级${k} 通知 #${m + 1}`,
          `您好，我是测试第${i}学校 ${k}班班主任，关于 ${stu?.name || '学生'} 的事情与您沟通…`,
          'direct', false, now()
        ])
      }

      // 笔记
      const noteCategories = ['教学反思', '班级管理', '教研笔记']
      for (let n = 0; n < 3; n++) {
        noteRows.push([
          uid(), headId, now(), now(),
          `笔记 #${n + 1}：${noteCategories[n]}`,
          `这是班主任 ${teacherUser(i, (k - 1) * TEACHERS_PER_CLASS + 1)} 的笔记。`,
          noteCategories[n],
          n === 0,
          n === 1
        ])
      }

      // 通知
      const notifTypes = ['info', 'notice', 'homework', 'grade', 'info']
      for (let n = 0; n < 5; n++) {
        const type = notifTypes[n]
        notificationRows.push([
          uid(), headId, now(), now(),
          `通知 #${n + 1}`,
          `这是一条 ${type} 类型的通知。`,
          type,
          n % 3 === 0,
          type === 'homework' ? '/class-ops/homework' : type === 'grade' ? '/exams/grades' : ''
        ])
      }
    }

    // 批量插入富化数据
    if (noticeRows.length > 0) await batchInsert(ds, 'notices', noticeCols, noticeRows, 200)
    if (homeworkRows.length > 0) await batchInsert(ds, 'homework', homeworkCols, homeworkRows, 200)
    if (attendanceRows.length > 0) await batchInsert(ds, 'attendances', attendanceCols, attendanceRows, 200)
    if (messageRows.length > 0) await batchInsert(ds, 'messages', messageCols, messageRows, 200)
    if (noteRows.length > 0) await batchInsert(ds, 'notes', noteCols, noteRows, 200)
    if (notificationRows.length > 0) await batchInsert(ds, 'notifications', notificationCols, notificationRows, 200)

    schools.push({
      id: schoolId,
      name: schoolName,
      code: sch.body.code || '',
      adminToken,
      classIds,
      headTeacherIds,
      headTeacherTokens,
      teacherIds: allTeacherIds,
    })
    // eslint-disable-next-line no-console
    console.log(`[seed] 学校 ${i}/${SCHOOL_COUNT} 完成 (学生${studentRows.length})`)
  }

  // 跨校多孩家庭绑定
  {
    const crossParentId = uid()
    await batchInsert(ds, 'parents', parentCols, [[crossParentId, now(), now(), null, crossSchoolParentPhone, crossSchoolParentName, null, null, null]], 1)

    const spRows: any[][] = []
    for (const no of crossSchoolStudentNos) {
      // Find student by studentNo
      const qr = ds.createQueryRunner()
      try {
        await qr.connect()
        const studentNoCol = dc('students', 'studentNo')
        const classIdCol = dc('students', 'classId')
        const results: any[] = await qr.query(`SELECT id, ${classIdCol} FROM students WHERE ${studentNoCol} = ?`, [no])
        const stu = results?.[0]
        if (stu) {
          const parentIdCol = dc('students', 'parentId')
          await qr.query(`UPDATE students SET ${parentIdCol} = ? WHERE id = ?`, [crossParentId, stu.id])
          // Generate unique openId per student to satisfy UNIQUE constraint
          const uniqueOpenId = `cross_${stu.id.slice(0, 8)}`
          spRows.push([uid(), now(), now(), stu.id, crossParentId, uniqueOpenId, '家长', crossSchoolParentName, '', true, '', stu[classIdCol]])
        }
      } finally {
        if (qr) await qr.release()
      }
    }
    if (spRows.length > 0) {
      await batchInsert(ds, 'student_parents', spCols, spRows, 50)
    }
    multiChildFamilies.push({ parentPhone: crossSchoolParentPhone, parentName: crossSchoolParentName, studentNos: crossSchoolStudentNos })
  }

  // Count enrichment data
  const noticeCount = await ds.getRepository('notices').count()
  const messageCount = await ds.getRepository('messages').count()
  const noteCount = await ds.getRepository('notes').count()
  const notificationCount = await ds.getRepository('notifications').count()

  return {
    schools,
    multiChildFamilies,
    teacherAsParent,
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