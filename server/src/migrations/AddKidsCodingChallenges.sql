-- 少儿编程任务卡表：kids_coding_challenges
-- 语义：教师创建的课堂挑战，发到某班级，学生在家长端完成练习并提交作业。
-- 幂等：表已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();
SET @tbl = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'kids_coding_challenges');
SET @sql = IF(
  @tbl = 0,
  'CREATE TABLE kids_coding_challenges (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    title VARCHAR(255) NOT NULL,
    goal TEXT NULL,
    class_id VARCHAR(64) NULL,
    starter_blocks JSON NULL COMMENT \'起始积木模板(可选脚手架)\',
    criteria JSON NULL COMMENT \'自动判题配置(可选,预留)\',
    teacher_name VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_kc_ch_cls (class_id),
    INDEX idx_kc_ch_tch (teacher_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
