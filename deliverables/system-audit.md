# 园丁工作台 · 系统梳理文档

> 生成时间：2026-08-03  
> 范围：Web 端（`web-app/`）+ 微信小程序端（`mini-program/`）+ 后端 API（`server/`）  
> 角色：超管(super) / 校管(school_admin) / 教师(teacher) / 家长(parent)

---

## 1. 四角色概览

| 角色 | 英文标识 | Web 页面数 | 小程序页面数 | 核心接口前缀 | 登录方式 |
|------|---------|-----------|------------|-------------|---------|
| 超管 | `super` | 7 | 0 | `/admin` | 统一登录 `/auth/unified-login` |
| 校管 | `school_admin` | 8 | 6 | `/school-admin` | 统一登录 `/auth/unified-login` |
| 教师 | `teacher` | 100+ | 60+ | 多模块（见第3节） | 统一登录 `/auth/unified-login` + 微信绑定 |
| 家长 | `parent` | 3 | 5 | `/parent-auth` | 学号密码 `/parent-auth/login` + 微信绑定 |

---

## 2. 前端页面清单

### 2.1 Web 端（`web-app/src/router/index.ts`）

#### 超管（7 页）

| 路由 | 组件 | 功能 |
|------|------|------|
| `/super` | `Dashboard.vue` | 超管工作台 |
| `/super/schools` | `Schools.vue` | 学校管理 |
| `/super/admins` | `Admins.vue` | 管理员管理 |
| `/super/audit-logs` | `AuditLogs.vue` | 审计日志 |
| `/super/config` | `PlatformConfig.vue` | 平台配置 |
| `/super/ai-providers` | `AiProviders.vue` | AI 服务商 |
| `/super/school-features` | `SchoolFeatures.vue` | 学校功能包 |

#### 校管（8 页）

| 路由 | 组件 | 功能 |
|------|------|------|
| `/school-admin` | `Dashboard.vue` | 校管工作台 |
| `/school-admin/teachers` | `Teachers.vue` | 教师管理 |
| `/school-admin/classes` | `Classes.vue` | 班级管理 |
| `/school-admin/students` | `Students.vue` | 学生管理 |
| `/school-admin/notices` | `Notices.vue` | 学校公告 |
| `/school-admin/textbooks` | `Textbooks.vue` | 教材知识库 |
| `/school-admin/resource-library` | `ResourceLibrary.vue` | 教学资源库 |
| `/school-admin/features` | `FeatureFlags.vue` | 功能包开关 |

#### 教师（100+ 页）

##### 个人空间
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher` | `Dashboard.vue` | 教师工作台 | — |
| `/teacher/notifications` | `Notifications.vue` | 通知中心 | — |
| `/teacher/profile` | `Profile.vue` | 个人资料 | — |
| `/teacher/config` | `Config.vue` | 设置 | — |
| `/teacher/todos` | `Todos.vue` | 待办事项 | `todos` |
| `/teacher/notes` | `Notes.vue` | 笔记 | `notes` |
| `/teacher/schedule` | `Schedule.vue` | 课表 | `schedule` |
| `/teacher/my-schedule` | `MySchedule.vue` | 我的课表 | `schedule` |
| `/teacher/notices` | `Notices.vue` | 公告 | `notices` |
| `/teacher/data` | `DataManager.vue` | 数据管理 | `notices` |

##### 班级与学生
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/classes` | `ClassMembers.vue` | 班级成员 | `classes` |
| `/teacher/students` | `Students.vue` | 学生管理 | `students` |
| `/teacher/student-info-review` | `StudentInfoReview.vue` | 信息修改审核 | `students` |
| `/teacher/duty-roster` | `DutyRoster.vue` | 轮值表 | `duty` |
| `/teacher/duty-config` | `DutyConfig.vue` | 值日配置 | `duty` |
| `/teacher/class-finance` | `ClassFinance.vue` | 班费 | `finance` |
| `/teacher/class-activities` | `ClassActivities.vue` | 班级活动 | `activities` |
| `/teacher/gallery` | `Gallery.vue` | 班级风采 | `gallery` |
| `/teacher/my-gallery` | `MyGallery.vue` | 我的相册 | `gallery` |

##### 学情与考试
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/exams` | `Exams.vue` | 考试管理 | `exams` |
| `/teacher/grades` | `Grades.vue` | 成绩管理 | `grades` |
| `/teacher/exam-analysis` | `ExamAnalysis.vue` | 考试分析 | `analysis` |
| `/teacher/data-dashboard` | `DataDashboard.vue` | 数据看板 | `analysis` |
| `/teacher/radar` | `Radar.vue` | 雷达图 | `analysis` |
| `/teacher/exam-detail` | `ExamDetail.vue` | 考试详情 | `analysis` |
| `/teacher/student-grades` | `StudentGrades.vue` | 学生成绩 | `grades` |
| `/teacher/attendance` | `Attendance.vue` | 考勤 | `attendance` |
| `/teacher/homework` | `Homework.vue` | 作业 | `homework` |

##### 学生评价
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/rewards` | `RewardRecords.vue` | 奖励记录 | `rewards` |
| `/teacher/score-records` | `ScoreRecords.vue` | 加减分记录 | `rewards` |
| `/teacher/group-scores` | `GroupScores.vue` | 小组评分 | `rewards` |
| `/teacher/leaderboard` | `Leaderboard.vue` | 排行榜 | `rewards` |
| `/teacher/growth` | `Growth.vue` | 成长记录 | `growth` |
| `/teacher/behavior` | `Behavior.vue` | 行为记录 | `behavior` |
| `/teacher/reading-log` | `ReadingLog.vue` | 课外阅读 | `reading` |
| `/teacher/checkin` | `Checkin.vue` | 学生打卡 | `checkin` |
| `/teacher/awards` | `Awards.vue` | 我获奖啦 | `rewards` |
| `/teacher/award-categories` | `AwardCategories.vue` | 奖项管理 | `rewards` |

##### 家校沟通
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/parent-contacts` | `ParentContacts.vue` | 家长联系 | `parents` |
| `/teacher/messages` | `MessageBoard.vue` | 留言板 | `im` |
| `/teacher/notice-templates` | `NoticeTemplates.vue` | 通知模板 | `notices` |

##### AI 与备课
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/ai-chat` | `AiChat.vue` | AI 对话 | `ai` |
| `/teacher/ai-image` | `ImageCreation.vue` | AI 文生图 | `ai` |
| `/teacher/ai-resources` | `Resources.vue` | 教学资源 | `ai` |
| `/teacher/lesson-plans` | `LessonPlans.vue` | 教案库 | `ai` |
| `/teacher/knowledges` | `Knowledges.vue` | 知识点库 | `ai` |
| `/teacher/textbook` | `Textbook.vue` | 教材知识库 | `ai` |
| `/teacher/resource-library` | `ResourceLibrary.vue` | 教学资源库 | `ai` |
| `/teacher/papers` | `Papers.vue` | 试卷库 | `ai` |
| `/teacher/paper-queries` | `PaperQueries.vue` | 试卷查询 | `ai` |
| `/teacher/lesson-plan-templates` | `LessonPlanTemplates.vue` | 教案模板 | `ai` |
| `/teacher/ai-generator/lesson` | `AiGenerator.vue` | 优质教案生成 | `ai` |
| `/teacher/ai-generator/knowledge` | `AiGenerator.vue` | 知识点生成 | `ai` |
| `/teacher/ai-generator/paper` | `AiGenerator.vue` | 优选试卷生成 | `ai` |

##### 教师办公
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/work-log` | `WorkLog.vue` | 工作日志 | `worklog` |
| `/teacher/lesson-obs` | `LessonObs.vue` | 听课记录 | `observation` |
| `/teacher/teaching-calendar` | `TeachingCalendar.vue` | 教学日历 | `calendar` |
| `/teacher/teacher-directory` | `TeacherDirectory.vue` | 教师通讯录 | `teachers` |
| `/teacher/teacher-detail` | `TeacherDetail.vue` | 教师详情 | `teachers` |
| `/teacher/office-translate` | `Translate.vue` | 翻译 | `worklog` |
| `/teacher/office-paper` | `Paper.vue` | 教育论文 | `worklog` |
| `/teacher/office-blackboard` | `Blackboard.vue` | 黑板报 | `worklog` |
| `/teacher/office-speech` | `Speech.vue` | 演讲稿 | `worklog` |
| `/teacher/plan-template-lib` | `PlanTemplateLib.vue` | 文案模板库 | `worklog` |

##### 工具箱聚合
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/toolbox` | `Toolbox.vue` | 工具箱 | `tools` |
| `/teacher/tools/picker` | `RandomPicker.vue` | 随机点名 | `tools` |
| `/teacher/tools/grouper` | `RandomGrouper.vue` | 随机分组 | `tools` |
| `/teacher/tools/decider` | `Dice.vue` | 随机决定器 | `tools` |
| `/teacher/tools/timer` | `Timer.vue` | 倒计时 | `tools` |
| `/teacher/tools/calc` | `Calc.vue` | 课堂计算器 | `tools` |
| `/teacher/tools/seatMap` | `SeatMap.vue` | 座位表 | `seats` |
| `/teacher/tools/scorePanel` | `ScorePanel.vue` | 加减分 | `rewards` |
| `/teacher/tools/flower` | `FlowerGame.vue` | 笑口常开 | `games` |
| `/teacher/tools/comment` | `CommentGen.vue` | 评语生成 | `tools` |
| `/teacher/tools/summary` | `Summary.vue` | 期末总结 | `tools` |
| `/teacher/tools/classDuty` | `ClassDuty.vue` | 班级职务 | `duty` |
| `/teacher/tools/scheduleMaker` | `ScheduleMaker.vue` | 课表排版 | `schedule` |
| `/teacher/tools/strokeOrder` | `StrokeOrder.vue` | 汉字笔顺 | `tools` |
| `/teacher/tools/writingMaterials` | `WritingMaterials.vue` | 作文素材 | `tools` |
| `/teacher/tools/poetry` | `Poetry.vue` | 古诗词助手 | `tools` |
| `/teacher/tools/dictation` | `Dictation.vue` | 汉字听写 | `tools` |
| `/teacher/tools/reading` | `Reading.vue` | 阅读理解生成 | `tools` |
| `/teacher/tools/essay` | `Essay.vue` | 小作文助手 | `tools` |
| `/teacher/tools/idiom` | `Idiom.vue` | 成语词典 | `tools` |
| `/teacher/tools/pinyin` | `Pinyin.vue` | 拼音标注 | `tools` |
| `/teacher/tools/math` | `MathGen.vue` | 口算生成 | `tools` |
| `/teacher/tools/verticalCalc` | `VerticalCalc.vue` | 竖式计算 | `tools` |
| `/teacher/tools/answerCard` | `AnswerCard.vue` | 口算答题卡 | `tools` |
| `/teacher/tools/multiplicationTable` | `MultiplicationTable.vue` | 乘法口诀 | `tools` |
| `/teacher/tools/unitConversion` | `UnitConversion.vue` | 单位换算 | `tools` |
| `/teacher/tools/mathMistakes` | `MathMistakes.vue` | 错题本 | `tools` |
| `/teacher/tools/wordCard` | `WordCard.vue` | 单词卡片 | `tools` |
| `/teacher/tools/sentencePractice` | `SentencePractice.vue` | 句型练习 | `tools` |
| `/teacher/tools/listening` | `Listening.vue` | 英语听力 | `tools` |
| `/teacher/tools/grammar` | `Grammar.vue` | 语法练习 | `tools` |
| `/teacher/tools/sceneDialogue` | `SceneDialogue.vue` | 情景对话 | `tools` |
| `/teacher/tools/spell` | `Spell.vue` | 单词拼写 | `tools` |
| `/teacher/tools/speaking` | `Speaking.vue` | 口语练习 | `tools` |
| `/teacher/tools/englishStory` | `EnglishStory.vue` | 英语爽文 | `tools` |
| `/teacher/tools/planTemplates` | `PlanTemplates.vue` | 文案模板 | `tools` |
| `/teacher/tools/thesis` | `Thesis.vue` | 教育论文 | `tools` |
| `/teacher/tools/lessonObservation` | `LessonObservation.vue` | 听课记录 | `tools` |
| `/teacher/office-tools` | `OfficeTools.vue` | 办公工具 | `tools` |
| `/teacher/office-tools/translate` | `Translate.vue` | 翻译助手 | `tools` |
| `/teacher/office-tools/blackboard` | `Blackboard.vue` | 黑板报 | `tools` |
| `/teacher/office-tools/speech` | `Speech.vue` | 演讲稿 | `tools` |
| `/teacher/subject-tools` | `SubjectTools.vue` | 学科工具 | `tools` |
| `/teacher/subject-list` | `SubjectList.vue` | 学科列表 | `tools` |
| `/teacher/subject/:name` | `SubjectDetail.vue` | 学科工具详情 | `tools` |
| `/teacher/quicktool` | `QuickTool.vue` | 快捷工具 | `tools` |
| `/teacher/grade-trend` | `GradeTrend.vue` | 成绩趋势 | `grades` |
| `/teacher/picker-history` | `PickerHistory.vue` | 点名历史 | `tools` |
| `/teacher/tools/reward` | `Reward.vue` | 奖赏 | `rewards` |

##### 游戏合集
| 路由 | 组件 | 功能 | Feature |
|------|------|------|---------|
| `/teacher/games` | `GamesIndex.vue` | 小游戏合集 | `games` |
| `/teacher/games/game24` | `Game24Point.vue` | 24点 | `games` |
| `/teacher/games/game2048` | `Game2048.vue` | 2048 | `games` |
| `/teacher/games/minesweeper` | `GameMinesweeper.vue` | 扫雷 | `games` |
| `/teacher/games/snake` | `GameSnake.vue` | 贪吃蛇 | `games` |
| `/teacher/games/ticTacToe` | `GameTicTacToe.vue` | 井字棋 | `games` |
| `/teacher/games/gomoku` | `GameGomoku.vue` | 五子棋 | `games` |
| `/teacher/games/match3` | `GameMatch3.vue` | 消消乐 | `games` |
| `/teacher/games/whack` | `GameWhack.vue` | 打地鼠 | `games` |
| `/teacher/games/puzzle15` | `GamePuzzle.vue` | 数字华容道 | `games` |
| `/teacher/games/tetris` | `GameTetris.vue` | 俄罗斯方块 | `games` |
| `/teacher/games/plane` | `GamePlane.vue` | 飞机大战 | `games` |
| `/teacher/games/motorcycle` | `GameMotorcycle.vue` | 极速摩托 | `games` |
| `/teacher/games/carCrash` | `GameCarCrash.vue` | 汽车躲避 | `games` |
| `/teacher/games/sudoku` | `GameSudoku.vue` | 数独 | `games` |
| `/teacher/games/numberSort` | `GameSequence.vue` | 数字排序 | `games` |
| `/teacher/games/memory` | `GameMemory.vue` | 记忆翻牌 | `games` |
| `/teacher/games/slidePuzzle` | `GameSlidePuzzle.vue` | 图片拼图 | `games` |
| `/teacher/games/colorReact` | `GameColorMatch.vue` | 颜色反应 | `games` |
| `/teacher/games/dice` | `GameDice.vue` | 摇骰子 | `games` |
| `/teacher/games/tapBlack` | `GameTapBlack.vue` | 别踩白块 | `games` |
| `/teacher/games/colorMatching` | `GameColorMatching.vue` | 颜色匹配 | `games` |
| `/teacher/games/slidingPuzzle` | `GameSlidingPuzzle.vue` | 数字推盘 | `games` |
| `/teacher/games/breakout` | `GameBreakout.vue` | 弹球打砖块 | `games` |
| `/teacher/games/oneTouch` | `GameOneTouch.vue` | 一笔画 | `games` |
| `/teacher/games/catchCoin` | `GameCatchCoin.vue` | 接金币 | `games` |
| `/teacher/games/flappy` | `GameFlappy.vue` | 像素鸟 | `games` |
| `/teacher/games/jump` | `GameJump.vue` | 跳一跳 | `games` |
| `/teacher/games/idiom` | `GameIdiom.vue` | 成语填空 | `games` |
| `/teacher/games/speedMath` | `GameSpeedMath.vue` | 速算挑战 | `games` |
| `/teacher/games/spelling` | `GameSpelling.vue` | 单词拼写 | `games` |
| `/teacher/games/scienceQuiz` | `GameScienceQuiz.vue` | 科学知识 | `games` |
| `/teacher/games/geoQuiz` | `GameGeoQuiz.vue` | 人文地理 | `games` |
| `/teacher/games/storyChain` | `GameStoryChain.vue` | 故事接龙 | `games` |

#### 家长（3 页）

| 路由 | 组件 | 功能 |
|------|------|------|
| `/parent` | `Dashboard.vue` | 家长中心 |
| `/parent/textbook` | `Textbook.vue` | 教材知识点 |
| `/parent/compare` | `KidsCompare.vue` | 跨娃比对 |

---

### 2.2 微信小程序端（`mini-program/src/pages.json`）

#### 公共页面
| 页面路径 | 标题 | 角色 |
|----------|------|------|
| `pages/login/login` | 登录 | 教师 |
| `pages/parent-login/parent-login` | 家长登录 | 家长 |

#### 校管端（6 页）
| 页面路径 | 标题 |
|----------|------|
| `pages/school-admin/school-admin` | 学校管理 |
| `pages/school-admin/school-features` | 学校功能包 |
| `pages/school-admin/teachers` | 教师管理 |
| `pages/school-admin/classes` | 班级管理 |
| `pages/school-admin/students` | 学生管理 |
| `pages/school-admin/notices` | 公告管理 |

#### 教师端（60+ 页）
| 页面路径 | 标题 | 功能 |
|----------|------|------|
| `pages/dashboard/dashboard` | 工作台 | 教师首页 |
| `pages/classes/classes` | 班级管理 | 班级成员 |
| `pages/students/students` | 学生管理 | 学生列表 |
| `pages/exams/exams` | 考试管理 | 考试列表 |
| `pages/exam-detail/exam-detail` | 考试详情 | 考试详情 |
| `pages/student-grades/student-grades` | 学生成绩 | 成绩录入 |
| `pages/grades/grades` | 成绩管理 | 成绩矩阵 |
| `pages/seatMap/seatMap` | 座位表 | 座位编排 |
| `pages/leaderboard/leaderboard` | 积分排行榜 | 排行榜 |
| `pages/radar/radar` | 成绩雷达图 | 雷达图 |
| `pages/reading-log/reading-log` | 课外阅读 | 阅读记录 |
| `pages/checkin/checkin` | 学生打卡 | 考勤打卡 |
| `pages/teaching-calendar/teaching-calendar` | 教学日历 | 日历 |
| `pages/grouper/grouper` | 随机分组 | 分组工具 |
| `pages/crud/crud` | 管理 | 通用CRUD |
| `pages/toolbox/toolbox` | 常用工具箱 | 工具聚合 |
| `pages/ai-center/index` | AI 备课中心 | AI聚合 |
| `pages/subject-tools/index` | 学科工具 | 学科工具 |
| `pages/subject-tools/chinese` | 语文工具 | 语文 |
| `pages/subject-tools/english` | 英语工具 | 英语 |
| `pages/subject-tools/math` | 数学工具 | 数学 |
| `pages/office-tools/index` | 办公工具 | 办公 |
| `pages/office-tools/translate` | 翻译助手 | 翻译 |
| `pages/office-tools/thesis` | 教育论文 | 论文 |
| `pages/office-tools/comment` | 评语生成 | 评语 |
| `pages/office-tools/summary` | 期末总结 | 总结 |
| `pages/office-tools/blackboard` | 黑板报生成 | 黑板报 |
| `pages/office-tools/speech` | 演讲稿生成 | 演讲稿 |
| `pages/subject-tools/writingMaterials` | 作文素材 | 语文 |
| `pages/subject-tools/poetry` | 古诗词助手 | 语文 |
| `pages/subject-tools/wordCard` | 单词卡片 | 英语 |
| `pages/subject-tools/dictation` | 汉字听写 | 语文 |
| `pages/subject-tools/idiom` | 成语词典 | 语文 |
| `pages/subject-tools/sentencePractice` | 句型练习 | 英语 |
| `pages/subject-tools/reading` | 阅读理解 | 英语 |
| `pages/subject-tools/grammar` | 语法练习 | 英语 |
| `pages/subject-tools/listening` | 听力训练 | 英语 |
| `pages/subject-tools/pinyin` | 拼音学习 | 语文 |
| `pages/subject-tools/spell` | 单词拼写 | 英语 |
| `pages/subject-tools/speaking` | 口语练习 | 英语 |
| `pages/config/config` | 设置 | 设置 |
| `pages/quicktool/quicktool` | 智能工具 | 工具 |
| `pages/subject/subject` | 学科练习 | 学科 |
| `pages/subject-list/subject-list` | 学科工具 | 学科 |
| `pages/schedule/schedule` | 我的课表 | 课表 |
| `pages/attendance/attendance` | 考勤管理 | 考勤 |
| `pages/homework/homework` | 作业管理 | 作业 |
| `pages/notice/notice` | 班级公告 | 公告 |
| `pages/profile/profile` | 个人中心 | 资料 |
| `pages/grade-trend/grade-trend` | 成绩趋势 | 趋势 |
| `pages/resource/resource` | 教学资源 | 资源 |
| `pages/resource-library/resource-library` | 资源库 | 资源 |
| `pages/growth/growth` | 成长档案 | 成长 |
| `pages/parent-contact/parent-contact` | 家长联系 | 家校 |
| `pages/teacher/teacher` | 教师通讯录 | 通讯录 |
| `pages/duty-roster/duty-roster` | 轮值表 | 值日 |
| `pages/class-activity/class-activity` | 班级活动 | 活动 |
| `pages/class-activities/class-activities` | 班级活动 | 活动 |
| `pages/lesson-plans/lesson-plans` | 备课记录 | 教案 |
| `pages/papers/papers` | 试卷查询 | 试卷 |
| `pages/class-finance/class-finance` | 班费管理 | 财务 |
| `pages/gallery/gallery` | 班级风采 | 相册 |
| `pages/my-gallery/my-gallery` | 我的相册 | 相册 |
| `pages/im/im` | 家校沟通 | IM |
| `pages/image-creation/image-creation` | 图像创造 | AI |
| `pages/lesson-observation/lesson-observation` | 听课记录 | 办公 |
| `pages/work-log/work-log` | 工作日志 | 办公 |
| `pages/behavior-record/behavior-record` | 行为观察 | 行为 |
| `pages/award-record/award-record` | 获奖记录 | 奖励 |
| `pages/notes/notes` | 笔记 | 笔记 |
| `pages/todos/todos` | 待办 | 待办 |
| `pages/picker-history/picker-history` | 抽签历史 | 工具 |
| `pages/notifications/notifications` | 通知中心 | 通知 |
| `pages/analysis/analysis` | 数据统计 | 统计 |
| `pages/award-categories/award-categories` | 奖项类别 | 奖励 |
| `pages/group-scores/group-scores` | 小组评分 | 评价 |
| `pages/score-records/score-records` | 积分记录 | 评价 |
| `pages/reward-records/reward-records` | 加减分记录 | 评价 |
| `pages/duty-config/duty-config` | 值日配置 | 值日 |
| `pages/class-duty/class-duty` | 班级职务 | 职务 |
| `pages/schedule-maker/schedule-maker` | 课表排版 | 课表 |
| `pages/data-manager/data-manager` | 数据管理 | 数据 |
| `pages/essay/essay` | 小作文助手 | AI |
| `pages/english-story/english-story` | 英语小故事 | AI |
| `pages/scene-dialogue/scene-dialogue` | 情景对话 | AI |
| `pages/paper/paper` | 教育论文 | AI |
| `pages/messages/messages` | 消息中心 | 消息 |
| `pages/plan-template-lib/plan-template-lib` | 文案模板库 | 模板 |
| `pages/paper-queries/paper-queries` | 试卷查询 | 试卷 |
| `pages/lesson-plan-templates/lesson-plan-templates` | 教案模板 | 教案 |
| `pages/knowledges/knowledges` | 知识点库 | 知识点 |
| `pages/notice-templates/notice-templates` | 通知模板 | 通知 |

#### 家长端（5 页）
| 页面路径 | 标题 |
|----------|------|
| `pages/parent/parent` | 家长中心 |
| `pages/parent/compare` | 跨娃比对 |
| `pages/parent/parent-resource-library` | 资源库 |

#### 游戏子包（`pages/games/`，30+ 页）
games 子包包含：index, game2048, sudoku, game24, ticTacToe, gomoku, match3, memory, numberSort, minesweeper, puzzle15, slidePuzzle, colorReact, snake, tetris, plane, motorcycle, carCrash, whack, breakout, flappy, tapblack, jump, catchcoin, dice, onetouch, colormatch, slidingPuzzle, idiom, speedMath, spelling, scienceQuiz, geoQuiz, storyChain

#### 工具子包（`pages/tools/`，20+ 页）
picker, timer, calc, math, decider, flower, planTemplates, verticalCalc, answerCard, multiplicationTable, unitConversion, mathMistakes, scorePanel, reward/reward, strokeOrder

#### AI 子包（`pages/ai/`，6 页）
ai, ai-knowledge, ai-paper, ai-exam, ai-interactive, ai-lesson

---

## 3. 后端接口清单

### 3.1 认证与用户

| 方法 | 路径 | 角色 | 认证 | 功能 |
|------|------|------|------|------|
| POST | `/auth/unified-login` | 全部 | 否 | 统一登录（user+pass → 自动识别角色） |
| POST | `/auth/wechat-login` | 全部 | 否 | 微信登录 |
| POST | `/auth/bind-teacher` | 教师 | 否 | 微信绑教师账号 |
| POST | `/auth/bind-parent` | 家长 | 否 | 微信绑家长（学号） |
| POST | `/auth/bind-by-number` | 全部 | 否 | 微信统一绑定（教师编号/学生学号） |
| POST | `/auth/password-login` | 教师 | 否 | 教师密码登录 |
| GET | `/auth/me` | 全部 | JWT | 当前登录态功能档案 |
| GET | `/users/me` | 教师 | JWT | 教师个人信息 |
| PUT/PATCH | `/users/me` | 教师 | JWT | 更新教师资料 |

### 3.2 超管（`/admin`，`super`）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/admin/login` | 超管登录 |
| GET | `/admin/schools` | 学校列表 |
| GET | `/admin/schools/:id` | 学校详情 |
| POST | `/admin/schools` | 创建学校 |
| PATCH | `/admin/schools/:id` | 更新学校 |
| DELETE | `/admin/schools/:id` | 删除学校 |
| GET | `/admin/schools/:id/features` | 学校功能包 |
| PATCH | `/admin/schools/:id/features` | 更新学校功能包 |
| POST | `/admin/schools/batch-toggle` | 批量启用/禁用学校 |
| GET | `/admin/school-admins` | 校管列表 |
| POST | `/admin/school-admins` | 创建校管 |
| PATCH | `/admin/school-admins/:id` | 更新校管 |
| PATCH | `/admin/school-admins/:id/enabled` | 启用/禁用校管 |
| PATCH | `/admin/school-admins/:id/password` | 重置校管密码 |
| DELETE | `/admin/school-admins/:id` | 删除校管 |
| POST | `/admin/school-admins/batch-toggle` | 批量启用/禁用校管 |
| POST | `/admin/reset-all` | 重置所有数据 |
| GET | `/admin/teachers` | 全部教师列表 |
| POST | `/admin/teachers/:id/clear-data` | 清理教师数据 |
| GET | `/admin/audit-logs` | 审计日志 |

### 3.3 校管（`/school-admin`，`school_admin`）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/school-admin/login` | 校管登录 |
| GET | `/school-admin/dashboard` | 校管工作台数据 |
| GET | `/school-admin/school-features` | 本校功能包开关 |
| PATCH | `/school-admin/school-features` | 更新本校功能包 |
| GET | `/school-admin/teachers` | 本校教师列表 |
| POST | `/school-admin/teachers` | 创建教师 |
| POST | `/school-admin/teachers/batch` | 批量创建教师 |
| POST | `/school-admin/teachers/import` | 导入教师（文件） |
| POST | `/school-admin/teachers/import-preview` | 教师文件预览 |
| POST | `/school-admin/teachers/import-ai` | 教师文件 AI 识别 |
| PATCH | `/school-admin/teachers/:id` | 更新教师 |
| PATCH | `/school-admin/teachers/:id/features` | 更新教师功能权限 |
| POST | `/school-admin/teachers/:id/reset-password` | 重置教师密码 |
| DELETE | `/school-admin/teachers/:id` | 删除教师 |
| POST | `/school-admin/teachers/deactivate-all` | 批量停用教师 |
| GET | `/school-admin/parent-logins` | 家长登录列表 |
| GET | `/school-admin/classes` | 班级列表 |
| POST | `/school-admin/classes` | 创建班级 |
| PATCH | `/school-admin/classes/:id` | 更新班级 |
| DELETE | `/school-admin/classes/:id` | 删除班级 |
| POST | `/school-admin/classes/:id/promote` | 班级升级 |
| POST | `/school-admin/classes/batch` | 批量创建班级 |
| POST | `/school-admin/classes/import` | 导入班级（文件） |
| POST | `/school-admin/classes/import-preview` | 班级文件预览 |
| POST | `/school-admin/classes/import-ai` | 班级文件 AI 识别 |
| GET | `/school-admin/notices` | 学校公告列表 |
| POST | `/school-admin/notices` | 创建公告 |
| DELETE | `/school-admin/notices/:id` | 删除公告 |
| PATCH | `/school-admin/notices/:id` | 更新公告 |
| GET | `/school-admin/students` | 学生列表 |
| PATCH | `/school-admin/students/:id` | 更新学生 |
| DELETE | `/school-admin/students/:id` | 删除学生 |
| POST | `/school-admin/students/batch` | 批量创建学生 |
| POST | `/school-admin/students/import` | 导入学生（文件） |
| POST | `/school-admin/students/import-preview` | 学生文件预览 |
| POST | `/school-admin/students/import-ai` | 学生文件 AI 识别 |
| GET | `/school-admin/export/teachers` | 导出教师 CSV |
| GET | `/school-admin/export/students` | 导出学生 CSV |
| GET | `/school-admin/export/teachers-xls` | 导出教师 XLSX |
| GET | `/school-admin/export/students-xls` | 导出学生 XLSX |
| GET | `/school-admin/export/classes-xls` | 导出班级 XLSX |
| GET | `/school-admin/search` | 全局搜索 |

### 3.4 教师核心业务（CRUD 基座 + 增强端点）

以下模块继承 `CrudController` 基座，自动具备 `POST/GET/PATCH/:id/DELETE/:id` 接口，写操作自动注入 `teacherId`，GET 支持 `?classId=` 过滤。

| 模块 | 路径前缀 | Feature | 实体 |
|------|---------|---------|------|
| 考试 | `/exams` | `exams` | Exam |
| 成绩 | `/grades` | `grades` | Grade |
| 座位 | `/seats` | `seats` | Seat |
| 值日表 | `/duty-rosters` | `duty` | DutyRoster |
| 家长联系 | `/parent-contacts` | `parents` | ParentContact |
| 班级费用 | `/class-expenses` | `finance` | ClassExpense |
| 班级活动 | `/class-activities` | `activities` | ClassActivity |
| 值日配置 | `/class-duty-configs` | `duty` | ClassDutyConfig |
| 获奖记录 | `/award-records` | `rewards` | AwardRecord |
| 奖项类别 | `/award-categories` | `rewards` | AwardCategory |
| 成长记录 | `/growth-entries` | `growth` | GrowthEntry |
| 行为记录 | `/behavior-records` | `behavior` | BehaviorRecord |
| 教案 | `/generated/lesson-plans` | `ai` | GeneratedLessonPlan |
| 知识点 | `/generated/knowledges` | `ai` | GeneratedKnowledge |
| 试卷 | `/generated/papers` | `ai` | GeneratedPaper |
| 试卷查询 | `/generated/queries` | `ai` | PaperQueryDoc |
| 工作日志 | `/work-logs` | `worklog` | WorkLog |
| 听课记录 | `/lesson-observations` | `observation` | LessonObservation |
| 阅读日志 | `/reading-logs` | `reading` | ReadingLog |
| 打卡 | `/checkins` | `checkin` | Checkin |
| 班级风采 | `/galleries` | `gallery` | Gallery |
| 我的相册 | `/my-galleries` | `gallery` | MyGallery |
| 笔记 | `/notes` | `notes` | Note |
| 家校沟通 | `/im` | `im` | — |

#### 成绩增强接口（`/grades`）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/grades/merge` | 合并/覆盖成绩 |
| POST | `/grades/import-preview` | 成绩导入预览 |
| POST | `/grades/import-commit` | 成绩导入提交 |
| POST | `/grades/import-ai` | AI 识别成绩 |
| GET | `/grades/analysis/exam` | 单场考试统计 |
| GET | `/grades/analysis/trend` | 多场考试趋势 |
| GET | `/grades/analysis/rank` | 班级排名 |
| GET | `/grades/analysis/student/:studentId` | 学生个人成绩历史 |
| GET | `/grades/analysis/weak` | 薄弱知识点分析 |

### 3.5 AI 接口（`/ai`，教师，限流 10 次/分钟）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/ai/chat` | 流式对话（SSE） |
| POST | `/ai/chat-sync` | 同步对话（小程序用） |
| POST | `/ai/parse` | 结构化解析（文本→对象） |
| POST | `/ai/gen-image` | AI 文生图 |
| POST | `/ai/gen-video` | AI 文生视频 |
| POST | `/ai/asr` | 语音识别 ASR |
| POST | `/ai/ocr` | 图片 OCR |
| POST | `/ai/parse-file` | 文件解析（TXT/PDF/图片） |
| POST | `/ai/analyze-exam` | 全班考试成绩 AI 分析 |
| POST | `/ai/diagnose` | 学生个体学情 AI 诊断 |

### 3.6 家长端（`/parent-auth`，家长）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/parent-auth/login` | 家长登录（学号+密码） |
| POST | `/parent-auth/change-password` | 修改密码 |
| POST | `/parent-auth/bind-wechat` | 绑定微信 |
| GET | `/parent-auth/bindings` | 查询微信绑定信息 |
| GET | `/parent-auth/me` | 当前家长信息+孩子 |
| GET | `/parent-auth/notices` | 班级通知 |
| GET | `/parent-auth/exams` | 考试成绩明细+趋势 |
| GET | `/parent-auth/homework` | 孩子作业 |
| GET | `/parent-auth/attendance` | 孩子打卡/考勤 |
| GET | `/parent-auth/behavior` | 孩子行为表现 |
| GET | `/parent-auth/schedule` | 孩子课表&值日 |
| GET | `/parent-auth/communications` | 家校沟通记录 |
| GET | `/parent-auth/teachers` | 科任老师信息 |
| POST | `/parent-auth/subscribe` | 订阅微信通知 |
| GET | `/parent-auth/im-user-sig` | IM UserSig |
| POST | `/parent-auth/switch-student` | 多娃切换 |
| GET | `/parent-auth/compare-kids` | 多娃考试对比 |
| POST | `/parent-auth/activate-parent` | 教师激活家长身份 |
| POST | `/parent-auth/student-update-request` | 提交学生信息修改申请 |
| GET | `/parent-auth/student-update-requests` | 查看修改申请列表 |

### 3.7 其他接口

| 路径 | 角色 | 功能 |
|------|------|------|
| `/messages` | teacher+parent | 家校留言板（收发/未读/已读） |
| `/notifications` | teacher | 通知中心（列表/未读/标记已读） |
| `/im/user-sig` | teacher | 腾讯云 IM UserSig |
| `/im/parents` | teacher | 家长花名册 |
| `/im/class-group` | teacher | 班级群号落库 |
| `/teaching-calendar` | teacher | 教学日历 CRUD |
| `/textbook` | teacher | 教材知识库 CRUD |
| `/resource-library` | teacher | 教学资源库 CRUD |
| `/health` | 公开 | 健康检查 |

---

## 4. 功能权限体系

系统采用 **学校级功能包 × 教师级功能包** 双层权限模型：

- **学校级 Feature Flags**：超管/校管可配置，决定该校"有哪些功能包可用"
- **教师级 Features**：校管可配置，决定该教师"在可用功能包中能使用哪些"
- **effectiveFeatures**：前端登录后 `/auth/me` 返回，为两者的交集，用于前端菜单显隐
- **后端强制校验**：`@Feature('xxx')` + `FeatureGuard` 在服务端拦截越权请求

| Feature Key | 对应模块 | 说明 |
|------------|---------|------|
| `todos` | 待办事项 | 教师个人待办 |
| `notes` | 笔记 | 教师笔记 |
| `schedule` | 课表 | 教师课表 |
| `notices` | 公告 | 学校/班级公告 |
| `classes` | 班级成员 | 班级成员管理 |
| `students` | 学生管理 | 学生信息管理 |
| `duty` | 值日 | 轮值表/值日配置 |
| `finance` | 班费 | 班级财务管理 |
| `activities` | 班级活动 | 活动创建与管理 |
| `gallery` | 班级风采 | 相册/风采 |
| `exams` | 考试管理 | 考试创建与管理 |
| `grades` | 成绩管理 | 成绩录入与分析 |
| `analysis` | 学情分析 | 数据看板/雷达图 |
| `attendance` | 考勤 | 考勤管理 |
| `homework` | 作业 | 作业管理 |
| `rewards` | 奖励 | 加减分/排行榜/奖项 |
| `growth` | 成长记录 | 成长档案 |
| `behavior` | 行为记录 | 行为观察 |
| `reading` | 课外阅读 | 阅读日志 |
| `checkin` | 打卡 | 学生打卡 |
| `parents` | 家长联系 | 家校联系日志 |
| `im` | 家校沟通 | IM/留言板 |
| `ai` | AI备课 | AI对话/生图/解析 |
| `worklog` | 工作日志 | 工作日志/听课记录/办公 |
| `observation` | 听课记录 | 听课记录 |
| `calendar` | 教学日历 | 教学日历 |
| `teachers` | 教师通讯录 | 教师目录 |
| `tools` | 工具箱 | 课堂工具聚合 |
| `seats` | 座位表 | 座位编排 |
| `games` | 小游戏 | 课堂小游戏合集 |

---

## 5. 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| Web 前端 | Vue 3 + Vite + Pinia | 端口 5201，Hash 路由 |
| 小程序 | uni-app | 微信小程序原生编译 |
| 后端 | NestJS + TypeORM + MySQL | 路由前缀 `/api` |
| 部署 | 微信云托管 | 公网域名已开通 |
| 认证 | JWT（30天）+ 微信登录 | 多角色统一认证 |
| 权限 | RBAC + FeatureGuard | 双层功能权限 |
| AI | 多服务商适配 | 对话/生图/生视频/OCR/ASR |
| IM | 腾讯云 IM（体验版） | 家校沟通 |
| 限流 | @nestjs/throttler | 全局 60/min，AI 10/min |
| 文件导入 | CSV/Excel/JSON + AI 识别 | 教师/班级/学生批量导入 |

---

## 6. 测试策略建议

基于当前系统规模，建议采用分层测试策略：

1. **冒烟测试**：利用现有 `e2e/web.smoke.mjs` + `e2e/mini.smoke.mjs`，覆盖全角色路由渲染 + 无控制台报错
2. **接口回归**：利用 `qa/api-tests.mjs`（178 条），覆盖核心 CRUD + 鉴权 + 错误处理
3. **数据准备**：利用 `qa/provision.mjs` 自动生成测试学校+教师+班级+学生
4. **性能基线**：对核心接口（登录、成绩查询、AI对话）做 curl 计时采样
5. **UI 一致性**：重点检查双端核心页面（登录、工作台、班级管理、成绩管理）的布局与交互一致性

---

## 7. 已知环境约束

- Web 前端 dev 端口：5201（偶发被占用时跳到 5202）
- 云后端公网：`https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api`
- 小程序走微信私有链路（`wx.cloud.callContainer`），无需公网域名
- 测试数据默认密码：`Test@2026`（教师）/ `123456`（家长）
- 新建学校需超管 `PATCH /admin/schools/:id/features` 开启功能包，否则教师接口全 403
