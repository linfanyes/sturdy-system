import { runMigrations } from './migrations/runner'

// 独立迁移 CLI：供容器初始化入口（docker-entrypoint.sh）与手动执行使用。
// 从 process.env 读取数据库连接信息（云端 envVariables 注入 / 本地 .env 经 shell 加载）。
runMigrations()
  .then((res) => {
    if (res.ok) {
      console.log('✅ 数据库迁移执行完成')
      process.exit(0)
    }
    console.error('❌ 数据库迁移执行失败（连接/锁等致命错误，见上方日志）')
    process.exit(1)
  })
  .catch((e) => {
    console.error('❌ 数据库迁移执行异常:', e?.message || e)
    process.exit(1)
  })
