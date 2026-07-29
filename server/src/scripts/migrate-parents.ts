import { DataSource } from 'typeorm'
import { Student } from '../students/student.entity'
import { Parent } from '../parent/parent.entity'

/**
 * 迁移脚本：将现有 students.parentOpenId 数据迁移到 parents 表 + students.parentId。
 * 幂等运行（已迁移的记录不会重复处理）。
 *
 * 注意：parentOpenId 列已在实体中移除，此脚本使用 raw SQL 直接查询数据库列。
 * 运行迁移后请手动删除该数据库列。
 *
 * 运行方式：
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-parents.ts
 */
async function migrate() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'work_system',
    entities: [Student, Parent],
    synchronize: false,  // 避免强制同步表结构
  })
  await ds.initialize()

  const queryRunner = ds.createQueryRunner()
  try {
    // 检查 parentOpenId 列是否存在
    const columns = await queryRunner.getTable('students')
    if (!columns) { console.log('students 表不存在'); return }
    const hasParentOpenId = columns.columns.some(c => c.name === 'parentOpenId')
    if (!hasParentOpenId) { console.log('parentOpenId 列已不存在，无需迁移'); return }
  } finally {
    await queryRunner.release()
  }

  const studentRepo = ds.getRepository(Student)
  const parentRepo = ds.getRepository(Parent)

  // 使用 raw SQL 查询 parentOpenId 列
  const rawStudents: any[] = await ds.query(
    'SELECT id, parentOpenId, parentName, parentNickName, parentId FROM students WHERE parentOpenId IS NOT NULL AND parentOpenId != \'\'',
  )

  if (!rawStudents.length) { console.log('没有待迁移的数据'); await ds.destroy(); return }

  const groups = new Map<string, any[]>()
  for (const s of rawStudents) {
    if (!s.parentOpenId) continue
    if (!groups.has(s.parentOpenId)) groups.set(s.parentOpenId, [])
    groups.get(s.parentOpenId)!.push(s)
  }

  let parentCount = 0
  let studentCount = 0

  for (const [openid, stus] of groups) {
    let parent = await parentRepo.findOne({ where: { openId: openid } })
    if (!parent) {
      parent = parentRepo.create({
        openId: openid,
        parentName: stus[0].parentName || '家长',
        nickName: stus[0].parentNickName || undefined,
      })
      parent = await parentRepo.save(parent)
      parentCount++
    }
    for (const s of stus) {
      const student = await studentRepo.findOne({ where: { id: s.id } })
      if (student && !student.parentId) {
        student.parentId = parent.id
        await studentRepo.save(student)
        studentCount++
      }
    }
  }

  console.log('迁移完成：' + parentCount + ' 个家长身份，' + studentCount + ' 条学生记录已关联')
  await ds.destroy()
}

migrate().catch(e => { console.error(e); process.exit(1) })
