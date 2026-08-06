-- 小游戏成绩表：跨端（Web/小程序）统一记录每个小游戏的最高分
-- 以 teacherId 为租户键，gameKey 为小游戏标识；同一 gameKey 对同一教师幂等保留最高分
CREATE TABLE IF NOT EXISTS game_scores (
  id VARCHAR(64) PRIMARY KEY,
  teacherId VARCHAR(64) NOT NULL COMMENT '租户键：教师ID',
  gameKey VARCHAR(64) NOT NULL COMMENT '小游戏标识（如 2048/24point/puzzle）',
  gameName VARCHAR(64) DEFAULT '' COMMENT '小游戏名称（冗余）',
  bestScore INT DEFAULT 0 COMMENT '历史最高分',
  lastScore INT DEFAULT 0 COMMENT '最近一次得分',
  playCount INT DEFAULT 0 COMMENT '游玩次数',
  durationSec INT DEFAULT 0 COMMENT '累计游玩时长（秒）',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gsc_tch_game (teacherId, gameKey),
  INDEX idx_gsc_best (bestScore)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;