-- 少儿编程作品表：kids_coding_projects
-- 语义：每位教师可保存积木编程作品；published_to_parent=true 且 class_id 非空时，
--       该班级家长可在「少儿编程」菜单查看（默认不开放，由班级家长功能包 kids-coding 控制）。
-- 幂等：表已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();
SET @tbl = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = @db AND table_name = 'kids_coding_projects');
SET @sql = IF(
  @tbl = 0,
  'CREATE TABLE kids_coding_projects (
    id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(64) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    blocks JSON NULL COMMENT \'积木脚本：JSON 数组（控件 id + 参数 + 顺序）\',
    class_id VARCHAR(64) NULL COMMENT \'发布到的班级；null=仅教师私有\',
    published_to_parent TINYINT(1) NOT NULL DEFAULT 0 COMMENT \'是否开放给该班级家长查看\',
    teacher_name VARCHAR(64) NULL COMMENT \'作者教师展示名\',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_kc_tch (teacher_id),
    INDEX idx_kc_cls_pub (class_id, published_to_parent)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
