-- ======================================================================
-- 0033_ensure_schema_chain.sql
-- 幂等补齐「数据生成/四角色测试」链路所需的全部表列（classes/students/
-- exams/grades/parents/parent_contacts/semesters），并兜底创建缺失的表。
-- 背景：生产 DB_SYNCHRONIZE=false，实体新增列不会自动同步，导致
-- 建班/建生报 Unknown column。本迁移逐列用 information_schema 探测，
-- 已存在则跳过，可重复执行、不阻塞启动（与 0014/0016/0018 同风格）。
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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='name');        SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `name` varchar(255) NOT NULL','SELECT 1');       PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='grade');       SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `grade` varchar(255) NOT NULL','SELECT 1');      PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='classNo');     SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `classNo` varchar(255) NOT NULL','SELECT 1');    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='slogan');      SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `slogan` varchar(255) DEFAULT ''''','SELECT 1');   PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='headTeacher'); SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `headTeacher` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='teachers');     SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `teachers` JSON NULL','SELECT 1');            PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='color');       SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `color` varchar(255) DEFAULT ''butter''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='term');        SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `term` varchar(255) DEFAULT ''''','SELECT 1');    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='semesterId');  SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `semesterId` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='subjects');    SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `subjects` JSON NULL','SELECT 1');           PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='subjectTeachers'); SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `subjectTeachers` JSON NULL','SELECT 1');  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='parentFeatures'); SET @q=IF(@c=0,'ALTER TABLE `classes` ADD COLUMN `parentFeatures` JSON NULL','SELECT 1');  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='birthDate');     SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `birthDate` varchar(255) NULL','SELECT 1');     PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='seatRow');      SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `seatRow` int NULL','SELECT 1');              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='seatCol');      SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `seatCol` int NULL','SELECT 1');              PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='studentPhone'); SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `studentPhone` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='address');      SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `address` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='parentId');     SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `parentId` varchar(255) NULL','SELECT 1');     PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='parentNickName'); SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `parentNickName` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='note');          SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `note` text NULL','SELECT 1');                  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='tags');          SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `tags` JSON NULL','SELECT 1');                  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='duty');          SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `duty` varchar(255) NULL','SELECT 1');          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='comment');       SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `comment` text NULL','SELECT 1');               PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='examComments');  SET @q=IF(@c=0,'ALTER TABLE `students` ADD COLUMN `examComments` JSON NULL','SELECT 1');          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='teacherName');      SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `teacherName` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='subjectFullScores'); SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `subjectFullScores` JSON NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='note');            SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `note` text NULL','SELECT 1');                  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='analysisNote');    SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `analysisNote` text NULL','SELECT 1');          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND COLUMN_NAME='examId'); SET @q=IF(@c=0,'ALTER TABLE `grades` ADD COLUMN `examId` varchar(255) NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND COLUMN_NAME='scores'); SET @q=IF(@c=0,'ALTER TABLE `grades` ADD COLUMN `scores` JSON NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- grades 唯一索引（P02：班级-考试-科目 唯一，防并发重复提交）
SET @i=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND INDEX_NAME='idx_grades_unique_submission');
SET @q=IF(@i=0,'CREATE UNIQUE INDEX idx_grades_unique_submission ON grades (classId, examId, subject)','SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='phone');      SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `phone` varchar(255) NULL','SELECT 1');      PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='nickName');   SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `nickName` varchar(255) NULL','SELECT 1');   PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='relation');   SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `relation` varchar(255) NULL','SELECT 1');   PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='passwordHash'); SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `passwordHash` varchar(255) NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='studentName'); SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `studentName` varchar(255) NOT NULL DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='wechat');     SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `wechat` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='followUp');  SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `followUp` text NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

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

-- ---------- 8) class_members（补列，表由 0012 创建） ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_members' AND COLUMN_NAME='term'); SET @q=IF(@c=0,'ALTER TABLE `class_members` ADD COLUMN `term` varchar(64) NOT NULL DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
