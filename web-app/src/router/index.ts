import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/user'

/**
 * 路由表 + 角色守卫。
 * - meta.roles 标记该路由允许的角色；未标记则仅需登录
 * - meta.feature 标记该教师路由所需的功能权限 key（空数组或 features 含空串时放行）
 * - 未登录访问受保护路由 → 跳转登录页
 * - 已登录但角色不匹配 → 跳转 403
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { layout: 'blank', title: '登录' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { layout: 'blank', title: '无权限' },
  },
  // 超管
  {
    path: '/super',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['super'] as Role[] },
    children: [
      { path: '', name: 'super-dashboard', component: () => import('@/views/super/Dashboard.vue'), meta: { title: '超管工作台' } },
      { path: 'schools', name: 'super-schools', component: () => import('@/views/super/Schools.vue'), meta: { title: '学校管理' } },
      { path: 'admins', name: 'super-admins', component: () => import('@/views/super/Admins.vue'), meta: { title: '校管理员' } },
      { path: 'audit-logs', name: 'super-audit-logs', component: () => import('@/views/super/AuditLogs.vue'), meta: { title: '审计日志' } },
      { path: 'account-clear', name: 'super-account-clear', component: () => import('@/views/super/AccountClear.vue'), meta: { title: '清除业务数据' } },
      { path: 'config', name: 'super-config', component: () => import('@/views/super/PlatformConfig.vue'), meta: { title: '平台配置' } },
      { path: 'ai-providers', name: 'super-ai-providers', component: () => import('@/views/super/AiProviders.vue'), meta: { title: 'AI 服务商' } },
      { path: 'school-features', name: 'super-school-features', component: () => import('@/views/super/SchoolFeatures.vue'), meta: { title: '学校功能包' } },
      { path: 'grade-audit', name: 'super-grade-audit', component: () => import('@/views/super/GradeAudit.vue'), meta: { title: '成绩审计' } },
      { path: 'teachers', name: 'super-teachers', component: () => import('@/views/super/Teachers.vue'), meta: { title: '教师管理' } },
      { path: 'students', name: 'super-students', component: () => import('@/views/super/Students.vue'), meta: { title: '学生管理' } },
      { path: 'kids-coding', name: 'super-kids-coding', component: () => import('@/views/super/KidsCoding.vue'), meta: { title: '少儿编程·周报推送' } },
    ],
  },
  // 校管
  {
    path: '/school-admin',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['school_admin'] as Role[] },
    children: [
      { path: '', name: 'school-admin-dashboard', component: () => import('@/views/school-admin/Dashboard.vue'), meta: { title: '校管工作台' } },
      { path: 'teachers', name: 'school-admin-teachers', component: () => import('@/views/school-admin/Teachers.vue'), meta: { title: '教师管理' } },
      { path: 'classes', name: 'school-admin-classes', component: () => import('@/views/school-admin/Classes.vue'), meta: { title: '班级管理' } },
      { path: 'classes/:id', name: 'school-admin-class-detail', component: () => import('@/views/school-admin/ClassDetail.vue'), meta: { title: '班级详情' } },
      { path: 'students', name: 'school-admin-students', component: () => import('@/views/school-admin/Students.vue'), meta: { title: '学生管理' } },
      { path: 'notices', name: 'school-admin-notices', component: () => import('@/views/school-admin/Notices.vue'), meta: { title: '学校公告' } },
      { path: 'textbooks', name: 'school-admin-textbooks', component: () => import('@/views/school-admin/Textbooks.vue'), meta: { title: '教材知识库' } },
      { path: 'resource-library', name: 'school-admin-resource-library', component: () => import('@/views/school-admin/ResourceLibrary.vue'), meta: { title: '专项资源库' } },
      { path: 'features', name: 'school-admin-features', component: () => import('@/views/school-admin/FeatureFlags.vue'), meta: { title: '功能包开关' } },
      { path: 'academic', name: 'school-admin-academic', component: () => import('@/views/school-admin/Academic.vue'), meta: { title: '成绩查询与汇总' } },
      { path: 'ai-config', name: 'school-admin-ai-config', component: () => import('@/views/school-admin/AiConfig.vue'), meta: { title: 'AI 配置' } },
      { path: 'zhzx', name: 'school-admin-zhxue', component: () => import('@/views/school-admin/Zhxue.vue'), meta: { title: '智慧中小学' } },
    ],
  },
  // 教师：全部子路由，meta.feature 控制可见性
  {
    path: '/teacher',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] as Role[] },
    children: [
      { path: '', name: 'teacher-dashboard', component: () => import('@/views/teacher/Dashboard.vue'), meta: { title: '教师工作台', keepAlive: true } },
      { path: 'notifications', name: 'teacher-notifications', component: () => import('@/views/workspace/Notifications.vue'), meta: { title: '通知中心' } },
      // 个人空间
      { path: 'profile', name: 'teacher-profile', component: () => import('@/views/workspace/Profile.vue'), meta: { title: '个人资料' } },
      { path: 'config', name: 'teacher-config', component: () => import('@/views/workspace/Config.vue'), meta: { title: '设置' } },
      { path: 'todos', name: 'teacher-todos', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'todos' }, meta: { title: '待办事项', feature: 'todos' } },
      { path: 'notes', name: 'teacher-notes', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'notes' }, meta: { title: '笔记', feature: 'notes' } },
      { path: 'schedule', name: 'teacher-schedule', component: () => import('@/views/workspace/Schedule.vue'), meta: { title: '课表', feature: 'schedule' } },
      { path: 'my-schedule', name: 'my-schedule', component: () => import('@/views/workspace/MySchedule.vue'), meta: { title: '我的课表', feature: 'schedule' } },
      { path: 'notices', name: 'teacher-notices', component: () => import('@/views/workspace/Notices.vue'), meta: { title: '公告', feature: 'notices' } },
      { path: 'data', name: 'teacher-data', component: () => import('@/views/workspace/DataManager.vue'), meta: { title: '数据管理', feature: 'notices' } },
      // 班级与学生
      { path: 'classes', name: 'teacher-classes', component: () => import('@/views/classes/ClassMembers.vue'), meta: { title: '班级成员', feature: 'classes' } },
      { path: 'students', name: 'teacher-students', component: () => import('@/views/teacher/Students.vue'), meta: { title: '学生管理', feature: 'students', keepAlive: true } },
      { path: 'students/:id', name: 'teacher-student-detail', component: () => import('@/views/teacher/StudentDetail.vue'), meta: { title: '学生详情', feature: 'students' } },
      { path: 'student-info-review', name: 'student-info-review', component: () => import('@/views/teacher/StudentInfoReview.vue'), meta: { title: '信息修改审核', feature: 'students' } },
      { path: 'duty-roster', name: 'teacher-duty-roster', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'duty-rosters' }, meta: { title: '轮值表', feature: 'duty' } },
      { path: 'duty-config', name: 'teacher-duty-config', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'class-duty-configs' }, meta: { title: '值日配置', feature: 'duty' } },
      { path: 'class-finance', name: 'teacher-class-finance', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'class-expenses' }, meta: { title: '班费', feature: 'finance' } },
      { path: 'class-activities', name: 'teacher-class-activities', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'class-activities' }, meta: { title: '班级活动', feature: 'activities' } },
      { path: 'gallery', name: 'teacher-gallery', component: () => import('@/views/classes/Gallery.vue'), meta: { title: '班级风采', feature: 'gallery' } },
      { path: 'my-gallery', name: 'teacher-my-gallery', component: () => import('@/views/classes/MyGallery.vue'), meta: { title: '我的相册', feature: 'gallery' } },
      // 学情与考试
      { path: 'exams', name: 'teacher-exams', component: () => import('@/views/exams/Exams.vue'), meta: { title: '考试管理', feature: 'exams', keepAlive: true } },
      { path: 'grades', name: 'teacher-grades', component: () => import('@/views/exams/Grades.vue'), meta: { title: '成绩管理', feature: 'grades', keepAlive: true } },
      { path: 'exam-analysis', name: 'teacher-exam-analysis', component: () => import('@/views/exams/ExamAnalysis.vue'), meta: { title: '考试分析', feature: 'analysis' } },
      { path: 'data-dashboard', name: 'teacher-data-dashboard', component: () => import('@/views/exams/DataDashboard.vue'), meta: { title: '数据看板', feature: 'analysis' } },
      { path: 'radar', name: 'teacher-radar', component: () => import('@/views/exams/Radar.vue'), meta: { title: '雷达图', feature: 'analysis' } },
      { path: 'exam-detail', name: 'teacher-exam-detail', component: () => import('@/views/exams/ExamDetail.vue'), meta: { title: '考试详情', feature: 'analysis' } },
      { path: 'exam-compare', name: 'teacher-exam-compare', component: () => import('@/views/exams/ExamCompare.vue'), meta: { title: '进退步对比', feature: 'analysis' } },
      { path: 'student-grades', name: 'teacher-student-grades', component: () => import('@/views/exams/StudentGrades.vue'), meta: { title: '学生成绩', feature: 'grades' } },
      { path: 'attendance', name: 'teacher-attendance', component: () => import('@/views/attendance/Attendance.vue'), meta: { title: '考勤', feature: 'attendance', keepAlive: true } },
      { path: 'homework', name: 'teacher-homework', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'homework' }, meta: { title: '作业', feature: 'homework', keepAlive: true } },
      // 学生评价
      { path: 'rewards', name: 'teacher-rewards', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'reward-records' }, meta: { title: '奖励记录', feature: 'rewards' } },
      { path: 'score-records', name: 'teacher-score-records', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'score-records' }, meta: { title: '加减分记录', feature: 'rewards' } },
      { path: 'group-scores', name: 'teacher-group-scores', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'group-scores' }, meta: { title: '小组评分', feature: 'rewards' } },
      { path: 'leaderboard', name: 'teacher-leaderboard', component: () => import('@/views/evaluation/Leaderboard.vue'), meta: { title: '排行榜', feature: 'rewards' } },
      { path: 'growth', name: 'teacher-growth', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'growth-entries' }, meta: { title: '成长记录', feature: 'growth' } },
      { path: 'behavior', name: 'teacher-behavior', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'behavior-records' }, meta: { title: '行为记录', feature: 'behavior' } },
      { path: 'reading-log', name: 'teacher-reading-log', component: () => import('@/views/evaluation/ReadingLog.vue'), meta: { title: '课外阅读', feature: 'reading' } },
      { path: 'checkin', name: 'teacher-checkin', component: () => import('@/views/evaluation/Checkin.vue'), meta: { title: '学生打卡', feature: 'checkin' } },
      { path: 'awards', name: 'teacher-awards', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'award-records' }, meta: { title: '我获奖啦', feature: 'rewards' } },
      { path: 'award-categories', name: 'teacher-award-categories', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'award-categories' }, meta: { title: '奖项管理', feature: 'rewards' } },
      // 家校沟通
      { path: 'parent-contacts', name: 'teacher-parent-contacts', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'parent-contacts' }, meta: { title: '家长联系', feature: 'parents' } },
      { path: 'messages', name: 'teacher-message-board', component: () => import('@/views/workspace/MessageBoard.vue'), meta: { title: '留言板', feature: 'im' } },
      { path: 'im', name: 'teacher-im', component: () => import('@/views/workspace/TeacherIM.vue'), meta: { title: '家校沟通', feature: 'im' } },
      { path: 'notice-templates', name: 'teacher-notice-templates', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'notice-templates' }, meta: { title: '通知模板', feature: 'notices' } },
      // AI 与备课
      { path: 'ai-chat', name: 'teacher-ai-chat', component: () => import('@/views/ai/AiChat.vue'), meta: { title: 'AI 对话', feature: 'ai' } },
      { path: 'ai-image', name: 'teacher-ai-image', component: () => import('@/views/ai/ImageCreation.vue'), meta: { title: 'AI 文生图', feature: 'ai' } },
      { path: 'ai-resources', name: 'teacher-ai-resources', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'resources' }, meta: { title: '在线资源', feature: 'ai' } },
      { path: 'lesson-plans', name: 'teacher-lesson-plans', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'generated/lesson-plans' }, meta: { title: '教案库', feature: 'ai' } },
      { path: 'knowledges', name: 'teacher-knowledges', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'generated/knowledges' }, meta: { title: '知识点库', feature: 'ai' } },
      { path: 'textbook', name: 'teacher-textbook', component: () => import('@/views/ai/Textbook.vue'), meta: { title: '教材知识库', feature: 'ai' } },
      { path: 'resource-library', name: 'teacher-resource-library', component: () => import('@/views/teacher/ResourceLibrary.vue'), meta: { title: '专项资源库', feature: 'ai' } },
      { path: 'zhzx', name: 'teacher-zhxue', component: () => import('@/views/teacher/Zhxue.vue'), meta: { title: '智慧中小学', feature: 'ai' } },
      { path: 'papers', name: 'teacher-papers', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'generated/papers' }, meta: { title: '试卷库', feature: 'ai' } },
      { path: 'paper-queries', name: 'teacher-paper-queries', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'generated/queries' }, meta: { title: '试卷查询', feature: 'ai' } },
      { path: 'lesson-plan-templates', name: 'teacher-lesson-plan-templates', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'lesson-plan-templates' }, meta: { title: '教案模板', feature: 'ai' } },
      { path: 'ai-generator/lesson', name: 'teacher-ai-lesson', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'lesson' }, meta: { title: '优质教案生成', feature: 'ai' } },
      { path: 'ai-generator/knowledge', name: 'teacher-ai-knowledge', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'knowledge' }, meta: { title: '知识点生成', feature: 'ai' } },
      { path: 'ai-generator/paper', name: 'teacher-ai-paper', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'paper' }, meta: { title: '优选试卷生成', feature: 'ai' } },
      { path: 'ai-interactive', name: 'teacher-ai-interactive', component: () => import('@/views/ai/InteractiveQA.vue'), meta: { title: '互动答疑', feature: 'ai' } },
      // 教师办公
      { path: 'work-log', name: 'teacher-work-log', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'work-logs' }, meta: { title: '工作日志', feature: 'worklog' } },
      { path: 'lesson-obs', name: 'teacher-lesson-obs', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'lesson-observations' }, meta: { title: '听课记录', feature: 'observation' } },
      { path: 'teaching-calendar', name: 'teacher-teaching-calendar', component: () => import('@/views/office/TeachingCalendar.vue'), meta: { title: '教学日历', feature: 'calendar' } },
      { path: 'teacher-directory', name: 'teacher-directory', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'teachers' }, meta: { title: '教师通讯录', feature: 'teachers' } },
      { path: 'teacher-detail', name: 'teacher-detail', component: () => import('@/views/teacher/TeacherDetail.vue'), meta: { title: '教师详情', feature: 'teachers', roles: ['teacher', 'school_admin'] } },
      { path: 'office-translate', name: 'teacher-office-translate', component: () => import('@/views/office/Translate.vue'), meta: { title: '翻译', feature: 'worklog' } },
      { path: 'office-paper', name: 'teacher-office-paper', component: () => import('@/views/office/Paper.vue'), meta: { title: '教育论文', feature: 'worklog' } },
      { path: 'office-blackboard', name: 'teacher-office-blackboard', component: () => import('@/views/office/Blackboard.vue'), meta: { title: '黑板报', feature: 'worklog' } },
      { path: 'office-speech', name: 'teacher-office-speech', component: () => import('@/views/office/Speech.vue'), meta: { title: '演讲稿', feature: 'worklog' } },
      { path: 'plan-template-lib', name: 'teacher-plan-template-lib', component: () => import('@/views/office/PlanTemplateLib.vue'), meta: { title: '文案模板库', feature: 'worklog' } },
      // 工具箱聚合入口
      { path: 'toolbox', name: 'teacher-toolbox', component: () => import('@/views/tools/Toolbox.vue'), meta: { title: '工具箱', feature: 'tools' } },
      // 课堂互动工具
      { path: 'tools/picker', name: 'toolPicker', component: () => import('@/views/tools/RandomPicker.vue'), meta: { title: '随机点名', feature: 'tools' } },
      { path: 'tools/grouper', name: 'toolGrouper', component: () => import('@/views/tools/RandomGrouper.vue'), meta: { title: '随机分组', feature: 'tools' } },
      { path: 'tools/decider', name: 'toolDecider', component: () => import('@/views/tools/Dice.vue'), meta: { title: '随机决定器', feature: 'tools' } },
      { path: 'tools/timer', name: 'toolTimer', component: () => import('@/views/tools/Timer.vue'), meta: { title: '倒计时', feature: 'tools' } },
      { path: 'tools/calc', name: 'toolCalc', component: () => import('@/views/tools/Calc.vue'), meta: { title: '课堂计算器', feature: 'tools' } },
      { path: 'tools/seatMap', name: 'toolSeatMap', component: () => import('@/views/tools/SeatMap.vue'), meta: { title: '座位表', feature: 'seats' } },
      { path: 'tools/scorePanel', name: 'toolScorePanel', component: () => import('@/views/tools/ScorePanel.vue'), meta: { title: '加减分', feature: 'rewards' } },
      { path: 'tools/flower', name: 'toolFlower', component: () => import('@/views/tools/FlowerGame.vue'), meta: { title: '笑口常开', feature: 'games' } },
      { path: 'tools/comment', name: 'toolComment', component: () => import('@/views/tools/CommentGen.vue'), meta: { title: '评语生成', feature: 'tools' } },
      { path: 'tools/summary', name: 'toolSummary', component: () => import('@/views/tools/Summary.vue'), meta: { title: '期末总结', feature: 'tools' } },
      { path: 'tools/classDuty', name: 'toolClassDuty', component: () => import('@/views/tools/ClassDuty.vue'), meta: { title: '班级职务', feature: 'duty' } },
      { path: 'tools/scheduleMaker', name: 'toolScheduleMaker', component: () => import('@/views/tools/ScheduleMaker.vue'), meta: { title: '课表排版', feature: 'schedule' } },
      // 语文工具
      { path: 'tools/strokeOrder', name: 'toolStrokeOrder', component: () => import('@/views/tools/StrokeOrder.vue'), meta: { title: '汉字笔顺', feature: 'tools' } },
      { path: 'tools/writingMaterials', name: 'toolWritingMaterials', component: () => import('@/views/tools/WritingMaterials.vue'), meta: { title: '作文素材', feature: 'tools' } },
      { path: 'tools/poetry', name: 'toolPoetry', component: () => import('@/views/tools/Poetry.vue'), meta: { title: '古诗词助手', feature: 'tools' } },
      { path: 'tools/dictation', name: 'toolDictation', component: () => import('@/views/tools/Dictation.vue'), meta: { title: '汉字听写', feature: 'tools' } },
      { path: 'tools/reading', name: 'toolReading', component: () => import('@/views/tools/Reading.vue'), meta: { title: '阅读理解生成', feature: 'tools' } },
      { path: 'tools/essay', name: 'toolEssay', component: () => import('@/views/tools/Essay.vue'), meta: { title: '小作文助手', feature: 'tools' } },
      { path: 'tools/idiom', name: 'toolIdiom', component: () => import('@/views/tools/Idiom.vue'), meta: { title: '成语词典', feature: 'tools' } },
      { path: 'tools/pinyin', name: 'toolPinyin', component: () => import('@/views/tools/Pinyin.vue'), meta: { title: '拼音标注', feature: 'tools' } },
      // 数学工具
      { path: 'tools/math', name: 'toolMath', component: () => import('@/views/tools/MathGen.vue'), meta: { title: '口算生成', feature: 'tools' } },
      { path: 'tools/verticalCalc', name: 'toolVerticalCalc', component: () => import('@/views/tools/VerticalCalc.vue'), meta: { title: '竖式计算', feature: 'tools' } },
      { path: 'tools/answerCard', name: 'toolAnswerCard', component: () => import('@/views/tools/AnswerCard.vue'), meta: { title: '口算答题卡', feature: 'tools' } },
      { path: 'tools/multiplicationTable', name: 'toolMultiplicationTable', component: () => import('@/views/tools/MultiplicationTable.vue'), meta: { title: '乘法口诀', feature: 'tools' } },
      { path: 'tools/unitConversion', name: 'toolUnitConversion', component: () => import('@/views/tools/UnitConversion.vue'), meta: { title: '单位换算', feature: 'tools' } },
      { path: 'tools/mathMistakes', name: 'toolMathMistakes', component: () => import('@/views/tools/MathMistakes.vue'), meta: { title: '错题本', feature: 'tools' } },
      // 英语工具
      { path: 'tools/wordCard', name: 'toolWordCard', component: () => import('@/views/tools/WordCard.vue'), meta: { title: '单词卡片', feature: 'tools' } },
      { path: 'tools/sentencePractice', name: 'toolSentencePractice', component: () => import('@/views/tools/SentencePractice.vue'), meta: { title: '句型练习', feature: 'tools' } },
      { path: 'tools/listening', name: 'toolListening', component: () => import('@/views/tools/Listening.vue'), meta: { title: '英语听力', feature: 'tools' } },
      { path: 'tools/grammar', name: 'toolGrammar', component: () => import('@/views/tools/Grammar.vue'), meta: { title: '语法练习', feature: 'tools' } },
      { path: 'tools/sceneDialogue', name: 'toolSceneDialogue', component: () => import('@/views/tools/SceneDialogue.vue'), meta: { title: '情景对话', feature: 'tools' } },
      { path: 'tools/spell', name: 'toolSpell', component: () => import('@/views/tools/Spell.vue'), meta: { title: '单词拼写', feature: 'tools' } },
      { path: 'tools/speaking', name: 'toolSpeaking', component: () => import('@/views/tools/Speaking.vue'), meta: { title: '口语练习', feature: 'tools' } },
      { path: 'tools/englishStory', name: 'toolEnglishStory', component: () => import('@/views/tools/EnglishStory.vue'), meta: { title: '英语爽文', feature: 'tools' } },
      { path: 'tools/planTemplates', name: 'toolPlanTemplates', component: () => import('@/views/tools/PlanTemplates.vue'), meta: { title: '文案模板', feature: 'tools' } },
      { path: 'tools/thesis', name: 'toolThesis', component: () => import('@/views/tools/Thesis.vue'), meta: { title: '教育论文', feature: 'tools' } },
      { path: 'tools/lessonObservation', name: 'toolLessonObservation', component: () => import('@/views/tools/LessonObservation.vue'), meta: { title: '听课记录', feature: 'tools' } },
      // 补齐与小程序对齐的功能模块
      { path: 'office-tools', name: 'teacher-office-tools', component: () => import('@/views/office/OfficeTools.vue'), meta: { title: '办公工具', feature: 'tools' } },
      { path: 'office-tools/translate', name: 'teacher-translate', component: () => import('@/views/office/Translate.vue'), meta: { title: '翻译助手', feature: 'tools' } },
      { path: 'office-tools/blackboard', name: 'teacher-blackboard', component: () => import('@/views/office/Blackboard.vue'), meta: { title: '黑板报', feature: 'tools' } },
      { path: 'office-tools/speech', name: 'teacher-speech', component: () => import('@/views/office/Speech.vue'), meta: { title: '演讲稿', feature: 'tools' } },
      { path: 'subject-tools', name: 'teacher-subject-tools', component: () => import('@/views/tools/SubjectTools.vue'), meta: { title: '学科工具', feature: 'tools' } },
      { path: 'subject-list', name: 'teacher-subject-list', component: () => import('@/views/tools/SubjectList.vue'), meta: { title: '学科列表', feature: 'tools' } },
      { path: 'subject/:subject', name: 'teacher-subject-detail', component: () => import('@/views/tools/SubjectDetail.vue'), meta: { title: '学科工具', feature: 'tools' } },
      // schema 驱动的通用 AI 工具详情页：?key=subject-tool-key 或 ?q=quicktool-type（已有学科/快捷工具唯一渲染器）
      { path: 'tools/ai', name: 'teacher-ai-detail', component: () => import('@/views/tools/AIDetailPage.vue'), meta: { title: 'AI 工具', feature: 'tools' } },
      { path: 'quicktool', name: 'teacher-quicktool', component: () => import('@/views/office/QuickTool.vue'), meta: { title: '快捷工具', feature: 'tools' } },
      { path: 'grade-trend', name: 'teacher-grade-trend', component: () => import('@/views/evaluation/GradeTrend.vue'), meta: { title: '成绩趋势', feature: 'grades' } },
      { path: 'picker-history', name: 'teacher-picker-history', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), props: { entity: 'picker-history' }, meta: { title: '点名历史', feature: 'tools' } },
      { path: 'tools/reward', name: 'teacher-reward', component: () => import('@/views/tools/Reward.vue'), meta: { title: '奖赏', feature: 'rewards' } },
      // 游戏合集
      { path: 'games', name: 'games', component: () => import('@/views/games/GamesIndex.vue'), meta: { title: '小游戏合集', feature: 'games' } },
      // 少儿编程（积木式拖拽可视化编程，默认关闭，由学校功能包开启；可开放给家长）
      { path: 'kids-coding', name: 'teacher-kids-coding', component: () => import('@/views/teacher/KidsCoding.vue'), meta: { title: '少儿编程', feature: 'kids-coding' } },
      // 心情与情绪关怀（每日打卡 + 班级情绪看板 + 树洞跟进）
      { path: 'mood', name: 'teacher-mood', component: () => import('@/views/teacher/MoodDashboard.vue'), meta: { title: '心情与情绪关怀' } },
      // AI 班级助教：每周聚合 mood+成绩生成班级洞察
      { path: 'insight', name: 'teacher-insight', component: () => import('@/views/teacher/ClassInsight.vue'), meta: { title: '班级洞察' } },
      // 五育综合素质档案：聚合德/智/体/美/劳多源数据 + 过程性评价
      { path: 'five-edu', name: 'teacher-five-edu', component: () => import('@/views/teacher/FiveEduProfile.vue'), meta: { title: '五育综合素质档案' } },
      // 个性化学习闭环：学情画像 + AI 同类题练习 + 学习计划
      { path: 'learning-loop', name: 'teacher-learning-loop', component: () => import('@/views/teacher/LearningLoop.vue'), meta: { title: '个性化学习闭环' } },
      { path: 'safety', name: 'teacher-safety', component: () => import('@/views/teacher/SafetyBoard.vue'), meta: { title: '校园安全·防欺凌' } },
      { path: 'habit', name: 'teacher-habit', component: () => import('@/views/teacher/HabitBoard.vue'), meta: { title: '21天习惯养成' } },
      { path: 'literacy', name: 'teacher-literacy', component: () => import('@/views/teacher/LiteracyBoard.vue'), meta: { title: '数字素养·生涯启蒙' } },
      { path: 'accessibility', name: 'teacher-accessibility', component: () => import('@/views/teacher/Accessibility.vue'), meta: { title: '适老化·字号' } },
      { path: 'assistant', name: 'teacher-assistant', component: () => import('@/views/teacher/TeacherAssistant.vue'), meta: { title: '教师事务助手' } },
      { path: 'games/game24', name: 'game24point', component: () => import('@/views/games/Game24Point.vue'), meta: { title: '24点', feature: 'games' } },
      { path: 'games/game2048', name: 'game2048', component: () => import('@/views/games/Game2048.vue'), meta: { title: '2048', feature: 'games' } },
      { path: 'games/minesweeper', name: 'gameMinesweeper', component: () => import('@/views/games/GameMinesweeper.vue'), meta: { title: '扫雷', feature: 'games' } },
      { path: 'games/snake', name: 'gameSnake', component: () => import('@/views/games/GameSnake.vue'), meta: { title: '贪吃蛇', feature: 'games' } },
      { path: 'games/ticTacToe', name: 'gameTicTacToe', component: () => import('@/views/games/GameTicTacToe.vue'), meta: { title: '井字棋', feature: 'games' } },
      { path: 'games/gomoku', name: 'gameGomoku', component: () => import('@/views/games/GameGomoku.vue'), meta: { title: '五子棋', feature: 'games' } },
      { path: 'games/match3', name: 'gameMatch3', component: () => import('@/views/games/GameMatch3.vue'), meta: { title: '消消乐', feature: 'games' } },
      { path: 'games/whack', name: 'gameWhack', component: () => import('@/views/games/GameWhack.vue'), meta: { title: '打地鼠', feature: 'games' } },
      { path: 'games/puzzle15', name: 'gamePuzzle', component: () => import('@/views/games/GamePuzzle.vue'), meta: { title: '数字华容道', feature: 'games' } },
      { path: 'games/tetris', name: 'gameTetris', component: () => import('@/views/games/GameTetris.vue'), meta: { title: '俄罗斯方块', feature: 'games' } },
      { path: 'games/plane', name: 'gamePlane', component: () => import('@/views/games/GamePlane.vue'), meta: { title: '飞机大战', feature: 'games' } },
      { path: 'games/motorcycle', name: 'gameMotorcycle', component: () => import('@/views/games/GameMotorcycle.vue'), meta: { title: '极速摩托', feature: 'games' } },
      { path: 'games/carCrash', name: 'gameCarCrash', component: () => import('@/views/games/GameCarCrash.vue'), meta: { title: '汽车躲避', feature: 'games' } },
      { path: 'games/sudoku', name: 'gameSudoku', component: () => import('@/views/games/GameSudoku.vue'), meta: { title: '数独', feature: 'games' } },
      { path: 'games/numberSort', name: 'gameSequence', component: () => import('@/views/games/GameSequence.vue'), meta: { title: '数字排序', feature: 'games' } },
      { path: 'games/memory', name: 'gameMemory', component: () => import('@/views/games/GameMemory.vue'), meta: { title: '记忆翻牌', feature: 'games' } },
      { path: 'games/slidePuzzle', name: 'gameSlidePuzzle', component: () => import('@/views/games/GameSlidePuzzle.vue'), meta: { title: '图片拼图', feature: 'games' } },
      { path: 'games/colorReact', name: 'gameColorMatch', component: () => import('@/views/games/GameColorMatch.vue'), meta: { title: '颜色反应', feature: 'games' } },
      { path: 'games/dice', name: 'gameDice', component: () => import('@/views/games/GameDice.vue'), meta: { title: '摇骰子', feature: 'games' } },
      { path: 'games/tapblack', name: 'gameTapblack', component: () => import('@/views/games/GameTapBlack.vue'), meta: { title: '别踩白块', feature: 'games' } },
      { path: 'games/colormatch', name: 'gameColormatch', component: () => import('@/views/games/GameColorMatching.vue'), meta: { title: '颜色匹配', feature: 'games' } },
      { path: 'games/slidingPuzzle', name: 'gameSlidingPuzzle', component: () => import('@/views/games/GameSlidingPuzzle.vue'), meta: { title: '数字推盘', feature: 'games' } },
      { path: 'games/breakout', name: 'gameBreakout', component: () => import('@/views/games/GameBreakout.vue'), meta: { title: '弹球打砖块', feature: 'games' } },
      { path: 'games/onetouch', name: 'gameOnetouch', component: () => import('@/views/games/GameOneTouch.vue'), meta: { title: '一笔画', feature: 'games' } },
      { path: 'games/catchcoin', name: 'gameCatchcoin', component: () => import('@/views/games/GameCatchCoin.vue'), meta: { title: '接金币', feature: 'games' } },
      { path: 'games/flappy', name: 'gameFlappy', component: () => import('@/views/games/GameFlappy.vue'), meta: { title: '像素鸟', feature: 'games' } },
      { path: 'games/jump', name: 'gameJump', component: () => import('@/views/games/GameJump.vue'), meta: { title: '跳一跳', feature: 'games' } },
      // 学科小游戏
      { path: 'games/idiom', name: 'gameIdiom', component: () => import('@/views/games/GameIdiom.vue'), meta: { title: '成语填空', feature: 'games' } },
      { path: 'games/speedMath', name: 'gameSpeedMath', component: () => import('@/views/games/GameSpeedMath.vue'), meta: { title: '速算挑战', feature: 'games' } },
      { path: 'games/spelling', name: 'gameSpelling', component: () => import('@/views/games/GameSpelling.vue'), meta: { title: '单词拼写', feature: 'games' } },
      { path: 'games/scienceQuiz', name: 'gameScienceQuiz', component: () => import('@/views/games/GameScienceQuiz.vue'), meta: { title: '科学知识', feature: 'games' } },
      { path: 'games/geoQuiz', name: 'gameGeoQuiz', component: () => import('@/views/games/GameGeoQuiz.vue'), meta: { title: '人文地理', feature: 'games' } },
      // 创意型小游戏
      { path: 'games/storyChain', name: 'gameStoryChain', component: () => import('@/views/games/GameStoryChain.vue'), meta: { title: '故事接龙', feature: 'games' } },
      // Schema-driven 通用 CRUD 渲染器（接入 shared/schemas/crud-schema.ts，按 entity 自动生成列表+表单）
      { path: 'schema-crud/:entity', name: 'schema-crud', component: () => import('@/views/_schema_crud/SchemaCrudPage.vue'), meta: { title: '数据管理', feature: 'tools' } },
    ],
  },
  // 家长
  {
    path: '/parent',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['parent'] as Role[] },
    children: [
      { path: '', name: 'parent-dashboard', component: () => import('@/views/parent/Dashboard.vue'), meta: { title: '家长中心' } },
      { path: 'textbook', name: 'parent-textbook', component: () => import('@/views/parent/Textbook.vue'), meta: { title: '教材知识点' } },
      { path: 'resources', name: 'parent-resource-library', component: () => import('@/views/parent/ResourceLibrary.vue'), meta: { title: '专项资源库' } },
      { path: 'compare', name: 'parent-compare', component: () => import('@/views/parent/KidsCompare.vue'), meta: { title: '跨娃比对' } },
      { path: 'kids-coding', name: 'parent-kids-coding', component: () => import('@/views/parent/KidsCoding.vue'), meta: { title: '少儿编程' } },
    ],
  },
  // 根路径：按角色重定向到对应工作台（优先用 auth store，兜底读 localStorage）
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const auth = useAuthStore()
      const role = auth.role
      const map: Record<string, string> = {
        super: '/super',
        school_admin: '/school-admin',
        teacher: '/teacher',
        parent: '/parent',
      }
      return role ? (map[role] || '/login') : '/login'
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { layout: 'blank', title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// ========== 路由预加载：鼠标悬停时预加载目标路由的代码 ==========
// 将 on-demand import 变为 hover-to-preload，减少实际跳转白屏
const _preloadCache = new Set<string>()

function preloadRouteComponent(name: string) {
  if (_preloadCache.has(name)) return
  const record = router.resolve({ name })
  // 根据路由记录找到 component 并执行 import
  const matched = router.getRoutes().find((r) => r.name === name)
  if (matched) {
    _preloadCache.add(name)
    // 手动触发 Webpack/Vite 对 import() 的解析
    const component = (matched as any).components?.default || (matched as any).component
    if (typeof component === 'function') {
      Promise.resolve(component()).catch(() => { /* 忽略预加载失败 */ })
    }
  }
}

// 全局点击捕获：任何带 data-preload-route 属性的元素悬停时预加载
if (typeof window !== 'undefined') {
  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target as HTMLElement
      const preloadName = target.closest('[data-preload-route]')?.getAttribute('data-preload-route')
      if (preloadName) preloadRouteComponent(preloadName)
    },
    { passive: true },
  )
  // 页面空闲时预加载常用路由
  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(() => {
      const commonRoutes = ['teacher-dashboard', 'teacher-grades', 'teacher-exam-analysis']
      commonRoutes.forEach((n) => preloadRouteComponent(n))
    })
  }
}

// 全局守卫：登录态 + 角色校验 + 功能权限校验
// 注意：localStorage 中的 role / features 仅用于 UX 层跳转与菜单显隐，
// 真正的数据权限由后端 @Roles + JWT（t.sub）强制校验，本地篡改无法越权读取数据；
// 且 api/request.ts 在收到 401 时会清除本地登录态并跳转登录，形成闭环防御。
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles as Role[] | undefined
  if (roles && auth.role && !roles.includes(auth.role)) {
    return { name: 'forbidden' }
  }
  // 功能权限：以登录/me 返回的 effectiveFeatures（学校级 ∩ 教师级实际可用）为准。
  // 未加载 effectiveFeatures 时放行（兼容），真正数据权限仍由后端 @Feature 强制校验。
  const feature = to.meta.feature as string | undefined
  if (feature) {
    const eff = auth.user?.effectiveFeatures
    if (eff && !eff.includes(feature)) {
      return { name: auth.role === 'teacher' ? 'teacher-dashboard' : 'forbidden' }
    }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

export default router
