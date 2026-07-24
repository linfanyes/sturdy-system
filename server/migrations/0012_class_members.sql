-- 班级成员关系表：支持班主任/科任老师协作
-- 教师与班级的多对多关系，role 区分班主任(head)和科任老师(subject)
CREATE TABLE IF NOT EXISTS class_members (
  id VARCHAR(64) PRIMARY KEY,
  teacherId VARCHAR(64) NOT NULL COMMENT '租户键：教师ID',
  classId VARCHAR(64) NOT NULL COMMENT '班级ID',
  className VARCHAR(255) DEFAULT '' COMMENT '班级名称（冗余）',
  role VARCHAR(20) DEFAULT 'subject' COMMENT 'head=班主任, subject=科任老师',
  subjects TEXT COMMENT '任教学科列表JSON',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cm_class (classId),
  INDEX idx_cm_teacher (teacherId),
  UNIQUE INDEX idx_cm_teacher_class (teacherId, classId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 迁移现有班级数据：为每个班级的创建者(teacherId)写入 head 记录
INSERT IGNORE INTO class_members (id, teacherId, classId, className, role, subjects, createdAt, updatedAt)
SELECT
  REPLACE(UUID(), '-', '') AS id,
  teacherId,
  id AS classId,
  name AS className,
  'head' AS role,
  IFNULL(subjects, '[]') AS subjects,
  createdAt,
  updatedAt
FROM classes
WHERE teacherId IS NOT NULL AND teacherId != '';
