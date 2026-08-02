/**
 * 一键生成测试数据
 *
 * 生成内容（每校）：
 *   - 1 个学校 + 1 个校管（school_admins）
 *   - 20 名教师（users），职务各不相同、任教学科不同
 *   - 3 个班级，每班 1 名班主任 + 按科目分配的科任老师（class_members）
 *   - 每班 20 名学生 + 对应家长（parents / student_parents）
 *   - 每班 6 次“全部科目”考试 + 3 次“仅语数外”考试，并生成每位学生的成绩（grades）
 *   - 每校 1 条学校公告 + 每班 1 条班级公告（notices）
 *   - 每班一份每周课表（schedules，5 天 × 7 节）
 *   - 教学资源库种子数据（古诗词 30 首 + 数学公式 23 条 + 英语单词 120 个）
 *   - 教材知识库种子数据（人教版语文/数学 + 外研版英语，共 32 本教材含单元与知识点）
 *
 * 运行：在 server/ 目录执行 `npm run seed`（或 `npx tsx scripts/seed-data.ts`）
 * 幂等：若已存在 seed-manifest.json，会先清除旧数据再重新生成。
 */
import 'reflect-metadata'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

import { School } from '../src/school/school.entity'
import { SchoolAdmin } from '../src/school-admin/school-admin.entity'
import { User } from '../src/users/user.entity'
import { ClassItem } from '../src/classes/class.entity'
import { ClassMember } from '../src/class-members/class-member.entity'
import { Student } from '../src/students/student.entity'
import { Parent } from '../src/parent/parent.entity'
import { StudentParent } from '../src/student-parent/student-parent.entity'
import { Exam } from '../src/exams/exam.entity'
import { Grade } from '../src/grades/grade.entity'
import { Notice, ScheduleItem } from '../src/school/school.entity'
import { Poem, MathFormula, EnglishWord } from '../src/resource-library/resource-library.entity'
import { SEED_POEMS, SEED_MATH_FORMULAS, SEED_ENGLISH_WORDS } from '../src/resource-library/resource-library.seed-data'
import { Textbook, TextbookUnit, TextbookKnowledgePoint } from '../src/textbook/textbook.entity'
import { SEED_TEXTBOOKS } from '../src/textbook/textbook.seed-data'

import {
  buildDataSource, SEED_CONFIG, ALL_SUBJECTS, CORE_SUBJECTS, GRADES, POSITIONS,
  SURNAMES, GIVEN, randInt, pick, genName, genSchoolCode,
  loadManifest, saveManifest, clearManifest, clearByManifest, MANIFEST_PATH,
} from './seed-common'

const SCHOOL_PREFIXES = ['XA', 'XB', 'XC', 'XD', 'XE']
const NOTICE_TITLES = ['家长会通知', '作业提醒', '安全教育告家长书', '期中表彰名单', '春季运动会安排']

async function main() {
  const ds = buildDataSource()
  await ds.initialize()
  console.log('✅ 数据库连接成功')

  const prev = loadManifest()
  if (prev) {
    console.log('⚠ 发现旧种子清单，先清除再重新生成...')
    await clearByManifest(ds, prev)
    clearManifest()
  }

  const m: Record<string, string[]> = {
    schools: [], schoolAdmins: [], teachers: [], classes: [], classMembers: [],
    students: [], parents: [], studentParents: [], exams: [], grades: [],
    notices: [], schedules: [],
  }
  const pwHash = bcrypt.hashSync(SEED_CONFIG.defaultPassword, 10)

  for (let s = 0; s < SEED_CONFIG.schools; s++) {
    const grade = GRADES[s]
    const code = await genSchoolCode(SCHOOL_PREFIXES[s], ds)
    const school = await ds.getRepository(School).save(ds.getRepository(School).create({
      code, name: `${grade}测试学校${s + 1}`, address: '测试市测试区1号',
      contact: '教务处', phone: `1380000000${s}`, status: 'active',
    }))
    m.schools.push(school.id)

    // 校管
    const adminUsername = `sa${s + 1}`
    const admin = await ds.getRepository(SchoolAdmin).save(ds.getRepository(SchoolAdmin).create({
      username: adminUsername, passwordHash: pwHash, name: `${grade}校管理员`,
      schoolId: school.id,
      permissions: ['teachers', 'classes', 'students', 'exams', 'grades', 'attendance',
        'schedule', 'homework', 'notices', 'ai', 'tools', 'games', 'finance', 'activities', 'rewards', 'parents'],
      enabled: true,
    }))
    m.schoolAdmins.push(admin.id)

    // 教师（20 名，职务/学科各不相同）
    const teachers: any[] = []
    for (let t = 0; t < SEED_CONFIG.teachersPerSchool; t++) {
      const teacherNo = 'JS' + code + String(t + 1).padStart(5, '0')
      const subject = ALL_SUBJECTS[t % ALL_SUBJECTS.length]
      const position = POSITIONS[t % POSITIONS.length]
      const name = genName()
      const u = await ds.getRepository(User).save(ds.getRepository(User).create({
        username: teacherNo, passwordHash: pwHash, name, schoolId: school.id,
        school: school.name, subject, subjects: [subject], position,
        positions: [position], grade, teacherNo, enabled: true, gender: pick(['男', '女']),
      }))
      teachers.push(u)
      m.teachers.push(u.id)
    }

    // 科目 -> 教师ID 映射（用于分配科任老师）
    const subjectTeacherMap: Record<string, string[]> = {}
    for (const subj of ALL_SUBJECTS) {
      subjectTeacherMap[subj] = teachers
        .filter((t: any) => (t.subjects || []).includes(subj))
        .map((t: any) => t.id)
    }

    // 班级
    for (let c = 0; c < SEED_CONFIG.classesPerSchool; c++) {
      const head = teachers[c % teachers.length]
      const className = `${grade}${c + 1}班`
      const cls = await ds.getRepository(ClassItem).save(ds.getRepository(ClassItem).create({
        name: className, grade, classNo: String(c + 1), headTeacher: head.name,
        term: '2026春季', subjects: ALL_SUBJECTS, color: 'butter', slogan: '勤奋向上',
      }))
      m.classes.push(cls.id)

      // 班主任（head）
      const headMember = await ds.getRepository(ClassMember).save(ds.getRepository(ClassMember).create({
        classId: cls.id, teacherId: head.id, className, role: 'head',
        subjects: [head.subject], term: '2026春季',
      }))
      m.classMembers.push(headMember.id)

      // 科任老师（按科目分配，尽量避开班主任本人）
      for (const subj of ALL_SUBJECTS) {
        const candidates = subjectTeacherMap[subj] || []
        const tid = candidates.find((id: string) => id !== head.id) || candidates[0]
        if (!tid) continue
        const sm = await ds.getRepository(ClassMember).save(ds.getRepository(ClassMember).create({
          classId: cls.id, teacherId: tid, className, role: 'subject',
          subjects: [subj], term: '2026春季',
        }))
        m.classMembers.push(sm.id)
      }

      // 学生 + 家长
      const students: any[] = []
      for (let st = 0; st < SEED_CONFIG.studentsPerClass; st++) {
        const surname = pick(SURNAMES)
        const name = surname + pick(GIVEN)
        const studentNo = `${s + 1}${c + 1}${String(st + 1).padStart(2, '0')}`
        const gender = pick(['男', '女'])
        const parentPhone = '1' + pick(['3', '5', '7', '8', '9']) + randInt(100000000, 999999999).toString()
        const stu = await ds.getRepository(Student).save(ds.getRepository(Student).create({
          classId: cls.id, name, gender, studentNo,
          birthDate: `201${randInt(2, 8)}-0${randInt(1, 9)}-${String(randInt(1, 28)).padStart(2, '0')}`,
          seatNo: st + 1, parentName: surname + '家长', parentPhone,
          address: `测试市测试区${st + 1}号`, parentLoginEnabled: true,
          parentPasswordHash: pwHash, teacherId: head.id,
        }))
        students.push(stu)
        m.students.push(stu.id)

        // 家长
        const relation = pick(['父亲', '母亲'])
        const parentName = surname + pick(GIVEN)
        const parent = await ds.getRepository(Parent).save(ds.getRepository(Parent).create({
          phone: parentPhone, parentName, relation, passwordHash: pwHash,
        }))
        m.parents.push(parent.id)

        // 学生-家长绑定
        const openId = 'wx_' + crypto.randomBytes(12).toString('hex')
        const sp = await ds.getRepository(StudentParent).save(ds.getRepository(StudentParent).create({
          studentId: stu.id, parentId: parent.id, openId, relation,
          nickName: parentName, isPrimary: true, schoolId: school.id, classId: cls.id,
        }))
        m.studentParents.push(sp.id)

        // 回填学生主家长
        stu.parentId = parent.id
        stu.parentNickName = parentName
        await ds.getRepository(Student).save(stu)
      }

      // 考试：6 次全科目 + 3 次语数外
      const exams: any[] = []
      for (let e = 0; e < SEED_CONFIG.fullExams; e++) {
        const exam = await ds.getRepository(Exam).save(ds.getRepository(Exam).create({
          term: '2026春季', name: `第${e + 1}次月考`, teacherName: head.name,
          classId: cls.id, subjects: ALL_SUBJECTS,
          subjectFullScores: Object.fromEntries(ALL_SUBJECTS.map((x) => [x, 100])),
          date: `2026-0${e + 2}-1${e % 9 + 1}`, note: '', teacherId: head.id,
        }))
        exams.push(exam)
        m.exams.push(exam.id)
      }
      for (let e = 0; e < SEED_CONFIG.partialExams; e++) {
        const exam = await ds.getRepository(Exam).save(ds.getRepository(Exam).create({
          term: '2026春季', name: `第${e + 1}次语数外测验`, teacherName: head.name,
          classId: cls.id, subjects: CORE_SUBJECTS,
          subjectFullScores: Object.fromEntries(CORE_SUBJECTS.map((x) => [x, 100])),
          date: `2026-0${SEED_CONFIG.fullExams + e + 2}-0${e + 1}`, note: '', teacherId: head.id,
        }))
        exams.push(exam)
        m.exams.push(exam.id)
      }

      // 成绩（按 班级+考试+科目 upsert，与后端 import-commit 逻辑一致）
      for (const exam of exams) {
        for (const subj of exam.subjects) {
          const scores = students.map((st: any) => ({ studentId: st.id, score: randInt(40, 100) }))
          const where = { classId: cls.id, examName: exam.name, subject: subj, teacherId: head.id }
          const existing = await ds.getRepository(Grade).findOne({ where: where as any })
          if (existing) {
            existing.scores = scores
            existing.date = exam.date
            existing.examId = exam.id
            await ds.getRepository(Grade).save(existing)
            m.grades.push(existing.id)
          } else {
            const g = await ds.getRepository(Grade).save(ds.getRepository(Grade).create({
              classId: cls.id, subject: subj, examName: exam.name, examId: exam.id,
              date: exam.date, scores, teacherId: head.id,
            }))
            m.grades.push(g.id)
          }
        }
      }

      // 班级公告
      const notice = await ds.getRepository(Notice).save(ds.getRepository(Notice).create({
        teacherId: head.id, classId: cls.id,
        title: `${className}：${pick(NOTICE_TITLES)}`, content: '这是测试公告内容。',
        scope: 'class', pinned: false, ended: false,
      }))
      m.notices.push(notice.id)

      // 课表：5 天 × 7 节
      for (let d = 1; d <= 5; d++) {
        for (let p = 1; p <= 7; p++) {
          const subj = ALL_SUBJECTS[(d * 7 + p) % ALL_SUBJECTS.length]
          const tid = (subjectTeacherMap[subj] || [])[0]
          const teacherName = tid ? (teachers.find((t: any) => t.id === tid)?.name || head.name) : head.name
          const sched = await ds.getRepository(ScheduleItem).save(ds.getRepository(ScheduleItem).create({
            classId: cls.id, dayOfWeek: d, period: p, weekType: 'all',
            subject: subj, teacher: teacherName, note: '', teacherId: head.id,
          }))
          m.schedules.push(sched.id)
        }
      }
    }

    // 学校公告
    const sn = await ds.getRepository(Notice).save(ds.getRepository(Notice).create({
      teacherId: admin.id, classId: '__school__', title: `${school.name}开学公告`,
      content: `欢迎来到${school.name}，本学期正式开始。`, scope: 'school', pinned: true, ended: false,
    }))
    m.notices.push(sn.id)

    // 教学资源库（古诗词 / 数学公式 / 英语单词）
    for (const seed of SEED_POEMS) {
      const p = await ds.getRepository(Poem).save(ds.getRepository(Poem).create({
        schoolId: school.id, title: seed.title, dynasty: seed.dynasty, author: seed.author,
        content: seed.content, translation: seed.translation || '', appreciation: seed.appreciation || '',
        grade: seed.grade, keywords: seed.keywords, status: 'published',
      }))
    }
    for (const seed of SEED_MATH_FORMULAS) {
      const f = await ds.getRepository(MathFormula).save(ds.getRepository(MathFormula).create({
        schoolId: school.id, title: seed.title, category: seed.category, formula: seed.formula,
        explanation: seed.explanation || '', example: seed.example || '',
        grade: seed.grade, keywords: seed.keywords, status: 'published',
      }))
    }
    for (const seed of SEED_ENGLISH_WORDS) {
      const w = await ds.getRepository(EnglishWord).save(ds.getRepository(EnglishWord).create({
        schoolId: school.id, word: seed.word, phonetic: seed.phonetic, meaning: seed.meaning,
        category: seed.category, example: seed.example || '', grade: seed.grade,
        status: 'published',
      }))
    }

    // 教材知识库（人教版语文/数学 + 外研版英语，共 32 本）
    for (const seed of SEED_TEXTBOOKS) {
      const existing = await ds.getRepository(Textbook).findOne({
        where: { schoolId: school.id, publisher: seed.publisher, subject: seed.subject, grade: seed.grade, term: seed.term },
      })
      if (existing) continue
      const tb = await ds.getRepository(Textbook).save(ds.getRepository(Textbook).create({
        schoolId: school.id, publisher: seed.publisher, subject: seed.subject,
        grade: seed.grade, term: seed.term, name: seed.name, status: 'published',
      }))
      for (let i = 0; i < seed.units.length; i++) {
        const su = seed.units[i]
        const unit = await ds.getRepository(TextbookUnit).save(ds.getRepository(TextbookUnit).create({
          textbookId: tb.id, unitOrder: i + 1, title: su.title, summary: su.summary || '',
        }))
        for (let j = 0; j < su.points.length; j++) {
          const sp = su.points[j]
          await ds.getRepository(TextbookKnowledgePoint).save(ds.getRepository(TextbookKnowledgePoint).create({
            unitId: unit.id, pointOrder: j + 1,
            title: sp.title, type: sp.type, content: sp.content,
            difficulty: sp.difficulty, keywords: sp.keywords,
          }))
        }
      }
    }

    console.log(`  ✓ 学校[${school.name}] 完成：校管 sa${s + 1} / 教师 ${teachers.length} / 班级 ${SEED_CONFIG.classesPerSchool}`)
  }

  saveManifest(m)
  console.log('\n✅ 测试数据生成完成')
  console.log(`   学校 ${m.schools.length} · 校管 ${m.schoolAdmins.length} · 教师 ${m.teachers.length} · 班级 ${m.classes.length}`)
  console.log(`   学生 ${m.students.length} · 家长 ${m.parents.length} · 考试 ${m.exams.length} · 成绩 ${m.grades.length}`)
  console.log(`   公告 ${m.notices.length} · 课表 ${m.schedules.length}`)
  console.log(`\n🔑 默认登录口令：${SEED_CONFIG.defaultPassword}`)
  console.log(`   校管账号示例：sa1 / ${SEED_CONFIG.defaultPassword}`)
  console.log(`   教师账号示例：教师编号（如 JS<学校编号>00001，即 username=teacherNo） / ${SEED_CONFIG.defaultPassword}`)
  console.log(`   清单已写入：${MANIFEST_PATH}`)

  await ds.destroy()
}

main().catch((e) => {
  console.error('❌ 生成失败:', e?.message || e)
  if (e?.stack) console.error(e.stack)
  process.exit(1)
})
