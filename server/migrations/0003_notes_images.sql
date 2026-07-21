-- notes 增加 images 列（直接插入的图片，base64 data URL 数组）
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动加列（开发期 synchronize=true 会自动加）。
-- 执行方式：在对应 MySQL 库执行本文件即可。ADD COLUMN IF NOT EXISTS 部分需 MySQL 8.0+ 支持；旧版本请去掉 IF NOT EXISTS。

ALTER TABLE `notes`
  ADD COLUMN IF NOT EXISTS `images` json DEFAULT NULL COMMENT '直接插入的图片（base64 data URL 数组）' AFTER `favorite`;
