-- fix-8: studentNo 索引（加速学号登录查询）
CREATE INDEX IF NOT EXISTS idx_stu_no ON students (studentNo);

-- fix-8: parentLoginEnabled 索引（加速家长登录时的 parentLoginEnabled=true 优先筛选）
CREATE INDEX IF NOT EXISTS idx_stu_parent_login ON students (parentLoginEnabled);
