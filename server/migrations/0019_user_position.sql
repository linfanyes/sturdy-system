-- 教师职务字段（如：班主任、一年级语文组长）
-- 用于教材知识库的学科组长编辑权限控制
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `position` varchar(255) NOT NULL DEFAULT '' COMMENT '职务（如：班主任、一年级语文组长）' AFTER `gender`;
