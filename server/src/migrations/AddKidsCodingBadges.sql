-- 少儿编程成就徽章表：kids_coding_badges
-- 语义：按学生累计获得的成就徽章，由系统在查询时按规则计算并落库。
-- 幂等：表已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();
SET @tbl = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'kids_coding_badges');
SET @sql = IF(
  @tbl = 0,
  'CREATE TABLE kids_coding_badges (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    student_id VARCHAR(64) NOT NULL,
    type VARCHAR(48) NOT NULL,
    earned_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_kc_badge_stu (student_id),
    INDEX idx_kc_badge_stu_type (student_id, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
