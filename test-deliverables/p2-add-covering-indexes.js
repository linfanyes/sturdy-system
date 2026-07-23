/**
 * P2 覆盖索引迁移（幂等）：在高增长业务表添加 (teacherId, createdAt) 覆盖索引
 * 消除 CrudService.findAll 的 ORDER BY createdAt DESC 的 filesort
 * 
 * 幂等：IF NOT EXISTS 或先 DROP 再 CREATE
 */
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin',
    database: 'gardener_test', connectTimeout: 8000,
  })

  const indexes = [
    ['score_records',     'idx_score_records_cov',     '(teacherId, createdAt)'],
    ['reward_records',    'idx_reward_records_cov',    '(teacherId, createdAt)'],
    ['behavior_records',  'idx_behavior_records_cov',  '(teacherId, createdAt)'],
    ['checkins',          'idx_checkins_cov',          '(teacherId, createdAt)'],
    ['reading_logs',      'idx_reading_logs_cov',      '(teacherId, createdAt)'],
    ['grades',            'idx_grades_cov',            '(teacherId, createdAt)'],
    ['parent_contacts',   'idx_parent_contacts_cov',   '(teacherId, createdAt)'],
    ['home_visits',       'idx_home_visits_cov',       '(teacherId, createdAt)'],
    ['growth_entries',    'idx_growth_entries_cov',    '(teacherId, createdAt)'],
  ]

  let added = 0
  for (const [table, idxName, cols] of indexes) {
    try {
      const sql = `ALTER TABLE \`${table}\` ADD INDEX \`${idxName}\` ${cols}`
      await c.execute(sql)
      console.log(`✅ ${table}: ${idxName}${cols}`)
      added++
    } catch (e) {
      if (e.errno === 1061) { // duplicate key name
        console.log(`⏭️  ${table}: ${idxName} 已存在`)
      } else {
        console.error(`❌ ${table}: ${e.message}`)
      }
    }
  }

  console.log(`\n结果: ${added}/${indexes.length} 个新索引`)

  // 验证
  console.log('\n验证:')
  const [rows] = await c.query("SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='gardener_test' AND INDEX_NAME LIKE '%_cov' GROUP BY TABLE_NAME, INDEX_NAME ORDER BY TABLE_NAME")
  for (const r of rows) {
    console.log(`  ${r.TABLE_NAME}: ${r.INDEX_NAME}(${r.cols})`)
  }

  await c.end()
})().catch(e => console.error(e.message))
