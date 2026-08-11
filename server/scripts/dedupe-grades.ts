/**
 * 幂等清理 grades 表历史重复数据，使 (classId, examName, subject) 唯一索引可成功创建。
 *
 * 背景：P02 修复引入了 grades 唯一索引 idx_grades_unique_submission 防止并发提交重复，
 * 但在该索引建立之前，部分历史数据已存在重复（多为早期 save 未做 findOne 校验导致）。
 * 当 DB_SYNCHRONIZE=true 时，TypeORM 尝试创建唯一索引会因重复数据失败，后端无法启动。
 *
 * 本脚本：对每组 (classId, examName, subject) 重复记录，保留 createdAt 最新的一条，
 * 其余删除；再重建唯一索引。幂等可重复运行（无重复时直接通过）。
 *
 * 运行：在 server/ 目录执行 `npx tsx scripts/dedupe-grades.ts`
 *   或（编译后）`node .seed-dist/scripts/dedupe-grades.js`
 */
import 'reflect-metadata'
import { buildDataSource } from './seed-common'

async function main() {
  const ds = buildDataSource()
  await ds.initialize()
  console.log('✅ 数据库连接成功，开始清理 grades 重复数据...')

  const qr = ds.createQueryRunner()
  await qr.connect()
  try {
    // 1. 找出所有重复组
    const dups = await qr.query(
      `SELECT classId, examName, subject, COUNT(*) AS cnt
       FROM grades
       GROUP BY classId, examName, subject
       HAVING cnt > 1`,
    )
    if (!dups.length) {
      console.log('ℹ 未发现重复数据，无需清理。')
    } else {
      console.log(`ℹ 发现 ${dups.length} 组重复，开始逐组去重（保留最新一条）...`)
      let deletedTotal = 0
      for (const d of dups) {
        // 每组保留 createdAt 最大（最新）的一行，其余按 id 删除
        const rows = await qr.query(
          `SELECT id FROM grades
           WHERE classId = ? AND examName = ? AND subject = ?
           ORDER BY createdAt DESC`,
          [d.classId, d.examName, d.subject],
        )
        const keepId = rows[0]?.id
        const removeIds = rows.slice(1).map((r: any) => r.id)
        if (removeIds.length) {
          await qr.query(`DELETE FROM grades WHERE id IN (?)`, [removeIds])
          deletedTotal += removeIds.length
          console.log(
            `  · ${d.classId.slice(0, 8)}… / ${d.examName} / ${d.subject}：保留 ${keepId.slice(0, 8)}…，删除 ${removeIds.length} 条`,
          )
        }
      }
      console.log(`✅ 共删除 ${deletedTotal} 条重复记录。`)
    }

    // 2. 幂等重建唯一索引（存在则先 drop 再 create，避免启动期 synchronize 报错）
    const indexName = 'idx_grades_unique_submission'
    console.log(`ℹ 尝试重建唯一索引 ${indexName} ...`)
    try {
      await qr.query(`ALTER TABLE grades DROP INDEX \`${indexName}\``)
      console.log(`  · 已删除旧索引 ${indexName}`)
    } catch {
      // 索引不存在时忽略
    }
    try {
      await qr.query(
        `ALTER TABLE grades ADD UNIQUE INDEX \`${indexName}\` (classId, examName, subject)`,
      )
      console.log(`  · 已创建唯一索引 ${indexName}`)
    } catch (e: any) {
      console.error(`❌ 创建唯一索引失败：${e?.message || e}`)
      console.error('   仍有重复数据未清理干净，请检查 grades 表。')
      process.exitCode = 1
    }
  } finally {
    await qr.release()
    await ds.destroy()
  }
}

main().catch((e) => {
  console.error('❌ 清理失败:', e?.message || e)
  if (e?.stack) console.error(e.stack)
  process.exit(1)
})
