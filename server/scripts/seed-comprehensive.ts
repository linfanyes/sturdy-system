/**
 * 全面测试数据生成脚本
 *
 * 生成规模：
 *   20 所学校 × 6 年级 × 8 班级 × 60 学生 + 6 教师/校
 *   + 家长信息 + 3 学期 × 10 考试 × 各科成绩
 *   + 多娃家长（跨班/跨校）+ 师兼家
 *
 * 运行：npx tsx scripts/seed-comprehensive.ts
 *
 * 使用独立 DataSource 直连，不依赖 Nest 应用。
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { v4 as uuid } from 'uuid'

// ===== 配置 ====
const CONFIG = {
  SCHOOLS: 5,
  GRADES: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] as const,
  CLASSES_PER_GRADE: 2,
  STUDENTS_PER_CLASS: 30,
  TEACHERS_PER_SCHOOL: 6,
  EXAMS_PER_SEMESTER: 4,
  SEMESTERS: ['2025春季', '2025秋季', '2026春季'] as const,
  PASSWORD: 'Test@2026',
  MULTI_CHILD_COUNT: 5,           // 跨班多娃家长数
  CROSS_SCHOOL_PARENT_COUNT: 3,   // 跨校多娃家长数
  TEACHER_AS_PARENT_COUNT: 10,    // 师兼家数
}

const ALL_SUBJECTS = ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术', '综合实践']
const CORE_SUBJECTS = ['语文', '数学', '英语']
const EXAM_NAMES = ['第一次月考', '期中考试', '第二次月考', '第三次月考', '第四次月考', '第五次月考', '第六次月考', '第七次月考', '期末考试', '摸底考试']
const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '胡', '朱', '郭', '何', '罗', '高', '林', '郑', '梁', '谢', '宋', '唐', '韩', '曹', '许', '邓', '冯', '曾', '程', '蔡', '彭', '潘', '袁', '于', '董', '余', '苏', '叶', '吕', '魏', '蒋', '田', '杜', '丁', '沈', '姜', '范']
const GIVEN_NAMES = ['伟', '芳', '敏', '静', '丽', '强', '磊', '洋', '勇', '艳', '杰', '娜', '军', '秀英', '涛', '明', '超', '秀兰', '霞', '平', '刚', '文', '华', '飞', '桂花', '鑫', '波', '斌', '桂英', '宇', '辉', '玲', '浩', '建', '娟', '宁', '帅', '岩', '红', '峰', '婷', '雪', '琳', '鹏', '晨', '鹏', '蕊', '阳', '博', '志强']

function pick<T>(arr: readonly T[] | T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] { const s = new Set<T>(); while (s.size < n) s.add(pick(arr)); return [...s] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randScore(): number | null { return Math.random() < 0.02 ? null : randInt(30, 100) }

const hash = bcrypt.hashSync(CONFIG.PASSWORD, 10)

// 构建 DataSource（直接连本地 MySQL）
function buildDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || 'gardener_test',
    synchronize: false,
    entities: [],
  })
}

async function main() {
  const ds = buildDataSource()
  await ds.initialize()
  console.log('✅ 数据库连接成功，开始生成测试数据...\n')

  const schoolIds: string[] = []
  const schoolNames: string[] = []
  const allTeachers: { id: string; name: string; schoolId: string; schoolName: string }[] = []
  const allStudents: { id: string; name: string; classId: string; schoolId: string; studentNo: string }[] = []
  const allParents: { id: string; name: string; phone: string }[] = []
  const allExams: { id: string; name: string; classId: string }[] = []

  // ===== 1. 创建学校 + 校管 =====
  console.log('🏫 创建学校与校管...')
  const qr = ds.createQueryRunner()
  await qr.connect()
  await qr.startTransaction()

  try {
    for (let si = 1; si <= CONFIG.SCHOOLS; si++) {
      const schoolId = uuid()
      const schoolName = `第${si}实验小学`
      const prefix = `S${String(si).padStart(2, '0')}`
      await qr.query(
        `INSERT INTO schools (id, code, name, address, status) VALUES (?, ?, ?, ?, 'active')`,
        [schoolId, prefix + '000000H', schoolName, `测试地址${si}号`]
      )
      schoolIds.push(schoolId)
      schoolNames.push(schoolName)

      // 校管
      const adminId = uuid()
      await qr.query(
        `INSERT INTO school_admins (id, username, passwordHash, name, schoolId, enabled) VALUES (?, ?, ?, ?, ?, 1)`,
        [adminId, `sa_school_${si}`, hash, `${schoolName}主任`, schoolId]
      )
    }
    console.log(`   ✅ 20 所学校 + 20 位校管创建完成`)

    // ===== 2. 每校创建教师 + 班级 + 学生 + 家长 =====
    console.log('👨‍🏫 创建教师...')
    const teacherSubjects = ['语文', '数学', '英语', '科学', '美术', '音乐', '体育', '信息技术']
    let teacherCount = 0
    let studentCount = 0
    let parentCount = 0

    for (let si = 0; si < CONFIG.SCHOOLS; si++) {
      const schoolId = schoolIds[si]
      const schoolName = schoolNames[si]

      // 教师
      const schoolTeachers: { id: string; name: string }[] = []
      for (let ti = 0; ti < CONFIG.TEACHERS_PER_SCHOOL; ti++) {
        const teacherId = uuid()
        const tName = SURNAMES[ti + si * 3 % SURNAMES.length] + (ti === 0 ? '主任' : '老师')
        const tNo = `JS${String(si + 1).padStart(2, '0')}${String(ti + 1).padStart(3, '0')}`
        const subj = teacherSubjects[ti % teacherSubjects.length]
        await qr.query(
          `INSERT INTO users (id, username, passwordHash, name, schoolId, school, subject, teacherNo, enabled, gender, grade)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [teacherId, tNo, hash, tName, schoolId, schoolName, subj, tNo, ti % 2 === 0 ? '男' : '女', pick(CONFIG.GRADES)]
        )
        schoolTeachers.push({ id: teacherId, name: tName })
        allTeachers.push({ id: teacherId, name: tName, schoolId, schoolName })
        teacherCount++
      }

      // 班级 + 学生 + 家长
      for (let gi = 0; gi < CONFIG.GRADES.length; gi++) {
        const grade = CONFIG.GRADES[gi]
        for (let ci = 0; ci < CONFIG.CLASSES_PER_GRADE; ci++) {
          const classId = uuid()
          const className = `${grade}${ci + 1}班`
          const headTeacher = schoolTeachers[ci % schoolTeachers.length]

          await qr.query(
	        `INSERT INTO classes (id, name, grade, classNo, headTeacher, teacherId, term, subjects, color)
	         VALUES (?, ?, ?, ?, ?, ?, '2026春季', ?, 'butter')`,
            [classId, className, grade, String(ci + 1), headTeacher.name, headTeacher.id, JSON.stringify(CORE_SUBJECTS)]
          )

          // 班级成员（班主任）
          await qr.query(
            `INSERT INTO class_members (id, classId, teacherId, className, role, subjects, term)
             VALUES (?, ?, ?, ?, 'head', ?, '2026春季')`,
            [uuid(), classId, headTeacher.id, className, JSON.stringify(CORE_SUBJECTS)]
          )

          // 学生
          const classStudents: { id: string; name: string }[] = []
          for (let stu = 0; stu < CONFIG.STUDENTS_PER_CLASS; stu++) {
            const studentId = uuid()
            const sName = SURNAMES[Math.floor(stu % SURNAMES.length)] + GIVEN_NAMES[Math.floor(stu % GIVEN_NAMES.length)]
            const sNo = `${String(si + 1).padStart(2, '0')}${String(gi + 1).padStart(1, '0')}${String(ci + 1).padStart(1, '0')}${String(stu + 1).padStart(3, '0')}`
            const gender = stu % 2 === 0 ? '男' : '女'

            // 是否开通家长登录（~80%开通）
            const parentEnabled = Math.random() < 0.8

            await qr.query(
              `INSERT INTO students (id, classId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled, parentPasswordHash, teacherId)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              parentEnabled
                ? [studentId, classId, sName, gender, sNo, `${sName}妈妈`, `138${String(20000000 + studentCount).slice(0, 8)}`, 1, hash, headTeacher.id]
                : [studentId, classId, sName, gender, sNo, '', '', 0, null, headTeacher.id]
            )

            classStudents.push({ id: studentId, name: sName })
            allStudents.push({ id: studentId, name: sName, classId, schoolId, studentNo: sNo })
            studentCount++
          }

          // 为开通家长登录的学生创建 Parent + StudentParent
          let classParentCount = 0
          for (const s of classStudents) {
            if (Math.random() < 0.8) {
              const parentId = uuid()
              const parentPhone = `138${String(20000000 + parentCount).slice(0, 8)}`
      await qr.query(
        `INSERT INTO parents (id, openId, phone, parentName, nickName, relation, passwordHash) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [parentId, parentPhone, `${s.name}妈妈`, `${s.name}妈妈`, '母亲', hash]
      )
              await qr.query(
                `INSERT INTO student_parents (id, studentId, parentId, openId, schoolId, classId, isPrimary, nickName, relation) VALUES (?, ?, ?, '', ?, ?, 1, ?, '母亲')`,
                [uuid(), s.id, parentId, schoolId, classId, `${s.name}妈妈`]
              )
              // 回填学生的 parentId
              await qr.query(`UPDATE students SET parentId = ? WHERE id = ?`, [parentId, s.id])
              allParents.push({ id: parentId, name: `${s.name}妈妈`, phone: parentPhone })
              parentCount++
              classParentCount++
            }
          }

          if (si === 0 && gi === 0 && ci === 0) {
            console.log(`   📚 示例: ${schoolName} / ${grade} / ${className} (60生, ${classParentCount}家长)`)
          }
        }
      }
    }

    // 批量提交
    await qr.commitTransaction()
    console.log(`   ✅ ${teacherCount} 位教师 + ${studentCount} 名学生 + ${parentCount} 位家长创建完成\n`)

    // ===== 3. 考试 + 成绩（3 学期） =====
    console.log('📝 创建考试与成绩...')
    let examCount = 0

    // 分批处理，避免事务过大
    const allClassIds = allStudents.reduce((acc, s) => { acc.add(s.classId); return acc }, new Set<string>())
    const classArr = [...allClassIds]
    const BATCH_SIZE = 48 // ~1所学校 = 48个班

    for (let batch = 0; batch < classArr.length; batch += BATCH_SIZE) {
      const batchClassIds = classArr.slice(batch, batch + BATCH_SIZE)
      await qr.startTransaction()

      for (const classId of batchClassIds) {
        const classStudents = allStudents.filter(s => s.classId === classId)

        for (let sem = 0; sem < CONFIG.SEMESTERS.length; sem++) {
          const term = CONFIG.SEMESTERS[sem]

          for (let ei = 0; ei < CONFIG.EXAMS_PER_SEMESTER; ei++) {
            const examId = uuid()
            const examName = `${term.slice(0,4)}${term.slice(-2)}-${EXAM_NAMES[ei]}`
            const date = sem === 0 ? `2025-${String(3 + ei).padStart(2, '0')}-15`
              : sem === 1 ? `2025-${String(9 + ei).padStart(2, '0')}-15`
              : `2026-${String(3 + ei).padStart(2, '0')}-15`

            await qr.query(
	              `INSERT INTO exams (id, term, name, classId, subjects, subjectFullScores, date, teacherId)
	               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [examId, term, examName, classId, JSON.stringify(CORE_SUBJECTS),
                JSON.stringify({ '语文': 100, '数学': 100, '英语': 100 }), date, '']
            )
            allExams.push({ id: examId, name: examName, classId })
            examCount++

            // 各科成绩
            for (const subject of CORE_SUBJECTS) {
              const scores = classStudents.map(s => ({
                studentId: s.id,
                score: randScore(),
              }))
              await qr.query(
                `INSERT INTO grades (id, classId, subject, examName, examId, date, scores, teacherId)
	               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuid(), classId, subject, examName, examId, date, JSON.stringify(scores), '']
              )
            }
          }
        }
      }

      await qr.commitTransaction()
      const pct = Math.min(100, Math.round((batch + BATCH_SIZE) / classArr.length * 100))
      console.log(`   📊 考试与成绩生成进度: ${pct}%`)
    }
    console.log(`   ✅ ${examCount} 场考试 + ${examCount * 3} 科次成绩创建完成\n`)

    // ===== 4. 边界场景：多娃家长（跨班/跨校） =====
    console.log('👨‍👩‍👧 创建边界测试数据...')

    await qr.startTransaction()
    // 4a. 跨班多娃家长（同一学校不同班级）
    for (let i = 0; i < CONFIG.MULTI_CHILD_COUNT; i++) {
      const schoolId = schoolIds[i % CONFIG.SCHOOLS]
      const schoolStudents = allStudents.filter(s => s.schoolId === schoolId)
      if (schoolStudents.length < 2) continue
      const [kid1, kid2] = pickN(schoolStudents, 2)
      const parentId = uuid()
      const parentName = `${kid1.name}${kid2.name}妈妈`
      const phone = `139${String(90000000 + i).slice(0, 8)}`

      await qr.query(
        `INSERT INTO parents (id, openId, phone, parentName, nickName, relation, passwordHash) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [parentId, phone, parentName, parentName, '母亲', hash]
      )
      for (const kid of [kid1, kid2]) {
        await qr.query(
          `INSERT INTO student_parents (id, studentId, parentId, openId, schoolId, classId, isPrimary, nickName, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '母亲')`,
          [uuid(), kid.id, parentId, 'multi_' + parentId.slice(0, 8), kid.schoolId, kid.classId, false, parentName]
        )
        await qr.query(`UPDATE students SET parentLoginEnabled = 1, parentPasswordHash = ?, parentId = ?, parentName = ?, parentNickName = ?, parentPhone = ? WHERE id = ?`,
          [hash, parentId, parentName, parentName, phone, kid.id])
      }
    }
    console.log(`   ✅ ${CONFIG.MULTI_CHILD_COUNT} 组跨班多娃家长创建完成`)

    // 4b. 跨校多娃家长
    for (let i = 0; i < CONFIG.CROSS_SCHOOL_PARENT_COUNT; i++) {
      const school1 = schoolIds[i * 2 % CONFIG.SCHOOLS]
      const school2 = schoolIds[(i * 2 + 1) % CONFIG.SCHOOLS]
      const kid1 = allStudents.filter(s => s.schoolId === school1)[i % 10]
      const kid2 = allStudents.filter(s => s.schoolId === school2)[i % 10]
      if (!kid1 || !kid2) continue
      const parentId = uuid()
      const parentName = `${kid1.name}${kid2.name}爸妈`
      const phone = `139${String(80000000 + i).slice(0, 8)}`

      await qr.query(
        `INSERT INTO parents (id, openId, phone, parentName, nickName, relation, passwordHash) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [parentId, phone, parentName, parentName, '家长', hash]
      )
      for (const kid of [kid1, kid2]) {
        await qr.query(
          `INSERT INTO student_parents (id, studentId, parentId, openId, schoolId, classId, isPrimary, nickName, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '家长')`,
          [uuid(), kid.id, parentId, 'xsch_' + parentId.slice(0, 8), kid.schoolId, kid.classId, false, parentName]
        )
        await qr.query(`UPDATE students SET parentLoginEnabled = 1, parentPasswordHash = ?, parentId = ?, parentName = ?, parentNickName = ?, parentPhone = ? WHERE id = ?`,
          [hash, parentId, parentName, parentName, phone, kid.id])
      }
    }
    console.log(`   ✅ ${CONFIG.CROSS_SCHOOL_PARENT_COUNT} 组跨校多娃家长创建完成`)

    // 4c. 师兼家（教师同时是家长）
    for (let i = 0; i < CONFIG.TEACHER_AS_PARENT_COUNT && i < allTeachers.length; i++) {
      const teacher = allTeachers[i]
      const schoolStudents = allStudents.filter(s => s.schoolId === teacher.schoolId)
      const kid = schoolStudents[i % schoolStudents.length]
      if (!kid) continue

      const parentId = uuid()
      await qr.query(
        `INSERT INTO parents (id, openId, phone, parentName, nickName, relation, passwordHash) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [parentId, `139${String(70000000 + i).slice(0, 8)}`, `${teacher.name}本人`, `${teacher.name}`, '父亲', hash]
      )
      await qr.query(
        `INSERT INTO student_parents (id, studentId, parentId, openId, schoolId, classId, isPrimary, nickName, relation) VALUES (?, ?, ?, ?, ?, ?, 1, ?, '父亲')`,
        [uuid(), kid.id, parentId, 'tchp_' + parentId.slice(0, 8), kid.schoolId, kid.classId, teacher.name]
      )
      await qr.query(`UPDATE students SET parentLoginEnabled = 1, parentPasswordHash = ?, parentId = ?, parentName = ?, parentNickName = ?, parentPhone = ? WHERE id = ?`,
        [hash, parentId, `${teacher.name}本人`, teacher.name, `139${String(70000000 + i).slice(0, 8)}`, kid.id])
      // 回填教师的 parentId（师兼家锚点）
      await qr.query(`UPDATE users SET parentId = ? WHERE id = ?`, [parentId, teacher.id])
    }
    await qr.commitTransaction()
    console.log(`   ✅ ${CONFIG.TEACHER_AS_PARENT_COUNT} 位师兼家创建完成\n`)

    console.log('🎉 全面测试数据生成完成！')
    console.log(`   学校: ${CONFIG.SCHOOLS} · 教师: ${teacherCount} · 学生: ${studentCount} · 家长: ${parentCount}`)
    console.log(`   考试: ${examCount} · 成绩科目次: ${examCount * 3}`)
    console.log(`   多娃家长: ${CONFIG.MULTI_CHILD_COUNT}(跨班) + ${CONFIG.CROSS_SCHOOL_PARENT_COUNT}(跨校) · 师兼家: ${CONFIG.TEACHER_AS_PARENT_COUNT}`)
    console.log(`   所有登录密码: ${CONFIG.PASSWORD}\n`)

  } catch (e: any) {
    console.error('❌ 创建失败:', e.message)
    if (qr.isTransactionActive) await qr.rollbackTransaction()
    process.exit(1)
  } finally {
    await qr.release()
    await ds.destroy()
  }
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
