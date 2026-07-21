-- 班级增加腾讯云 IM 班级群号字段（家校沟通「一键全班群」群号落库）
ALTER TABLE classes ADD COLUMN IF NOT EXISTS imGroupId varchar(64) NOT NULL DEFAULT '' COMMENT '腾讯云 IM 班级群号' AFTER semesterId;
