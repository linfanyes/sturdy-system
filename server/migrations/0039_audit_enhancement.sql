-- ======================================================================
-- 0039_audit_enhancement.sql
-- 审计日志增强：支持数据变更前后快照 + 目标追踪
-- ======================================================================

-- 添加 beforeData/afterData JSON 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'beforeData');
SET @q = IF(@c = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `beforeData` json NULL COMMENT ''变更前数据快照'', ADD COLUMN `afterData` json NULL COMMENT ''变更后数据快照''', 'SELECT ''audit_logs beforeData/afterData exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 targetType/targetId 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'targetType');
SET @q = IF(@c = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `targetType` varchar(64) NULL COMMENT ''目标实体类型'', ADD COLUMN `targetId` varchar(64) NULL COMMENT ''目标记录 ID''', 'SELECT ''audit_logs targetType/targetId exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加索引
SET @c = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_target');
SET @q = IF(@c = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_target` (`targetType`, `targetId`)', 'SELECT ''idx_audit_target exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_created');
SET @q = IF(@c = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_created` (`createdAt`)', 'SELECT ''idx_audit_created exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
