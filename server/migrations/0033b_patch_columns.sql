-- ======================================================================
-- 0033b_patch_columns.sql
-- 幂等补齐实体新增列（classes/students/exams/grades/parents/parent_contacts/class_members）。
-- 仅当列不存在时才执行 ALTER，可重复执行。
-- P0-9修复：从 0033_ensure_schema_chain.sql 拆出增量补列部分。
-- 依赖：0033a_ensure_tables.sql（先创建表结构）
-- ======================================================================

-- ---------- 1) classes 补列 ----------
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

-- ---------- 2) students 补列 ----------
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

-- ---------- 3) exams 补列 ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='teacherName');      SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `teacherName` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='subjectFullScores'); SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `subjectFullScores` JSON NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='note');            SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `note` text NULL','SELECT 1');                  PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND COLUMN_NAME='analysisNote');    SET @q=IF(@c=0,'ALTER TABLE `exams` ADD COLUMN `analysisNote` text NULL','SELECT 1');          PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 4) grades 补列 ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND COLUMN_NAME='examId'); SET @q=IF(@c=0,'ALTER TABLE `grades` ADD COLUMN `examId` varchar(255) NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND COLUMN_NAME='scores'); SET @q=IF(@c=0,'ALTER TABLE `grades` ADD COLUMN `scores` JSON NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- grades 唯一索引已拆分至 0034_grades_unique_index.sql

-- ---------- 5) parents 补列 ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='phone');      SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `phone` varchar(255) NULL','SELECT 1');      PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='nickName');   SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `nickName` varchar(255) NULL','SELECT 1');   PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='relation');   SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `relation` varchar(255) NULL','SELECT 1');   PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parents' AND COLUMN_NAME='passwordHash'); SET @q=IF(@c=0,'ALTER TABLE `parents` ADD COLUMN `passwordHash` varchar(255) NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 6) parent_contacts 补列 ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='studentName'); SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `studentName` varchar(255) NOT NULL DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='wechat');     SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `wechat` varchar(255) DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND COLUMN_NAME='followUp');  SET @q=IF(@c=0,'ALTER TABLE `parent_contacts` ADD COLUMN `followUp` text NULL','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- 7) class_members 补列（表由 0012 创建） ----------
SET @c=(SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_members' AND COLUMN_NAME='term'); SET @q=IF(@c=0,'ALTER TABLE `class_members` ADD COLUMN `term` varchar(64) NOT NULL DEFAULT ''''','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
