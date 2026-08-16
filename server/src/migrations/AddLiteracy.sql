-- 数字素养 / 生涯启蒙 模块表
-- literacy_lessons: 微课（分类：digital_literacy / online_safety / career）
-- literacy_badges:   学生完成某微课后获得的徽章
-- 幂等：表已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。
-- 说明：云端 DB_SYNCHRONIZE=false，实体表只能靠本迁移建立；缺失会导致
--       bootstrap 的 seed 阶段查询 literacy_lessons 报 “doesn't exist” 而 fail-closed。

SET @db = DATABASE();

-- 1) literacy_lessons
SET @tbl1 = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'literacy_lessons');
SET @sql1 = IF(
  @tbl1 = 0,
  'CREATE TABLE literacy_lessons (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    category VARCHAR(16) NOT NULL DEFAULT \'digital_literacy\',
    title VARCHAR(80) NOT NULL,
    content TEXT NOT NULL,
    duration INT NOT NULL DEFAULT 5,
    sort INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_lit_cat (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2) literacy_badges
SET @tbl2 = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'literacy_badges');
SET @sql2 = IF(
  @tbl2 = 0,
  'CREATE TABLE literacy_badges (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    lesson_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    class_id VARCHAR(64) NULL,
    completed_at VARCHAR(255) NOT NULL DEFAULT \'\',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_lb_lesson_stu (lesson_id, student_id),
    INDEX idx_lb_tch_cls (teacher_id, class_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
