import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 学校级功能包开关迁移（TypeORM MigrationInterface 形式）。
 *
 * 说明：
 * - 本项目启动期通过 main.ts 的 runMigrations 自动执行 server/migrations/*.sql（幂等、失败不阻塞），
 *   `AddSchoolFeatureFlags.sql` 为实际生效的迁移脚本（与既有迁移风格一致）。
 * - 本类提供与 .sql 等价的 up() / 可回滚的 down()，便于在启用了 TypeORM 迁移运行器
 *   （`typeorm migration:run`）的环境中执行，并支持 `typeorm migration:revert` 回滚。
 * - 单列简单 JSON 字段，无数据迁移风险。
 * - 幂等：列已存在则跳过；可逆：down() 删除该列。
 * - 采用 information_schema 判定列是否存在（MySQL 不支持 ADD/DROP COLUMN IF EXISTS 的通用写法）。
 */
export class AddSchoolFeatureFlags implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `SET @db = DATABASE();
       SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'schools' AND column_name = 'feature_flags');
       SET @sql = IF(@col = 0, 'ALTER TABLE schools ADD COLUMN feature_flags JSON NULL', 'SELECT 1');
       PREPARE stmt FROM @sql;
       EXECUTE stmt;
       DEALLOCATE PREPARE stmt;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `SET @db = DATABASE();
       SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'schools' AND column_name = 'feature_flags');
       SET @sql = IF(@col > 0, 'ALTER TABLE schools DROP COLUMN feature_flags', 'SELECT 1');
       PREPARE stmt FROM @sql;
       EXECUTE stmt;
       DEALLOCATE PREPARE stmt;`,
    )
  }
}
