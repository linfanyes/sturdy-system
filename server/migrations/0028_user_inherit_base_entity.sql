-- fix-2: users 表继承 BaseEntity 结构
-- 影响：users 表新增 teacherId 列（nullable，因 User 表通过 schoolId 隔离而非 teacherId）
-- 保持向后兼容：原有 id/createdAt/updatedAt 列不变，仅确保 teacherId 列存在

-- 添加 teacherId 列（如果不存在）
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'teacherId'
);

SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN teacherId varchar(64) NULL DEFAULT NULL',
    'SELECT ''teacherId already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 确认关键索引存在（schoolId 是 User 表的隔离键）
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (schoolId);
CREATE INDEX IF NOT EXISTS idx_users_openid ON users (openid);
