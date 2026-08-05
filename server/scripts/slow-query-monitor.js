/**
 * 慢查询监控脚本
 *
 * 功能：
 *   1. 设置 long_query_time = 0.5s，开启慢查询日志
 *   2. 查询最近 24 小时内的慢查询记录
 *   3. 输出报告：query_time、rows_examined、sql_text
 *   4. 对扫描行数 > 100 的查询给出索引优化建议
 *
 * 运行：在 server/ 目录执行 `node scripts/slow-query-monitor.js`
 *
 * 注意：SET GLOBAL 需要数据库账号具有 SUPER / SYSTEM_VARIABLES_ADMIN 权限。
 */
require('dotenv').config()
const mysql = require('mysql2/promise')

/* ===================== DB 配置 ===================== */
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gardener',
  charset: 'utf8mb4',
  timezone: '+08:00',
}

/* ===================== 工具函数 ===================== */

function formatDuration(seconds) {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(0)
  return `${m}m${s}s`
}

/**
 * 简单提取 SQL 中的 FROM / JOIN 表名，用于生成索引建议
 */
function extractTableNames(sqlText) {
  const tables = new Set()
  // 匹配 FROM table 和 JOIN table
  const fromMatches = sqlText.match(/(?:FROM|JOIN)\s+`?(\w+)`?/gi)
  if (fromMatches) {
    for (const m of fromMatches) {
      const t = m.replace(/(?:FROM|JOIN)\s+`?/i, '').replace(/`/g, '')
      if (t && !['mysql', 'information_schema', 'performance_schema', 'sys'].includes(t.toLowerCase())) {
        tables.add(t)
      }
    }
  }
  return Array.from(tables)
}

/**
 * 简单提取 WHERE 子句中可能的列名，用于建议索引列
 */
function extractWhereColumns(sqlText) {
  const columns = new Set()
  // 匹配 WHERE column = / WHERE column IN / WHERE column > 等
  const whereMatch = sqlText.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/is)
  if (whereMatch) {
    const whereClause = whereMatch[1]
    // 匹配 column_name = / column_name IN / column_name > 等
    const colMatches = whereClause.match(/`?(\w+)`?\s*(?:=|IN|>|<|>=|<=|LIKE|BETWEEN|IS)/gi)
    if (colMatches) {
      for (const m of colMatches) {
        const col = m.replace(/`/g, '').replace(/\s*(?:=|IN|>|<|>=|<=|LIKE|BETWEEN|IS).*/i, '').trim()
        if (col && !['AND', 'OR', 'NOT', 'WHERE', 'SELECT', 'FROM', 'JOIN', 'ON'].includes(col.toUpperCase())) {
          columns.add(col)
        }
      }
    }
  }
  return Array.from(columns)
}

/**
 * 生成索引优化建议
 */
function generateIndexSuggestion(row) {
  const tables = extractTableNames(row.sql_text || '')
  const columns = extractWhereColumns(row.sql_text || '')
  const suggestions = []

  if (tables.length === 0) return null

  for (const table of tables) {
    if (columns.length > 0) {
      suggestions.push(
        `  建议在 \`${table}\` 表上为 WHERE 条件列创建复合索引：\n` +
        `  ALTER TABLE \`${table}\` ADD INDEX idx_${columns.join('_')} (\`${columns.join('`, `')}\`);`
      )
    } else {
      suggestions.push(
        `  建议检查 \`${table}\` 表的查询是否缺少 WHERE 条件或索引覆盖。`
      )
    }
  }

  return suggestions.join('\n')
}

/* ===================== 主流程 ===================== */
async function main() {
  const conn = await mysql.createConnection(dbConfig)
  console.log('✅ 数据库连接成功\n')

  try {
    // ---- 1. 设置慢查询参数 ----
    console.log('════════════════════════════════════════════')
    console.log('  慢查询参数配置')
    console.log('════════════════════════════════════════════\n')

    try {
      await conn.query("SET GLOBAL long_query_time = 0.5")
      console.log('  ✅ long_query_time 设置为 0.5s')
    } catch (e) {
      console.warn(`  ⚠  设置 long_query_time 失败: ${e.message}`)
    }

    try {
      await conn.query("SET GLOBAL slow_query_log = 'ON'")
      console.log('  ✅ slow_query_log 已开启')
    } catch (e) {
      console.warn(`  ⚠  开启 slow_query_log 失败: ${e.message}`)
    }

    try {
      await conn.query("SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log'")
      console.log('  ✅ slow_query_log_file 设置为 /var/log/mysql/slow.log')
    } catch (e) {
      console.warn(`  ⚠  设置 slow_query_log_file 失败: ${e.message}`)
    }

    // ---- 2. 查看当前配置 ----
    const [vars] = await conn.query(
      "SHOW VARIABLES WHERE Variable_name IN ('long_query_time', 'slow_query_log', 'slow_query_log_file')"
    )
    console.log('\n  当前慢查询配置：')
    for (const v of vars) {
      console.log(`    ${v.Variable_name} = ${v.Value}`)
    }

    // ---- 3. 查询慢日志 ----
    console.log('\n════════════════════════════════════════════')
    console.log('  最近 24 小时慢查询报告')
    console.log('════════════════════════════════════════════\n')

    let slowLogs = []
    try {
      const [rows] = await conn.query(
        `SELECT * FROM mysql.slow_log
         WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
         ORDER BY query_time DESC
         LIMIT 50`
      )
      slowLogs = rows
    } catch (e) {
      console.warn(`  ⚠  查询 mysql.slow_log 失败: ${e.message}`)
      console.warn('     可能原因：慢查询日志表未启用（log_output 未设为 TABLE），或权限不足。')
      console.warn('     可尝试执行：SET GLOBAL log_output = \'TABLE\';\n')

      // 尝试从 performance_schema 获取
      try {
        const [rows2] = await conn.query(
          `SELECT EVENT_ID, SQL_TEXT AS sql_text, TIMER_WAIT/1000000000000 AS query_time,
                  ROWS_EXAMINED AS rows_examined
           FROM performance_schema.events_statements_summary_by_digest
           WHERE TIMER_WAIT/1000000000000 > 0.5
           ORDER BY TIMER_WAIT DESC
           LIMIT 50`
        )
        if (rows2.length > 0) {
          console.log('  ⚠  从 performance_schema 获取替代数据：\n')
          slowLogs = rows2
        } else {
          console.log('  ℹ  暂无慢查询记录（performance_schema 也为空）。')
          return
        }
      } catch (e2) {
        console.warn(`  ⚠  从 performance_schema 查询也失败: ${e2.message}`)
        return
      }
    }

    if (slowLogs.length === 0) {
      console.log('  ℹ  最近 24 小时内无慢查询记录。')
      console.log('  ℹ  如需采集慢查询，请在开启慢查询日志后运行业务流量。')
      return
    }

    // ---- 4. 输出报告 ----
    console.log(`  共发现 ${slowLogs.length} 条慢查询：\n`)

    const indexSuggestions = []
    let idx = 1

    for (const row of slowLogs) {
      const queryTime = parseFloat(row.query_time) || 0
      const rowsExamined = parseInt(row.rows_examined || row.rows_examined || 0, 10)
      const sqlText = (row.sql_text || row.SQL_TEXT || '').toString().trim()

      console.log(`  ┌─ [${idx}] ────────────────────────────`)
      console.log(`  │ query_time:    ${formatDuration(queryTime)}`)
      console.log(`  │ rows_examined: ${rowsExamined}`)
      console.log(`  │ rows_sent:     ${row.rows_sent || '-'}`)
      console.log(`  │ sql_text:     ${sqlText.length > 200 ? sqlText.substring(0, 200) + '...' : sqlText}`)
      console.log(`  └────────────────────────────────────\n`)

      if (rowsExamined > 100) {
        const suggestion = generateIndexSuggestion({ sql_text: sqlText })
        if (suggestion) {
          indexSuggestions.push({ idx, rowsExamined, suggestion, sqlText })
        }
      }

      idx++
    }

    // ---- 5. 索引优化建议 ----
    if (indexSuggestions.length > 0) {
      console.log('════════════════════════════════════════════')
      console.log('  索引优化建议')
      console.log('  (针对 rows_examined > 100 的查询)')
      console.log('════════════════════════════════════════════\n')

      for (const s of indexSuggestions) {
        console.log(`  [查询 #${s.idx}] 扫描 ${s.rowsExamined} 行`)
        console.log(s.suggestion)
        console.log()
      }

      console.log(`  共 ${indexSuggestions.length} 条建议。\n`)
    } else {
      console.log('  ℹ  无 rows_examined > 100 的查询，暂无需建议索引。')
    }

    console.log('════════════════════════════════════════════')
    console.log('  慢查询监控报告结束')
    console.log('════════════════════════════════════════════\n')

  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('❌ 慢查询监控脚本失败:', err?.message || err)
  if (err?.stack) console.error(err.stack)
  process.exit(1)
})
