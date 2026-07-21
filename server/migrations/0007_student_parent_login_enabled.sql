-- 学生表增加家长登录授权开关字段
ALTER TABLE students ADD COLUMN IF NOT EXISTS parentLoginEnabled tinyint(1) NOT NULL DEFAULT 0 COMMENT '家长登录是否已授权（教师控制）' AFTER parentOpenId;
