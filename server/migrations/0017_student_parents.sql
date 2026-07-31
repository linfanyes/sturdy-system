-- 学生-家长微信绑定关联表（多对多）。
-- 一个学生可绑定多个微信（爸爸、妈妈、监护人各自用自己微信绑定同一学生）；
-- 一个微信也可关联多个学生（自家多娃，跨班跨校皆可）。
SET @t_exists = (SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'student_parents');
SET @sql = IF(@t_exists = 0,
  'CREATE TABLE student_parents (
    id varchar(36) NOT NULL,
    studentId varchar(36) NOT NULL COMMENT \"学生ID\",
    parentId varchar(36) NOT NULL COMMENT \"关联 Parent.id\",
    openId varchar(128) NOT NULL COMMENT \"微信openid（冗余便于查询）\",
    relation varchar(20) NOT NULL DEFAULT \"\" COMMENT \"关系：父亲/母亲/监护人\",
    nickName varchar(100) NOT NULL DEFAULT \"\" COMMENT \"微信昵称\",
    avatar varchar(500) NOT NULL DEFAULT \"\" COMMENT \"微信头像\",
    isPrimary tinyint(1) NOT NULL DEFAULT 0 COMMENT \"是否主家长\",
    schoolId varchar(36) NOT NULL DEFAULT \"\" COMMENT \"学生所属学校（跨校聚合用）\",
    classId varchar(36) NOT NULL DEFAULT \"\" COMMENT \"学生所在班级（冗余）\",
    createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_sp_student (studentId),
    KEY idx_sp_parent (parentId),
    KEY idx_sp_openid (openId),
    UNIQUE KEY idx_sp_student_openid (studentId, openId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=\"学生-家长微信绑定关联表（多对多）\"',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
