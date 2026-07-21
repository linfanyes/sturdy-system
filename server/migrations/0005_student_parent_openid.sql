-- 学生表增加家长微信 openId 字段（用于订阅消息推送）
ALTER TABLE students ADD COLUMN IF NOT EXISTS parentOpenId varchar(128) NOT NULL DEFAULT '' COMMENT '家长微信openId（订阅消息推送用）' AFTER parentPhone;
