-- 少儿编程作品表补列：student_id（练习作品所有者）
-- 语义：家长/学生在家长端创作的练习作品，以 student_id 标识归属（与 teacher_id 互斥）。
--        教师作品 teacher_id 有值、student_id 为 null；练习作品反之。
-- 幂等：列/索引已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();

-- 1) 补 student_id 列
SET @col = (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND column_name = 'student_id');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE kids_coding_projects ADD COLUMN student_id VARCHAR(64) NULL COMMENT \'练习作品所有者(家长端创作)，与 teacher_id 互斥\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 补 idx_kc_stu 索引（按 student_id 查询本人练习作品）
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND index_name = 'idx_kc_stu');
SET @sql2 = IF(
  @idx = 0,
  'ALTER TABLE kids_coding_projects ADD INDEX idx_kc_stu (student_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
