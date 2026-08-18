-- ======================================================================
-- 0037_ensure_missing_tables.sql
-- 兜底创建所有缺失建表的实体。
-- 背景：以下实体继承 BaseEntity、控制器已注册，但此前无建表迁移。
--       云端 DB_SYNCHRONIZE=false 环境下这些表不存在，导致 CURD 全部失败。
--       本迁移兜底创建所有缺失表（IF NOT EXISTS 幂等可重复执行）。
--
-- 覆盖范围（共 62 张表）：
--   - 教师端通用 CRUD 模块（34 张）
--   - 基础模块（users/teachers/ai_settings/messages 等，14 张）
--   - 学校模块（schedules/attendances/homework/notices 等，14 张）
-- ======================================================================

-- ======================================================================
-- 第一部分：基础模块（认证/用户/AI/消息/通知）
-- ======================================================================

-- ---------- 1) users (教师账号表) ----------
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL COMMENT '租户键：User表不用，保留兼容',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `openid` varchar(255) NULL COMMENT '微信openid',
  `name` varchar(255) NOT NULL DEFAULT '老师',
  `subject` varchar(255) NOT NULL DEFAULT '语文',
  `subjects` text NULL COMMENT 'JSON: 任教学科数组',
  `term` varchar(255) NOT NULL DEFAULT '',
  `school` varchar(255) NOT NULL DEFAULT '',
  `schoolId` varchar(64) NULL,
  `username` varchar(255) NULL,
  `passwordHash` varchar(255) NULL,
  `phone` varchar(255) NOT NULL DEFAULT '',
  `gender` varchar(255) NOT NULL DEFAULT '',
  `position` varchar(255) NOT NULL DEFAULT '',
  `positions` text NULL COMMENT 'JSON: 职务数组',
  `grade` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `avatar` varchar(255) NOT NULL DEFAULT '🍎',
  `motto` text NULL,
  `sessionKey` varchar(255) NULL,
  `teacherNo` varchar(255) NULL,
  `wechatName` varchar(255) NULL,
  `theme` varchar(255) NOT NULL DEFAULT 'light',
  `colorScheme` varchar(255) NOT NULL DEFAULT 'butter',
  `fontSize` varchar(255) NOT NULL DEFAULT 'md',
  `features` text NULL COMMENT 'JSON: 功能权限',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_openid` (`openid`),
  UNIQUE KEY `uk_users_username` (`username`),
  KEY `idx_users_school` (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 2) teachers (教师档案表) ----------
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `teachings` text NULL COMMENT 'JSON: TeachingEntry[]',
  `subjects` text NULL COMMENT 'JSON: 学科数组',
  `classIds` text NULL COMMENT 'JSON: 班级ID数组',
  `remark` text NULL,
  `joinAt` varchar(255) NOT NULL DEFAULT '',
  `avatar` varchar(255) NOT NULL DEFAULT '🧑',
  `isStarred` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_teachers_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 3) ai_settings (AI配置表) ----------
CREATE TABLE IF NOT EXISTS `ai_settings` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ownerType` varchar(255) NOT NULL DEFAULT 'teacher',
  `ownerId` varchar(255) NOT NULL DEFAULT '',
  `providerCode` varchar(255) NOT NULL DEFAULT '',
  `baseUrl` varchar(255) NOT NULL DEFAULT '',
  `apiKey` text NULL,
  `textModel` varchar(255) NOT NULL DEFAULT '',
  `visionModel` varchar(255) NOT NULL DEFAULT '',
  `imageModel` varchar(255) NOT NULL DEFAULT '',
  `videoModel` varchar(255) NOT NULL DEFAULT '',
  `temperature` float NOT NULL DEFAULT 0.7,
  `aiName` varchar(255) NOT NULL DEFAULT '小林子',
  `systemPrompt` text NULL,
  `resourceModels` text NULL COMMENT 'JSON: Record<string,string>',
  PRIMARY KEY (`id`),
  KEY `idx_ai_settings_owner` (`ownerType`, `ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 4) messages (站内消息) ----------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` varchar(36) NOT NULL,
  `senderId` varchar(64) NULL,
  `senderRole` varchar(32) NULL,
  `recipientId` varchar(64) NOT NULL,
  `recipientRole` varchar(32) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'system',
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_message_recipient_read` (`recipientId`, `recipientRole`, `isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 5) notifications (通知) ----------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  `type` varchar(255) NOT NULL DEFAULT 'info',
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `link` varchar(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_teacher_read` (`teacherId`, `read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 6) app_config (平台配置) ----------
CREATE TABLE IF NOT EXISTS `app_config` (
  `id` varchar(36) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'string',
  `description` text NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_config_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 7) student_info_updates (学生信息变更申请) ----------
CREATE TABLE IF NOT EXISTS `student_info_updates` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(255) NOT NULL,
  `classId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL DEFAULT '',
  `parentId` varchar(255) NOT NULL DEFAULT '',
  `parentName` varchar(255) NOT NULL DEFAULT '',
  `payload` text NULL COMMENT 'JSON: 待修改字段',
  `status` varchar(255) NOT NULL DEFAULT 'pending',
  `reviewNote` text NULL,
  `reviewedBy` varchar(255) NOT NULL DEFAULT '',
  `reviewedAt` datetime NULL,
  PRIMARY KEY (`id`),
  KEY `idx_siu_student` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 8) lesson_plan_templates (教案模板) ----------
CREATE TABLE IF NOT EXISTS `lesson_plan_templates` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL DEFAULT '',
  `lessonType` varchar(255) NOT NULL DEFAULT '新授课',
  `grade` varchar(255) NOT NULL DEFAULT '',
  `content` text NULL,
  `isFavorite` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_lpt_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 9) resource_poems (古诗词资源库) ----------
CREATE TABLE IF NOT EXISTS `resource_poems` (
  `id` varchar(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL,
  `title` varchar(100) NOT NULL,
  `dynasty` varchar(20) NOT NULL DEFAULT '',
  `author` varchar(50) NOT NULL DEFAULT '',
  `content` text NOT NULL,
  `translation` text NULL,
  `appreciation` text NULL,
  `grade` varchar(20) NOT NULL DEFAULT '通用',
  `keywords` varchar(200) NOT NULL DEFAULT '',
  `audioUrl` varchar(500) NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_poems_school` (`schoolId`),
  KEY `idx_poems_school_grade` (`schoolId`, `grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 10) resource_math_formulas (数学公式资源库) ----------
CREATE TABLE IF NOT EXISTS `resource_math_formulas` (
  `id` varchar(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL,
  `title` varchar(100) NOT NULL,
  `category` varchar(30) NOT NULL DEFAULT '',
  `formula` varchar(500) NOT NULL DEFAULT '',
  `explanation` text NULL,
  `example` text NULL,
  `grade` varchar(20) NOT NULL DEFAULT '通用',
  `keywords` varchar(200) NOT NULL DEFAULT '',
  `sortOrder` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_formulas_school` (`schoolId`),
  KEY `idx_formulas_school_grade` (`schoolId`, `grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 11) resource_english_words (英语单词资源库) ----------
CREATE TABLE IF NOT EXISTS `resource_english_words` (
  `id` varchar(36) NOT NULL,
  `schoolId` varchar(36) NOT NULL,
  `word` varchar(100) NOT NULL,
  `phonetic` varchar(100) NOT NULL DEFAULT '',
  `meaning` varchar(200) NOT NULL DEFAULT '',
  `category` varchar(30) NOT NULL DEFAULT '',
  `example` text NULL,
  `grade` varchar(20) NOT NULL DEFAULT '通用',
  `audioUrl` varchar(500) NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_words_school` (`schoolId`),
  KEY `idx_words_school_grade` (`schoolId`, `grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 第二部分：学校模块（课表/考勤/作业/通知/资源）
-- ======================================================================

-- ---------- 12) schedules (课表) - 兼容 ScheduleItem + Schedule 双实体 ----------
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `className` varchar(255) NOT NULL DEFAULT '',
  `dayOfWeek` int NOT NULL,
  `period` int NOT NULL,
  `weekType` varchar(255) NOT NULL DEFAULT 'all',
  `section` varchar(20) NULL,
  `subject` varchar(255) NOT NULL DEFAULT '',
  `teacher` varchar(255) NOT NULL DEFAULT '',
  `teacherName` varchar(255) NOT NULL DEFAULT '',
  `location` varchar(255) NOT NULL DEFAULT '',
  `note` text NULL,
  `status` varchar(255) NOT NULL DEFAULT 'normal',
  `adjustReason` text NULL,
  `adjustToDate` varchar(255) NULL,
  `adjustToPeriod` int NULL,
  `semesterId` varchar(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sch_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 13) attendances (考勤) ----------
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `records` text NOT NULL COMMENT 'JSON: {studentId,status}[]',
  PRIMARY KEY (`id`),
  KEY `idx_att_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 14) homework (作业) ----------
CREATE TABLE IF NOT EXISTS `homework` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  `startDate` varchar(255) NOT NULL DEFAULT '',
  `deadline` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(255) NOT NULL DEFAULT '待批改',
  PRIMARY KEY (`id`),
  KEY `idx_hwk_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 15) notices (公告通知) ----------
CREATE TABLE IF NOT EXISTS `notices` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL DEFAULT '全校',
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `ended` tinyint(1) NOT NULL DEFAULT 0,
  `endedAt` varchar(255) NULL,
  `scope` varchar(255) NOT NULL DEFAULT 'class',
  PRIMARY KEY (`id`),
  KEY `idx_ntc_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 16) resources (学校资源) ----------
CREATE TABLE IF NOT EXISTS `resources` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL DEFAULT '',
  `category` varchar(255) NOT NULL DEFAULT '',
  `tags` text NULL COMMENT 'JSON: string[]',
  `description` text NULL,
  `image` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_res_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 17) assignments (分层作业) ----------
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `className` varchar(255) NOT NULL DEFAULT '',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL DEFAULT '',
  `content` text NULL,
  `contentBasic` text NULL,
  `contentImprove` text NULL,
  `contentExtend` text NULL,
  `dueDate` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_asg_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 18) reading_logs (阅读日志) ----------
CREATE TABLE IF NOT EXISTS `reading_logs` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `studentName` varchar(255) NOT NULL,
  `bookTitle` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL DEFAULT '',
  `pages` int NOT NULL DEFAULT 0,
  `minutes` int NOT NULL DEFAULT 0,
  `date` varchar(255) NOT NULL,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rdl_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_rdl_tch_class` (`teacherId`, `classId`),
  KEY `idx_reading_logs_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 19) reports (班级报告) ----------
CREATE TABLE IF NOT EXISTS `reports` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `className` varchar(255) NOT NULL DEFAULT '',
  `type` varchar(255) NOT NULL DEFAULT 'weekly',
  `periodLabel` varchar(255) NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL DEFAULT '',
  `content` text NULL,
  `metrics` text NULL,
  `generatedBy` varchar(255) NOT NULL DEFAULT 'ai',
  `fromDate` varchar(255) NOT NULL DEFAULT '',
  `toDate` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_reports_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 20) teaching_calendar (教学日历) ----------
CREATE TABLE IF NOT EXISTS `teaching_calendar` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `grade` varchar(255) NOT NULL DEFAULT '',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `note` text NULL,
  `color` varchar(255) NOT NULL DEFAULT '#e8f1fb',
  `type` varchar(255) NOT NULL DEFAULT 'normal',
  PRIMARY KEY (`id`),
  KEY `idx_tc_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 21) five_edu_records (五育记录) ----------
CREATE TABLE IF NOT EXISTS `five_edu_records` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NOT NULL,
  `studentName` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `dimension` varchar(16) NOT NULL,
  `evalType` varchar(16) NOT NULL DEFAULT 'teacher',
  `score` int NOT NULL DEFAULT 0,
  `content` text NULL,
  `evaluatorName` varchar(64) NOT NULL DEFAULT '',
  `date` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_fer_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_fer_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 22) mood_checkins (情绪打卡) ----------
CREATE TABLE IF NOT EXISTS `mood_checkins` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NOT NULL,
  `studentName` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `level` int NOT NULL,
  `emoji` varchar(24) NULL,
  `note` text NULL,
  `date` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mood_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_mood_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 23) mood_tree_holes (树洞) ----------
CREATE TABLE IF NOT EXISTS `mood_tree_holes` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `content` text NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `riskLevel` varchar(8) NOT NULL DEFAULT 'none',
  `aiReply` text NULL,
  `staffReply` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_th_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 24) class_insights (班级洞察) ----------
CREATE TABLE IF NOT EXISTS `class_insights` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `className` varchar(255) NOT NULL DEFAULT '',
  `weekLabel` varchar(255) NOT NULL,
  `weekStart` varchar(255) NOT NULL,
  `weekEnd` varchar(255) NOT NULL,
  `emotionAvg` float NULL,
  `lowMoodCount` int NOT NULL DEFAULT 0,
  `lowMoodStudents` text NULL COMMENT 'JSON: string[]',
  `gradeLatestAvg` float NULL,
  `gradePrevAvg` float NULL,
  `gradeDelta` float NULL,
  `gradeImproved` text NULL COMMENT 'JSON: string[]',
  `gradeDeclined` text NULL COMMENT 'JSON: string[]',
  `summary` text NOT NULL,
  `generatedBy` varchar(255) NOT NULL DEFAULT 'template',
  PRIMARY KEY (`id`),
  KEY `idx_ci_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 25) study_plans (学习计划) ----------
CREATE TABLE IF NOT EXISTS `study_plans` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NOT NULL,
  `studentName` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `weekLabel` varchar(255) NOT NULL,
  `knowledgePoints` text NULL COMMENT 'JSON: string[]',
  `progress` int NOT NULL DEFAULT 0,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sp_tch_stu` (`teacherId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 26) weak_point_exercises (薄弱点练习) ----------
CREATE TABLE IF NOT EXISTS `weak_point_exercises` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NOT NULL,
  `studentName` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `knowledgePoint` varchar(255) NOT NULL DEFAULT '',
  `question` text NOT NULL,
  `answer` text NULL,
  `done` tinyint(1) NOT NULL DEFAULT 0,
  `attempts` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_wpe_tch_stu` (`teacherId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 27) habit_challenges (习惯挑战) ----------
CREATE TABLE IF NOT EXISTS `habit_challenges` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(16) NOT NULL DEFAULT 'reading',
  `title` varchar(64) NOT NULL,
  `targetDays` int NOT NULL DEFAULT 21,
  `classId` varchar(64) NULL,
  `studentId` varchar(64) NULL,
  `createdByRole` varchar(8) NOT NULL DEFAULT 'parent',
  `startDate` varchar(255) NOT NULL DEFAULT '',
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hc_tch_cls` (`teacherId`, `classId`),
  KEY `idx_hc_tch_stu` (`teacherId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 28) habit_checkins (习惯打卡) ----------
CREATE TABLE IF NOT EXISTS `habit_checkins` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `challengeId` varchar(64) NOT NULL,
  `studentId` varchar(64) NOT NULL,
  `classId` varchar(64) NULL,
  `date` varchar(255) NOT NULL DEFAULT '',
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hci_challenge` (`challengeId`),
  KEY `idx_hci_tch_stu` (`teacherId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 第三部分：教师端通用 CRUD 模块
-- ======================================================================

-- ---------- 29) duty_rosters (轮值表) ----------
CREATE TABLE IF NOT EXISTS `duty_rosters` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `assignments` text NULL COMMENT 'JSON: {date,persons}[]',
  PRIMARY KEY (`id`),
  KEY `idx_dty_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 30) growth_entries (成长记录) ----------
CREATE TABLE IF NOT EXISTS `growth_entries` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_gth_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_growth_entries_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 31) behavior_records (行为记录) ----------
CREATE TABLE IF NOT EXISTS `behavior_records` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `behavior` varchar(255) NOT NULL,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bhr_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_behavior_records_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 32) work_logs (工作日志) ----------
CREATE TABLE IF NOT EXISTS `work_logs` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date` varchar(255) NOT NULL,
  `classCount` int DEFAULT 0,
  `homeworkCount` int DEFAULT 0,
  `content` text NULL,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wl_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 33) lesson_observations (听课记录) ----------
CREATE TABLE IF NOT EXISTS `lesson_observations` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `className` varchar(255) NOT NULL DEFAULT '',
  `teacherName` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL DEFAULT '',
  `topic` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `strengths` text NULL,
  `suggestions` text NULL,
  `overallRating` varchar(255) NOT NULL DEFAULT '良好',
  PRIMARY KEY (`id`),
  KEY `idx_lo_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 34) home_visits (家访记录) ----------
CREATE TABLE IF NOT EXISTS `home_visits` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL DEFAULT '',
  `date` varchar(255) NOT NULL,
  `content` text NULL,
  `followUp` text NULL,
  `status` varchar(255) NOT NULL DEFAULT 'planned',
  `photos` text NULL COMMENT 'JSON: base64图片数组',
  PRIMARY KEY (`id`),
  KEY `idx_hvt_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_home_visits_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 35) seat_layouts (座位表) ----------
CREATE TABLE IF NOT EXISTS `seat_layouts` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `rows` int NOT NULL,
  `cols` int NOT NULL,
  `seats` text NULL COMMENT 'JSON: (string|null)[][]',
  `active` tinyint(1) NOT NULL DEFAULT 0,
  `aisleCols` text NULL COMMENT 'JSON: number[]',
  PRIMARY KEY (`id`),
  KEY `idx_set_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 36) checkins (学生打卡) ----------
CREATE TABLE IF NOT EXISTS `checkins` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NULL,
  `classId` varchar(64) NULL,
  `studentName` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `count` int NOT NULL DEFAULT 1,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_chk_tch_stu` (`teacherId`, `studentId`),
  KEY `idx_chk_tch_class` (`teacherId`, `classId`),
  KEY `idx_checkins_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 37) my_galleries (我的相册) ----------
CREATE TABLE IF NOT EXISTS `my_galleries` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `date` varchar(255) NULL DEFAULT '',
  `photos` text NULL COMMENT 'JSON: base64图片数组',
  PRIMARY KEY (`id`),
  KEY `idx_myg_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 38) backup_snapshots (数据备份) ----------
CREATE TABLE IF NOT EXISTS `backup_snapshots` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(64) NOT NULL COMMENT 'manual / auto',
  `label` varchar(200) NOT NULL,
  `payload` text NOT NULL COMMENT 'JSON: 全量数据快照',
  PRIMARY KEY (`id`),
  KEY `idx_bkp_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 39) notice_templates (通知模板) ----------
CREATE TABLE IF NOT EXISTS `notice_templates` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nt_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 40) class_expenses (班费) ----------
CREATE TABLE IF NOT EXISTS `class_expenses` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT '',
  `amount` float NOT NULL DEFAULT 0,
  `date` varchar(255) NOT NULL,
  `description` text NULL,
  `handler` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_ce_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 41) class_activities (班级活动) ----------
CREATE TABLE IF NOT EXISTS `class_activities` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `description` text NULL,
  `photos` text NULL COMMENT 'JSON: base64图片数组',
  PRIMARY KEY (`id`),
  KEY `idx_ca_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 42) class_duty_configs (值日配置) ----------
CREATE TABLE IF NOT EXISTS `class_duty_configs` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `duties` text NULL COMMENT 'JSON: string[]',
  `assignments` text NULL COMMENT 'JSON: Record<string,string[]>',
  PRIMARY KEY (`id`),
  KEY `idx_cdc_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 43) award_records (获奖记录) ----------
CREATE TABLE IF NOT EXISTS `award_records` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) NOT NULL,
  `issuer` varchar(255) NOT NULL DEFAULT '',
  `date` varchar(255) NOT NULL DEFAULT '',
  `level` varchar(255) NOT NULL DEFAULT '',
  `image` text NULL,
  `tags` text NULL COMMENT 'JSON: string[]',
  `note` text NULL,
  `ratingScore` int NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ar_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 44) award_categories (奖项类别) ----------
CREATE TABLE IF NOT EXISTS `award_categories` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_ac_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 45) reward_records (奖励记录) ----------
CREATE TABLE IF NOT EXISTS `reward_records` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `studentId` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `points` int NOT NULL DEFAULT 0,
  `reason` text NULL,
  `date` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rr_tch_cls_stu` (`teacherId`, `classId`, `studentId`),
  KEY `idx_reward_records_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 46) score_records (加减分记录) ----------
CREATE TABLE IF NOT EXISTS `score_records` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `delta` int NOT NULL DEFAULT 0,
  `reason` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sr_tch_cls_stu` (`teacherId`, `classId`, `studentId`),
  KEY `idx_score_records_cov` (`teacherId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 47) group_scores (小组评分) ----------
CREATE TABLE IF NOT EXISTS `group_scores` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `points` int NOT NULL DEFAULT 0,
  `color` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_gs_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 48) generated_papers (智能组卷) ----------
CREATE TABLE IF NOT EXISTS `generated_papers` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `grade` varchar(255) NOT NULL DEFAULT '',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `prompt` text NULL,
  `content` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_gp_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 49) generated_lesson_plans (智能教案) ----------
CREATE TABLE IF NOT EXISTS `generated_lesson_plans` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `topic` varchar(255) NOT NULL DEFAULT '',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `grade` varchar(255) NOT NULL DEFAULT '',
  `prompt` text NULL,
  `content` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_glp_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 50) generated_knowledges (知识点库) ----------
CREATE TABLE IF NOT EXISTS `generated_knowledges` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `grade` varchar(255) NOT NULL DEFAULT '',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `textbook` varchar(255) NOT NULL DEFAULT '',
  `term` varchar(255) NOT NULL DEFAULT '',
  `prompt` text NULL,
  `content` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_gk_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 51) paper_queries (智能题库查询) ----------
CREATE TABLE IF NOT EXISTS `paper_queries` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `keyword` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `source` varchar(255) NOT NULL DEFAULT '',
  `year` varchar(255) NOT NULL DEFAULT '',
  `abstract` text NULL,
  `content` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pq_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 52) kids_coding_projects (少儿编程作品) ----------
CREATE TABLE IF NOT EXISTS `kids_coding_projects` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `blocks` json NULL COMMENT '积木脚本JSON',
  `classId` varchar(64) NULL,
  `publishedToParent` tinyint(1) NOT NULL DEFAULT 0,
  `teacherName` varchar(64) NULL,
  `studentId` varchar(64) NULL,
  `challengeId` varchar(64) NULL,
  `submitted` tinyint(1) NOT NULL DEFAULT 0,
  `submittedAt` datetime NULL,
  `showInGallery` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_kcp_tch` (`teacherId`),
  KEY `idx_kcp_cls_pub` (`classId`, `publishedToParent`),
  KEY `idx_kcp_stu` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 53) kids_coding_badges (编程徽章) ----------
CREATE TABLE IF NOT EXISTS `kids_coding_badges` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NOT NULL,
  `type` varchar(48) NOT NULL,
  `earnedAt` datetime NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kcb_stu` (`studentId`),
  KEY `idx_kcb_stu_type` (`studentId`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 54) kids_coding_reviews (编程点评) ----------
CREATE TABLE IF NOT EXISTS `kids_coding_reviews` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `projectId` varchar(64) NOT NULL,
  `challengeId` varchar(64) NULL,
  `studentId` varchar(64) NULL,
  `comment` text NULL,
  `rating` tinyint NULL,
  `done` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_kcr_proj` (`projectId`),
  KEY `idx_kcr_tch` (`teacherId`),
  KEY `idx_kcr_stu` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 55) kids_coding_challenges (编程挑战) ----------
CREATE TABLE IF NOT EXISTS `kids_coding_challenges` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `goal` text NULL,
  `classId` varchar(64) NULL,
  `starterBlocks` json NULL,
  `criteria` json NULL,
  `teacherName` varchar(64) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kcc_cls` (`classId`),
  KEY `idx_kcc_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 56) safety_reports (安全上报) ----------
CREATE TABLE IF NOT EXISTS `safety_reports` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(255) NOT NULL,
  `content` text NULL,
  `level` varchar(255) NOT NULL DEFAULT 'normal',
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `anonymous` tinyint(1) NOT NULL DEFAULT 0,
  `reporterStudentId` varchar(255) NULL,
  `classId` varchar(255) NULL,
  `handlerName` varchar(255) NULL,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sr_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 57) safety_checkins (安全打卡) ----------
CREATE TABLE IF NOT EXISTS `safety_checkins` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `studentId` varchar(64) NULL,
  `studentName` varchar(255) NULL,
  `classId` varchar(255) NULL,
  `type` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `time` varchar(255) NULL,
  `note` text NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sc_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 58) literacy_lessons (识字课程) ----------
CREATE TABLE IF NOT EXISTS `literacy_lessons` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category` varchar(255) NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  `duration` int NOT NULL DEFAULT 0,
  `sort` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_ll_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 59) literacy_badges (识字徽章) ----------
CREATE TABLE IF NOT EXISTS `literacy_badges` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lessonId` varchar(64) NOT NULL,
  `studentId` varchar(64) NOT NULL,
  `classId` varchar(64) NULL,
  `completedAt` datetime NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lb_stu` (`studentId`),
  KEY `idx_lb_lesson` (`lessonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 60) notify_prefs (通知偏好) ----------
CREATE TABLE IF NOT EXISTS `notify_prefs` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ownerId` varchar(64) NOT NULL,
  `ownerRole` varchar(32) NOT NULL,
  `quietStart` varchar(8) NULL,
  `quietEnd` varchar(8) NULL,
  `quietEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `digestMode` varchar(16) NOT NULL DEFAULT 'realtime',
  `categories` text NULL COMMENT 'JSON: Record<string,boolean>',
  `showGrade` tinyint(1) NOT NULL DEFAULT 1,
  `showRank` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_np_owner` (`ownerId`, `ownerRole`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 61) notes (笔记) ----------
CREATE TABLE IF NOT EXISTS `notes` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `content` text NULL,
  `category` varchar(255) NOT NULL DEFAULT '其他',
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `favorite` tinyint(1) NOT NULL DEFAULT 0,
  `images` text NULL COMMENT 'JSON: 图片数组',
  PRIMARY KEY (`id`),
  KEY `idx_notes_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 62) todos (待办) ----------
CREATE TABLE IF NOT EXISTS `todos` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) NOT NULL,
  `note` text NULL,
  `date` varchar(255) NOT NULL DEFAULT '',
  `done` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_todos_tch` (`teacherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 63) picker_history (选取历史) ----------
CREATE TABLE IF NOT EXISTS `picker_history` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `classId` varchar(255) NOT NULL,
  `studentId` varchar(255) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ph_tch_cls` (`teacherId`, `classId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 64) data_consents (数据授权) ----------
CREATE TABLE IF NOT EXISTS `data_consents` (
  `id` varchar(36) NOT NULL,
  `teacherId` varchar(64) NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ownerId` varchar(64) NOT NULL,
  `studentId` varchar(64) NULL,
  `studentName` varchar(64) NULL,
  `consents` text NULL COMMENT 'JSON: 授权项',
  `version` varchar(16) NOT NULL DEFAULT '1.0',
  `withdrawnAt` datetime NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dc_owner` (`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
