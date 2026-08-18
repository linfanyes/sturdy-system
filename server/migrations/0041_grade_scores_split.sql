-- P1-1修复：成绩分数明细表（Grade.scores JSON 拆分）
-- 新表 grade_scores 每行一个学生的单科成绩，解决大 JSON 字段查询/索引问题
-- Grade.scores JSON 字段保留为冗余快照，写入时事务双写

CREATE TABLE IF NOT EXISTS `grade_scores` (
  `id` VARCHAR(64) NOT NULL COMMENT '主键（UUID，继承 BaseEntity）',
  `teacherId` VARCHAR(64) DEFAULT NULL COMMENT '租户键：教师ID',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deletedAt` DATETIME DEFAULT NULL COMMENT '软删除时间（NULL=未删除）',
  `gradeId` VARCHAR(64) NOT NULL COMMENT '关联成绩记录 ID',
  `studentId` VARCHAR(64) NOT NULL COMMENT '学生 ID',
  `score` DECIMAL(5,2) DEFAULT NULL COMMENT '分数（NULL=缺考）',
  `examId` VARCHAR(64) DEFAULT NULL COMMENT '考试 ID（冗余）',
  `classId` VARCHAR(64) DEFAULT NULL COMMENT '班级 ID（冗余）',
  `subject` VARCHAR(64) DEFAULT NULL COMMENT '科目（冗余）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_gs_grade_student` (`gradeId`, `studentId`),
  KEY `idx_gs_teacher_student` (`teacherId`, `studentId`),
  KEY `idx_gs_exam` (`examId`),
  KEY `idx_gs_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成绩分数明细表';

-- 幂等性保障：从现有 grades 表回填历史数据
-- 注意：此回填仅为初始同步，后续写入由应用层双写保证
-- 使用 INSERT IGNORE 避免重复插入
/*
INSERT IGNORE INTO `grade_scores` (`id`, `teacherId`, `gradeId`, `studentId`, `score`, `examId`, `classId`, `subject`, `createdAt`, `updatedAt`)
SELECT
  UUID() AS id,
  g.teacherId,
  g.id AS gradeId,
  j.studentId,
  j.score,
  g.examId,
  g.classId,
  g.subject,
  NOW(),
  NOW()
FROM grades g
CROSS JOIN JSON_TABLE(
  g.scores,
  '$[*]' COLUMNS(
    studentId VARCHAR(64) PATH '$.studentId',
    score DECIMAL(5,2) PATH '$.score'
  )
) j
WHERE g.deletedAt IS NULL;
*/
-- 注：上述回填 SQL 需根据实际 MySQL 版本调整（JSON_TABLE 需 MySQL 8.0+）
-- 建议在非高峰时段由运维手动执行
