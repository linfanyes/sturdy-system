-- 学校表增加学校级功能包开关字段（超管独占配置）
-- 语义：null / 空数组 = 该校全部功能包开启（不收窄教师级）；
--       指定数组 = 仅列出的「包级 key」可用，其余被学校级强制关闭。
-- 解析顺序：学校级(order 10) ∩ 教师级(order 20)。
-- 字段类型使用 TEXT 以与实体 column 类型 'simple-json'（TypeORM 在 MySQL 下映射为 text）保持一致，
-- 避免启动期 synchronize 产生多余的 ALTER。
-- 幂等：通过 IF NOT EXISTS 保证重复执行不报错。
ALTER TABLE schools ADD COLUMN IF NOT EXISTS feature_flags TEXT NULL
  COMMENT '学校级功能包开关：null/[]=全部开启；数组=仅列出的包级key可用（超管独占）' AFTER status;

-- 回滚（手动执行）：ALTER TABLE schools DROP COLUMN feature_flags;
