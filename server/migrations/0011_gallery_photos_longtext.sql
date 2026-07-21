-- 班级风采/我的相册 photos 列从 TEXT(64KB) 升级为 LONGTEXT(4GB)
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时手动执行（开发期 synchronize=true 会自动 ALTER）。
-- 原因：base64 照片数据远超 TEXT 的 64KB 上限，导致保存失败。
-- LONGTEXT 是 TEXT 的超集，ALTER 不会丢失已有数据。

ALTER TABLE `class_galleries` MODIFY COLUMN `photos` LONGTEXT NULL COMMENT 'base64 图片 dataURL 数组';
ALTER TABLE `my_galleries` MODIFY COLUMN `photos` LONGTEXT NULL COMMENT 'base64 图片 dataURL 数组';
