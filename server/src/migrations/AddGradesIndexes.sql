-- ======================================================================
-- 成绩查询高频路径索引优化（v1.0 迁移）
-- ======================================================================
-- 覆盖以下查询场景：
--   1. 班级成绩列表: WHERE class_id = ? AND exam_id = ?
--   2. 学生成绩查询: WHERE student_id = ? AND exam_id = ?
--   3. 成绩分析:     WHERE class_id = ?  GROUP BY subject_id
--   4. 考试聚合:     WHERE class_id = ?  ORDER BY exam_date DESC
--
-- 使用 IF NOT EXISTS 保证幂等，重复执行安全。
-- ======================================================================

-- grades 表：(class_id, exam_id) 联合索引（班级查看某次考试的所有成绩）
ALTER TABLE grades ADD INDEX IF NOT EXISTS idx_grades_class_exam (class_id, exam_id);

-- grades 表：(student_id, exam_id) 联合索引（学生查看自己历次考试成绩）
ALTER TABLE grades ADD INDEX IF NOT EXISTS idx_grades_student_exam (student_id, exam_id);

-- grades 表：(class_id, subject_id) 联合索引（班级某科目成绩分析）
ALTER TABLE grades ADD INDEX IF NOT EXISTS idx_grades_class_subject (class_id, subject_id);

-- exams 表：(class_id, exam_date) 索引（班级考试列表按日期排序）
ALTER TABLE exams ADD INDEX IF NOT EXISTS idx_exams_class_date (class_id, exam_date DESC);

-- exams 表：(class_id, exam_type) 索引（按考试类型筛选）
ALTER TABLE exams ADD INDEX IF NOT EXISTS idx_exams_class_type (class_id, exam_type);

-- students 表：(class_id, student_no) 索引（班级学生按学号排序）
ALTER TABLE students ADD INDEX IF NOT EXISTS idx_students_class_no (class_id, student_no);

-- audit_logs 表：(actor_id, created_at) 索引（用户操作日志分页查询）
ALTER TABLE audit_logs ADD INDEX IF NOT EXISTS idx_audit_actor_time (actor_id, created_at DESC);

-- audit_logs 表：(target_type, target_id) 索引（资源操作历史查询）
ALTER TABLE audit_logs ADD INDEX IF NOT EXISTS idx_audit_target (target_type, target_id);

-- ======================================================================
-- 说明
-- ======================================================================
-- 以上索引均为辅助索引，不改变表结构，可安全添加。
-- 若数据量 > 100 万行，建议在低峰期执行以避免锁表。
-- 生产环境请先在预发环境验证执行时间。
