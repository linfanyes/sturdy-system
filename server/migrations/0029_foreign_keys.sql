-- 数据库外键约束评估报告
-- 当前项目使用 TypeORM 不启用 synchronize=false（生产）且依赖应用层维护完整性
-- 以下外键建议在迁移到正式迁移管理后添加：

-- 1. students.class_id → classes.id
-- ALTER TABLE students ADD CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- 2. grades.class_id → classes.id
-- ALTER TABLE grades ADD CONSTRAINT fk_grades_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- 3. class_members.teacher_id → users.id
-- ALTER TABLE class_members ADD CONSTRAINT fk_cm_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. class_members.class_id → classes.id
-- ALTER TABLE class_members ADD CONSTRAINT fk_cm_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- 注意：实际执行前需确保现有数据无不一致记录，建议在维护窗口配合应用停机执行
