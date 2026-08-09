-- P02修复：成绩表唯一索引，防止并发提交同一班级同一考试同一科目的重复成绩
-- 该索引确保 (classId, examName, subject) 组合唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_unique_submission ON grades (classId, examName, subject);
