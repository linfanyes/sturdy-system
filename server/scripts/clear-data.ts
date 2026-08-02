/**
 * 清除测试数据
 *
 * 读取 seed-manifest.json 中记录的所有 ID，按外键依赖顺序精确删除，
 * 不会误删清单之外的真实数据。
 *
 * 运行：在 server/ 目录执行 `npm run seed:clear`（或 `npx tsx scripts/clear-data.ts`）
 */
import 'reflect-metadata'
import { buildDataSource, loadManifest, clearByManifest, MANIFEST_PATH } from './seed-common'

async function main() {
  const m = loadManifest()
  if (!m) {
    console.log(`⚠ 未找到种子清单 ${MANIFEST_PATH}，无需清除（可能已清除或未生成过）。`)
    return
  }
  const ds = buildDataSource()
  await ds.initialize()
  console.log('✅ 数据库连接成功，开始按清单清除测试数据...')
  await clearByManifest(ds, m)
  console.log('\n✅ 测试数据清除完成')
  await ds.destroy()
}

main().catch((e) => {
  console.error('❌ 清除失败:', e?.message || e)
  if (e?.stack) console.error(e.stack)
  process.exit(1)
})
