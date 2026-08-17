-- ======================================================================
-- 0035_foreign_keys.sql
-- 关键关联添加外键约束（数据完整性保护）。
--
-- 设计考量：
--   - 项目使用 TypeORM 但实体中未使用 @ManyToOne 关系装饰器，
--     而是以 classId/studentId 等裸列存储关联，因此需要手动添加 FK。
--   - 使用 ON DELETE RESTRICT（默认）防止误删被引用的班级/学生。
--   - 使用 ON DELETE SET NULL 处理 grades.examId（考试被删后成绩保留但关联断开）。
--   - 执行前检查同名约束是否已存在，保证幂等性。
--
-- 依赖：0033a_ensure_tables.sql / 0033b_patch_columns.sql（表和列需先存在）
-- ======================================================================

-- ---------- 辅助：安全添加外键（检查已存在则跳过） ----------
-- MySQL 8.0+ 支持 IF NOT EXISTS 但不支持针对约束名，
-- 故用 information_schema 预查实现幂等。

-- 1) exams.class_id → classes.id
SET @fkName='fk_exams_class_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exams' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `exams` ADD CONSTRAINT `fk_exams_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) grades.class_id → classes.id
SET @fkName='fk_grades_class_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `grades` ADD CONSTRAINT `fk_grades_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) grades.exam_id → exams.id（可空，ON DELETE SET NULL）
SET @fkName='fk_grades_exam_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `grades` ADD CONSTRAINT `fk_grades_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE SET NULL','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) students.class_id → classes.id
SET @fkName='fk_students_class_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='students' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `students` ADD CONSTRAINT `fk_students_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) class_members.class_id → classes.id
SET @fkName='fk_class_members_class_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_members' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `class_members` ADD CONSTRAINT `fk_class_members_class_id` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) class_members.student_id → students.id
SET @fkName='fk_class_members_student_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_members' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `class_members` ADD CONSTRAINT `fk_class_members_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7) class_members.teacher_id → teachers.id
SET @fkName='fk_class_members_teacher_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='class_members' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `class_members` ADD CONSTRAINT `fk_class_members_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8) parent_contacts.student_id → students.id
SET @fkName='fk_parent_contacts_student_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='parent_contacts' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `parent_contacts` ADD CONSTRAINT `fk_parent_contacts_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9) chat_sessions.teacher_id → teachers.id
SET @fkName='fk_chat_sessions_teacher_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chat_sessions' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `chat_sessions` ADD CONSTRAINT `fk_chat_sessions_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 10) notes.teacher_id → teachers.id
SET @fkName='fk_notes_teacher_id';
SET @exists=(SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notes' AND CONSTRAINT_NAME=@fkName);
SET @sql=IF(@exists=0,'ALTER TABLE `notes` ADD CONSTRAINT `fk_notes_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE','SELECT 1 AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
