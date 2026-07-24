-- class_members 学期隔离迁移：加 term 列 + 回填 + 改唯一索引
--
-- 业务背景：班主任关系按学期隔离，春季 head 记录不阻止秋季担任其他班 head；
-- 老师切换到历史学期可查看该学期任教班级的学生表现。
--
-- 本迁移幂等（用 information_schema 检查后执行），可重复运行不报错。
-- 前置依赖：0012（建表）、0013（head 部分唯一索引）

-- 1. 安全添加 term 列（synchronize=true 可能已自动添加）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND column_name = 'term');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE class_members ADD COLUMN term VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''学期名(如2026春季)，与classes.term对齐''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 回填 term：用 classes 表的 term 填充现有记录（空 term 才回填，避免覆盖）
UPDATE class_members cm
  JOIN classes c ON cm.classId = c.id
  SET cm.term = IFNULL(c.term, '')
  WHERE cm.term = '';

-- 3. 去重：同一 (teacherId, classId, term) 只保留最早一条（防建唯一索引失败）
DELETE cm1 FROM class_members cm1
  INNER JOIN class_members cm2
  ON cm1.teacherId = cm2.teacherId
  AND cm1.classId = cm2.classId
  AND IFNULL(cm1.term, '') = IFNULL(cm2.term, '')
  AND cm1.createdAt > cm2.createdAt;

-- 4. 改普通唯一索引：(teacherId, classId) -> (teacherId, classId, term)
SET @idx_old = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_teacher_class');
SET @sql = IF(@idx_old > 0, 'ALTER TABLE class_members DROP INDEX idx_cm_teacher_class', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_new = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_teacher_class_term');
SET @sql = IF(@idx_new = 0,
  'ALTER TABLE class_members ADD UNIQUE INDEX idx_cm_teacher_class_term (teacherId, classId, term)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. 改 head 部分唯一索引：从 (head_teacher_id)/(head_class_id) 改为带 term
--    同 term 内一师一班 head / 一班一 head；跨学期 NULL+term 不冲突
SET @idx_old = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_head_teacher');
SET @sql = IF(@idx_old > 0, 'ALTER TABLE class_members DROP INDEX idx_cm_head_teacher', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_old = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_head_class');
SET @sql = IF(@idx_old > 0, 'ALTER TABLE class_members DROP INDEX idx_cm_head_class', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- head_teacher_id / head_class_id 生成列由 0013 创建；若不存在则补建（幂等）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND column_name = 'head_teacher_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE class_members ADD COLUMN head_teacher_id VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN role = ''head'' THEN teacherId ELSE NULL END) VIRTUAL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND column_name = 'head_class_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE class_members ADD COLUMN head_class_id VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN role = ''head'' THEN classId ELSE NULL END) VIRTUAL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_new = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_head_teacher_term');
SET @sql = IF(@idx_new = 0,
  'ALTER TABLE class_members ADD UNIQUE INDEX idx_cm_head_teacher_term (head_teacher_id, term)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_new = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_members' AND index_name = 'idx_cm_head_class_term');
SET @sql = IF(@idx_new = 0,
  'ALTER TABLE class_members ADD UNIQUE INDEX idx_cm_head_class_term (head_class_id, term)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
