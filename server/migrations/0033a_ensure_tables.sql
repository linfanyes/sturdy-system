-- ======================================================================
-- 0033a_ensure_tables.sql
-- 兜底创建缺失的表（classes/students/exams/grades/parents/parent_contacts/semesters）。
-- 表结构以最新实体定义为准；已存在的表不受影响（IF NOT EXISTS）。
-- P0-9修复：从 0033_ensure_schema_chain.sql 拆出表创建部分，与增量补列分离。
-- ======================================================================

-- ---------- 1) classes ----------
CREATE TABLE IF NOT EXISTS `classes` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `grade` varchar(255) NOT NULL,
  `classNo` varchar(255) NOT NULL,
  `slogan` varchar(255) DEFAULT '',
  `headTeacher` varchar(255) DEFAULT '',
  `teacherId` varchar(255) NOT NULL DEFAULT '',
  `teachers` JSON NULL,
  `color` varchar(255) DEFAULT 'butter',
  `term` varchar(255) DEFAULT '',
  `semesterId` varchar(255) DEFAULT '',
  `subjects` JSON NULL,
  `subjectTeachers` JSON NULL,
  `imGroupId` varchar(64) DEFAULT '',
  `parentFeatures` JSON NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_classes_teacher` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 2) students ----------
CREATE TABLE IF NOT EXISTS `students` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `classId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` varchar(255) NOT NULL,
  `studentNo` varchar(255) NOT NULL,
  `birthDate` varchar(255) NULL,
  `seatNo` int DEFAULT 0,
  `seatRow` int NULL,
  `seatCol` int NULL,
  `parentName` varchar(255) DEFAULT '',
  `parentPhone` varchar(255) DEFAULT '',
  `parentOpenId` varchar(128) DEFAULT '',
  `studentPhone` varchar(255) DEFAULT '',
  `address` varchar(255) DEFAULT '',
  `parentId` varchar(255) NULL,
  `parentNickName` varchar(255) DEFAULT '',
  `parentLoginEnabled` tinyint(1) DEFAULT 0,
  `parentPasswordHash` varchar(100) NULL,
  `note` text NULL,
  `tags` JSON NULL,
  `duty` varchar(255) NULL,
  `comment` text NULL,
  `examComments` JSON NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stu_class` (`classId`),
  KEY `idx_stu_no` (`studentNo`),
  KEY `idx_stu_parent_login` (`parentLoginEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 3) exams ----------
CREATE TABLE IF NOT EXISTS `exams` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `term` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `teacherName` varchar(255) DEFAULT '',
  `classId` varchar(255) NOT NULL,
  `subjects` JSON NOT NULL,
  `subjectFullScores` JSON NULL,
  `date` varchar(255) NOT NULL,
  `note` text NULL,
  `analysisNote` text NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exm_class` (`classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 4) grades ----------
CREATE TABLE IF NOT EXISTS `grades` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `classId` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `examName` varchar(255) NOT NULL,
  `examId` varchar(255) NULL,
  `date` varchar(255) NOT NULL,
  `scores` JSON NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 5) parents ----------
CREATE TABLE IF NOT EXISTS `parents` (
  `id` varchar(36) NOT NULL,
  `openId` varchar(255) NULL,
  `phone` varchar(255) NULL,
  `parentName` varchar(255) DEFAULT '家长',
  `nickName` varchar(255) NULL,
  `relation` varchar(255) NULL,
  `passwordHash` varchar(255) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_parents_openid` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 6) parent_contacts ----------
CREATE TABLE IF NOT EXISTS `parent_contacts` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `classId` varchar(255) DEFAULT '',
  `parentName` varchar(255) NOT NULL,
  `relation` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `wechat` varchar(255) DEFAULT '',
  `method` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `date` varchar(255) NOT NULL,
  `followUp` text NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 7) semesters ----------
CREATE TABLE IF NOT EXISTS `semesters` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `name` varchar(255) NOT NULL,
  `startDate` varchar(255) NOT NULL,
  `endDate` varchar(255) NOT NULL,
  `current` tinyint(1) DEFAULT 0,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
