-- 修复 classes 表缺失 teacherId 列的缺陷。
-- 背景：school-admin.service 在 listClasses / deleteTeacher / createClass / updateClass /
-- 建学生 等十几处都用 classes.teacherId 作为「班级归属键」查询与写入；但 ClassItem 实体
-- 一直没有该列，导致：
--   1) 查询时 TypeORM 抛 EntityColumnNotFound —— 校管「班级列表」等页面直接崩溃（即用户反馈的页面报错）；
--   2) createClass 设置的 teacherId 被静默丢弃，班级失去归属，listClasses 无法按本校隔离。
-- 本迁移：补列 + 回填历史数据（从 class_members 的 head 记录取班主任 id）+ 加索引。
-- 幂等：列/索引已存在则跳过；依赖 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();

-- 1) 补列（若不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'teacherId'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `classes` ADD COLUMN `teacherId` varchar(255) NOT NULL DEFAULT '''' COMMENT ''班级归属键：班主任用户ID（校管按此列隔离本班）''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 回填历史班级：优先取本学期 head，其次任意 head；无 head 则保持空（不影响新数据）
UPDATE `classes` c
SET c.teacherId = COALESCE(
  (SELECT cm.teacherId FROM `class_members` cm
   WHERE cm.classId = c.id AND cm.role = 'head'
   ORDER BY (cm.term = c.term) DESC, cm.createdAt DESC
   LIMIT 1),
  c.teacherId
)
WHERE c.teacherId = '' OR c.teacherId IS NULL;

-- 3) 为高频 teacherId 查询加索引（若不存在）
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'classes' AND INDEX_NAME = 'idx_classes_teacher'
);
SET @sql2 = IF(@idx_exists = 0,
  'ALTER TABLE `classes` ADD INDEX `idx_classes_teacher` (`teacherId`)',
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
