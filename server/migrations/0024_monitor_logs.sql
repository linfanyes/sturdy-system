-- Migration: create monitor_logs table (前端监控日志)
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动建表（开发期 synchronize=true 会自动建）。
-- 说明：MonitorModule 注册后，若表不存在写库被静默降级（不崩溃），建表后恢复采集。
-- 执行方式：在对应 MySQL 库执行本文件即可。CREATE TABLE IF NOT EXISTS 保证幂等可重复执行。

CREATE TABLE IF NOT EXISTS `monitor_logs` (
  `id` char(36) NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'error' COMMENT 'error | unhandledrejection | vitals | perf',
  `page` varchar(255) NOT NULL DEFAULT '' COMMENT '来源页面路由',
  `message` varchar(2000) NOT NULL DEFAULT '' COMMENT '错误消息或指标名',
  `stack` text NULL,
  `meta` text NULL COMMENT '附加 JSON',
  `url` varchar(500) NOT NULL DEFAULT '' COMMENT '来源 URL（不含查询串）',
  `userId` varchar(64) NOT NULL DEFAULT '' COMMENT '可选归属 userId',
  `role` varchar(32) NOT NULL DEFAULT '' COMMENT '可选归属 role',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_monitor_type_created` (`type`, `createdAt`),
  KEY `idx_monitor_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='前端监控日志';
