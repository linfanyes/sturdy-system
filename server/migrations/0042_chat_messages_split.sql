-- P1-2修复：聊天消息明细表（ChatSession.messages JSON 拆分）
-- 新表 chat_messages 每行一条消息，支持分页加载和单条管理

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(64) NOT NULL COMMENT '主键（UUID，继承 BaseEntity）',
  `teacherId` VARCHAR(64) DEFAULT NULL COMMENT '租户键：教师ID',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deletedAt` DATETIME DEFAULT NULL COMMENT '软删除时间（NULL=未删除）',
  `sessionId` VARCHAR(64) NOT NULL COMMENT '关联会话 ID',
  `role` VARCHAR(16) NOT NULL COMMENT '消息角色：user/assistant/system',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `sequence` INT NOT NULL DEFAULT 0 COMMENT '消息序号（从 0 递增）',
  `tokens` INT DEFAULT NULL COMMENT 'token 用量（仅 assistant 消息）',
  PRIMARY KEY (`id`),
  KEY `idx_cm_session_seq` (`sessionId`, `sequence`),
  KEY `idx_cm_teacher` (`teacherId`),
  KEY `idx_cm_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息明细表';
