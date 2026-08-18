-- ======================================================================
-- 0043_foreign_keys_complement.sql
-- P2-1修复：补充遗漏的外键约束（数据完整性保护）。
--
-- 0035 已添加 exams/grades/students/class_members/parent_contacts/chat_sessions/notes 的 FK。
-- 本次补充以下关联：
--   - assignments → classes
--   - mood_checkins → students
--   - game_scores → students
--   - behavior_records → students
--   - growth_entries → students
--   - reading_logs → students
--   - checkin_records → students
--   - award_records → students
--   - homework → classes
--   - lesson_observations → teachers
--
-- 设计考量：
--   - 仅在目标表存在时添加（用 information_schema 预查）
--   - ON DELETE CASCADE 级联清理
--   - 幂等性保障：同名约束已存在则跳过
-- ======================================================================

-- 辅助过程：安全添加外键（仅在目标表存在时执行）
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `safe_add_fk`(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_ref_table VARCHAR(64),
  IN p_ref_column VARCHAR(64),
  IN p_fk_name VARCHAR(64),
  IN p_on_delete VARCHAR(20)
)
BEGIN
  DECLARE v_table_exists INT;
  DECLARE v_ref_exists INT;
  DECLARE v_fk_exists INT;

  -- 检查目标表是否存在
  SELECT COUNT(*) INTO v_table_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table;

  -- 检查引用表是否存在
  SELECT COUNT(*) INTO v_ref_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_ref_table;

  -- 检查 FK 是否已存在
  SELECT COUNT(*) INTO v_fk_exists
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_fk_name;

  IF v_table_exists > 0 AND v_ref_exists > 0 AND v_fk_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_fk_name,
      '` FOREIGN KEY (`', p_column, '`) REFERENCES `', p_ref_table, '`(`', p_ref_column, '`) ON DELETE ', p_on_delete);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- 1) assignments.class_id → classes.id
CALL safe_add_fk('assignments', 'class_id', 'classes', 'id', 'fk_assignments_class_id', 'CASCADE');

-- 2) mood_checkins.student_id → students.id
CALL safe_add_fk('mood_checkins', 'student_id', 'students', 'id', 'fk_mood_checkins_student_id', 'CASCADE');

-- 3) game_scores.student_id → students.id
CALL safe_add_fk('game_scores', 'student_id', 'students', 'id', 'fk_game_scores_student_id', 'CASCADE');

-- 4) behavior_records.student_id → students.id
CALL safe_add_fk('behavior_records', 'student_id', 'students', 'id', 'fk_behavior_records_student_id', 'CASCADE');

-- 5) growth_entries.student_id → students.id
CALL safe_add_fk('growth_entries', 'student_id', 'students', 'id', 'fk_growth_entries_student_id', 'CASCADE');

-- 6) reading_logs.student_id → students.id
CALL safe_add_fk('reading_logs', 'student_id', 'students', 'id', 'fk_reading_logs_student_id', 'CASCADE');

-- 7) checkin_records.student_id → students.id
CALL safe_add_fk('checkin_records', 'student_id', 'students', 'id', 'fk_checkin_records_student_id', 'CASCADE');

-- 8) award_records.student_id → students.id
CALL safe_add_fk('award_records', 'student_id', 'students', 'id', 'fk_award_records_student_id', 'CASCADE');

-- 9) homework.class_id → classes.id
CALL safe_add_fk('homework', 'class_id', 'classes', 'id', 'fk_homework_class_id', 'CASCADE');

-- 10) lesson_observations.observer_id → teachers.id
CALL safe_add_fk('lesson_observations', 'observer_id', 'teachers', 'id', 'fk_lesson_obs_observer_id', 'SET NULL');

-- 清理辅助过程
DROP PROCEDURE IF EXISTS `safe_add_fk`;
