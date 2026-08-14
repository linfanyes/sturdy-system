-- Migration: checkins / reading_logs 新增 studentId / classId 列
-- 背景：修复「小程序打卡/读书日志使用伪造 studentId（'s'+Date.now()），家长端按真实 studentId 查不到孩子记录」问题。
-- 目标：
--   - studentId 可空：关联真实学生ID（家长端按此查询孩子打卡），兼容历史手工录入未选学生的记录。
--   - classId 可空：归属班级，便于按班级筛选归档。
-- 幂等：用 information_schema 检查后执行，可重复运行不报错（synchronize=true 开发库可能已自动加列）。
-- 注意：本项目数据库列名沿用 TypeORM 默认 camelCase（如 teacherId/classId），与既有迁移保持一致。
-- 兜底：若 checkins / reading_logs 表在生产库尚未创建（synchronize=false 且无历史迁移建表），
--       跳过本迁移而非报错，避免阻断后续迁移执行。

-- checkins.studentId
SET @t1 = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'checkins');
SET @c1 = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'checkins' AND column_name = 'studentId');
SET @sql = IF(@t1 = 0 OR @c1 > 0, 'SELECT 1',
  'ALTER TABLE checkins ADD COLUMN studentId VARCHAR(64) NULL COMMENT ''关联真实学生ID（家长端按此查询孩子打卡）''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- checkins.classId
SET @c2 = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'checkins' AND column_name = 'classId');
SET @sql = IF(@t1 = 0 OR @c2 > 0, 'SELECT 1',
  'ALTER TABLE checkins ADD COLUMN classId VARCHAR(64) NULL COMMENT ''归属班级（可选，便于按班级筛选归档）'' AFTER studentId');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- reading_logs.studentId
SET @t2 = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'reading_logs');
SET @c3 = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'reading_logs' AND column_name = 'studentId');
SET @sql = IF(@t2 = 0 OR @c3 > 0, 'SELECT 1',
  'ALTER TABLE reading_logs ADD COLUMN studentId VARCHAR(64) NULL COMMENT ''关联真实学生ID（家长端按此查询孩子阅读记录）''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- reading_logs.classId
SET @c4 = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'reading_logs' AND column_name = 'classId');
SET @sql = IF(@t2 = 0 OR @c4 > 0, 'SELECT 1',
  'ALTER TABLE reading_logs ADD COLUMN classId VARCHAR(64) NULL COMMENT ''归属班级（可选，便于按班级筛选归档）'' AFTER studentId');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 索引：家长端按 studentId 查询、教师按班级筛选（与实体 @Index 声明一致，生产 synchronize=false 时由本迁移补建）
SET @i1 = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'checkins' AND index_name = 'idx_chk_tch_stu');
SET @sql = IF(@t1 = 0 OR @i1 > 0, 'SELECT 1', 'ALTER TABLE checkins ADD INDEX idx_chk_tch_stu (teacherId, studentId)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @i2 = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'checkins' AND index_name = 'idx_chk_tch_class');
SET @sql = IF(@t1 = 0 OR @i2 > 0, 'SELECT 1', 'ALTER TABLE checkins ADD INDEX idx_chk_tch_class (teacherId, classId)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @i3 = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reading_logs' AND index_name = 'idx_rdl_tch_stu');
SET @sql = IF(@t2 = 0 OR @i3 > 0, 'SELECT 1', 'ALTER TABLE reading_logs ADD INDEX idx_rdl_tch_stu (teacherId, studentId)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @i4 = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reading_logs' AND index_name = 'idx_rdl_tch_class');
SET @sql = IF(@t2 = 0 OR @i4 > 0, 'SELECT 1', 'ALTER TABLE reading_logs ADD INDEX idx_rdl_tch_class (teacherId, classId)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
