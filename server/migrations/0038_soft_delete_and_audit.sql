-- ======================================================================
-- 0038_soft_delete_and_audit.sql
-- 软删除 + 审计字段 + 索引优化
-- 
-- 1. 为所有业务表添加 deletedAt 字段（软删除）
-- 2. 为核心表添加 createdBy/updatedBy 审计字段
-- 3. 添加常用查询组合索引
-- ======================================================================

-- ========== 1. 软删除字段（deletedAt）==========
-- 用户/认证相关
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `users` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL COMMENT ''软删除时间''', 'SELECT ''users.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teachers' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `teachers` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''teachers.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_admins' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `school_admins` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''school_admins.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 班级/学生
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `classes` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''classes.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_members' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_members` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_members.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `students` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''students.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_parents' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `student_parents` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''student_parents.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 考试/成绩
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exams' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `exams` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''exams.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grades' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `grades` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''grades.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 通用 CRUD 模块
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'duty_rosters' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `duty_rosters` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''duty_rosters.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'growth_entries' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `growth_entries` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''growth_entries.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'behavior_records' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `behavior_records` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''behavior_records.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_logs' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `work_logs` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''work_logs.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lesson_observations' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `lesson_observations` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''lesson_observations.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'home_visits' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `home_visits` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''home_visits.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seat_layouts' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `seat_layouts` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''seat_layouts.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkins' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `checkins` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''checkins.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reward_records' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `reward_records` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''reward_records.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'score_records' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `score_records` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''score_records.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_scores' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `group_scores` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''group_scores.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_expenses' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_expenses` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_expenses.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_activities' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_activities` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_activities.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_duty_configs' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_duty_configs` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_duty_configs.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'award_records' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `award_records` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''award_records.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'award_categories' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `award_categories` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''award_categories.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parent_contacts' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `parent_contacts` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''parent_contacts.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notice_templates' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `notice_templates` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''notice_templates.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_snapshots' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `backup_snapshots` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''backup_snapshots.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'my_galleries' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `my_galleries` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''my_galleries.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `notifications` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''notifications.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `notes` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''notes.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todos' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `todos` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''todos.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'picker_history' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `picker_history` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''picker_history.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'homework' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `homework` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''homework.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendances' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `attendances` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''attendances.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `schedules` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''schedules.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `reports` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''reports.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `assignments` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''assignments.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `notices` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''notices.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `resources` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''resources.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kids_coding_projects' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `kids_coding_projects` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''kids_coding_projects.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kids_coding_badges' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `kids_coding_badges` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''kids_coding_badges.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kids_coding_reviews' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `kids_coding_reviews` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''kids_coding_reviews.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kids_coding_challenges' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `kids_coding_challenges` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''kids_coding_challenges.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safety_reports' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `safety_reports` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''safety_reports.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safety_checkins' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `safety_checkins` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''safety_checkins.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'literacy_lessons' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `literacy_lessons` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''literacy_lessons.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'literacy_badges' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `literacy_badges` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''literacy_badges.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notify_prefs' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `notify_prefs` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''notify_prefs.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_consents' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `data_consents` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''data_consents.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_plans' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `study_plans` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''study_plans.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'weak_point_exercises' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `weak_point_exercises` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''weak_point_exercises.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'habit_challenges' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `habit_challenges` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''habit_challenges.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'habit_checkins' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `habit_checkins` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''habit_checkins.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'five_edu_records' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `five_edu_records` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''five_edu_records.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mood_checkins' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `mood_checkins` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''mood_checkins.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mood_tree_holes' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `mood_tree_holes` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''mood_tree_holes.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_insights' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_insights` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_insights.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'generated_papers' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `generated_papers` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''generated_papers.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'generated_lesson_plans' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `generated_lesson_plans` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''generated_lesson_plans.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'generated_knowledges' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `generated_knowledges` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''generated_knowledges.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paper_queries' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `paper_queries` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''paper_queries.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teaching_calendar' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `teaching_calendar` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''teaching_calendar.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_info_updates' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `student_info_updates` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''student_info_updates.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lesson_plan_templates' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `lesson_plan_templates` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''lesson_plan_templates.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_galleries' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `class_galleries` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''class_galleries.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reading_logs' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `reading_logs` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''reading_logs.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'math_mistakes' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `math_mistakes` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''math_mistakes.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `semesters` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''semesters.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_settings' AND COLUMN_NAME = 'deletedAt');
SET @q = IF(@c = 0, 'ALTER TABLE `ai_settings` ADD COLUMN `deletedAt` datetime NULL DEFAULT NULL', 'SELECT ''ai_settings.deletedAt exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========== 2. 审计字段（核心表）==========
-- users 表加 createdBy/updatedBy
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'createdBy');
SET @q = IF(@c = 0, 'ALTER TABLE `users` ADD COLUMN `createdBy` varchar(64) NULL, ADD COLUMN `updatedBy` varchar(64) NULL', 'SELECT ''users audit exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- students 表
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'createdBy');
SET @q = IF(@c = 0, 'ALTER TABLE `students` ADD COLUMN `createdBy` varchar(64) NULL, ADD COLUMN `updatedBy` varchar(64) NULL', 'SELECT ''students audit exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- exams 表
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exams' AND COLUMN_NAME = 'createdBy');
SET @q = IF(@c = 0, 'ALTER TABLE `exams` ADD COLUMN `createdBy` varchar(64) NULL, ADD COLUMN `updatedBy` varchar(64) NULL', 'SELECT ''exams audit exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- grades 表
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grades' AND COLUMN_NAME = 'createdBy');
SET @q = IF(@c = 0, 'ALTER TABLE `grades` ADD COLUMN `createdBy` varchar(64) NULL, ADD COLUMN `updatedBy` varchar(64) NULL', 'SELECT ''grades audit exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- classes 表
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'createdBy');
SET @q = IF(@c = 0, 'ALTER TABLE `classes` ADD COLUMN `createdBy` varchar(64) NULL, ADD COLUMN `updatedBy` varchar(64) NULL', 'SELECT ''classes audit exists'' AS message'); PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========== 3. 常用查询组合索引 ==========
-- 软删除过滤索引
ALTER TABLE `users` ADD INDEX idx_users_deletedAt (deletedAt);
ALTER TABLE `teachers` ADD INDEX idx_teachers_deletedAt (deletedAt);
ALTER TABLE `classes` ADD INDEX idx_classes_deletedAt (deletedAt);
ALTER TABLE `students` ADD INDEX idx_students_deletedAt (deletedAt);
ALTER TABLE `exams` ADD INDEX idx_exams_deletedAt (deletedAt);
ALTER TABLE `grades` ADD INDEX idx_grades_deletedAt (deletedAt);

-- 复合查询索引优化
ALTER TABLE `grades` ADD INDEX idx_grades_teacher_student (teacherId, studentId);
ALTER TABLE `grades` ADD INDEX idx_grades_exam_subject (examId, subject);
ALTER TABLE `checkins` ADD INDEX idx_checkins_teacher_date (teacherId, date);
ALTER TABLE `growth_entries` ADD INDEX idx_growth_teacher_date (teacherId, date);
ALTER TABLE `behavior_records` ADD INDEX idx_behavior_teacher_date (teacherId, date);
ALTER TABLE `reward_records` ADD INDEX idx_reward_teacher_date (teacherId, date);
ALTER TABLE `score_records` ADD INDEX idx_score_teacher_date (teacherId, date);
ALTER TABLE `home_visits` ADD INDEX idx_homevisits_teacher_date (teacherId, date);
