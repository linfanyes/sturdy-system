-- Migration: create science & moral resource tables (科学资源库 / 道德与法治资源库)
-- 适用场景：生产环境 DB_SYNCHRONIZE=false 时，需手动建表（开发期 synchronize=true 会自动建）。
-- 背景：校管「专项资源库」新增科学、道德与法治两个科目，与古诗词/数学公式/英语单词平行。
-- 执行方式：main.ts 启动时会自动读取 migrations 目录下未应用的 .sql 文件（按文件名排序、幂等），
--          也可在对应 MySQL 库手动执行本文件。CREATE TABLE IF NOT EXISTS 保证幂等可重复执行。

CREATE TABLE IF NOT EXISTS `resource_science` (
  `id` char(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL COMMENT '归属学校ID',
  `title` varchar(100) NOT NULL COMMENT '标题',
  `category` varchar(30) NOT NULL DEFAULT '' COMMENT '分类：物质科学/生命科学/地球与宇宙/技术与工程',
  `content` text NOT NULL COMMENT '知识内容 / 实验说明',
  `grade` varchar(20) NOT NULL DEFAULT '通用' COMMENT '适用年级',
  `keywords` varchar(200) NOT NULL DEFAULT '' COMMENT '关键词，逗号分隔',
  `sortOrder` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published' COMMENT 'draft / published',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_science_school` (`schoolId`),
  KEY `idx_science_school_grade` (`schoolId`, `grade`),
  KEY `idx_science_school_category` (`schoolId`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科学资源库';

CREATE TABLE IF NOT EXISTS `resource_moral` (
  `id` char(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL COMMENT '归属学校ID',
  `title` varchar(100) NOT NULL COMMENT '标题',
  `category` varchar(30) NOT NULL DEFAULT '' COMMENT '主题：个人品德/家庭美德/社会公德/国家情怀',
  `content` text NOT NULL COMMENT '案例 / 讨论 / 价值观内容',
  `grade` varchar(20) NOT NULL DEFAULT '通用' COMMENT '适用年级',
  `keywords` varchar(200) NOT NULL DEFAULT '' COMMENT '关键词，逗号分隔',
  `sortOrder` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published' COMMENT 'draft / published',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_moral_school` (`schoolId`),
  KEY `idx_moral_school_grade` (`schoolId`, `grade`),
  KEY `idx_moral_school_category` (`schoolId`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='道德与法治资源库';
