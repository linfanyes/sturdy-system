-- ======================================================================
-- 0035_ai_providers_ensure.sql
-- 补齐 ai_providers 表的 teacherId 列（并兜底创建整表）。
-- 背景：AiProvider 实体继承自 BaseEntity（含 teacherId 租户键），
-- 但仓库此前没有任何建表迁移。云端 DB_SYNCHRONIZE=false 环境下，该表由早期
-- dev 的 synchronize 创建、且缺 teacherId 列。启动期 AiProviderService.onModuleInit
-- 执行 seed() → INSERT ... teacherId 时触发「Unknown column 'teacherId' in 'field list'」，
-- 被 bootstrap().catch 的 fail-closed 兜底捕获，导致整个后端启动失败。
-- 本迁移：表不存在则完整创建（含 teacherId）；表已存在则按 information_schema 探测
-- 缺失列并补齐。全幂等、可重复执行、不阻塞启动（与 0033 同风格）。
-- ======================================================================

-- ---------- 1) 兜底创建整表（若表已存在则跳过） ----------
CREATE TABLE IF NOT EXISTS `ai_providers` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `baseUrl` varchar(255) NOT NULL,
  `textModels` JSON NULL,
  `visionModels` JSON NULL,
  `imageModels` JSON NULL,
  `videoModels` JSON NULL,
  `isDefault` tinyint(1) DEFAULT 0,
  `enabled` tinyint(1) DEFAULT 1,
  `sortOrder` int DEFAULT 0,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_providers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 2) 补齐可能缺失的列（旧 synchronize 建的表可能只有部分列） ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='teacherId');   SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `teacherId` varchar(64) NULL','SELECT 1');                                          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='code');       SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `code` varchar(255) NULL','SELECT 1');                                              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='name');       SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `name` varchar(255) NULL','SELECT 1');                                              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='baseUrl');    SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `baseUrl` varchar(255) NULL','SELECT 1');                                          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='textModels'); SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `textModels` JSON NULL','SELECT 1');                                                 PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='visionModels');SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `visionModels` JSON NULL','SELECT 1');                                              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='imageModels'); SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `imageModels` JSON NULL','SELECT 1');                                              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='videoModels'); SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `videoModels` JSON NULL','SELECT 1');                                              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='isDefault');  SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `isDefault` tinyint(1) DEFAULT 0','SELECT 1');                                     PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='enabled');    SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `enabled` tinyint(1) DEFAULT 1','SELECT 1');                                       PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND COLUMN_NAME='sortOrder'); SET @q=IF(@c=0,'ALTER TABLE `ai_providers` ADD COLUMN `sortOrder` int DEFAULT 0','SELECT 1');                                                 PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 3) 补齐 code 唯一索引（与 CREATE TABLE 一致；已存在则跳过） ----------
SET @i=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_providers' AND INDEX_NAME='uq_ai_providers_code');
SET @q=IF(@i=0,'CREATE UNIQUE INDEX uq_ai_providers_code ON ai_providers (code)','SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
