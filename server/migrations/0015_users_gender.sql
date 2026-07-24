-- users 表新增 gender 列（性别：男/女）
-- 幂等：用 information_schema 检查后执行，可重复运行不报错。
-- synchronize=true 可能已自动添加，本迁移作为生产环境兜底。

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'gender');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN gender VARCHAR(8) NOT NULL DEFAULT '''' COMMENT ''性别(男/女)''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
