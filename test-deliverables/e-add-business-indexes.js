/**
 * 园丁工作台 · 业务索引补齐迁移 (P0-2)
 * =====================================
 * 所有业务表均以 teacherId 作为租户键过滤，绝大多数列表查询还叠加
 * classId / studentId。此前这些列无任何二级索引，导致全表扫描。
 *
 * 本脚本为所有业务表补齐 (teacherId[, classId][, studentId]) 复合索引，
 * 覆盖最频繁的组合过滤，显著提升列表/分页查询性能。
 *
 * 幂等：已存在的索引跳过，可重复执行。
 * 用法：node e-add-business-indexes.js
 */

const mysql = require('mysql2/promise')

// [表, 索引名, 列数组]
const INDEX_PLAN = [
  // —— 17 个核心表 ——
  ['todos', 'idx_teacher', ['teacherId']],
  ['attendances', 'idx_teacher_class', ['teacherId', 'classId']],
  ['behavior_records', 'idx_teacher_student', ['teacherId', 'studentId']],
  ['class_activities', 'idx_teacher_class', ['teacherId', 'classId']],
  ['class_expenses', 'idx_teacher_class', ['teacherId', 'classId']],
  ['class_galleries', 'idx_teacher_class', ['teacherId', 'classId']],
  ['reading_logs', 'idx_teacher_student', ['teacherId', 'studentId']],
  ['reward_records', 'idx_teacher_class_stu', ['teacherId', 'classId', 'studentId']],
  ['score_records', 'idx_teacher_class_stu', ['teacherId', 'classId', 'studentId']],
  ['semesters', 'idx_teacher', ['teacherId']],
  ['work_logs', 'idx_teacher', ['teacherId']],
  ['lesson_plan_templates', 'idx_teacher', ['teacherId']],
  ['parent_contacts', 'idx_teacher_class_stu', ['teacherId', 'classId', 'studentId']],
  ['seat_layouts', 'idx_teacher_class', ['teacherId', 'classId']],
  ['duty_rosters', 'idx_teacher_class', ['teacherId', 'classId']],
  ['my_galleries', 'idx_teacher', ['teacherId']],
  ['checkins', 'idx_teacher_student', ['teacherId', 'studentId']],
  // —— 强相关引用表 ——
  ['award_categories', 'idx_teacher', ['teacherId']],
  ['group_scores', 'idx_teacher_class', ['teacherId', 'classId']],
  ['lesson_observations', 'idx_teacher_class', ['teacherId', 'classId']],
  ['home_visits', 'idx_teacher_student', ['teacherId', 'studentId']],
  ['notice_templates', 'idx_teacher', ['teacherId']],
  ['picker_history', 'idx_teacher_class', ['teacherId', 'classId']],
  // —— 其余业务表（同样以 teacherId 为租户键） ——
  ['grades', 'idx_teacher_class', ['teacherId', 'classId']],
  ['exams', 'idx_teacher_class', ['teacherId', 'classId']],
  ['backup_snapshots', 'idx_teacher', ['teacherId']],
  ['notices', 'idx_teacher_class', ['teacherId', 'classId']],
  ['homework', 'idx_teacher_class', ['teacherId', 'classId']],
  ['schedules', 'idx_teacher_class', ['teacherId', 'classId']],
  ['resources', 'idx_teacher', ['teacherId']],
  ['growth_entries', 'idx_teacher_student', ['teacherId', 'studentId']],
  ['notes', 'idx_teacher', ['teacherId']],
  ['award_records', 'idx_teacher', ['teacherId']],
]

async function addIndex(conn, table, name, cols) {
  const [ex] = await conn.execute(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema='gardener_test' AND table_name=? AND INDEX_NAME=?",
    [table, name])
  if (ex.length) return false
  const colStr = cols.map((c) => `\`${c}\``).join(', ')
  await conn.execute(`CREATE INDEX \`${name}\` ON \`${table}\` (${colStr})`)
  return true
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test',
  })
  let added = 0
  let skipped = 0
  for (const [table, name, cols] of INDEX_PLAN) {
    const created = await addIndex(conn, table, name, cols)
    if (created) { added++; console.log(`  + ${name} ON ${table} (${cols.join(',')})`) }
    else { skipped++; }
  }
  console.log(`\n✅ 索引迁移完成：新增 ${added}，已存在跳过 ${skipped}`)
  await conn.end()
}

migrate().catch((e) => { console.error('❌ 索引迁移失败:', e.message); process.exit(1) })
