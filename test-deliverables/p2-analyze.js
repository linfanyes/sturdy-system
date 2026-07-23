/**
 * P2 慢查询 & 索引覆盖分析脚本
 * 检查：
 * 1. performance_schema 中有无全表扫描回潮
 * 2. 对 CrudService.findAll 典型查询做 EXPLAIN
 * 3. 评估是否需要补充覆盖索引 (teacherId, createdAt)
 */
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'admin',
    database: 'gardener_test', connectTimeout: 8000,
    multipleStatements: true,
  })

  const results = {}

  // 1. 检查 sys.schema_tables_with_full_table_scans（如果有 sys 库）
  try {
    const [rows] = await c.query(
      "SELECT object_schema, object_name, rows_full_scanned, stat_value " +
      "FROM performance_schema.table_io_waits_summary_by_table " +
      "WHERE object_schema='gardener_test' AND count_read > 0 " +
      "ORDER BY sum_timer_read DESC LIMIT 15")
    results['全表扫描（IO 等待最大）'] = rows.map(r =>
      `${r.object_name}: 读取 ${r.count_read} 次, 总等待 ${(r.sum_timer_read/1e9).toFixed(0)}ms`
    )
  } catch(e) { results['全表扫描'] = `查询失败: ${e.message}` }

  // 2. 对 CrudService 典型查询做 EXPLAIN（以 score_records 为例，单教师 ~5 行）
  const TID = '3c1328c8-0110-4c7b-9f23-957913889c4d'
  const CID = 'c6629a24-f0fb-416f-a770-966ede39a825'

  const queries = [
    { label: 'findAll(teacherId) — 典型列表', sql: `EXPLAIN FORMAT=JSON SELECT * FROM score_records WHERE teacherId='${TID}' ORDER BY createdAt DESC LIMIT 0,20` },
    { label: 'findAll(teacherId,classId) — 带班级过滤', sql: `EXPLAIN FORMAT=JSON SELECT * FROM score_records WHERE teacherId='${TID}' AND classId='${CID}' ORDER BY createdAt DESC LIMIT 0,20` },
    { label: 'COUNT(teacherId)', sql: `EXPLAIN FORMAT=JSON SELECT COUNT(*) FROM score_records WHERE teacherId='${TID}'` },
    // 大表模拟：grades 可能更大
    { label: 'findAll(grades) — teacherId', sql: `EXPLAIN FORMAT=JSON SELECT * FROM grades WHERE teacherId='${TID}' ORDER BY createdAt DESC LIMIT 0,20` },
    // 建议的覆盖索引版本：假设已有 (teacherId, createdAt)
    { label: '假设覆盖索引: teacherId+createdAt', sql: `EXPLAIN FORMAT=JSON SELECT COUNT(*) FROM score_records WHERE teacherId='${TID}' ORDER BY createdAt DESC LIMIT 0,20` },
  ]

  results['EXPLAIN 分析'] = []
  for (const q of queries) {
    try {
      const [rows] = await c.query(q.sql)
      const plan = typeof rows[0]?.EXPLAIN === 'string' ? JSON.parse(rows[0].EXPLAIN) : rows[0]
      const extra = plan.query_block?.table?.access_type || plan.query_block?.select_list?.[0]?.items?.[0] || ''
      results['EXPLAIN 分析'].push({
        query: q.label,
        access_type: plan.query_block?.table?.access_type ?? plan.access_type ?? '?',
        possible_keys: plan.query_block?.table?.possible_keys ?? '?',
        key: plan.query_block?.table?.key ?? '?',
        rows_examined: plan.query_block?.table?.rows_examined_per_scan ?? '?',
        extra: plan.query_block?.table?.filtered ?? '',
        using_filesort: JSON.stringify(plan).includes('filesort') ? '是 ⚠️' : '否',
      })
    } catch(e) { results['EXPLAIN 分析'].push({ query: q.label, error: e.message }) }
  }

  // 3. 收集表行数
  const [rows] = await c.query("SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='gardener_test' ORDER BY TABLE_ROWS DESC")
  results['表行数概况'] = rows.map(r => `${r.TABLE_NAME}: ${r.TABLE_ROWS}`)

  console.log(JSON.stringify(results, null, 2))
  await c.end()
})().catch(e => console.error(e.message))
