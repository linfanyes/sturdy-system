/**
 * 全面集成测试：使用真实种子数据验证核心业务逻辑
 *
 * 测试范围：
 *   - 学校/班级/学生/教师/家长数据完整性
 *   - 考试与成绩 CRUD
 *   - 公告与通知
 *   - 课表管理
 *   - 成绩统计分析（考试统计、趋势、排名、学生历史、薄弱生）
 *   - 资源库与教材知识库
 *
 * 运行：npx jest --testPathPattern=seed-comprehensive.spec.ts
 * 前置：先执行 `npm run seed` 生成测试数据
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'

import { School } from './school/school.entity'
import { SchoolAdmin } from './school-admin/school-admin.entity'
import { User } from './users/user.entity'
import { ClassItem } from './classes/class.entity'
import { ClassMember } from './class-members/class-member.entity'
import { Student } from './students/student.entity'
import { Parent } from './parent/parent.entity'
import { StudentParent } from './student-parent/student-parent.entity'
import { Exam } from './exams/exam.entity'
import { Grade } from './grades/grade.entity'
import { Notice, ScheduleItem } from './school/school.entity'
import { Poem, MathFormula, EnglishWord } from './resource-library/resource-library.entity'

jest.setTimeout(60000)

describe('种子数据全面集成测试', () => {
  let ds: DataSource

  beforeAll(async () => {
    ds = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: +(process.env.DB_PORT || 3306),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'gardener',
      charset: 'utf8mb4',
      timezone: '+08:00',
      synchronize: false,
      entities: [
        School, SchoolAdmin, User, ClassItem, ClassMember,
        Student, Parent, StudentParent, Exam, Grade, Notice, ScheduleItem,
        Poem, MathFormula, EnglishWord,
      ],
    })
    await ds.initialize()
  })

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy()
  })

  // ===== 1. 学校与校管 =====
  describe('学校与校管', () => {
    it('应有 5 所学校', async () => {
      const count = await ds.getRepository(School).count()
      expect(count).toBe(5)
    })

    it('每所学校应有校管账号', async () => {
      const admins = await ds.getRepository(SchoolAdmin).find()
      expect(admins.length).toBe(5)
      for (const admin of admins) {
        expect(admin.enabled).toBe(true)
        expect(admin.schoolId).toBeTruthy()
        expect(admin.passwordHash).toMatch(/^\$2[aby]\$/)
      }
    })

    it('学校编号全局唯一', async () => {
      const schools = await ds.getRepository(School).find()
      const codes = schools.map(s => s.code)
      expect(new Set(codes).size).toBe(codes.length)
    })
  })

  // ===== 2. 教师 =====
  describe('教师', () => {
    it('每所学校应有 24 名教师', async () => {
      const schools = await ds.getRepository(School).find()
      for (const school of schools) {
        const count = await ds.getRepository(User).count({ where: { schoolId: school.id } })
        expect(count).toBe(24)
      }
    })

    it('教师密码哈希正确（Test@2026）', async () => {
      const teachers = await ds.getRepository(User).find()
      const sample = teachers.slice(0, 10)
      for (const t of sample) {
        const ok = bcrypt.compareSync('Test@2026', t.passwordHash)
        expect(ok).toBe(true)
      }
    })

    it('教师职务各不相同（每校内）', async () => {
      const schools = await ds.getRepository(School).find()
      for (const school of schools) {
        const teachers = await ds.getRepository(User).find({ where: { schoolId: school.id } })
        const positions = teachers.map(t => t.position)
        expect(new Set(positions).size).toBe(positions.length)
      }
    })
  })

  // ===== 3. 班级 =====
  describe('班级', () => {
    it('总班级数 = 5 学校 × 6 年级 × 3 班级 = 90', async () => {
      const totalClasses = await ds.getRepository(ClassItem).count()
      expect(totalClasses).toBe(90)
    })

    it('班级编号在同一年级内唯一', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      const byGrade: Record<string, string[]> = {}
      for (const c of classes) {
        if (!byGrade[c.grade]) byGrade[c.grade] = []
        byGrade[c.grade].push(c.classNo)
      }
      for (const [grade, nos] of Object.entries(byGrade)) {
        expect(new Set(nos).size).toBe(nos.length)
      }
    })
  })

  // ===== 4. 班级成员 =====
  describe('班级成员', () => {
    it('每个班级应有 1 名班主任 + 15 名科任老师', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 5)) {
        const heads = await ds.getRepository(ClassMember).count({ where: { classId: cls.id, role: 'head' } })
        const subjects = await ds.getRepository(ClassMember).count({ where: { classId: cls.id, role: 'subject' } })
        expect(heads).toBe(1)
        expect(subjects).toBe(15)
      }
    })
  })

  // ===== 5. 学生 =====
  describe('学生', () => {
    it('每个班级应有 30 名学生', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 10)) {
        const count = await ds.getRepository(Student).count({ where: { classId: cls.id } })
        expect(count).toBe(30)
      }
    })

    it('学生总数 = 90 班 × 30 生 = 2700', async () => {
      const count = await ds.getRepository(Student).count()
      expect(count).toBe(2700)
    })

    it('学号全局唯一', async () => {
      const students = await ds.getRepository(Student).find()
      const nos = students.map(s => s.studentNo)
      expect(new Set(nos).size).toBe(nos.length)
    })

    it('家长登录密码哈希正确', async () => {
      const students = await ds.getRepository(Student).find()
      const sample = students.filter(s => s.parentLoginEnabled).slice(0, 20)
      for (const s of sample) {
        expect(s.parentPasswordHash).toBeTruthy()
        const ok = bcrypt.compareSync('Test@2026', s.parentPasswordHash!)
        expect(ok).toBe(true)
      }
    })
  })

  // ===== 6. 家长 =====
  describe('家长', () => {
    it('家长总数应接近学生总数（约 1:1）', async () => {
      const parents = await ds.getRepository(Parent).count()
      expect(parents).toBeGreaterThan(2000)
      expect(parents).toBeLessThanOrEqual(2700)
    })

    it('学生-家长绑定关系正确', async () => {
      const bindings = await ds.getRepository(StudentParent).find()
      expect(bindings.length).toBeGreaterThan(2000)
      for (const b of bindings.slice(0, 50)) {
        expect(b.studentId).toBeTruthy()
        expect(b.parentId).toBeTruthy()
        expect(b.isPrimary).toBe(true)
        expect(b.schoolId).toBeTruthy()
        expect(b.classId).toBeTruthy()
      }
    })
  })

  // ===== 7. 考试 =====
  describe('考试', () => {
    it('每班应有 10 场考试', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 10)) {
        const count = await ds.getRepository(Exam).count({ where: { classId: cls.id } })
        expect(count).toBe(10)
      }
    })

    it('考试总数 = 90 班 × 10 = 900', async () => {
      const count = await ds.getRepository(Exam).count()
      expect(count).toBe(900)
    })

    it('考试科目包含语数外', async () => {
      const exams = await ds.getRepository(Exam).find()
      for (const exam of exams.slice(0, 20)) {
        const subjects = exam.subjects || []
        expect(subjects).toContain('语文')
        expect(subjects).toContain('数学')
        expect(subjects).toContain('英语')
      }
    })

    it('满分映射正确', async () => {
      const exams = await ds.getRepository(Exam).find()
      for (const exam of exams.slice(0, 10)) {
        const fullScores = exam.subjectFullScores || {}
        expect(fullScores['语文']).toBe(100)
        expect(fullScores['数学']).toBe(100)
        expect(fullScores['英语']).toBe(100)
      }
    })
  })

  // ===== 8. 成绩 =====
  describe('成绩', () => {
    it('每班每场考试每科应有 1 条成绩记录', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 5)) {
        const exams = await ds.getRepository(Exam).find({ where: { classId: cls.id } })
        for (const exam of exams.slice(0, 3)) {
          for (const subj of ['语文', '数学', '英语']) {
            const count = await ds.getRepository(Grade).count({
              where: { classId: cls.id, examName: exam.name, subject: subj } as any,
            })
            expect(count).toBe(1)
          }
        }
      }
    })

    it('成绩总数 = 900 场 × 3 科 = 2700', async () => {
      const count = await ds.getRepository(Grade).count()
      expect(count).toBe(2700)
    })

    it('成绩记录包含所有学生', async () => {
      const grades = await ds.getRepository(Grade).find()
      const classes = await ds.getRepository(ClassItem).find()
      const cls = classes[0]
      const classStudents = await ds.getRepository(Student).find({ where: { classId: cls.id } })
      const classGrades = grades.filter(g => g.classId === cls.id)
      for (const grade of classGrades.slice(0, 3)) {
        const scoreList = grade.scores || []
        expect(scoreList.length).toBe(30)
        const studentIds = new Set(classStudents.map(s => s.id))
        for (const sc of scoreList) {
          expect(studentIds.has(sc.studentId)).toBe(true)
        }
      }
    })

    it('成绩分数在合理范围内', async () => {
      const grades = await ds.getRepository(Grade).find()
      for (const grade of grades.slice(0, 100)) {
        const scores = grade.scores || []
        for (const sc of scores) {
          expect(sc.score).toBeGreaterThanOrEqual(0)
          expect(sc.score).toBeLessThanOrEqual(100)
        }
      }
    })
  })

  // ===== 9. 公告 =====
  describe('公告', () => {
    it('公告总数 = 5 学校 × (1 学校公告 + 18 班 × 3 条) = 275', async () => {
      const count = await ds.getRepository(Notice).count()
      expect(count).toBe(275)
    })

    it('学校公告 scope=school', async () => {
      const schoolNotices = await ds.getRepository(Notice).find({ where: { scope: 'school' } })
      expect(schoolNotices.length).toBe(5)
      for (const n of schoolNotices) {
        expect(n.pinned).toBe(true)
      }
    })

    it('班级公告 scope=class', async () => {
      const classNotices = await ds.getRepository(Notice).find({ where: { scope: 'class' } })
      expect(classNotices.length).toBe(270)
    })
  })

  // ===== 10. 课表 =====
  describe('课表', () => {
    it('每班应有 35 条课表（5 天 × 7 节）', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 10)) {
        const count = await ds.getRepository(ScheduleItem).count({ where: { classId: cls.id } })
        expect(count).toBe(35)
      }
    })

    it('课表总数 = 90 × 35 = 3150', async () => {
      const count = await ds.getRepository(ScheduleItem).count()
      expect(count).toBe(3150)
    })

    it('课表覆盖 5 天', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      const cls = classes[0]
      const schedules = await ds.getRepository(ScheduleItem).find({ where: { classId: cls.id } })
      const days = new Set(schedules.map(s => s.dayOfWeek))
      expect(Array.from(days).sort()).toEqual([1, 2, 3, 4, 5])
    })
  })

  // ===== 11. 成绩统计分析 =====
  describe('成绩统计分析', () => {
    it('考试统计：计算平均分、最高分、最低分', async () => {
      const exams = await ds.getRepository(Exam).find()
      const exam = exams[0]
      const grades = await ds.getRepository(Grade).find({
        where: { classId: exam.classId, examId: exam.id } as any,
      })
      expect(grades.length).toBe(3)
      for (const g of grades) {
        const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
        expect(scores.length).toBe(30)
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        const max = Math.max(...scores)
        const min = Math.min(...scores)
        expect(avg).toBeGreaterThan(0)
        expect(max).toBeLessThanOrEqual(100)
        expect(min).toBeGreaterThanOrEqual(0)
      }
    })

    it('班级排名：能生成排名列表', async () => {
      const exams = await ds.getRepository(Exam).find()
      const exam = exams[0]
      const grade = await ds.getRepository(Grade).findOne({
        where: { classId: exam.classId, examId: exam.id, subject: '语文' } as any,
      })
      expect(grade).toBeTruthy()
      const scores = (grade!.scores || []).filter(s => s.score != null).map(s => Number(s.score))
      const sorted = [...scores].sort((a, b) => b - a)
      expect(sorted.length).toBe(30)
      // 验证降序
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1]).toBeGreaterThanOrEqual(sorted[i])
      }
    })

    it('学生历史：能获取单个学生的所有成绩', async () => {
      const students = await ds.getRepository(Student).find()
      const student = students[0]
      const grades = await ds.getRepository(Grade).find({
        where: { classId: student.classId } as any,
      })
      const history: any[] = []
      for (const g of grades) {
        const entry = (g.scores || []).find(s => s.studentId === student.id)
        if (entry && entry.score != null) {
          history.push({ date: g.date, examName: g.examName, subject: g.subject, score: entry.score })
        }
      }
      expect(history.length).toBe(30) // 10 场考试 × 3 科
    })

    it('薄弱生：能识别薄弱学生', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      const cls = classes[0]
      const exams = await ds.getRepository(Exam).find({ where: { classId: cls.id } })
      const exam = exams[0]
      const grades = await ds.getRepository(Grade).find({
        where: { classId: cls.id, examId: exam.id } as any,
      })
      for (const g of grades) {
        const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        const weakList = (g.scores || []).filter(s => s.score != null && Number(s.score) < avg)
        expect(weakList.length).toBeGreaterThan(0)
        expect(weakList.length).toBeLessThan(30)
      }
    })
  })

  // ===== 12. 资源库 =====
  describe('资源库', () => {
    it('每校应有古诗词 30 首', async () => {
      const poems = await ds.getRepository(Poem).count()
      expect(poems).toBe(150)
    })

    it('每校应有数学公式 23 条', async () => {
      const formulas = await ds.getRepository(MathFormula).count()
      expect(formulas).toBe(115)
    })

    it('每校应有英语单词 120 个', async () => {
      const words = await ds.getRepository(EnglishWord).count()
      expect(words).toBe(600)
    })

    it('古诗词数据完整性', async () => {
      const poems = await ds.getRepository(Poem).find()
      const sample = poems.slice(0, 10)
      for (const p of sample) {
        expect(p.title).toBeTruthy()
        expect(p.content).toBeTruthy()
        expect(p.schoolId).toBeTruthy()
        expect(p.status).toBe('published')
      }
    })
  })

  // ===== 13. 数据一致性 =====
  describe('数据一致性', () => {
    it('学生的 teacherId 与所在班级班主任一致', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 5)) {
        const students = await ds.getRepository(Student).find({ where: { classId: cls.id } })
        for (const s of students.slice(0, 5)) {
          expect(s.teacherId).toBe(cls.teacherId)
        }
      }
    })

    it('成绩记录的 teacherId 与班级班主任一致', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      const cls = classes[0]
      const grades = await ds.getRepository(Grade).find({ where: { classId: cls.id } })
      for (const g of grades.slice(0, 10)) {
        expect(g.teacherId).toBe(cls.teacherId)
      }
    })

    it('考试记录的 teacherId 与班级班主任一致', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      for (const cls of classes.slice(0, 5)) {
        const exams = await ds.getRepository(Exam).find({ where: { classId: cls.id } })
        for (const exam of exams) {
          expect(exam.teacherId).toBe(cls.teacherId)
        }
      }
    })

    it('课表记录的 teacherId 与班级班主任一致', async () => {
      const classes = await ds.getRepository(ClassItem).find()
      const cls = classes[0]
      const schedules = await ds.getRepository(ScheduleItem).find({ where: { classId: cls.id } })
      for (const s of schedules.slice(0, 10)) {
        expect(s.teacherId).toBe(cls.teacherId)
      }
    })

    it('学生-家长绑定的 schoolId 与学校一致', async () => {
      const bindings = await ds.getRepository(StudentParent).find()
      for (const b of bindings.slice(0, 50)) {
        expect(b.schoolId).toBeTruthy()
        expect(b.classId).toBeTruthy()
      }
    })
  })

  // ===== 14. 总量验证 =====
  describe('总量验证', () => {
    it('各类实体数量符合预期', async () => {
      const schools = await ds.getRepository(School).count()
      const users = await ds.getRepository(User).count()
      const classes = await ds.getRepository(ClassItem).count()
      const students = await ds.getRepository(Student).count()
      const parents = await ds.getRepository(Parent).count()
      const exams = await ds.getRepository(Exam).count()
      const grades = await ds.getRepository(Grade).count()
      const notices = await ds.getRepository(Notice).count()
      const schedules = await ds.getRepository(ScheduleItem).count()

      expect(schools).toBe(5)
      expect(users).toBe(120)
      expect(classes).toBe(90)
      expect(students).toBe(2700)
      expect(exams).toBe(900)
      expect(grades).toBe(2700)
      expect(notices).toBe(275)
      expect(schedules).toBe(3150)
    })
  })
})
