-- 少儿编程教师点评表：kids_coding_reviews
-- 语义：教师对学生提交的练习作业给出反馈（评语 + 星级），形成学习闭环。
-- 幂等：表已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();
SET @tbl = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'kids_coding_reviews');
SET @sql = IF(
  @tbl = 0,
  'CREATE TABLE kids_coding_reviews (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    project_id VARCHAR(64) NOT NULL COMMENT \'被点评的练习作品 id\',
    challenge_id VARCHAR(64) NULL,
    student_id VARCHAR(64) NULL,
    comment TEXT NULL,
    rating TINYINT NULL COMMENT \'星级评分 1-5\',
    done TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_kc_rv_proj (project_id),
    INDEX idx_kc_rv_tch (teacher_id),
    INDEX idx_kc_rv_stu (student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
