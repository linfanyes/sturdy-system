-- 数据库层强制班主任业务规则兜底（应用层校验见 ClassMemberService.assertCanBecomeHead）：
--   规则1：一个老师只能是一个班的班主任（teacherId 在 role='head' 时唯一）
--   规则2：一个班只能有一个班主任（classId 在 role='head' 时唯一）
--
-- MySQL 不支持 `WHERE role='head'` 形式的部分唯一索引，采用 VIRTUAL 生成列 + 唯一索引实现：
--   role='head' 时生成列取 teacherId/classId；role='subject' 时取 NULL。
--   MySQL 唯一索引允许多个 NULL 值共存，故科任老师记录互不冲突，
--   仅 role='head' 的记录受到唯一约束，从数据库层兜底应用层校验。
--
-- 部署前若存在历史脏数据（同一老师是多个班的 head，或一个班有多个 head），
-- 需先清理后再执行本迁移，否则 CREATE UNIQUE INDEX 会失败。

ALTER TABLE class_members
  ADD COLUMN head_teacher_id VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN role = 'head' THEN teacherId ELSE NULL END) VIRTUAL,
  ADD COLUMN head_class_id VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN role = 'head' THEN classId ELSE NULL END) VIRTUAL;

CREATE UNIQUE INDEX idx_cm_head_teacher ON class_members (head_teacher_id);
CREATE UNIQUE INDEX idx_cm_head_class ON class_members (head_class_id);
