-- Migration: create audit_logs table (审计日志)
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动建表（开发期 synchronize=true 会自动建）。
-- 历史：审计模块 AuditModule 已注册，但此前遗漏建表迁移，导致云托管环境下 audit_logs 表不存在，
--       所有 auditService.log(...) 写入被 .catch(()=>{}) 静默吞错、auditService.list(...) 查询失败，
--       前端审计日志页面长期为空。
-- 执行方式：在对应 MySQL 库执行本文件即可。CREATE TABLE IF NOT EXISTS 保证幂等可重复执行。
-- 说明：审计按 schoolId 隔离（非 teacherId），故 teacherId 列留空 DEFAULT ''，避免插入因缺 teacherId 报错。

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(36) NOT NULL,
  `teacherId` varchar(64) NOT NULL DEFAULT '' COMMENT '租户键：审计级按 schoolId 隔离，留空',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `schoolId` varchar(255) NOT NULL DEFAULT '',
  `action` varchar(255) NOT NULL DEFAULT '',
  `operator` varchar(255) NOT NULL DEFAULT '',
  `target` varchar(255) NOT NULL DEFAULT '',
  `detail` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_school_action` (`schoolId`, `action`),
  KEY `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审计日志';
