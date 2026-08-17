import { DataSource, EntityManager } from 'typeorm'

/**
 * 事务执行辅助函数。
 *
 * 封装 dataSource.transaction 的通用模式，便于在 service 层快速包装批量写入操作。
 *
 * 现有批量操作已使用事务（无需重复包装）：
 *   - grades.service.ts::importGrades  — 成绩批量导入
 *   - students.module.ts::importStudents — 学生批量导入
 *
 * 使用方式：
 *   return await runInTransaction(this.dataSource, async (manager) => {
 *     const repo = manager.getRepository(Entity)
 *     await repo.save(entities)
 *     return result
 *   })
 */
export async function runInTransaction<T>(
  ds: DataSource,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return ds.transaction(async (manager) => {
    return await fn(manager)
  })
}
