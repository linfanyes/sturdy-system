/**
 * 园丁工作台 · 核心业务表种子数据补齐 (P0-1)
 * =================================================
 * 为 17 个核心空表 + 强相关引用表补齐演示数据，使五类用户登录后
 * 各业务页面均有真实可看的内容（不再空白）。
 *
 * 设计原则：
 *   1. 复用已有 teacher / class / student 真实 ID，保证租户隔离一致。
 *   2. 仅对目标空表做 DELETE + INSERT，不触碰已存在的业务数据。
 *   3. 可重复执行：每次先清后插，幂等安全。
 *   4. simple-json / longtext 列以 JSON.stringify 写入。
 *
 * 用法：node d-seed-core-tables.js
 */

const mysql = require('mysql2/promise')
const crypto = require('node:crypto')

const TARGET_TABLES = [
  'todos', 'attendances', 'behavior_records', 'class_activities', 'class_expenses',
  'class_galleries', 'reading_logs', 'reward_records', 'score_records', 'semesters',
  'work_logs', 'lesson_plan_templates', 'parent_contacts', 'seat_layouts', 'duty_rosters',
  'my_galleries', 'checkins',
  // 强相关引用表（避免已有数据旁出现空白区）
  'award_categories', 'group_scores', 'lesson_observations', 'home_visits',
  'notice_templates', 'picker_history',
]

const UUID = () => crypto.randomUUID()
const J = (v) => (v === null || v === undefined ? null : JSON.stringify(v))

async function seed() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test',
  })

  // ---- 清空目标表（均为当前空表，安全） ----
  for (const t of TARGET_TABLES) {
    await conn.execute(`DELETE FROM \`${t}\``)
  }
  console.log(`🧹 已清空 ${TARGET_TABLES.length} 张目标表`)

  // ---- 取真实引用 ID ----
  const [teachers] = await conn.execute(
    'SELECT id, name, username FROM users WHERE username LIKE "teacher%" AND username != "teacher_disabled" ORDER BY username')
  const [tWang, tLi, tZhang, tChen] = teachers
  const [classes] = await conn.execute('SELECT id, name, teacherId FROM classes ORDER BY grade')
  const classA = classes[0] // 一年级一班 - 班主任 王老师(tWang)
  const classB = classes[1] // 二年级二班 - 班主任 李老师(tLi)
  const [students] = await conn.execute('SELECT id, name, classId, teacherId FROM students ORDER BY studentNo')
  const stuA = students.filter((s) => s.classId === classA.id)
  const stuB = students.filter((s) => s.classId === classB.id)

  const stats = {}

  // ============ 1. todos（教师个人，4 位教师各若干） ============
  const todos = [
    [tWang.id, '批改一年级一班语文作业', '期中作文批改', '2026-07-25', 0],
    [tWang.id, '准备家长会 PPT', '下周家长会材料', '2026-07-24', 0],
    [tWang.id, '完成本周听课记录', '', '2026-07-23', 1],
    [tLi.id, '出二年级二班数学单元测试', '覆盖第3-5单元', '2026-07-26', 0],
    [tLi.id, '整理班级值日表', '', '2026-07-22', 1],
    [tZhang.id, '录制英语 Unit 4 单词音频', '', '2026-07-27', 0],
    [tChen.id, '排练校园艺术节节目', '二年级二班合唱', '2026-07-28', 0],
  ]
  for (const [tid, title, note, date, done] of todos) {
    await conn.execute(
      `INSERT INTO todos (id, teacherId, title, note, date, done) VALUES (UUID(),?,?,?,?,?)`,
      [tid, title, note, date, done])
  }
  stats.todos = todos.length

  // ============ 2. work_logs（教师个人工作日志） ============
  const workLogs = [
    [tWang.id, '2026-07-22', '上午两节语文课，讲解期中试卷；下午批改作文12本。', 2, 1, '学生课堂积极性高'],
    [tWang.id, '2026-07-21', '备课《春天的发现》，制作课件；与家长沟通2人次。', 1, 0, '张三家长咨询学习习惯'],
    [tLi.id, '2026-07-22', '数学公开课一节，年级组评课；布置周末口算练习。', 3, 1, ''],
    [tChen.id, '2026-07-20', '音乐课教唱校歌；美术课手工制作。', 2, 0, '艺术节筹备中'],
  ]
  for (const [tid, date, content, cc, hc, note] of workLogs) {
    await conn.execute(
      `INSERT INTO work_logs (id, teacherId, date, content, classCount, homeworkCount, note) VALUES (UUID(),?,?,?,?,?,?)`,
      [tid, date, content, cc, hc, note])
  }
  stats.work_logs = workLogs.length

  // ============ 3. lesson_plan_templates（教案模板） ============
  const plans = [
    [tWang.id, '《春天的发现》第一课时', '语文', '新授课', '一年级', '教学目标：1.认识生字词 2.有感情朗读 3.感受春天美景\n重点：生字书写；难点：体会作者情感', 1],
    [tWang.id, '口语交际：有趣的动物', '语文', '口语交际', '一年级', '通过小组介绍喜欢的动物，训练表达与倾听。', 0],
    [tLi.id, '100以内加减法复习', '数学', '复习课', '二年级', '以游戏化闯关形式复习进位加法与退位减法。', 0],
    [tZhang.id, 'Unit 4 My family', '英语', '新授课', '二年级', '词汇：father/mother/brother/sister；句型：This is my...', 0],
  ]
  for (const [tid, title, subject, lt, grade, content, fav] of plans) {
    await conn.execute(
      `INSERT INTO lesson_plan_templates (id, teacherId, title, subject, lessonType, grade, content, isFavorite) VALUES (UUID(),?,?,?,?,?,?,?)`,
      [tid, title, subject, lt, grade, content, fav])
  }
  stats.lesson_plan_templates = plans.length

  // ============ 4. semesters（学期） ============
  const sems = [
    [tWang.id, '2025-2026学年第二学期', '2026-02-17', '2026-07-10', 1],
    [tWang.id, '2026-2027学年第一学期', '2026-09-01', '2027-01-20', 0],
    [tLi.id, '2025-2026学年第二学期', '2026-02-17', '2026-07-10', 1],
  ]
  for (const [tid, name, sd, ed, cur] of sems) {
    await conn.execute(
      `INSERT INTO semesters (id, teacherId, name, startDate, endDate, current) VALUES (UUID(),?,?,?,?,?)`,
      [tid, name, sd, ed, cur])
  }
  stats.semesters = sems.length

  // ============ 5. my_galleries（我的图库，photos 留空占位） ============
  const myGall = [
    [tWang.id, '班级春游留影', '2026-04-12', '阳光明媚，孩子们在自然中探索，记录美好瞬间。', []],
    [tWang.id, '教学课件素材', '2026-05-03', '平时收集的优质教学图片，便于备课复用。', []],
    [tChen.id, '艺术节彩排', '2026-06-18', '合唱与舞蹈节目的精彩排练瞬间。', []],
  ]
  for (const [tid, title, date, desc, photos] of myGall) {
    await conn.execute(
      `INSERT INTO my_galleries (id, teacherId, title, date, description, photos) VALUES (UUID(),?,?,?,?,?)`,
      [tid, title, date, desc, J(photos)])
  }
  stats.my_galleries = myGall.length

  // ============ 6. attendances（考勤，班级维度） ============
  const attDatesA = ['2026-07-20', '2026-07-21']
  for (const d of attDatesA) {
    const records = stuA.map((s, i) => ({
      studentId: s.id,
      status: i === 3 ? '迟到' : i === 4 ? '旷课' : '出勤',
    }))
    await conn.execute(
      `INSERT INTO attendances (id, teacherId, classId, date, records) VALUES (UUID(),?,?,?,?)`,
      [tWang.id, classA.id, d, J(records)])
  }
  const attB = [
    { studentId: stuB[0].id, status: '出勤' },
    { studentId: stuB[1].id, status: '出勤' },
    { studentId: stuB[2].id, status: '请假' },
    { studentId: stuB[3].id, status: '出勤' },
  ]
  await conn.execute(
    `INSERT INTO attendances (id, teacherId, classId, date, records) VALUES (UUID(),?,?,?,?)`,
    [tLi.id, classB.id, '2026-07-21', J(attB)])
  stats.attendances = attDatesA.length + 1

  // ============ 7. behavior_records（行为记录，学生维度） ============
  const behaviors = [
    [stuA[0], '积极发言', '语文课上主动回答问题，思路清晰', '2026-07-20'],
    [stuA[1], '乐于助人', '主动帮助同学订正错题', '2026-07-19'],
    [stuA[2], '课堂专注', '整节课注意力集中，笔记认真', '2026-07-21'],
    [stuB[0], '作业整洁', '数学作业书写工整，正确率高', '2026-07-20'],
    [stuB[2], '团结同学', '活动中主动配合同学完成任务', '2026-07-18'],
  ]
  for (const [s, b, note, date] of behaviors) {
    await conn.execute(
      `INSERT INTO behavior_records (id, teacherId, studentId, studentName, date, behavior, note) VALUES (UUID(),?,?,?,?,?,?)`,
      [s.teacherId, s.id, s.name, date, b, note])
  }
  stats.behavior_records = behaviors.length

  // ============ 8. reading_logs（阅读打卡，学生维度） ============
  const readings = [
    [stuA[0], '小猪唏哩呼噜', '孙幼军', 25, 20, '2026-07-20', '最喜欢故事情节，很搞笑'],
    [stuA[1], '猜猜我有多爱你', '', 18, 15, '2026-07-21', '和妈妈一起读的'],
    [stuA[2], '米小圈上学记', '北猫', 30, 25, '2026-07-22', '已经读到第三本了'],
    [stuB[0], '昆虫记（少儿版）', '法布尔', 22, 18, '2026-07-20', '认识了好多昆虫'],
  ]
  for (const [s, book, author, pages, mins, date, note] of readings) {
    await conn.execute(
      `INSERT INTO reading_logs (id, teacherId, studentId, studentName, bookTitle, author, pages, minutes, date, note) VALUES (UUID(),?,?,?,?,?,?,?,?,?)`,
      [s.teacherId, s.id, s.name, book, author, pages, mins, date, note])
  }
  stats.reading_logs = readings.length

  // ============ 9. checkins（习惯打卡，学生维度） ============
  const checkins = [
    [stuA[0], 'reading', '2026-07-20', 1, '完成每日阅读'],
    [stuA[0], 'homework', '2026-07-20', 1, '作业按时完成'],
    [stuA[2], 'sport', '2026-07-21', 1, '跳绳100个'],
    [stuA[1], 'behavior', '2026-07-19', 1, '主动问好'],
    [stuB[0], 'reading', '2026-07-20', 1, '亲子共读'],
    [stuB[2], 'sport', '2026-07-22', 1, '跑步'],
  ]
  for (const [s, type, date, count, note] of checkins) {
    await conn.execute(
      `INSERT INTO checkins (id, teacherId, studentId, studentName, type, date, count, note) VALUES (UUID(),?,?,?,?,?,?,?)`,
      [s.teacherId, s.id, s.name, type, date, count, note])
  }
  stats.checkins = checkins.length

  // ============ 10. reward_records（奖励，班级维度） ============
  const rewards = [
    [classA.id, tWang.id, stuA[0].id, '红花', 3, '课堂积极发言', '2026-07-20'],
    [classA.id, tWang.id, stuA[1].id, '小红旗', 2, '乐于助人', '2026-07-19'],
    [classA.id, tWang.id, stuA[2].id, '进步星', 5, '数学成绩进步明显', '2026-07-21'],
    [classB.id, tLi.id, stuB[0].id, '红花', 3, '作业整洁', '2026-07-20'],
  ]
  for (const [cid, tid, sid, type, pts, reason, date] of rewards) {
    await conn.execute(
      `INSERT INTO reward_records (id, teacherId, classId, studentId, type, points, reason, date) VALUES (UUID(),?,?,?,?,?,?,?)`,
      [tid, cid, sid, type, pts, reason, date])
  }
  stats.reward_records = rewards.length

  // ============ 11. score_records（课堂积分，班级维度） ============
  const scores = [
    [classA.id, tWang.id, stuA[0].id, stuA[0].name, 5, '回答问题正确'],
    [classA.id, tWang.id, stuA[1].id, stuA[1].name, 3, '书写工整'],
    [classA.id, tWang.id, stuA[2].id, stuA[2].name, 8, '小测验满分'],
    [classB.id, tLi.id, stuB[0].id, stuB[0].name, 4, '板演正确'],
    [classB.id, tLi.id, stuB[2].id, stuB[2].name, 6, '小组合作积极'],
  ]
  for (const [cid, tid, sid, sname, delta, reason] of scores) {
    await conn.execute(
      `INSERT INTO score_records (id, teacherId, classId, studentId, studentName, delta, reason) VALUES (UUID(),?,?,?,?,?,?)`,
      [tid, cid, sid, sname, delta, reason])
  }
  stats.score_records = scores.length

  // ============ 12. group_scores（小组积分，班级维度） ============
  const groupsA = [
    [classA.id, tWang.id, '雄鹰队', 28, '#FF6B6B'],
    [classA.id, tWang.id, '猛虎队', 22, '#4ECDC4'],
    [classA.id, tWang.id, '飞天队', 35, '#FFD93D'],
    [classA.id, tWang.id, '智慧队', 19, '#6C5CE7'],
  ]
  const groupsB = [
    [classB.id, tLi.id, '阳光组', 24, '#FF6B6B'],
    [classB.id, tLi.id, '彩虹组', 31, '#4ECDC4'],
    [classB.id, tLi.id, '星辰组', 17, '#6C5CE7'],
  ]
  for (const [cid, tid, name, pts, color] of [...groupsA, ...groupsB]) {
    await conn.execute(
      `INSERT INTO group_scores (id, teacherId, classId, name, points, color) VALUES (UUID(),?,?,?,?,?)`,
      [tid, cid, name, pts, color])
  }
  stats.group_scores = groupsA.length + groupsB.length

  // ============ 13. class_activities（班级活动，班级维度） ============
  const acts = [
    [classA.id, tWang.id, '春日踏青', '2026-04-12', '前往植物园春游，观察春天植物，孩子们很开心。', []],
    [classA.id, tWang.id, '主题班会：我爱读书', '2026-05-15', '分享读书心得，评选阅读之星。', []],
    [classB.id, tLi.id, '数学趣味运动会', '2026-06-01', '通过游戏比拼口算速度，寓教于乐。', []],
  ]
  for (const [cid, tid, title, date, desc, photos] of acts) {
    await conn.execute(
      `INSERT INTO class_activities (id, teacherId, classId, title, date, description, photos) VALUES (UUID(),?,?,?,?,?,?)`,
      [tid, cid, title, date, desc, J(photos)])
  }
  stats.class_activities = acts.length

  // ============ 14. class_expenses（班费，班级维度） ============
  const exps = [
    [classA.id, tWang.id, '文具', '购买', 45.5, '2026-03-01', '班级图书角笔记本', '王老师'],
    [classA.id, tWang.id, '活动', '春游', 320.0, '2026-04-12', '植物园门票及午餐', '王老师'],
    [classA.id, tWang.id, '奖品', '奖励', 88.0, '2026-05-20', '期中表彰小奖品', '王老师'],
    [classB.id, tLi.id, '文具', '购买', 36.0, '2026-03-05', '数学学具', '李老师'],
  ]
  for (const [cid, tid, type, cat, amt, date, desc, handler] of exps) {
    await conn.execute(
      `INSERT INTO class_expenses (id, teacherId, classId, type, category, amount, date, description, handler) VALUES (UUID(),?,?,?,?,?,?,?,?)`,
      [tid, cid, type, cat, amt, date, desc, handler])
  }
  stats.class_expenses = exps.length

  // ============ 15. class_galleries（班级相册，photos 留空） ============
  const cgall = [
    [classA.id, tWang.id, '春游精彩瞬间', '2026-04-12', '孩子们在自然中欢笑的珍贵回忆。', []],
    [classA.id, tWang.id, '快乐六一', '2026-06-01', '六一文艺汇演班级合影。', []],
    [classB.id, tLi.id, '趣味运动会', '2026-06-01', '二年级二班的运动风采。', []],
  ]
  for (const [cid, tid, title, date, desc, photos] of cgall) {
    await conn.execute(
      `INSERT INTO class_galleries (id, teacherId, classId, title, description, date, photos) VALUES (UUID(),?,?,?,?,?,?)`,
      [tid, cid, title, desc, date, J(photos)])
  }
  stats.class_galleries = cgall.length

  // ============ 16. parent_contacts（家校联系，学生维度） ============
  const pcontacts = [
    [stuA[0], classA.id, '张三妈妈', '母亲', '13810000001', '', '微信', '反馈孩子近期在家阅读习惯变好', '2026-07-18', '建议坚持每日阅读30分钟'],
    [stuA[1], classA.id, '李四爸爸', '父亲', '13810000002', '', '电话', '沟通孩子课堂专注度问题', '2026-07-17', '已约定下周观察反馈'],
    [stuA[2], classA.id, '王五妈妈', '母亲', '13810000003', '', '微信', '表扬孩子数学进步', '2026-07-21', ''],
    [stuB[0], classB.id, '吴九妈妈', '母亲', '13820000001', '', '电话', '了解孩子英语读音情况', '2026-07-19', '建议多听课文音频'],
  ]
  for (const [s, cid, pn, rel, phone, wechat, method, content, date, follow] of pcontacts) {
    await conn.execute(
      `INSERT INTO parent_contacts (id, teacherId, studentId, studentName, classId, parentName, relation, phone, wechat, method, content, date, followUp) VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?)`,
      [s.teacherId, s.id, s.name, cid, pn, rel, phone, wechat ? 'wx_' + pn : '', method, content, date, follow])
  }
  stats.parent_contacts = pcontacts.length

  // ============ 17. seat_layouts（座位表，班级维度） ============
  const mkSeats = (stuList, rows, cols) => {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null))
    stuList.forEach((s, i) => { grid[Math.floor(i / cols)][i % cols] = s.id })
    return grid
  }
  const seatA = mkSeats(stuA, 2, 4) // 6 人 → 2 排 4 列
  await conn.execute(
    `INSERT INTO seat_layouts (id, teacherId, classId, name, \`rows\`, \`cols\`, seats, active, aisleCols) VALUES (UUID(),?,?,?,?,?,?,?,?)`,
    [tWang.id, classA.id, '标准座位表', 2, 4, J(seatA), 1, J([1])])
  const seatB = mkSeats(stuB, 2, 3) // 4 人 → 2 排 3 列
  await conn.execute(
    `INSERT INTO seat_layouts (id, teacherId, classId, name, \`rows\`, \`cols\`, seats, active, aisleCols) VALUES (UUID(),?,?,?,?,?,?,?,?)`,
    [tLi.id, classB.id, '标准座位表', 2, 3, J(seatB), 1, J([1])])
  stats.seat_layouts = 2

  // ============ 18. duty_rosters（值日表，班级维度） ============
  const mkDuty = (stuList) => {
    const duties = ['扫地', '擦黑板', '倒垃圾', '摆桌椅']
    const arr = []
    for (let i = 0; i < 5; i++) {
      const d = new Date('2026-07-20')
      d.setDate(d.getDate() + i)
      arr.push({
        date: d.toISOString().slice(0, 10),
        persons: duties.map((_, k) => (stuList[(i + k) % stuList.length] || stuList[0]).name),
      })
    }
    return arr
  }
  await conn.execute(
    `INSERT INTO duty_rosters (id, teacherId, classId, name, type, assignments) VALUES (UUID(),?,?,?,?,?)`,
    [tWang.id, classA.id, '本周值日', '值日', J(mkDuty(stuA))])
  await conn.execute(
    `INSERT INTO duty_rosters (id, teacherId, classId, name, type, assignments) VALUES (UUID(),?,?,?,?,?)`,
    [tLi.id, classB.id, '本周值日', '值日', J(mkDuty(stuB))])
  stats.duty_rosters = 2

  // ============ 19. award_categories（奖励分类，引用表） ============
  const cats = [
    [tWang.id, '学习之星', '#FF6B6B'],
    [tWang.id, '进步之星', '#4ECDC4'],
    [tWang.id, '美德少年', '#FFD93D'],
    [tWang.id, '运动健将', '#6C5CE7'],
    [tWang.id, '艺术特长', '#45B7D1'],
  ]
  for (const [tid, name, color] of cats) {
    await conn.execute(
      `INSERT INTO award_categories (id, teacherId, name, color) VALUES (UUID(),?,?,?)`,
      [tid, name, color])
  }
  stats.award_categories = cats.length

  // ============ 20. lesson_observations（听课记录，引用表） ============
  const obs = [
    [tWang.id, '李老师', classB.id, '二年级二班', '数学', '《100以内加减法》', '2026-07-15', '情境创设自然，练习设计有层次，学生参与度高。', '可加强个别后进生关注。', '优秀'],
    [tWang.id, '张老师', classB.id, '二年级二班', '英语', 'Unit 4 My family', '2026-07-16', '口语操练充分，游戏环节生动。', '板书可再规范。', '良好'],
  ]
  for (const [tid, tn, cid, cn, subj, topic, date, str, sug, rating] of obs) {
    await conn.execute(
      `INSERT INTO lesson_observations (id, teacherId, teacherName, classId, className, subject, topic, date, strengths, suggestions, overallRating) VALUES (UUID(),?,?,?,?,?,?,?,?,?,?)`,
      [tid, tn, cid, cn, subj, topic, date, str, sug, rating])
  }
  stats.lesson_observations = obs.length

  // ============ 21. home_visits（家访，学生维度） ============
  const visits = [
    [stuA[1], '北京市朝阳区阳光路10号', '2026-07-12', '了解孩子在家学习环境，沟通专注力培养方法。', '已约定每日专注训练15分钟', 'completed'],
    [stuB[2], '北京市朝阳区明德里5号', '2026-07-14', '反馈孩子在校表现，家长配合督促阅读。', '', 'planned'],
  ]
  for (const [s, addr, date, content, follow, status] of visits) {
    await conn.execute(
      `INSERT INTO home_visits (id, teacherId, studentId, studentName, address, date, content, followUp, status, photos) VALUES (UUID(),?,?,?,?,?,?,?,?,?)`,
      [s.teacherId, s.id, s.name, addr, date, content, follow, status, J(null)])
  }
  stats.home_visits = visits.length

  // ============ 22. notice_templates（通知模板，引用表） ============
  const ntpl = [
    [tWang.id, '家长会通知', '各位家长：\n    我校定于【时间】召开家长会，地点【地点】，请准时参加。\n\n【班级】班主任', '家长会'],
    [tWang.id, '作业提醒', '亲爱的家长：\n    今日语文作业为【内容】，请督促孩子按时完成。\n\n【班级】', '作业'],
    [tLi.id, '安全告知', '各位家长：\n    近期请关注孩子上下学安全，提醒遵守交通规则。\n\n【班级】', '安全'],
  ]
  for (const [tid, title, content, cat] of ntpl) {
    await conn.execute(
      `INSERT INTO notice_templates (id, teacherId, title, content, category) VALUES (UUID(),?,?,?,?)`,
      [tid, title, content, cat])
  }
  stats.notice_templates = ntpl.length

  // ============ 23. picker_history（抽签历史，班级维度） ============
  const picks = [
    [classA.id, tWang.id, stuA[0].id, stuA[0].name],
    [classA.id, tWang.id, stuA[2].id, stuA[2].name],
    [classB.id, tLi.id, stuB[2].id, stuB[2].name],
  ]
  for (const [cid, tid, sid, sname] of picks) {
    await conn.execute(
      `INSERT INTO picker_history (id, teacherId, classId, studentId, studentName) VALUES (UUID(),?,?,?,?)`,
      [tid, cid, sid, sname])
  }
  stats.picker_history = picks.length

  // ---- 汇总 ----
  console.log('\n✅ 核心表种子数据补齐完成！')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const t of TARGET_TABLES) {
    console.log(`  ${t.padEnd(22)} +${stats[t] || 0}`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await conn.end()
}

seed().catch((e) => { console.error('❌ 种子失败:', e.message); process.exit(1) })
