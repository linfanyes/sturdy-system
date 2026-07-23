/**
 * 园丁工作台 · 五类用户测试数据种子
 * ======================================
 * 直连 MySQL 插入完备测试数据，供后续全量 API 测试使用。
 * 覆盖：超管 / 学校管理员 / 班主任 / 任课老师 / 家长
 *
 * 用法：node a-test-seed-data.js
 */

const mysql = require('mysql2/promise')
const crypto = require('node:crypto')

const PWD_HASH = crypto.createHash('sha256').update('123456').digest('hex') // 教师/SA 默认密码

async function seed() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test',
  })

  // ---- 清理旧数据 ----
  const tables = ['students', 'classes', 'users', 'school_admins', 'schools',
    'grades', 'exams', 'backup_snapshots', 'notices', 'homework', 'schedules',
    'attendances', 'resources', 'lesson_observations', 'work_logs',
    'lesson_plan_templates', 'award_records', 'award_categories', 'group_scores',
    'behavior_records', 'growth_entries', 'notes', 'todos', 'reward_records',
    'score_records']
  for (const t of tables) {
    await conn.execute(`DELETE FROM \`${t}\``)
  }

  // ---- 1. 学校 ----
  await conn.execute(`INSERT INTO schools (id, code, name, address, contact, phone, status) VALUES
    (UUID(), 'SCH001', '阳光实验小学', '北京市朝阳区阳光路1号', '赵校长', '13800138001', 'active')`)
  await conn.execute(`INSERT INTO schools (id, code, name, status) VALUES
    (UUID(), 'SCH002', '明德小学', 'active')`)

  const [schools] = await conn.execute('SELECT id, code, name FROM schools ORDER BY code')
  const school1 = schools[0]
  const _school2 = schools[1]
  console.log(`🏫 学校: ${school1.name} (${school1.id.slice(0,8)}...), ${_school2.name}`)

  // ---- 2. 学校管理员 ----
  await conn.execute(`INSERT INTO school_admins (id, username, passwordHash, name, schoolId, enabled) VALUES
    (UUID(), 'sa1', ?, '赵主任', ?, 1)`, [PWD_HASH, school1.id])
  await conn.execute(`INSERT INTO school_admins (id, username, passwordHash, name, schoolId, enabled) VALUES
    (UUID(), 'sa2', ?, '钱主任', ?, 1)`, [PWD_HASH, _school2.id])
  // 被禁用管理员（用于测试）
  await conn.execute(`INSERT INTO school_admins (id, username, passwordHash, name, schoolId, enabled) VALUES
    (UUID(), 'sa_disabled', ?, '禁用管理员', ?, 0)`, [PWD_HASH, school1.id])
  console.log('👤 学校管理员: sa1, sa2 创建完成')

  // ---- 3. 教师（4 位） ----
  await conn.execute(`INSERT INTO users (id, name, subject, subjects, school, schoolId, username, passwordHash, enabled, teacherNo, phone) VALUES
    (?, '王老师', '语文', ?, '阳光实验小学', ?, 'teacher1', ?, 1, 'JS001', '13811111111')`,
    [UUID(), JSON.stringify(['语文','数学']), school1.id, PWD_HASH])
  await conn.execute(`INSERT INTO users (id, name, subject, subjects, school, schoolId, username, passwordHash, enabled, teacherNo, phone) VALUES
    (?, '李老师', '数学', ?, '阳光实验小学', ?, 'teacher2', ?, 1, 'JS002', '13822222222')`,
    [UUID(), JSON.stringify(['数学','英语']), school1.id, PWD_HASH])
  await conn.execute(`INSERT INTO users (id, name, subject, subjects, school, schoolId, username, passwordHash, enabled, teacherNo, phone) VALUES
    (?, '张老师', '英语', ?, '阳光实验小学', ?, 'teacher3', ?, 1, 'JS003', '13833333333')`,
    [UUID(), JSON.stringify(['英语','科学']), school1.id, PWD_HASH])
  await conn.execute(`INSERT INTO users (id, name, subject, subjects, school, schoolId, username, passwordHash, enabled, teacherNo, phone) VALUES
    (?, '陈老师', '音乐', ?, '阳光实验小学', ?, 'teacher4', ?, 1, 'JS004', '13844444444')`,
    [UUID(), JSON.stringify(['音乐','美术']), school1.id, PWD_HASH])
  // 被禁用教师（用于测试）
  await conn.execute(`INSERT INTO users (id, name, subject, school, schoolId, username, passwordHash, enabled, teacherNo) VALUES
    (?, '禁用老师', '体育', '阳光实验小学', ?, 'teacher_disabled', ?, 0, 'JS099')`,
    [UUID(), school1.id, PWD_HASH])

  const [teachers] = await conn.execute('SELECT id, name, username FROM users WHERE username LIKE "teacher%" AND username != "teacher_disabled" ORDER BY username')
  const [tWang, tLi, tZhang, tChen] = teachers
  console.log(`👩‍🏫 教师: ${teachers.map(t=>t.name).join(', ')}`)

  // ---- 4. 班级 ----
  // 班主任王老师 - 一年级一班
  await conn.execute(`INSERT INTO classes (id, teacherId, name, grade, classNo, headTeacher, teachers, subjects, subjectTeachers, term) VALUES
    (?, ?, '一年级一班', '一年级', '1', '王老师', ?, ?, ?, '2026学年')`,
    [UUID(), tWang.id,
     JSON.stringify(['张老师','陈老师']),
     JSON.stringify(['语文','数学','英语','科学','音乐','美术']),
     JSON.stringify({ '语文':'王老师', '数学':'李老师', '英语':'张老师', '科学':'张老师', '音乐':'陈老师', '美术':'陈老师' })])
  // 班主任李老师 - 二年级二班
  await conn.execute(`INSERT INTO classes (id, teacherId, name, grade, classNo, headTeacher, teachers, subjects, subjectTeachers, term) VALUES
    (?, ?, '二年级二班', '二年级', '2', '李老师', ?, ?, ?, '2026学年')`,
    [UUID(), tLi.id,
     JSON.stringify(['王老师','张老师']),
     JSON.stringify(['语文','数学','英语','科学']),
     JSON.stringify({ '语文':'王老师', '数学':'李老师', '英语':'张老师', '科学':'张老师' })])

  const [classes] = await conn.execute('SELECT id, name, teacherId FROM classes ORDER BY grade')
  const classA = classes[0] // 一年级一班 - tWang.id=teacherId
  const classB = classes[1] // 二年级二班 - tLi.id
  console.log(`📚 班级: ${classA.name} (班主任:王老师), ${classB.name} (班主任:李老师)`)

  // ---- 5. 学生 ----
  const studentsData = [
    // 班级A 6名学生（含家长）
    [classA.id, tWang.id, '张三', '男', '2024001', '张三妈妈', '13810000001', true],
    [classA.id, tWang.id, '李四', '女', '2024002', '李四爸爸', '13810000002', true],
    [classA.id, tWang.id, '王五', '男', '2024003', '王五妈妈', '13810000003', true],
    [classA.id, tWang.id, '赵六', '女', '2024004', '', '', false],
    [classA.id, tWang.id, '孙七', '男', '2024005', '', '', false],
    [classA.id, tWang.id, '周八', '女', '2024006', '周八爸爸', '13810000006', true],
    // 班级B 4名学生（含家长）
    [classB.id, tLi.id, '吴九', '男', '2024101', '吴九妈妈', '13820000001', true],
    [classB.id, tLi.id, '郑十', '女', '2024102', '', '', false],
    [classB.id, tLi.id, '冯十一', '男', '2024103', '冯十一爸爸', '13820000003', true],
    [classB.id, tLi.id, '褚十二', '女', '2024104', '', '', false],
  ]
  for (const [cid, tid, name, gender, sno, pn, pp, ple] of studentsData) {
    await conn.execute(
      `INSERT INTO students (id, classId, teacherId, name, gender, studentNo, parentName, parentPhone, parentLoginEnabled) VALUES
       (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cid, tid, name, gender, sno, pn, pp, ple ? 1 : 0]
    )
  }
  console.log('🧑‍🎓 学生: 10名创建完成')

  // ---- 6. 考试成绩 ----
  const [allStudents] = await conn.execute('SELECT id, name, classId FROM students ORDER BY studentNo')
  // 一年级语文考试 - 王老师创建
  for (const stu of allStudents.filter(s => s.classId === classA.id)) {
    const score = 60 + Math.floor(Math.random() * 40)
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, examId, date, scores) VALUES
       (UUID(), ?, ?, '语文', '期中考试', NULL, '2026-04-15', ?)`,
      [tWang.id, classA.id, JSON.stringify([{ studentId: stu.id, score }])]
    )
  }
  // 一年级数学考试 - 李老师创建（跨班任课）
  for (const stu of allStudents.filter(s => s.classId === classA.id)) {
    const score = 55 + Math.floor(Math.random() * 45)
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
       (UUID(), ?, ?, '数学', '期中考试', '2026-04-15', ?)`,
      [tLi.id, classA.id, JSON.stringify([{ studentId: stu.id, score }])]
    )
  }
  // 二年级英语考试 - 张老师创建
  for (const stu of allStudents.filter(s => s.classId === classB.id)) {
    const score = 65 + Math.floor(Math.random() * 35)
    await conn.execute(
      `INSERT INTO grades (id, teacherId, classId, subject, examName, date, scores) VALUES
       (UUID(), ?, ?, '英语', '月考', '2026-05-20', ?)`,
      [tZhang.id, classB.id, JSON.stringify([{ studentId: stu.id, score }])]
    )
  }
  console.log('📊 成绩: 期中/月考成绩创建完成')

  // ---- 7. 考试计划 ----
  await conn.execute(`INSERT INTO exams (id, teacherId, classId, name, date, term, subjects) VALUES
    (UUID(), ?, ?, '期中考试', '2026-04-15', '2026学年第一学期', ?)`,
    [tWang.id, classA.id, JSON.stringify(['语文','数学','英语'])])
  await conn.execute(`INSERT INTO exams (id, teacherId, classId, name, date, term, subjects) VALUES
    (UUID(), ?, ?, '月考', '2026-05-20', '2026学年第一学期', ?)`,
    [tZhang.id, classB.id, JSON.stringify(['英语','科学'])])

  // ---- 8. 备份数据 ----
  await conn.execute(`INSERT INTO backup_snapshots (id, teacherId, type, label, payload, createdAt) VALUES
    (UUID(), ?, 'manual', '第一次备份', '{}', NOW())`, [tWang.id])
  await conn.execute(`INSERT INTO backup_snapshots (id, teacherId, type, label, payload, createdAt) VALUES
    (UUID(), ?, 'manual', '第二次备份', '{}', NOW())`, [tWang.id])
  await conn.execute(`INSERT INTO backup_snapshots (id, teacherId, type, label, payload, createdAt) VALUES
    (UUID(), ?, 'auto', '李老师备份', '{}', NOW())`, [tLi.id])

  // ---- 9. 通知 ----
  await conn.execute(`INSERT INTO notices (id, teacherId, classId, title, content, pinned) VALUES
    (UUID(), ?, ?, '下周家长会通知', '请各位家长下周五四点参加家长会', 1)`,
    [tWang.id, classA.id])
  await conn.execute(`INSERT INTO notices (id, teacherId, classId, title, content, pinned) VALUES
    (UUID(), ?, ?, '关于春游的通知', '下周二组织春游，请为学生准备午餐和水', 0)`,
    [tLi.id, classB.id])

  // ---- 10. 作业 ----
  await conn.execute(`INSERT INTO homework (id, teacherId, classId, subject, title, content, startDate, deadline) VALUES
    (UUID(), ?, ?, '语文', '写一篇关于春天的作文', '不少于300字，表达真情实感', '2026-07-20', '2026-07-27')`,
    [tWang.id, classA.id])
  await conn.execute(`INSERT INTO homework (id, teacherId, classId, subject, title, content, startDate, deadline) VALUES
    (UUID(), ?, ?, '数学', '练习题第3-5页', '完成课本第3-5页全部习题', '2026-07-21', '2026-07-28')`,
    [tLi.id, classB.id])

  // ---- 11. 作息表 ----
  for (let d = 1; d <= 5; d++) {
    await conn.execute(`INSERT INTO schedules (id, teacherId, classId, dayOfWeek, period, subject, teacher) VALUES
      (UUID(), ?, ?, ?, 1, '语文', '王老师')`, [tWang.id, classA.id, d])
    await conn.execute(`INSERT INTO schedules (id, teacherId, classId, dayOfWeek, period, subject, teacher) VALUES
      (UUID(), ?, ?, ?, 2, '数学', '李老师')`, [tLi.id, classA.id, d])
  }

  // ---- 12. 教学资源（无 classId 字段，纯 teacherId 隔离） ----
  await conn.execute(`INSERT INTO resources (id, teacherId, title, category, tags, description) VALUES
    (UUID(), ?, '一年级语文课件-春天的发现', '课件', ?, '描写春天的课件，含图片和互动练习')`,
    [tWang.id, JSON.stringify(['语文','春天'])])
  await conn.execute(`INSERT INTO resources (id, teacherId, title, category, tags, description) VALUES
    (UUID(), ?, '数学口算题卡100题', '习题', ?, '一年级下学期的口算练习题')`,
    [tWang.id, JSON.stringify(['数学','口算'])])
  await conn.execute(`INSERT INTO resources (id, teacherId, title, category, tags, description) VALUES
    (UUID(), ?, '英语单词卡片 Unit 3', '课件', ?, '包含本单元所有重点单词和图片')`,
    [tWang.id, JSON.stringify(['英语','单词'])])
  await conn.execute(`INSERT INTO resources (id, teacherId, title, category, tags, description) VALUES
    (UUID(), ?, '小学科学实验指导手册', '资料', ?, '包含简单易行的课堂小实验')`,
    [tLi.id, JSON.stringify(['科学','实验'])])
  await conn.execute(`INSERT INTO resources (id, teacherId, title, category, tags, description) VALUES
    (UUID(), ?, '古诗文诵读精选', '资料', ?, '一年级必背古诗文30篇')`,
    [tWang.id, JSON.stringify(['语文','古诗'])])

  // ---- 13. 荣誉 ----
  await conn.execute(`INSERT INTO award_records (id, teacherId, name, issuer, date, level, note) VALUES
    (UUID(), ?, '学习进步奖', '学校', '2026-06-01', '校级', '张三同学进步显著')`,
    [tWang.id])

  // ---- 13. 成长记录 ----
  await conn.execute(`INSERT INTO growth_entries (id, teacherId, studentId, studentName, type, title, date, content) VALUES
    (UUID(), ?, ?, '张三', '学习', '本周表现', '2026-07-18', '上课积极发言，作业认真完成')`,
    [tWang.id, allStudents[0].id])

  // ---- 14. 备注 ----
  await conn.execute(`INSERT INTO notes (id, teacherId, title, content) VALUES
    (UUID(), ?, '教学心得', '本周语文课使用了小组讨论教学法，效果不错')`, [tWang.id])

  console.log('\n✅ 种子数据创建完成！')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('五类用户登录信息:')
  console.log('  超管:         admin / admin')
  console.log('  学校管理员:   sa1 / 123456  (阳光实验)')
  console.log('  学校管理员:   sa2 / 123456  (明德小学)')
  console.log('  班主任(王):   teacher1 / 123456')
  console.log('  班主任(李):   teacher2 / 123456')
  console.log('  任课老师(张): teacher3 / 123456')
  console.log('  任课老师(陈): teacher4 / 123456')
  console.log('  家长:         学号为 2024001 的家长 / 123456')
  console.log('  家长:         学号为 2024002 的家长 / 123456')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await conn.end()
}

function UUID() { return crypto.randomUUID() }

seed().catch(e => { console.error('❌ 种子失败:', e.message); process.exit(1) })
