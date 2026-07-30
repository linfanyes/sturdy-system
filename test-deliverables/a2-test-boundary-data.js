#!/usr/bin/env node
/**
 * 园丁工作台 · 边界/异常测试数据种子（扩展）
 * =================================================
 * 必须在 a-test-seed-data.js 之后运行（依赖其创建的学校/班级/教师ID）。
 * 覆盖：边界场景 + 异常场景 + 大批量场景 + 多孩子家长
 *
 * 用法: node a2-test-boundary-data.js
 * 前置: 已运行 a-test-seed-data.js, MySQL 运行, gardener_test 数据库存在
 */

const mysql = require('mysql2/promise')
const crypto = require('node:crypto')

const PWD_HASH = crypto.createHash('sha256').update('123456').digest('hex')

async function seedBoundary() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test',
  })

  // ---- 读取现有数据 ----
  const [schools] = await conn.execute('SELECT id, code, name FROM schools ORDER BY code')
  if (schools.length < 2) throw new Error('请先运行 a-test-seed-data.js 创建基础数据')
  const school1 = schools[0]
  const school2 = schools[1]

  const [teachers] = await conn.execute('SELECT id, name, username FROM users WHERE enabled=1 AND username LIKE "teacher%" ORDER BY username')
  const [tWang, tLi, tZhang, tChen] = teachers
  if (!tWang) throw new Error('未找到教师数据，请先运行 a-test-seed-data.js')

  const [classes] = await conn.execute('SELECT id, name, teacherId FROM classes ORDER BY grade')
  const classA = classes[0]
  const classB = classes[1]

  // ======================================================================
  //  1. 边界学生
  // ======================================================================
  console.log('\n--- 1. 边界学生 ---')

  // 1a. 学号为 0000000（极端边界）
  await conn.execute(
    `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
     (UUID(), ?, ?, '边界学生A', '男', '0000000', '家长边界A', '13800000007', 1)`,
    [classA.id, tWang.id]
  )
  console.log('  ✅ 学号=0000000 (边界: 全零学号)')

  // 1b. 超长姓名（50个字符）
  await conn.execute(
    `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
     (UUID(), ?, ?, ?, '女', '2024999', '超长家长名'.repeat(10), '13800000008', 1)`,
    [classA.id, tWang.id, '超'.repeat(50)]
  )
  console.log('  ✅ 姓名=50字符 (边界: 超长姓名)')

  // 1c. 空姓名学生（业务允许空名？应检查后端是否拒绝/接受）
  await conn.execute(
    `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
     (UUID(), ?, ?, '', '男', '2024998', '', '13800000009', 0)`,
    [classA.id, tWang.id]
  )
  console.log('  ✅ 姓名=空 (边界: 空姓名)')

  // 1d. 无家长联系电话
  await conn.execute(
    `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
     (UUID(), ?, ?, '无电话学生', '女', '2024997', '无电话家长', '', 0)`,
    [classA.id, tWang.id]
  )
  console.log('  ✅ 无电话学生 (边界)')

  // 1e. 特殊字符姓名
  await conn.execute(
    `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
     (UUID(), ?, ?, '<script>alert(1)</script>', '男', '2024996', '测试XSS', '13800000010', 0)`,
    [classA.id, tWang.id]
  )
  console.log('  ✅ XSS字符串姓名 (安全边界)')

  // ======================================================================
  //  2. 边界成绩
  // ======================================================================
  console.log('\n--- 2. 边界成绩 ---')

  const [allStudents] = await conn.execute('SELECT id, name, classId FROM students ORDER BY studentNo')

  // 2a. 满分100
  const s1 = allStudents.find(s => s.studentNo === '2024001')
  if (s1) {
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
       (UUID(), ?, ?, '语文', '边界成绩测试', '2026-07-01', ?)`,
      [tWang.id, classA.id, JSON.stringify([{ studentId: s1.id, score: 100 }])]
    )
    console.log('  ✅ 成绩=100 (满分边界)')
  }

  // 2b. 0分
  const s2 = allStudents.find(s => s.studentNo === '2024002')
  if (s2) {
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
       (UUID(), ?, ?, '数学', '边界成绩测试', '2026-07-01', ?)`,
      [tLi.id, classA.id, JSON.stringify([{ studentId: s2.id, score: 0 }])]
    )
    console.log('  ✅ 成绩=0 (零分边界)')
  }

  // 2c. 带小数成绩
  const s3 = allStudents.find(s => s.studentNo === '2024003')
  if (s3) {
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
       (UUID(), ?, ?, '数学', '边界成绩测试', '2026-07-01', ?)`,
      [tLi.id, classA.id, JSON.stringify([{ studentId: s3.id, score: 85.5 }])]
    )
    console.log('  ✅ 成绩=85.5 (小数边界)')
  }

  // ======================================================================
  //  3. 大班数据（50人 + 10场考试 + 每生5科 = 2500条成绩）
  // ======================================================================
  console.log('\n--- 3. 大班批量数据 ---')

  // 3a. 新建一个大班（测试分页/性能）
  await conn.execute(
    `INSERT INTO classes (id, teacherId, name, grade, classNo, headTeacher, teachers, subjects, subjectTeachers, term) VALUES
     (UUID(), ?, '大班测试', '一年级', '50', '王老师', ?, ?, ?, '2026学年')`,
    [tWang.id,
     JSON.stringify(['张老师','陈老师']),
     JSON.stringify(['语文','数学','英语','科学','音乐','美术']),
     JSON.stringify({ '语文':'王老师', '数学':'李老师', '英语':'张老师', '科学':'张老师', '音乐':'陈老师', '美术':'陈老师' })]
  )
  const [bigClass] = await conn.execute('SELECT id FROM classes WHERE classNo="50"')
  const bigClassId = bigClass.id

  // 3b. 插入50名学生
  const bigStudentIds = []
  for (let i = 0; i < 50; i++) {
    const sid = crypto.randomUUID()
    bigStudentIds.push(sid)
    const sno = `2999${String(i).padStart(3, '0')}`
    await conn.execute(
      `INSERT INTO students (id, classId, teacherId, name, gender, studentNo) VALUES
       (UUID(), ?, ?, '批量学生${i+1}', ${i % 2 === 0 ? "'男'" : "'女'"}, ?)`,
      [bigClassId, tWang.id, sno]
    )
  }
  // 重新查询真实ID
  const [bigStudents] = await conn.execute('SELECT id FROM students WHERE classId=? ORDER BY studentNo', [bigClassId])
  console.log(`  ✅ 50人大班创建完成 (班级ID: ${bigClassId.slice(0,8)}...)`)

  // 3c. 10场考试 × 每生5科 = 2500条成绩
  const subjects3 = ['语文', '数学', '英语', '科学', '音乐']
  const examNames = ['月考1', '月考2', '期中', '月考3', '期末', '单元测1', '单元测2', '模拟考1', '模拟考2', '综合测']
  for (let ei = 0; ei < examNames.length; ei++) {
    // 创建考试记录
    await conn.execute(
      `INSERT INTO exams (id, teacherId, classId, name, date, term, subjects) VALUES
       (UUID(), ?, ?, ?, '2026-0${Math.floor(ei/3)+3}-${String(ei*3+1).padStart(2,'0')}', '2026学年', ?)`,
      [tWang.id, bigClassId, examNames[ei], JSON.stringify(subjects3)]
    )
    // 插入成绩
    for (const sub of subjects3) {
      for (const stu of bigStudents) {
        const score = 40 + Math.floor(Math.random() * 60)
        await conn.execute(
          `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
           (UUID(), ?, ?, ?, ?, '2026-0${Math.floor(ei/3)+3}-${String(ei*3+1).padStart(2,'0')}', ?)`,
          [tWang.id, bigClassId, sub, examNames[ei],
           JSON.stringify([{ studentId: stu.id, score }])]
        )
      }
    }
    console.log(`  ✅ 第${ei+1}/${examNames.length}场考试成绩已导入 (${subjects3.length}科 × ${bigStudents.length}生 = ${subjects3.length * bigStudents.length}条)`)
  }
  console.log(`  ✅ 大班批量数据完成: ${examNames.length}场考试 × ${subjects3.length}科 × ${bigStudents.length}生 = ${examNames.length * subjects3.length * bigStudents.length}条成绩`)

  // ======================================================================
  //  4. 多孩子家长
  // ======================================================================
  console.log('\n--- 4. 多孩子家长 ---')

  // 创建2个额外学生绑定到同一家长手机号
  for (let i = 0; i < 2; i++) {
    await conn.execute(
      `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
       (UUID(), ?, ?, '多娃${i+1}号', ${i % 2 === 0 ? "'男'" : "'女'"}, '2024${100+i+10}', '多娃家长', '13899999999', 1)`,
      [classA.id, tWang.id]
    )
  }
  console.log('  ✅ 多孩子家长: 手机13899999999绑定2名学生')

  // ======================================================================
  //  5. 特殊日期数据
  // ======================================================================
  console.log('\n--- 5. 特殊日期数据 ---')

  // 跨学年的学期
  await conn.execute(
    `INSERT INTO semesters (id, schoolId, name, startDate, endDate, isCurrent) VALUES
     (UUID(), ?, '2025-2026学年', '2025-09-01', '2026-07-31', 0)`,
    [school1.id]
  )
  // 当前学期
  await conn.execute(
    `INSERT INTO semesters (id, schoolId, name, startDate, endDate, isCurrent) VALUES
     (UUID(), ?, '2026-2027学年', '2026-09-01', '2027-07-31', 1)`,
    [school1.id]
  )
  // 明德小学的学期
  await conn.execute(
    `INSERT INTO semesters (id, schoolId, name, startDate, endDate, isCurrent) VALUES
     (UUID(), ?, '2026-2027学年', '2026-09-01', '2027-07-31', 1)`,
    [school2.id]
  )
  console.log('  ✅ 学期数据（含跨学年/当前学期/多校）')

  // 未来日期的作业
  await conn.execute(
    `INSERT INTO homework (id, teacherId, classId, subject, title, content, startDate, deadline) VALUES
     (UUID(), ?, ?, '语文', '未来作业测试', 'deadline在明年', '2026-07-30', '2027-07-30')`,
    [tWang.id, classA.id]
  )
  console.log('  ✅ 未来日期作业')

  // ======================================================================
  //  6. 禁用用户/空数据班级/已毕业班级
  // ======================================================================
  console.log('\n--- 6. 特殊状态数据 ---')

  // 6a. 禁用的学校管理员（已在 a-test-seed-data 中创建 sa_disabled）
  console.log('  ✅ sa_disabled (禁用校管，已在基础种子创建)')

  // 6b. 空数据班级（0名学生）
  await conn.execute(
    `INSERT INTO classes (id, teacherId, name, grade, classNo, headTeacher, teachers, subjects, subjectTeachers, term) VALUES
     (UUID(), ?, '空班测试', '一年级', '99', '王老师', '[]', '[]', '{}', '2026学年')`,
    [tWang.id]
  )
  console.log('  ✅ 空班测试 (0名学生班级)')

  // 6c. 已毕业班级（status=graduated）
  // 检查表是否有 status 字段
  const [colCheck] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA='gardener_test' AND TABLE_NAME='classes' AND COLUMN_NAME='status'`
  )
  if (colCheck.length > 0) {
    await conn.execute(
      `INSERT INTO classes (id, teacherId, name, grade, classNo, headTeacher, status, teachers, subjects, subjectTeachers, term) VALUES
       (UUID(), ?, '毕业班', '六年级', '6', '王老师', 'graduated', '[]', '[]', '{}', '2025学年')`,
      [tWang.id]
    )
    console.log('  ✅ 毕业班测试（status=graduated）')
  } else {
    console.log('  ⏭️  classes表无status字段，跳过毕业班')
  }

  // ======================================================================
  //  7. 家长数据（多个家长账号供测试）
  // ======================================================================
  console.log('\n--- 7. 家长登录数据 ---')

  // 从已有学生中提取有 parentLoginEnabled=1 的学生
  const [parentStudents] = await conn.execute(
    'SELECT id, name, studentNo, parentPhone FROM students WHERE parentLoginEnabled=1 AND parentPhone IS NOT NULL AND parentPhone != ""'
  )
  console.log(`  ✅ 可登录家长账号: ${parentStudents.length}个`)
  for (const ps of parentStudents) {
    console.log(`     学号=${ps.studentNo} / 密码=123456 (孩子:${ps.name}, 电话:${ps.parentPhone})`)
  }

  // ======================================================================
  //  8. 汇总
  // ======================================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('📊 边界/异常测试数据创建完成！')
  console.log('  边界学生: 5名')
  console.log('  边界成绩: 3条')
  console.log('  大班数据: 50学生 + 10考试 + 2500成绩')
  console.log('  多孩子家长: 2个额外的孩子')
  console.log('  特殊日期: 学期+未来作业')
  console.log('  特殊状态: 空班 + 毕业班')
  console.log('═══════════════════════════════════════════\n')

  await conn.end()
}

seedBoundary().catch(e => { console.error('❌ 边界种子失败:', e.message); process.exit(1) })
