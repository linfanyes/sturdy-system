-- AI 对话历史表：跨端（Web/小程序）统一保存 AI 助教聊天会话与消息
-- 以 teacherId 为租户键；messages 以 JSON 数组存于 TEXT，会话可置顶
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(64) PRIMARY KEY,
  teacherId VARCHAR(64) NOT NULL COMMENT '租户键：教师ID',
  title VARCHAR(64) DEFAULT '通用' COMMENT '会话标题',
  messages TEXT COMMENT '消息列表 JSON 数组 [{role, content}]',
  pinned TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ch_tch_updated (teacherId, updatedAt),
  INDEX idx_ch_pinned (pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;