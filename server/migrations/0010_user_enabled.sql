-- 教师表增加启用开关字段（学校管理员控制）
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用（学校管理员控制）' AFTER features;
