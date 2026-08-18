-- ======================================================================
-- 0045_monitor_school_id.sql
-- MonitorLog 添加 schoolId 字段（按学校维度筛选监控日志）。
--
-- 新增字段：
--   - school_id: varchar(64) 来源 JWT 中教师的所属学校（尽力填充，失败留空）
-- ======================================================================

-- 1) monitor_logs 表添加 school_id 列（如果不存在）
SET @colExists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monitor_logs' AND COLUMN_NAME = 'school_id');
SET @sql = IF(@colExists = 0, 'ALTER TABLE `monitor_logs` ADD COLUMN `school_id` varchar(64) NOT NULL DEFAULT '''' AFTER `role`', 'SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) 添加索引（如果不存在）
SET @idxExists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monitor_logs' AND INDEX_NAME = 'idx_monitor_school_id');
SET @sql = IF(@idxExists = 0, 'ALTER TABLE `monitor_logs` ADD INDEX `idx_monitor_school_id` (`school_id`)', 'SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
