-- ======================================================================
-- 0040_semester_enhancement.sql
-- 学期管理增强：学年度 + 学期类型 + 统计快照 + 归档
-- ======================================================================

-- 添加 academicYear 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'academicYear');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD COLUMN `academicYear` varchar(20) NOT NULL DEFAULT '''' COMMENT ''学年度（如 2024-2025）''', 'SELECT ''semesters.academicYear exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 termType 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'termType');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD COLUMN `termType` int NOT NULL DEFAULT 1 COMMENT ''学期类型：1=春季 2=秋季 3=暑假 4=寒假''', 'SELECT ''semesters.termType exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 stats JSON 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'stats');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD COLUMN `stats` json NULL COMMENT ''学期统计快照''', 'SELECT ''semesters.stats exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 archived 列
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'archived');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD COLUMN `archived` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''是否已归档''', 'SELECT ''semesters.archived exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加复合索引
SET @c = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND INDEX_NAME = 'idx_sem_tch_current');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD INDEX `idx_sem_tch_current` (`teacherId`, `current`)', 'SELECT ''idx_sem_tch_current exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
