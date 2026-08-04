-- Migration: add ownerType / ownerId columns to ai_settings
-- so AI settings can be isolated per owner (teacher | school_admin).
-- 生产环境 synchronize=false，需靠此脚本补齐列（与 dev synchronize 表结构保持一致）。
-- 历史行因实体 ownerType 默认 'teacher'、ownerId 默认 ''，会自动回填，无需额外 UPDATE。

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS `ownerType` VARCHAR(20) NOT NULL DEFAULT 'teacher'
  AFTER `providerCode`;

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS `ownerId` VARCHAR(64) NOT NULL DEFAULT ''
  AFTER `ownerType`;
