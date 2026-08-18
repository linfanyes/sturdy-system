-- ======================================================================
-- 0044_archive_support.sql
-- P2-2修复：数据归档支持（历史数据移至归档表，防止主表无限增长）。
--
-- 归档策略：
--   - chat_sessions：上学期的会话自动归档
--   - game_scores：仅保留最近 1000 条/班
--   - mood_checkins：仅保留最近 2 学期
--
-- 执行时机：每学期结束后的定时任务由 ArchiveSchedulerService 触发
-- ======================================================================

-- 1) 聊天会话归档表（与 chat_sessions 结构相同）
CREATE TABLE IF NOT EXISTS `chat_sessions_archive` LIKE `chat_sessions`;
ALTER TABLE `chat_sessions_archive` COMMENT = '聊天会话归档表';

-- 2) 游戏类型归档表
CREATE TABLE IF NOT EXISTS `game_scores_archive` LIKE `game_scores`;
ALTER TABLE `game_scores_archive` COMMENT = '游戏得分归档表';

-- 3) 心情打卡归档表
CREATE TABLE IF NOT EXISTS `mood_checkins_archive` LIKE `mood_checkins`;
ALTER TABLE `mood_checkins_archive` COMMENT = '心情打卡归档表';

-- 4) 归档记录表（跟踪每次归档操作的元数据）
CREATE TABLE IF NOT EXISTS `archive_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `archive_type` VARCHAR(64) NOT NULL COMMENT '归档类型：chat_sessions/game_scores/mood_checkins',
  `criteria` VARCHAR(255) DEFAULT NULL COMMENT '归档条件描述',
  `rows_archived` INT NOT NULL DEFAULT 0 COMMENT '归档行数',
  `rows_deleted` INT NOT NULL DEFAULT 0 COMMENT '从主表删除行数',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  `status` ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
  `error_message` TEXT DEFAULT NULL,
  KEY `idx_archive_type` (`archive_type`),
  KEY `idx_archive_completed` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='归档操作日志';
