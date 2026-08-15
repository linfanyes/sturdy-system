-- 少儿编程作品表补列：任务卡关联 + 作业提交状态 + 作品墙精选
-- 语义：
--   challenge_id  关联的任务卡（学生练习对应某道挑战，null=自由练习）
--   submitted     是否作为作业提交（true=已提交，false=草稿）
--   submitted_at  作业提交时间
--   show_in_gallery 是否被选入班级作品墙（教师精选）
-- 幂等：列/索引已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();

-- 1) challenge_id
SET @col = (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND column_name = 'challenge_id');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE kids_coding_projects ADD COLUMN challenge_id VARCHAR(64) NULL COMMENT \'关联任务卡(自由练习为 null)\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) submitted
SET @col = (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND column_name = 'submitted');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE kids_coding_projects ADD COLUMN submitted TINYINT(1) NOT NULL DEFAULT 0 COMMENT \'是否作为作业提交\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) submitted_at
SET @col = (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND column_name = 'submitted_at');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE kids_coding_projects ADD COLUMN submitted_at DATETIME(6) NULL COMMENT \'作业提交时间\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) show_in_gallery
SET @col = (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND column_name = 'show_in_gallery');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE kids_coding_projects ADD COLUMN show_in_gallery TINYINT(1) NOT NULL DEFAULT 0 COMMENT \'是否入选班级作品墙\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) idx_kc_challenge（按任务卡查询学生提交）
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema = @db AND table_name = 'kids_coding_projects' AND index_name = 'idx_kc_challenge');
SET @sql2 = IF(
  @idx = 0,
  'ALTER TABLE kids_coding_projects ADD INDEX idx_kc_challenge (challenge_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
