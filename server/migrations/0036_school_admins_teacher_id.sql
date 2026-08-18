-- ======================================================================
-- 0036_school_admins_teacher_id.sql
-- 补齐 school_admins 表的 teacherId 列（BaseEntity 租户键）。
-- 背景：SchoolAdmin 实体继承自 BaseEntity（含 teacherId 租户键），
-- 但 0006_school_hierarchy.sql 建表时未包含 teacherId，
-- 0028_user_inherit_base_entity.sql 仅给 users 表补了 teacherId、遗漏了 school_admins。
-- 导致 TypeORM 查询 school_admins 时触发「Unknown column 'teacherId'」，
-- 超管端校管理员列表加载失败。
-- 本迁移：表已存在则按 information_schema 探测并补齐 teacherId 列。
-- ======================================================================

-- 补齐 teacherId 列（school_admins 表已通过 0006 创建，此处仅补列）
SET @c = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'school_admins'
    AND COLUMN_NAME = 'teacherId'
);

SET @q = IF(
  @c = 0,
  'ALTER TABLE `school_admins` ADD COLUMN `teacherId` varchar(64) NULL DEFAULT NULL COMMENT ''租户键：校管场景不使用（用 schoolId 隔离），保留以兼容 BaseEntity''',
  'SELECT ''teacherId already exists in school_admins'' AS message'
);

PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
