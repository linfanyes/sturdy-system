-- 学校管理员表增加开启标志字段（默认开启）
ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '开启标志：1=启用 / 0=禁用' AFTER permissions;
