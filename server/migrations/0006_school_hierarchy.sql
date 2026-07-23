-- 四层架构：学校表
CREATE TABLE IF NOT EXISTS schools (
  id varchar(36) PRIMARY KEY,
  code varchar(12) NOT NULL UNIQUE COMMENT '学校编号（S+5位随机）',
  name varchar(255) NOT NULL COMMENT '学校名称',
  address varchar(255) NOT NULL DEFAULT '',
  contact varchar(100) NOT NULL DEFAULT '',
  phone varchar(20) NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'active',
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 学校管理员表
CREATE TABLE IF NOT EXISTS school_admins (
  id varchar(36) PRIMARY KEY,
  username varchar(100) NOT NULL UNIQUE,
  passwordHash varchar(255) NOT NULL,
  name varchar(100) NOT NULL,
  schoolId varchar(36) NOT NULL COMMENT '归属学校ID',
  permissions json DEFAULT NULL COMMENT '可管理模块',
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_schoolId (schoolId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 教师（users）新增 schoolId、username、passwordHash
ALTER TABLE users ADD COLUMN IF NOT EXISTS schoolId varchar(36) DEFAULT NULL AFTER school;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(100) DEFAULT NULL UNIQUE AFTER schoolId;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash varchar(255) DEFAULT NULL AFTER username;
