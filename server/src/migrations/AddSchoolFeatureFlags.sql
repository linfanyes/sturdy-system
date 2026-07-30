-- 学校级功能包开关迁移：schools.feature_flags
-- 语义：simple-json（MySQL 存储为 JSON），nullable。
--   null / []            = 该校全部功能包开启（上级默认全开，不收窄教师级）
--   非空数组            = 白名单，仅列出的包级 key 在该校可用（超管独占配置）
-- 幂等：列已存在则跳过（基于 information_schema 判定，兼容 MySQL 8）。
-- 可逆：回滚执行 ALTER TABLE schools DROP COLUMN feature_flags（见 AddSchoolFeatureFlags.ts 的 down()）。
-- 依赖：server 数据源已开启 multipleStatements（见 app.module.ts）。

SET @db = DATABASE();
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'schools' AND column_name = 'feature_flags');
SET @sql = IF(
  @col = 0,
  'ALTER TABLE schools ADD COLUMN feature_flags JSON NULL COMMENT \'学校级功能包开关：null/[]=全部开启；数组=仅列出的包级key可用（超管独占）\'',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
