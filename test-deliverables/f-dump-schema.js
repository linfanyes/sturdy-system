// 导出 gardener_test 各业务表真实列结构 + 样例行，用于与前端 mock 字段对齐
const mysql = require('mysql2/promise')

const DB = { host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test', connectTimeout: 8000 }

const TABLES = [
  'todos', 'schedules', 'notices', 'behavior_records', 'homework', 'award_records',
  'class_activities', 'duty_rosters', 'class_galleries', 'my_galleries', 'growth_entries',
  'messages', 'attendances', 'lesson_plan_templates', 'reading_logs', 'home_visits',
  'semesters', 'parent_contacts', 'group_scores', 'score_records', 'reward_records',
  'checkins', 'resources', 'backups', 'notes', 'class_duty_configs', 'seat_layouts',
  'generated_papers', 'generated_lesson_plans', 'generated_knowledges', 'paper_queries',
  'ai_settings', 'work_logs', 'lesson_observations', 'award_categories',
]

;(async () => {
  const conn = await mysql.createConnection(DB)
  for (const t of TABLES) {
    try {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ORDINAL_POSITION`,
        [DB.database, t]
      )
      if (!cols.length) { console.log(`\n### ${t}: (no such table)`); continue }
      const [rows] = await conn.query(`SELECT * FROM \`${t}\` LIMIT 1`)
      const sample = rows[0] || null
      const colNames = cols.map((c) => c.COLUMN_NAME)
      console.log(`\n### ${t}  (rows=${rows.length})`)
      console.log('COLS:', colNames.join(', '))
      if (sample) {
        const shown = {}
        for (const k of colNames) {
          let v = sample[k]
          if (v === null) v = 'NULL'
          else if (typeof v === 'object') v = JSON.stringify(v).slice(0, 80)
          else if (typeof v === 'string' && v.length > 60) v = v.slice(0, 60) + '…'
          shown[k] = v
        }
        console.log('SAMPLE:', JSON.stringify(shown, null, 0))
      }
    } catch (e) {
      console.log(`\n### ${t}: ERROR ${e.message}`)
    }
  }
  await conn.end()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
