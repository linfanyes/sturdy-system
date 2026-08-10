-- P02修复：成绩表唯一索引，防止并发提交同一班级同一考试同一科目的重复成绩。
-- 设计：每条 Grade 是「班级-考试-科目」维度的成绩单（scores 为该班全体学生），故 (classId, examName, subject) 应唯一。
-- 教训（同源于迁移 0013）：MySQL 不支持 `CREATE INDEX ... IF NOT EXISTS` 语法；且若表中已有重复数据，
--      CREATE UNIQUE INDEX 会报 `Duplicate entry ... for key`，导致本迁移（乃至整个启动）失败。
-- 本文件幂等、可重复执行，按顺序做三件事：
--   1) 先清理重复行：同一 (classId, examName, subject) 组合仅保留 createdAt 最新的一条（createdAt 相同取 id 最大）；
--   2) 用 information_schema 探测索引是否已存在，避免重复 CREATE 报错；
--   3) 仅当不存在时 CREATE UNIQUE INDEX。
-- ⚠️ 去重会删除重复行。执行前请确保已对 grades 表备份；若同一组合的重复行 scores 内容不同，
--    需先人工/应用层合并，否则保留的最新一条可能缺失其他组的学生成绩。

-- 1) 去重：保留每组最新一条，删除其余（MySQL 不允许 DELETE 子查询直接同表，故用 LEFT JOIN + 反选）
DELETE g FROM grades g
LEFT JOIN (
  SELECT classId, examName, subject,
         MAX(createdAt) AS mx_created,
         MAX(id)         AS mx_id
  FROM grades
  GROUP BY classId, examName, subject
) keep
  ON keep.classId    = g.classId
 AND keep.examName   = g.examName
 AND keep.subject    = g.subject
 AND keep.mx_created = g.createdAt
 AND keep.mx_id      = g.id
WHERE keep.classId IS NULL;

-- 2) 幂等建唯一索引（已存在则跳过，避免 `Duplicate key name` 报错中断启动）
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'grades'
    AND INDEX_NAME   = 'idx_grades_unique_submission'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX idx_grades_unique_submission ON grades (classId, examName, subject)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
