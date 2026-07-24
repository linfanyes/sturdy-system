-- students 表新增 parent_password_hash 列：家长密码 bcrypt 哈希
-- 幂等：用 information_schema 检查后执行，可重复运行不报错。
-- synchronize=true 可能已自动添加，本迁移作为生产环境兜底。
-- 字段 nullable：为空时登录回退到默认密码 '123456'，保持向后兼容。

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'students' AND column_name = 'parentPasswordHash');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE students ADD COLUMN parentPasswordHash VARCHAR(100) NULL COMMENT ''家长密码 bcrypt 哈希（空则使用默认密码 123456）''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
