-- ======================================================================
-- 0034_grades_unique_index.sql
-- grades 建「班级-考试-科目」唯一索引（防并发重复提交成绩）。
-- 拆分自 0033：历史数据可能存在同 (classId, examId, subject) 的多行，
-- 直接建唯一索引会报 Duplicate entry 从而阻断整个迁移文件。
-- 因此先按 (classId, examId, subject) 分组清理重复行（保留最小 id），再建索引。
-- 幂等：索引已存在则跳过；可重复执行。
-- ======================================================================

-- 1) 清理重复：同 classId+examId+subject 只保留 id 最小的一行
SET @t=(SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades');
SET @i=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND INDEX_NAME='idx_grades_unique_submission');
SET @sql=IF(@t=0 OR @i>0,'SELECT 1',
  'DELETE g1 FROM grades g1 JOIN grades g2 ON g1.classId=g2.classId AND g1.examId=g2.examId AND g1.subject=g2.subject AND g1.id>g2.id');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 建唯一索引
SET @i2=(SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND INDEX_NAME='idx_grades_unique_submission');
SET @sql=IF(@t=0 OR @i2>0,'SELECT 1','CREATE UNIQUE INDEX idx_grades_unique_submission ON grades (classId, examId, subject)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
