-- 教材知识库：教材 / 单元 / 知识点 三张表（按学校隔离）
-- 覆盖小学人教版语文、人教版数学、外研版三起英语三科
-- 执行方式：启动时 runMigrations() 自动执行；CREATE TABLE IF NOT EXISTS 保证幂等。

CREATE TABLE IF NOT EXISTS `textbooks` (
  `id` char(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL COMMENT '归属学校ID',
  `publisher` varchar(50) NOT NULL DEFAULT '' COMMENT '出版社版本：人教版/外研版',
  `subject` varchar(20) NOT NULL DEFAULT '' COMMENT '学科：语文/数学/英语',
  `grade` varchar(20) NOT NULL DEFAULT '' COMMENT '年级：三年级',
  `term` varchar(20) NOT NULL DEFAULT '' COMMENT '册次：上册/下册',
  `name` varchar(200) NOT NULL COMMENT '教材名称',
  `cover` text NULL COMMENT '封面图',
  `status` varchar(32) NOT NULL DEFAULT 'published' COMMENT 'draft/published',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_textbooks_school` (`schoolId`),
  KEY `idx_textbooks_publisher_subject_grade` (`publisher`,`subject`,`grade`,`term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材知识库-教材';

CREATE TABLE IF NOT EXISTS `textbook_units` (
  `id` char(36) NOT NULL,
  `textbookId` varchar(36) NOT NULL COMMENT '所属教材ID',
  `unitOrder` int NOT NULL DEFAULT 0 COMMENT '单元排序',
  `title` varchar(255) NOT NULL COMMENT '单元标题',
  `summary` text NULL COMMENT '单元概述',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_textbook_units_textbook` (`textbookId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材知识库-单元';

CREATE TABLE IF NOT EXISTS `textbook_knowledge_points` (
  `id` char(36) NOT NULL,
  `unitId` varchar(36) NOT NULL COMMENT '所属单元ID',
  `pointOrder` int NOT NULL DEFAULT 0 COMMENT '知识点排序',
  `title` varchar(255) NOT NULL COMMENT '知识点标题',
  `type` varchar(64) NOT NULL DEFAULT '重点' COMMENT '类型：概念/例题/易错点/拓展/重点',
  `content` text NOT NULL COMMENT '知识点内容',
  `difficulty` varchar(32) NOT NULL DEFAULT '' COMMENT '难度：简单/中等/困难',
  `keywords` varchar(512) NOT NULL DEFAULT '' COMMENT '检索关键词，逗号分隔',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_textbook_kp_unit` (`unitId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材知识库-知识点';
