-- 班级风采相册表（G-13 新增实体）
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动建表（开发期 synchronize=true 会自动建）。
-- 执行方式：在对应 MySQL 库执行本文件即可。CREATE TABLE IF NOT EXISTS 保证幂等可重复执行。

CREATE TABLE IF NOT EXISTS `class_galleries` (
  `id` char(36) NOT NULL,
  `teacherId` varchar(64) NOT NULL COMMENT '租户键：教师ID',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `classId` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `date` varchar(255) NOT NULL DEFAULT '',
  `photos` json NULL COMMENT 'base64 图片 dataURL 数组',
  PRIMARY KEY (`id`),
  KEY `idx_class_galleries_teacher` (`teacherId`),
  KEY `idx_class_galleries_class` (`classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级风采相册';
