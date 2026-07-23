-- parent_contacts 增加 classId 列（班级隔离键）
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动加列（开发期 synchronize=true 会自动加）。
-- 执行方式：在对应 MySQL 库执行本文件即可。ADD COLUMN IF NOT EXISTS 部分需 MySQL 8.0+ 支持；旧版本请去掉 IF NOT EXISTS。

ALTER TABLE `parent_contacts`
  ADD COLUMN IF NOT EXISTS `classId` varchar(255) NOT NULL DEFAULT '' COMMENT '班级隔离键：写入时绑定学生所在班级' AFTER `studentName`;

-- 班级过滤索引（可选，数据量大时建议加）
CREATE INDEX IF NOT EXISTS `idx_parent_contacts_class` ON `parent_contacts` (`classId`);
