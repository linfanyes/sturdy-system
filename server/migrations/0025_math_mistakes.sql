-- Migration: create math_mistakes table (数学错题本)
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动建表（开发期 synchronize=true 会自动建）。
-- 背景：Web 错题本页面自始调用 /math-mistakes 接口，但后端此前从未实现该控制器，
--       本迁移与 server/src/math-mistakes 模块配套，补齐历史缺口。
-- 执行方式：在对应 MySQL 库执行本文件即可。CREATE TABLE IF NOT EXISTS 保证幂等可重复执行。

CREATE TABLE IF NOT EXISTS `math_mistakes` (
  `id` char(36) NOT NULL,
  `teacherId` varchar(64) NOT NULL COMMENT '租户键：教师ID',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `classId` varchar(255) NOT NULL DEFAULT '',
  `className` varchar(255) NOT NULL DEFAULT '',
  `studentName` varchar(255) NOT NULL DEFAULT '',
  `question` text NULL,
  `wrongAnswer` text NULL,
  `correctAnswer` text NULL,
  `knowledgePoint` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_mistakes_cls` (`teacherId`, `classId`),
  KEY `idx_mistakes_created` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数学错题本';
