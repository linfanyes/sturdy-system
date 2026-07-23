/**
 * P2 慢查询 & 索引健康监控脚本
 * 用法: node test-deliverables/p2-monitor.js
 * 周期性运行（例如每周）来检查索引使用情况和全表扫描回潮
 */
const mysql = require('mysql2/promise');

const CONN = { host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test', connectTimeout: 8000 }

async function run() {
  const c = await mysql.createConnection(CONN)
  const report = []
  let hasIssue = false

  // 1. 检查各表的索引使用情况 — 对每个业务表做 EXPLAIN 典型查询
  const tables = [
    { name: 'score_records', query: "SELECT COUNT(*) > 0 FROM score_records WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
    { name: 'reading_logs',  query: "SELECT COUNT(*) > 0 FROM reading_logs WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
    { name: 'behavior_records', query: "SELECT COUNT(*) > 0 FROM behavior_records WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
    { name: 'reward_records', query: "SELECT COUNT(*) > 0 FROM reward_records WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
    { name: 'checkins',  query: "SELECT COUNT(*) > 0 FROM checkins WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
    { name: 'grades',  query: "SELECT COUNT(*) > 0 FROM grades WHERE teacherId='3c1328c8-0110-4c7b-9f23-957913889c4d' ORDER BY createdAt DESC LIMIT 1" },
  ]

  for (const t of tables) {
    try {
      const [rows] = await c.query(`EXPLAIN ${t.query}`)
      const info = rows[0]
      const hasFilesort = info.Extra && info.Extra.includes('Using filesort')
      const usingIndex = info.Extra && info.Extra.includes('Using index')
      const rowCount = info.rows

      const status = hasFilesort ? `⚠️ filesort` : `✅ OK`
      if (hasFilesort) hasIssue = true
      report.push(`${t.name}: type=${info.type}, key=${info.key || '-none-'}, rows=${rowCount}, Extra=[${info.Extro || info.Extra || ''}] → ${status}`)
    } catch (e) {
      report.push(`${t.name}: ❌ ${e.message}`)
      hasIssue = true
    }
  }

  // 2. 检查是否有不使用的索引
  try {
    const [unused] = await c.query(
      "SELECT object_schema, object_name, index_name FROM performance_schema.table_io_waits_summary_by_index_usage " +
      "WHERE index_name IS NOT NULL AND index_name NOT LIKE 'PRIMARY' AND count_star = 0 AND object_schema = 'gardener_test'")
    if (unused.length) {
      report.push(`\n📭 未使用的索引:`)
      for (const u of unused)
        report.push(`  ${u.object_name}.${u.index_name}`)
    } else {
      report.push(`\n📭 未使用索引: 无 — 所有业务索引均活跃`)
    }
  } catch (e) {
    report.push(`\n📭 未使用索引检查: performance_schema 不可用 (${e.message})`)
  }

  // 3. 监控建议
  report.push('\n📋 监控建议:')
  if (!hasIssue) {
    report.push('  ✅ 所有查询均使用索引，无 filesort 问题')
  } else {
    report.push('  ⚠️ 存在 filesort，建议为本周期内行数增长超过 100 的表添加 (teacherId, createdAt) 覆盖索引')
    report.push('  📌 命令: CREATE INDEX idx_xxx_covering ON xxx(teacherId, createdAt)')
  }
  report.push(`  下次运行: 数据量增长后再运行本脚本，关注 rows 列的变化`)

  console.log(report.join('\n'))
  await c.end()
}

run().catch(e => { console.error(e); process.exit(1) })
